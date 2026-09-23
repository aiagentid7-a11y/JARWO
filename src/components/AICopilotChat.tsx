import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { MessageSquare, Send, X, Bot, Sparkles, Trash2, ArrowRight } from 'lucide-react';

interface AICopilotChatProps {
  onHighlightDepartment: (deptName: string) => void;
  onCommandExecuted?: () => void;
}

export default function AICopilotChat({ onHighlightDepartment, onCommandExecuted }: AICopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo! Saya **AI Super Admin Agent (Gemini 3.5)**. Dengan kredensial **Super Admin Terpasang**, saya dapat membantu Anda menganalisis, menyaring, dan mengelola database karyawan One For All secara real-time. Ada yang bisa saya bantu hari ini?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Map history to simple objects for API
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chatHistory })
      });

      const data = await response.json();
      
      if (response.ok && data.reply) {
        // Trigger page refresh/refetch of employees if a database mutation command was executed
        if (data.commandExecuted && onCommandExecuted) {
          onCommandExecuted();
        }

        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Server returned an error');
      }

    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `Maaf, saya gagal memproses permintaan Anda: ${err.message || err}. Pastikan koneksi server aktif dan kunci API ter-configure.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Halo! Saya **AI Super Admin Agent (Gemini 3.5)**. Dengan kredensial **Super Admin Terpasang**, saya dapat membantu Anda menganalisis, menyaring, dan mengelola database karyawan One For All secara real-time. Ada yang bisa saya bantu hari ini?',
        timestamp: new Date()
      }
    ]);
  };

  // Predefined prompts helper
  const suggestionPrompts = [
    "Berapa total karyawan bagian SURVEYOR?",
    "Siapa saja karyawan yang jabatannya KTT?",
    "Tampilkan statistik usia karyawan dan rata-ratanya",
    "Perbandingan karyawan Lokal vs Non-Lokal"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      
      {/* 1. CHAT WINDOW PANEL */}
      {isOpen && (
        <div className="bg-slate-900 rounded-2xl w-[90vw] sm:w-[420px] h-[550px] shadow-2xl border border-slate-800 flex flex-col overflow-hidden mb-4 animate-slide-in">
          {/* Header */}
          <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm font-heading flex items-center gap-1.5">
                  <span>AI Copilot Agent</span>
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-500/30 tracking-wider">
                    SUPER ADMIN
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">Model: Gemini 3.5 Flash</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={clearChat}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded transition-colors cursor-pointer"
                title="Hapus Percakapan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded transition-colors cursor-pointer"
                title="Tutup Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages list (Scrollable) */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/40">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-2.5 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {m.role !== 'user' && (
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 self-start mt-0.5">
                    AI
                  </div>
                )}
                
                <div className={`p-3.5 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm' 
                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none shadow-sm space-y-1'
                }`}>
                  {/* Simplistic markdown display */}
                  <div className="prose prose-sm leading-relaxed max-w-none">
                    {m.content.split('\n').map((line, idx) => {
                      // Basic parsing for bold markdown **text**
                      let parsedLine = line;
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      const parts = [];
                      let lastIndex = 0;
                      let match;
                      
                      while ((match = boldRegex.exec(line)) !== null) {
                        parts.push(line.substring(lastIndex, match.index));
                        parts.push(<strong key={match.index} className="font-bold text-white">{match[1]}</strong>);
                        lastIndex = boldRegex.lastIndex;
                      }
                      parts.push(line.substring(lastIndex));

                      return (
                        <p key={idx} className="my-1">
                          {parts.length > 1 ? parts : parsedLine}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 self-start">
                  AI
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1 py-4 px-5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            
            {/* suggestions triggers */}
            {messages.length === 1 && (
              <div className="space-y-2 pt-4">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Topik Cepat</p>
                <div className="flex flex-col gap-1.5">
                  {suggestionPrompts.map((p, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSend(p)}
                      className="text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white shadow-sm transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span>{p}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <div className="p-4 border-t border-slate-850 bg-slate-950/60 flex gap-2 items-center">
            <input 
              type="text" 
              placeholder="Tanyakan analisis HR..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputMessage)}
              disabled={isLoading}
              className="flex-1 bg-slate-950 px-4 py-2.5 text-sm border border-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 focus:bg-slate-950 transition-all disabled:opacity-60"
            />
            <button 
              onClick={() => handleSend(inputMessage)}
              disabled={isLoading || !inputMessage.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. CHAT LAUNCHER BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full border border-slate-800 shadow-2xl flex items-center justify-center hover:scale-105 transition-all relative z-50 cursor-pointer group"
        title="Buka AI Copilot HR"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6" />
            <span className="absolute right-14 bg-slate-950 text-white border border-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all shadow-lg pointer-events-none mr-2">
              Tanya AI Copilot HR
            </span>
          </>
        )}
      </button>

    </div>
  );
}
