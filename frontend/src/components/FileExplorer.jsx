import React, { useState, useRef, useCallback, useEffect } from "react";
import FileTree from "./FileTree";
import { Info, GripVertical } from "lucide-react";

const MIN_WIDTH = 160;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 280;

const FileExplorer = ({ repoData, handleFileClick }) => {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(null);
  const dragStartWidth = useRef(null);

  // -----------------------
  // Drag logic
  // -----------------------
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    setDragging(true);
  }, [width]);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e) => {
      const delta = e.clientX - dragStartX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
      setWidth(next);
    };

    const onMouseUp = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  return (
    <>
      {/* Drag overlay — prevents iframe/text selection eating mouse events */}
      {dragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
      )}

      <aside
        style={{ width }}
        className="relative h-screen flex flex-col border-r border-slate-800 bg-gray-950 flex-shrink-0"
      >
        {/* ---- Scrollable file tree area ---- */}
        <div
          className="flex-1 overflow-y-auto p-3 min-h-0"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#334155 transparent",
          }}
        >
          {/* Custom scrollbar for webkit browsers */}
          <style>{`
            .file-explorer-scroll::-webkit-scrollbar {
              width: 5px;
            }
            .file-explorer-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .file-explorer-scroll::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, #22d3ee 0%, #0e7490 100%);
              border-radius: 99px;
            }
            .file-explorer-scroll::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(180deg, #67e8f9 0%, #22d3ee 100%);
            }
          `}</style>

          <div className="file-explorer-scroll h-full overflow-y-auto">
            <FileTree data={repoData} onFileClick={handleFileClick} />

            <p className="text-xs text-slate-500 mt-5 leading-relaxed flex gap-1.5 items-start">
              <Info size={13} className="mt-0.5 flex-shrink-0 text-cyan-700" />
              <span className="font-sans tracking-wide">
                Select a file to view its content and ask questions about it.
              </span>
            </p>
          </div>
        </div>

        {/* ---- Drag handle ---- */}
        <div
          onMouseDown={onMouseDown}
          title="Drag to resize"
          className={`
            absolute top-0 right-0 h-full w-3 flex items-center justify-center
            cursor-col-resize z-10 group
            transition-opacity
            ${dragging ? "opacity-100" : "opacity-0 hover:opacity-100"}
          `}
        >
          {/* Thin line */}
          <div
            className={`
              h-full w-px transition-all duration-150
              ${dragging
                ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                : "bg-slate-700 group-hover:bg-cyan-600"}
            `}
          />

          {/* Grip pill */}
          <div
            className={`
              absolute flex items-center justify-center
              w-4 h-8 rounded-full
              transition-all duration-150
              ${dragging
                ? "bg-cyan-500 shadow-[0_0_12px_#22d3ee]"
                : "bg-slate-800 border border-slate-600 group-hover:border-cyan-600 group-hover:bg-slate-700"}
            `}
          >
            <GripVertical
              size={10}
              className={dragging ? "text-black" : "text-slate-400 group-hover:text-cyan-400"}
            />
          </div>
        </div>
      </aside>
    </>
  );
};

export default FileExplorer;