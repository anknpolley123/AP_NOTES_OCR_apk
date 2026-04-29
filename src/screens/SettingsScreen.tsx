
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, Cloud, Smartphone, Lock, FileDown, 
  Settings as SettingsIcon, Info, MessageCircle, RefreshCw,
  Camera, Mic, Bell, Database, Image, Layers, Twitter
} from 'lucide-react';
import Layout from '../components/Layout';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState({
    syncCloud: true,
    autoSave: true,
    showLinks: true,
    webPreviews: false,
    clipping: true
  });

  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
    }
  };

  const Toggle = ({ id, checked }: { id: keyof typeof toggles, checked: boolean }) => (
    <div 
      onClick={() => setToggles(prev => ({ ...prev, [id]: !prev[id] }))}
      className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${checked ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  );

  return (
    <Layout 
      title="Settings" 
      subtitle="v2.4.01"
      showBack
    >
      <div className="flex-1 space-y-6 pb-20">
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-between">
           <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              <div className="text-sm font-black text-[var(--text-main)] uppercase italic">New Version Available</div>
           </div>
           <button className="text-[10px] font-black text-orange-500 uppercase tracking-widest px-4 py-2 bg-orange-500 text-white rounded-xl">Update</button>
        </div>

        <section>
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 px-2">Sync & Storage</h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-3xl overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-[var(--border-app)]">
                <div className="flex items-center gap-3">
                   <Cloud className="w-5 h-5 text-blue-500" />
                   <div>
                      <div className="text-sm font-bold text-[var(--text-main)]">Sync with Cloud</div>
                      <div className="text-[10px] text-[var(--text-muted)]">ankonpolley@gmail.com</div>
                   </div>
                </div>
                <Toggle id="syncCloud" checked={toggles.syncCloud} />
             </div>
             <div className="p-4 flex items-center justify-between hover:bg-[var(--bg-button)] cursor-default">
                <div className="flex items-center gap-3">
                   <Smartphone className="w-5 h-5 text-slate-400" />
                   <div className="text-sm font-bold text-[var(--text-main)]">Sync to Microsoft OneNote</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
             </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 px-2">General</h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-3xl overflow-hidden">
             {[
               { icon: <Smartphone className="w-5 h-5 text-blue-400" />, label: 'Default note style' },
               { icon: <Lock className="w-5 h-5 text-purple-400" />, label: 'Password and biometrics' },
               { icon: <FileDown className="w-5 h-5 text-green-400" />, label: 'Import notes' },
             ].map((item, i) => (
               <div key={i} className="p-4 flex items-center justify-between border-b border-[var(--border-app)] hover:bg-[var(--bg-button)] cursor-default last:border-0">
                  <div className="flex items-center gap-3">
                     {item.icon}
                     <div className="text-sm font-bold text-[var(--text-main)]">{item.label}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
               </div>
             ))}
             <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <RefreshCw className="w-5 h-5 text-orange-400" />
                   <div className="text-sm font-bold text-[var(--text-main)]">Auto save notes</div>
                </div>
                <Toggle id="autoSave" checked={toggles.autoSave} />
             </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 px-2">App Permissions</h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-3xl overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-[var(--border-app)] group">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-orange-500" />
                   </div>
                   <div>
                      <div className="text-sm font-bold text-[var(--text-main)]">Notifications</div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest">{notificationStatus}</div>
                   </div>
                </div>
                {notificationStatus !== 'granted' ? (
                  <button 
                    onClick={requestNotificationPermission}
                    className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-blue-700 transition-colors"
                  >
                    Allow
                  </button>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                )}
             </div>

             {[
               { icon: <Camera className="w-5 h-5 text-blue-400" />, label: 'Camera Access', desc: 'Required for OCR and scanning' },
               { icon: <Mic className="w-5 h-5 text-purple-400" />, label: 'Microphone Access', desc: 'Required for voice dictation' },
               { icon: <Database className="w-5 h-5 text-green-400" />, label: 'Storage Access', desc: 'Local database and cache' },
               { icon: <Image className="w-5 h-5 text-pink-400" />, label: 'Photos & Videos', desc: 'Gallery import and export' },
               { icon: <Layers className="w-5 h-5 text-yellow-400" />, label: 'Appear on Top', desc: 'Floating note shortcuts' },
             ].map((item, i) => (
                <div key={i} className="p-4 flex items-center justify-between border-b border-[var(--border-app)] last:border-0">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                         {item.icon}
                      </div>
                      <div>
                         <div className="text-sm font-bold text-[var(--text-main)]">{item.label}</div>
                         <div className="text-[10px] text-[var(--text-muted)]">{item.desc}</div>
                      </div>
                   </div>
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                </div>
             ))}
          </div>
          <p className="mt-4 px-4 text-[10px] text-[var(--text-muted)] leading-relaxed uppercase font-bold tracking-tight">
            Some permissions may be restricted by the browser or system. If a feature fails to load, please check your site settings.
          </p>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 px-2">Support & Developer</h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-app)] rounded-3xl overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-[var(--border-app)] hover:bg-[var(--bg-button)] cursor-default">
                <div className="flex items-center gap-3">
                   <Info className="w-5 h-5 text-slate-400" />
                   <div className="text-sm font-bold text-[var(--text-main)]">About AP Notes</div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
             </div>
             
             <div className="p-4 bg-[var(--bg-button)]/30 border-b border-[var(--border-app)]">
                <div className="flex items-center gap-3 mb-4">
                   <MessageCircle className="w-5 h-5 text-blue-500" />
                   <div className="text-sm font-black text-[var(--text-main)] uppercase italic tracking-tight">Contact Developer</div>
                </div>
                
                <div className="space-y-4 ml-8">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                         <SettingsIcon className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                         <div className="text-xs font-bold text-[var(--text-main)]">Ankon Polley</div>
                         <div className="text-[8px] text-[var(--text-muted)] uppercase font-black">Lead Developer</div>
                      </div>
                   </div>

                   <a href="https://github.com/anknpolley123" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-[var(--border-app)]">
                            <div className="font-black text-[8px]">GH</div>
                         </div>
                         <div>
                            <div className="text-xs font-bold text-[var(--text-main)] group-hover:text-blue-500 transition-colors">GitHub</div>
                            <div className="text-[8px] text-[var(--text-muted)]">anknpolley123</div>
                         </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                   </a>

                   <a href="https://x.com/AnkonPolley" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-[var(--border-app)]">
                            <Twitter className="w-4 h-4 text-blue-500" />
                         </div>
                         <div>
                            <div className="text-xs font-bold text-[var(--text-main)] group-hover:text-blue-500 transition-colors">Twitter / X</div>
                            <div className="text-[8px] text-[var(--text-muted)]">@AnkonPolley</div>
                         </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
                   </a>

                   <div className="flex items-center gap-3">
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <div>
                         <div className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">Primary</div>
                         <div className="text-xs font-bold text-[var(--text-main)]">ankonpolley@gmail.com</div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <div>
                         <div className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">Secondary</div>
                         <div className="text-xs font-bold text-[var(--text-main)]">ankonpolley@proton.me</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
