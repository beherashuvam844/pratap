import { Athlete, PerformanceMetric, Competition, Announcement, AdminUser } from '../types';

export const TR_FI_EVENTS = {
  Sprints: ['100 m', '200 m', '400 m'],
  'Middle Distance': ['800 m', '1500 m'],
  'Long Distance': ['3000 m', '5000 m', '10000 m'],
  Relays: ['4×100 m', '4×400 m', '4×100 m medley relay'],
  Jumps: ['Long Jump', 'High Jump', 'Triple Jump'],
  Throws: ['Shotput Throw', 'Discus Throw', 'Javelin Throw'],
};

// Rich default athletes with high-quality athletic photos and Best Player configurations
export const INITIAL_ATHLETES: Athlete[] = [
  {
    id: 'ath-1',
    name: 'Siddharth Chatterjee',
    roll: '22MS001',
    bibNumber: '101',
    gender: 'Male',
    club: 'IISER Kolkata',
    avatarColor: 'bg-emerald-500',
    photoUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ath-2',
    name: 'Sarah Jenkins',
    roll: '21MS042',
    bibNumber: '102',
    gender: 'Female',
    club: 'IISER Pune',
    avatarColor: 'bg-amber-500',
    photoUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ath-3',
    name: 'David Kim',
    roll: '24MS115',
    bibNumber: '103',
    gender: 'Male',
    club: 'IISER Mohali',
    avatarColor: 'bg-blue-500',
    photoUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ath-4',
    name: 'Elena Rostova',
    roll: '23MS089',
    bibNumber: '104',
    gender: 'Female',
    club: 'IIT Bombay',
    avatarColor: 'bg-indigo-500',
    photoUrl: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&q=80&w=400'
  }
];

export const INITIAL_METRICS: PerformanceMetric[] = [
  {
    id: 'm-1',
    athleteId: 'ath-1',
    athleteName: 'Siddharth Chatterjee',
    bibNumber: '101',
    roll: '22MS001',
    college: 'IISER Kolkata',
    gender: 'Male',
    eventType: '100 m',
    value: 10.65,
    displayValue: '10.65s',
    unit: 's',
    date: '2026-01-15',
    tournament: 'IISER Kolkata Trials',
    venue: 'Athletics Ground IISER KOLKATA',
    year: '2026',
    rank: 1,
    photoUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=300',
  },
  {
    id: 'm-3',
    athleteId: 'ath-1',
    athleteName: 'Siddharth Chatterjee',
    bibNumber: '101',
    roll: '22MS001',
    college: 'IISER Kolkata',
    gender: 'Male',
    eventType: '100 m',
    value: 10.42,
    displayValue: '10.42s',
    unit: 's',
    date: '2026-04-12',
    tournament: 'Pratap Qualifiers',
    venue: 'Athletics Ground IISER KOLKATA',
    year: '2026',
    rank: 1,
    photoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=300',
  }
];

export const INITIAL_COMPETITIONS: Competition[] = [
  // Pratap Competitions Part
  {
    id: 'meet-pratap-1',
    title: 'Pratap Athletics Championship 2026',
    date: '2026-05-10',
    time: '08:00 AM',
    venue: 'Athletics Ground IISER KOLKATA',
    description: 'The premium annual intra-mural tournament honoring excellence. Full speed sprints, high hurdles, jumps, and throw competitions.',
    events: ['100 m', '200 m', '800 m', 'Long Jump', 'High Jump'],
    status: 'Completed',
    registeredAthleteIds: ['ath-1', 'ath-2', 'ath-4', 'ath-6'],
    tier: 'Pratap',
  },
  {
    id: 'meet-pratap-2',
    title: 'Pratap Trophy Winter Field Heats',
    date: '2026-11-20',
    time: '09:00 AM',
    venue: 'Athletics Ground IISER KOLKATA',
    description: 'Upcoming winter edition specializing solely in high vertical jumps, long distance leaps, shot put, and throw-offs.',
    events: ['Long Jump', 'High Jump', 'Triple Jump', 'Shotput Throw', 'Javelin Throw'],
    status: 'Upcoming',
    registeredAthleteIds: ['ath-3', 'ath-4', 'ath-6'],
    tier: 'Pratap',
  },

  // General Local Meets removed as per request
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Pratap 2026 Official Registration Open',
    date: '2026-05-24',
    content: 'Registration for Pratap 2026 is now open for all affiliated institutions. All participants must provide valid institutional ID cards at the registration desk. Early-bird registration closes this Friday.',
    importance: 'High',
  },
  {
    id: 'ann-2',
    title: 'Pratap Trophy Track Standard Upgrades',
    date: '2026-05-18',
    content: 'We have resurfaced the central stadium curve lane for the Pratap tournament tracks at IISER Kolkata. This standard upgrade will provide peak traction for the upcoming championship.',
    importance: 'Normal',
  },
  {
    id: 'ann-3',
    title: 'Pratap Organizing Committee Meeting',
    date: '2026-05-12',
    content: 'General athletic assembly to outline budget guidelines, physical gear procurement, and track reservation details for the Pratap season. All members are requested to join us at LHC Room 102.',
    importance: 'Info',
  }
];

// Initial preloaded administrators with restricted @iiserkol.ac.in emails
export const INITIAL_ADMINS: AdminUser[] = [
  {
    email: 'sportscomm@iiserkol.ac.in',
    name: 'IISER K Athletics Officer',
    addedDate: '2026-01-10',
  },
  {
    email: 'athletics.activity@iiserkol.ac.in',
    name: 'Athletics Activity',
    addedDate: '2026-05-26',
  },
  {
    email: 'beherashuvam844@gmail.com', // user's personal email pre-authorized for extreme convenience
    name: 'Shuvam Behera',
    addedDate: '2026-05-26',
  },
  {
    email: 'admin@iiserkol.ac.in',
    name: 'IISER K Athletics Admin',
    addedDate: '2026-02-15',
  }
];

// Central normalization utility to maintain event name integrity across all modules
export const normalizeEventName = (name: string): string => {
  if (!name) return 'General';
  const low = name.toLowerCase().trim();
  
  // Throws
  if (low.includes('shotput') || low.includes('shot put')) return 'Shotput Throw';
  if (low.includes('discus')) return 'Discus Throw';
  if (low.includes('discuss')) return 'Discus Throw';
  if (low.includes('javelin')) return 'Javelin Throw';
  
  // Jumps
  if (low === 'long jump' || low === 'longjump') return 'Long Jump';
  if (low === 'high jump' || low === 'highjump') return 'High Jump';
  if (low === 'triple jump' || low === 'triplejump') return 'Triple Jump';
  
  // Sprints & Relays - standardizing common space issues
  if (low === '100m' || low === '100 m') return '100 m';
  if (low === '200m' || low === '200 m') return '200 m';
  if (low === '400m' || low === '400 m') return '400 m';
  if (low === '800m' || low === '800 m') return '800 m';
  if (low === '1500m' || low === '1500 m') return '1500 m';
  if (low === '3km' || low === '3 km' || low === '3000m' || low === '3000 m') return '3000 m';
  if (low === '5km' || low === '5 km' || low === '5000m' || low === '5000 m') return '5000 m';
  if (low === '10km' || low === '10 km' || low === '10000m' || low === '10000 m') return '10000 m';
  
  return name;
};
