from pathlib import Path

from langchain_chroma import Chroma
from langchain_ollama import ChatOllama, OllamaEmbeddings


class CodeRagEngine:

    def __init__(self, repo_name: str):

        self.repo_name = repo_name

        self.persist_directory = (
            Path("./storage/chromadb") / repo_name
        )

        self.persist_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.embeddings = OllamaEmbeddings(
            model="nomic-embed-text"
        )

        # Lazy-loaded — instantiated only when actually needed
        self._chat_llm = None
        self._audit_llm = None

    # --------------------------------------------------
    # Lazy LLM Properties
    # --------------------------------------------------

    @property
    def chat_llm(self) -> ChatOllama:
        if self._chat_llm is None:
            self._chat_llm = ChatOllama(
                model="qwen3:8b",
                temperature=0.1,
            )
        return self._chat_llm

    @property
    def audit_llm(self) -> ChatOllama:
        if self._audit_llm is None:
            self._audit_llm = ChatOllama(
                model="deepseek-r1:8b",
                temperature=0.1,
            )
        return self._audit_llm

    # --------------------------------------------------
    # Index Repository
    # Clears existing vectors first to prevent duplicates
    # on re-indexing the same repo.
    # --------------------------------------------------

    def index_repository(self, chunks: list) -> None:

        if not chunks:
            raise ValueError("No chunks received for indexing.")

        # Delete any previously indexed data for this repo
        # so re-fetching the same repo doesn't accumulate duplicates.
        existing = Chroma(
            persist_directory=str(self.persist_directory),
            embedding_function=self.embeddings,
        )

        try:
            existing.delete_collection()
            print(f"Cleared existing index for '{self.repo_name}'.")
        except Exception as e:
            # Collection may not exist yet on first run — that's fine.
            print(f"No prior collection to clear ({e}), continuing.")

        Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=str(self.persist_directory),
        )

        print(f"Indexed {len(chunks)} chunks for '{self.repo_name}'.")

    # --------------------------------------------------
    # Load Vector Store
    # --------------------------------------------------

    def _get_vector_store(self) -> Chroma:

        return Chroma(
            persist_directory=str(self.persist_directory),
            embedding_function=self.embeddings,
        )

    # --------------------------------------------------
    # Retrieve Context
    # --------------------------------------------------

    def _retrieve_context(self, query: str, k: int = 8) -> list:

        vector_store = self._get_vector_store()
        retriever = vector_store.as_retriever(
            search_kwargs={"k": k}
        )
        return retriever.invoke(query)

    # --------------------------------------------------
    # Build Context String
    # --------------------------------------------------

    def _build_context(self, docs: list) -> str:

        parts = []

        for doc in docs:
            file_path = doc.metadata.get("file_path", "unknown")
            parts.append(f"FILE: {file_path}\n\n{doc.page_content}")

        return "\n\n".join(parts)

    # --------------------------------------------------
    # Invoke LLM with Ollama connection guard
    # --------------------------------------------------

    def _invoke_llm(self, llm: ChatOllama, prompt: str) -> str:
        try:
            response = llm.invoke(prompt)
            return response.content
        except Exception as e:
            error_msg = str(e).lower()
            if "connection" in error_msg or "refused" in error_msg:
                raise ConnectionError(
                    f"Cannot reach Ollama at its default address. "
                    f"Make sure Ollama is running. Details: {e}"
                )
            raise

    # --------------------------------------------------
    # General Repository Chat
    # --------------------------------------------------

    def query_codebase(self, user_query: str) -> str:

        docs = self._retrieve_context(user_query, k=8)

        if not docs:
            return "No relevant code was found in the repository."

        context_string = self._build_context(docs)

        prompt = f"""You are an expert software engineer.

Use ONLY the provided repository context.

Rules:
- Mention exact file paths.
- Do not hallucinate.
- If unsure, say so.
- Format code using markdown.

Repository Context:

{context_string}

Question:

{user_query}
"""

        return self._invoke_llm(self.chat_llm, prompt)

    # --------------------------------------------------
    # Security Audit
    # --------------------------------------------------

    def audit_repository(
        self,
        user_query: str = "Audit this repository",
    ) -> str:

        docs = self._retrieve_context(user_query, k=12)

        if not docs:
            return "No repository context available for auditing."

        context_string = self._build_context(docs)

        prompt = f"""You are a senior software security auditor.

Analyze the repository and identify:

1. Security vulnerabilities
2. Authentication issues
3. Authorization issues
4. Hardcoded secrets
5. Input validation flaws
6. Bugs
7. Code smells
8. Performance issues
9. Refactoring opportunities

For every issue provide:

- File path
- Severity
- Explanation
- Suggested Fix

Repository Context:

{context_string}
"""

        return self._invoke_llm(self.audit_llm, prompt)