import React, { useState, useCallback, useEffect, useRef } from "react";
import { TypeAnimation } from "react-type-animation";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import FileContent from "./FileContent";

const RESPONSE_TYPE_META = {
  audit: { label: "Security audit", color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  architecture: { label: "Architecture", color: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  chat: { label: "Assistant", color: "#04b8b8", bg: "transparent", border: "transparent" },
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        padding: "3px 8px",
        cursor: "pointer",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.08em",
        color: copied ? "#22D3EE" : "#64748B",
        transition: "color 0.2s, background 0.2s",
        userSelect: "none",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
};

const CodeBlock = ({ language, children }) => {
  const code = String(children).replace(/\n$/, "");
  return (
    <div style={{ position: "relative", margin: "12px 0" }}>
      {language && (
        <div style={{
          position: "absolute",
          top: 10,
          left: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "#4B5563",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          userSelect: "none",
        }}>
          {language}
        </div>
      )}
      <CopyButton text={code} />
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "#07090F",
          fontSize: 12.5,
          fontFamily: "'JetBrains Mono', monospace",
          padding: "36px 16px 16px",
          lineHeight: 1.65,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <CodeBlock language={match[1]}>{children}</CodeBlock>
    ) : (
      <code
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          background: "rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.12)",
          borderRadius: 4,
          padding: "2px 5px",
          color: "#6385f2",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
};

const AnimatedMarkdown = ({ text, messagesEndRef, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  // Track whether this instance has already completed, to avoid re-animating
  const completedRef = useRef(false);

  useEffect(() => {
    // Reset only when text prop changes (new message), not on re-renders
    setDisplayedText("");
    completedRef.current = false;
  }, [text]);

  useEffect(() => {
    if (completedRef.current) return;

    if (displayedText.length >= text.length) {
      completedRef.current = true;
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, displayedText.length + 1));
      messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
    }, 2);

    return () => clearTimeout(timer);
  }, [displayedText, text, onComplete, messagesEndRef]);

  return (
    <ReactMarkdown components={mdComponents}>
      {displayedText}
    </ReactMarkdown>
  );
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  .cs-root {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 32px 10%;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: rgba(34,211,238,0.15) transparent;
    font-family: 'Inter', sans-serif;
  }

  .cs-root::-webkit-scrollbar { width: 4px; }
  .cs-root::-webkit-scrollbar-track { background: transparent; }
  .cs-root::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #22d3ee 0%, #0e7490 100%);
    border-radius: 99px;
  }

  .cs-welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 16px;
    user-select: none;
    position: relative;
    padding: 60px 0;
  }

  .cs-welcome-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black, transparent);
    pointer-events: none;
  }

  .cs-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(34,211,238,0.4);
    position: relative;
  }

  .cs-title {
    font-size: clamp(26px, 3.5vw, 42px);
    font-weight: 200;
    letter-spacing: -0.03em;
    color: rgba(226,232,240,0.75);
    line-height: 1;
    position: relative;
  }

  .cs-animated {
    font-size: clamp(22px, 3vw, 36px);
    font-weight: 600;
    letter-spacing: -0.03em;
    background: linear-gradient(90deg, #64748B 0%, #22D3EE 45%, #7C3AED 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    min-height: 1.3em;
    display: block;
    position: relative;
  }

  .cs-hint {
    font-size: 12px;
    color: #3F4966;
    position: relative;
    margin-top: 4px;
    letter-spacing: 0.02em;
  }

  .cs-timeline {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .cs-day-sep {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 12px 0 4px;
    user-select: none;
  }

  .cs-day-sep-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.05);
  }

  .cs-day-sep-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: #2D3650;
    text-transform: uppercase;
  }

  .cs-file-item {
    width: 100%;
    flex-shrink: 0;
    padding: 4px 0;
  }

  .cs-bubble {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    padding: 4px 0;
  }

  .cs-bubble-user {
    align-items: flex-end;
    padding-left: 20%;
  }

  .cs-bubble-ai {
    align-items: flex-start;
    padding-right: 10%;
  }

  .cs-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 0 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cs-label-user { color: #3029ff; }

  .cs-type-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 99px;
    border-width: 1px;
    border-style: solid;
  }

  .cs-body-user {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px 4px 16px 16px;
    padding: 10px 14px;
    font-size: 13.5px;
    line-height: 1.7;
    color: #CBD5E1;
    white-space: pre-wrap;
    word-break: break-word;
    max-width: 100%;
  }

  .cs-body-ai {
    font-size: 13.5px;
    line-height: 1.8;
    color: #CBD5E1;
    width: 100%;
  }

  .cs-body-ai h1, .cs-body-ai h2, .cs-body-ai h3,
  .cs-body-ai h4, .cs-body-ai h5, .cs-body-ai h6 {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    color: #E2E8F0;
    margin: 20px 0 8px;
    line-height: 1.3;
  }
  .cs-body-ai h1 { font-size: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; }
  .cs-body-ai h2 { font-size: 17px; color: #22D3EE; }
  .cs-body-ai h3 { font-size: 15px; color: #94A3B8; }

  .cs-body-ai p { margin: 8px 0; }
  .cs-body-ai p:first-child { margin-top: 0; }
  .cs-body-ai p:last-child  { margin-bottom: 0; }

  .cs-body-ai ul, .cs-body-ai ol { padding-left: 20px; margin: 8px 0; }
  .cs-body-ai li { margin: 5px 0; }

  .cs-body-ai strong { color: #F1F5F9; font-weight: 600; }
  .cs-body-ai em     { color: #94A3B8; }

  .cs-body-ai blockquote {
    border-left: 2px solid rgba(124,58,237,0.45);
    margin: 12px 0;
    padding: 6px 14px;
    color: #64748B;
    background: rgba(124,58,237,0.03);
    border-radius: 0 6px 6px 0;
    font-style: italic;
  }

  .cs-body-ai hr {
    border: none;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin: 18px 0;
  }

  .cs-body-ai a {
    color: #22D3EE;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .cs-body-ai table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    margin: 12px 0;
  }
  .cs-body-ai th {
    text-align: left;
    font-weight: 600;
    color: #94A3B8;
    font-size: 11px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 6px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .cs-body-ai td {
    padding: 7px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: #CBD5E1;
    vertical-align: top;
  }
  .cs-body-ai tr:last-child td { border-bottom: none; }

  .cs-loading-file {
    align-self: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.12em;
    color: #2D3650;
    padding: 10px 0;
    animation: cs-blink 1.4s ease-in-out infinite;
  }

  @keyframes cs-blink {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 1;   }
  }

  .cs-typing {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 12px 4px;
  }

  .cs-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: cs-bounce 1.2s ease-in-out infinite;
  }
  .cs-dot:nth-child(1) { background: #760296; animation-delay: 0s; }
  .cs-dot:nth-child(2) { background: #9F6EFF; animation-delay: 0.18s; }
  .cs-dot:nth-child(3) { background: #22D3EE; animation-delay: 0.36s; }

  @keyframes cs-bounce {
    0%, 80%, 100% { transform: translateY(0);   opacity: 0.35; }
    40%           { transform: translateY(-6px); opacity: 1;    }
  }

  .cs-history-marker {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 16px 0 8px;
    user-select: none;
  }
  .cs-history-marker-line { flex: 1; height: 1px; background: rgba(34,211,238,0.12); }
  .cs-history-marker-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.18em;
    color: rgba(34,211,238,0.25);
    text-transform: uppercase;
  }
`;

const ChatScreen = ({
  timeline,
  setTimeline,
  loading,
  sending,
  messagesEndRef,
}) => {
  return (
    <>
      <style>{styles}</style>

      <section className="cs-root">
        {timeline.length === 0 && !loading ? (
          <div className="cs-welcome">
            <div className="cs-welcome-grid" />
            <span className="cs-eyebrow">ProjectDeconstructor · RAG</span>
            <p className="cs-title">Understand any codebase.</p>
            <TypeAnimation
              sequence={[
                "Analyze code.", 2200,
                "Ask questions.", 2200,
                "Audit security.", 2200,
                "Map architecture.", 2200,
                "Navigate faster.", 2200,
              ]}
              wrapper="span"
              speed={55}
              deletionSpeed={72}
              repeat={Infinity}
              cursor
              className="cs-animated"
            />
            <p className="cs-hint">
              Select a file from the sidebar or type a question below.
            </p>
          </div>
        ) : (
          <div className="cs-timeline">
            {timeline.map((item, index) => {
              if (item.type === "file") {
                return (
                  <div key={index} className="cs-file-item">
                    <FileContent
                      selectedFile={item.path}
                      fileContent={item.content}
                      file_type={item.file_type}
                      extension={item.extension}
                      loading={false}
                    />
                  </div>
                );
              }

              const isUser = item.sender === "user";
              const meta = RESPONSE_TYPE_META[item.response_type] ?? RESPONSE_TYPE_META.chat;
              // Only animate if explicitly flagged — history always has animate: false
              const shouldAnimate = !isUser && item.animate === true;

              return (
                <div
                  key={index}
                  className={`cs-bubble ${isUser ? "cs-bubble-user" : "cs-bubble-ai"}`}
                >
                  <div className={`cs-label ${isUser ? "cs-label-user" : ""}`}>
                    {isUser ? (
                      "You"
                    ) : (
                      <>
                        <span>
                          <img src="./icon.png" alt="Assistant" style={{ width: 20, height: 20, marginRight: 2 }} />
                        </span>
                        <span style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {item.response_type && item.response_type !== "chat" && (
                          <span
                            className="cs-type-badge"
                            style={{
                              color: meta.color,
                              background: meta.bg,
                              borderColor: meta.border,
                            }}
                          >
                            {item.response_type}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {isUser ? (
                    <div className="cs-body-user">{item.text}</div>
                  ) : (
                    <div className="cs-body-ai">
                      {shouldAnimate ? (
                        <AnimatedMarkdown
                          key={`anim-${index}`}
                          text={item.text}
                          messagesEndRef={messagesEndRef}
                          onComplete={() => {
                            setTimeline(prev =>
                              prev.map((msg, i) =>
                                i === index ? { ...msg, animate: false } : msg
                              )
                            );
                          }}
                        />
                      ) : (
                        <ReactMarkdown components={mdComponents}>
                          {item.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="cs-loading-file">// loading…</div>
            )}

            {sending && (
              <div className="cs-typing">
                <span className="cs-dot" />
                <span className="cs-dot" />
                <span className="cs-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </section>
    </>
  );
};

export default ChatScreen;