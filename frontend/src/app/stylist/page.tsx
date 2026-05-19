"use client";

import { useEffect, useState, useRef } from 'react';
import RecommendationCanvas from '@/components/RecommendationCanvas';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

import { getWsUrl } from '@/lib/api';

interface RecommendationData {
  title: string;
  items: { name: string; desc: string }[];
  reason: string;
}

interface Message {
  role: string;
  content: string;
  recommendation?: RecommendationData | null;
}

export default function StylistPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  // Canvas State
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationData | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([{ 
      role: 'ai', 
      content: 'Halo! Saya VibeStylist Anda. Silakan aktifkan kamera Anda agar saya dapat memberikan analisis fashion real-time dan saran gaya yang dipersonalisasi khusus untuk Anda.' 
    }]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const ws = new WebSocket(`${getWsUrl()}/ws/stylist${token ? `?token=${token}` : ''}`);
    
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const rawContent = event.data;
      let displayContent = rawContent;
      let recommendationData: RecommendationData | null = null;

      // Parse [RECOMMENDATION] tag
      const recMatch = rawContent.match(/\[RECOMMENDATION\]([\s\S]*?)\[\/RECOMMENDATION\]/);
      if (recMatch) {
        try {
          recommendationData = JSON.parse(recMatch[1].trim());
          // Remove the tag from display content
          displayContent = rawContent.replace(/\[RECOMMENDATION\][\s\S]*?\[\/RECOMMENDATION\]/, '').trim();
        } catch (e) {
          console.error("Failed to parse recommendation JSON", e);
        }
      }

      // Final cleaning of markdown symbols like *, #, `
      const cleanContent = (text: string) => {
        return text
          .replace(/[*#`_~]/g, '') // Remove *, #, `, _, ~
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links but keep text
          .trim();
      };

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: cleanContent(displayContent), 
        recommendation: recommendationData 
      }]);
      setIsThinking(false);
    };
    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;

    return () => {
      ws.close();
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const initPose = async () => {
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
    };
    initPose();
  }, []);

  const predictPose = () => {
    if (
      videoRef.current &&
      videoRef.current.readyState >= 2 &&
      poseLandmarkerRef.current &&
      canvasRef.current
    ) {
      const startTimeMs = performance.now();
      const results = poseLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
      
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
    if (isCameraOn && isConnected) {
      requestRef.current = requestAnimationFrame(predictPose);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isCameraOn, isConnected]);

  useEffect(() => {
    if (isCameraOn && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOn, cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOn(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      setCameraStream(stream);
      setIsCameraOn(true);
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: 'Kamera aktif dengan VibeTracker™. Saya sedang menganalisis proporsi tubuh dan orientasi gaya Anda. Silakan berdiri tegak agar saya bisa memberikan saran yang presisi.' 
        }]);
      }, 1500);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !wsRef.current || !isConnected) return;
    
    setIsThinking(true);
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      wsRef.current.send(imageData);
      setMessages(prev => [...prev, { role: 'user', content: '[Visual Analysis Request]' }]);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !wsRef.current) return;

    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    wsRef.current.send(inputMessage);
    setInputMessage("");
    setIsThinking(true);
  };

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-6 pt-32 pb-10 flex flex-col reveal">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 font-bold">Real-time Analysis</div>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter font-display">Live Session.</h1>
            <p className="text-neutral-500 font-light max-w-md text-lg">Interactive visual intelligence with your dedicated fashion assistant.</p>
          </div>
          <div className="flex items-center gap-4">
            {isCameraOn && (
              <button 
                onClick={stopCamera}
                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full backdrop-blur-xl transition-all duration-300 group flex items-center gap-3"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-400 group-hover:text-red-300">Disable Feed</span>
              </button>
            )}
            <div className="flex items-center gap-4 border border-white/5 bg-white/[0.02] px-8 py-3 rounded-full backdrop-blur-xl glow-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400">
                {isConnected ? 'Neural Link Active' : 'Neural Link Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-stretch">
          {/* Video Column */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <div className="aspect-video bg-neutral-900/50 border border-white/5 rounded-[3rem] overflow-hidden relative group pro-panel shadow-2xl">
              {!isCameraOn ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-8">
                  <div className="w-20 h-20 border border-white/5 rounded-[2rem] flex items-center justify-center text-3xl bg-white/[0.02]">
                    📷
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold font-display tracking-tight">Camera Input Required</h3>
                    <p className="text-neutral-500 text-base max-w-xs font-light">Grant access for real-time analysis of your wardrobe and fit.</p>
                  </div>
                  <button 
                    onClick={startCamera}
                    className="btn-premium"
                  >
                    <span className="btn-premium-inner"></span>
                    <span className="btn-premium-text px-4">Initialize Feed</span>
                  </button>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover opacity-90 transition-opacity duration-1000"
                  />
                  <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    width={1280}
                    height={720}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  <div className="absolute top-10 left-10 flex flex-col gap-3">
                    <div className="px-5 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] tracking-[0.3em] uppercase font-bold text-white flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      VibeTracker™ Active
                    </div>
                    <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/5 rounded-full text-[8px] tracking-widest uppercase font-bold text-neutral-400">
                      Neural Keypoint Mapping
                    </div>
                  </div>
                  
                  <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
                    <button 
                      onClick={captureAndAnalyze}
                      className="btn-premium group flex items-center gap-4"
                    >
                      <span className="btn-premium-inner"></span>
                      <span className="text-xl group-hover:scale-125 transition-transform">💎</span>
                      <span className="btn-premium-text px-2">Analyze My Look</span>
                    </button>
                    
                    <button 
                      onClick={stopCamera}
                      className="px-8 py-3 bg-black/50 hover:bg-red-950/50 backdrop-blur-xl border border-white/10 rounded-full text-[10px] tracking-[0.3em] uppercase font-bold transition-all duration-500"
                    >
                      Terminate Feed
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Column */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-[700px]">
            <div className="pro-panel flex-1 flex flex-col rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl">
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-sm font-bold bg-white/5">
                    VS
                  </div>
                  <div>
                    <h3 className="text-base font-semibold font-display tracking-tight">VibeStylist AI</h3>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">V-Core 3.0</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              </div>

              <div 
                ref={chatContainerRef}
                className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar bg-black/20"
              >
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col gap-3 max-w-[85%]`}>
                      <div 
                        className={`p-5 rounded-[1.5rem] text-[14px] leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-white text-black font-medium self-end' 
                            : 'bg-white/[0.03] border border-white/5 text-neutral-300 font-light self-start'
                        }`}
                      >
                        {msg.content}
                      </div>
                      
                      {msg.recommendation && (
                        <button 
                          onClick={() => {
                            setActiveRecommendation(msg.recommendation!);
                            setIsCanvasOpen(true);
                          }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-all group self-start w-full max-w-sm"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                            ✨
                          </div>
                          <div className="flex-1 text-left">
                            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">New Suggestion</div>
                            <div className="text-xs font-semibold text-white">View Outfit Details</div>
                          </div>
                          <div className="text-neutral-500 group-hover:text-white transition-colors">
                            &rarr;
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.03] border border-white/5 p-5 rounded-[1.5rem] flex gap-2 items-center">
                      <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-black/40 border-t border-white/5">
                <form onSubmit={sendMessage} className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Inquire about styling..."
                    className="w-full bg-transparent border-b border-white/10 pb-4 text-sm font-light focus:outline-none focus:border-white/40 transition-all placeholder:text-neutral-600"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Shift + Enter to send</span>
                    <button 
                      type="submit"
                      disabled={!isConnected || !inputMessage.trim()}
                      className="text-[11px] uppercase tracking-[0.2em] font-bold text-white hover:text-neutral-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Transmit &rarr;
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RecommendationCanvas 
        isOpen={isCanvasOpen} 
        onClose={() => setIsCanvasOpen(false)} 
        data={activeRecommendation} 
      />

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}} />
    </>
  );
}

