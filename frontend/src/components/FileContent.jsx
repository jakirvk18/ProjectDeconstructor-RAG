import React from "react";
import {
  FileCode,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

import Editor, {loader} from "@monaco-editor/react";

import * as monaco from "monaco-editor";

loader.init().then((monacoInstance) => {
  monacoInstance.editor.defineTheme("myBlackTheme", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#000000",
      "editor.lineHighlightBackground": "#111111",
      "editorGutter.background": "#000000",
      "minimap.background": "#000000",
    },
  });
});

const FileContent = ({
  selectedFile,
  fileContent,
  loading,
}) => {
  const fileType = selectedFile
    ? selectedFile.split(".").pop().toLowerCase()
    : "";

  // File extension -> Monaco language
  const getLanguage = (ext) => {
    switch (ext) {
      case "js":
        return "javascript";
      case "jsx":
        return "javascript";
      case "ts":
        return "typescript";
      case "tsx":
        return "typescript";
      case "py":
        return "python";
      case "java":
        return "java";
      case "cpp":
      case "cc":
      case "cxx":
        return "cpp";
      case "c":
        return "c";
      case "html":
        return "html";
      case "css":
        return "css";
      case "json":
        return "json";
      case "xml":
        return "xml";
      case "md":
        return "markdown";
      case "sql":
        return "sql";
      case "sh":
        return "shell";
      case "yaml":
      case "yml":
        return "yaml";
      default:
        return "plaintext";
    }
  };

  const imageExtensions = [
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "webp",
    "bmp",
    "ico",
  ];

  const isImage = imageExtensions.includes(fileType);

  return (
    <div className="h-[400px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
        {isImage ? (
          <ImageIcon size={16} className="text-purple-400" />
        ) : (
          <FileCode size={16} className="text-cyan-400" />
        )}

        <span className="font-mono text-sm text-slate-200 truncate">
          {selectedFile || "No file selected"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2
              size={24}
              className="animate-spin text-cyan-400"
            />

            <p className="text-slate-400 font-mono text-sm">
              Loading file...
            </p>
          </div>
        ) : !selectedFile ? (
          <div className="h-full flex flex-col justify-center items-center text-center">
            <FileCode
              size={48}
              className="text-slate-700 mb-4"
            />

            <h3 className="text-lg font-semibold text-slate-300">
              Repository Loaded
            </h3>

            <p className="text-slate-500 mt-2 max-w-md">
              Select a file from the explorer on the left to
              view its contents.
            </p>
          </div>
        ) : isImage ? (
          <div className="h-full flex items-center justify-center p-6 bg-slate-950">
            <img
              src={`data:image/${fileType};base64,${fileContent}`}
              alt={selectedFile}
              className="max-w-full max-h-full object-contain rounded-lg border border-slate-700"
            />
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(fileType)}
            theme="myBlackTheme"
            value={fileContent}
            options={{
              readOnly: true,
              minimap: {
                enabled: false,
              },
              fontSize: 14,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
              renderWhitespace: "selection",
              tabSize: 2,  
            }}
        
          />
        )}
      </div>
    </div>
  );
};

export default FileContent;