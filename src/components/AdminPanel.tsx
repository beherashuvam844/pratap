import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import ImageCropperModal from './ImageCropperModal';
import ClubLogo from './ClubLogo';
import { compressImage } from '../utils/imageUtils';
import { Athlete, PerformanceMetric, Competition, Announcement, AdminUser } from '../types';
import { TR_FI_EVENTS, normalizeEventName } from '../data/mockData';
import { 
  UserPlus, 
  PlusCircle, 
  CalendarPlus, 
  Trash2, 
  Plus, 
  Camera,
  X, 
  Check, 
  Edit3, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trophy,
  MessageSquare,
  Users,
  Award,
  Link,
  ShieldCheck,
  Upload,
  Paperclip,
  FileText,
  Search,
  Activity
} from 'lucide-react';

interface AdminPanelProps {
  athletes: Athlete[];
  metrics: PerformanceMetric[];
  competitions: Competition[];
  announcements: Announcement[];
  admins: AdminUser[];
  onAddAthlete: (ath: Athlete) => void;
  onEditAthlete: (ath: Athlete) => void;
  onDeleteAthlete: (id: string) => void;
  onAddMetric: (met: PerformanceMetric) => void;
  onEditMetric: (met: PerformanceMetric) => void;
  onDeleteMetric: (id: string) => void;
  onAddCompetition: (comp: Competition) => void;
  onEditCompetitionStatus: (id: string, status: Competition['status']) => void;
  onDeleteCompetition: (id: string, deleteAssociatedMetrics?: boolean) => void;
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onAddAdmin: (adm: AdminUser) => void;
  onDeleteAdmin: (email: string) => void;
  onUpdateLogo: (logoUrl: string | null) => void;
  onUpdateClubLogo: (logoUrl: string | null) => void;
  onUpdateAthletePhoto?: (athleteId: string, newPhotoUrl: string) => void;
  onClearAllMetrics?: () => void;
  onDeleteMetricsByTournament?: (tournamentName: string) => void;
  appLogo: string | null;
  clubLogo: string | null;
  onResetToDefault: () => void;
}

const safeConfirm = (message: string): boolean => {
  try {
    return window.confirm(message);
  } catch (error) {
    console.warn("window.confirm blocked in sandboxed iframe, automatically proceeding with action:", error);
    return true; // Auto-confirm when blocked in iframe sandboxes
  }
};

