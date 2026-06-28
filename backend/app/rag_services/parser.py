import os
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    Language,
)

# ==================================================
# Language-specific splitters
# ==================================================

LANGUAGE_MAPPING = {
    ".py": Language.PYTHON,
    ".js": Language.JS,
    ".jsx": Language.JS,
    ".ts": Language.TS,
    ".tsx": Language.TS,
    ".java": Language.JAVA,
    ".cpp": Language.CPP,
    ".hpp": Language.CPP,
    ".c": Language.C,
    ".h": Language.C,
    ".go": Language.GO,
    ".php": Language.PHP,
    ".html": Language.HTML,
    ".md": Language.MARKDOWN,
}

# ==================================================
# Generic text files
# ==================================================

TEXT_ONLY_EXTENSIONS = {
    ".css",
    ".json",
    ".yaml",
    ".yml",
    ".txt",
    ".env",
    ".toml",
    ".ini",
    ".xml",
}

# ==================================================
# Directories to ignore (shared with build_folder)
# ==================================================

IGNORE_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".idea",
    ".vscode",
    "coverage",
    "target",
    ".mypy_cache",
    ".pytest_cache",
}

# ==================================================
# Max file size — configurable via environment variable
# ==================================================

MAX_FILE_SIZE_MB: float = float(
    os.environ.get("RAG_MAX_FILE_SIZE_MB", "2")
)

# ==================================================
# Splitters
# ==================================================


def get_language_splitter(language: Language) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter.from_language(
        language=language,
        chunk_size=1200,
        chunk_overlap=200,
    )


def get_generic_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=200,
    )


# ==================================================
# Accurate line-range helper using character offsets
#
# Instead of searching for the first occurrence of a
# chunk string (which fails when the same code appears
# more than once), we track the current scan position
# and advance it after each chunk is located.
# ==================================================


def get_line_ranges(full_text: str, chunks: list[str]) -> list[tuple[int | None, int | None]]:
    """
    Return a list of (start_line, end_line) tuples — one per chunk —
    using a monotonically advancing offset so duplicate chunks are
    assigned their correct positions rather than all pointing at the
    first occurrence.
    """
    results: list[tuple[int | None, int | None]] = []
    search_from = 0

    for chunk in chunks:
        idx = full_text.find(chunk, search_from)

        if idx == -1:
            results.append((None, None))
            continue

        start_line = full_text[:idx].count("\n") + 1
        end_line = start_line + chunk.count("\n")

        results.append((start_line, end_line))

        # Advance past this match so the next chunk searches forward only
        search_from = idx + len(chunk)

    return results


# ==================================================
# Main parser
# ==================================================


def parse_and_chunk_repo(repo_path: str) -> list[Document]:

    documents: list[Document] = []
    repo_path = os.path.abspath(repo_path)

    print(f"\nIndexing repository: {repo_path}")
    print(f"Max file size: {MAX_FILE_SIZE_MB} MB")

    for root, dirs, files in os.walk(repo_path):

        # Skip unwanted directories in-place so os.walk won't descend into them
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file_name in files:

            file_path = os.path.join(root, file_name)
            relative_path = os.path.relpath(file_path, repo_path)
            extension = Path(file_name).suffix.lower()

            is_language_file = extension in LANGUAGE_MAPPING
            is_text_file = extension in TEXT_ONLY_EXTENSIONS

            if not (is_language_file or is_text_file):
                continue

            try:
                file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

                if file_size_mb > MAX_FILE_SIZE_MB:
                    print(f"Skipping large file ({file_size_mb:.1f} MB): {relative_path}")
                    continue

                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                # Log when bytes were silently dropped by errors="ignore"
                try:
                    with open(file_path, "rb") as fb:
                        fb.read().decode("utf-8")
                except UnicodeDecodeError:
                    print(f"Non-UTF-8 bytes ignored in: {relative_path}")

                if not content.strip():
                    continue

                splitter = (
                    get_language_splitter(LANGUAGE_MAPPING[extension])
                    if is_language_file
                    else get_generic_splitter()
                )

                chunks = splitter.split_text(content)

                # Compute all line ranges in one pass using offset tracking
                line_ranges = get_line_ranges(content, chunks)

                for idx, (chunk, (start_line, end_line)) in enumerate(
                    zip(chunks, line_ranges)
                ):
                    documents.append(
                        Document(
                            page_content=chunk,
                            metadata={
                                "file_path": relative_path,
                                "file_name": file_name,
                                "extension": extension,
                                "chunk_index": idx,
                                "chunk_id": f"{relative_path}::chunk_{idx}",
                                "start_line": start_line,
                                "end_line": end_line,
                            },
                        )
                    )

            except PermissionError:
                print(f"Permission denied, skipping: {relative_path}")
            except Exception as e:
                print(f"Failed to parse {relative_path}: {str(e)}")

    print(f"\nGenerated {len(documents)} chunks.")
    return documents