import os
import re
import shutil
import subprocess
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from datetime import datetime, timezone

from build_folder import build_tree
from rag_services.parser import parse_and_chunk_repo
from rag_services.rag_engine import CodeRagEngine

app = FastAPI()

# -----------------------------
# CORS Configuration
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://192.168.43.162:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# MongoDB Setup
# -----------------------------
db = MongoClient("mongodb://localhost:27017/")["ProjectDeconstructorRAG"]
repo_collection = db["repositories"]
chat_collection = db["chat_history"]

# -----------------------------
# Paths
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLONE_DIR = os.path.join(BASE_DIR, "cloned_repos")
os.makedirs(CLONE_DIR, exist_ok=True)

# -----------------------------
# Supported File Types
# -----------------------------
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp", ".ico"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"}

# -----------------------------
# Pydantic Schemas
# -----------------------------
class RepoRequest(BaseModel):
    link: str

class FileRequest(BaseModel):
    repository: str
    path: str

class ChatRequest(BaseModel):
    repository: str
    query: str
    currentFile: str | None = None

class ClearChatRequest(BaseModel):
    repository: str

# -----------------------------
# Helpers
# -----------------------------

def safe_repo_path(repository: str) -> str:
    """
    Resolve the repo path and guard against path traversal.
    Raises HTTPException(400) if the resolved path escapes CLONE_DIR.
    """
    # Strip any path separators so input like "../../etc" can't escape
    repo_name = os.path.basename(repository.strip())
    if not repo_name:
        raise HTTPException(status_code=400, detail="Invalid repository name.")

    resolved = os.path.abspath(os.path.join(CLONE_DIR, repo_name))
    clone_dir_abs = os.path.abspath(CLONE_DIR)

    if not resolved.startswith(clone_dir_abs + os.sep) and resolved != clone_dir_abs:
        raise HTTPException(status_code=400, detail="Invalid repository path.")

    return resolved


def clone_and_index(github_url: str, repo_name: str, clone_path: str) -> dict:
    """
    Clone the repo and build the RAG index.
    Returns {"tree": ..., "rag_indexed": bool, "rag_error": str|None}
    """
    if os.path.exists(clone_path):
        shutil.rmtree(clone_path, ignore_errors=True)

    result = subprocess.run(
        ["git", "clone", "--depth", "1", github_url, clone_path],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.strip())

    rag_indexed = True
    rag_error = None

    try:
        chunks = parse_and_chunk_repo(clone_path)
        rag_engine = CodeRagEngine(repo_name=repo_name)
        rag_engine.index_repository(chunks)
    except Exception as e:
        rag_indexed = False
        rag_error = str(e)
        print(f"RAG Index Error: {rag_error}")

    tree = build_tree(clone_path)
    return {"tree": tree, "rag_indexed": rag_indexed, "rag_error": rag_error}


# Compile whole-word patterns once at startup
_AUDIT_PATTERN = re.compile(
    r"\b(audit|security|vulnerability|vulnerabilities|bug|bugs|"
    r"code smell|performance|risk|exploit)\b",
    re.IGNORECASE,
)
_ARCH_PATTERN = re.compile(
    r"\b(architecture|system design|project structure|"
    r"folder structure|data flow)\b",
    re.IGNORECASE,
)


# -----------------------------
# Base Diagnostic Route
# -----------------------------
@app.get("/")
def home():
    return {"message": "Backend running"}


