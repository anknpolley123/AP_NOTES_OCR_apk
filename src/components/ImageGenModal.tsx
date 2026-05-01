
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Image as ImageIcon, Download, Check, Loader2, Send } from 'lucide-react';

interface ImageGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<string>;
  onInsert: (imageDataUrl: string) => void;
}

export const ImageGenModal: React.FC<ImageGenModalProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate, 
  onInsert 
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const imageUrl = await onGenerate(prompt);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (generatedImage) {
      onInsert(generatedImage);
      onClose();
      // Reset state for next time
      setGeneratedImage(null);
      setPrompt('');
    }
  };

  const handleClose = () => {
    onClose();
    // Don't reset everything so user doesn't lose prompt if they accidentally close
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">AI Image Lab</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Transform concepts into visuals</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8">
              {!generatedImage && !isGenerating && (
                <div className="text-center space-y-4 py-8">
                  <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 mx-auto">
                    <ImageIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">What nature of image?</h4>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">Describe the scene, style, or concept you want to visualize in your note.</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="aspect-square w-full bg-slate-50 rounded-[40px] flex flex-col items-center justify-center space-y-6 animate-pulse">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-purple-600">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 animate-bounce">Manifesting visual...</p>
                    <p className="text-[10px] text-slate-300 mt-2 italic font-medium px-8">"Every pixel is a heartbeat of data"</p>
                  </div>
                </div>
              )}

              {generatedImage && !isGenerating && (
                <div className="space-y-6">
                  <div className="group relative aspect-square w-full bg-slate-100 rounded-[40px] overflow-hidden shadow-2xl shadow-purple-900/10 border-8 border-white">
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                      <div className="w-full flex items-center justify-between">
                         <p className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">Preview Mode</p>
                         <button 
                            onClick={handleGenerate}
                            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 hover:scale-110 transition-all"
                            title="Regenerate"
                         >
                            <RotateCcw className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 shrink-0 shadow-sm"><X className="w-4 h-4" /></div>
                      <p className="text-[10px] font-bold text-red-600 leading-normal pt-2">{error}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. A cyberpunk library in space with neon floating books, cinematic lighting..."
                    className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-[32px] p-6 text-sm font-medium focus:bg-white focus:border-purple-600 focus:outline-none transition-all resize-none group-hover:border-slate-200"
                  />
                  <div className="absolute top-6 right-6">
                    <Sparkles className={`w-5 h-5 transition-colors ${prompt ? 'text-purple-500 animate-pulse' : 'text-slate-300'}`} />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                   {["Cinematic", "3D Render", "Oil Painting", "Minimalist Vector", "Cyberpunk", "Whimsical"].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                      >
                        + {tag}
                      </button>
                   ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex flex-col md:flex-row gap-4">
              {generatedImage ? (
                <>
                  <button
                    onClick={() => { setGeneratedImage(null); setPrompt(''); }}
                    className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Discard & Reset
                  </button>
                  <button
                    onClick={handleInsert}
                    className="flex-[1.5] flex items-center justify-center gap-3 px-8 py-5 bg-purple-600 text-white shadow-xl shadow-purple-500/20 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Insert into Note
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className={`flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
                    !isGenerating && prompt.trim()
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-950/20 hover:bg-black active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Visualizing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Generate Masterpiece
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Internal component for the loop because RotateCcw was missing in imports
const RotateCcw: React.FC<{className?: string}> = ({className}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);
