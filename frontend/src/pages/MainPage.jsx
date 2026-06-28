import React, { useState, useRef, useEffect, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Package, ArrowUp, Trash2 } from "lucide-react";
import FileExplorer from "../components/FileExplorer";
import ChatScreen from "../components/ChatScreen";
import Footer from "../components/Footer";

const API_BASE = "http://127.0.0.1:8000";

const MainPage = () => {
  const location = useLocation();
  const repoData = location.state?.repoData;

  const [timeline, setTimeline] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);

  const messagesEndRef = useRef(null);

  // -----------------------
  // Auto-scroll
  // -----------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline, loading, sending]);

  // -----------------------
  // Load Chat History on Mount
  // -----------------------
  useEffect(() => {
    if (!repoData?.repository) return;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/chat-history/${encodeURIComponent(repoData.repository)}`
        );

        if (!response.ok) {
          console.warn("Failed to load chat history:", response.status);
          return;
        }

        const data = await response.json();

        if (data.success && data.messages.length > 0) {
          // Convert stored messages into timeline entries
          const restored = data.messages.flatMap((msg) => [
            { type: "chat", sender: "user", text: msg.query },
            {
              type: "chat",
              sender: "ai",
              text: msg.answer,
              response_type: msg.response_type,
            },
          ]);
          setTimeline(restored);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [repoData?.repository]);

  if (!repoData) {
    return <Navigate to="/" replace />;
  }

  // -----------------------
  // Open File
  // -----------------------
  const handleFileClick = useCallback(
    async (fileNode) => {
      try {
        setLoading(true);

        const response = await fetch(`${API_BASE}/get-file-content`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repository: repoData.repository,
            path: fileNode.path,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setSelectedFile(fileNode.path);
          setTimeline((prev) => [
            ...prev,
            {
              type: "file",
              path: fileNode.path,
              content: data.content,
              file_type: data.file_type,
              extension: data.extension,
            },
          ]);
        }
      } catch (err) {
        console.error(err);
        setTimeline((prev) => [
          ...prev,
          { type: "chat", sender: "ai", text: "Error loading file." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [repoData.repository]
  );

  // -----------------------
  // Send Chat
  // -----------------------
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || sending) return;

    const question = inputValue.trim();

    setTimeline((prev) => [
      ...prev,
      { type: "chat", sender: "user", text: question },
    ]);
    setInputValue("");
    setSending(true);

    try {
      const response = await fetch(`${API_BASE}/ask-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository: repoData.repository,
          query: question,
          currentFile: selectedFile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Server error");
      }

      setTimeline((prev) => [
        ...prev,
        {
          type: "chat",
          sender: "ai",
          text: data.answer || "No response received.",
          response_type: data.response_type,
        },
      ]);
    } catch (err) {
      console.error(err);
      setTimeline((prev) => [
        ...prev,
        {
          type: "chat",
          sender: "ai",
          text: `Error: ${err.message || "Could not reach AI server."}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, repoData.repository, selectedFile]);

  // -----------------------
  // Clear Chat History
  // -----------------------
  const handleClearChat = useCallback(async () => {
    if (clearing || timeline.length === 0) return;

    const confirmed = window.confirm(
      "Clear all chat history for this repository? This cannot be undone."
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const response = await fetch(`${API_BASE}/chat-history`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: repoData.repository }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to clear history");
      }

      setTimeline([]);
      setSelectedFile("");
    } catch (err) {
      console.error("Clear chat error:", err);
      alert(`Could not clear history: ${err.message}`);
    } finally {
      setClearing(false);
    }
  }, [clearing, timeline.length, repoData.repository]);

  // -----------------------
  // Keyboard handler
  // -----------------------
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="min-h-screen flex bg-black text-slate-100">
      <FileExplorer repoData={repoData} handleFileClick={handleFileClick} />

      <main className="flex-1 flex flex-col h-screen min-h-0">
        {/* Header */}
        <header className="border-b border-slate-800 bg-black p-4 flex items-center justify-between">
          <h2 className="font-sans tracking-widest gap-x-1 text-sm text-cyan-400 flex items-center">
            <span className="flex gap-x-1 p-2">
              <Package size={18} />
              Active Project
            </span>
            <span className="ml-2 text-slate-200 p-2 bg-gray-900 border-l-2 border-cyan-500">
              {repoData.repository}
            </span>
          </h2>

          {/* Clear history button — only shown when there are messages */}
          {timeline.length > 0 && (
            <button
              onClick={handleClearChat}
              disabled={clearing}
              title="Clear chat history"
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 px-3 py-2 rounded border border-slate-700 hover:border-red-500"
            >
              <Trash2 size={14} />
              {clearing ? "Clearing…" : "Clear history"}
            </button>
          )}
        </header>

        {/* Chat / File Timeline */}
        <ChatScreen
          timeline={timeline}
          loading={loading || historyLoading}
          sending={sending}
          messagesEndRef={messagesEndRef}
        />

        {/* Input */}
        <footer className="p-4 flex items-center justify-center flex-col">
          <div className="bg-gray-900 py-2 w-2/3 max-w-3xl rounded-full flex gap-3">
            <input
              type="text"
              value={inputValue}
              placeholder="Ask something about the repository..."
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1 rounded-full px-6 py-3 outline-none focus:border-cyan-500 bg-transparent disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !inputValue.trim()}
              className="rounded-full bg-cyan-600 p-4 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed mr-2 transition-colors"
            >
              <ArrowUp size={18} className="text-slate-100" />
            </button>
          </div>
          <Footer />
        </footer>
      </main>
    </div>
  );
};

export default MainPage;