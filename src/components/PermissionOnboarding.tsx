
import React, { useState, useEffect } from 'react';
import { Camera, Mic, Bell, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { setOnboardingComplete } from '../services/storage';

interface PermissionStep {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

export default function PermissionOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const steps: PermissionStep[] = [
    {
      id: 'intro',
      title: 'AP_NOTES SETUP',
      desc: 'To provide a seamless note-taking experience, we need to configure your device permissions.',
      icon: <img src="/dragon_bg.png" alt="Logo" className="w-16 h-16 object-contain" />,
      color: 'blue'
    },
    {
      id: 'camera',
      title: 'CAMERA ACCESS',
      desc: 'Required for OCR scanning and digitizing handwritten notes instantly.',
      icon: <Camera className="w-12 h-12 text-blue-500" />,
      color: 'blue'
    },
    {
      id: 'mic',
      title: 'MICROPHONE',
      desc: 'Enables voice dictation so you can record thoughts without typing.',
      icon: <Mic className="w-12 h-12 text-purple-500" />,
      color: 'purple'
    },
    {
      id: 'notifications',
      title: 'NOTIFICATIONS',
      desc: 'Keep you updated on sync status and smart insight processing.',
      icon: <Bell className="w-12 h-12 text-orange-500" />,
      color: 'orange'
    }
  ];

  const handleNext = async () => {
    const currentStep = steps[step];
    
    try {
      if (currentStep.id === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } else if (currentStep.id === 'mic') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (currentStep.id === 'notifications') {
        if ('Notification' in window) {
          await Notification.requestPermission();
        }
      }
    } catch (e) {
      console.warn("Permission denied or cancelled:", e);
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setOnboardingComplete();
      onComplete();
    }
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-sm w-full space-y-12 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center space-y-6">
           <div className={`w-24 h-24 rounded-[32px] bg-slate-900 border-2 border-white/5 flex items-center justify-center shadow-2xl transition-all duration-500`}>
              {current.icon}
           </div>
           
           <div className="space-y-3">
              <h1 className="text-[10px] font-black tracking-[0.4em] text-blue-500 uppercase">Step {step + 1} of {steps.length}</h1>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">{current.title}</h2>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">
                {current.desc}
              </p>
           </div>
        </div>

        <div className="flex flex-col gap-3">
           <button 
             onClick={handleNext}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
           >
             {step === 0 ? 'START SETUP' : 'ALLOW & CONTINUE'}
             <ArrowRight className="w-4 h-4" />
           </button>
           
           {step > 0 && (
             <button 
               onClick={() => setStep(step + 1)}
               className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest py-2"
             >
               Skip for now
             </button>
           )}
        </div>

        <div className="flex justify-center gap-1.5">
           {steps.map((_, i) => (
             <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-blue-500' : 'w-2 bg-slate-800'}`} />
           ))}
        </div>
      </div>

      <div className="absolute bottom-12 flex items-center gap-3 opacity-20">
         <ShieldCheck className="w-5 h-5 text-blue-500" />
         <span className="text-[10px] font-black text-white uppercase tracking-widest">End-to-End Secure Permissions</span>
      </div>
    </div>
  );
}
