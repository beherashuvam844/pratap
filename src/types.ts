export interface Athlete {
  id: string;
  name: string;
  roll: string; // Roll number / Student ID
  bibNumber?: string; // BIB Number
  gender: 'Male' | 'Female';
  club: string; // College / Institution
  avatarColor: string; // Tailwind bg color class
  photoUrl?: string; // Image URL of the athlete
  events?: string[]; // Multiple sports / events
}

export interface PerformanceMetric {
  id: string;
  athleteId: string;
  athleteName: string;
  bibNumber?: string; // BIB Number
  roll?: string; // Roll / Student ID
  college?: string; // College / Club
  gender?: 'Male' | 'Female';
  eventType: string; // e.g., '100m', 'Long Jump'
  value: number; // numeric value for sort/plot (auto-parsed)
  displayValue?: string; // original score string (e.g. "10.50" or "SCORE")
  unit: 's' | 'm' | string; // keeping for backward compatibility
  date: string; // YYYY-MM-DD
  tournament: string;
  venue?: string;
  year: string;
  rank: number;
  photoUrl?: string; // Action picture of the trial
  tags?: string[]; // Metadata tags
}

export interface Competition {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "09:00 AM"
  venue?: string;
  description: string;
  events: string[]; // e.g., ['100m', '200m', 'Long Jump']
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  registeredAthleteIds: string[];
  tier: 'Pratap'; // Tier for Pratap Competitions
  registrationUrl?: string;
}

export interface Announcement {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  content: string;
  importance: 'High' | 'Normal' | 'Info';
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface AdminUser {
  email: string;
  name: string;
  password?: string;
  addedDate: string;
}
