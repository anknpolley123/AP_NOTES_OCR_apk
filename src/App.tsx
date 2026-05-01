import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import EditorScreen from './screens/EditorScreen';
import OCRScreen from './screens/OCRScreen';
import KnowledgeScreen from './screens/KnowledgeScreen';
import PdfWorkspaceScreen from './screens/PdfWorkspaceScreen';
import SettingsScreen from './screens/SettingsScreen';
import RecycleBinScreen from './screens/RecycleBinScreen';
import CloudStorageScreen from './screens/CloudStorageScreen';
import PermissionOnboarding from './components/PermissionOnboarding';
import AIAssistant from './components/AIAssistant';
import BottomNav from './components/BottomNav';
import { isOnboardingComplete } from './services/storage';
import { auth, db } from './services/firebaseService';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { X } from 'lucide-react';

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingComplete());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        console.warn("Firestore connection check failed:", error);
        if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('permission-denied'))) {
          console.error("Please check your Firebase configuration or security rules.");
        }
      }
    };
    testConnection();

    // Handle Auth
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const content = () => {
    if (!onboardingDone) {
      return <PermissionOnboarding onComplete={() => setOnboardingDone(true)} />;
    }

    if (authLoading) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <Router>
        <AppContent />
      </Router>
    );
  };

  return (
    <ErrorBoundary>
      {content()}
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-[32px] flex items-center justify-center text-red-500 mb-8 border border-red-500/20">
            <X className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Application Error</h1>
          <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">The app encountered a critical issue. This might be due to missing configuration or unsupported device features.</p>
          <div className="bg-slate-900 p-4 rounded-2xl mb-8 max-w-lg overflow-x-auto">
            <code className="text-[10px] text-red-400 font-mono whitespace-pre">{this.state.error?.message || "Unknown error"}</code>
          </div>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 mb-4"
          >
            Reset & Restart
          </button>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Warning: resetting will clear local data.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const location = useLocation();
  
  // Routes where bottom nav should NOT be shown
  const hideBottomNav = location.pathname.startsWith('/editor');

  return (
    <div className="bg-gray-100 min-h-screen font-sans selection:bg-blue-100 flex flex-col">
      <div className="flex-1 relative flex flex-col">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/editor" element={<EditorScreen />} />
          <Route path="/editor/:id" element={<EditorScreen />} />
          <Route path="/ocr" element={<OCRScreen />} />
          <Route path="/knowledge" element={<KnowledgeScreen />} />
          <Route path="/pdf-workspace" element={<PdfWorkspaceScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/recycle-bin" element={<RecycleBinScreen />} />
          <Route path="/cloud-storage" element={<CloudStorageScreen />} />
        </Routes>
      </div>
      {!hideBottomNav && <BottomNav />}
      <AIAssistant />
    </div>
  );
}
