import React, { useState, useMemo } from 'react';
import { Competition, Athlete } from '../types';
import { Calendar, MapPin, Users, Plus, Check, Clock, AlertCircle, FileText, Sparkles, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompetitionSchedulerProps {
  competitions: Competition[];
  athletes: Athlete[];
  onRegisterAthlete: (competitionId: string, athleteId: string) => void;
}

export default function CompetitionScheduler({
  competitions,
  athletes,
  onRegisterAthlete,
}: CompetitionSchedulerProps) {
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Completed' | 'Cancelled'>('All');

  const [selectedCompId, setSelectedCompId] = useState<string | null>(competitions[0]?.id || null);
  const [selectedAthleteToRegister, setSelectedAthleteToRegister] = useState<string>('');
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Filter competitions list by status
  const filteredComps = useMemo(() => {
    let result = competitions;
    if (filter !== 'All') {
      result = result.filter(c => c.status === filter);
    }
    return result;
  }, [competitions, filter]);

  // Selected competition detailed info
  const selectedComp = useMemo(() => {
    // Fallback if current selectedCompId is not in filtered list
    if (selectedCompId && filteredComps.some(c => c.id === selectedCompId)) {
      return competitions.find(c => c.id === selectedCompId) || null;
    }
    return filteredComps[0] || null;
  }, [competitions, selectedCompId, filteredComps]);

  // List of athletes registered for the selected competition
  const registeredAthletesList = useMemo(() => {
    if (!selectedComp) return [];
    return athletes.filter(a => selectedComp.registeredAthleteIds.includes(a.id));
  }, [athletes, selectedComp]);

  // Athletes not yet registered for the selected competition
  const eligibleAthletesToRegister = useMemo(() => {
    if (!selectedComp) return [];
    return athletes.filter(a => !selectedComp.registeredAthleteIds.includes(a.id));
  }, [athletes, selectedComp]);

  // Handle local registration submit
  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp || !selectedAthleteToRegister) return;

    const athName = athletes.find(a => a.id === selectedAthleteToRegister)?.name || 'Athlete';
    
    onRegisterAthlete(selectedComp.id, selectedAthleteToRegister);
    setSelectedAthleteToRegister('');
    
    // Show success message
    setRegSuccessMessage(`Successfully enrolled ${athName}!`);
    setTimeout(() => {
      setRegSuccessMessage(null);
    }, 4000);
  };

  return (
    <div id="scheduler-view" className="space-y-6 animate-fade-in text-left">
      
      {/* Title with Tier Separation Filter Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
            <Calendar className="h-5.5 w-5.5 text-[#D62828]" />
            Tournament Scheduling Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enlist for separate schedules corresponding to <span className="font-bold text-[#D62828]">Pratap Athletics meets</span>.
          </p>
        </div>

        {/* Tier Partition Buttons Removed */}
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Competitions Left Sidebar List */}
        <div id="comps-sidebar" className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Schedules Listed ({filteredComps.length})</h4>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-[10px] font-bold py-1 px-2 rounded-lg outline-none text-[#1F2937]"
            >
              <option value="All">All Statuses</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {filteredComps.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-500">
              <Calendar className="h-8 w-8 stroke-1 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-bold leading-dense">No tournaments matches search</p>
              <p className="text-[10px] text-slate-500 mt-1">Alter tier or status tags above.</p>
            </div>
          ) : (
            filteredComps.map((comp) => {
              const isSelected = selectedComp && comp.id === selectedComp.id;
              const dateObj = new Date(comp.date);
              
              return (
                <motion.div
                  key={comp.id}
                  id={`competition-card-${comp.id}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCompId(comp.id);
                    setRegSuccessMessage(null);
                  }}
                  className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-[#D62828] bg-red-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {/* Status Indicator Pulse */}
                  {(comp.status === 'Upcoming' || comp.status === 'Ongoing') && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          comp.status === 'Upcoming' ? 'bg-[#D62828]' : 'bg-emerald-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          comp.status === 'Upcoming' ? 'bg-[#D62828]' : 'bg-emerald-500'
                        }`}></span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-block shrink-0 rounded-xl text-center px-2 py-1.5 font-black text-xs transition-colors duration-300 ${
                      isSelected ? 'bg-[#D62828] text-white shadow-inner' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                    }`}>
                      <div className="leading-none text-[8px] uppercase tracking-wider font-mono">
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-sm font-black mt-0.5">
                        {dateObj.getDate()}
                      </div>
                    </span>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black tracking-wide border border-slate-200 bg-slate-100 rounded px-1.5 py-0.2 uppercase text-slate-600 transition-colors">
                          {comp.tier} Part
                        </span>
                      </div>
                      <h3 className="font-extrabold text-[#1F2937] text-xs sm:text-sm group-hover:text-[#D62828] transition-colors leading-snug mt-1.5 truncate">
                        {comp.title}
                      </h3>
                      
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400 group-hover:text-[#D62828]" />
                        <span className="truncate group-hover:text-slate-700 transition-colors">{comp.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100">
                    <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded border transition-colors ${
                      comp.status === 'Upcoming' ? 'bg-red-50 text-[#D62828] border-red-200' :
                      comp.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {comp.status}
                    </span>

                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-400" />
                      {comp.registeredAthleteIds?.length || 0} enrolled
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Selected Competition details panel */}
        <div className="lg:col-span-2">
          {selectedComp ? (
            <div id="comp-details-panel" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase py-0.5 px-2 bg-red-50 border border-red-200 rounded text-[#D62828]">
                    <Sparkles className="h-2.5 w-2.5" /> Scheduled {selectedComp.tier} Part
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Tournament ID: {selectedComp.id}</span>
                </div>

                <h2 className="text-lg font-black text-[#1F2937] mt-2.5 text-left">{selectedComp.title}</h2>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed text-left">{selectedComp.description}</p>
              </div>

              {/* Date / Location Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex gap-3 items-center text-left">
                  <Calendar className="h-5 w-5 text-[#D62828]" />
                  <div>
                    <h4 className="text-[9px] uppercase tracking-widest font-black text-slate-500">Date & Timing</h4>
                    <p className="text-xs font-black text-[#1F2937] mt-1">
                      {new Date(selectedComp.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{selectedComp.time}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex gap-3 items-center text-left">
                  <MapPin className="h-5 w-5 text-[#D62828]" />
                  <div>
                    <h4 className="text-[9px] uppercase tracking-widest font-black text-slate-500">Stadium Arena</h4>
                    <p className="text-xs font-black text-[#1F2937] mt-1">{selectedComp.venue}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">IISER Kolkata Campus Ground</p>
                  </div>
                </div>
              </div>

              {/* Contested Disciplines */}
              <div className="space-y-2 text-left">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Contested Disciplines
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedComp.events.map((evt) => (
                    <span
                      key={evt}
                      className="rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-extrabold px-3 py-1 text-slate-700"
                    >
                      {evt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action columns: Enrolled list vs addition form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-left">
                
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enrolled Competitors ({registeredAthletesList.length})</h4>
                  
                  {registeredAthletesList.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center text-slate-500">
                      <p className="text-xs font-extrabold text-slate-600">No student signed up yet.</p>
                      <p className="text-[10px] text-slate-500 mt-1">Select an athlete and tap enrollment sign-up.</p>
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                      {registeredAthletesList.map((ath) => (
                        <div
                          key={ath.id}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-700 bg-slate-50 shadow-xs"
                        >
                          <img 
                            src={ath.photoUrl || 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=150'} 
                            alt={ath.name}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-[#1F2937] truncate">{ath.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Signing tool */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-[#1F2937] uppercase">Interactive Sign Up Tool</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Enlist eligible IISER campus athletes instantly.</p>
                  </div>

                  {selectedComp.status === 'Completed' || selectedComp.status === 'Cancelled' ? (
                    <div className="flex items-start gap-2 text-[10px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <AlertCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                      <p>Athlete configurations are locked because this tournament has status: {selectedComp.status}.</p>
                    </div>
                  ) : eligibleAthletesToRegister.length === 0 ? (
                    <div className="flex items-start gap-2 text-[10.5px] text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-extrabold">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                      <p>All active athletes are registered to play in this tournament!</p>
                    </div>
                  ) : (
                    <form onSubmit={handleRegistrationSubmit} className="space-y-3.5">
                      <div className="space-y-1">
                        <label htmlFor="reg-athlete-select" className="text-[9px] font-black text-slate-500 uppercase">Choose Competitor</label>
                        <select
                          id="reg-athlete-select"
                          value={selectedAthleteToRegister}
                          onChange={(e) => setSelectedAthleteToRegister(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#D62828]/20"
                        >
                          <option value="">-- Choose Athlete --</option>
                          {eligibleAthletesToRegister.map((ath) => (
                            <option key={ath.id} value={ath.id}>
                              {ath.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {regSuccessMessage && (
                        <div className="text-[10.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-1.5 animate-fade-in text-center">
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>{regSuccessMessage}</span>
                        </div>
                      )}

                      <button
                        id="submit-register-athlete-btn"
                        type="submit"
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-[#D62828] hover:bg-red-700 text-white font-black text-xs py-2 shadow-md transition cursor-pointer"
                      >
                        <Plus className="h-4 w-4" /> Enroll Athlete
                      </button>
                    </form>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white py-24 text-center text-slate-500">
              <Calendar className="h-10 w-10 stroke-1 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-bold">Select a tournament to see schedule cards</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
