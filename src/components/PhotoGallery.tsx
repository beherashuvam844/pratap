import React, { useState, useMemo } from 'react';
import { Athlete, PerformanceMetric, Competition } from '../types';
import { normalizeEventName } from '../data/mockData';
import { CardScrollWrapper } from './CardScrollWrapper';
import { playCardSlideSound } from '../utils/soundEffects';
import { compressImage } from '../utils/imageUtils';
import { 
  Search, 
  Filter, 
  Eye, 
  X, 
  Award, 
  User, 
  Calendar, 
  MapPin, 
  Activity, 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Link,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Upload
} from 'lucide-react';

interface PhotoGalleryProps {
  athletes: Athlete[];
  metrics: PerformanceMetric[];
  competitions: Competition[];
  isSimulatedAdmin?: boolean;
  onAddMetric?: (newMetric: PerformanceMetric) => void;
  onDeleteMetric?: (metricId: string) => void;
  onEditMetric?: (updatedMetric: PerformanceMetric) => void;
}

// No photo presets used to encourage authentic local uploads
const PHOTO_PRESETS: { label: string; url: string }[] = [];

const safeConfirm = (message: string): boolean => {
  try {
    return window.confirm(message);
  } catch (error) {
    console.warn("window.confirm blocked in sandboxed iframe, automatically proceeding with action:", error);
    return true; // Auto-confirm when blocked in iframe sandboxes
  }
};