# -----------------------------
# 1. Fetch & Vector Index Route
# -----------------------------
@app.post("/fetch-repo")
def fetch_repo(data: RepoRequest):
    github_url = data.link.strip()

    if not github_url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Invalid GitHub URL.")

    repo_name = github_url.split("/")[-1].replace(".git", "")
    clone_path = safe_repo_path(repo_name)

    cached = repo_collection.find_one({"link": github_url})

    # If cached in MongoDB but repo is missing from disk, re-clone and re-index
    if cached:
        if os.path.exists(clone_path):
            return {
                "success": True,
                "repository": cached["name"],
                "tree": cached["tree"],
                "rag_indexed": cached.get("rag_indexed", True),
                "rag_error": cached.get("rag_error"),
            }
        else:
            print(f"Repo '{repo_name}' found in DB but missing on disk — re-cloning.")
            result = clone_and_index(github_url, repo_name, clone_path)
            repo_collection.update_one(
                {"link": github_url},
                {"$set": {
                    "tree": result["tree"],
                    "rag_indexed": result["rag_indexed"],
                    "rag_error": result["rag_error"],
                }},
            )
            return {
                "success": True,
                "repository": repo_name,
                "tree": result["tree"],
                "rag_indexed": result["rag_indexed"],
                "rag_error": result["rag_error"],
            }

    # Fresh clone
    result = clone_and_index(github_url, repo_name, clone_path)

    repo_collection.insert_one({
        "link": github_url,
        "name": repo_name,
        "tree": result["tree"],
        "rag_indexed": result["rag_indexed"],
        "rag_error": result["rag_error"],
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "success": True,
        "repository": repo_name,
        "tree": result["tree"],
        "rag_indexed": result["rag_indexed"],
        "rag_error": result["rag_error"],
    }


# -----------------------------
# 2. RAG Chat Route (with history)
# -----------------------------
@app.post("/ask-ai")
def ask_ai(data: ChatRequest):
    repo_path = safe_repo_path(data.repository)

    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository not found on disk.")

    query = data.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        rag_engine = CodeRagEngine(repo_name=os.path.basename(repo_path))

        if _AUDIT_PATTERN.search(query):
            answer = rag_engine.audit_repository(query)
            response_type = "audit"
        elif _ARCH_PATTERN.search(query):
            answer = rag_engine.query_codebase(
                f"Explain the architecture of this repository.\n\n"
                f"Current File:\n{data.currentFile}\n\n"
                f"User Request:\n{query}"
            )
            response_type = "architecture"
        else:
            answer = rag_engine.query_codebase(query)
            response_type = "chat"

    except ConnectionError as e:
        raise HTTPException(
            status_code=503,
            detail=f"LLM service unavailable (is Ollama running?): {str(e)}",
        )
    except Exception as e:
        print(f"ASK AI ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"RAG Engine Error: {str(e)}")

    # Persist chat message to MongoDB
    chat_collection.insert_one({
        "repository": data.repository,
        "current_file": data.currentFile,
        "query": query,
        "answer": answer,
        "response_type": response_type,
        "timestamp": datetime.now(timezone.utc),
    })

    return {
        "success": True,
        "repository": data.repository,
        "currentFile": data.currentFile,
        "query": query,
        "response_type": response_type,
        "answer": answer,
    }


# -----------------------------
# 3. Chat History Route
# -----------------------------
@app.get("/chat-history/{repository}")
def get_chat_history(repository: str):
    """
    Returns all chat messages for a repository, oldest first.
    """
    # Sanitize repository name
    repo_name = os.path.basename(repository.strip())
    if not repo_name:
        raise HTTPException(status_code=400, detail="Invalid repository name.")

    messages = list(
        chat_collection.find(
            {"repository": repo_name},
            {"_id": 0},  # exclude MongoDB internal _id
        ).sort("timestamp", 1)  # ascending = oldest first
    )

    return {
        "success": True,
        "repository": repo_name,
        "count": len(messages),
        "messages": messages,
    }


# -----------------------------
# 4. Clear Chat History Route
# -----------------------------
@app.delete("/chat-history")
def clear_chat_history(data: ClearChatRequest):
    """
    Deletes all chat messages for a given repository.
    """
    repo_name = os.path.basename(data.repository.strip())
    if not repo_name:
        raise HTTPException(status_code=400, detail="Invalid repository name.")

    result = chat_collection.delete_many({"repository": repo_name})

    return {
        "success": True,
        "repository": repo_name,
        "deleted_count": result.deleted_count,
    }


# -----------------------------
# 5. File Viewer Route
# -----------------------------
@app.post("/get-file-content")
def get_file_content(data: FileRequest):
    repo_path = safe_repo_path(data.repository)

    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository not found.")

    file_path = os.path.abspath(os.path.join(repo_path, data.path))

    # Path traversal guard
    if not file_path.startswith(os.path.abspath(repo_path) + os.sep):
        raise HTTPException(status_code=403, detail="Invalid path extraction attempt.")

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found.")

    extension = os.path.splitext(file_path)[1].lower()

    if extension in IMAGE_EXTENSIONS:
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return {"success": True, "path": data.path, "file_type": "image",
                "extension": extension.lstrip("."), "content": encoded}

    if extension in AUDIO_EXTENSIONS:
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return {"success": True, "path": data.path, "file_type": "audio",
                "extension": extension.lstrip("."), "content": encoded}

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {"success": True, "path": data.path, "file_type": "text",
                "extension": extension.lstrip("."), "content": content}
    except Exception:
        with open(file_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return {"success": True, "path": data.path, "file_type": "binary",
                "extension": extension.lstrip("."), "content": encoded}