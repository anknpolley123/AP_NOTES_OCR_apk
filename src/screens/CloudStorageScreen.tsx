
import React, { useState, useEffect } from 'react';
import { 
  Cloud, HardDrive, Shield, RefreshCw, ChevronRight, 
  FileSpreadsheet, FileText, Presentation, FileCode, CheckCircle2,
  Lock, Globe, Database, Settings as SettingsIcon, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { auth, loginWithGoogle } from '../services/firebaseService';

interface CloudProvider {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
  usage?: string;
  total?: string;
}

export default function CloudStorageScreen() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<CloudProvider[]>([
    {
      id: 'gdrive',
      name: 'Google Drive',
      desc: 'Sync notes and export to Google Docs directly.',
      icon: <Globe className="w-6 h-6" />,
      color: 'bg-blue-500',
      connected: !!auth.currentUser,
      usage: '1.2 GB',
      total: '15 GB'
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      desc: 'Connect to Microsoft 365 for Excel & Word editing.',
      icon: <Database className="w-6 h-6" />,
      color: 'bg-indigo-600',
      connected: false
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      desc: 'Secure cloud backup for your digital signatures.',
      icon: <Shield className="w-6 h-6" />,
      color: 'bg-blue-400',
      connected: false
    }
  ]);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleConnect = async (providerId: string) => {
    setIsLoading(providerId);
    try {
      if (providerId === 'gdrive') {
        await loginWithGoogle();
        setProviders(prev => prev.map(p => p.id === 'gdrive' ? { ...p, connected: true } : p));
      } else {
        // Mock connection for others
        await new Promise(resolve => setTimeout(resolve, 1500));
        setProviders(prev => prev.map(p => p.id === providerId ? { ...p, connected: true, usage: '0 KB', total: '2 GB' } : p));
      }
    } catch (error) {
      console.error("Connection failed", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDisconnect = (providerId: string) => {
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, connected: false } : p));
  };

  return (
    <Layout title="Cloud Storage">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <header className="px-4">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-[32px] p-6 flex items-start gap-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                <Cloud className="w-6 h-6 text-blue-500" />
             </div>
             <div>
                <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight italic">Storage Hub</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed mt-1">
                   Manage your cloud integrations, backups, and cross-platform syncing.
                </p>
             </div>
          </div>
        </header>

        <section className="px-4 space-y-4">
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Active Connections
          </h3>
          <div className="grid gap-4">
            {providers.map((p) => (
              <div key={p.id} className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-3xl overflow-hidden group hover:border-blue-500/30 transition-all shadow-xl shadow-black/5">
                 <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className={`w-14 h-14 rounded-2xl ${p.color} flex items-center justify-center text-white shadow-xl shadow-${p.color}/20`}>
                          {p.icon}
                       </div>
                       <div>
                          <div className="flex items-center gap-2">
                             <h4 className="text-base font-black text-[var(--text-main)] uppercase">{p.name}</h4>
                             {p.connected && (
                                <span className="bg-green-500/10 text-green-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Connected</span>
                             )}
                          </div>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{p.desc}</p>
                       </div>
                    </div>
                    
                    <button 
                       onClick={() => p.connected ? handleDisconnect(p.id) : handleConnect(p.id)}
                       disabled={isLoading === p.id}
                       className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                         p.connected 
                           ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' 
                           : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20 active:scale-95'
                       }`}
                    >
                       {isLoading === p.id ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : (p.connected ? 'Disconnect' : 'Connect')}
                    </button>
                 </div>
                 
                 {p.connected && p.usage && (
                    <div className="p-6 pt-0 bg-[var(--bg-button)]/20 border-t border-[var(--border-app)] border-dashed">
                       <div className="mt-4 space-y-3">
                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                             <span>Storage Usage</span>
                             <span>{p.usage} / {p.total}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: '8.5%' }}></div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 space-y-4">
           <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Lock className="w-3 h-3" /> Security & Privacy
          </h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-3xl p-6 space-y-6">
             <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                   <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                   <p className="text-xs font-bold text-[var(--text-main)] italic underline decoration-orange-500/30">End-to-End Encryption</p>
                   <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-1">
                      All files uploaded to cloud storage are encrypted locally before transmission. Only you hold the decryption keys in your local storage.
                   </p>
                </div>
             </div>
             
             <div className="pt-4 border-t border-[var(--border-app)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Shield className="w-4 h-4 text-green-500" />
                   <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Auto-Backup Every 5m</span>
                </div>
                <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                   <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                </div>
             </div>
          </div>
        </section>

        <section className="px-4 space-y-4">
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-2">Document Hub</h3>
          <div className="grid grid-cols-2 gap-4">
             <button className="bg-[var(--bg-card)] border border-[var(--border-app)] p-6 rounded-[32px] flex flex-col items-center gap-3 hover:bg-[var(--bg-button)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                   <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black uppercase text-[var(--text-main)]">Excel Hub</div>
             </button>
             <button className="bg-[var(--bg-card)] border border-[var(--border-app)] p-6 rounded-[32px] flex flex-col items-center gap-3 hover:bg-[var(--bg-button)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <FileText className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black uppercase text-[var(--text-main)]">Word Hub</div>
             </button>
             <button className="bg-[var(--bg-card)] border border(--border-app)] p-6 rounded-[32px] flex flex-col items-center gap-3 hover:bg-[var(--bg-button)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                   <Presentation className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black uppercase text-[var(--text-main)]">PowerPoint Hub</div>
             </button>
             <button className="bg-[var(--bg-card)] border border-[var(--border-app)] p-6 rounded-[32px] flex flex-col items-center gap-3 hover:bg-[var(--bg-button)] transition-all">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                   <FileCode className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black uppercase text-[var(--text-main)]">Drafts Hub</div>
             </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
