
export interface Note {
  id: string;
  text: string;
  title: string;
  createdAt: number;
  folderId?: string;
  isDeleted?: boolean;
  deletedAt?: number;
  pinned?: boolean;
  ownerId?: string;
  collaborators?: string[];
  type?: 'note' | 'word' | 'excel' | 'ppt' | 'draft' | 'scan';
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export const saveNote = async (text: string, title: string = "Untitled Note", folderId?: string, pinned: boolean = false, type: Note['type'] = 'note') => {
  const notesStr = localStorage.getItem('notes');
  const notes: Note[] = notesStr ? JSON.parse(notesStr) : [];
  notes.unshift({ 
    id: Date.now().toString(), 
    text: text || "", 
    title: title || (text.split('\n')[0].substring(0, 30) || "Untitled Note"),
    createdAt: Date.now(),
    folderId,
    isDeleted: false,
    pinned,
    type
  });
  localStorage.setItem('notes', JSON.stringify(notes));
};

export const updateNote = async (id: string, text: string, title: string, folderId?: string, pinned?: boolean, type?: Note['type']) => {
  const notesStr = localStorage.getItem('notes');
  if (!notesStr) return;
  const notes: Note[] = JSON.parse(notesStr);
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { 
      ...notes[index], 
      text, 
      title, 
      folderId: folderId ?? notes[index].folderId,
      pinned: pinned ?? notes[index].pinned,
      type: type ?? notes[index].type
    };
    localStorage.setItem('notes', JSON.stringify(notes));
  }
};

export const moveNoteToFolder = async (noteId: string, folderId: string | undefined) => {
  const notesStr = localStorage.getItem('notes');
  if (!notesStr) return;
  const notes: Note[] = JSON.parse(notesStr);
  const index = notes.findIndex(n => n.id === noteId);
  if (index !== -1) {
    notes[index].folderId = folderId;
    localStorage.setItem('notes', JSON.stringify(notes));
  }
};

export const getNotes = async (includeDeleted: boolean = false): Promise<Note[]> => {
  const notesStr = localStorage.getItem('notes');
  const allNotes: Note[] = notesStr ? JSON.parse(notesStr) : [];
  if (includeDeleted) return allNotes;
  return allNotes.filter(n => !n.isDeleted);
};

export const getDeletedNotes = async (): Promise<Note[]> => {
  const notesStr = localStorage.getItem('notes');
  const allNotes: Note[] = notesStr ? JSON.parse(notesStr) : [];
  return allNotes.filter(n => n.isDeleted);
};

export const softDeleteNote = async (id: string) => {
  const notesStr = localStorage.getItem('notes');
  if (!notesStr) return;
  const notes: Note[] = JSON.parse(notesStr);
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index].isDeleted = true;
    notes[index].deletedAt = Date.now();
    localStorage.setItem('notes', JSON.stringify(notes));
  }
};

export const restoreNote = async (id: string) => {
  const notesStr = localStorage.getItem('notes');
  if (!notesStr) return;
  const notes: Note[] = JSON.parse(notesStr);
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index].isDeleted = false;
    notes[index].deletedAt = undefined;
    localStorage.setItem('notes', JSON.stringify(notes));
  }
};

export const deleteNotePermanently = async (id: string) => {
  const notesStr = localStorage.getItem('notes');
  if (!notesStr) return;
  const notes: Note[] = JSON.parse(notesStr);
  const filtered = notes.filter(n => n.id !== id);
  localStorage.setItem('notes', JSON.stringify(filtered));
};

// Folder Methods
export const getFolders = async (): Promise<Folder[]> => {
  const foldersStr = localStorage.getItem('folders');
  return foldersStr ? JSON.parse(foldersStr) : [];
};

export const createFolder = async (name: string) => {
  const folders = await getFolders();
  const newFolder: Folder = {
    id: Date.now().toString(),
    name,
    createdAt: Date.now()
  };
  folders.push(newFolder);
  localStorage.setItem('folders', JSON.stringify(folders));
  return newFolder;
};

export const renameFolder = async (id: string, name: string) => {
  const folders = await getFolders();
  const index = folders.findIndex(f => f.id === id);
  if (index !== -1) {
    folders[index].name = name;
    localStorage.setItem('folders', JSON.stringify(folders));
  }
};

export const deleteFolder = async (id: string) => {
  const folders = await getFolders();
  const updatedFolders = folders.filter(f => f.id !== id);
  localStorage.setItem('folders', JSON.stringify(updatedFolders));
  
  // Optionally: Unlink notes from this folder
  const notes = await getNotes();
  const updatedNotes = notes.map(n => n.folderId === id ? { ...n, folderId: undefined } : n);
  localStorage.setItem('notes', JSON.stringify(updatedNotes));
};

export const togglePinNote = async (id: string) => {
  const notesStr = localStorage.getItem('notes');
  if (!notesStr) return;
  const notes: Note[] = JSON.parse(notesStr);
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index].pinned = !notes[index].pinned;
    localStorage.setItem('notes', JSON.stringify(notes));
  }
};

export const isFirstRun = (): boolean => {
  const run = localStorage.getItem('app_has_run');
  if (!run) {
    localStorage.setItem('app_has_run', 'true');
    return true;
  }
  return false;
};

export const setOnboardingComplete = () => {
  localStorage.setItem('onboarding_complete', 'true');
};

export const isOnboardingComplete = (): boolean => {
  return localStorage.getItem('onboarding_complete') === 'true';
};
