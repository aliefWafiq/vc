"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

export default function AddClothingPage() {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedData, setDetectedData] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>(null);
  const lastProcessingTime = useRef<number>(0);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const initPose = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        poseLandmarkerRef.current = landmarker;
      } catch (err) {
        console.error("Failed to init MediaPipe:", err);
      }
    };
    initPose();
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

  const predictPose = () => {
    const now = performance.now();
    // Throttle to ~15 FPS (every 66ms) to reduce CPU load and lag
    if (now - lastProcessingTime.current < 66) {
      requestRef.current = requestAnimationFrame(predictPose);
      return;
    }
    lastProcessingTime.current = now;

    if (
      videoRef.current &&
      videoRef.current.readyState >= 2 &&
      poseLandmarkerRef.current &&
      canvasRef.current
    ) {
      const results = poseLandmarkerRef.current.detectForVideo(videoRef.current, now);
      
      const canvasCtx = canvasRef.current.getContext("2d");
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        const drawingUtils = new DrawingUtils(canvasCtx);
        
        for (const landmark of results.landmarks) {
          drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
            color: "rgba(255, 255, 255, 0.4)",
            lineWidth: 2
          });
          drawingUtils.drawLandmarks(landmark, {
            color: "rgba(255, 255, 255, 0.8)",
            lineWidth: 1,
            radius: 3
          });
        }
      }
    }
    requestRef.current = requestAnimationFrame(predictPose);
  };

  useEffect(() => {
    if (isCameraOn && !capturedImage) {
      requestRef.current = requestAnimationFrame(predictPose);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraOn, capturedImage]);

  useEffect(() => {
    if (isCameraOn && cameraStream && videoRef.current && !capturedImage) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOn, cameraStream, capturedImage]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        // Lower resolution for better performance (less lag)
        video: { width: 640, height: 480 } 
      });
      setCameraStream(stream);
      setIsCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOn(false);
  };

  const captureImage = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageData);
      identifyClothing(imageData);
    }
  };

  const identifyClothing = async (imageData: string) => {
    setIsIdentifying(true);
    try {
      const res = await fetch(imageData);
      const blob = await res.blob();
      const file = new File([blob], "clothing.jpg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${getApiUrl()}/api/identify`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!response.ok) throw new Error("Gagal mengidentifikasi pakaian");

      const data = await response.json();
      setDetectedData(data);
      setName(data.name || "");
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengidentifikasi pakaian.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const saveToWardrobe = async () => {
    if (!detectedData) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/api/clothes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: name,
          type: detectedData.type,
          material: detectedData.material,
          color: detectedData.color,
          price: parseFloat(price) || 0,
          image_url: capturedImage || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop",
          carbon_efficiency: detectedData.carbon_efficiency,
          impact_score: detectedData.impact_score
        })
      });

      if (response.ok) {
        router.push("/wardrobe");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Gagal menyimpan ke wardrobe");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-20 space-y-12 reveal">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => router.back()} className="text-neutral-500 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold">
            &larr; Back
          </button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-4xl md:text-5xl font-medium tracking-tighter font-display text-white leading-tight">Digital Intake.</h1>
        </div>
        {isCameraOn && !capturedImage && (
           <div className="px-5 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-[10px] tracking-[0.3em] uppercase font-bold text-white flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            VibeTracker™ Active
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${capturedImage ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-8 items-start transition-all duration-700`}>
        {/* Camera View - Full width initially, shrinks when photo taken */}
        <div className={`${capturedImage ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'} transition-all duration-700`}>
          <div className="aspect-video bg-neutral-900/50 border border-white/5 rounded-[3rem] overflow-hidden relative group pro-panel shadow-2xl flex items-center justify-center">
            {!isCameraOn ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-8">
                <div className="w-20 h-20 border border-white/5 rounded-[2rem] flex items-center justify-center text-3xl bg-white/[0.02]">
                  📸
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold font-display tracking-tight text-white">Initialize Optics</h3>
                  <p className="text-neutral-500 text-sm max-w-xs font-light">Grant camera access for neural garment identification and impact analysis.</p>
                </div>
                <button onClick={startCamera} className="btn-premium">
                  <span className="btn-premium-inner"></span>
                  <span className="btn-premium-text px-8">Enable Optics</span>
                </button>
              </div>
            ) : (
              <div className="w-full h-full relative">
                {capturedImage ? (
                  <img src={capturedImage} className="w-full h-full object-cover grayscale opacity-90 transition-all duration-1000" alt="Captured" />
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" width={1280} height={720} />
                  </>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                
                {!capturedImage && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <button 
                      onClick={captureImage}
                      className="btn-premium group flex items-center gap-4"
                    >
                      <span className="btn-premium-inner"></span>
                      <span className="text-xl group-hover:scale-125 transition-transform">💎</span>
                      <span className="btn-premium-text px-4">Capture & Analyze</span>
                    </button>
                  </div>
                )}

                {capturedImage && !isSaving && (
                  <button 
                    onClick={() => { setCapturedImage(null); setDetectedData(null); startCamera(); }}
                    className="absolute top-10 right-10 px-8 py-3 bg-black/50 hover:bg-white hover:text-black backdrop-blur-xl border border-white/10 rounded-full text-[10px] tracking-[0.3em] uppercase font-bold transition-all duration-500"
                  >
                    Discard & Retake
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info & Inputs - Hidden until photo taken */}
        {capturedImage && (
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full animate-fade-in">
            <div className="pro-panel flex-1 rounded-[3rem] p-10 space-y-8 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              
              {isIdentifying ? (
                <div className="h-full flex flex-col items-center justify-center space-y-8 text-center animate-pulse flex-1">
                  <div className="w-16 h-16 border border-white/10 rounded-2xl flex items-center justify-center text-2xl bg-white/5">
                    🤖
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold font-display tracking-tight text-white">Neural Processing</h3>
                    <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold">Identifying Fabric & Impact...</p>
                  </div>
                </div>
              ) : detectedData ? (
                <div className="space-y-10 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 font-bold">Analysis Output</div>
                    <h3 className="text-3xl font-medium tracking-tight font-display text-white">Digital Twin Data</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Identified Type</label>
                      <p className="text-base font-medium text-white">{detectedData.type}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Primary Material</label>
                      <p className="text-base font-medium text-white">{detectedData.material}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Carbon Efficiency</label>
                        <p className="text-2xl font-semibold text-white mt-1">{detectedData.carbon_efficiency}/10</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl">♻️</div>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                      <div>
                        <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Impact Score</label>
                        <p className="text-2xl font-semibold text-white mt-1">{detectedData.impact_score}/100</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xl">💎</div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-white/5 flex-1">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Item Name</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 pb-2 text-sm font-light focus:outline-none focus:border-white/40 transition-all text-white"
                        placeholder="e.g. Vintage Oversized Blazer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Acquisition Price (USD)</label>
                      <div className="relative group">
                        <span className="absolute left-0 top-0 text-neutral-600 text-sm">$</span>
                        <input 
                          type="number" 
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full bg-transparent border-b border-white/10 pl-4 pb-2 text-sm font-light focus:outline-none focus:border-white/40 transition-all text-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={saveToWardrobe}
                    disabled={isSaving}
                    className="btn-premium w-full group mt-auto"
                  >
                    <span className="btn-premium-inner"></span>
                    <span className="btn-premium-text flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest">
                      {isSaving ? "Syncing..." : "Finalize Intake"}
                      {!isSaving && <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
