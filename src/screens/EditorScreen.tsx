
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Save, Download, Trash2, FileText, Share2, Bold, Italic, Underline, 
  Eye, Edit3, Search, X, Palette, Undo2, Redo2, Sparkles, Wand2, ListChecks, MessageSquareText,
  FolderClosed, Mic, MicOff, PenTool, Pin, Users, Link as LinkIcon, UserPlus, LogIn, FileSpreadsheet,
  Presentation, Plus, Highlighter, Eraser as EraserIcon, Cloud, MoreHorizontal, BookOpen, 
  MoreVertical, AlignLeft, ChevronDown, Strikethrough, Smile, Scan, FileUp, Settings, Type,
  ChevronLeft, LayoutGrid, PenLine
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import SignatureCanvas from 'react-signature-canvas';
import Layout from '../components/Layout';
import { saveNote, updateNote, getNotes, softDeleteNote, Note, getFolders, Folder } from '../services/storage';
import { exportToDocx } from '../services/docxService';
import { createPDF } from '../services/pdfService';
import { summarizeText, refineText, extractActions, generateImage } from '../services/aiService';
import { auth, db, loginWithGoogle, createCollaborativeNote, updateCollaborativeNote, joinCollaborativeNote } from '../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

export default function EditorScreen() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState<Note['type']>('note');
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabNoteData, setCollabNoteData] = useState<any>(null);
  const [isCollabInSync, setIsCollabInSync] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [history, setHistory] = useState<string[]>(['']);
  const [activeTool, setActiveTool] = useState<'text' | 'pen' | 'highlighter' | 'eraser'>('text');
  const [fontSize, setFontSize] = useState(12);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showImageGenModal, setShowImageGenModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const isCollaborative = id?.startsWith('collab_');
  const currentUser = auth.currentUser;

  const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'White', value: '#ffffff' },
  ];

  // Calculate matches count
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    try {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return (text.match(regex) || []).length;
    } catch (e) {
      return 0;
    }
  }, [text, searchQuery]);

  useEffect(() => {
    loadFolders();
    // Check if we came from OCR
    if (location.state?.ocrText) {
      setText(location.state.ocrText);
      setTitle("OCR Result " + new Date().toLocaleDateString());
    }

    if (location.state?.type) {
      setType(location.state.type);
    }

    if (id) {
      if (isCollaborative) {
        setupCollaboration();
      } else {
        loadNote();
      }
    }
  }, [id, location.state, isCollaborative]);

  const setupCollaboration = async () => {
    if (!id) return;
    try {
      // Join first in case we have permission but not loaded
      await joinCollaborativeNote(id);
      
      const unsubscribe = onSnapshot(doc(db, 'notes', id), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCollabNoteData(data);
          
          // Only update if remote content is different and we haven't typed in last 2s
          if (!isCollabInSync) {
             setTitle(data.title);
             setText(data.text);
             setFolderId(data.folderId || undefined);
             setIsPinned(!!data.pinned);
             setIsCollabInSync(true);
          } else {
             // Remote change detection
             if (data.updatedAt > (collabNoteData?.updatedAt || 0)) {
                setTitle(data.title);
                setText(data.text);
             }
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Collab setup error:", e);
      alert("You don't have access to this collaborative note or it doesn't exist.");
      navigate('/');
    }
  };

  // Debounced Collab Update
  useEffect(() => {
    if (isCollaborative && id && isCollabInSync) {
      const timer = setTimeout(() => {
        updateCollaborativeNote(id, { text, title, pinned: isPinned, folderId: folderId || null });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [text, title, isPinned, folderId, isCollaborative, id, isCollabInSync]);

  // History Management
  const updateText = useCallback((newText: string, addToHistory = true) => {
    setText(newText);
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newText);
      // Limit history size to 50
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setText(history[nextIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setText(history[nextIndex]);
    }
  }, [history, historyIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !isPreview) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isPreview]);

  const loadFolders = async () => {
    const data = await getFolders();
    setFolders(data);
  };

  const loadNote = async () => {
    const notes = await getNotes(true);
    const note = notes.find(n => n.id === id);
    if (note) {
      setTitle(note.title);
      setText(note.text);
      setFolderId(note.folderId);
      setIsPinned(!!note.pinned);
      setType(note.type || 'note');
      setHistory([note.text]);
      setHistoryIndex(0);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      if (id) {
        await updateNote(id, text, title || "Untitled Note", folderId, isPinned, type);
      } else {
        await saveNote(text, title || "Untitled Note", folderId, isPinned, type);
      }
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (id && window.confirm("Move this note to Recycle bin?")) {
      await softDeleteNote(id);
      navigate('/');
    }
  };

  const handleShare = async () => {
    if (isCollaborative) {
      setShowCollabModal(true);
      return;
    }
    
    if (!text.trim()) return;
    
    const shareData = {
      title: title || 'AP_NOTES Share',
      text: text,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${title}\n\n${text}`);
        alert('Note copied to clipboard!');
      } catch (err) {
        console.error('Clipboard failed', err);
      }
    }
  };

  const handleExportTxt = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${title || 'note'}.txt`);
  };

  const handleExportWord = async () => {
    await exportToDocx(title, text);
  };

  const handleExportExcel = () => {
    const lines = text.split('\n').map(line => [line]);
    const ws = XLSX.utils.aoa_to_sheet([ [title || "Note Title"], [], ...lines ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Note");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${title || 'data'}.xlsx`);
  };

  const handleExportPPT = () => {
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    slide.addText(title || "Untitled Note", { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true, color: '363636' });
    slide.addText(text.substring(0, 500) + (text.length > 500 ? '...' : ''), { x: 0.5, y: 1.5, w: '90%', fontSize: 14, color: '646464' });
    pptx.writeFile({ fileName: `${title || 'presentation'}.pptx` });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const fileName = file.name;
      
      if (file.type === 'text/plain') {
        updateText(text + '\n\n---\n### Attached Text: ' + fileName + '\n' + content);
      } else if (file.type === 'application/pdf') {
        const attachment = `\n\n[📄 PDF Attachment: ${fileName}](${content})\n\n`;
        updateText(text + attachment);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const attachment = `\n\n[📝 Word Attachment: ${fileName}](${content})\n\n`;
        updateText(text + attachment);
      } else if (file.type.startsWith('image/')) {
        const markdown = `\n\n![${fileName}](${content})\n\n`;
        updateText(text + markdown);
      } else {
        // Generic attachment
        const attachment = `\n\n[📎 File Attachment: ${fileName}](${content})\n\n`;
        updateText(text + attachment);
      }
      
      alert(`Successfully uploaded: ${fileName}`);
    };

    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const actions = (
    <div className="flex items-center gap-1">
      <button 
        onClick={() => setIsPinned(!isPinned)} 
        className={`p-2 rounded-xl transition-all ${isPinned ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400 hover:bg-slate-800'}`}
        title={isPinned ? "Unpin Note" : "Pin Note"}
      >
        <Pin className={`w-5 h-5 ${isPinned ? 'fill-current' : ''}`} />
      </button>
      <button 
        onClick={handleShare} 
        className={`p-2 rounded-xl transition-colors ${isCollaborative ? 'text-blue-400 bg-blue-500/5' : 'text-slate-400 hover:bg-slate-800'}`} 
        title={isCollaborative ? "Collaboration Settings" : "Share/Collaborate"}
      >
        {isCollaborative ? <Users className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
      </button>
      <button onClick={handleExportTxt} className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" title="Export Text">
        <FileText className="w-5 h-5" />
      </button>
      <button onClick={() => createPDF(text, title)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" title="Export PDF">
        <Download className="w-5 h-5 text-red-400" />
      </button>
      <button onClick={handleExportWord} className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" title="Export Word">
        <FileText className="w-5 h-5 text-blue-400" />
      </button>
      <button onClick={handleExportExcel} className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" title="Export Excel">
        <FileSpreadsheet className="w-5 h-5 text-green-400" />
      </button>
      <button onClick={handleExportPPT} className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" title="Export PPT">
        <Presentation className="w-5 h-5 text-orange-400" />
      </button>
      <div className="relative">
        <button 
           onClick={() => document.getElementById('file-import')?.click()} 
           className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" 
           title="Import File"
        >
          <Plus className="w-5 h-5 text-blue-400" />
        </button>
        <input 
           id="file-import" 
           type="file" 
           className="hidden" 
           accept=".txt,.pdf,.docx,image/*" 
           onChange={handleImportFile} 
        />
      </div>
      {id && (
        <button onClick={handleDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors" id="delete-note">
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => createPDF(text, title || "Note")} className="p-2 text-slate-400 hover:bg-slate-800 rounded-xl transition-colors" id="export-pdf">
        <Download className="w-5 h-5" />
      </button>
      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors disabled:opacity-50"
        id="save-note"
      >
        <Save className="w-5 h-5" />
      </button>
    </div>
  );

  const formatText = (style: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    const textarea = document.getElementById('note-text-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    
    let prefix = '';
    let suffix = '';

    switch (style) {
      case 'bold':
        prefix = suffix = '**';
        break;
      case 'italic':
        prefix = suffix = '*';
        break;
      case 'underline':
        prefix = '<u>';
        suffix = '</u>';
        break;
      case 'strikethrough':
        prefix = suffix = '~~';
        break;
    }

    // Toggle logic: if selected text is already wrapped in the prefix/suffix, unwrap it
    const isFormatted = selectedText.startsWith(prefix) && selectedText.endsWith(suffix);
    
    let formatted = '';
    if (isFormatted && selectedText.length >= (prefix.length + suffix.length)) {
      formatted = selectedText.substring(prefix.length, selectedText.length - suffix.length);
    } else {
      formatted = `${prefix}${selectedText}${suffix}`;
    }

    const newText = text.substring(0, start) + formatted + text.substring(end);
    updateText(newText);

    // Re-focus and set selection
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, start + formatted.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    }, 0);
  };

  const applyColor = (color: string) => {
    const textarea = document.getElementById('note-text-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    
    const formatted = `<span style="color: ${color}">${selectedText}</span>`;
    const newText = text.substring(0, start) + formatted + text.substring(end);
    updateText(newText);
    setShowColorPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
    }, 0);
  };

  const insertList = () => {
    const lines = text.split('\n');
    const newText = lines.map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n');
    updateText(newText);
  };

  const handleAiAction = async (action: 'summarize' | 'refinement' | 'actions' | 'generate_image') => {
    if (!text.trim() && action !== 'generate_image') return;
    
    if (action === 'generate_image') {
      setShowAiMenu(false);
      setShowImageGenModal(true);
      return;
    }

    setIsAiProcessing(true);
    setShowAiMenu(false);
    
    try {
      let result = '';
      switch (action) {
        case 'summarize':
          setAiStatus('SUMMARIZING CONTENT...');
          result = await summarizeText(text);
          updateText(text + "\n\n---\n### AI Summary\n" + result);
          break;
        case 'refinement':
          setAiStatus('REFINING TEXT...');
          result = await refineText(text);
          updateText(result);
          break;
        case 'actions':
          setAiStatus('EXTRACTING TASKS...');
          result = await extractActions(text);
          updateText(text + "\n\n---\n### AI Action Items\n" + result);
          break;
      }
    } catch (error) {
      console.error(error);
      alert("AI Service encountered an issue. Please try again.");
    } finally {
      setIsAiProcessing(false);
      setAiStatus('');
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      setAiStatus('GENERATING IMAGE...');
      setIsAiProcessing(true);
      const imageUrl = await generateImage(imagePrompt);
      const markdown = `\n\n![Generated: ${imagePrompt}](${imageUrl})\n\n`;
      updateText(text + markdown);
      setShowImageGenModal(false);
      setImagePrompt('');
    } catch (error) {
      console.error(error);
      alert("Failed to generate image. Please try a different prompt.");
    } finally {
      setIsGeneratingImage(false);
      setIsAiProcessing(false);
      setAiStatus('');
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        updateText(text + (text.endsWith(' ') || text === '' ? '' : ' ') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const sigCanvas = React.useRef<SignatureCanvas>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const audioTag = `\n\n<audio controls src="${base64Audio}"></audio>\n\n`;
          updateText(text + audioTag);
          setAudioURL(URL.createObjectURL(audioBlob));
          setIsRecordingAudio(false);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecordingAudio = () => {
    if (isRecordingAudio) {
      stopRecordingAudio();
    } else {
      startRecordingAudio();
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const saveSignature = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Please provide a signature first.");
      return;
    }
    
    const dataURL = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataURL) {
      const textarea = document.getElementById('note-text-textarea') as HTMLTextAreaElement;
      const signatureMarkdown = `\n\n![Signature](${dataURL})\n\n`;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = text.substring(0, start) + signatureMarkdown + text.substring(end);
        updateText(newText);
      } else {
        updateText(text + signatureMarkdown);
      }
      
      setShowSignatureModal(false);
    }
  };

  // Formatting Toolbar - Redesigned to match image
  const renderToolbar = () => null; // We'll move toolbar logic directly into the main return for better layout control

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header matched to screenshot */}
      <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-3 sticky top-0 z-[60]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 text-slate-800">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <input 
            type="text" 
            placeholder="Title" 
            className="bg-transparent border-none outline-none text-xl font-medium text-slate-800 placeholder:text-slate-400 w-32 sm:w-64"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsPreview(!isPreview)} className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <BookOpen className="w-5 h-5" />
          </button>
          <button onClick={handleSave} className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <Plus className="w-5 h-5 font-bold" />
          </button>
          <div className="relative group">
            <button className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {/* Popover Menu for more actions */}
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 min-w-[180px] z-50">
               <button onClick={handleShare} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700">
                  <Share2 className="w-4 h-4" /> Share
               </button>
               <button onClick={handleExportTxt} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700">
                  <FileText className="w-4 h-4" /> Export Text
               </button>
               <button onClick={() => createPDF(text, title)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700">
                  <Download className="w-4 h-4" /> Export PDF
               </button>
               <button onClick={handleExportWord} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700">
                  <Download className="w-4 h-4 text-blue-500" /> Export Word (.docx)
               </button>
               {id && (
                 <button onClick={handleDelete} className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl text-xs font-semibold text-red-500">
                    <Trash2 className="w-4 h-4" /> Delete Note
                 </button>
               )}
            </div>
          </div>
        </div>
      </header>

      {/* Drawing/Pen Toolbar matched to screenshot */}
      <div className="h-14 bg-[#f1f3f8] flex items-center justify-between px-3 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setActiveTool('text')}
             className={`p-2 rounded-xl transition-all ${activeTool === 'text' ? 'bg-slate-200 shadow-sm border border-slate-300' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <LayoutGrid className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setActiveTool('pen')}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'pen' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <PenLine className="w-5 h-5 text-slate-800" />
             {activeTool === 'pen' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
           </button>
           <button 
             onClick={() => setActiveTool('highlighter')}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'highlighter' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <Highlighter className="w-5 h-5 text-yellow-500" />
             {activeTool === 'highlighter' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
           </button>
           <button 
             onClick={() => setActiveTool('eraser')}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'eraser' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <EraserIcon className="w-5 h-5 text-red-400" />
             {activeTool === 'eraser' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
           </button>
           <button className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl"><Sparkles className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-1.5">
           <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl disabled:opacity-20"><Undo2 className="w-5 h-5" /></button>
           <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl disabled:opacity-20"><Redo2 className="w-5 h-5" /></button>
           <div className="w-px h-6 bg-slate-300 mx-1" />
           <button 
             onClick={() => setShowAiMenu(!showAiMenu)}
             className={`p-2 rounded-xl transition-colors relative ${showAiMenu ? 'bg-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <Wand2 className="w-5 h-5" />
             {showAiMenu && (
                <div className="absolute top-12 right-0 z-[100] bg-white border border-slate-100 rounded-2xl p-2 shadow-2xl min-w-[200px] animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => handleAiAction('summarize')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <MessageSquareText className="w-4 h-4 text-blue-500" />
                    Summarize Note
                  </button>
                  <button 
                    onClick={() => handleAiAction('refinement')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Wand2 className="w-4 h-4 text-purple-500" />
                    Refine & Polish
                  </button>
                  <button 
                    onClick={() => handleAiAction('actions')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <ListChecks className="w-4 h-4 text-green-500" />
                    Extract Actions
                  </button>
                  <button 
                    onClick={() => handleAiAction('generate_image')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Palette className="w-4 h-4 text-pink-500" />
                    Magic Image (AI)
                  </button>
                </div>
              )}
           </button>
        </div>
      </div>

      {/* Main Content with faint dragon watermark */}
      <main className="flex-1 overflow-y-auto bg-white relative pb-[80vh] scroll-smooth">
        <div className="absolute inset-x-0 top-0 h-[300vh] pointer-events-none opacity-[0.02] flex items-start justify-center p-20 pt-40">
           <img src="/dragon_bg.png" alt="" className="w-full max-w-4xl object-contain grayscale animate-pulse" />
        </div>

        {isPreview ? (
          <div className="p-8 sm:p-12 lg:p-20 prose prose-slate max-w-6xl mx-auto prose-img:rounded-3xl min-h-[100vh]">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{text || "_Write something amazing..._"}</ReactMarkdown>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto h-full min-h-[100vh]">
            <textarea 
              placeholder="Start writing..." 
              className="w-full h-full p-8 sm:p-12 lg:p-20 outline-none resize-none text-xl text-slate-700 leading-relaxed bg-transparent relative z-10 font-normal min-h-[80vh]"
              value={text}
              onChange={(e) => updateText(e.target.value)}
              id="note-text-textarea"
            />
          </div>
        )}

        {isAiProcessing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{aiStatus || 'Processing...'}</span>
             </div>
          </div>
        )}
      </main>

      {/* Formatting & tools sticky bottom matched to screenshot */}
      <footer className="fixed bottom-0 inset-x-0 bg-[#f8f9fc]/90 backdrop-blur-md border-t border-slate-200 z-[60] pb-safe">
        {/* Row 1: Text Options */}
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-5 min-w-max">
              <button onClick={insertList} className="p-1"><ListChecks className="w-5 h-5 text-slate-500" /></button>
              <button className="p-1"><AlignLeft className="w-5 h-5 text-slate-500" /></button>
              <button className="p-1"><Type className="w-5 h-5 text-slate-500" /></button>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-200/50 rounded-lg text-xs font-bold text-slate-700">
                 {fontSize} <ChevronDown className="w-3 h-3" />
              </div>
              <div className="w-px h-5 bg-slate-200" />
              <button onClick={() => formatText('bold')} className="text-sm font-black text-slate-700 px-1">B</button>
              <button onClick={() => formatText('italic')} className="text-sm italic font-serif text-slate-700 px-1">I</button>
              <button onClick={() => formatText('underline')} className="text-sm underline text-slate-700 px-1">U</button>
              <button onClick={() => formatText('strikethrough')} className="text-sm line-through text-slate-700 px-1">T</button>
           </div>
        </div>

        {/* Row 2: Media/System tools */}
        <div className="h-14 flex items-center justify-between px-4">
           <div className="flex items-center gap-7">
              <button className="text-slate-400 hover:text-slate-700"><Smile className="w-6 h-6" /></button>
              <button onClick={toggleRecordingAudio} className={`transition-colors ${isRecordingAudio ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-700'}`} title="Record Audio">
                {isRecordingAudio ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button onClick={() => navigate('/ocr')} className="text-slate-400 hover:text-slate-700"><Scan className="w-6 h-6" /></button>
              <button onClick={() => setShowSignatureModal(true)} className="text-slate-400 hover:text-slate-700" title="Add Signature"><PenTool className="w-6 h-6" /></button>
              <button onClick={() => document.getElementById('file-import-bottom')?.click()} className="text-slate-400 hover:text-slate-700"><Plus className="w-6 h-6" /></button>
              <button onClick={() => navigate('/settings')} className="text-slate-400 hover:text-slate-700"><Settings className="w-6 h-6" /></button>
              <input id="file-import-bottom" type="file" className="hidden" accept=".txt,.pdf,.docx,image/*" onChange={handleImportFile} />
           </div>
           <button className="text-slate-300">
              <MoreHorizontal className="w-6 h-6" />
           </button>
        </div>
      </footer>

      {/* Image Generation Modal */}
      {showImageGenModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="w-6 h-6 text-pink-500" />
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Magic Image Generator</h3>
              </div>
              <button 
                onClick={() => setShowImageGenModal(false)}
                className="text-white/40 hover:text-white transition-colors"
                disabled={isGeneratingImage}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Describe what you want to see</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="e.g. A futuristic city with flying cars at sunset, oil painting style..."
                  className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-pink-500 outline-none transition-all resize-none shadow-inner"
                  disabled={isGeneratingImage}
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowImageGenModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100"
                  disabled={isGeneratingImage}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/10"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      Generate Magic
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature & Modals Kept (integrated in Menu/Actions) */}
      {showSignatureModal && (
        <div id="signature-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div id="signature-modal-container" className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-1 bg-slate-50">
              <SignatureCanvas 
                ref={sigCanvas} 
                penColor='black' 
                canvasProps={{ 
                  width: 400, 
                  height: 250, 
                  className: 'sigCanvas w-full rounded-2xl bg-white',
                  id: 'signature-canvas'
                }} 
              />
            </div>
            <div className="p-6 grid grid-cols-2 gap-3">
              <button 
                id="clear-signature-btn"
                onClick={clearSignature} 
                className="bg-slate-100 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Clear
              </button>
              <button 
                id="apply-signature-btn"
                onClick={saveSignature} 
                className="bg-blue-600 py-3 rounded-2xl font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
