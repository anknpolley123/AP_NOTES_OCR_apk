
import React from 'react';
import { 
  FileStack, FileCode, Lock, PenTool, ScanSearch, 
  ChevronRight, ArrowRight, FilePlus, Split, Download,
  Merge, Scissors
} from 'lucide-react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';

export default function PdfWorkspaceScreen() {
  const navigate = useNavigate();
  const tools = [
    { 
      id: 'merge', 
      title: 'PDF Manipulation', 
      desc: 'Professional documents', 
      icon: <Merge className="w-6 h-6 text-orange-500" />,
      action: 'Merge / Split' 
    },
    { 
      id: 'form', 
      title: 'Form Filling', 
      desc: 'Professional documents', 
      icon: <FileCode className="w-6 h-6 text-blue-500" />,
      action: 'Fill Forms'
    },
    { 
      id: 'sign', 
      title: 'Secure Sign', 
      desc: 'Professional documents', 
      icon: <Lock className="w-6 h-6 text-green-500" />,
      action: 'Digital Signature'
    },
    { 
      id: 'manage', 
      title: 'Page Management', 
      desc: 'Professional documents', 
      icon: <Split className="w-6 h-6 text-purple-500" />,
      action: 'Organize'
    },
    { 
      id: 'redact', 
      title: 'OCR Redact', 
      desc: 'Professional documents', 
      icon: <ScanSearch className="w-6 h-6 text-red-500" />,
      action: 'Sensitive Scan'
    }
  ];

  return (
    <Layout 
      title="PDF_WORKSPACE" 
      subtitle="AP_ENGINE ACTIVE"
      hugeText="PDF\nDOCS"
      showBack
    >
      <div className="flex-1 flex flex-col pt-4">
        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
           {[
             { icon: <Merge />, label: 'merge', action: () => alert("Select PDFs to merge") },
             { icon: <Scissors />, label: 'extract', action: () => alert("Select PDF to extract") },
             { icon: <Lock />, label: 'secure', action: () => alert("Securing document...") },
             { icon: <PenTool />, label: 'fill', action: () => alert("Form filler tool") },
             { icon: <ScanSearch />, label: 'scan', action: () => navigate('/ocr') }
           ].map((item, i) => (
             <div key={i} className="flex flex-col items-center gap-3">
               <div 
                 onClick={item.action}
                 className="w-full aspect-square bg-[var(--bg-button)] rounded-3xl flex items-center justify-center text-[var(--text-main)] hover:bg-slate-700 transition-all border border-white/5 cursor-pointer shadow-lg group"
               >
                 {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-6 h-6 group-hover:scale-110 transition-transform' })}
               </div>
               <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{item.label}</span>
             </div>
           ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Workspace Tools</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map(tool => (
            <div 
              key={tool.id}
              className="bg-[var(--bg-card)] p-6 rounded-[32px] border-2 border-[var(--border-app)] flex items-center justify-between hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-[var(--bg-app)]/50 rounded-2xl flex items-center justify-center border border-white/5 group-hover:bg-slate-800 transition-colors">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-tight">{tool.title}</h3>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{tool.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-white transition-colors" />
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-br from-slate-900 to-black rounded-[40px] border border-blue-500/20 relative overflow-hidden group cursor-pointer">
           <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:rotate-12 transition-transform">
              <Download className="w-32 h-32 text-blue-500" />
           </div>
           <div className="relative z-10">
              <div className="text-[10px] font-black text-blue-400 uppercase mb-1">Batch Processor</div>
              <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Automate PDF Exports</h4>
              <button className="flex items-center gap-2 text-[10px] font-black text-white uppercase bg-blue-600 px-4 py-2 rounded-xl">
                 Try Now <ArrowRight className="w-3 h-3" />
              </button>
           </div>
        </div>
      </div>
    </Layout>
  );
}
