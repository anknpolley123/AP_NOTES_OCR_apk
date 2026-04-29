
import React from 'react';
import { Note } from '../services/storage';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, Zap, Pin, FileSpreadsheet, Presentation, FileCode, Camera } from 'lucide-react';

interface NoteItemProps {
  note: Note;
  onTogglePin?: (e: React.MouseEvent, id: string) => void;
}

export default function NoteItem({ note, onTogglePin }: NoteItemProps) {
  const navigate = useNavigate();

  // Helper to get formatted date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getIcon = () => {
    switch (note.type) {
      case 'word': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5 text-green-400" />;
      case 'ppt': return <Presentation className="w-5 h-5 text-orange-400" />;
      case 'draft': return <FileCode className="w-5 h-5 text-purple-400" />;
      case 'scan': return <Camera className="w-5 h-5 text-slate-400" />;
      default: return note.text.length > 500 ? <Zap className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div 
      onClick={() => navigate(`/editor/${note.id}`)}
      className="bg-[var(--bg-button)] p-4 rounded-[24px] border border-[var(--border-app)] mb-3 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all group"
      id={`note-item-${note.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-[var(--bg-card)] rounded-xl flex items-center justify-center text-[var(--text-muted)]">
          {getIcon()}
        </div>
        <div>
          <h3 className="font-bold text-[15px] text-[var(--text-main)] line-clamp-1">{note.title}</h3>
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mt-0.5">
            {formatDate(note.createdAt)} • {(note.text.length / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onTogglePin && (
          <button 
            onClick={(e) => onTogglePin(e, note.id)}
            className={`p-2 rounded-xl transition-all ${note.pinned ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--text-muted)] hover:text-blue-500 hover:bg-slate-800 opacity-0 group-hover:opacity-100'}`}
          >
            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
          </button>
        )}
        <div className="px-2 py-1 bg-green-500/10 text-green-500 rounded-md text-[10px] font-black tracking-tighter">
          SAVED
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] transition-colors" />
      </div>
    </div>
  );
}
