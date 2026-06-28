import os

# Import the shared ignore set so the tree and the RAG parser
# exclude exactly the same directories — no drift between the two.
from rag_services.parser import IGNORE_DIRS


def build_tree(path: str, root_path: str = None, max_depth: int = 20, _depth: int = 0) -> dict:
    """
    Recursively build a JSON-serialisable tree of the repository.

    Each node contains:
      - name  : file or directory name
      - type  : "folder" | "file"
      - path  : POSIX-style path relative to the repository root

    Parameters
    ----------
    path      : Absolute path to the current node.
    root_path : Absolute path to the repository root (set automatically).
    max_depth : Maximum directory depth to recurse into (default 20).
                Prevents enormous payloads from deeply nested monorepos.
    _depth    : Internal recursion counter — do not pass this manually.
    """
    if root_path is None:
        root_path = path

    rel_path = os.path.relpath(path, root_path)
    rel_path_posix = "" if rel_path == "." else rel_path.replace("\\", "/")

    node = {
        "name": os.path.basename(path),
        "type": "folder" if os.path.isdir(path) else "file",
        "path": rel_path_posix,
    }

    if not os.path.isdir(path):
        return node

    if _depth >= max_depth:
        # Signal to the frontend that this folder was truncated
        node["children"] = []
        node["truncated"] = True
        return node

    try:
        entries = os.listdir(path)
    except PermissionError:
        node["children"] = []
        node["error"] = "permission denied"
        return node

    # Sort: folders first, then files — both alphabetically (case-insensitive)
    entries.sort(
        key=lambda x: (
            not os.path.isdir(os.path.join(path, x)),
            x.lower(),
        )
    )

    node["children"] = []

    for item in entries:
        # Skip hidden files/dirs and everything in IGNORE_DIRS
        if item.startswith(".") or item in IGNORE_DIRS:
            continue

        full_path = os.path.join(path, item)
        node["children"].append(
            build_tree(
                full_path,
                root_path,
                max_depth=max_depth,
                _depth=_depth + 1,
            )
        )

    return node