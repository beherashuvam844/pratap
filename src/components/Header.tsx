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
    <header id="app-header" className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-20 sm:h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand - Athletic Red and Gold branding */}
        <div id="header-brand" className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('announcements')}>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-[#D62828] flex items-center justify-center text-white font-black text-xl shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
            P
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#1F2937] leading-none group-hover:text-[#D62828] transition-colors">
              Pratap
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-[#F4C430] uppercase tracking-wider mt-0.5 drop-shadow-xs bg-[#1F2937] px-2 py-0.5 rounded-md inline-block">
              IISER Kolkata
            </p>
          </div>
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
              className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm sm:text-base font-extrabold transition-all duration-200 card-lift-sm cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#D62828] text-white shadow-md shadow-red-600/20'
                  : 'text-slate-600 hover:text-[#D62828] hover:bg-red-50'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}

          <div className="w-px h-8 bg-slate-200 mx-2" />

          <button
            id="nav-tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm sm:text-base font-extrabold transition-all duration-200 card-lift-sm cursor-pointer relative ${
              activeTab === 'admin'
                ? 'bg-[#2563EB] text-white shadow-lg shadow-blue-600/20'
                : 'text-[#2563EB] hover:text-blue-700 hover:bg-blue-50'
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            Admin
            {isSimulatedAdminAuthenticated && (
              <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-pulse" />
            )}
          </button>
        </nav>

        {/* Quick status label / Active simulation metadata */}
        <div className="flex items-center gap-4">
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar - Fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 backdrop-blur-md flex justify-around py-2.5 pb-[env(safe-area-inset-bottom,12px)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'announcements' ? 'text-[#D62828]' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'announcements' ? 'bg-red-50' : ''}`}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'results' ? 'text-[#D62828]' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'results' ? 'bg-red-50' : ''}`}>
            <Trophy className="h-5 w-5" />
          </div>
          <span>Results</span>
        </button>

        <button
          onClick={() => setActiveTab('competitions')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'competitions' ? 'text-[#D62828]' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'competitions' ? 'bg-red-50' : ''}`}>
            <Calendar className="h-5 w-5" />
          </div>
          <span>Tournament</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-transform active:scale-95 ${
            activeTab === 'gallery' ? 'text-[#D62828]' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'gallery' ? 'bg-red-50' : ''}`}>
            <Image className="h-5 w-5" />
          </div>
          <span>Gallery</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold relative transition-transform active:scale-95 ${
            activeTab === 'admin' ? 'text-[#2563EB]' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'admin' ? 'bg-blue-50' : ''}`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span>Admin</span>
          {isSimulatedAdminAuthenticated && (
            <span className="absolute top-1 right-2.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white shadow-xs shadow-emerald-500" />
          )}
        </button>
      </div>
    </header>
  );
}
