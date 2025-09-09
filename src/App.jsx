import React, { useState, useRef, useEffect } from "react";
import { URL } from "./components/Api_url";
import "./App.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// ================= Main App Component =================
function App() {
  // ----------- States -----------
  const [question, setQuestion] = useState(""); // Input box ka text
  const [chatSessions, setChatSessions] = useState(() => {
    const saved = localStorage.getItem("chatSessions");
    return saved ? JSON.parse(saved) : []; // Local storage se load karo
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar toggle

  const [activeSession, setActiveSession] = useState(0); // Kaunsa chat active hai
  const [isLoading, setIsLoading] = useState(false); // API loading state
  const [typingAnswer, setTypingAnswer] = useState(""); // AI type ho rahi hai
  const [isTyping, setIsTyping] = useState(false);
  // const [inputPinned, setInputPinned] = useState(false); // Input box bottom me chipka rahe
  const [copiedIndex, setCopiedIndex] = useState(null); // Copy code button index
  const typingIntervalRef = useRef(null);
  const chatEndRef = useRef(null);
  const typingSavedRef = useRef(false);

  // ----------- LocalStorage me save karna -----------
  useEffect(() => {
    try {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    } catch {
      console.warn("LocalStorage full, cannot save chat sessions.");
    }
  }, [chatSessions]);

  // Cleanup jab component unmount ho
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, []);


  // Text ko readable banane ke liye cleanup
  const cleanText = (text) => {
    if (!text) return "";
    let cleaned = text.replace(/\*\*/g, "").replace(/\*/g, "");
    cleaned = cleaned.replace(/^### (.*$)/gim, "👉 $1");
    cleaned = cleaned.replace(/^## (.*$)/gim, "✨ $1");
    cleaned = cleaned.replace(/^# (.*$)/gim, "🌟 $1");
    cleaned = cleaned.replace(/^\s*[-•*]\s+/gim, "• ");
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gim, "🔹 ");
    return cleaned.trim();
  };

  // Answer render karna with code highlight
  const renderAnswer = (text) => {
    const safeText = text || "";
    const tickCount = (safeText.match(/```/g) || []).length;

    if (tickCount < 2 || tickCount % 2 !== 0) {
      return (
        <p className=" break-words whitespace-pre-wrap text-left my-2 leading-relaxed text-base sm:text-lg md:text-[20px] ">
          {cleanText(safeText)}
        </p>
      );
    }

    const parts = safeText.split(/```/);

    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <div key={`code-${i}`} className="relative my-2">
          {/* Copy button for code */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(part.trim());
              setCopiedIndex(i);
              setTimeout(() => setCopiedIndex(null), 2000);
            }}
            className="absolute right-2 top-2 bg-blue-800 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
          >
            {copiedIndex === i ? "✅ Copied!" : "📋 Copy"}
          </button>

          <SyntaxHighlighter
            language="javascript"
            style={vscDarkPlus}
            codeTagProps={{
              style: { fontSize: "18px" },
            }}
            customStyle={{
              padding: "12px",
              borderRadius: "10px",
              fontSize: "13px",
            }}
          >
            {part.trim()}
          </SyntaxHighlighter>
        </div>
      ) : (
        <p
          key={`txt-${i}`}
          className="break-words whitespace-pre-wrap text-left my-2 leading-relaxed text-sm sm:text-base md:text-lg"
        >
          {cleanText(part)}
        </p>
      )
    );
  };

  // Typing ke baad response save karna
  const saveResponseToSession = (a) => {
    if (!a || typingSavedRef.current) return;
    setChatSessions((prev) => {
      const next = [...prev];
      next[activeSession][next[activeSession].length - 1].a = a;
      return next;
    });
    typingSavedRef.current = true;
  };

  // Typing stop karna
  const stopTyping = () => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    if (typingAnswer.trim()) {
      saveResponseToSession(typingAnswer);
    }
    setTypingAnswer("");
    setIsTyping(false);
  };

  // Question ask karna
  const askQuestion = async () => {
    if (!question.trim() || isLoading || isTyping) return;
    setIsLoading(true);
    typingSavedRef.current = false;

    const askedQuestion = question.trim();

    if (!chatSessions[activeSession]) {
      setChatSessions((prev) => [[{ q: askedQuestion, a: "" }], ...prev]);
      setActiveSession(0);
    } else {
      setChatSessions((prev) => {
        const next = [...prev];
        next[activeSession] = [
          ...next[activeSession],
          { q: askedQuestion, a: "" },
        ];
        return next;
      });
    }

    const payload = { contents: [{ parts: [{ text: askedQuestion }] }] };
   
    

    try {
      const respRaw = await fetch(`${URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resp = await respRaw.json();
      const dataString =
        resp?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      setTypingAnswer("");
      setIsTyping(true);
      // setInputPinned(true);

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      if (!dataString) {
        saveResponseToSession("");
        setIsTyping(false);
        setTypingAnswer("");
        setQuestion("");
        setIsLoading(false);
        return;
      }

      let i = -1;
      typingIntervalRef.current = setInterval(() => {
        if (i >= dataString.length) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;

          saveResponseToSession(dataString);
          setTypingAnswer("");
          setIsTyping(false);
          return;
        }
        setTypingAnswer((prev) => prev + dataString.charAt(i));
        i++;
      }, 30);
    } catch (e) {
      console.error("AI error:", e);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setIsTyping(false);
      setTypingAnswer("");
    } finally {
      setQuestion("");
      setIsLoading(false);
    }
  };

  // Auto scroll always bottom par
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [chatSessions, typingAnswer, isTyping, isLoading]);

 

  // ----------- JSX Return -----------

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 text-center overflow-hidden">

      {/* ---------- Left Sidebar (Desktop) ---------- */}
      <div className={`
          fixed inset-y-0 left-0 z-50 w-[100%] transform bg-[#202123] text-white p-5 border-r border-gray-700 
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:col-span-1
        `}
      >
        <h2 className="text-2xl font-bold mb-8 text-gray-300">History</h2>

        <button
           onClick={() => {
              setChatSessions((prev) => [[ ], ...prev]);
              setActiveSession(0);
              setIsSidebarOpen(false); // sidebar band
    }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg mb-4 transition duration-200"
        >
          + New Chat
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("chatSessions");
            setChatSessions([]);
            setActiveSession(0);
            setIsSidebarOpen(false); // sidebar band
    }}
          className="w-full mb-4 p-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-md rounded-lg transition duration-200"
        >
          🗑 Clear All Chats
        </button>

          {/* Chat sessions list */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[70vh] no-scrollbar">
          {chatSessions
            .filter((session) => session.length > 0)
            .map((session, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setActiveSession(idx);
                  setIsSidebarOpen(false); // Sidebar band kar do
                }}
                className={`p-3 rounded-lg cursor-pointer transition shadow ${
                  idx === activeSession
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 hover:bg-zinc-600"
                }`}
              >
                <p className="text-sm font-semibold truncate">
                  {session[0]?.q || "New Chat"}
                </p>
                <p className="text-xs text-gray-300 truncate">
                  {session[0]?.a?.slice(0, 40) || "No messages yet..."}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* ---------- Right Chat Area ---------- */}

      <div className="lg:col-span-4 flex flex-col bg-white h-screen overflow-hidden">
          {/* Header */}
        <header className="relative p-2 border-b border-gray-200">
         
            {/* Hamburger Button */}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 text-gray-800 focus:outline-none float-left mt-2 top-4 left-4 z-[60] bg-[#e5e7ee] rounded-md shadow-md"
          >
        
          {isSidebarOpen ? (
            <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
          </svg>
        ) : (
          
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      )}
          </button>

          <h1 className="font-bold text-xl sm:text-2xl md:text-3xl p-4 text-center text-gray-800">
          DevDose AI 
        </h1>
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-2 sm:px-7 p-4">
          <div className="text-white flex flex-col gap-6 sm:gap-8">
            {chatSessions[activeSession]?.map((chat, idx) => (
              <div key={idx} className="flex flex-col gap-2">
               
                {/* User Question */}
                <div className=" text-right my-8 mr-2 mt-1 sm:mr-8">
                  <p className="text-left bg-gradient-to-r bg-gray-700 inline-block px-3 sm:px-4 py-2 rounded-3xl max-w-[85%] sm:max-w-[70%] text-lg sm:text-xl md:text-[18px] shadow-md break-words">
                    {chat.q}
                  </p>
                </div>

                {/* AI Answer */}
                {chat.a && (
                  <div className="text-left bg-gray-700 text-neutral-200 rounded-2xl px-3 sm:px-5 py-2 max-w-[90%] sm:max-w-[75%] md:text-[18px] shadow-md border-gray-600 break-words">
                    {renderAnswer(chat.a)}
                  </div>
                )}
              </div>
            ))}

           { /* Loading Effect */}
            {isLoading && !isTyping && (
              <div className="text-left overflow-y-auto">
                <p className="text-gray-800 px-4 py-2 my-2 mb-50 inline-block animate-pulse text-base sm:text-lg">
                  Thinking…
                </p>
              </div>
            )}

            {/* Typing Effect */}
            {typingAnswer && (
              <div className="text-left bg-gray-700 text-neutral-200 rounded-2xl px-3 sm:px-5 py-2 my-2 max-w-[90%] sm:max-w-[75%] ">
                {renderAnswer(typingAnswer)}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Box */}
         <div className="sticky w-[96%] sm:w-2/3 bg-[#111] p-2 sm:p-3text-white rounded-3xl flex border border-zinc-700 shadow-lg m-auto mb-6 sm:mb-4">

          <textarea value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                askQuestion();
                setQuestion("");
                e.target.style.height = "auto";
              }
            }}
            className="flex-1 p-1 pl-3 outline-none bg-transparent text-base sm:text-lg md:text-lg resize-none overflow-hidden placeholder-gray-400"
            placeholder="Ask me anything..."
            rows={1}
          />
          {isTyping ? (
            <button
              onClick={stopTyping}
              className="ml-2 sm:ml-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-5 py-1 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition text-xs sm:text-sm md:text-lg shadow-md"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={askQuestion}
              className="ml-2 sm:ml-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-5 py-1 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition text-xs sm:text-sm md:text-lg shadow-md"
            >
              Ask
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;



