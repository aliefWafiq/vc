"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

type InventoryItem = {
  id: number;
  name: string;
  type: string;
  color: string;
  material: string;
  image_url: string;
};

type EcoAnalytics = {
  cost_per_wear: number;
  carbon_savings_kg: number;
  impact_score: number;
};

export default function WardrobePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analytics, setAnalytics] = useState<EcoAnalytics | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchWardrobe = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/clothes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);

      const ecoRes = await fetch(`${getApiUrl()}/api/eco-analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ecoData = await ecoRes.json();
      setAnalytics(ecoData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWardrobe();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this item from your digital wardrobe?')) return;

    setDeletingId(id);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${getApiUrl()}/api/clothes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        // Optimistic update
        setInventory(prev => prev.filter(item => item.id !== id));
        // Refresh analytics as they change when an item is removed
        fetchWardrobe();
      } else {
        alert('Failed to delete item');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the item');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">The Collection</h1>
          <p className="text-neutral-500 font-light leading-relaxed">
            Manage your circular fashion assets and monitor the lifecycle efficiency of your wardrobe.
          </p>
        </div>
        <a href="/wardrobe/add" className="btn-premium flex items-center gap-4">
          <span className="btn-premium-inner"></span>
          <span className="text-xl">+</span>
          <span className="btn-premium-text px-2">Initialize Intake</span>
        </a>
      </div>

      {/* Analytics Grid */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="pro-panel p-8 rounded-3xl space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Cost per Wear</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium">${analytics.cost_per_wear}</span>
              <span className="text-xs text-neutral-600 font-light">USD</span>
            </div>
          </div>
          <div className="pro-panel p-8 rounded-3xl space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Carbon Efficiency</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium">{analytics.carbon_savings_kg}</span>
              <span className="text-xs text-neutral-600 font-light">KG Saved</span>
            </div>
          </div>
          <div className="pro-panel p-8 rounded-3xl space-y-4">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Impact Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium">{analytics.impact_score}</span>
              <span className="text-xs text-neutral-600 font-light">Index</span>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Grid */}
      <div className="space-y-12">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <h2 className="text-lg font-medium tracking-tight">Active Inventory</h2>
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">
            {inventory.length} Items Listed
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            // Skeleton Loader
            [...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="aspect-[3/4] rounded-3xl bg-white/[0.03] border border-white/5" />
                <div className="px-2 space-y-2">
                  <div className="h-4 w-2/3 bg-white/[0.05] rounded-full" />
                  <div className="h-3 w-1/2 bg-white/[0.03] rounded-full" />
                </div>
              </div>
            ))
          ) : inventory.length > 0 ? (
            inventory.map(item => (
              <div key={item.id} className="group cursor-pointer space-y-4">
                <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-900 border border-white/5 relative">
                  <img 
                     src={item.image_url} 
                     alt={item.name}
                     className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={(e) => handleDelete(e, item.id)}
                      disabled={deletingId === item.id}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 rounded-xl transition-all duration-300 text-red-500"
                      title="Remove from wardrobe"
                    >
                      {deletingId === item.id ? (
                        <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      )}
                    </button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full">
                      {item.type}
                    </span>
                  </div>
                </div>
                <div className="px-2 space-y-1">
                  <h3 className="text-sm font-medium tracking-tight text-white group-hover:text-neutral-400 transition-colors">{item.name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-600 font-light uppercase tracking-wider">
                    <span>{item.color}</span>
                    <span className="w-1 h-1 bg-neutral-800 rounded-full" />
                    <span>{item.material}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-40 text-center pro-panel rounded-[3rem] border border-white/5 space-y-4">
              <div className="text-neutral-700 text-sm font-light italic">Inventory empty</div>
              <p className="text-xs text-neutral-600 uppercase tracking-widest font-bold">Awaiting digital intake</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
