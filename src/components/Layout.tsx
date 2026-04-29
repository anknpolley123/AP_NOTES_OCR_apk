
import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Wifi, Battery, Signal } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  hugeText?: string;
  leftAction?: React.ReactNode;
}

export default function Layout({ children, title, subtitle, showBack, actions, hugeText, leftAction }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col font-sans">
      <div className="w-full flex-1 bg-[var(--bg-card)] shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300">
        {/* Huge Decorative Background Text */}
        <div className="huge-bg-text">
          {hugeText || "NOTES\nSCAN"}
        </div>

        {/* Dragon Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 opacity-[0.05] pointer-events-none select-none z-0">
          <img src="/dragon_bg.png" alt="" className="w-full h-full object-contain" />
        </div>

        {/* Status Bar */}
        <div className="h-10 px-8 flex justify-between items-center text-[10px] font-bold text-[var(--text-muted)] z-20">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex gap-2 items-center">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3 h-3 rotate-90" />
            <span>100%</span>
          </div>
        </div>

        {/* Header Content */}
        <header className="relative z-20 px-8 pt-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {leftAction ? leftAction : showBack && (
                <button 
                  onClick={() => navigate(-1)}
                  className="p-1 -ml-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  id="back-button"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <div className="flex items-center gap-2 text-left">
                {!leftAction && !showBack && (
                  <div className="w-10 h-10 overflow-hidden rounded-xl bg-[var(--bg-button)] p-1 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/20">
                    <img src="/dragon_bg.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                )}
                <h1 className="text-[28px] font-black tracking-tight text-[var(--text-main)] uppercase italic" id="page-title">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2" id="header-actions">
              {actions}
            </div>
          </div>
          {subtitle && (
            <div className="text-[10px] font-extrabold text-blue-500 uppercase tracking-[0.2em]">
              {subtitle}
            </div>
          )}
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto px-8 relative z-10 scrollbar-hide">
          <motion.div
             key={location.pathname}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </main>

        {/* Dynamic Footer indicator (mobile like) */}
        <div className="h-6 w-full flex justify-center items-end pb-2 opacity-20 z-20">
          <div className="w-32 h-1 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
