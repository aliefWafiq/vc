"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    router.push('/');
    router.refresh();
  };

  if (isLoggedIn) {
    return (
      <button 
        onClick={handleLogout}
        className="text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all duration-500"
      >
        Log Out
      </button>
    );
  }

  return (
    <Link 
      href="/login"
      className="text-[10px] uppercase tracking-[0.2em] font-bold px-5 py-2.5 rounded-full border border-white/10 hover:bg-white hover:text-black transition-all duration-500"
    >
      Sign In
    </Link>
  );
}
