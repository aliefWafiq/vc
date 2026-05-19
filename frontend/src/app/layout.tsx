import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VibeCloset | AI Fashion Stylist",
  description: "Your professional AI-powered wardrobe assistant for a sustainable future.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen bg-[#030303] text-white selection:bg-white/10`}>
        <div className="fixed inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="fixed inset-0 bg-mesh opacity-40 pointer-events-none" />
        
        <Header />


        <main className="relative">
          {children}
        </main>

        <footer className="relative border-t border-white/5 py-20 mt-10 text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 font-bold">
            &copy; 2026 VibeCloset &mdash; Redefining Personal Style
          </div>
          <div className="mt-4 flex justify-center gap-8 text-[10px] uppercase tracking-widest text-neutral-400">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Instagram</a>
          </div>
        </footer>
      </body>
    </html>
  );
}

