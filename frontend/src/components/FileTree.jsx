import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileImage,
  ChevronDown,
  ChevronRight,
  FolderGit2,
} from "lucide-react";

/* ---------------- FILE ICONS ---------------- */

const getFileIcon = (fileName) => {
  const ext = fileName.split(".").pop().toLowerCase();

  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <FileCode size={16} className="text-yellow-400" />;

    case "py":
      return <FileCode size={16} className="text-blue-400" />;

    case "html":
      return <FileCode size={16} className="text-orange-500" />;

    case "css":
      return <FileCode size={16} className="text-sky-400" />;

    case "json":
      return <FileCode size={16} className="text-green-400" />;

    case "md":
      return <FileText size={16} className="text-slate-300" />;

    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return <FileImage size={16} className="text-purple-400" />;

    default:
      return <FileCode size={16} className="text-slate-400" />;
  }
};

/* ---------------- TREE NODE ---------------- */
const TreeNode = ({
  node,
  defaultOpen = false,
  onFileClick,
}) => {
  // Support both "folder" string check and backend "directory" tags if applicable
  const isFolder = node.type === "folder" || node.type === "directory" || !!node.children;
  const [open, setOpen] = useState(defaultOpen);

  const handleClick = (e) => {
    e.stopPropagation();

    if (isFolder) {
      setOpen(!open);
    } else {
      onFileClick(node);
    }
  };

  return (
    <div className="text-sm font-mono select-none">
      <div
        onClick={handleClick}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-800 cursor-pointer transition-colors text-slate-300"
      >
        {/* Chevron Indicator */}
        <div className="w-4 h-4 flex items-center justify-center text-slate-500 shrink-0">
          {isFolder ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </div>

        {/* Dynamic Folder/File Type Icon */}
        <div className="shrink-0">
          {isFolder ? (
            open ? <FolderOpen size={16} className="text-amber-400" /> : <Folder size={16} className="text-amber-400" />
          ) : (
            getFileIcon(node.name)
          )}
        </div>

        <span className="truncate text-slate-300 hover:text-cyan-400">{node.name}</span>
      </div>

      {isFolder && open && node.children && (
        <div className="ml-5 border-l border-slate-800/80 pl-2 mt-0.5 space-y-0.5">
          {node.children.map((child, idx) => (
            <TreeNode
              key={`${child.path}-${idx}`}
              node={child}
              defaultOpen={false}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------------- FILE TREE ---------------- */

const FileTree = ({ data, onFileClick }) => {
  if (!data) {
    return (
      <div className="text-slate-500 text-sm p-3 font-mono">
        No repository loaded.
      </div>
    );
  }

  // Handle direct tree passing or wrapped root response payload variations
  const treeRoot = data.tree ? data.tree : data;
  const repositoryName = data.repository || "Repository";

  return (
    <div className="bg-black border border-slate-800 rounded-xl p-3">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
        <span className="flex gap-x-1.5 text-sm uppercase tracking-widest text-slate-500 font-sans">
          <FolderGit2 size={20} />
          File
          Explorer
        </span>

        
      </div>

      {/* Root Folder */}
      <TreeNode node={treeRoot} defaultOpen={true} onFileClick={onFileClick} />
    </div>
  );
};

export default FileTree;