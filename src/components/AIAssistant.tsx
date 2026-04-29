
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, MinusCircle, Maximize2, FileText, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      if (e.detail?.message) {
        setInput(e.detail.message);
      }
    };
    window.addEventListener('open-gemini-chat', handleOpenChat);
    return () => window.removeEventListener('open-gemini-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Create chat history for context
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are a helpful, professional productivity assistant. You help users with their notes, documents, and general tasks. Be concise and practical. Use markdown for formatting.",
        },
        history: history as any
      });

      const response = await chat.sendMessage({
        message: userMessage
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Sorry, I couldn\'t process that.' }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'An error occurred. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-48 right-4 z-[200] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '500px',
              width: '360px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-slate-900 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Google Gemini</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-white/50 text-[8px] font-black uppercase tracking-widest">Advanced AI Active</span>
                    </div>
                  </div>
                </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 no-scrollbar"
                >
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                      <div className="p-4 bg-blue-50 rounded-full">
                        <Sparkles className="w-8 h-8 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-slate-800 font-black uppercase text-xs tracking-widest leading-relaxed">
                          How can I help you today?
                        </p>
                        <p className="text-slate-500 text-[11px] mt-1">
                          Draft a note, summarize a doc, or just chat.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 w-full max-w-[240px]">
                        {[
                          { text: "Summarize my last note", icon: <FileText className="w-3 h-3" /> },
                          { text: "Help me write a report", icon: <PenLine className="w-3 h-3" /> },
                          { text: "Explain Quantum Physics", icon: <Sparkles className="w-3 h-3 text-blue-500" /> }
                        ].map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setInput(s.text); }}
                            className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 hover:border-blue-500 hover:shadow-md transition-all text-left"
                          >
                            {s.icon}
                            {s.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div 
                      key={i} 
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          m.role === 'user' ? 'bg-slate-200' : 'bg-blue-500'
                        }`}>
                          {m.role === 'user' ? <User className="w-4 h-4 text-slate-500" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                          m.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}>
                          {m.role === 'model' ? (
                            <div className="markdown-body">
                              <ReactMarkdown>{m.text}</ReactMarkdown>
                            </div>
                          ) : (
                            m.text
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form 
                  onSubmit={handleSend}
                  className="p-4 bg-white border-t border-slate-100"
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Gemini anything..."
                      className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-4 pr-12 text-[13px] focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
