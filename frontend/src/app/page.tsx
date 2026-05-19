import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden px-6">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/hero-bg.png" 
            alt="Fashion AI Hero" 
            fill 
            className="object-cover opacity-50 scale-105 animate-pulse-slow"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#030303] z-10" />
        </div>

        <div className="relative z-20 max-w-5xl text-center space-y-12 reveal">
          <div className="inline-flex items-center gap-3 px-4 py-2 mb-4 border border-white/10 rounded-full bg-white/5 text-[10px] uppercase tracking-[0.4em] font-bold text-neutral-400 glow-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            The Future of Circular Fashion
          </div>
          
          <h1 className="text-7xl md:text-[10rem] font-medium tracking-tighter text-white leading-[0.85] font-display">
            VIBE<br />
            <span className="text-neutral-500 italic font-light">CLOSET.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-neutral-400 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
            A professional-grade AI ecosystem that digitizes your wardrobe, provides intelligent styling, and calculates environmental impact in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <Link href="/stylist" className="btn-premium">
              <span className="btn-premium-inner"></span>
              <span className="btn-premium-text">Start Styling</span>
            </Link>
            <Link href="/wardrobe" className="btn-ghost text-[13px] uppercase tracking-widest font-bold">
              Browse Closet
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/20" />
        </div>
      </section>

      {/* Tech Stack / Trust Bar */}
      <div className="w-full max-w-7xl px-6 py-12 border-y border-white/5 flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale">
        <span className="text-sm font-bold tracking-[0.3em] uppercase">Gemini AI</span>
        <span className="text-sm font-bold tracking-[0.3em] uppercase">Next.js 15</span>
        <span className="text-sm font-bold tracking-[0.3em] uppercase">FastAPI</span>
        <span className="text-sm font-bold tracking-[0.3em] uppercase">AlloyDB</span>
        <span className="text-sm font-bold tracking-[0.3em] uppercase">Google Cloud</span>
      </div>

      {/* Features Section */}
      <section className="w-full max-w-7xl px-6 py-32 md:py-48">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 pro-panel p-12 rounded-[2.5rem] flex flex-col justify-between min-h-[400px] group">
            <div className="space-y-6">
              <div className="text-4xl font-light text-neutral-700 font-display italic">01</div>
              <h3 className="text-4xl md:text-5xl font-semibold text-white tracking-tight font-display">AI Digitization</h3>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Instant cataloging using advanced vision models. Gemini-powered tagging automatically identifies fabric, color, and style with surgical precision.
              </p>
            </div>
            <div className="pt-8 flex justify-end">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                &rarr;
              </div>
            </div>
          </div>
          
          <div className="md:col-span-4 pro-panel p-12 rounded-[2.5rem] space-y-8 min-h-[400px]">
            <div className="text-4xl font-light text-neutral-700 font-display italic">02</div>
            <h3 className="text-3xl font-semibold text-white tracking-tight font-display">Live Stylist</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Interactive sessions featuring real-time video analysis. Get expert-level recommendations tailored to your unique physique.
            </p>
          </div>

          <div className="md:col-span-4 pro-panel p-12 rounded-[2.5rem] space-y-8 min-h-[400px]">
            <div className="text-4xl font-light text-neutral-700 font-display italic">03</div>
            <h3 className="text-3xl font-semibold text-white tracking-tight font-display">Eco Analytics</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Quantify your footprint. Track cost-per-wear and carbon savings as you build a more circular, conscious wardrobe.
            </p>
          </div>

          <div className="md:col-span-8 pro-panel p-12 rounded-[2.5rem] flex flex-col justify-between min-h-[400px] bg-white/5">
            <div className="space-y-6">
              <div className="text-4xl font-light text-neutral-700 font-display italic">04</div>
              <h3 className="text-4xl font-semibold text-white tracking-tight font-display">Circular Lifecycle</h3>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-md">
                Manage your items from purchase to resale. Our AI suggests repairs, suggests resale prices, and tracks the full journey of your garment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Element / CTA */}
      <section className="w-full max-w-7xl px-6 pb-32">
        <div className="relative w-full aspect-[21/9] bg-neutral-900/30 rounded-[4rem] border border-white/5 flex items-center justify-center overflow-hidden group glow-hover transition-all duration-700">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10" />
          <div className="text-center z-20 space-y-6 max-w-2xl px-6">
            <div className="text-[10px] uppercase tracking-[0.5em] text-neutral-500 font-bold">Innovation</div>
            <h2 className="text-4xl md:text-6xl font-light italic text-white font-display">The Virtual Mirror</h2>
            <p className="text-neutral-400 text-sm md:text-base font-light">Experience clothing without the touch. Our upcoming AR feature lets you try on your entire closet in real-time.</p>
          </div>
          <div className="absolute inset-0 bg-white/[0.02] scale-110 group-hover:scale-100 transition-transform duration-1000" />
        </div>
      </section>
    </div>
  );
}

