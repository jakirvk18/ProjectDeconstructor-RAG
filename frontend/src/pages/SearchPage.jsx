import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Terminal, ShieldAlert, Loader2 } from "lucide-react"; // Nice visual feedback additions
import Footer from "../components/Footer";
import FloatingStars from "../components/FloatingStars"; // Import the FloatingStars component
const SearchPage = () => {
  const [url, setUrl] = useState("");
  const [errs, setErrs] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrs("");

    const cleanUrl = url.trim();

    // FIXED VALIDATION: Relaxed check to accept browser copy-pastes
    if (
      cleanUrl.length === 0 || 
      (!cleanUrl.startsWith("https://github.com/") && !cleanUrl.startsWith("github.com/"))
    ) {
      setErrs("Please enter a valid public GitHub repository URL.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/fetch-repo", {
        link: cleanUrl,
      });

      // Redirect to the main chat layout and pass along the parsed JSON tree
      navigate("/chat", {
        state: {
          repoData: response.data,
        },
      });
    } catch (error) {
      setErrs(
        error.response?.data?.detail ||
          "Failed to access repository. Ensure it is public and try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className=" min-h-screen w-full flex flex-col justify-center items-center gap-y-6 px-4 ">
      <FloatingStars />
      
      {/* Title Header with Tech Vibe */}
      <div className="text-center space-y-2">
        {/* floating text animation */}
        <h1 className="text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-400 to-slate-100 font-bold tracking-tight font-sans animate-float">
          ProjectDeconstructor RAG
        </h1>
        <p className="text-xs tracking-widest text-slate-500 font-sans">
          Deep-dive architecture auditing via semantic RAG vectors.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-black border border-slate-800 flex flex-col gap-y-4 px-8 py-8 rounded-2xl items-center shadow-2xl max-w-xl w-full transition-all duration-300 hover:border-slate-700/80"
      >
        <div className="w-full relative flex items-center">
          <Terminal size={18} className="absolute left-4 text-slate-500" />
          <input
            type="url"
            placeholder="https://github.com/username/repository"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-gray-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl pl-11 pr-4 py-3 font-mono w-full outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all text-sm"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 font-bold text-sm tracking-wide text-slate-950 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            loading
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-cyan-400 hover:bg-cyan-300 cursor-pointer shadow-lg shadow-cyan-500/10"
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing project...</span>
            </>
          ) : (
            "Begin Repository Audit"
          )}
        </button>

        {/* Error Messaging Row */}
        {errs && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-1 w-full text-red-400 text-xs font-mono">
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errs}</span>
          </div>
        )}
      </form>
      <Footer />
    </div>
  );
};

export default SearchPage;