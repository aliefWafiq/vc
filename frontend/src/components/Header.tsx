"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthButton from '@/components/AuthButton';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl">
      <div className={`pro-panel px-8 flex justify-between items-center transition-all duration-500 ${isOpen ? 'h-auto py-6 rounded-[2rem] flex-col gap-6' : 'h-16 rounded-full'}`}>
        {/* Main top bar container */}
        <div className="w-full flex justify-between items-center">
          <a href="/" className="text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity font-display">
            VIBE<span className="text-neutral-500 italic">CLOSET</span>
          </a>
          
          <div className="flex items-center gap-4">
            {/* Desktop Auth Button */}
            <div className="hidden md:block">
              <AuthButton />
            </div>
            
            {/* Hamburger Toggle Button */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5 text-white transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-10 text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/stylist" className="hover:text-white transition-colors">AI Stylist</Link>
          <Link href="/wardrobe" className="hover:text-white transition-colors">Wardrobe</Link>
          <Link href="/ootd-scanner" className="hover:text-white transition-colors">OOTD Scan</Link>
        </nav>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="w-full md:hidden flex flex-col items-center gap-6 py-4 border-t border-white/5 animate-reveal">
            <nav className="flex flex-col items-center gap-6 text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-400">
              <Link href="/" onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">Home</Link>
              <Link href="/stylist" onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">AI Stylist</Link>
              <Link href="/wardrobe" onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">Wardrobe</Link>
              <Link href="/ootd-scanner" onClick={() => setIsOpen(false)} className="hover:text-white transition-colors">OOTD Scan</Link>
            </nav>
            <div className="w-full border-t border-white/5 pt-6 flex justify-center">
              <AuthButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
