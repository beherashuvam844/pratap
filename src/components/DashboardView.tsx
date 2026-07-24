import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Athlete, PerformanceMetric, Competition } from '../types';
import ImageCropperModal from './ImageCropperModal';
import { normalizeEventName } from '../data/mockData';
import { CardScrollWrapper } from './CardScrollWrapper';
import { playCardSlideSound } from '../utils/soundEffects';
import { 
  Search, 
  Filter, 
  Trophy, 
  Award, 
  Trash2, 
  X,
  Medal,
  Crown,
  UserCheck,
  Camera,
  Check
} from 'lucide-react';

interface DashboardProps {
  athletes: Athlete[];
  fullAthletes?: Athlete[];
  metrics: PerformanceMetric[];
  competitions: Competition[];
  parentSelectedEvent?: string;
  setParentSelectedEvent?: (event: string) => void;
  onUpdateAthletePhoto?: (athleteId: string, newPhotoUrl: string) => void;
  onUpdateAthlete?: (updatedAthlete: Athlete) => void;
  onAddMetric?: (newMetric: PerformanceMetric) => void;
  onEditMetric?: (met: PerformanceMetric) => void;
  onDeleteMetric?: (id: string) => void;
  isAdmin?: boolean;
}

export default function DashboardView({ 
  athletes, 
  fullAthletes,
  metrics, 
  competitions,
  parentSelectedEvent,
  setParentSelectedEvent,
  onUpdateAthletePhoto,
  onUpdateAthlete,
  onEditMetric,
  onDeleteMetric,
  isAdmin
}: DashboardProps) {
  const [localSelectedEvent, setLocalSelectedEvent] = useState<string>('all');
  const selectedEvent = parentSelectedEvent !== undefined ? parentSelectedEvent : localSelectedEvent;
  const setSelectedEvent = setParentSelectedEvent !== undefined ? setParentSelectedEvent : setLocalSelectedEvent;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Male' | 'Female'>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');

  // Photo editing state for admin
  const [photoEditingTarget, setPhotoEditingTarget] = useState<{
    athleteId: string;
    metricId: string;
    athleteName: string;
  } | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerPhotoEdit = (athleteId: string, metricId: string, athleteName: string) => {
    setPhotoEditingTarget({ athleteId, metricId, athleteName });
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.click();
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageToCrop(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedUrl: string) => {
    if (!photoEditingTarget) return;
    const { athleteId, metricId, athleteName } = photoEditingTarget;

    const allAthletes = fullAthletes || athletes;
    const targetAthlete = allAthletes.find(a => 
      a.id === athleteId || 
      a.name.toLowerCase().trim() === athleteName.toLowerCase().trim()
    );

    // 1. Call onUpdateAthletePhoto if provided and athlete ID exists
    const effectiveAthId = targetAthlete?.id || athleteId;
    if (effectiveAthId && onUpdateAthletePhoto) {
      onUpdateAthletePhoto(effectiveAthId, croppedUrl);
    }

    // 2. Call onUpdateAthlete if target athlete object exists
    if (targetAthlete && onUpdateAthlete) {
      onUpdateAthlete({ ...targetAthlete, photoUrl: croppedUrl });
    }

    // 3. Call onEditMetric to attach picture to metric records
    if (onEditMetric) {
      const matchingMetrics = metrics.filter(m => 
        m.athleteId === athleteId || 
        m.id === metricId || 
        m.athleteName.toLowerCase().trim() === athleteName.toLowerCase().trim()
      );
      matchingMetrics.forEach(m => {
        onEditMetric({ ...m, photoUrl: croppedUrl });
      });
    }

    setNotifyMsg(`Profile photo updated for ${athleteName}!`);
    setTimeout(() => setNotifyMsg(null), 4000);

    setImageToCrop(null);
    setPhotoEditingTarget(null);
  };

  // Format metric value for humans
  const formatValue = (val: number, type: string) => {
    if (val === 0) return '---';
    
    const lowerType = type.toLowerCase();
    const midLongDistance = ['1500 m', '800 m', '3000 m', '5000 m', '10000 m', '4×400 m', '4×100 m medley relay'].map(t => t.toLowerCase());
    
    if (midLongDistance.includes(lowerType)) {
      const minutes = Math.floor(val / 60);
      const seconds = (val % 60).toFixed(2);
      return `${minutes}:${parseFloat(seconds) < 10 ? '0' : ''}${seconds}`;
    }
    const sprintEvents = ['100 m', '200 m', '400 m', '800 m', '1500 m', '3000 m', '5000 m', '10000 m', '110m hurdles', '4×100 m', '4×400 m', '4×100 m medley relay'].map(t => t.toLowerCase());
    const isRunning = sprintEvents.includes(lowerType);
    return `${val.toFixed(2)}${isRunning ? 's' : 'm'}`;
  };

  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set(metrics.map(m => m.year))).sort((a, b) => b.localeCompare(a));
    return ['All', ...years];
  }, [metrics]);

  // Filter and rank metrics for the result list
  const filteredAndRankedResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const poolOfAthletes = fullAthletes || athletes;
    
    // 1. Filter metrics based on selected filters
    const filtered = metrics.filter(m => {
      const normMetricEvent = normalizeEventName(m.eventType).toLowerCase();
      const normSelectedEvent = normalizeEventName(selectedEvent).toLowerCase();
      const matchesEvent = selectedEvent === 'all' || 
                           normMetricEvent === normSelectedEvent ||
                           m.eventType.toLowerCase() === selectedEvent.toLowerCase();

      const matchesYear = selectedYear === 'All' || m.year === selectedYear;
      
      const ath = poolOfAthletes.find(a => 
        a.id === m.athleteId ||
        (m.roll && a.roll && a.roll.trim().toUpperCase() === m.roll.trim().toUpperCase()) ||
        (m.athleteName && a.name.trim().toLowerCase() === m.athleteName.trim().toLowerCase())
      );
      const athGender = m.gender || ath?.gender || 'Male';
      const normAthGender = athGender.toLowerCase().startsWith('f') ? 'Female' : 'Male';
      const matchesGender = selectedGender === 'All' || (normAthGender === selectedGender);
      
      const bib = m.bibNumber || ath?.bibNumber || '';
      const roll = m.roll || ath?.roll || '';
      const college = m.college || ath?.club || '';
      const score = m.displayValue || m.value.toString();

      const matchesSearch = query === '' || 
                           m.athleteName.toLowerCase().includes(query) || 
                           m.eventType.toLowerCase().includes(query) ||
                           m.tournament.toLowerCase().includes(query) ||
                           bib.toLowerCase().includes(query) ||
                           roll.toLowerCase().includes(query) ||
                           college.toLowerCase().includes(query) ||
                           score.toLowerCase().includes(query);
      
      return matchesEvent && matchesYear && matchesGender && matchesSearch;
    });

    // 2. Group metrics by Event + Year so that each event tournament has its own sorted ranking
    const groups: Record<string, PerformanceMetric[]> = {};
    filtered.forEach(m => {
      const normalizedEv = normalizeEventName(m.eventType);
      const key = `${normalizedEv}|${m.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    // 3. Sort each group's metrics by rank or score
    return Object.entries(groups).map(([key, groupMetrics]) => {
      const [eventType, year] = key.split('|');
      
      const sprintEvents = ['100 m', '200 m', '400 m', '800 m', '1500 m', '3000 m', '5000 m', '10000 m', '110m hurdles', '4×100 m', '4×400 m', '4×100 m medley relay'].map(t => t.toLowerCase());
      const isRunning = sprintEvents.includes(eventType.toLowerCase());
      
      const sortedByPerformance = [...groupMetrics].sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return isRunning ? a.value - b.value : b.value - a.value;
      });

      return {
        id: key,
        eventType,
        year,
        metrics: sortedByPerformance,
        tournament: sortedByPerformance[0]?.tournament || 'Athletics Meet'
      };
    }).sort((a, b) => {
      if (b.year !== a.year) return b.year.localeCompare(a.year);
      return a.eventType.localeCompare(b.eventType);
    });
  }, [metrics, selectedEvent, selectedYear, searchQuery, selectedGender, athletes, fullAthletes]);

  // Total result count
  const totalResultsCount = useMemo(() => {
    return filteredAndRankedResults.reduce((acc, g) => acc + g.metrics.length, 0);
  }, [filteredAndRankedResults]);

  const poolOfAthletes = fullAthletes || athletes;

  return (
    <div id="dashboard-view" className="space-y-6 animate-fade-in text-left">
      {/* Hidden File Input for Admin Photo Edit */}
      <input 
        type="file" 
        ref={photoInputRef}
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setImageToCrop(null);
            setPhotoEditingTarget(null);
          }}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {notifyMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400/30"
          >
            <Check className="h-4 w-4" />
            <span>{notifyMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <section id="results-directory" className="space-y-6">
        
        {/* Header & Filter Controls */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h3 className="text-2xl font-black text-white tracking-tight">Meet Results & Leaderboard</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">Official performance records with ranking breakdown</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 text-xs font-black px-3 py-1.5 rounded-xl font-mono">
                {totalResultsCount} Record{totalResultsCount === 1 ? '' : 's'} Listed
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Event Dropdown Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Filter by Event</label>
              <div className="relative">
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition appearance-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-950 text-indigo-400 font-black">All Track & Field Events</option>
                  <optgroup label="Sprints" className="bg-slate-950 text-slate-500 font-bold">
                    <option value="100 m">100 m</option>
                    <option value="200 m">200 m</option>
                    <option value="400 m">400 m</option>
                  </optgroup>
                  <optgroup label="Relays" className="bg-slate-950 text-slate-500 font-bold">
                    <option value="4×100 m">4×100 m</option>
                    <option value="4×400 m">4×400 m</option>
                    <option value="4×100 m medley relay">4×100 m medley relay</option>
                  </optgroup>
                  <optgroup label="Middle Distance" className="bg-slate-950 text-slate-500 font-bold">
                    <option value="800 m">800 m</option>
                    <option value="1500 m">1500 m</option>
                  </optgroup>
                  <optgroup label="Long Distance" className="bg-slate-950 text-slate-500 font-bold">
                    <option value="3000 m">3000 m</option>
                    <option value="5000 m">5000 m</option>
                    <option value="10000 m">10000 m</option>
                  </optgroup>
                  <optgroup label="Jumps" className="bg-slate-950 text-slate-500 font-bold">
                    <option value="Long Jump">Long Jump</option>
                    <option value="High Jump">High Jump</option>
                    <option value="Triple Jump">Triple Jump</option>
                  </optgroup>
                  <optgroup label="Throws" className="bg-slate-950 text-slate-500 font-bold">
                    <option value="Shotput Throw">Shotput Throw</option>
                    <option value="Discus Throw">Discus Throw</option>
                    <option value="Javelin Throw">Javelin Throw</option>
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Search Athletes / Events</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Athlete name, BIB, Roll ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Gender Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Gender</label>
              <div className="flex bg-slate-900 rounded-xl border border-slate-800 p-1 h-[42px]">
                {['All', 'Male', 'Female'].map((genderChoice) => (
                  <button
                    key={genderChoice}
                    onClick={() => setSelectedGender(genderChoice as any)}
                    className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                      selectedGender === genderChoice
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {genderChoice}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Tournament Year</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer"
                >
                  {uniqueYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>

        {/* Results List Layout */}
        <AnimatePresence mode="wait">
          {filteredAndRankedResults.length === 0 ? (
            <motion.div 
              key="no-results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-slate-800 bg-slate-950 py-16 text-center shadow-inner space-y-3"
            >
              <div className="bg-slate-900 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border border-slate-800">
                <Award className="h-6 w-6 text-slate-600" />
              </div>
              <p className="text-sm font-extrabold text-slate-400">No event metrics match your current filter</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGender('All');
                  setSelectedYear('All');
                  setSelectedEvent('all');
                }} 
                className="text-xs font-black text-indigo-400 hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {filteredAndRankedResults.map((group, idx) => (
                <div 
                  key={group.id}
                  className={`bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl card-lift-sm animate-fade-slide-up stagger-${(idx % 5) + 1}`}
                >
                  {/* Event Section Header */}
                  <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white uppercase tracking-tight">{group.eventType}</h4>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.tournament}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                        {group.year}
                      </span>
                    </div>
                  </div>

                  {/* Profile Cards Container */}
                  <div className="p-4 sm:p-5 space-y-4 bg-slate-950/60">
                    {group.metrics.map((met, metIdx) => {
                      const displayRank = met.rank;
                      const athlete = poolOfAthletes.find(a => 
                        a.id === met.athleteId ||
                        (met.roll && a.roll && a.roll.trim().toUpperCase() === met.roll.trim().toUpperCase()) ||
                        (met.athleteName && a.name.trim().toLowerCase() === met.athleteName.trim().toLowerCase())
                      );
                      const photoUrl = athlete?.photoUrl || met.photoUrl;
                      const bibNumber = met.bibNumber || athlete?.bibNumber;
                      const rollId = met.roll || athlete?.roll;
                      const college = met.college || athlete?.club || 'IISER Kolkata';
                      const rawGender = met.gender || athlete?.gender || 'Male';
                      const gender = rawGender.toLowerCase().startsWith('f') ? 'Female' : 'Male';
                      const scoreStr = met.displayValue || formatValue(met.value, met.eventType);

                      return (
                        <CardScrollWrapper key={met.id} index={metIdx}>
                          <div 
                            onMouseEnter={playCardSlideSound}
                            className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-5 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-300 card-lift-sm group relative overflow-hidden backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
                          >
                          {/* Background Glow Overlay */}
                          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500 pointer-events-none" />

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0 z-10">
                            
                            {/* ATHLETE PHOTO CARD WITH DYNAMIC RING & RANK BADGE */}
                            <div className="relative shrink-0">
                              <div className="relative group/photo h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl border-2 border-slate-800 bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center shadow-xl shadow-slate-950/80 ring-2 ring-indigo-500/20 group-hover:ring-indigo-400 group-hover:scale-105 transition-all duration-300">
                                {photoUrl ? (
                                  <img 
                                    src={photoUrl} 
                                    alt={met.athleteName} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-xl sm:text-2xl font-black text-white ${athlete?.avatarColor || 'bg-gradient-to-br from-indigo-600 via-slate-800 to-slate-950'}`}>
                                    {met.athleteName.split(' ').map(n => n[0]).join('')}
                                  </div>
                                )}

                                {/* Hover Edit Overlay for Admins */}
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerPhotoEdit(athlete?.id || met.athleteId, met.id, met.athleteName);
                                    }}
                                    className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-amber-400 font-black text-[10px] uppercase tracking-wider cursor-pointer backdrop-blur-xs"
                                    title="Edit Athlete Picture"
                                  >
                                    <Camera className="h-5 w-5 text-amber-400" />
                                    <span>Edit Photo</span>
                                  </button>
                                )}
                              </div>

                              {/* RANK BADGE OVERLAY */}
                              <div className={`
                                absolute -top-2 -left-2 px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-xl flex items-center gap-1 border transition-transform group-hover:scale-110
                                ${displayRank === 1 ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-amber-200 shadow-amber-500/40' : 
                                  displayRank === 2 ? 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-950 border-white shadow-slate-400/40' : 
                                  displayRank === 3 ? 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white border-amber-500/60 shadow-amber-900/50' : 
                                  'bg-slate-950/90 text-slate-300 border-slate-700'}
                              `}>
                                {displayRank === 1 && <Crown className="h-3.5 w-3.5 text-slate-950 fill-slate-950 animate-bounce" />}
                                {displayRank === 2 && <Trophy className="h-3 w-3 text-slate-950" />}
                                {displayRank === 3 && <Medal className="h-3 w-3 text-amber-200" />}
                                <span>#{displayRank}</span>
                              </div>
                            </div>

                            {/* ATHLETE DETAILS */}
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-black text-white text-base sm:text-xl tracking-tight group-hover:text-indigo-300 transition-colors">
                                  {met.athleteName}
                                </h5>

                                {/* Gender Badge */}
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border shadow-2xs ${
                                  gender === 'Female' ? 'bg-pink-500/10 text-pink-400 border-pink-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                }`}>
                                  {gender}
                                </span>
                              </div>

                              {/* BADGES ROW */}
                              <div className="flex flex-wrap items-center gap-2">
                                {bibNumber && (
                                  <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                                    BIB: #{bibNumber}
                                  </span>
                                )}

                                {rollId && (
                                  <span className="text-xs font-mono font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs">
                                    ID: {rollId}
                                  </span>
                                )}

                                {/* Admin explicit edit photo button */}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleTriggerPhotoEdit(athlete?.id || met.athleteId, met.id, met.athleteName)}
                                    className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 px-2.5 py-1 rounded-xl transition cursor-pointer shadow-2xs"
                                    title="Edit Athlete Picture"
                                  >
                                    <Camera className="h-3.5 w-3.5" />
                                    <span>Update Photo</span>
                                  </button>
                                )}
                              </div>

                              {/* COLLEGE / CLUB INFO */}
                              <div className="text-xs sm:text-sm font-bold text-slate-400 flex items-center gap-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span>College / Club: <strong className="text-slate-200 font-extrabold">{college}</strong></span>
                              </div>
                            </div>

                          </div>

                          {/* SCORE & RECORD DISPLAY BOX */}
                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80 z-10">
                            <div className="bg-slate-950/90 border border-slate-800 group-hover:border-indigo-500/40 px-5 py-3 rounded-2xl text-left md:text-right shadow-inner transition-colors">
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Official Mark / Score</span>
                              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-400 group-hover:text-amber-400 transition-colors tracking-tight">
                                {scoreStr}
                              </span>
                            </div>

                            {isAdmin && onDeleteMetric && (
                              <button
                                onClick={() => onDeleteMetric(met.id)}
                                className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-2xl transition border border-transparent hover:border-rose-900/40 cursor-pointer"
                                title="Delete metric record"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            )}
                          </div>

                        </div>
                      </CardScrollWrapper>
                    );
                  })}
                </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>

      </section>
    </div>
  );
}