export default function AdminPanel({
  athletes,
  metrics,
  competitions,
  announcements,
  admins,
  onAddAthlete,
  onEditAthlete,
  onDeleteAthlete,
  onAddMetric,
  onEditMetric,
  onDeleteMetric,
  onAddCompetition,
  onEditCompetitionStatus,
  onDeleteCompetition,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onAddAdmin,
  onDeleteAdmin,
  onUpdateLogo,
  onUpdateClubLogo,
  onUpdateAthletePhoto,
  onClearAllMetrics,
  onDeleteMetricsByTournament,
  appLogo,
  clubLogo,
  onResetToDefault,
}: AdminPanelProps) {
  // Subtab navigation: metrics | competitions | announcements | admins
  const [subTab, setSubTab] = useState<'metrics' | 'competitions' | 'announcements' | 'admins'>('announcements');

  // Filter & bulk management states for metrics and tournaments
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>('ALL');
  const [confirmingClearLogs, setConfirmingClearLogs] = useState(false);
  const [confirmingClearTournament, setConfirmingClearTournament] = useState(false);
  const [overwriteCsvTournament, setOverwriteCsvTournament] = useState(false);

  // Success Notification
  const [notifyMessage, setNotifyMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  const triggerNotification = (text: string, type: 'success' | 'warn' = 'success') => {
    setNotifyMessage({ text, type });
    setTimeout(() => setNotifyMessage(null), 4000);
  };

  const availableTournaments = useMemo(() => {
    const list = new Set<string>();
    metrics.forEach(m => {
      if (m.tournament?.trim()) list.add(m.tournament.trim());
    });
    competitions.forEach(c => {
      if (c.title?.trim()) list.add(c.title.trim());
    });
    return Array.from(list);
  }, [metrics, competitions]);

  const filteredLedgerMetrics = useMemo(() => {
    if (selectedTournamentFilter === 'ALL') return metrics;
    return metrics.filter(m => (m.tournament || '').trim().toLowerCase() === selectedTournamentFilter.trim().toLowerCase());
  }, [metrics, selectedTournamentFilter]);

  // --- METRIC DATA LOGGING STATE ---
  const [metAthleteName, setMetAthleteName] = useState('');
  const [metAthleteRoll, setMetAthleteRoll] = useState('');
  const [metAthleteBibNumber, setMetAthleteBibNumber] = useState('');
  const [metAthleteGender, setMetAthleteGender] = useState<'Male' | 'Female'>('Male');
  const [metAthleteBatch, setMetAthleteBatch] = useState('MS21');
  const [metAthleteClub, setMetAthleteClub] = useState('IISER Kolkata');
  const [metEventType, setMetEventType] = useState('100 m');
  const [metValue, setMetValue] = useState<string>('');
  const [metDate, setMetDate] = useState(new Date().toISOString().split('T')[0]);
  const [metTournament, setMetTournament] = useState('Pratap Meet');
  const [metVenue, setMetVenue] = useState('Athletics Ground IISER KOLKATA');
  const [metYear, setMetYear] = useState(new Date().getFullYear().toString());
  const [metRank, setMetRank] = useState<string>('1');
  const [metAthletePhoto, setMetAthletePhoto] = useState<string | undefined>(undefined);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const metPhotoInputRef = useRef<HTMLInputElement>(null);
  const [photoEditingType, setPhotoEditingType] = useState<'athlete' | 'action' | 'new-record' | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // --- COMPETITIONS LIST STATE ---
  const [compTitle, setCompTitle] = useState('');
  const [compDate, setCompDate] = useState('');
  const [compTime, setCompTime] = useState('09:00 AM');
  const [compVenue, setCompVenue] = useState('Athletics Ground IISER KOLKATA');
  const [compDesc, setCompDesc] = useState('');
  const [compTier, setCompTier] = useState<'Pratap'>('Pratap');
  const [compEventsSelected, setCompEventsSelected] = useState<string[]>(['100 m', '200 m']);
  const [compRegistrationUrl, setCompRegistrationUrl] = useState('');

  // --- ANNOUNCEMENT BOARD STATE ---
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annImportance, setAnnImportance] = useState<'High' | 'Normal' | 'Info'>('Normal');
  const [annAttachment, setAnnAttachment] = useState<{ name: string; url: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      triggerNotification('File size cannot exceed 5MB.', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      let result = e.target?.result;
      if (typeof result === 'string') {
        // Compress if it's an image
        if (file.type.startsWith('image/')) {
          try {
            result = await compressImage(result);
          } catch (err) {
            console.error("Compression failed:", err);
          }
        }

        // Handle photo editing flows
        if (editingItemId) {
          if (photoEditingType === 'athlete') {
            if (onUpdateAthletePhoto) onUpdateAthletePhoto(editingItemId, result);
          } else if (photoEditingType === 'action') {
            const target = metrics.find(m => m.id === editingItemId);
            if (target) {
              onAddMetric({ ...target, photoUrl: result });
            }
          }
          setEditingItemId(null);
          setPhotoEditingType(null);
          return;
        }

        setAnnAttachment({
          name: file.name,
          url: result,
        });
        triggerNotification(`Attachment '${file.name}' loaded successfully!`);
      }
    };
    reader.onerror = () => {
      triggerNotification('Error reading file.', 'warn');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileLoad(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileLoad(e.target.files[0]);
    }
  };

  // --- ADMIN LISTS STATE ---
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const clubLogoInputRef = useRef<HTMLInputElement>(null);

  // --- NEW CSV SELECTION STATE ---
  const [selectedMetricsFile, setSelectedMetricsFile] = useState<File | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // Flatten events list for convenient logging dropdowns
  const allEventsList = useMemo(() => {
    return Object.values(TR_FI_EVENTS).flat();
  }, []);

  // --- HELPER WRAPPERS FOR ALPHA-NUMERICAL PARSING ---
  const parseMetricValue = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    const cleanStr = val.toString().trim();
    
    // Handle MM:SS.ss format
    if (cleanStr.includes(':')) {
      const parts = cleanStr.split(':');
      if (parts.length === 2) {
        const mins = parseFloat(parts[0]);
        const secs = parseFloat(parts[1]);
        if (!isNaN(mins) && !isNaN(secs)) {
          return parseFloat((mins * 60 + secs).toFixed(3));
        }
      }
    }
    
    // Handles numeric strings or strings with units like "10.5s" or "5.2m"
    // By extracting the number part
    const matches = cleanStr.match(/(\d+\.?\d*)/);
    if (matches && matches[1]) {
      return parseFloat(matches[1]);
    }
    
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseMetricDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const trimmed = dateStr.toString().trim();
    
    // Try native JS parsing first
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) { /* ignore */ }
    
    // Manual YYYY-MM-DD fallback/regex
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    
    return new Date().toISOString().split('T')[0];
  };

  // HANDLER: Performance score submission
  const handleMetricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseMetricValue(metValue);
    
    if (!metAthleteName.trim() || (metValue.trim() === '' && parsedValue === 0)) {
      triggerNotification('Please enter a valid athlete name and metric outcome.', 'warn');
      return;
    }

    // Try to find an existing athlete with this roll/name to keep IDs stable if possible
    let athleteId = `ath-${Date.now()}`;
    const existingAth = athletes.find(a => 
      (metAthleteRoll && a.roll === metAthleteRoll) || 
      (!metAthleteRoll && a.name.toLowerCase() === metAthleteName.toLowerCase())
    );

    if (existingAth) {
      athleteId = existingAth.id;
      // Update photo or bib if provided and not already present
      if ((metAthletePhoto && !existingAth.photoUrl) || (metAthleteBibNumber && !existingAth.bibNumber)) {
        onEditAthlete({ 
          ...existingAth, 
          photoUrl: metAthletePhoto || existingAth.photoUrl,
          bibNumber: metAthleteBibNumber || existingAth.bibNumber 
        });
      }
    } else {
      // Create a virtual athlete profile if not exists
      const newAth: Athlete = {
        id: athleteId,
        name: metAthleteName,
        roll: metAthleteRoll,
        bibNumber: metAthleteBibNumber,
        gender: metAthleteGender,
        club: metAthleteClub,
        avatarColor: 'bg-indigo-500',
        photoUrl: metAthletePhoto
      };
      onAddAthlete(newAth);
    }

    const runningEvents = ['100 m', '200 m', '400 m', '800 m', '1500 m', '3000 m', '5000 m', '10000 m', '4×100 m', '4×400 m', '4×100 m medley relay'].map(t => t.toLowerCase());
    
    const normalizedEvent = normalizeEventName(metEventType);
    const unit: 's' | 'm' = runningEvents.includes(normalizedEvent.toLowerCase()) ? 's' : 'm';

    const newMetric: PerformanceMetric = {
      id: `m-${Date.now()}`,
      athleteId: athleteId,
      athleteName: metAthleteName,
      bibNumber: metAthleteBibNumber || existingAth?.bibNumber || '',
      roll: metAthleteRoll || existingAth?.roll || '',
      college: metAthleteClub || existingAth?.club || '',
      gender: metAthleteGender || existingAth?.gender || 'Male',
      eventType: normalizedEvent,
      value: parsedValue,
      displayValue: metValue,
      unit: unit,
      date: parseMetricDate(metDate),
      tournament: metTournament || 'Local Open Trial Tournament',
      venue: metVenue || 'Athletics Ground IISER KOLKATA',
      year: metYear || new Date().getFullYear().toString(),
      rank: metRank ? (parseInt(metRank) || 1) : 1,
      tags: []
    };

    onAddMetric(newMetric);

    triggerNotification(`Logged result of ${metValue} for ${metAthleteName}.`);

    setMetValue('');
    setMetRank('1');
    setMetAthletePhoto(undefined);
    // Optionally reset athlete fields or keep them for next entry
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItemId) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageToCrop(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // HANDLER: Competition scheduled
  const handleCompetitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compDate) {
      triggerNotification('Complete tournament date to publish.', 'warn');
      return;
    }

    const newComp: Competition = {
      id: `meet-${Date.now()}`,
      title: compTier, // Automatically use tier as title
      date: compDate,
      time: compTime,
      description: compDesc || `${compTier} standard athletic event trials.`,
      events: compEventsSelected,
      status: 'Upcoming',
      registeredAthleteIds: [],
      tier: compTier,
      registrationUrl: compRegistrationUrl.trim() || undefined
    };

    onAddCompetition(newComp);
    triggerNotification(`New ${compTier} tournament scheduled successfully!`);

    setCompTitle('');
    setCompDate('');
    setCompVenue('Athletics Ground IISER KOLKATA');
    setCompDesc('');
    setCompRegistrationUrl('');
    setCompEventsSelected(['100 m', '200 m']);
  };

  const toggleEventSelection = (evt: string) => {
    if (compEventsSelected.includes(evt)) {
      if (compEventsSelected.length > 1) {
        setCompEventsSelected(compEventsSelected.filter(e => e !== evt));
      } else {
        triggerNotification('Must select at least 1 contested field event.', 'warn');
      }
    } else {
      setCompEventsSelected([...compEventsSelected, evt]);
    }
  };

  // HANDLER: Announcement posting
  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      triggerNotification('Please write a valid title and circular content.', 'warn');
      return;
    }

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: annTitle,
      date: new Date().toISOString().split('T')[0],
      content: annContent,
      importance: annImportance,
      attachmentName: annAttachment?.name,
      attachmentUrl: annAttachment?.url
    };

    onAddAnnouncement(newAnn);
    triggerNotification('Circular announcement published live!');

    setAnnTitle('');
    setAnnContent('');
    setAnnAttachment(null);
  };

  // HANDLER: Admin management addition
  const handleAdminSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     const parsedEmail = newAdminEmail.trim().toLowerCase();
     if (!parsedEmail) {
       triggerNotification('Please enter a valid Admin ID or email.', 'warn');
       return;
     }

     const newAdm: AdminUser = {
       email: parsedEmail,
       name: newAdminName.trim() || 'Co-Administrator',
       password: newAdminPassword.trim() || undefined,
       addedDate: new Date().toISOString().split('T')[0]
     };

     onAddAdmin(newAdm);
     triggerNotification(`Added administrative write access for ${parsedEmail}`);

     setNewAdminEmail('');
     setNewAdminName('');
     setNewAdminPassword('');
   };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        let logoData = reader.result;
        try {
          logoData = await compressImage(logoData, 400, 400, 0.6); // Smaller logo
        } catch (err) {
          console.error("Logo compression failed:", err);
        }
        onUpdateLogo(logoData);
        triggerNotification('Custom application logo uploaded and applied!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClubLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        let logoData = reader.result;
        try {
          logoData = await compressImage(logoData, 400, 400, 0.6); // Smaller logo
        } catch (err) {
          console.error("Club logo compression failed:", err);
        }
        onUpdateClubLogo(logoData);
        triggerNotification('Custom club logo uploaded and applied!');
      }
    };
    reader.readAsDataURL(file);
  };

  // --- CSV BULK UPLOAD HANDLER ---
  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedMetricsFile(file);
  };

  const handleCropComplete = (croppedUrl: string) => {
    if (photoEditingType === 'athlete' && editingItemId) {
      const athlete = athletes.find(a => a.id === editingItemId);
      if (athlete) {
        onEditAthlete({ ...athlete, photoUrl: croppedUrl });
        triggerNotification(`Athlete ${athlete.name} profile photo updated!`);
      }
    } else if (photoEditingType === 'action' && editingItemId) {
      const metric = metrics.find(m => m.id === editingItemId);
      if (metric) {
        onEditMetric({ ...metric, photoUrl: croppedUrl });
        triggerNotification(`Action photo for ${metric.athleteName} updated!`);
      }
    } else if (photoEditingType === 'new-record') {
      setMetAthletePhoto(croppedUrl);
      triggerNotification('Photo cropped and attached to new record!');
    }

    // Reset crop state
    setImageToCrop(null);
    setPhotoEditingType(null);
    setEditingItemId(null);
    if (editPhotoInputRef.current) editPhotoInputRef.current.value = '';
    if (metPhotoInputRef.current) metPhotoInputRef.current.value = '';
  };

  const processUnifiedCSV = () => {
    if (!selectedMetricsFile) return;
    setIsProcessingCsv(true);

    Papa.parse(selectedMetricsFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        let metricCount = 0;
        let athleteCount = 0;
        let errors = 0;
        const addedAthletesThisSession: Athlete[] = [];

        // Header mapping helper with flexible search
        const getVal = (row: any, keys: string[]) => {
          const foundKey = Object.keys(row).find(k => 
            keys.some(search => k.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === search.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );
          return foundKey ? row[foundKey] : undefined;
        };

        // If overwrite option is selected, purge existing metrics for tournament(s) present in the CSV file
        if (overwriteCsvTournament && onDeleteMetricsByTournament) {
          const tournamentsInCsv = new Set<string>();
          data.forEach(row => {
            const tName = getVal(row, ['tournament', 'competition', 'meet']) || metTournament || 'Pratap Tournament';
            if (tName) tournamentsInCsv.add(tName.trim());
          });
          tournamentsInCsv.forEach(tName => {
            onDeleteMetricsByTournament(tName);
          });
        }

        data.forEach((row, index) => {
          const rawRank = getVal(row, ['rank', 'position', 'pos', 'standing']);
          const bibInput = getVal(row, ['bibnumber', 'bib', 'bibno', 'bib number', 'bib_number']);
          const nameInput = getVal(row, ['name', 'athletename', 'athlete', 'fullname', 'full name']);
          const idInput = getVal(row, ['id', 'roll', 'rollnumber', 'roll number', 'studentid', 'student id']);
          const collegeInput = getVal(row, ['college', 'club', 'institution', 'university', 'team']);
          const rawGender = getVal(row, ['gender', 'sex']);
          const scoreInput = getVal(row, ['score', 'record', 'mark', 'value', 'time', 'distance', 'result']);
          
          const eventType = getVal(row, ['event', 'eventtype', 'type', 'discipline']) || metEventType || '100 m';
          const tournament = getVal(row, ['tournament', 'competition', 'meet']) || metTournament || 'Pratap Tournament';
          const venue = getVal(row, ['venue', 'location']) || metVenue || 'Athletics Ground IISER KOLKATA';
          const year = getVal(row, ['year']) || metYear || new Date().getFullYear().toString();
          const rawDate = getVal(row, ['date', 'day']);

          if (!nameInput && !scoreInput) return;

          const rank = rawRank ? parseInt(rawRank) : undefined;
          const value = parseMetricValue(scoreInput || '');
          const date = parseMetricDate(rawDate || '');
          const gender: 'Male' | 'Female' = (rawGender && rawGender.toLowerCase().startsWith('f')) ? 'Female' : 'Male';

          // Robust lookup for existing athlete by ID/Roll or BibNumber or Name
          let athlete = [...athletes, ...addedAthletesThisSession].find(a => 
            (idInput && (a.roll || '').toUpperCase() === idInput.toUpperCase()) ||
            (bibInput && (a.bibNumber || '').toUpperCase() === bibInput.toUpperCase()) ||
            (nameInput && a.name.toLowerCase() === nameInput.toLowerCase())
          );

          // AUTO-CREATE ATHLETE IF NOT FOUND
          if (!athlete && nameInput) {
            const newAth: Athlete = {
              id: `ath-${Date.now()}-${index}`,
              name: nameInput,
              roll: idInput || '',
              bibNumber: bibInput || '',
              gender: gender,
              club: collegeInput || 'IISER Kolkata',
              avatarColor: `bg-indigo-500`,
            };
            onAddAthlete(newAth);
            addedAthletesThisSession.push(newAth);
            athlete = newAth;
            athleteCount++;
          }

          if (athlete && (!isNaN(value) || scoreInput)) {
            const runningEvents = ['100 m', '200 m', '400 m', '800 m', '1500 m', '3000 m', '5000 m', '10000 m', '4×100 m', '4×400 m', '4×100 m medley relay'].map(t => t.toLowerCase());
            
            const normalizedEventType = normalizeEventName(eventType);
            const unit: 's' | 'm' = runningEvents.includes(normalizedEventType.toLowerCase()) ? 's' : 'm';
            
            const newMetric: PerformanceMetric = {
              id: `m-bulk-${Date.now()}-${index}`,
              athleteId: athlete.id,
              athleteName: athlete.name,
              bibNumber: bibInput || athlete.bibNumber || '',
              roll: idInput || athlete.roll || '',
              college: collegeInput || athlete.club || '',
              gender: gender || athlete.gender || 'Male',
              eventType: normalizedEventType,
              value: !isNaN(value) ? value : 0,
              displayValue: scoreInput || (value ? `${value}${unit}` : ''),
              unit,
              date,
              tournament: tournament || 'Pratap Edition',
              venue: venue || 'Athletics Ground IISER KOLKATA',
              year: year || new Date().getFullYear().toString(),
              rank: rank && !isNaN(rank) ? rank : (index + 1),
            };
            onAddMetric(newMetric);
            metricCount++;
          } else {
            errors++;
          }
        });

        if (metricCount > 0 || athleteCount > 0) {
          triggerNotification(`Import complete: ${athleteCount} new athletes registered and ${metricCount} performance marks logged!${errors > 0 ? ` (${errors} rows skipped)` : ''}`);
        } else if (errors > 0) {
          triggerNotification(`Import failed. Please check CSV headers format: RANK,BIBNUMBER,NAME,ID,COLLEGE,GENDER,SCORE`, 'warn');
        }

        setSelectedMetricsFile(null);
        setIsProcessingCsv(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      },
      error: (error) => {
        triggerNotification(`CSV Parsing Error: ${error.message}`, 'warn');
        setIsProcessingCsv(false);
      }
    });
  };

  const downloadUnifiedTemplate = () => {
    const headers = ['RANK', 'BIBNUMBER', 'NAME', 'ID', 'COLLEGE', 'GENDER', 'SCORE', 'EVENT', 'TOURNAMENT', 'YEAR'];
    const row1 = ['1', '101', 'Siddharth Chatterjee', '22MS001', 'IISER Kolkata', 'Male', '10.50s', '100 m', 'Pratap Championship 2026', '2026'];
    const row2 = ['2', '102', 'Sarah Jenkins', '21MS042', 'IISER Pune', 'Female', '12.10s', '100 m', 'Pratap Championship 2026', '2026'];
    const csvContent = [headers, row1, row2].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "RANK_BIBNUMBER_NAME_ID_COLLEGE_GENDER_SCORE_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMetricsCSV = () => {
    if (metrics.length === 0) {
      triggerNotification('No metric records available to export.', 'warn');
      return;
    }

    const exportData = metrics.map((m, idx) => {
      const athlete = athletes.find(a => a.id === m.athleteId);
      return {
        'RANK': m.rank || (idx + 1),
        'BIBNUMBER': m.bibNumber || athlete?.bibNumber || '',
        'NAME': m.athleteName,
        'ID': m.roll || athlete?.roll || '',
        'COLLEGE': m.college || athlete?.club || '',
        'GENDER': m.gender || athlete?.gender || '',
        'SCORE': m.displayValue || m.value,
        'EVENT': m.eventType,
        'TOURNAMENT': m.tournament || '',
        'YEAR': m.year || '',
        'DATE': m.date || ''
      };
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `athletics_results_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification('Metrics database exported in requested CSV format!');
  };
 
  return (
    <div id="admin-panel" className="space-y-6 animate-fade-in bg-slate-900 rounded-3xl border border-slate-800 p-6 md:p-8">
      
      {/* Title Header without Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            Administrative Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">Add home announcements, manage student athlete logs, tournament schedules, and administrative accounts.</p>
        </div>
      </div>

      {/* Admin subTabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-slate-800">
        {[
          { id: 'announcements', label: 'Circulars', icon: MessageSquare },
          { id: 'metrics', label: 'Metrics', icon: PlusCircle },
          { id: 'competitions', label: 'Tournaments', icon: CalendarPlus },
          { id: 'admins', label: 'Admins', icon: ShieldCheck, count: admins.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              subTab === tab.id
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${subTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Global Inline Notify message */}
      <AnimatePresence mode="wait">
        {notifyMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: 100 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 60) setNotifyMessage(null);
            }}
            className={`rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between border cursor-grab active:cursor-grabbing touch-none ${
              notifyMessage.type === 'success' 
                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' 
                : 'bg-amber-950/20 text-amber-400 border-amber-900/30'
            }`}
          >
            <span>{notifyMessage.text}</span>
            <button onClick={() => setNotifyMessage(null)}>
              <X className="h-3.5 w-3.5 font-bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* SUBTAB 1: POST ANNOUNCEMENTS */}
      {subTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
            <h3 className="font-extrabold text-sm text-white">Publish News circular</h3>
            
            <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Circular Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Selection trial dates"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-semibold text-white placeholder:text-slate-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Importance</label>
                  <select
                    value={annImportance}
                    onChange={(e) => setAnnImportance(e.target.value as any)}
                    className="w-full bg-slate-900/50 border border-slate-800 text-sm px-3 py-2.5 rounded-xl font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Info">Info</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Details about timings, venue, etc..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-800 text-sm p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 leading-relaxed font-medium text-slate-300 placeholder:text-slate-600 transition-all"
                />
              </div>

              {/* Drag and Drop File Upload Component */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Circular Attachment file</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-950/20'
                      : annAttachment
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-900'
                  }`}
                >
                  <input
                    type="file"
                    id="ann-file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  />
                  <div className="block space-y-2">
                    {annAttachment ? (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <FileText className="h-8 w-8 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-400 truncate max-w-[180px] block">{annAttachment.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAnnAttachment(null);
                          }}
                          className="text-[10px] font-black text-rose-500 hover:underline pt-0.5"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="ann-file-upload" className="cursor-pointer block space-y-1">
                        <Upload className="h-6 w-6 text-slate-600 mx-auto" />
                        <p className="text-[11px] font-black text-slate-300">
                          Drag & drop file here, or <span className="text-indigo-400 underline hover:text-indigo-500">browse</span>
                        </p>
                        <p className="text-[9px] font-bold text-slate-500">PDF, Word, Excel, images up to 3MB</p>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer bg-indigo-600"
              >
                Publish Announcement
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-2">Active Announcements Bulletin</h3>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {announcements.map(ann => (
                <div key={ann.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-1.5 text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 font-mono">{ann.date}</span>
                    </div>
                    <h4 className="font-extrabold text-white text-sm leading-tight">{ann.title}</h4>
                    <p className="text-xs text-slate-400 leading-normal line-clamp-2">{ann.content}</p>
                    {ann.attachmentName && (
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] font-bold text-slate-500 w-fit mt-1.5 shadow-xs">
                        <Paperclip className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[180px] text-slate-400">{ann.attachmentName}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (safeConfirm('Are you sure you want to delete this announcement circular?')) {
                        onDeleteAnnouncement(ann.id);
                        triggerNotification('Cleaned announcement from the active bulletin board.');
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition hover:bg-rose-950/30 rounded"
                    title="Delete Announcement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: RECORD SCORES & METRICS */}
      {subTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Upload className="h-4 w-4 text-emerald-500" />
                  Unified Batch Import
                </h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={downloadUnifiedTemplate}
                    className="text-[10px] font-bold text-indigo-400 hover:underline"
                  >
                    Template
                  </button>
                  <span className="h-3 w-px bg-slate-800" />
                  <button 
                    onClick={handleExportMetricsCSV}
                    className="group/export text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    Export All
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Registers new athletes and logs trial results in one step. Use the template for correct headers.
              </p>

              <div className="relative group">
                <input
                  type="file"
                  accept=".csv"
                  ref={csvInputRef}
                  onChange={handleCSVSelect}
                  className="hidden"
                />
                <div 
                  className="w-full border-2 border-dashed border-slate-800 group-hover:border-indigo-600 bg-slate-900 group-hover:bg-indigo-950/20 rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center">
                    <FileText className={`h-5 w-5 ${selectedMetricsFile ? 'text-emerald-500' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-200 block group-hover:text-indigo-400">
                      {selectedMetricsFile ? selectedMetricsFile.name : 'Select Import CSV'}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                      Click to browse or drag & drop
                    </p>
                  </div>

                  {selectedMetricsFile && (
                    <div className="mt-3 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-amber-400 bg-amber-950/30 p-2 rounded-xl border border-amber-900/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overwriteCsvTournament}
                          onChange={(e) => setOverwriteCsvTournament(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                        />
                        <span>Delete existing metrics for tournament(s) in CSV before import</span>
                      </label>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          processUnifiedCSV();
                        }}
                        disabled={isProcessingCsv}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        {isProcessingCsv ? (
                          <>
                            <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Confirm & Import CSV
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-indigo-400" />
                Record Trial Performance
              </h3>
              
              <form onSubmit={handleMetricSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <PlusCircle className="h-4 w-4 text-indigo-400" />
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Athlete Details</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-900/30 p-4 rounded-3xl border border-slate-800/50">
                    <div className="relative group">
                      <div className={`h-16 w-16 rounded-2xl border-2 border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden shadow-xl transition-all ${metAthletePhoto ? 'border-indigo-500' : 'hover:border-slate-700'}`}>
                        {metAthletePhoto ? (
                          <img src={metAthletePhoto} className="h-full w-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Camera className="h-5 w-5 text-slate-600" />
                            <span className="text-[7px] font-black uppercase text-slate-600">No Photo</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => metPhotoInputRef.current?.click()}
                        className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer"
                      >
                        <Camera className="h-6 w-6 text-white mb-1" />
                        <span className="text-[8px] font-black uppercase text-white">Upload</span>
                      </button>
                      <input 
                        type="file"
                        ref={metPhotoInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPhotoEditingType('new-record');
                            const reader = new FileReader();
                            reader.onload = (re) => {
                              if (typeof re.target?.result === 'string') {
                                setImageToCrop(re.target.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Profile Picture</p>
                      <p className="text-[9px] font-bold text-slate-600 leading-tight">Optionally upload a photo for this athlete. It will be saved to their profile.</p>
                      {metAthletePhoto && (
                        <button 
                          type="button"
                          onClick={() => setMetAthletePhoto(undefined)}
                          className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">BIB Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 101"
                      value={metAthleteBibNumber}
                      onChange={(e) => setMetAthleteBibNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold font-mono text-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={metAthleteName}
                      onChange={(e) => setMetAthleteName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">ID / Roll</label>
                    <input
                      type="text"
                      placeholder="e.g. 21MS001"
                      value={metAthleteRoll}
                      onChange={(e) => setMetAthleteRoll(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Gender</label>
                    <select
                      value={metAthleteGender}
                      onChange={(e) => setMetAthleteGender(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-2 py-1.5 rounded-xl font-bold text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">College/Club</label>
                    <input
                      type="text"
                      value={metAthleteClub}
                      onChange={(e) => setMetAthleteClub(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-800/50 my-2" />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <Activity className="h-4 w-4 text-indigo-400" />
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Performance Record</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Select Event</label>
                    <select
                      value={metEventType}
                      onChange={(e) => setMetEventType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-xl font-bold text-white"
                    >
                      {allEventsList.map(evt => (
                        <option key={evt} value={evt}>{evt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Result Mark
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10.45, 1:23"
                      value={metValue}
                      onChange={(e) => setMetValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold font-mono text-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tournament Year</label>
                  <input
                    type="text"
                    required
                    value={metYear}
                    onChange={(e) => setMetYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold font-mono text-indigo-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rank *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={metRank}
                    onChange={(e) => setMetRank(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold font-mono text-amber-400 placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tournament / Edition</label>
                <input
                  type="text"
                  required
                  value={metTournament}
                  onChange={(e) => setMetTournament(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-semibold text-white truncate"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-indigo-950/20"
              >
                Log Trial Score
              </button>
            </form>
          </div>
        </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-white">Historic Metric Ledger</h3>
                <select
                  value={selectedTournamentFilter}
                  onChange={(e) => setSelectedTournamentFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 font-bold text-[10px] px-2 py-1 rounded-lg outline-none max-w-[170px] truncate"
                >
                  <option value="ALL">All Tournaments ({metrics.length})</option>
                  {availableTournaments.map(t => {
                    const count = metrics.filter(m => (m.tournament || '').trim().toLowerCase() === t.toLowerCase()).length;
                    return (
                      <option key={t} value={t}>{t} ({count})</option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedTournamentFilter !== 'ALL' && (
                  confirmingClearTournament ? (
                    <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/50 p-1 rounded-lg">
                      <span className="text-[10px] font-bold text-rose-300">Delete '{selectedTournamentFilter}' metrics?</span>
                      <button
                        onClick={() => {
                          if (onDeleteMetricsByTournament) {
                            onDeleteMetricsByTournament(selectedTournamentFilter);
                            triggerNotification(`Purged metrics for '${selectedTournamentFilter}'.`, 'warn');
                          }
                          setConfirmingClearTournament(false);
                        }}
                        className="text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded transition cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingClearTournament(false)}
                        className="text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingClearTournament(true)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-950/20 px-2.5 py-1 rounded-lg transition-all border border-amber-900/20 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Tournament Metrics
                    </button>
                  )
                )}

                {confirmingClearLogs ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-400">Purge ALL logs?</span>
                    <button 
                      onClick={() => {
                        if (onClearAllMetrics) {
                          onClearAllMetrics();
                        } else {
                          metrics.forEach(m => onDeleteMetric(m.id));
                        }
                        setConfirmingClearLogs(false);
                        triggerNotification('Performance ledger purged completely.', 'warn');
                      }}
                      className="text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 px-2.5 py-1 rounded-lg transition-all shadow-md shadow-rose-950/40 animate-pulse cursor-pointer"
                    >
                      Yes, Delete All
                    </button>
                    <button
                      onClick={() => setConfirmingClearLogs(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setConfirmingClearLogs(true)}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 bg-rose-950/20 px-2 py-1 rounded-lg transition-all border border-rose-900/10 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All Logs
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-3">Rank</th>
                    <th className="p-3">Bib #</th>
                    <th className="p-3">Athlete (Name & ID)</th>
                    <th className="p-3">College</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">Event</th>
                    <th className="p-3">Score</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-semibold text-slate-400">
                  {filteredLedgerMetrics.map((met, idx) => {
                    const athlete = athletes.find(a => a.id === met.athleteId);
                    const rankVal = met.rank || (idx + 1);
                    const bibVal = met.bibNumber || athlete?.bibNumber || '-';
                    const rollVal = met.roll || athlete?.roll || '-';
                    const collegeVal = met.college || athlete?.club || '-';
                    const genderVal = met.gender || athlete?.gender || '-';
                    const scoreVal = met.displayValue || `${met.value.toFixed(2)}${met.unit}`;

                    return (
                      <tr key={met.id} className="hover:bg-slate-900/50 transition group">
                        <td className="p-3 font-mono font-black text-amber-400">
                          #{rankVal}
                        </td>
                        <td className="p-3 font-mono text-slate-300 font-bold">
                          {bibVal}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative group/avatar cursor-pointer">
                              <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group-hover:border-indigo-500 transition-all shadow-md">
                                {athlete?.photoUrl ? (
                                  <img 
                                    src={athlete.photoUrl} 
                                    className="h-full w-full object-cover"
                                    alt={met.athleteName}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-xs font-black text-white ${athlete?.avatarColor || 'bg-slate-800'}`}>
                                    {met.athleteName.split(' ').map(n => n[0]).join('')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-200 text-xs">{met.athleteName}</span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{rollVal}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 font-bold">{collegeVal}</td>
                        <td className="p-3 text-slate-400">{genderVal}</td>
                        <td className="p-3 text-slate-300 font-bold">{met.eventType}</td>
                        <td className="p-3 text-indigo-400 font-mono font-black text-sm">
                          {scoreVal} 
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              onDeleteMetric(met.id);
                              triggerNotification('Removed score value log.');
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                            title="Delete metric entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hidden input for editing photos in ledger */}
          <input
            type="file"
            accept="image/*"
            ref={editPhotoInputRef}
            onChange={handleEditPhotoUpload}
            className="hidden"
          />

        </div>
      )}


      {/* SUBTAB 4: MANAGE PRATAP & GENERAL COMPETITIONS */}
      {subTab === 'competitions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
            <h3 className="font-extrabold text-sm text-white">Schedule New Tournament</h3>
            
            <form onSubmit={handleCompetitionSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Tournament Tier</label>
                <div className="w-full bg-slate-900 border border-slate-800 text-[10px] px-2.5 py-1.5 rounded-xl font-black text-indigo-400 uppercase tracking-widest">
                  Pratap Tier
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Schedule Date</label>
                  <input
                    type="date"
                    required
                    value={compDate}
                    onChange={(e) => setCompDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-xl font-mono text-slate-300 font-bold shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Start hour</label>
                  <input
                    type="text"
                    required
                    value={compTime}
                    onChange={(e) => setCompTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-1.5 rounded-xl font-bold text-white shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Short summary</label>
                <textarea
                  placeholder="Gold medal finals with house points scoring metrics..."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 text-xs p-2 rounded-xl font-semibold leading-normal text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Registry Entry Link (Registration URL)</label>
                <input
                  type="url"
                  placeholder="https://forms.gle/..."
                  value={compRegistrationUrl}
                  onChange={(e) => setCompRegistrationUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl font-bold text-indigo-400 shadow-sm"
                />
              </div>

              {/* Contested Events list checkboxes restored */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Disciplines Checklist</label>
                <div className="grid grid-cols-3 gap-1 outline-none max-h-24 overflow-y-auto border border-slate-800 p-2 rounded-xl bg-slate-900">
                  {allEventsList.map(evt => {
                    const isSelected = compEventsSelected.includes(evt);
                    return (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => toggleEventSelection(evt)}
                        className={`text-[9px] font-black py-1 px-1.5 border rounded-lg text-center cursor-pointer transition ${
                          isSelected ? 'bg-indigo-950 text-indigo-400 border-indigo-500/30 shadow-xs' : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {evt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-indigo-950/20"
              >
                Schedule Tournament
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-2">Active Tournament Schedules</h3>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {competitions.map(comp => (
                <div key={comp.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${
                        comp.tier === 'Pratap' ? 'bg-amber-950/20 text-amber-500 border-amber-900/30' : 
                        'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {comp.tier} Section
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">{comp.date} ({comp.time})</span>
                    </div>
                    <h4 className="font-extrabold text-white text-sm leading-tight">{comp.title}</h4>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold">Status:</span>
                      <select
                        value={comp.status}
                        onChange={(e) => {
                          onEditCompetitionStatus(comp.id, e.target.value as any);
                          triggerNotification(`Status of "${comp.title}" altered.`);
                        }}
                        className="bg-slate-900 border border-slate-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded outline-none text-slate-300"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => {
                        onDeleteCompetition(comp.id, false);
                        triggerNotification(`Deleted schedule for "${comp.title}".`);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/30 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="Delete tournament schedule only"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete Schedule
                    </button>
                    <button
                      onClick={() => {
                        onDeleteCompetition(comp.id, true);
                        triggerNotification(`Deleted tournament "${comp.title}" and associated metrics.`);
                      }}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="Delete tournament schedule and all its metrics"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete & Clear Metrics
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}


      {/* SUBTAB 4: ATHLETE ROSTER MANAGEMENT */}
      {subTab === 'athletes' && (
        <div className="space-y-8 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-950/50 p-8 rounded-[40px] border border-slate-800/50 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white tracking-tighter">Athlete Hub</h3>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Manage profiles and identity photos</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                <input 
                  type="text"
                  placeholder="Search athletes by name or roll..."
                  className="bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-white w-full sm:w-80 shadow-inner focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  onChange={(e) => {
                    // Logic for search query if needed (can use local state)
                  }}
                />
              </div>
              <button 
                onClick={() => {
                  if (safeConfirm('Purging the athlete database will delete all individual profiles. Continue?')) {
                    // This would need a bulk delete athlete call if available
                  }
                }}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Clear Database
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {athletes.map(ath => (
              <div 
                key={ath.id}
                className="group relative bg-slate-950 border border-slate-800 rounded-[40px] p-8 pt-20 flex flex-col items-center text-center shadow-2xl hover:border-indigo-500/50 transition-all duration-500"
              >
                <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                   <button 
                     onClick={() => {
                       setEditingItemId(ath.id);
                       setPhotoEditingType('athlete');
                       editPhotoInputRef.current?.click();
                     }}
                     className="relative h-32 w-32 rounded-[32px] bg-slate-900 border-[6px] border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ring-8 ring-slate-800/20 group-hover:ring-indigo-600/30 transition-all duration-500 group-hover:scale-105"
                   >
                     {ath.photoUrl ? (
                       <img src={ath.photoUrl} className="h-full w-full object-cover" alt="" referrerPolicy="no-referrer" />
                     ) : (
                       <div className={`w-full h-full flex items-center justify-center text-4xl font-black text-white ${ath.avatarColor}`}>
                         {ath.name.split(' ').map(n => n[0]).join('')}
                       </div>
                     )}
                     <div className="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300">
                       <Camera className="h-8 w-8 text-white mb-2 animate-bounce" />
                       <span className="text-[10px] font-black uppercase text-white tracking-widest">Change Photo</span>
                     </div>
                   </button>
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-2xl font-black text-white leading-tight tracking-tight">{ath.name}</h4>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {ath.roll && (
                      <span className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20 uppercase tracking-[0.1em]">
                        ID: {ath.roll}
                      </span>
                    )}
                    {ath.bibNumber && (
                      <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 uppercase">
                        BIB: #{ath.bibNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-8 w-full grid grid-cols-2 gap-3">
                   <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-800/30">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Gender</p>
                     <p className="text-sm font-bold text-slate-200">{ath.gender}</p>
                   </div>
                   <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-800/30">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Club</p>
                     <p className="text-sm font-bold text-slate-200 truncate">{ath.club || 'IISER K'}</p>
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-900 w-full flex justify-around items-center">
                  <button 
                    onClick={() => {
                        // Edit functionality
                    }}
                    className="text-[11px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" /> Edit
                  </button>
                  <div className="h-4 w-px bg-slate-900" />
                  <button 
                    className="text-[11px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: MANAGE ADMINISTRATORS */}
      {subTab === 'admins' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Add admin form */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit space-y-4">
            <h3 className="font-extrabold text-sm text-white">Authorize Administrator</h3>
            <p className="text-[11px] text-slate-500 leading-normal">Authorize additional administrator accounts or email handles to manage the portal.</p>
            
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Admin Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Anil Kumar"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-white shadow-sm"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Authorized Admin ID / Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sportscomm@iiserkol.ac.in or admin2"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono text-white shadow-sm"
                />
                <span className="text-[9px] text-slate-600 italic mt-1 block leading-tight">Admin email handle or user identifier for authorized access.</span>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Create Admin Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Enter login password for new admin"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono text-white shadow-sm"
                />
                <span className="text-[9px] text-slate-600 italic mt-1 block leading-tight">Set a password for this admin to log in via Admin ID & Password.</span>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-md shadow-indigo-950/20"
              >
                Add Member Admin
              </button>
            </form>

            <div className="pt-6 mt-4 border-t border-slate-800">
              <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-2 flex items-center gap-2 mb-6">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Dual Brand Identity
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Meet Logo Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-2 shadow-sm overflow-hidden shrink-0">
                      <ClubLogo className="h-full w-full" logoUrl={appLogo} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meet Logo</p>
                      <div className="flex items-center gap-2">
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           ref={logoInputRef}
                           onChange={handleLogoUpload}
                         />
                         <button 
                           onClick={() => logoInputRef.current?.click()}
                           className="text-[10px] font-black text-indigo-400 hover:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-900/30 shadow-xs transition-all active:scale-95"
                         >
                           Change Meet Logo
                         </button>
                         {appLogo && (
                           <button 
                             onClick={() => onUpdateLogo(null)}
                             className="text-[10px] font-bold text-slate-500 hover:text-rose-400 px-2 py-1.5"
                           >
                             Reset
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Club Logo Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center p-2 shadow-sm overflow-hidden shrink-0">
                      <ClubLogo className="h-full w-full" logoUrl={clubLogo} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Club Logo</p>
                      <div className="flex items-center gap-2">
                         <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           ref={clubLogoInputRef}
                           onChange={handleClubLogoUpload}
                         />
                         <button 
                           onClick={() => clubLogoInputRef.current?.click()}
                           className="text-[10px] font-black text-amber-400 hover:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-900/30 shadow-xs transition-all active:scale-95"
                         >
                           Change Club Logo
                         </button>
                         {clubLogo && (
                           <button 
                             onClick={() => onUpdateClubLogo(null)}
                             className="text-[10px] font-bold text-slate-500 hover:text-rose-400 px-2 py-1.5"
                           >
                             Reset
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-4 mt-6 border border-slate-800/50">
                <p className="text-[9px] text-slate-500 leading-normal italic flex items-start gap-2">
                   <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                   Both logos appear globally in the header and About section. We recommend using transparent PNGs for the best visual pairing across the interface.
                </p>
              </div>
            </div>
          </div>

          {/* Active Admins Registry List Table */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-extrabold text-sm text-white border-b border-slate-800 pb-2">Active Authorized Administrators</h3>
            
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="p-3">Council Name</th>
                    <th className="p-3">Admin ID / Email</th>
                    <th className="p-3">Password</th>
                    <th className="p-3">Authorized Date</th>
                    <th className="p-3 text-right">Privilege Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-semibold text-slate-400">
                  {admins.map(adm => {
                    const isSelfEvaluation = adm.email === 'beherashuvam844@gmail.com';
                    return (
                      <tr key={adm.email} className="hover:bg-slate-900/30">
                        <td className="p-3 font-bold text-slate-200">{adm.name}</td>
                        <td className="p-3 font-mono text-slate-500">{adm.email}</td>
                        <td className="p-3 font-mono text-xs">
                          {adm.password ? (
                            <span className="text-[10px] text-amber-400 bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-900/30 font-bold">
                              {adm.password}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Not set</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{adm.addedDate}</td>
                        <td className="p-3 text-right">
                          {isSelfEvaluation ? (
                            <span className="text-[10px] text-teal-400 bg-teal-950/20 px-2 py-0.5 rounded border border-teal-900/30 font-black">OFFICE BEARER</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-bold">OFFICE BEARER</span>
                              <button
                                onClick={() => {
                                  if (safeConfirm(`Revoke administrative write privileges for ${adm.name} (${adm.email})?`)) {
                                    onDeleteAdmin(adm.email);
                                    triggerNotification(`Privilege authorization revoked.`);
                                  }
                                }}
                                className="p-1 text-slate-600 hover:text-rose-400 rounded transition"
                                title="Revoke Admin Privileges"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* PHOTO CROP INTERFACE */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setImageToCrop(null);
            setPhotoEditingType(null);
            setEditingItemId(null);
            if (editPhotoInputRef.current) editPhotoInputRef.current.value = '';
            if (metPhotoInputRef.current) metPhotoInputRef.current.value = '';
          }}
        />
      )}

    </div>
  );
}
