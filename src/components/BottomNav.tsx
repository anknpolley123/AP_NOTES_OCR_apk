
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Scan, BookOpen, Settings, FileText } from 'lucide-react';
import { softHaptic } from '../lib/haptics';

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-[var(--bg-card)]/80 backdrop-blur-xl border-t border-[var(--border-app)] px-6 pb-safe pt-2 flex justify-between items-center z-50">
      <NavLink 
        to="/" 
        onClick={() => softHaptic()}
        className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-blue-500 scale-110' : 'text-[var(--text-muted)]'}`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
      </NavLink>
      <NavLink 
        to="/ocr" 
        onClick={() => softHaptic()}
        className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-blue-500 scale-110' : 'text-[var(--text-muted)]'}`}
      >
        <Scan className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Scan</span>
      </NavLink>
      <NavLink 
        to="/pdf-workspace" 
        onClick={() => softHaptic()}
        className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-blue-500 scale-110' : 'text-[var(--text-muted)]'}`}
      >
        <FileText className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">PDF</span>
      </NavLink>
      <NavLink 
        to="/knowledge" 
        onClick={() => softHaptic()}
        className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-blue-500 scale-110' : 'text-[var(--text-muted)]'}`}
      >
        <BookOpen className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Docs</span>
      </NavLink>
      <NavLink 
        to="/settings" 
        onClick={() => softHaptic()}
        className={({ isActive }) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-blue-500 scale-110' : 'text-[var(--text-muted)]'}`}
      >
        <Settings className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Set</span>
      </NavLink>
    </nav>
  );
}
