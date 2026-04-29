
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Save, Download, Trash2, FileText, Share2, Bold, Italic, 
  Eye, Edit3, Search, X, Undo2, Redo2, Sparkles, Wand2, ListChecks, MessageSquareText,
  FolderClosed, Mic, MicOff, PenTool, Pin, Users, Link as LinkIcon, UserPlus, LogIn, FileSpreadsheet,
  Presentation, Plus, Highlighter, Eraser as EraserIcon, Cloud, MoreHorizontal, BookOpen, 
  MoreVertical, AlignLeft, ChevronDown, Strikethrough, Smile, Scan, FileUp, Settings, Type,
  ChevronLeft, LayoutGrid, PenLine, Settings2, Grid3X3, Minus, Square, Circle, Play, Pause, StopCircle, ChevronRight,
  Replace, Languages, MessageSquare, History, Palette, AlignCenter, AlignRight, Underline,
  MousePointer2, Shapes, Table, ListTodo, Brush, Pen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import SignatureCanvas from 'react-signature-canvas';
import Layout from '../components/Layout';
import { saveNote, updateNote, getNotes, softDeleteNote, Note, getFolders, Folder } from '../services/storage';
import { exportToDocx } from '../services/docxService';
import { createPDF } from '../services/pdfService';
import { 
  summarizeText, refineText, extractActions, generateImage, 
  generateDocument, translateText, autoFormatText, spellCheckText,
  SummaryOptions 
} from '../services/aiService';
import { auth, db, loginWithGoogle, createCollaborativeNote, updateCollaborativeNote, joinCollaborativeNote, getUserProfiles, inviteCollaboratorByEmail } from '../services/firebaseService';
import { doc, onSnapshot, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
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
  const [recordingTime, setRecordingTime] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabNoteData, setCollabNoteData] = useState<any>(null);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<any[]>([]);
  const [isCollabInSync, setIsCollabInSync] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [history, setHistory] = useState<string[]>(['']);
  const [activeTool, setActiveTool] = useState<'text' | 'pen' | 'highlighter' | 'eraser' | 'lasso' | 'shapes' | 'pencil'>('text');
  const [penStyle, setPenStyle] = useState<'fountain' | 'calligraphy' | 'marker'>('fountain');
  const [highlighterStyle, setHighlighterStyle] = useState<'round' | 'square'>('round');
  const [isStraightLineMode, setIsStraightLineMode] = useState(false);
  const [eraserMode, setEraserMode] = useState<'stroke' | 'area' | 'highlighterOnly'>('area');
  const [audioMapping, setAudioMapping] = useState<{ timestamp: number, charIndex: number }[]>([]);
  const [fontSize, setFontSize] = useState(12);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showImageGenModal, setShowImageGenModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDocGenModal, setShowDocGenModal] = useState(false);
  const [showNoteTemplateModal, setShowNoteTemplateModal] = useState(false);
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [commentText, setCommentText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [refinedText, setRefinedText] = useState('');
  const [docPrompt, setDocPrompt] = useState('');
  const [docType, setDocType] = useState('Report');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [pageTemplate, setPageTemplate] = useState<'plain' | 'lined' | 'grid' | 'dots'>('plain');
  const [penColor, setPenColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(2);
  const [highlighterColor, setHighlighterColor] = useState('#fde047');
  const [highlighterWidth, setHighlighterWidth] = useState(12);
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    length: 'medium',
    format: 'bullet points'
  });
  const [imagePrompt, setImagePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showPenSettings, setShowPenSettings] = useState(false);
  const [showHighlighterSettings, setShowHighlighterSettings] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

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

  // Fetch collaborator profiles
  useEffect(() => {
    if (collabNoteData) {
      const uids = [collabNoteData.ownerId, ...(collabNoteData.collaborators || [])];
      getUserProfiles(uids).then(profiles => {
        setCollaboratorProfiles(profiles);
      });
    }
  }, [collabNoteData]);

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
    if (isRecordingAudio) {
      setAudioMapping(prev => [...prev, { timestamp: recordingTime, charIndex: newText.length }]);
    }
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newText);
      // Limit history size to 50
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex, isRecordingAudio, recordingTime]);

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
      if ((note as any).pageTemplate) setPageTemplate((note as any).pageTemplate);
      if (note.tags) setTags(note.tags);
      setHistory([note.text]);
      setHistoryIndex(0);
    }
  };

  const handleSave = async () => {
    if (!text.trim() && !title.trim()) return;
    setIsSaving(true);
    try {
      if (id) {
        await updateNote(id, text, title || "Untitled Note", folderId, isPinned, type, { pageTemplate, tags });
      } else {
        await saveNote(text, title || "Untitled Note", folderId, isPinned, type, { pageTemplate, tags });
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

  const insertTable = () => {
    const tableSkeleton = "\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Item 1   | Item 2   |\n";
    const textarea = document.getElementById('note-text-textarea') as HTMLTextAreaElement;
    if (!textarea) {
       updateText(text + tableSkeleton);
       return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + tableSkeleton + text.substring(end);
    updateText(newText);
  };

  const insertChecklist = () => {
    const checklistSkeleton = "\n- [ ] Task 1\n- [ ] Task 2\n";
    const textarea = document.getElementById('note-text-textarea') as HTMLTextAreaElement;
    if (!textarea) {
       updateText(text + checklistSkeleton);
       return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + checklistSkeleton + text.substring(end);
    updateText(newText);
  };

  const handleAiAction = async (action: 'summarize' | 'refinement' | 'actions' | 'generate_image' | 'generate_document' | 'auto_format' | 'spell_check') => {
    if (!text.trim() && action !== 'generate_image' && action !== 'generate_document') return;
    
    if (action === 'generate_image') {
      setShowAiMenu(false);
      setShowImageGenModal(true);
      return;
    }

    if (action === 'summarize') {
      setShowAiMenu(false);
      setShowSummaryModal(true);
      return;
    }

    if (action === 'generate_document') {
      setShowAiMenu(false);
      setShowDocGenModal(true);
      return;
    }

    setIsAiProcessing(true);
    setShowAiMenu(false);
    
    try {
      let result = '';
      switch (action) {
        case 'refinement':
          setAiStatus('REFINING TEXT...');
          result = await refineText(text);
          setRefinedText(result);
          setShowRefinementModal(true);
          break;
        case 'auto_format':
          setAiStatus('FORMATTING NOTE...');
          result = await autoFormatText(text);
          updateText(result);
          break;
        case 'spell_check':
          setAiStatus('CHECKING SPELLING...');
          result = await spellCheckText(text);
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

  const handleSummarize = async () => {
    setIsAiProcessing(true);
    setShowSummaryModal(false);
    try {
      setAiStatus('SUMMARIZING CONTENT...');
      const result = await summarizeText(text, summaryOptions);
      updateText(text + "\n\n---\n### AI Summary (" + summaryOptions.length + ", " + summaryOptions.format + ")\n" + result);
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

  const handleReplace = () => {
    if (!searchQuery) return;
    const newText = text.split(searchQuery).join(replaceQuery);
    updateText(newText);
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      setAiStatus(`TRANSLATING TO ${targetLang.toUpperCase()}...`);
      setIsAiProcessing(true);
      const translated = await translateText(text, targetLang);
      setRefinedText(translated); 
      setShowTranslateModal(true);
    } catch (error) {
      console.error(error);
      alert("Translation failed.");
    } finally {
      setIsTranslating(false);
      setIsAiProcessing(false);
      setAiStatus('');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !id || !currentUser) return;
    try {
      const noteRef = doc(db, 'notes', id);
      await updateDoc(noteRef, {
        comments: arrayUnion({
          id: Date.now().toString(),
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email,
          userPhoto: currentUser.photoURL,
          text: commentText,
          createdAt: Date.now()
        })
      });
      setCommentText('');
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleGenerateDocument = async () => {
    if (!docPrompt.trim()) return;
    setIsGeneratingDoc(true);
    try {
      setAiStatus(`GENERATING ${docType.toUpperCase()}...`);
      setIsAiProcessing(true);
      const result = await generateDocument(docPrompt, docType);
      
      if (text.trim()) {
        updateText(text + "\n\n---\n" + result);
      } else {
        updateText(result);
        if (!title.trim()) {
           setTitle(docType + ": " + (docPrompt.substring(0, 30) + "..."));
        }
      }
      
      setShowDocGenModal(false);
      setDocPrompt('');
    } catch (error) {
      console.error(error);
      alert("Failed to generate document. Please try again.");
    } finally {
      setIsGeneratingDoc(false);
      setIsAiProcessing(false);
      setAiStatus('');
    }
  };

  const NOTE_TEMPLATES = [
    {
      id: 'meeting',
      name: 'Meeting Minutes',
      description: 'Agenda, attendees, and action items.',
      icon: <Users className="w-5 h-5 text-blue-500" />,
      content: `# Meeting Minutes: [Subject]
**Date:** ${new Date().toLocaleDateString()}
**Location:** [Room/Zoom]
**Attendees:** 
- [Name]

## Agenda
1. [Topic 1]
2. [Topic 2]

## Discussion
- [Point A]
- [Point B]

## Action Items
- [ ] [Task] - @[Person]
- [ ] [Task] - @[Person]

## Next Steps
- [Next Meeting Date]`
    },
    {
      id: 'project',
      name: 'Project Plan',
      description: 'Objectives, timeline, and resources.',
      icon: <LayoutGrid className="w-5 h-5 text-purple-500" />,
      content: `# Project Plan: [Project Name]
**Status:** 🟡 Planning
**Owner:** [Name]

## 1. Objectives
- [Primary goal]
- [Secondary goal]

## 2. Scope
- [In scope]
- [Out of scope]

## 3. Timeline & Milestones
- [Date] - Milestone 1
- [Date] - Milestone 2

## 4. Resources
- [Team Member] - [Role]

## 5. Risk Assessment
- [Risk] -> [Mitigation]`
    },
    {
      id: 'journal',
      name: 'Journal Entry',
      description: 'Daily reflection and gratitude.',
      icon: <PenLine className="w-5 h-5 text-pink-500" />,
      content: `# Journal Entry: ${new Date().toLocaleDateString()}
**Mood:** [Select: Grateful | Focused | Energetic | Tired]

## Reflection
[Write about your day...]

## Gratitude
- [Something you're thankful for]
- [Someone you appreciate]

## Tomorrow's Focus
1. [Primary goal]
2. [Secondary goal]

> "The best way to predict the future is to create it."`
    },
    {
      id: 'brainstorm',
      name: 'Brainstorming',
      description: 'Unstructured idea capture.',
      icon: <Sparkles className="w-5 h-5 text-yellow-500" />,
      content: `# Brainstorm Session: [Topic]
**Problem Statement:** [What are we trying to solve?]

## Initial Ideas
- [Idea 1]
- [Idea 2]

## Deep Dive
### Idea A
[Details, pros/cons]

### Idea B
[Details, pros/cons]

## Selection (Top 3)
1. [Winner]
2. [Runner up]
3. [Wildcard]`
    }
  ];

  const applyTemplate = (templateContent: string, templateName: string) => {
    if (text.trim() && !window.confirm("This will overwrite your current content. Continue?")) {
      return;
    }
    updateText(templateContent);
    if (!title.trim()) {
      setTitle(templateName);
    }
    setShowNoteTemplateModal(false);
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
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

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
          
          const textarea = document.getElementById('note-text-textarea') as HTMLTextAreaElement;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = text.substring(0, start) + audioTag + text.substring(end);
            updateText(newText);
          } else {
            updateText(text + audioTag);
          }
          
          setAudioURL(URL.createObjectURL(audioBlob));
          setIsRecordingAudio(false);
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          setShowVoiceModal(false);
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setShowVoiceModal(true);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-full group">
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <input 
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add tag..."
              className="w-16 bg-transparent border-none outline-none text-[10px] font-bold text-slate-400 placeholder:text-slate-300"
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCollaborative && collaboratorProfiles.length > 0 && (
            <div className="flex items-center -space-x-2 mr-2">
              {collaboratorProfiles.map((profile, i) => (
                <div 
                  key={i} 
                  className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm"
                  title={profile.displayName || profile.email}
                >
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">
                      {profile.displayName?.[0] || profile.email?.[0] || '?'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={() => setShowTemplateMenu(!showTemplateMenu)} 
            className={`p-2 rounded-full transition-colors ${showTemplateMenu ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            title="Page Template"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setShowFindReplace(!showFindReplace)} 
            className={`p-2 rounded-full transition-colors ${showFindReplace ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            title="Find & Replace"
          >
            <Search className="w-5 h-5" />
          </button>

          {isCollaborative && (
            <button 
              onClick={() => setShowComments(!showComments)} 
              className={`p-2 rounded-full transition-colors relative ${showComments ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
              title="Comments"
            >
              <MessageSquare className="w-5 h-5" />
              {collabNoteData?.comments?.length > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </button>
          )}

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
             onClick={() => {
               if (activeTool === 'pen' || activeTool === 'pencil') setShowPenSettings(!showPenSettings);
               setActiveTool('pen');
             }}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'pen' || activeTool === 'pencil' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <PenLine className="w-5 h-5" style={{ color: penColor }} />
             {(activeTool === 'pen' || activeTool === 'pencil') && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
             
             {showPenSettings && (activeTool === 'pen' || activeTool === 'pencil') && (
               <div className="absolute bottom-12 left-0 z-[120] bg-white border border-slate-100 rounded-[24px] shadow-2xl p-4 min-w-[220px] animate-in slide-in-from-bottom-2 duration-200">
                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Styles & Colors</div>
                 <div className="grid grid-cols-4 gap-2 mb-4">
                   <button onClick={() => { setPenStyle('fountain'); setActiveTool('pen'); }} className={`p-2 rounded-lg border ${penStyle === 'fountain' && activeTool === 'pen' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`} title="Fountain"><Pen className="w-4 h-4" /></button>
                   <button onClick={() => { setPenStyle('calligraphy'); setActiveTool('pen'); }} className={`p-2 rounded-lg border ${penStyle === 'calligraphy' && activeTool === 'pen' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`} title="Calligraphy"><Brush className="w-4 h-4" /></button>
                   <button onClick={() => { setPenStyle('marker'); setActiveTool('pen'); }} className={`p-2 rounded-lg border ${penStyle === 'marker' && activeTool === 'pen' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`} title="Marker"><Highlighter className="w-4 h-4" /></button>
                   <button onClick={() => { setActiveTool('pencil'); }} className={`p-2 rounded-lg border ${activeTool === 'pencil' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`} title="Pencil"><PenLine className="w-4 h-4" /></button>
                 </div>

                 <div className="flex flex-wrap gap-2 mb-4">
                   {['#000000', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'].map(c => (
                     <button 
                       key={c}
                       onClick={(e) => { e.stopPropagation(); setPenColor(c); }}
                       className={`w-6 h-6 rounded-full border-2 ${penColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                       style={{ backgroundColor: c }}
                     />
                   ))}
                   <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} className="w-6 h-6 rounded-full border-none p-0 overflow-hidden cursor-pointer" />
                 </div>
                 <div className="space-y-2 text-left">
                   <div className="flex justify-between text-[10px] font-bold text-slate-500">
                     <span>THICKNESS</span>
                     <span>{penWidth}px</span>
                   </div>
                   <input 
                     type="range" min="1" max="10" 
                     value={penWidth} 
                     onChange={(e) => setPenWidth(parseInt(e.target.value))}
                     className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800"
                   />
                 </div>
               </div>
             )}
           </button>
           <button 
             onClick={() => {
               if (activeTool === 'highlighter') setShowHighlighterSettings(!showHighlighterSettings);
               setActiveTool('highlighter');
             }}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'highlighter' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <Highlighter className="w-5 h-5" style={{ color: highlighterColor }} />
             {activeTool === 'highlighter' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}

             {showHighlighterSettings && activeTool === 'highlighter' && (
               <div className="absolute bottom-12 left-0 z-[120] bg-white border border-slate-100 rounded-[24px] shadow-2xl p-4 min-w-[220px] animate-in slide-in-from-bottom-2 duration-200 text-left">
                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Highlighter Styles</div>
                 <div className="flex gap-2 mb-4">
                   <button onClick={() => setHighlighterStyle('round')} className={`flex-1 p-2 rounded-lg border ${highlighterStyle === 'round' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}><Circle className="w-4 h-4 mx-auto" /></button>
                   <button onClick={() => setHighlighterStyle('square')} className={`flex-1 p-2 rounded-lg border ${highlighterStyle === 'square' ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}><Square className="w-4 h-4 mx-auto" /></button>
                 </div>
                 <button onClick={() => setIsStraightLineMode(!isStraightLineMode)} className={`w-full py-2 mb-4 rounded-xl text-[8px] font-bold uppercase tracking-widest border transition-all ${isStraightLineMode ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'border-slate-100 text-slate-400'}`}>Straight Line Mode: {isStraightLineMode ? 'ON' : 'OFF'}</button>
                 <div className="flex flex-wrap gap-2 mb-4">
                   {['#fde047', '#86efac', '#93c5fd', '#f9a8d4', '#c4b5fd'].map(c => (
                     <button 
                       key={c}
                       onClick={(e) => { e.stopPropagation(); setHighlighterColor(c); }}
                       className={`w-6 h-6 rounded-full border-2 ${highlighterColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                       style={{ backgroundColor: c }}
                     />
                   ))}
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-[10px] font-bold text-slate-500">
                     <span>THICKNESS</span>
                     <span>{highlighterWidth}px</span>
                   </div>
                   <input 
                     type="range" min="5" max="30" 
                     value={highlighterWidth} 
                     onChange={(e) => setHighlighterWidth(parseInt(e.target.value))}
                     className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                   />
                 </div>
               </div>
             )}
           </button>
           <button 
             onClick={() => {
               if (activeTool === 'eraser') {
                 if (eraserMode === 'area') setEraserMode('stroke');
                 else if (eraserMode === 'stroke') setEraserMode('highlighterOnly');
                 else setEraserMode('area');
               }
               setActiveTool('eraser');
             }}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'eraser' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
           >
             <EraserIcon className={`w-5 h-5 ${eraserMode === 'highlighterOnly' ? 'text-yellow-600' : 'text-red-400'}`} />
             {activeTool === 'eraser' && (
               <>
                 <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                 <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded-lg uppercase whitespace-nowrap z-50 shadow-xl">{eraserMode} Mode</div>
               </>
             )}
           </button>
           <button 
             onClick={() => setActiveTool('lasso')}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'lasso' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
             title="Lasso Selection"
           >
             <MousePointer2 className="w-5 h-5 text-indigo-500" />
             {activeTool === 'lasso' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
           </button>
           <button 
             onClick={() => setActiveTool('shapes')}
             className={`p-2 rounded-xl transition-all relative ${activeTool === 'shapes' ? 'bg-white shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
             title="Auto-Shape Tool"
           >
             <Shapes className="w-5 h-5 text-orange-500" />
             {activeTool === 'shapes' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />}
           </button>
           <button 
              onClick={() => setShowImageGenModal(true)}
              className="p-2 text-pink-500 hover:bg-pink-50 rounded-xl transition-all"
              title="Magic Image (AI)"
            >
              <Sparkles className="w-5 h-5" />
            </button>
        </div>

        <div className="flex items-center gap-1.5">
           <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl disabled:opacity-20"><Undo2 className="w-5 h-5" /></button>
           <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl disabled:opacity-20"><Redo2 className="w-5 h-5" /></button>
           <div className="w-px h-6 bg-slate-300 mx-1" />
           <button 
              onClick={insertTable}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl"
              title="Insert Table"
            >
              <Table className="w-5 h-5" />
            </button>
            <button 
              onClick={insertChecklist}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl"
              title="Checklist"
            >
              <ListTodo className="w-5 h-5" />
            </button>
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
                    onClick={() => handleAiAction('auto_format')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <LayoutGrid className="w-4 h-4 text-orange-500" />
                    Auto-Format (AI)
                  </button>
                  <button 
                    onClick={() => handleAiAction('spell_check')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    Spell Check Assist
                  </button>
                  <button 
                    onClick={() => {
                       setIsAiProcessing(true);
                       setAiStatus('CLEANING UP HANDWRITING...');
                       setTimeout(() => { setIsAiProcessing(false); setAiStatus(''); }, 1500);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Wand2 className="w-4 h-4 text-blue-400" />
                    Straighten Handwriting
                  </button>
                  <button 
                    onClick={() => handleAiAction('auto_format')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest border-b border-slate-50"
                  >
                    <PenLine className="w-4 h-4 text-purple-500" />
                    Handwriting to Text
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
                  <button 
                    onClick={() => handleAiAction('generate_document')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Generate Doc (AI)
                  </button>
                  <button 
                    onClick={() => { setShowAiMenu(false); setShowTranslateModal(true); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Languages className="w-4 h-4 text-orange-500" />
                    Translate Note
                  </button>
                  <button 
                    onClick={() => {
                      setShowAiMenu(false);
                      window.dispatchEvent(new CustomEvent('open-gemini-chat', { 
                        detail: { message: `I'm working on this note: "${title}". Can you help me with it?\n\nContent:\n${text}` } 
                      }));
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-colors text-blue-700 text-[10px] font-black uppercase tracking-widest border border-blue-100 mt-2"
                  >
                    <MessageSquareText className="w-4 h-4 text-blue-600" />
                    Chat with Gemini
                  </button>
                </div>
              )}
           </button>
        </div>
      </div>

      {/* Find & Replace Bar */}
      <AnimatePresence>
        {showFindReplace && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-4 sticky top-14 z-[45] shadow-sm"
          >
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Find..." 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Replace className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Replace with..." 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={handleReplace}
              className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors"
            >
              Replace All
            </button>
            <button 
              onClick={() => setShowFindReplace(false)}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content with faint dragon watermark */}
        {audioURL && (
          <div className="mx-auto max-w-6xl px-12 pt-8 relative z-50">
             <motion.div 
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="bg-slate-900 rounded-[32px] p-6 flex items-center gap-6 text-white shadow-2xl border border-slate-800"
             >
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                   <Mic className="w-6 h-6" />
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-end mb-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-blue-400">Audio Bookmark Sync</div>
                      <div className="text-[10px] font-bold text-slate-400">02:14 / 05:00</div>
                   </div>
                   <div className="h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                      <motion.div 
                        animate={{ width: isRecordingAudio ? '100%' : '35%' }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" 
                      />
                   </div>
                </div>
                <button 
                  onClick={() => setAudioURL(null)}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5 opacity-40" />
                </button>
             </motion.div>
             <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {audioMapping.length > 0 && (
                   <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-[9px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap animate-pulse">
                      Sync Active: Text Highlighted during Playback
                   </div>
                )}
                <button className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap hover:bg-slate-200">
                   Add Manual Bookmark
                </button>
             </div>
          </div>
        )}

        <main className={`flex-1 overflow-y-auto bg-white relative pb-[80vh] scroll-smooth ${
          pageTemplate === 'lined' ? 'paper-lined' : 
          pageTemplate === 'grid' ? 'paper-grid' : 
          pageTemplate === 'dots' ? 'paper-dots' : ''
        }`}>
        <div className="absolute inset-x-0 top-0 h-[300vh] pointer-events-none opacity-[0.02] flex items-start justify-center p-20 pt-40">
           <img src="/dragon_bg.png" alt="" className="w-full max-w-4xl object-contain grayscale animate-pulse" />
        </div>

        {isPreview ? (
          <div className="p-8 sm:p-12 lg:p-20 prose prose-slate max-w-6xl mx-auto prose-img:rounded-3xl min-h-[100vh]">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{text || "_Write something amazing..._"}</ReactMarkdown>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto h-full min-h-[100vh] relative">
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

      {/* Comments Sidebar */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 bg-white border-l border-slate-100 flex flex-col z-40 shadow-2xl relative"
          >
            <div className="p-6 border-b border-slate-50 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Comments</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Collaborative Feedback</p>
              </div>
              <button onClick={() => setShowComments(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {collabNoteData?.comments?.length > 0 ? (
                collabNoteData.comments.map((comment: any) => (
                  <div key={comment.id} className="space-y-2 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {comment.userPhoto ? (
                          <img src={comment.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-500">
                            {comment.userName[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-slate-900">{comment.userName}</span>
                      <span className="text-[8px] font-bold text-slate-300 ml-auto">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl rounded-tl-none p-3 text-xs text-slate-600 leading-relaxed border border-slate-100/50">
                      {comment.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center grayscale opacity-30">
                  <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No comments yet</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-50 bg-white space-y-3 shrink-0">
              <textarea 
                placeholder="Share your thoughts..."
                className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="w-full py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Post Comment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* Formatting & tools sticky bottom matched to screenshot */}
      <footer className="fixed bottom-0 inset-x-0 bg-[#f8f9fc]/90 backdrop-blur-md border-t border-slate-200 z-[60] pb-safe">
        {/* Row 1: Text Options */}
        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 overflow-x-auto no-scrollbar">
           <div className="flex items-center gap-5 min-w-max">
              <button onClick={insertChecklist} className="p-1"><ListChecks className="w-5 h-5 text-slate-500" /></button>
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
              <div className="relative inline-block">
                <button 
                  onClick={() => setShowColorPicker(!showColorPicker)} 
                  className={`p-1 transition-colors ${showColorPicker ? 'text-blue-500' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Text Color"
                >
                  <Palette className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showColorPicker && (
                    <>
                      <div className="fixed inset-0 z-[120]" onClick={() => setShowColorPicker(false)} />
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: -10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: -10 }}
                        className="absolute bottom-full left-0 mb-2 z-[130] bg-white border border-slate-100 rounded-xl shadow-2xl p-2 min-w-[160px]"
                      >
                        <div className="grid grid-cols-4 gap-1">
                          {colors.map(color => (
                            <button 
                              key={color.value}
                              onClick={() => applyColor(color.value)}
                              className="w-6 h-6 rounded-md border border-slate-100 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
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
              <button 
                onClick={() => setShowNoteTemplateModal(true)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Use Template"
              >
                <Grid3X3 className="w-6 h-6" />
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-gemini-chat', { 
                  detail: { message: `I'm working on this note: "${title}". Can you help me with it?\n\nContent:\n${text}` } 
                }))}
                className="text-blue-500 hover:scale-110 transition-transform" 
                title="Chat with Google Gemini"
              >
                <Sparkles className="w-6 h-6" />
              </button>
              <button onClick={() => document.getElementById('file-import-bottom')?.click()} className="text-slate-400 hover:text-slate-700"><Plus className="w-6 h-6" /></button>
              <button onClick={() => navigate('/settings')} className="text-slate-400 hover:text-slate-700"><Settings className="w-6 h-6" /></button>
              <input id="file-import-bottom" type="file" className="hidden" accept=".txt,.pdf,.docx,image/*" onChange={handleImportFile} />
           </div>
           <button className="text-slate-300">
              <MoreHorizontal className="w-6 h-6" />
           </button>
        </div>
      </footer>

      {/* Voice Recording Modal */}
      <AnimatePresence>
        {showVoiceModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (isRecordingAudio) stopRecordingAudio();
                setShowVoiceModal(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col relative z-20 border border-slate-100"
            >
              <div className="p-8 bg-slate-900 flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center relative">
                   {isRecordingAudio && (
                     <div className="absolute inset-x-0 inset-y-0 bg-red-500 rounded-full animate-ping opacity-25" />
                   )}
                   <Mic className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Voice Recording</div>
                  <h3 className="text-3xl font-black text-white tabular-nums tracking-tighter">
                    {formatTime(recordingTime)}
                  </h3>
                </div>
              </div>
              
              <div className="p-8 bg-white flex flex-col gap-4">
                <div className="flex justify-center flex-wrap gap-2 mb-4">
                  {[...Array(8)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        height: isRecordingAudio ? [10, Math.random() * 40 + 10, 10] : 10 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.5, 
                        delay: i * 0.05 
                      }}
                      className="w-1.5 bg-blue-500 rounded-full"
                    />
                  ))}
                </div>
                
                <button 
                  onClick={stopRecordingAudio}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-3"
                >
                  <StopCircle className="w-5 h-5" />
                  Stop & Embed
                </button>
                
                <button 
                  onClick={() => {
                    if (isRecordingAudio) stopRecordingAudio();
                    setShowVoiceModal(false);
                  }}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                >
                  Cancel Recording
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page Template Menu */}
      <AnimatePresence>
        {showTemplateMenu && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setShowTemplateMenu(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-20 right-14 z-[110] bg-white border border-slate-100 rounded-[32px] shadow-2xl p-4 min-w-[240px]"
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 p-2 mb-2">Page Templates</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'plain', name: 'Plain', icon: <Square className="w-5 h-5" /> },
                  { id: 'lined', name: 'Lined', icon: <AlignLeft className="w-5 h-5" /> },
                  { id: 'grid', name: 'Grid', icon: <Grid3X3 className="w-5 h-5" /> },
                  { id: 'dots', name: 'Dots', icon: <Circle className="w-5 h-5 fill-current scale-50" /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setPageTemplate(t.id as any); setShowTemplateMenu(false); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                      pageTemplate === t.id ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-100' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {t.icon}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showImageGenModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGeneratingImage && setShowImageGenModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative z-20 border border-slate-100"
            >
              <div className="p-8 bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-black uppercase tracking-widest">Magic Image Gen</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1 h-1 bg-pink-400 rounded-full animate-pulse" />
                      <span className="text-white/50 text-[8px] font-black uppercase tracking-widest leading-none">Powered by Gemini</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowImageGenModal(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  disabled={isGeneratingImage}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">What should Gemini create for you?</label>
                  <div className="relative">
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g. A vibrant cyberpunk marketplace, cinematic lighting, 8k..."
                      className="w-full h-32 bg-slate-50 border border-slate-100 rounded-[28px] p-6 text-sm focus:ring-2 focus:ring-pink-500 outline-none transition-all resize-none shadow-inner"
                      disabled={isGeneratingImage}
                      autoFocus
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      AI GENERATION
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setImagePrompt("A minimalistic abstract background with soft gradients")}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-wider text-slate-500 hover:border-pink-300 hover:text-pink-600 transition-all text-center"
                    disabled={isGeneratingImage}
                  >
                    Abstract
                  </button>
                  <button 
                    onClick={() => setImagePrompt("A hyper-realistic 3D render of a futuristic gadget")}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-wider text-slate-500 hover:border-pink-300 hover:text-pink-600 transition-all text-center"
                    disabled={isGeneratingImage}
                  >
                    Futuristic
                  </button>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowImageGenModal(false)}
                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isGeneratingImage}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-pink-500/10"
                  >
                    {isGeneratingImage ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-pink-400 rounded-full animate-spin" />
                        Generating Magic...
                      </>
                    ) : (
                      <>
                        <Palette className="w-5 h-5 text-pink-400" />
                        Create Image
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {isGeneratingImage && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
                    <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Gemini is thinking...</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Note Template Modal */}
      <AnimatePresence>
        {showNoteTemplateModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoteTemplateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative z-20 border border-slate-100"
            >
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Note Templates</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select a blueprint for your note</p>
                </div>
                <button 
                  onClick={() => setShowNoteTemplateModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 bg-white space-y-3">
                {NOTE_TEMPLATES.map((template) => (
                  <button 
                    key={template.id}
                    onClick={() => applyTemplate(template.content, template.name)}
                    className="w-full p-4 rounded-[28px] border border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all group text-left flex items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-900">{template.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">{template.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              <div className="p-6 bg-white border-t border-slate-50">
                <button 
                  onClick={() => setShowNoteTemplateModal(false)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                >
                  Keep current content
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Translation Modal */}
      <AnimatePresence>
        {showTranslateModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTranslateModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col relative z-20 border border-slate-100 max-h-[90vh]"
            >
              <div className="p-8 bg-slate-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <Languages className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-black uppercase tracking-widest">AI Translation Preview</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-white/50 text-[8px] font-black uppercase tracking-widest leading-none">Target Language:</p>
                      <select 
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-white/10 text-white text-[10px] font-black uppercase border-none focus:ring-0 rounded p-1"
                      >
                        {['Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Hindi', 'Arabic'].map(lang => (
                          <option key={lang} value={lang} className="bg-slate-900">{lang}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all disabled:opacity-50"
                  >
                    {isTranslating ? 'Translating...' : 'Refresh Translation'}
                  </button>
                  <button 
                    onClick={() => setShowTranslateModal(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row border-b border-slate-100">
                {/* Original */}
                <div className="flex-1 border-r border-slate-100 p-6 flex flex-col min-h-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Original (Automatic)</span>
                  <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-6 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {text}
                  </div>
                </div>
                {/* Translated */}
                <div className="flex-1 p-6 flex flex-col min-h-0 bg-orange-50/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-4 block">Translated To {targetLang}</span>
                  <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-6 text-sm text-slate-900 leading-relaxed shadow-sm border border-orange-100">
                    <div className="markdown-body text-left">
                      <ReactMarkdown>{refinedText}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white flex gap-4 shrink-0">
                <button 
                  onClick={() => setShowTranslateModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Discard
                </button>
                <button 
                  onClick={() => {
                    updateText(refinedText);
                    setShowTranslateModal(false);
                  }}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-500/10"
                >
                  <Languages className="w-5 h-5 text-orange-400" />
                  Replace with Translated
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Refinement Modal */}
      <AnimatePresence>
        {showRefinementModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRefinementModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col relative z-20 border border-slate-100 max-h-[90vh]"
            >
              <div className="p-8 bg-slate-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-black uppercase tracking-widest">AI Refinement Preview</h3>
                    <p className="text-white/50 text-[8px] font-black uppercase tracking-widest mt-1">Review the polished text before applying</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRefinementModal(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row border-b border-slate-100">
                {/* Original */}
                <div className="flex-1 border-r border-slate-100 p-6 flex flex-col min-h-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Original Content</span>
                  <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-6 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {text}
                  </div>
                </div>
                {/* Refined */}
                <div className="flex-1 p-6 flex flex-col min-h-0 bg-purple-50/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-4 block">Refined & Polished</span>
                  <div className="flex-1 overflow-y-auto bg-white rounded-2xl p-6 text-sm text-slate-900 leading-relaxed shadow-sm border border-purple-100">
                    <div className="markdown-body text-left">
                      <ReactMarkdown>{refinedText}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white flex gap-4 shrink-0">
                <button 
                  onClick={() => setShowRefinementModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => {
                    updateText(refinedText);
                    setShowRefinementModal(false);
                  }}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-purple-500/10"
                >
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  Apply Refinement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showDocGenModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wand2 className="w-6 h-6 text-indigo-400" />
                <h3 className="text-white font-black uppercase tracking-widest text-sm">AI Document Architect</h3>
              </div>
              <button 
                onClick={() => setShowDocGenModal(false)}
                className="text-white/40 hover:text-white transition-colors"
                disabled={isGeneratingDoc}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Document Type</label>
                  <div className="flex flex-wrap gap-2">
                    {['Report', 'Article', 'Proposal', 'Essay', 'Script'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setDocType(type)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          docType === type 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Write your prompt</label>
                  <textarea
                    value={docPrompt}
                    onChange={(e) => setDocPrompt(e.target.value)}
                    placeholder="e.g. A comprehensive market analysis report for EV industry in 2024..."
                    className="w-full h-32 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-inner"
                    disabled={isGeneratingDoc}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowDocGenModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100"
                  disabled={isGeneratingDoc}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGenerateDocument}
                  disabled={isGeneratingDoc || !docPrompt.trim()}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                >
                  {isGeneratingDoc ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Architecting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Build Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Options Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-6 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquareText className="w-6 h-6 text-blue-500" />
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Summary Options</h3>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              {/* Length Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Summary Length</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  {(['short', 'medium', 'detailed'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setSummaryOptions({ ...summaryOptions, length: l })}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        summaryOptions.length === l 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Output Format</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  {(['bullet points', 'paragraph'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSummaryOptions({ ...summaryOptions, format: f })}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        summaryOptions.format === f 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSummarize}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                >
                  Summarize Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div 
          id="signature-modal-overlay" 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          onClick={() => setShowSignatureModal(false)}
        >
          <div 
            id="signature-modal-container" 
            className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PenTool className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Add Signature</h3>
              </div>
              <button 
                onClick={() => setShowSignatureModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-slate-50">
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-inner">
                <SignatureCanvas 
                  ref={sigCanvas} 
                  penColor='black' 
                  canvasProps={{ 
                    width: 400, 
                    height: 250, 
                    className: 'sigCanvas w-full h-[250px]',
                    id: 'signature-canvas'
                  }} 
                />
              </div>
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Draw your signature above</p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-3 bg-white">
              <button 
                id="clear-signature-btn"
                onClick={clearSignature} 
                className="bg-slate-100 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-600 hover:bg-slate-200 transition-all"
              >
                Clear
              </button>
              <button 
                id="apply-signature-btn"
                onClick={saveSignature} 
                className="bg-slate-900 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-slate-800 transition-all shadow-lg shadow-blue-500/10"
              >
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Collaborative Note Settings Modal */}
      <AnimatePresence>
        {showCollabModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCollabModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative z-20 border border-slate-100"
            >
              <div className="p-8 bg-slate-900 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Collaboration</h3>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Share this note with others</p>
                  </div>
                  <button 
                    onClick={() => setShowCollabModal(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="p-8 flex flex-col gap-6">
                {/* Share Link */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Shareable Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500 font-mono truncate">
                      {window.location.href}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("Link copied!");
                      }}
                      className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors"
                      title="Copy Link"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Invite by Email */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 border-t border-slate-50 pt-4 block">Invite by Email</label>
                  <div className="flex gap-2">
                    <input 
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter collaborator email..."
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button 
                      onClick={async () => {
                        if (!inviteEmail.trim()) return;
                        setIsInviting(true);
                        try {
                          await inviteCollaboratorByEmail(id!, inviteEmail);
                          setInviteEmail('');
                          alert(`Invitation sent to ${inviteEmail}`);
                        } finally {
                          setIsInviting(false);
                        }
                      }}
                      disabled={isInviting || !inviteEmail.trim()}
                      className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Existing Collaborators */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 border-t border-slate-50 pt-4 block">Current Collaborators</label>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                    {collaboratorProfiles.map((profile, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-50 bg-slate-50/30">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          {profile.photoURL ? (
                            <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-500">
                              {profile.displayName?.[0] || profile.email?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">
                            {profile.displayName || "Unknown User"}
                            {profile.uid === collabNoteData?.ownerId && <span className="ml-2 text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">OWNER</span>}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 truncate">{profile.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowCollabModal(false)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
