import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
let db: any;
let auth: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { db, auth };
const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Save user profile
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = () => auth.signOut();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createCollaborativeNote = async (text: string, title: string, folderId?: string) => {
  if (!auth.currentUser) throw new Error("Authentication required");
  
  const noteId = `collab_${Date.now()}`;
  const noteData = {
    id: noteId,
    title,
    text,
    ownerId: auth.currentUser.uid,
    collaborators: [],
    invitedEmails: [],
    pinned: false,
    folderId: folderId || null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  try {
    await setDoc(doc(db, 'notes', noteId), noteData);
    return noteId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notes/${noteId}`);
  }
};

export const updateCollaborativeNote = async (id: string, updates: Partial<{ text: string, title: string, pinned: boolean, folderId: string | null }>) => {
  try {
    await updateDoc(doc(db, 'notes', id), {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
  }
};

export const joinCollaborativeNote = async (noteId: string) => {
  if (!auth.currentUser) throw new Error("Authentication required");
  
  try {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (noteSnap.exists()) {
      const data = noteSnap.data();
      if (data.ownerId !== auth.currentUser.uid) {
        await updateDoc(noteRef, {
          collaborators: arrayUnion(auth.currentUser.uid)
        });
      }
      return data;
    } else {
      throw new Error("Note not found");
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
  }
};

export const getUserProfiles = async (uids: string[]) => {
  if (uids.length === 0) return [];
  try {
    const q = query(collection(db, 'users'), where('uid', 'in', uids));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return [];
  }
};

export const inviteCollaboratorByEmail = async (noteId: string, email: string) => {
  try {
    const noteRef = doc(db, 'notes', noteId);
    await updateDoc(noteRef, {
      invitedEmails: arrayUnion(email)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notes/${noteId}`);
  }
};
