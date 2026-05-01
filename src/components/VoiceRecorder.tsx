import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { transcribeAudio } from '../services/aiService';
import { softHaptic, successHaptic } from '../lib/haptics';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      softHaptic();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await handleTranscription(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for transcription.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      softHaptic();
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscription = async (base64Audio: string) => {
    setIsProcessing(true);
    try {
      const transcription = await transcribeAudio(base64Audio);
      onTranscription(transcription);
      successHaptic();
    } catch (err) {
      console.error(err);
      alert("Transcription failed. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl p-3 rounded-[32px] border border-white/10 shadow-2xl">
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 text-blue-400 px-4 py-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">AI Transcribing...</span>
          </motion.div>
        ) : isRecording ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-4 py-1"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-2xl border border-red-500/20">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[12px] font-mono font-black text-red-500">{formatTime(recordingTime)}</span>
            </div>
            <button 
              onClick={stopRecording}
              className="w-12 h-12 bg-white rounded-[22px] flex items-center justify-center text-slate-900 shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={startRecording}
            className="w-12 h-12 bg-blue-600 rounded-[22px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Mic className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {!isRecording && !isProcessing && (
        <div className="pr-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-100">Transcribe</p>
          <p className="text-[9px] font-bold text-slate-500">Record & Convert</p>
        </div>
      )}
    </div>
  );
};
