import React, { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { API, getToken } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function TutorDrawer({ open, onClose, lessonId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef(null);
  const { user } = useAuth();
  const sessionId = lessonId ? `lesson-${lessonId}` : `tutor-${user?.id}`;

  useEffect(() => {
    if (!open) return;
    fetch(`${API}/tutor/history?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then((r) => r.json()).then((d) => setMessages(d.messages || []));
  }, [open, sessionId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    const msg = input;
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(`${API}/tutor/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: msg, session_id: sessionId, lesson_id: lessonId }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const payload = JSON.parse(p.slice(6));
          if (payload.delta) {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + payload.delta };
              return copy;
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
          />
          <motion.aside
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 glass flex flex-col"
            data-testid="tutor-drawer"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-display font-bold">AI Tutor</div>
                  <div className="text-xs text-muted-foreground">Claude Sonnet 4.5</div>
                </div>
              </div>
              <button onClick={onClose} data-testid="tutor-close" className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground mt-10">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-indigo-500" />
                  Ask me anything about your lesson. I'll guide you, not just give away answers.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    data-testid={`tutor-msg-${m.role}`}
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user" ? "bg-sky-500 text-white rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  data-testid="tutor-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about this lesson…"
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  disabled={streaming}
                />
                <button
                  onClick={send}
                  disabled={streaming}
                  data-testid="tutor-send"
                  className="px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
