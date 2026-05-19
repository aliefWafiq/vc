"use client";

import { useEffect, useState } from 'react';

interface RecommendationData {
  title: string;
  items: { name: string; desc: string }[];
  reason: string;
}

interface RecommendationCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  data: RecommendationData | null;
}

export default function RecommendationCanvas({ isOpen, onClose, data }: RecommendationCanvasProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setMounted(false), 500);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] grid place-items-center p-4 md:p-10 overflow-y-auto transition-all duration-700 ${
        isOpen ? 'bg-black/80 backdrop-blur-md opacity-100' : 'bg-transparent opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-3xl my-8 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-white/[0.02] to-transparent">
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 font-bold">Curated Style</div>
            <h2 className="text-3xl font-semibold tracking-tighter font-display text-white">Outfit Recommendation.</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors group"
          >
            <span className="text-neutral-500 group-hover:text-white transition-colors">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          {data ? (
            <>
              <div className="space-y-4">
                <h3 className="text-4xl font-light tracking-tight text-white/90 leading-tight">
                  {data.title}
                </h3>
                <div className="h-1 w-20 bg-gradient-to-r from-white/40 to-transparent rounded-full" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.items.map((item, index) => (
                  <div 
                    key={index} 
                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-3 group hover:bg-white/[0.05] transition-all duration-500"
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 group-hover:text-white/60 transition-colors">
                      {item.name}
                    </div>
                    <div className="text-lg font-light text-neutral-200 leading-snug">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-xs">✨</div>
                  <h4 className="text-sm uppercase tracking-[0.3em] font-bold text-neutral-400">Stylist's Note</h4>
                </div>
                <p className="text-xl font-light text-neutral-400 leading-relaxed italic">
                  "{data.reason}"
                </p>
              </div>

              {/* Action */}
              <div className="pt-10 flex flex-col md:flex-row gap-4">
                <button className="btn-premium flex-1">
                  <span className="btn-premium-inner"></span>
                  <span className="btn-premium-text px-10 py-2">Add to My Lookbook</span>
                </button>
                <button 
                  onClick={onClose}
                  className="px-10 py-4 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
              <div className="w-16 h-16 rounded-[2rem] border border-white/5 animate-pulse flex items-center justify-center text-2xl">
                ⏳
              </div>
              <p className="text-sm uppercase tracking-widest font-bold">Decoding Fashion Flux...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
