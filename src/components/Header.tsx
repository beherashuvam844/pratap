import React from 'react';
import { Trophy, Calendar, ShieldCheck, Award, MessageSquare, Flame, Image, Youtube } from 'lucide-react';
import ClubLogo from './ClubLogo';

export type TabType = 'announcements' | 'results' | 'competitions' | 'gallery' | 'admin';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isSimulatedAdminAuthenticated: boolean;
  appLogo?: string | null;
  clubLogo?: string | null;
}

export default function Header({
  activeTab,
  setActiveTab,
  isSimulatedAdminAuthenticated,
  appLogo = null,
  clubLogo = null
}: HeaderProps) {
  return (
    <header id="app-header" className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 sm:h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand - Simpler display name only */}
        <div id="header-brand" className="cursor-pointer" onClick={() => setActiveTab('announcements')}>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white leading-none">
            Pratap
          </h1>
        </div>

        {/* Main Navigation (Desktop) */}
        <nav id="header-nav" className="hidden lg:flex items-center gap-2">
          {[
            { id: 'announcements', label: 'Home', icon: MessageSquare },
            { id: 'results', label: 'Results', icon: Trophy },
            { id: 'competitions', label: 'Tournaments', icon: Calendar },
            { id: 'gallery', label: 'Gallery', icon: Image },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm sm:text-base font-extrabold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}

          <div className="w-px h-8 bg-slate-800 mx-2" />

          <button
            id="nav-tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm sm:text-base font-extrabold transition-all duration-200 relative ${
              activeTab === 'admin'
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40'
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            Admin
            {isSimulatedAdminAuthenticated && (
              <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-sm animate-pulse" />
            )}
          </button>
        </nav>

        {/* Quick status label / Active simulation metadata */}
        <div className="flex items-center gap-4">
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar - Fixed at bottom for Android-friendly ergonomics */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-800 bg-slate-950/95 backdrop-blur-md flex justify-around py-2.5 pb-[env(safe-area-inset-bottom,12px)] shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'announcements' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'announcements' ? 'bg-indigo-950/50' : ''}`}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'results' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'results' ? 'bg-indigo-950/50' : ''}`}>
            <Trophy className="h-5 w-5" />
          </div>
          <span>Results</span>
        </button>

        <button
          onClick={() => setActiveTab('competitions')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'competitions' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'competitions' ? 'bg-indigo-950/50' : ''}`}>
            <Calendar className="h-5 w-5" />
          </div>
          <span>Tournament</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'gallery' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'gallery' ? 'bg-indigo-950/50' : ''}`}>
            <Image className="h-5 w-5" />
          </div>
          <span>Gallery</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative transition-transform active:scale-95 ${
            activeTab === 'admin' ? 'text-indigo-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'admin' ? 'bg-indigo-950/50' : ''}`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span>Admin</span>
          {isSimulatedAdminAuthenticated && (
            <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-sm shadow-emerald-500" />
          )}
        </button>
      </div>
    </header>
  );
}