export default function PhotoGallery({ 
  athletes, 
  metrics,
  competitions,
  isSimulatedAdmin = false,
  onAddMetric,
  onDeleteMetric,
  onEditMetric
}: PhotoGalleryProps) {
  const isAdmin = isSimulatedAdmin;

  // Filtering and Searching states
  const [selectedTournament, setSelectedTournament] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive Lightbox State
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    title: string;
    subtitle: string;
    description?: string;
    club?: string;
  } | null>(null);

  const [isZoomed, setIsZoomed] = useState(false);

  // Admin Form States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<PerformanceMetric | null>(null);

  const [formEventType, setFormEventType] = useState('None');
  const [formValue, setFormValue] = useState<number | string>('');
  const [formUnit, setFormUnit] = useState<'s' | 'm' | 'none'>('none');
  const [formDate, setFormDate] = useState('');
  const [formTournamentId, setFormTournamentId] = useState('');
  const [formTournament, setFormTournament] = useState('Pratap Meet');
  const [formVenue, setFormVenue] = useState('Athletics Ground IISER KOLKATA');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  // Local drag-and-drop file states
  const [isDragging, setIsDragging] = useState(false);

  // File reader converter for local storage compatibility with compression
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('File type not supported. Please select an image (PNG, JPG, JPEG).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('The chosen image exceeds 15MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const rawResult = event.target.result as string;
        try {
          const compressed = await compressImage(rawResult, 800, 800, 0.65);
          setFormPhotoUrl(compressed);
        } catch (e) {
          console.warn('Compression error in PhotoGallery:', e);
          setFormPhotoUrl(rawResult);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    if (!isAdmin) return;
    setEditingMetric(null);
    setFormEventType('None');
    setFormValue('');
    setFormUnit('none');
    setFormDate(new Date().toISOString().split('T')[0]);
    
    // Default to the latest tournament if available
    const latestComp = competitions.length > 0 ? competitions[0] : null;
    setFormTournamentId(latestComp?.id || 'general');
    setFormTournament(latestComp?.title || 'Pratap Meet');
    setFormVenue(latestComp?.venue || 'Athletics Ground IISER KOLKATA');
    setFormYear(new Date().getFullYear().toString());
    
    setFormPhotoUrl('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (m: PerformanceMetric) => {
    if (!isAdmin) return;
    setEditingMetric(m);
    setFormEventType(m.eventType);
    setFormValue(m.value);
    setFormUnit(m.unit);
    setFormDate(m.date);
    
    // Try to find the matching competition ID
    const comp = competitions.find(c => c.title === m.tournament);
    setFormTournamentId(comp?.id || 'custom');
    
    setFormTournament(m.tournament);
    setFormVenue(m.venue);
    setFormYear(m.year);
    setFormPhotoUrl(m.photoUrl || '');
    setIsFormModalOpen(true);
  };

  const handleSaveMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formPhotoUrl.trim()) {
      alert('Please select or specify a photo URL address.');
      return;
    }

    let finalPhotoUrl = formPhotoUrl;
    if (formPhotoUrl.startsWith('data:image')) {
      try {
        finalPhotoUrl = await compressImage(formPhotoUrl, 800, 800, 0.65);
      } catch (err) {
        console.warn('Compression failed in handleSaveMetric:', err);
      }
    }

    const metricPayload: PerformanceMetric = {
      id: editingMetric ? editingMetric.id : 'gallery-' + Date.now(),
      athleteId: 'tournament_gallery',
      athleteName: 'Tournament Photo',
      eventType: normalizeEventName(formEventType),
      value: parseFloat(formValue as string) || 0,
      unit: formUnit === 'none' ? '' : formUnit,
      date: formDate || new Date().toISOString().split('T')[0],
      tournament: formTournament || 'Pratap Edition',
      venue: formVenue || 'Athletics Ground IISER KOLKATA',
      year: formYear || new Date().getFullYear().toString(),
      rank: editingMetric ? editingMetric.rank : 1,
      photoUrl: finalPhotoUrl,
      tags: ['gallery_photo']
    };

    if (editingMetric) {
      onEditMetric?.(metricPayload);
    } else {
      onAddMetric?.(metricPayload);
    }

    setIsFormModalOpen(false);
    setEditingMetric(null);
  };

  const handleDeleteAction = (metricId: string) => {
    if (!isAdmin) return;
    if (safeConfirm('Are you sure you want to delete this trial action photo from the gallery?')) {
      onDeleteMetric?.(metricId);
      if (selectedPhoto) {
        setSelectedPhoto(null);
      }
    }
  };

  // Get unique tournaments from explicit gallery photos to filter by
  const uniqueTournaments = useMemo(() => {
    const tourns = new Set<string>();
    metrics.forEach(m => {
      const isExplicitGalleryItem = 
        m.athleteId === 'tournament_gallery' || 
        m.tags?.includes('gallery_photo') || 
        m.isGalleryPhoto === true;

      if (isExplicitGalleryItem && m.photoUrl && m.tournament) {
        tourns.add(m.tournament);
      }
    });
    return Array.from(tourns).sort();
  }, [metrics]);

  // Filtered explicit gallery photos ONLY
  const filteredTrialMetrics = useMemo(() => {
    return metrics.filter((m) => {
      // Must have photoUrl
      if (!m.photoUrl) return false;

      // Must be an explicit gallery photo (no automatic dumping of athlete result photos)
      const isExplicitGalleryItem = 
        m.athleteId === 'tournament_gallery' || 
        m.tags?.includes('gallery_photo') || 
        m.isGalleryPhoto === true;

      if (!isExplicitGalleryItem) return false;

      if (selectedTournament !== 'All' && m.tournament !== selectedTournament) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesEvent = m.eventType.toLowerCase().includes(query);
        const matchesTournament = m.tournament.toLowerCase().includes(query);
        const matchesVenue = m.venue.toLowerCase().includes(query);
        return matchesEvent || matchesTournament || matchesVenue;
      }

      return true;
    });
  }, [metrics, selectedTournament, searchQuery]);

  const handleOpenTrialLightbox = (m: PerformanceMetric) => {
    if (!m.photoUrl) return;

    setSelectedPhoto({
      url: m.photoUrl,
      title: m.eventType.toLowerCase() === 'general' ? m.tournament : `${m.tournament} • ${m.eventType}`,
      subtitle: `${m.tournament} ${m.year ? `(${m.year})` : ''} • Captured on ${m.date}`,
      description: `Tournament snapshot for ${m.eventType} at ${m.venue || 'IISER Kolkata'}.`,
      club: 'Pratap IISER Kolkata Athletics'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-100" id="photo-gallery-root">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5" id="gallery-header-section">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7 text-indigo-500 animate-pulse" />
            Pratap Meet Gallery
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Explore authentic high-resolution snapshots of Pratap Meet moments, action shots, and college meets.
          </p>
        </div>

        {/* Dynamic Admin Control switch */}
        <div className="flex items-center gap-3">
          {isSimulatedAdmin && (
            <div className="flex items-center gap-2 bg-emerald-50 p-1.5 rounded-2xl border border-emerald-100 shadow-3xs">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight pr-1">
                Admin Console Active
              </span>
            </div>
          )}

          {isSimulatedAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl transition duration-150 flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Snapshot
            </button>
          )}
        </div>
      </div>

      {/* Main Filter Toolbar Grid */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs" id="gallery-toolbar">
        {/* Search Input bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search trials by event type, student, or campus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tournament filtering */}
        <div className="flex flex-wrap items-center gap-3" id="gallery-toolbar-filters">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest hidden lg:inline mr-1">
              Select Edition:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedTournament('All')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition cursor-pointer ${
                  selectedTournament === 'All'
                    ? 'bg-indigo-950 text-indigo-400 border-indigo-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                All Moments
              </button>
              {uniqueTournaments.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTournament(t)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg border transition cursor-pointer ${
                    selectedTournament === t
                      ? 'bg-indigo-950 text-indigo-400 border-indigo-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* COMPETITIVE CLUB TRIAL IMAGES GRID */}
      <div className="space-y-6" id="gallery-trials-pane">
        {filteredTrialMetrics.length === 0 && !isAdmin ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-500 space-y-3">
            <span className="text-3xl">🏃‍♂️</span>
            <p className="text-sm font-bold text-slate-300">No high-res trial execution snapshots recorded yet.</p>
            <p className="text-xs text-slate-500">Try re-adjusting filters or search query parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {isAdmin && (
              <div 
                onClick={handleOpenAddModal}
                className="group bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition duration-150 min-h-[280px]"
              >
                <div className="h-12 w-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-indigo-950 group-hover:text-indigo-400 transition border border-slate-700">
                  <Plus className="h-6 w-6" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-700 mt-4 group-hover:text-indigo-650">Add Dynamic Photo</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  Upload an athlete action frame & trials record
                </p>
              </div>
            )}
            
            {filteredTrialMetrics.map((m, idx) => (
              <CardScrollWrapper key={m.id} index={idx}>
                <div
                  onClick={() => handleOpenTrialLightbox(m)}
                  onMouseEnter={playCardSlideSound}
                  className="group bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xs card-lift cursor-pointer flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Photo Frame aspect */}
                    <div className="relative aspect-video overflow-hidden bg-slate-950">
                      <img
                        src={m.photoUrl}
                        alt={m.tournament}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 duration-300 ease-in-out transition-transform"
                      />

                      {/* Overlay view effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                        <span className="bg-white/95 backdrop-blur-xs text-slate-900 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow">
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          View Pratap Action
                        </span>
                      </div>

                      {m.eventType.toLowerCase() !== 'general' && (
                        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                          <span className="bg-indigo-600 text-white text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-md shadow-xs">
                            {m.eventType}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata parameters */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-white group-hover:text-indigo-400 transition truncate">
                          {m.eventType.toLowerCase() === 'general' ? m.tournament : m.eventType}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 line-clamp-2 italic leading-relaxed">
                          Snapshot from {m.tournament} {m.venue ? `(${m.venue})` : ''}.
                        </p>
                      </div>

                      {/* Timing & Location Registry tags */}
                      <div className="border-t border-slate-800 pt-3 mt-3 flex items-center justify-between text-slate-500 text-[10px] font-mono">
                        <span className="flex items-center gap-1 font-bold">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          {m.venue}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {m.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="border-t border-slate-800 bg-slate-950/80 p-3 flex items-center gap-2 rounded-b-2xl">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(m);
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-extrabold py-2 px-3 rounded-xl transition border border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
                        Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAction(m.id);
                        }}
                        className="bg-slate-900 hover:bg-rose-950/30 text-rose-500 hover:text-rose-400 text-xs font-extrabold p-2.5 rounded-xl transition border border-slate-800 flex items-center justify-center cursor-pointer"
                        title="Delete Action Shot"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>
              </CardScrollWrapper>
            ))}
          </div>
        )}
      </div>

      {/* SELECTION DETAIL MODAL / IMMERSION LIGHTBOX */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-24 sm:p-6 overflow-y-auto"
          id="gallery-lightbox-modal"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Main Modal body */}
          <div 
            className="bg-slate-900 rounded-3xl overflow-hidden max-w-4xl w-full border border-slate-800 shadow-2xl relative flex flex-col md:flex-row antialiased animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Preview Frame (Left/Top side) */}
            <div className="relative flex-1 bg-slate-950 aspect-square md:aspect-auto md:max-h-[550px] group/zoom cursor-zoom-in overflow-hidden" onClick={() => setIsZoomed(true)}>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover/zoom:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/zoom:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full">
                  <Plus className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Information Dashboard panel (Right/Bottom side) */}
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between max-h-[550px] overflow-y-auto space-y-6">
              
              {/* Top Close trigger */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight leading-snug">
                    {selectedPhoto.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                    {selectedPhoto.subtitle}
                  </p>
                </div>
                
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1 px-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition duration-150 cursor-pointer text-xs font-bold"
                  title="Close Image Modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Bio and metadata descriptions */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block font-sans">
                    Snapshot Information
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                    {selectedPhoto.description}
                  </p>
                </div>

                {/* Additional parameters like club */}
                {selectedPhoto.club && (
                  <div className="pt-1 text-slate-400 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">Organizing & Verifying Body</span>
                      <span className="font-extrabold text-slate-200">{selectedPhoto.club}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions on close */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                <span>Verified by Athletics Council</span>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="text-indigo-400 hover:underline"
                >
                  Return to Grid
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT FORM MODAL */}
      {isFormModalOpen && (
        <div 
          className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-md flex items-start sm:items-center justify-center p-4 pt-24 sm:p-6 overflow-y-auto"
          id="gallery-admin-form-modal"
        >
          <div 
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full border border-slate-250 shadow-2xl relative flex flex-col antialiased animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-[10px] font-black tracking-wider uppercase text-indigo-400 font-mono block">
                  {editingMetric ? 'UPDATE SNAPSHOT RECORD' : 'CREATE LIVE ATHLETICS SNAPSHOT'}
                </span>
                <h3 className="text-lg font-black text-white leading-tight">
                  {editingMetric ? 'Edit Gallery Photo Details' : 'Add Tournament Moment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 px-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition duration-150 text-xs font-bold"
                title="Close Form Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

                   <form onSubmit={handleSaveMetric} className="p-6 md:p-8 space-y-5 overflow-y-auto max-h-[80vh] text-left bg-slate-900">
              {/* Tournament selector side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Select Meet / Edition</label>
                  <select
                    value={formTournamentId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setFormTournamentId(selectedId);
                      const matching = competitions.find(c => c.id === selectedId);
                      if (matching) {
                        setFormTournament(matching.title);
                        setFormVenue(matching.venue);
                        setFormDate(matching.date);
                      } else {
                        setFormTournament('');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {competitions.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                    <option value="fresher">Fresher's Meet</option>
                    <option value="ganarajyam">Ganarajyam Run</option>
                    <option value="freedom">Freedom Run</option>
                    <option value="interbatch">Interbatch Meet</option>
                    <option value="custom">-- Other Meet --</option>
                  </select>
                </div>

                {formTournamentId === 'custom' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Custom Meet Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pratap Meet 2024"
                      value={formTournament}
                      onChange={(e) => setFormTournament(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Event type & value */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Athletic Discipline (Optional)</label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="None">-- Select Discipline (Optional) --</option>
                    <option value="100 m">100 m Sprint</option>
                    <option value="200 m">200 m Sprint</option>
                    <option value="400 m">400 m</option>
                    <option value="800 m">800 m Run</option>
                    <option value="1500 m">1500 m Run</option>
                    <option value="3000 m">3000 m Run (Long Distance)</option>
                    <option value="5000 m">5000 m Run (Long Distance)</option>
                    <option value="10000 m">10000 m Run (Long Distance)</option>
                    <option value="4×100 m">4×100 m Relay</option>
                    <option value="4×400 m">4×400 m Relay</option>
                    <option value="4×100 m medley relay">4×100 m Medley Relay</option>
                    <option value="Long Jump">Long Jump</option>
                    <option value="High Jump">High Jump</option>
                    <option value="Javelin Throw">Javelin Throw</option>
                    <option value="Shotput Throw">Shotput Throw</option>
                    <option value="Triple Jump">Triple Jump</option>
                    <option value="Discus Throw">Discus Throw</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Mark Value (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 11.23 or 6.45"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Unit Type (Optional)</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as 's' | 'm' | 'none')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="none">-- Select Unit --</option>
                    <option value="s">Seconds (s) - Running</option>
                    <option value="m">Meters (m) - Jump/Throw</option>
                  </select>
                </div>
              </div>

               {/* Tournament & Venue Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Tournament Year</label>
                  <input
                    type="text"
                    required
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Tournament Name</label>
                  <input
                    type="text"
                    required
                    value={formTournament}
                    onChange={(e) => setFormTournament(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Venue / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IISER K Stadium"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Trial Action Photograph Source selector (Local Upload + Presets + Links) */}
              <div className="space-y-3.5 border-t border-b border-slate-800 py-4">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Trial Action Photograph Source</label>
                
                {/* Drag & Drop Local Upload Area */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { 
                    e.preventDefault(); 
                    setIsDragging(false); 
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                  }}
                  onClick={() => document.getElementById('local-gallery-file-input')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2 group ${
                    isDragging 
                      ? 'border-indigo-600 bg-indigo-950/50 scale-[0.98]' 
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <input 
                    type="file"
                    id="local-gallery-file-input"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                    }}
                  />
                  <div className="h-9 w-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center group-hover:bg-indigo-950 group-hover:text-indigo-400 transition">
                    <Upload className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-200 block">Click to upload from local machine</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">or drag and drop your image file here (PNG, JPG, JPEG up to 5MB)</span>
                  </div>
                </div>

                {/* Direct image link block */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block font-mono">Or Insert Custom Photo Web Link URL / Base64</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste static image web URL..."
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
                    />
                    {formPhotoUrl && (
                      <button 
                        type="button"
                        onClick={() => setFormPhotoUrl('')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black px-3 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Realtime Thumbnail Preview bubble */}
                {formPhotoUrl && (
                  <div className="mt-2 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 relative aspect-video max-h-36 mx-auto shadow-sm">
                    <img 
                      src={formPhotoUrl} 
                      alt="Local Upload Preview" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded cursor-default">
                      Active Image Preview
                    </div>
                  </div>
                )}


              </div>

              {/* Form Actions Footer block */}
              <div className="border-t border-slate-800 pt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition duration-150 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-5 py-2.5 rounded-xl transition duration-155 shadow-md shadow-indigo-900/40 cursor-pointer"
                >
                  {editingMetric ? 'Save Changes' : 'Publish Snapshot'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FULL SCREEN ZOOMED OVERLAY */}
      {selectedPhoto && isZoomed && (
        <div 
          className="fixed inset-0 z-[1100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-12 animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 shadow-xl cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-500 ease-out"
              onClick={() => setIsZoomed(false)}
            />
            
            <div className="mt-8 text-center space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">{selectedPhoto.title}</h3>
              <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">{selectedPhoto.subtitle}</p>
            </div>
            
            <button 
              onClick={() => setIsZoomed(false)}
              className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-full transition shadow-lg shadow-indigo-900/40"
            >
              Close Zoom
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
