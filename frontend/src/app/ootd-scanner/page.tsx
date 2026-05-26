"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

type Cloth = {
  id: number;
  name: string;
  type: string;
  price: number;
  times_worn: number;
  material: string;
  color: string;
  image_url: string;
  cost_per_wear: number;
};

type ScanResult = {
  success: boolean;
  message: string;
  matched_item?: Cloth;
  sensory_analysis?: string;
  carbon_points: number;
};

export default function OOTDScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setError(null);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Please allow camera access to use the OOTD Scanner.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    setResult(null);
    setError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, 'ootd.jpg');

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(`${getApiUrl()}/api/ootd/scan`, {
          method: 'POST',
          headers: headers,
          body: formData,
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Scan failed');
        }

        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error("Scan error:", err);
        setError("Something went wrong during the scan. Please try again.");
      } finally {
        setIsScanning(false);
      }
    }, 'image/jpeg');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setResult(null);
    startCamera();
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-32 pb-20 flex flex-col reveal">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 font-bold">Sustainability Tracking</div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter font-display">OOTD Scanner.</h1>
          <p className="text-neutral-500 font-light max-w-md text-lg">Scan your outfit to track usage, calculate cost-per-wear, and earn eco-points.</p>
        </div>
        <div className="flex items-center gap-4 border border-white/5 bg-white/[0.02] px-8 py-3 rounded-full backdrop-blur-xl glow-sm">
          <div className={`w-2 h-2 rounded-full ${!error ? 'bg-white animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400">
            {error ? 'Optics Offline' : 'Optics Ready'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Viewport Column */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="aspect-video bg-neutral-900/50 border border-white/5 rounded-[3rem] overflow-hidden relative group pro-panel shadow-2xl flex items-center justify-center">
            {error ? (
              <div className="p-12 text-center space-y-6">
                <div className="text-4xl">⚠️</div>
                <p className="text-red-400 font-medium">{error}</p>
                <button onClick={startCamera} className="btn-ghost text-[10px] uppercase tracking-widest font-bold">Retry Initialize</button>
              </div>
            ) : (
              <div className="w-full h-full relative">
                {capturedImage ? (
                  <img src={capturedImage} className="w-full h-full object-cover grayscale opacity-90 transition-all duration-1000" alt="Captured" />
                ) : (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover opacity-80"
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                
                {/* Scanner UI overlays */}
                <div className="absolute inset-0 pointer-events-none border-[40px] border-transparent">
                  <div className="w-full h-full border border-white/10 rounded-2xl relative">
                    {isScanning && (
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-scan-line" />
                    )}
                  </div>
                </div>

                {!capturedImage && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <button 
                      onClick={captureAndScan}
                      disabled={isScanning}
                      className="btn-premium group flex items-center gap-4"
                    >
                      <span className="btn-premium-inner"></span>
                      <span className="text-xl group-hover:scale-125 transition-transform">🔍</span>
                      <span className="btn-premium-text px-4">{isScanning ? 'Analyzing...' : 'Scan Outfit'}</span>
                    </button>
                  </div>
                )}

                {capturedImage && !isScanning && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-4">
                    <button 
                      onClick={handleRetake}
                      className="px-8 py-3 bg-black/50 hover:bg-white hover:text-black backdrop-blur-xl border border-white/10 rounded-full text-[10px] tracking-[0.3em] uppercase font-bold transition-all duration-500"
                    >
                      Retake Photo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-5 xl:col-span-4 h-full">
          <div className="pro-panel h-full min-h-[500px] rounded-[3rem] p-10 flex flex-col border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            {!result && !isScanning && !error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 border border-white/5 rounded-2xl flex items-center justify-center text-2xl bg-white/[0.02]">
                  ✨
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium font-display tracking-tight text-white">Awaiting Analysis</h3>
                  <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Point optics at your outfit</p>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-pulse">
                <div className="w-16 h-16 border border-white/10 rounded-2xl flex items-center justify-center text-2xl bg-white/5">
                  🤖
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium font-display tracking-tight text-white">Neural Processing</h3>
                  <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Matching with Digital Wardrobe...</p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-10 animate-reveal">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 font-bold">Scan Result</div>
                  <h3 className="text-3xl font-medium tracking-tight font-display text-white">
                    {result.success ? 'Identification Success' : 'Partial Match'}
                  </h3>
                </div>

                <div className="space-y-6">
                  <p className="text-neutral-400 text-sm leading-relaxed font-light">
                    {result.message}
                  </p>

                  {result.carbon_points > 0 && (
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                      <span className="text-2xl">🌿</span>
                      <div>
                        <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Eco Reward</div>
                        <div className="text-sm font-bold text-white">+{result.carbon_points} Carbon Points</div>
                      </div>
                    </div>
                  )}

                  {result.matched_item && (
                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-neutral-900">
                          <img src={result.matched_item.image_url} alt="Match" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">{result.matched_item.type}</div>
                          <div className="text-lg font-medium text-white">{result.matched_item.name}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Times Worn</div>
                          <div className="text-xl font-semibold text-white mt-1">{result.matched_item.times_worn}</div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Cost / Wear</div>
                          <div className="text-xl font-semibold text-white mt-1">${result.matched_item.cost_per_wear}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.sensory_analysis && (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🧩</span>
                        <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Sensory Analysis</div>
                      </div>
                      <p className="text-xs text-neutral-400 italic leading-relaxed">"{result.sensory_analysis}"</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => router.push('/wardrobe')}
                  className="btn-premium w-full group mt-6"
                >
                  <span className="btn-premium-inner"></span>
                  <span className="btn-premium-text flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest">
                    Back to Wardrobe <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
