
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Trash2, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import { getDeletedNotes, restoreNote, deleteNotePermanently, Note } from '../services/storage';

export default function RecycleBinScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const data = await getDeletedNotes();
    setNotes(data);
  };

  const handleRestore = async (id: string) => {
    await restoreNote(id);
    loadNotes();
  };

  const handleDeletePermanent = async (id: string) => {
    if (confirm("Delete this note permanently?")) {
      await deleteNotePermanently(id);
      loadNotes();
    }
  };

  const handleEmptyBin = async () => {
    if (confirm("Empty recycle bin? All notes will be permanently deleted.")) {
      for (const note of notes) {
        await deleteNotePermanently(note.id);
      }
      loadNotes();
    }
  };

  return (
    <Layout 
      title="Recycle bin" 
      subtitle={`${notes.length} notes`}
      showBack
      actions={
        notes.length > 0 && (
          <button 
            onClick={handleEmptyBin}
            className="text-[10px] font-black text-red-500 uppercase tracking-widest px-3 py-1 bg-red-500/10 rounded-lg"
          >
            Empty
          </button>
        )
      }
    >
      <div className="flex-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-30">
             <Trash2 className="w-16 h-16 mb-4" />
             <p className="text-sm font-black uppercase tracking-widest">Recycle bin is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div 
                key={note.id}
                className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-app)] flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[var(--bg-button)] rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-[var(--text-main)] uppercase tracking-tight">{note.title}</h3>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      Deleted {new Date(note.deletedAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button 
                     onClick={() => handleRestore(note.id)}
                     className="p-2 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600/20"
                     title="Restore"
                   >
                     <RefreshCcw className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={() => handleDeletePermanent(note.id)}
                     className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                     title="Delete Permanently"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-8 p-4 bg-[var(--bg-button)]/30 rounded-2xl border border-[var(--border-app)]">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase text-center leading-relaxed">
          Notes in the recycle bin will be permanently deleted after 30 days.
        </p>
      </div>
    </Layout>
  );
}
