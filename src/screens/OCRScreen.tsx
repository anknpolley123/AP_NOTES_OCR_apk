
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera as CameraIcon, RefreshCw, Check, X, Upload, ScanLine, RotateCw, Sun, Contrast, FileText, Download, Wand2, Type, Hash, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Cropper, { Area, Point } from 'react-easy-crop';
import * as pdfjs from 'pdfjs-dist';
import Layout from '../components/Layout';
import { recognizeText, improveHandwriting, cleanOcrText } from '../services/ocrService';
import { createPDF } from '../services/pdfService';
import { softHaptic, mediumHaptic, successHaptic } from '../lib/haptics';

// Set up pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function OCRScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [aiMode, setAiMode] = useState<'none' | 'handwriting' | 'clean' | 'formal' | 'bullets'>('none');
  const navigate = useNavigate();

  // Cropper state
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!isEditing && !capturedImage) startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isEditing, capturedImage]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          // @ts-ignore - pdfjs types can be tricky
          await page.render({ canvasContext: context, viewport }).promise;
          pages.push(canvas.toDataURL('image/jpeg'));
        }
      }

      setPdfPages(pages);
      setCapturedImage(pages[0]);
      setIsEditing(true);
      setCurrentPageIndex(0);
    } catch (err) {
      console.error("PDF load error:", err);
      setError("Failed to load PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanToPdf = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      // In a real app we'd combine multiple scans, for now we save current
      await createPDF(capturedImage, "SCAN_" + new Date().getTime());
      alert("Scan saved to PDF!");
    } catch (err) {
      setError("Failed to generate PDF from scan");
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access denied. Try uploading a file instead.");
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setIsEditing(true);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
        setIsEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation = 0, brightness = 100, contrast = 100): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bBoxWidth, height: bBoxHeight } = {
      width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
      height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
    };

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Apply filters before drawing the main image
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Reset filter for putting image data
    ctx.filter = 'none';
    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL('image/jpeg');
  };

  const handleAddToBatch = async () => {
    if (!capturedImage || !croppedAreaPixels) return;
    softHaptic();
    try {
      const croppedImage = await getCroppedImg(capturedImage, croppedAreaPixels, rotation, brightness, contrast);
      if (croppedImage) {
        setScannedImages([...scannedImages, croppedImage]);
        reset();
      }
    } catch (err) {
      setError("Failed to add page to batch");
    }
  };

  const processOCR = async (isBatch: boolean = false) => {
    const imagesToProcess = isBatch ? (scannedImages.length > 0 ? scannedImages : pdfPages) : [];
    
    // If not specific batch, handle the current single image
    if (!isBatch && capturedImage && croppedAreaPixels) {
      setIsProcessing(true);
      try {
        const croppedImage = await getCroppedImg(capturedImage, croppedAreaPixels, rotation, brightness, contrast);
        if (!croppedImage) throw new Error("Failed to crop image");
        
        let text = await recognizeText(croppedImage);
        
        // Post-processing
        if (aiMode === 'handwriting') {
          text = await improveHandwriting(text);
        } else if (aiMode !== 'none') {
          const style = aiMode === 'bullets' ? 'bullet_points' : aiMode;
          text = await cleanOcrText(text, style as any);
        }

        setOcrResult(text);
        setShowFormatModal(true);
        successHaptic();
      } catch (err) {
        console.error(err);
        setError("Failed to recognize text.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (imagesToProcess.length === 0) return;
    
    setIsProcessing(true);
    try {
      let combinedText = "";
      for (let i = 0; i < imagesToProcess.length; i++) {
        let text = await recognizeText(imagesToProcess[i]);
        
        // Apply AI refinements per page if in handwriting mode
        if (aiMode === 'handwriting') {
          text = await improveHandwriting(text);
        }
        
        combinedText += `\n--- PAGE ${i + 1} ---\n${text}\n`;
      }

      // Final cleanup for the whole document
      if (aiMode !== 'none' && aiMode !== 'handwriting') {
        const style = aiMode === 'bullets' ? 'bullet_points' : aiMode;
        combinedText = await cleanOcrText(combinedText, style as any);
      }

      setOcrResult(combinedText);
      setShowFormatModal(true);
      successHaptic();
    } catch (err) {
      console.error(err);
      setError("Failed to process batch OCR.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormatSelect = async (format: 'text' | 'markdown' | 'pdf') => {
    if (!ocrResult) return;
    
    if (format === 'pdf') {
      try {
        await createPDF(ocrResult, "OCR_Result_" + new Date().getTime());
        navigate('/'); // Navigate home after successful PDF generation
      } catch (err) {
        setError("Failed to generate PDF");
      }
    } else {
      const finalResult = format === 'markdown' 
        ? `# OCR RESULT\n\n${ocrResult}\n\n*Generated on ${new Date().toLocaleString()}*`
        : ocrResult;
      navigate('/editor', { state: { ocrText: finalResult, type: 'scan' } });
    }
    setShowFormatModal(false);
  };

  const reset = () => {
    setCapturedImage(null);
    setIsEditing(false);
    setError(null);
    setRotation(0);
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setShowFilters(false);
  };

  return (
    <Layout 
      title="SCANNER" 
      subtitle={isEditing ? "EDIT_IMAGE ACTIVE" : "AP_VISION ACTIVE"}
      hugeText={isEditing ? "EDIT\nFRAME" : "CAPTURE\nSCAN"}
      showBack
    >
      <div className="flex-1 flex flex-col relative bg-slate-950 -mx-4 -mt-8 sm:mx-0 sm:mt-0 sm:rounded-[40px] overflow-hidden shadow-2xl mb-8 group min-h-[500px]">
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              id="camera-preview"
            />
            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-blue-500/30 rounded-3xl relative">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                
                {/* Scanning Line Animation */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
              </div>
            </div>
            
            <div className="absolute bottom-8 inset-x-0 flex justify-center items-end gap-12 text-center">
               <label className="flex flex-col items-center gap-2 cursor-pointer group/upload">
                  <div className="w-14 h-14 bg-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white group-hover/upload:bg-slate-700 transition-colors border border-white/10 shadow-lg">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/upload:text-white transition-colors">Gallery</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
               </label>
               
               <div className="flex flex-col items-center gap-2">
                 <button 
                    onClick={capture}
                    className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center group/btn hover:scale-105 active:scale-95 transition-all shadow-2xl"
                    id="capture-button"
                  >
                    <div className="w-16 h-16 border-[6px] border-slate-900/5 rounded-2xl flex items-center justify-center">
                      <ScanLine className="w-8 h-8 text-slate-900 group-hover/btn:scale-110 transition-transform" />
                    </div>
                  </button>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Capture</span>
               </div>

               <div className="flex flex-col items-center gap-2">
                  <label className="w-14 h-14 bg-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white cursor-pointer hover:bg-slate-700 transition-colors border border-white/10 shadow-lg">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  </label>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest transition-colors">Import PDF</span>
               </div>
            </div>
          </>
        ) : isEditing && !isProcessing ? (
          <div className="relative w-full h-full bg-slate-950">
            <div className="w-full h-full" style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}>
              <Cropper
                image={capturedImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={3 / 4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* PDF Page Navigation */}
            {pdfPages.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-4 text-[10px] font-black tracking-widest z-10 backdrop-blur-md">
                 <button 
                    onClick={() => {
                      const idx = Math.max(0, currentPageIndex - 1);
                      setCurrentPageIndex(idx);
                      setCapturedImage(pdfPages[idx]);
                    }}
                    className="p-1 hover:text-blue-500 transition-colors disabled:opacity-30 pointer-events-auto"
                    disabled={currentPageIndex === 0}
                 >
                    PREV
                 </button>
                 <span className="text-blue-500">{currentPageIndex + 1} / {pdfPages.length}</span>
                 <button 
                    onClick={() => {
                      const idx = Math.min(pdfPages.length - 1, currentPageIndex + 1);
                      setCurrentPageIndex(idx);
                      setCapturedImage(pdfPages[idx]);
                    }}
                    className="p-1 hover:text-blue-500 transition-colors disabled:opacity-30 pointer-events-auto"
                    disabled={currentPageIndex === pdfPages.length - 1}
                 >
                    NEXT
                 </button>
              </div>
            )}
            
            <div className="absolute bottom-6 inset-x-4 flex items-center justify-between pointer-events-none">
              <div className="flex gap-2 pointer-events-auto">
                <button 
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="w-12 h-12 bg-slate-900/90 text-white rounded-2xl flex items-center justify-center border border-white/10 hover:bg-slate-800 transition-colors shadow-xl"
                  title="Rotate"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 transition-all shadow-xl ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-900/90 text-white hover:bg-slate-800'}`}
                  title="Image Adjustments"
                >
                  <Sun className="w-5 h-5" />
                </button>
              </div>
              
              <div className="px-4 py-2 bg-slate-900/90 text-white rounded-2xl pointer-events-auto border border-white/10 flex items-center gap-4">
                <input 
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {showFilters && (
              <div className="absolute top-4 inset-x-4 bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-white/10 space-y-6 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                       <Sun className="w-3 h-3" /> Brightness
                    </div>
                    <span>{brightness}%</span>
                  </div>
                  <input 
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                       <Contrast className="w-3 h-3" /> Contrast
                    </div>
                    <span>{contrast}%</span>
                  </div>
                  <input 
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={() => { setBrightness(100); setContrast(100); }}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img src={capturedImage} className="w-full h-full object-cover" id="captured_image_preview" />
            
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-10 text-center">
                <div className="relative w-20 h-20 mb-6">
                  <RefreshCw className="w-20 h-20 text-blue-500 animate-spin opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScanLine className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-black italic tracking-tighter uppercase mb-2">Analyzing</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Extracting semantic data...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Mode Selector */}
      {!isProcessing && (capturedImage || scannedImages.length > 0) && (
        <div className="mt-4 mb-6">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2 mb-3 block">AI Enhancement Mode</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
            {[
              { id: 'none', label: 'Standard', icon: <ScanLine className="w-4 h-4" /> },
              { id: 'handwriting', label: 'Handwriting', icon: <Wand2 className="w-4 h-4" /> },
              { id: 'clean', label: 'Clean', icon: <RefreshCw className="w-4 h-4" /> },
              { id: 'formal', label: 'Formal', icon: <Type className="w-4 h-4" /> },
              { id: 'bullets', label: 'Bullets', icon: <Hash className="w-4 h-4" /> }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => { softHaptic(); setAiMode(mode.id as any); }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl whitespace-nowrap transition-all border font-black uppercase text-[10px] tracking-widest ${aiMode === mode.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
              >
                {mode.icon}
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {capturedImage && !isProcessing && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={handleAddToBatch}
                className="bg-slate-900 border border-white/10 py-5 rounded-[24px] font-black uppercase text-[12px] tracking-widest text-white flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
             >
                <Plus className="w-4 h-4 text-blue-400" /> {scannedImages.length > 0 ? `Add Page (${scannedImages.length + 1})` : 'Add Page'}
             </button>
             <button 
                onClick={handleScanToPdf}
                className="bg-slate-900 border border-white/10 py-5 rounded-[24px] font-black uppercase text-[12px] tracking-widest text-white flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
             >
                <Download className="w-4 h-4 text-blue-400" /> Save as PDF
             </button>
          </div>

          {(pdfPages.length > 1 || scannedImages.length > 0) && (
            <button 
              onClick={() => processOCR(true)}
               className="w-full bg-blue-600/10 border border-blue-500/20 py-5 rounded-[24px] font-black uppercase text-[12px] tracking-widest text-blue-500 flex items-center justify-center gap-2 hover:bg-blue-600/20 transition-all shadow-xl"
            >
              <FileText className="w-4 h-4" /> Batch OCR {scannedImages.length || pdfPages.length} Pages
            </button>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={reset}
              className="bg-slate-800 py-5 rounded-[24px] font-black uppercase text-[12px] tracking-widest text-slate-400 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-white/5"
              id="retake-button"
            >
              <X className="w-4 h-4" /> {isEditing ? 'CANCEL' : 'RETAKE'}
            </button>
            <button 
              onClick={() => processOCR(false)}
              className="bg-blue-600 py-5 rounded-[24px] font-black uppercase text-[12px] tracking-widest text-white flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/30"
              id="proceed-button"
            >
              <Check className="w-4 h-4" /> {isEditing ? 'EXTRACT' : 'ANALYZE'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[24px] flex items-center gap-4">
          <X className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Scanner Error</p>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Format Selection Modal */}
      <AnimatePresence>
        {showFormatModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowFormatModal(false); setOcrResult(null); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative z-10"
            >
              <div className="p-10 text-center border-b border-slate-100">
                 <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Check className="w-8 h-8 text-blue-600" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Recognition Complete</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Choose your desired output format</p>
              </div>
              
              <div className="p-4 bg-slate-50 flex flex-col gap-3">
                 <button 
                    onClick={() => handleFormatSelect('text')}
                    className="w-full bg-white p-6 rounded-[28px] border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group text-left flex items-center gap-4"
                 >
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                       <Type className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-900">Plain Text</div>
                      <div className="text-[10px] font-bold text-slate-400">Open in the full editor</div>
                    </div>
                 </button>
  
                 <button 
                    onClick={() => handleFormatSelect('markdown')}
                    className="w-full bg-white p-6 rounded-[28px] border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group text-left flex items-center gap-4"
                 >
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                       <Hash className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-900">Markdown Format</div>
                      <div className="text-[10px] font-bold text-slate-400">Add headers and rich formatting</div>
                    </div>
                 </button>
  
                 <button 
                    onClick={() => handleFormatSelect('pdf')}
                    className="w-full bg-white p-6 rounded-[28px] border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all group text-left flex items-center gap-4"
                 >
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                       <Download className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-900">Direct to PDF</div>
                      <div className="text-[10px] font-bold text-slate-400">Download result immediately</div>
                    </div>
                 </button>
              </div>
  
              <div className="p-6 bg-white">
                 <button 
                    onClick={() => { setShowFormatModal(false); setOcrResult(null); }}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                 >
                    Discard Results
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.5; }
          50% { top: 100%; opacity: 1; }
        }
      `}} />
    </Layout>
  );
}
