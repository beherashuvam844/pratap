/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Header, { TabType } from './components/Header';
import DashboardView from './components/DashboardView';
import CompetitionScheduler from './components/CompetitionScheduler';
import AdminPanel from './components/AdminPanel';
import PhotoGallery from './components/PhotoGallery';
import ClubLogo from './components/ClubLogo';
import { CardScrollWrapper } from './components/CardScrollWrapper';
import { compressImage } from './utils/imageUtils';
import { Athlete, PerformanceMetric, Competition, Announcement, AdminUser } from './types';
import { 
  INITIAL_ATHLETES, 
  INITIAL_METRICS, 
  INITIAL_COMPETITIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ADMINS
} from './data/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ShieldCheck, Mail, Network, Flame, Award, Trash2, Plus, Edit2, AlertCircle, Sparkles, Check, ArrowRight, UserCheck, Lock, Instagram, Paperclip, Youtube, Eye, EyeOff, User as UserIcon, Key, KeyRound } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, sanitizeData } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';

function getEmailSlug(email: string): string {
  return email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('announcements');

  // Domain states
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  // Real Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Fail-safe timeout for authLoading to prevent indefinite splashes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Admin ID & Password Authentication State
  const [adminCredentials, setAdminCredentials] = useState<{ id: string; pass: string }>(() => {
    try {
      const stored = localStorage.getItem('pratap_admin_credentials');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to parse stored admin credentials:", e);
    }
    return { id: 'admin', pass: 'pratap123' };
  });

  const [adminIdInput, setAdminIdInput] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isPasswordAdminLoggedIn, setIsPasswordAdminLoggedIn] = useState<boolean>(false);

  // Modal State for Changing Credentials
  const [isChangeCredsOpen, setIsChangeCredsOpen] = useState<boolean>(false);
  const [currPassInput, setCurrPassInput] = useState<string>('');
  const [newIdInput, setNewIdInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [changeCredsError, setChangeCredsError] = useState<string>('');

  // Simulation parameters
  const [simulatedEmail, setSimulatedEmail] = useState<string>('');
  const [isSimulatedLoggedIn, setIsSimulatedLoggedIn] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string>('');

  // Global User-Facing Notification Banners
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-dismiss notification banners
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Auth logic: Support Admin ID/Password login, Firebase Auth, or Simulation
  const currentUserEmail = isPasswordAdminLoggedIn
    ? adminCredentials.id
    : (firebaseUser ? firebaseUser.email : (isSimulatedLoggedIn ? simulatedEmail : ''));

  const isUserLoggedIn = isPasswordAdminLoggedIn || !!firebaseUser || isSimulatedLoggedIn;

  const isAuthorizedAdmin = isPasswordAdminLoggedIn || (
    isUserLoggedIn && admins.some(a => (a.email || '').toLowerCase() === (currentUserEmail || '').toLowerCase())
  );

  // ID & Password Login Handler
  const handleIdPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const enteredId = adminIdInput.trim();
    const enteredPass = adminPasswordInput.trim();

    if (!enteredId || !enteredPass) {
      setErrorMsg('Please enter both Admin ID and Password.');
      return;
    }

    // Check primary admin credentials
    if (
      (enteredId.toLowerCase() === adminCredentials.id.toLowerCase()) &&
      enteredPass === adminCredentials.pass
    ) {
      setIsPasswordAdminLoggedIn(true);
      setErrorMsg('');
      setSuccessMsg(`Welcome Admin! Logged in as "${adminCredentials.id}".`);
      setAdminIdInput('');
      setAdminPasswordInput('');
      return;
    }

    // Check created sub-admin credentials
    const matchingAdmin = admins.find(a => 
      a.email.toLowerCase() === enteredId.toLowerCase() || 
      a.name.toLowerCase() === enteredId.toLowerCase()
    );

    if (matchingAdmin && matchingAdmin.password && matchingAdmin.password === enteredPass) {
      setIsPasswordAdminLoggedIn(true);
      setErrorMsg('');
      setSuccessMsg(`Welcome Admin! Logged in as "${matchingAdmin.name}".`);
      setAdminIdInput('');
      setAdminPasswordInput('');
      return;
    }

    setErrorMsg('Invalid Admin ID or Password. Please check your credentials.');
  };

  // Change Admin Credentials Handler
  const handleSaveNewCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeCredsError('');

    if (currPassInput !== adminCredentials.pass) {
      setChangeCredsError('Current password is incorrect.');
      return;
    }

    const targetId = newIdInput.trim() || adminCredentials.id;
    const targetPass = newPassInput.trim();

    if (!targetPass) {
      setChangeCredsError('New password cannot be empty.');
      return;
    }

    if (targetPass.length < 4) {
      setChangeCredsError('New password must be at least 4 characters long.');
      return;
    }

    if (targetPass !== confirmPassInput) {
      setChangeCredsError('New password and confirmation do not match.');
      return;
    }

    const updatedCreds = { id: targetId, pass: targetPass };
    setAdminCredentials(updatedCreds);
    localStorage.setItem('pratap_admin_credentials', JSON.stringify(updatedCreds));

    setIsChangeCredsOpen(false);
    setCurrPassInput('');
    setNewIdInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setSuccessMsg(`Admin credentials updated successfully! New Admin ID: "${targetId}".`);
  };

  // Helper to sync admins list across multiple devices via Firestore
  const fetchAndSyncAdmins = async (currentUser: FirebaseUser | null) => {
    try {
      if (!currentUser) {
        const storedAdmins = localStorage.getItem('apex_admins');
        if (storedAdmins) {
          try {
            setAdmins(JSON.parse(storedAdmins));
          } catch (e) {
            setAdmins(INITIAL_ADMINS);
          }
        } else {
          setAdmins(INITIAL_ADMINS);
        }
        return;
      }

      const userEmail = currentUser.email?.toLowerCase();

      // Parallel fetches for extreme resilience and fast verification
      const [allAdminsQuerySnap, slugDocSnap, uidDocSnap] = await Promise.all([
        getDocs(collection(db, 'admins')).catch(err => {
          console.warn("Full collection query bypassed or restricted:", err);
          return null;
        }),
        userEmail ? getDoc(doc(db, 'admins', getEmailSlug(userEmail))).catch(() => null) : null,
        getDoc(doc(db, 'admins', currentUser.uid)).catch(() => null)
      ]);

      const firestoreAdmins: AdminUser[] = [];
      const deletedEmails = new Set<string>();

      if (allAdminsQuerySnap) {
        allAdminsQuerySnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.email) {
            const emailLower = data.email.toLowerCase();
            if (data.deleted === true || data.role === 'revoked') {
              deletedEmails.add(emailLower);
            } else {
              firestoreAdmins.push({
                email: emailLower,
                name: data.name || data.email.split('@')[0].toUpperCase(),
                password: data.password || undefined,
                addedDate: data.addedDate || data.addedAt?.split('T')[0] || new Date().toISOString().split('T')[0]
              });
            }
          }
        });
      }

      // Merge INITIAL_ADMINS with firestoreAdmins to ensure fallback/preset admins are always included, excluding deleted/revoked ones
      const allAdminsMap = new Map<string, AdminUser>();
      INITIAL_ADMINS.forEach(a => {
        const emailLower = a.email.toLowerCase();
        if (!deletedEmails.has(emailLower)) {
          allAdminsMap.set(emailLower, a);
        }
      });
      firestoreAdmins.forEach(a => {
        const emailLower = a.email.toLowerCase();
        if (!deletedEmails.has(emailLower)) {
          allAdminsMap.set(emailLower, a);
        }
      });

      // Resilient verification across four potential authentication pillars
      const existsInPredefinedList = INITIAL_ADMINS.some(a => a.email.toLowerCase() === userEmail);
      const existsInSlugDoc = (slugDocSnap?.exists() && slugDocSnap.data()?.deleted !== true) || false;
      const existsInUidDoc = (uidDocSnap?.exists() && uidDocSnap.data()?.deleted !== true) || false;
      const existsInFetchedList = firestoreAdmins.some(a => a.email.toLowerCase() === userEmail);

      const isAuthorized = (existsInPredefinedList || existsInSlugDoc || existsInUidDoc || existsInFetchedList) && !deletedEmails.has(userEmail);

      if (userEmail) {
        if (!isAuthorized) {
          await signOut(auth);
          setErrorMsg('Access denied. This email is not registered as an authorized administrator. Please contact an existing administrator.');
          setAdmins(INITIAL_ADMINS);
          return;
        }

        // Add to active local map of administrators if authorized but not present in fetched collection snapshot
        if (isAuthorized && !allAdminsMap.has(userEmail)) {
          let name = currentUser.displayName || userEmail.split('@')[0].toUpperCase();
          if (slugDocSnap?.exists()) {
            name = slugDocSnap.data()?.name || name;
          } else if (uidDocSnap?.exists()) {
            name = uidDocSnap.data()?.name || name;
          }
          allAdminsMap.set(userEmail, {
            email: userEmail,
            name: name,
            addedDate: new Date().toISOString().split('T')[0]
          });
        }

        const mergedAdmins = Array.from(allAdminsMap.values());
        setAdmins(mergedAdmins);
        localStorage.setItem('apex_admins', JSON.stringify(mergedAdmins));

        // Provision of council authenticate rules for exists(/admins/{uid}) matches
        if (isAuthorized && !existsInUidDoc) {
          const adminObject = Array.from(allAdminsMap.values()).find(a => a.email.toLowerCase() === userEmail) || {
            email: userEmail,
            name: currentUser.displayName || userEmail.split('@')[0].toUpperCase(),
            addedDate: new Date().toISOString().split('T')[0]
          };
          
          await setDoc(doc(db, 'admins', currentUser.uid), sanitizeData({
            email: userEmail,
            name: adminObject.name,
            role: 'admin',
            addedAt: new Date().toISOString()
          })).catch(err => {
            console.error("Failed to provision council authenticating UID doc:", err);
          });
          console.log(`Successfully provisioned council authentication rule for admin UID ${currentUser.uid}`);
        }
      }
    } catch (err) {
      console.error('Error in fetchAndSyncAdmins process:', err);
      const storedAdmins = localStorage.getItem('apex_admins');
      if (storedAdmins) {
        try {
          setAdmins(JSON.parse(storedAdmins));
        } catch (e) {
          setAdmins(INITIAL_ADMINS);
        }
      } else {
        setAdmins(INITIAL_ADMINS);
      }
    }
  };

  // Listen for real Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchAndSyncAdmins(user);
      } else {
        const storedAdmins = localStorage.getItem('apex_admins');
        if (storedAdmins) {
          try {
            setAdmins(JSON.parse(storedAdmins));
          } catch (e) {
            setAdmins(INITIAL_ADMINS);
          }
        } else {
          setAdmins(INITIAL_ADMINS);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. Initial State Loading from LocalStorage as visual fast-fallback on boot
  useEffect(() => {
    const storedAthletes = localStorage.getItem('apex_athletes');
    const storedMetrics = localStorage.getItem('apex_metrics');
    const storedComps = localStorage.getItem('apex_competitions');
    const storedAnnounce = localStorage.getItem('apex_announcements');
    const storedAdmins = localStorage.getItem('apex_admins');
    const storedLogo = localStorage.getItem('apex_app_logo');
    const storedClubLogo = localStorage.getItem('apex_club_logo');

    try {
      if (storedAthletes) setAthletes(JSON.parse(storedAthletes));
      else setAthletes(INITIAL_ATHLETES);
    } catch (e) { setAthletes(INITIAL_ATHLETES); }

    try {
      if (storedMetrics) setMetrics(JSON.parse(storedMetrics));
      else setMetrics(INITIAL_METRICS);
    } catch (e) { setMetrics(INITIAL_METRICS); }

    try {
      if (storedComps) setCompetitions(JSON.parse(storedComps));
      else setCompetitions(INITIAL_COMPETITIONS);
    } catch (e) { setCompetitions(INITIAL_COMPETITIONS); }

    try {
      if (storedAnnounce) setAnnouncements(JSON.parse(storedAnnounce));
      else setAnnouncements(INITIAL_ANNOUNCEMENTS);
    } catch (e) { setAnnouncements(INITIAL_ANNOUNCEMENTS); }

    try {
      if (storedAdmins) setAdmins(JSON.parse(storedAdmins));
      else setAdmins(INITIAL_ADMINS);
    } catch (e) { setAdmins(INITIAL_ADMINS); }

    if (storedLogo) setAppLogo(storedLogo);
    if (storedClubLogo) setClubLogo(storedClubLogo);
  }, []);

  // 1b. Real-time Multi-User Firestore Synchronizers
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    // ----- Athletes Real-Time Sync -----
    const unsubAthletes = onSnapshot(collection(db, 'athletes'), (snap) => {
      if (!snap.empty) {
        const list: Athlete[] = [];
        snap.forEach(d => {
          list.push(d.data() as Athlete);
        });
        setAthletes(list);
        localStorage.setItem('apex_athletes', JSON.stringify(list));
      } else {
        setAthletes([]);
        localStorage.setItem('apex_athletes', JSON.stringify([]));
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'athletes');
      } catch (err) {
        console.warn('Athletes sync offline warning:', err);
      }
    });
    unsubscribes.push(unsubAthletes);

    // ----- Metrics Real-Time Sync -----
    const unsubMetrics = onSnapshot(collection(db, 'metrics'), (snap) => {
      if (!snap.empty) {
        const list: PerformanceMetric[] = [];
        snap.forEach(d => {
          list.push(d.data() as PerformanceMetric);
        });
        setMetrics(list);
        localStorage.setItem('apex_metrics', JSON.stringify(list));
      } else {
        setMetrics([]);
        localStorage.setItem('apex_metrics', JSON.stringify([]));
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'metrics');
      } catch (err) {
        console.warn('Metrics sync offline warning:', err);
      }
    });
    unsubscribes.push(unsubMetrics);

    // ----- Competitions Real-Time Sync -----
    const unsubComps = onSnapshot(collection(db, 'competitions'), (snap) => {
      if (!snap.empty) {
        const list: Competition[] = [];
        snap.forEach(d => {
          list.push(d.data() as Competition);
        });
        setCompetitions(list);
        localStorage.setItem('apex_competitions', JSON.stringify(list));
      } else {
        setCompetitions([]);
        localStorage.setItem('apex_competitions', JSON.stringify([]));
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'competitions');
      } catch (err) {
        console.warn('Competitions sync offline warning:', err);
      }
    });
    unsubscribes.push(unsubComps);

    // ----- Announcements Real-Time Sync -----
    const unsubAnnounce = onSnapshot(collection(db, 'announcements'), (snap) => {
      if (!snap.empty) {
        const list: Announcement[] = [];
        snap.forEach(d => {
          list.push(d.data() as Announcement);
        });
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAnnouncements(list);
        localStorage.setItem('apex_announcements', JSON.stringify(list));
      } else {
        setAnnouncements([]);
        localStorage.setItem('apex_announcements', JSON.stringify([]));
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'announcements');
      } catch (err) {
        console.warn('Announcements sync offline warning:', err);
      }
    });
    unsubscribes.push(unsubAnnounce);

    // ----- App Settings (Logo) Sync -----
    const unsubSettings = onSnapshot(doc(db, 'settings', 'appearance'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.appLogo) {
          setAppLogo(data.appLogo);
          localStorage.setItem('apex_app_logo', data.appLogo);
        }
        if (data.clubLogo) {
          setClubLogo(data.clubLogo);
          localStorage.setItem('apex_club_logo', data.clubLogo);
        }
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/appearance');
      } catch (err) {
        console.warn('Settings sync offline warning:', err);
      }
    });
    unsubscribes.push(unsubSettings);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [firebaseUser, isAuthorizedAdmin]);

  // Sync state modifications to LocalStorage helper (maintained for offline fast renders)
  const syncAndSave = (key: 'athletes' | 'metrics' | 'competitions' | 'announcements' | 'admins', updatedData: any) => {
    try {
      localStorage.setItem(`apex_${key}`, JSON.stringify(updatedData));
    } catch (e) {
      console.warn(`localStorage quota exceeded for apex_${key}:`, e);
      if (key === 'metrics' && Array.isArray(updatedData)) {
        try {
          // Strip large base64 strings to stay within quota
          const stripped = updatedData.map((m: PerformanceMetric) => ({
            ...m,
            photoUrl: (m.photoUrl && m.photoUrl.length > 50000) ? '' : m.photoUrl
          }));
          localStorage.setItem(`apex_${key}`, JSON.stringify(stripped));
        } catch (innerErr) {
          console.error('Failed to save stripped metrics to localStorage:', innerErr);
        }
      }
    }
  };



  // --- ATHLETES ACTION HANDLERS ---
  const handleAddAthlete = async (newAthlete: Athlete) => {
    // Check if athlete already exists in current state or local array
    const exists = athletes.some(a => 
      a.id === newAthlete.id || 
      (a.name.toLowerCase() === newAthlete.name.toLowerCase() && (a.roll || '').toLowerCase() === (newAthlete.roll || '').toLowerCase())
    );
    
    if (exists) {
      console.log(`Athlete ${newAthlete.name} (ID: ${newAthlete.id}) already exists. Skipping duplicate creation.`);
      return;
    }

    const updated = [...athletes, newAthlete];
    setAthletes(updated);
    syncAndSave('athletes', updated);

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'athletes', newAthlete.id), sanitizeData(newAthlete));
        setSuccessMsg(`Athlete '${newAthlete.name}' successfully added to Firestore database.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleEditAthlete = async (updatedAthlete: Athlete) => {
    // Consolidate updates for same person across multiple roster IDs
    const targetA = athletes.find(a => a.id === updatedAthlete.id);
    const siblings = athletes.filter(a => {
      const matchOld = targetA ? (
        a.name.toLowerCase().trim() === targetA.name.toLowerCase().trim() && 
        (a.roll || '').toLowerCase().trim() === (targetA.roll || '').toLowerCase().trim()
      ) : false;
      const matchNew = (
        a.name.toLowerCase().trim() === updatedAthlete.name.toLowerCase().trim() && 
        (a.roll || '').toLowerCase().trim() === (updatedAthlete.roll || '').toLowerCase().trim()
      );
      return matchOld || matchNew || a.id === updatedAthlete.id;
    });

    const siblingIds = siblings.map(s => s.id);

    const updated = athletes.map(a => {
      if (siblingIds.includes(a.id)) {
        return { 
          ...a, 
          name: updatedAthlete.name,
          gender: updatedAthlete.gender,
          bibNumber: updatedAthlete.bibNumber || a.bibNumber,
          roll: updatedAthlete.roll || a.roll,
          photoUrl: updatedAthlete.photoUrl || a.photoUrl,
          club: updatedAthlete.club || a.club
        };
      }
      return a;
    });

    setAthletes(updated);
    syncAndSave('athletes', updated);

    // Also update denormalized athlete name inside metrics catalog
    const updatedMetrics = metrics.map(m => {
      if (siblingIds.includes(m.athleteId)) {
        return { ...m, athleteName: updatedAthlete.name };
      }
      return m;
    });
    setMetrics(updatedMetrics);
    syncAndSave('metrics', updatedMetrics);

    try {
      if (firebaseUser) {
        // Update all associated records in Firestore
        for (const tid of siblingIds) {
          const authObj = updated.find(au => au.id === tid);
          if (authObj) await setDoc(doc(db, 'athletes', tid), sanitizeData(authObj));
        }

        // Synchronize associated metrics names in Firestore
        const metricsToSync = metrics.filter(m => siblingIds.includes(m.athleteId));
        for (const m of metricsToSync) {
          await setDoc(doc(db, 'metrics', m.id), sanitizeData({ ...m, athleteName: updatedAthlete.name }));
        }
        setSuccessMsg(`Profiles for '${updatedAthlete.name}' synchronized and saved.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleUpdateAthletePhoto = async (athleteId: string, newPhotoUrl: string) => {
    const targetAthlete = athletes.find(a => a.id === athleteId);
    if (!targetAthlete) return;

    // Consolidate photo updates for same person across multiple roster IDs
    const samePersonAthletes = athletes.filter(a => 
      a.name.toLowerCase().trim() === targetAthlete.name.toLowerCase().trim() && 
      a.batch.toLowerCase().trim() === targetAthlete.batch.toLowerCase().trim()
    );
    
    const sameIds = samePersonAthletes.map(spa => spa.id);

    const updatedAthletes = athletes.map(a => {
      if (sameIds.includes(a.id)) {
        return { ...a, photoUrl: newPhotoUrl };
      }
      return a;
    });

    setAthletes(updatedAthletes);
    syncAndSave('athletes', updatedAthletes);

    try {
      if (firebaseUser) {
        for (const spa of samePersonAthletes) {
          await setDoc(doc(db, 'athletes', spa.id), sanitizeData({ ...spa, photoUrl: newPhotoUrl }));
        }
        setSuccessMsg(`Profile photo updated successfully for ${targetAthlete.name}.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleDeleteAthlete = async (athleteId: string) => {
    const athleteName = athletes.find(a => a.id === athleteId)?.name || 'Athlete';
    const updatedAthletes = athletes.filter(a => a.id !== athleteId);
    setAthletes(updatedAthletes);
    syncAndSave('athletes', updatedAthletes);

    const updatedMetrics = metrics.filter(m => m.athleteId !== athleteId);
    setMetrics(updatedMetrics);
    syncAndSave('metrics', updatedMetrics);

    const updatedComps = competitions.map(c => ({
      ...c,
      registeredAthleteIds: c.registeredAthleteIds.filter(id => id !== athleteId)
    }));
    setCompetitions(updatedComps);
    syncAndSave('competitions', updatedComps);

    try {
      if (firebaseUser) {
        await deleteDoc(doc(db, 'athletes', athleteId));
        
        // Delete associated metrics in Firestore
        const metricsToDelete = metrics.filter(m => m.athleteId === athleteId);
        for (const m of metricsToDelete) {
          await deleteDoc(doc(db, 'metrics', m.id));
        }

        // Remove from competition participation in Firestore
        const compsToVerify = competitions.filter(c => c.registeredAthleteIds.includes(athleteId));
        for (const c of compsToVerify) {
          await setDoc(doc(db, 'competitions', c.id), {
            ...c,
            registeredAthleteIds: c.registeredAthleteIds.filter(id => id !== athleteId)
          });
        }
        setSuccessMsg(`Athlete '${athleteName}' and all associated performance logs deleted correctly.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  // --- PERFORMANCE METRIC ACTION HANDLERS ---
  const sanitizeAndCompressMetric = async (m: PerformanceMetric): Promise<PerformanceMetric> => {
    if (m.photoUrl && m.photoUrl.startsWith('data:image')) {
      try {
        const compressed = await compressImage(m.photoUrl, 800, 800, 0.65);
        return { ...m, photoUrl: compressed };
      } catch (e) {
        console.warn('Failed to compress metric photo:', e);
      }
    }
    return m;
  };

  const handleAddMetric = async (newMetric: PerformanceMetric) => {
    const processedMetric = await sanitizeAndCompressMetric(newMetric);
    const exists = metrics.find(m => m.id === processedMetric.id);
    let updated: PerformanceMetric[];
    
    if (exists) {
      updated = metrics.map(m => m.id === processedMetric.id ? processedMetric : m);
    } else {
      updated = [processedMetric, ...metrics];
    }

    setMetrics(updated);
    syncAndSave('metrics', updated);

    try {
      await setDoc(doc(db, 'metrics', processedMetric.id), sanitizeData(processedMetric));
      setSuccessMsg(exists ? `Performance record updated successfully.` : `Performance log submitted successfully for ${processedMetric.athleteName}.`);
    } catch (error: any) {
      console.error("Firestore setDoc error for metric:", error);
      // Fallback: If setDoc failed (e.g. document size limit exceeded), try stripping/compressing photoUrl to save the core metric data
      if (processedMetric.photoUrl && processedMetric.photoUrl.length > 100000) {
        try {
          const fallbackMetric = { ...processedMetric, photoUrl: '' };
          await setDoc(doc(db, 'metrics', processedMetric.id), sanitizeData(fallbackMetric));
          console.log("Successfully saved fallback metric without oversized image.");
        } catch (fallbackErr) {
          console.error("Fallback setDoc also failed:", fallbackErr);
        }
      }
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    const updated = metrics.filter(m => m.id !== metricId);
    setMetrics(updated);
    syncAndSave('metrics', updated);

    try {
      await deleteDoc(doc(db, 'metrics', metricId));
      setSuccessMsg('Performance log deleted successfully.');
    } catch (error: any) {
      console.error("Firestore deleteDoc error for metric:", error);
    }
  };

  const handleClearAllMetrics = async () => {
    setMetrics([]);
    syncAndSave('metrics', []);

    try {
      const snap = await getDocs(collection(db, 'metrics'));
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setSuccessMsg('All performance metrics deleted successfully.');
    } catch (error: any) {
      console.error('Firestore clear all metrics error:', error);
    }
  };

  const handleDeleteMetricsByTournament = async (tournamentName: string) => {
    if (!tournamentName) return;
    const cleanName = tournamentName.trim().toLowerCase();
    const remainingMetrics = metrics.filter(m => (m.tournament || '').trim().toLowerCase() !== cleanName);
    const deletedMetrics = metrics.filter(m => (m.tournament || '').trim().toLowerCase() === cleanName);
    setMetrics(remainingMetrics);
    syncAndSave('metrics', remainingMetrics);

    try {
      const deletePromises = deletedMetrics.map(m => deleteDoc(doc(db, 'metrics', m.id)));
      await Promise.all(deletePromises);
      setSuccessMsg(`Deleted ${deletedMetrics.length} metrics for tournament '${tournamentName}'.`);
    } catch (error: any) {
      console.error('Firestore delete metrics by tournament error:', error);
    }
  };

  const handleEditMetric = async (updatedMetric: PerformanceMetric) => {
    const processedMetric = await sanitizeAndCompressMetric(updatedMetric);
    const updated = metrics.map(m => m.id === processedMetric.id ? processedMetric : m);
    setMetrics(updated);
    syncAndSave('metrics', updated);

    try {
      await setDoc(doc(db, 'metrics', processedMetric.id), sanitizeData(processedMetric));
      setSuccessMsg('Performance log modified successfully.');
    } catch (error: any) {
      console.error("Firestore setDoc error for metric:", error);
      if (processedMetric.photoUrl && processedMetric.photoUrl.length > 100000) {
        try {
          const fallbackMetric = { ...processedMetric, photoUrl: '' };
          await setDoc(doc(db, 'metrics', processedMetric.id), sanitizeData(fallbackMetric));
          console.log("Successfully saved fallback edited metric without oversized image.");
        } catch (fallbackErr) {
          console.error("Fallback edit setDoc also failed:", fallbackErr);
        }
      }
    }
  };

  // --- COMPETITIONS ACTION HANDLERS ---
  const handleAddCompetition = async (newComp: Competition) => {
    const updated = [...competitions, newComp];
    setCompetitions(updated);
    syncAndSave('competitions', updated);

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'competitions', newComp.id), sanitizeData(newComp));
        setSuccessMsg(`Competition '${newComp.title}' scheduled successfully.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleEditCompetitionStatus = async (compId: string, status: Competition['status']) => {
    const updated = competitions.map(c => c.id === compId ? { ...c, status } : c);
    setCompetitions(updated);
    syncAndSave('competitions', updated);

    const comp = competitions.find(c => c.id === compId);
    if (!comp) return;

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'competitions', compId), sanitizeData({ ...comp, status }));
        setSuccessMsg(`Status of '${comp.title}' updated successfully.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleDeleteCompetition = async (compId: string, deleteAssociatedMetrics: boolean = false) => {
    const comp = competitions.find(c => c.id === compId);
    const compTitle = comp?.title || 'Competition';
    const updated = competitions.filter(c => c.id !== compId);
    setCompetitions(updated);
    syncAndSave('competitions', updated);

    try {
      await deleteDoc(doc(db, 'competitions', compId));
      setSuccessMsg(`Competition '${compTitle}' deleted correctly.`);
    } catch (error: any) {
      console.error("Firestore deleteDoc error for competition:", error);
    }

    if (deleteAssociatedMetrics && compTitle) {
      await handleDeleteMetricsByTournament(compTitle);
    }
  };

  const handleRegisterAthleteInCompetition = async (competitionId: string, athleteId: string) => {
    const updated = competitions.map(c => {
      if (c.id === competitionId) {
        const alreadyRegistered = c.registeredAthleteIds.includes(athleteId);
        return {
          ...c,
          registeredAthleteIds: alreadyRegistered 
            ? c.registeredAthleteIds 
            : [...c.registeredAthleteIds, athleteId]
        };
      }
      return c;
    });
    setCompetitions(updated);
    syncAndSave('competitions', updated);

    const comp = competitions.find(c => c.id === competitionId);
    if (!comp) return;
    const isReg = comp.registeredAthleteIds.includes(athleteId);
    const updatedRegs = isReg ? comp.registeredAthleteIds : [...comp.registeredAthleteIds, athleteId];

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'competitions', competitionId), sanitizeData({ ...comp, registeredAthleteIds: updatedRegs }));
        setSuccessMsg('Athlete registered to competition successfully.');
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  // --- ANNOUNCEMENT ACTION HANDLERS ---
  const handleAddAnnouncement = async (newAnn: Announcement) => {
    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    syncAndSave('announcements', updated);

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'announcements', newAnn.id), sanitizeData(newAnn));
        setSuccessMsg(`Announcement bulletin '${newAnn.title}' published live.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const annTitle = announcements.find(ann => ann.id === id)?.title || 'Announcement';
    const updated = announcements.filter(ann => ann.id !== id);
    setAnnouncements(updated);
    syncAndSave('announcements', updated);

    try {
      if (firebaseUser) {
        await deleteDoc(doc(db, 'announcements', id));
        setSuccessMsg(`Announcement '${annTitle}' removed from bulletin board.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  // --- ADMIN MANAGEMENT HANDLERS ---
  const handleAddAdmin = async (newAdmin: AdminUser) => {
    if (admins.some(a => a.email.toLowerCase() === newAdmin.email.toLowerCase())) return;
    const updated = [...admins, newAdmin];
    setAdmins(updated);
    syncAndSave('admins', updated);

    try {
      if (firebaseUser) {
        const emailSlug = getEmailSlug(newAdmin.email);
        const docRef = doc(db, 'admins', emailSlug);
        await setDoc(docRef, sanitizeData({
          email: newAdmin.email.toLowerCase(),
          name: newAdmin.name,
          password: newAdmin.password || null,
          role: 'admin',
          addedAt: new Date().toISOString(),
          deleted: false
        }));
        setSuccessMsg(`Officer ${newAdmin.name} added to authorized administrator list.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    const updated = admins.filter(a => a.email.toLowerCase() !== email.toLowerCase());
    setAdmins(updated);
    syncAndSave('admins', updated);

    try {
      if (firebaseUser) {
        // 1. Mark standard slug-based document as deleted/revoked in Firestore
        const emailSlug = getEmailSlug(email);
        const slugDocRef = doc(db, 'admins', emailSlug);
        await setDoc(slugDocRef, sanitizeData({
          email: email.toLowerCase(),
          name: admins.find(a => a.email.toLowerCase() === email.toLowerCase())?.name || email.split('@')[0].toUpperCase(),
          role: 'revoked',
          deleted: true,
          deletedAt: new Date().toISOString()
        }), { merge: true });

        // 2. Query and mark other documents matching this email (like automatic auth-provisioned UID documents)
        const q = query(collection(db, 'admins'), where('email', '==', email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(docSnap => 
          setDoc(doc(db, 'admins', docSnap.id), sanitizeData({ deleted: true, role: 'revoked' }), { merge: true })
        );
        await Promise.all(updatePromises);
        setSuccessMsg(`Administrative privileges revoked for ${email}.`);
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleUpdateLogo = async (logoDataUrl: string | null) => {
    setAppLogo(logoDataUrl);
    if (logoDataUrl) {
      localStorage.setItem('apex_app_logo', logoDataUrl);
    } else {
      localStorage.removeItem('apex_app_logo');
    }

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'settings', 'appearance'), sanitizeData({
          appLogo: logoDataUrl,
          updatedAt: new Date().toISOString()
        }), { merge: true });
        setSuccessMsg('Application logo updated successfully.');
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  const handleUpdateClubLogo = async (logoDataUrl: string | null) => {
    setClubLogo(logoDataUrl);
    if (logoDataUrl) {
      localStorage.setItem('apex_club_logo', logoDataUrl);
    } else {
      localStorage.removeItem('apex_club_logo');
    }

    try {
      if (firebaseUser) {
        await setDoc(doc(db, 'settings', 'appearance'), sanitizeData({
          clubLogo: logoDataUrl,
          updatedAt: new Date().toISOString()
        }), { merge: true });
        setSuccessMsg('Club logo updated successfully.');
      }
    } catch (error: any) {
      setGlobalError(error.message || String(error));
    }
  };

  // Reset database triggers
  const handleResetToDefault = () => {
    setAthletes(INITIAL_ATHLETES);
    setMetrics(INITIAL_METRICS);
    setCompetitions(INITIAL_COMPETITIONS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setAdmins(INITIAL_ADMINS);
    
    localStorage.setItem('apex_athletes', JSON.stringify(INITIAL_ATHLETES));
    localStorage.setItem('apex_metrics', JSON.stringify(INITIAL_METRICS));
    localStorage.setItem('apex_competitions', JSON.stringify(INITIAL_COMPETITIONS));
    localStorage.setItem('apex_announcements', JSON.stringify(INITIAL_ANNOUNCEMENTS));
    localStorage.setItem('apex_admins', JSON.stringify(INITIAL_ADMINS));
  };

  // State to filter metrics eventwise
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  const uniqueEventTypes = useMemo(() => {
    const predefined = ['100 m', '200 m', '400 m', '800 m', '1500 m', '3000 m', '5000 m', '10000 m', '4×100 m', '4×400 m', '4×100 m medley relay', 'Long Jump', 'High Jump', 'Javelin Throw', 'Shotput Throw', 'Triple Jump', 'Discus Throw'];
    const map = new Map<string, string>();
    
    // Seed with predefined (case-insensitive keys)
    predefined.forEach(e => map.set(e.toLowerCase(), e));
    
    // Add existing from metrics
    metrics.forEach(m => {
      const lower = m.eventType.toLowerCase();
      if (!map.has(lower)) {
        map.set(lower, m.eventType);
      }
    });
    
    return Array.from(map.values());
  }, [metrics]);

  const uniqueAthletes = useMemo(() => {
    const map = new Map<string, Athlete>();
    
    // Process athletes in order. Later records for same person overwrite.
    athletes.forEach(a => {
      const key = a.roll 
        ? a.roll.toUpperCase().trim() 
        : `${a.name.toLowerCase().trim()}-${a.batch.toLowerCase().trim()}`;
      
      const current = map.get(key);
      map.set(key, { 
        ...a,
        photoUrl: a.photoUrl || current?.photoUrl
      });
    });
    return Array.from(map.values());
  }, [athletes]);

  const filteredAthletesForResults = useMemo(() => {
    return uniqueAthletes.filter(a => {
      const normGender = (a.gender || '').toLowerCase().startsWith('f') ? 'Female' : 'Male';
      const matchesGender = selectedGenderFilter === 'All' || normGender === selectedGenderFilter;
      return matchesGender;
    });
  }, [uniqueAthletes, selectedGenderFilter]);

  const filteredMetricsForResults = useMemo(() => {
    return metrics.filter(m => {
      const matchingAthlete = athletes.find(a => 
        a.id === m.athleteId || 
        (m.roll && a.roll && a.roll.trim().toUpperCase() === m.roll.trim().toUpperCase()) ||
        (m.athleteName && a.name && a.name.trim().toLowerCase() === m.athleteName.trim().toLowerCase())
      );
      const athGender = matchingAthlete?.gender || m.gender || 'Male';
      const normGender = athGender.toLowerCase().startsWith('f') ? 'Female' : 'Male';
      const matchesGender = selectedGenderFilter === 'All' || normGender === selectedGenderFilter;
      return matchesGender;
    });
  }, [metrics, athletes, selectedGenderFilter]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-[#F8FAFC] flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 border-4 border-[#D62828]/20 border-t-[#D62828] rounded-full animate-spin mb-5" />
        <div className="text-[#D62828] font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">
          Pratap IISER KOLKATA
        </div>
      </div>
    );
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-[#1F2937] antialiased selection:bg-[#D62828] selection:text-white">
      
      {/* Master sticky navigation bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isSimulatedAdminAuthenticated={isAuthorizedAdmin}
        appLogo={appLogo}
        clubLogo={clubLogo}
      />

      {/* Global User-Facing Notification Banners */}
      <AnimatePresence>
        {(globalError || successMsg) && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-5 -mb-2">
            {globalError && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 80) setGlobalError(null);
                }}
                className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-md transition-colors duration-300 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="bg-rose-100 text-[#D62828] rounded-xl p-2 shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-900">
                    {globalError.toLowerCase().includes('permission') || globalError.toLowerCase().includes('authorized') 
                      ? 'Security Restriction' 
                      : 'Sync Error'}
                  </h4>
                  <p className="text-xs font-bold text-rose-700 leading-relaxed">{globalError}</p>
                </div>
                <button 
                  onClick={() => setGlobalError(null)} 
                  className="text-xs font-black text-rose-600 hover:text-rose-800 bg-rose-100 hover:bg-rose-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  Dismiss
                </button>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 80) setSuccessMsg(null);
                }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-md transition-colors duration-300 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="bg-emerald-100 text-emerald-600 rounded-xl p-2 shrink-0">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">Operation Successful</h4>
                  <p className="text-xs font-bold text-emerald-700 leading-relaxed">{successMsg}</p>
                </div>
                <button 
                  onClick={() => setSuccessMsg(null)} 
                  className="text-xs font-black text-emerald-600 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Primary content router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
        
        {/* TAB 1: ABOUT PRATAP & UPDATES */}
        {activeTab === 'announcements' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-3xl font-black text-[#1F2937] tracking-tight">About Pratap</h2>
                <p className="text-sm text-slate-500 mt-1">Official inter-institutional athletics meet hosted by IISER Kolkata.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#1F2937] text-[#F4C430] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Flame className="h-4 w-4 animate-bounce text-[#F4C430]" />
                  Season 2026 Live
                </span>
              </div>
            </div>

            {/* About Us Section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col items-center justify-center gap-8 border-b border-slate-100 pb-8 text-center">
                {/* Visual Banner Background behind logos */}
                <div className="relative group shrink-0">
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#D62828] via-[#F4C430] to-[#2563EB] rounded-[2.5rem] opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-700" />
                  <div className="relative flex items-center gap-6 bg-[#1F2937] rounded-[2rem] p-8 sm:p-10 border border-slate-700 shadow-xl overflow-hidden">
                    <div className="relative z-10 flex items-center gap-6">
                      <ClubLogo className="h-32 w-32 sm:h-44 sm:w-44 md:h-48 md:w-48 drop-shadow-[0_0_20px_rgba(214,40,40,0.4)] transition-transform duration-500 group-hover:scale-105" logoUrl={appLogo} />
                      <div className="w-px h-24 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
                      <ClubLogo className="h-32 w-32 sm:h-44 sm:w-44 md:h-48 md:w-48 drop-shadow-[0_0_20px_rgba(244,196,48,0.4)] transition-transform duration-500 group-hover:scale-105" logoUrl={clubLogo} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4 max-w-3xl">
                  <h3 className="text-3xl sm:text-4xl font-black text-[#1F2937] tracking-tight font-serif">The Pratap Legacy</h3>
                  <p className="text-slate-600 leading-relaxed font-medium sm:text-lg">
                    Pratap is the premier athletics meet hosted by the Indian Institute of Science Education and Research Kolkata. 
                    Established to celebrate the spirit of speed, power, and institutional pride, Pratap brings together athletes from various prestigious institutions to compete on a single grand stage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                    <span className="h-4 w-1.5 bg-[#D62828] rounded-full" />
                    Our Disciplines
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    Pratap features a wide range of track and field events, including sprints (100 m, 200 m, 400 m), middle and long-distance races (800 m to 10000 m), 
                    relays (4×100 m, 4×400 m, Medley), as well as field events such as Shotput Throw, Discus Throw, Javelin Throw, long jump, and triple jump. 
                    The tournament provides a standard-compliant platform for student-athletes to demonstrate their prowess.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                    <span className="h-4 w-1.5 bg-[#F4C430] rounded-full" />
                    Inter-Institute Meet
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    <strong className="text-[#D62828]">Pratap</strong> is primarily an inter-institute athletics competition designed for <strong className="text-[#1F2937]">IISER Kolkata</strong> and other premier educational institutes located in its nearby locality. 
                    The meet serves as a testament to the thriving sports culture and competitive spirit within the regional academic community.
                  </p>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <h4 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                    <span className="h-4 w-1.5 bg-[#2563EB] rounded-full" />
                    Connect & Stay Updated
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <a 
                      href="mailto:pratap@iiserkol.ac.in"
                      className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-[#D62828] hover:bg-red-50/50 transition card-lift-sm group"
                    >
                      <div className="h-9 w-9 bg-red-100 text-[#D62828] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#D62828] group-hover:text-white transition">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Email</p>
                        <p className="text-xs font-bold text-[#1F2937] truncate">pratap@iiserkol.ac.in</p>
                      </div>
                    </a>

                    <a 
                      href="https://www.instagram.com/athletics.iiserk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-pink-500 hover:bg-pink-50/50 transition card-lift-sm group"
                    >
                      <div className="h-9 w-9 bg-pink-100 text-pink-600 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-pink-600 group-hover:text-white transition">
                        <Instagram className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram</p>
                        <p className="text-xs font-bold text-[#1F2937] truncate">@athletics.iiserk</p>
                      </div>
                    </a>

                    <a 
                      href="https://youtube.com/@pratapathleticsmeet?si=LVAXim9Ed4WBbpfM"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-[#D62828] hover:bg-red-50/50 transition card-lift-sm group"
                    >
                      <div className="h-9 w-9 bg-red-100 text-[#D62828] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#D62828] group-hover:text-white transition">
                        <Youtube className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YouTube</p>
                        <p className="text-xs font-bold text-[#1F2937] truncate">@pratapathleticsmeet</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-50 via-amber-50 to-blue-50 rounded-2xl p-6 border border-slate-200 mt-4 text-center">
                <p className="text-sm text-[#1F2937] leading-relaxed font-bold italic">
                  "Beyond the medals, Pratap is about fostering institutional relationships and celebrating athletic character. 
                  We invite the best to compete at our world-class venue and leave as part of the Pratap legacy."
                </p>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 card-lift-sm animate-fade-slide-up stagger-1 shadow-xs">
                <div className="h-12 w-12 bg-[#F4C430] text-[#1F2937] rounded-xl flex items-center justify-center font-black text-xl shadow-md">
                  {competitions.length}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937]">Competitions</h4>
                  <p className="text-xs text-slate-500">Active meet schedule</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 card-lift-sm animate-fade-slide-up stagger-2 shadow-xs">
                <div className="h-12 w-12 bg-[#D62828] text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md">
                  {metrics.length}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F2937]">Performance Logs</h4>
                  <p className="text-xs text-slate-500">Verified trial data</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EVENTWISE RESULTS hub with athlete photos */}
        {activeTab === 'results' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-3xl font-black text-[#1F2937] tracking-tight">Eventwise Performance & Results</h2>
                <p className="text-sm text-slate-500 mt-1">Select any athletic event to review historic competition metrics accompanied by official athlete trial photographs.</p>
              </div>
            </div>

            {/* Grid display including event data metrics and photos */}
            <div className="grid grid-cols-1 gap-8">
              
              {/* Analytics & Stats */}
              <div className="space-y-6">
                <DashboardView 
                  athletes={filteredAthletesForResults} 
                  fullAthletes={athletes}
                  metrics={filteredMetricsForResults} 
                  competitions={competitions} 
                  parentSelectedEvent={selectedEventFilter}
                  setParentSelectedEvent={setSelectedEventFilter}
                  onUpdateAthletePhoto={handleUpdateAthletePhoto}
                  onUpdateAthlete={handleEditAthlete}
                  onAddMetric={handleAddMetric}
                  onEditMetric={handleEditMetric}
                  onDeleteMetric={handleDeleteMetric}
                  isAdmin={isAuthorizedAdmin}
                />
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: TOURNAMENT SEPARATE VIEW */}
        {activeTab === 'competitions' && (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-slate-200 pb-6">
              <h2 className="text-4xl sm:text-5xl font-black text-[#1F2937] tracking-tighter">Tournament Schedules</h2>
              <p className="text-base sm:text-lg text-slate-600 mt-2 max-w-3xl leading-relaxed">Browse scheduled tournaments hosted or attended by IISER Kolkata. प्रताप/Pratap (Institutional championships) are managed here.</p>
            </div>

            <div className="space-y-6">
              
              {/* BLOCK A: PRATAP COMPETITIONS PART */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-[#D62828] to-red-800 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
                  <div className="absolute right-4 top-4 opacity-10 font-bold font-mono text-8xl select-none text-white">PRTAP</div>
                  <span className="text-sm font-extrabold uppercase tracking-widest text-[#F4C430] block mb-1">Intra-mural Trophy Track</span>
                  <h3 className="text-3xl sm:text-4xl font-black mt-1">प्रताप (Pratap) Tournament</h3>
                  <p className="text-sm sm:text-base text-red-50 mt-3 leading-relaxed font-medium">
                    Exclusive annual contests organized among local sports clubs and student houses of IISER Kolkata. Points tally here determines the winner of the coveted Pratap Rolling Trophy.
                  </p>
                </div>

                <div className="space-y-4">
                  {competitions.filter(c => c.tier === 'Pratap').length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                      No Pratap competitions scheduled at present.
                    </div>
                  ) : (
                    competitions.filter(c => c.tier === 'Pratap').map((c, idx) => (
                      <div key={c.id} className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative card-lift animate-fade-slide-up stagger-${(idx % 5) + 1}`}>
                        <div className="absolute top-6 right-6">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            c.status === 'Completed' 
                              ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                              : c.status === 'Upcoming'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {c.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-w-[80%]">
                          <h4 className="font-extrabold text-[#1F2937] text-xl leading-snug">{c.title}</h4>
                          <div className="flex flex-wrap gap-2 text-sm text-slate-500 font-bold font-mono pt-1">
                            <span>Date: {c.date}</span>
                            <span>•</span>
                            <span>Time: {c.time}</span>
                            <span>•</span>
                            <span>Venue: {c.venue}</span>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 leading-relaxed mt-5 font-medium">{c.description}</p>

                        <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Disciplines Scheduled</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.events.map(ev => (
                                <span key={ev} className="bg-slate-100 text-[#1F2937] text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">{ev}</span>
                              ))}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Registered Athletes</span>
                            <span className="text-xs font-extrabold text-[#1F2937]">{c.registeredAthleteIds.length} Squad Athletes</span>
                          </div>
                        </div>

                        {/* Interactive registration block for spectator convenience */}
                        <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-600">Represent IISER-K Athletics Hub?</span>
                          <button
                            onClick={() => {
                              if (c.registrationUrl) {
                                window.open(c.registrationUrl, '_blank');
                              } else {
                                const activeAth = athletes[0]?.id;
                                if (activeAth) {
                                  handleRegisterAthleteInCompetition(c.id, activeAth);
                                  alert(`Successfully simulated registration check for first athlete ${athletes[0]?.name}!`);
                                }
                              }
                            }}
                            className="bg-[#D62828] hover:bg-red-700 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-xs"
                          >
                            {c.registrationUrl ? 'Open Registration Link' : 'Quick Registry Entry'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PHOTO GALLERY */}
        {activeTab === 'gallery' && (
          <PhotoGallery 
            athletes={athletes} 
            metrics={metrics} 
            competitions={competitions}
            isSimulatedAdmin={isAuthorizedAdmin}
            onAddMetric={handleAddMetric}
            onDeleteMetric={handleDeleteMetric}
            onEditMetric={handleEditMetric}
          />
        )}

        {/* TAB 6: ADMIN SIGN-IN WITH ID & PASSWORD */}
        {activeTab === 'admin' && (
          <div className="space-y-8 animate-fade-in">
            
            {isAuthorizedAdmin ? (
              <div className="space-y-6">
                
                {/* Logged in admin controls action bar */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-full border border-emerald-200 tracking-wider uppercase">
                          ADMINISTRATOR SESSION
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-extrabold text-[#1F2937] mt-1">
                        Signed in as Admin ID: <span className="font-mono text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{currentUserEmail || adminCredentials.id}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={() => {
                        setCurrPassInput('');
                        setNewIdInput(adminCredentials.id);
                        setNewPassInput('');
                        setConfirmPassInput('');
                        setChangeCredsError('');
                        setIsChangeCredsOpen(true);
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <KeyRound className="h-4 w-4" />
                      Change ID & Password
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          await signOut(auth);
                          setIsPasswordAdminLoggedIn(false);
                          setIsSimulatedLoggedIn(false);
                          setSimulatedEmail('');
                          setErrorMsg('');
                        } catch (err) {
                          console.error("Sign out error:", err);
                        }
                      }}
                      className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer border border-slate-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Main panel */}
                <AdminPanel 
                  athletes={athletes}
                  metrics={metrics}
                  competitions={competitions}
                  announcements={announcements}
                  admins={admins}
                  onAddAthlete={handleAddAthlete}
                  onEditAthlete={handleEditAthlete}
                  onDeleteAthlete={handleDeleteAthlete}
                  onAddMetric={handleAddMetric}
                  onEditMetric={handleEditMetric}
                  onDeleteMetric={handleDeleteMetric}
                  onAddCompetition={handleAddCompetition}
                  onEditCompetitionStatus={handleEditCompetitionStatus}
                  onDeleteCompetition={handleDeleteCompetition}
                  onAddAnnouncement={handleAddAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onAddAdmin={handleAddAdmin}
                  onDeleteAdmin={handleDeleteAdmin}
                  onUpdateLogo={handleUpdateLogo}
                  onUpdateClubLogo={handleUpdateClubLogo}
                  onUpdateAthletePhoto={handleUpdateAthletePhoto}
                  onClearAllMetrics={handleClearAllMetrics}
                  onDeleteMetricsByTournament={handleDeleteMetricsByTournament}
                  appLogo={appLogo}
                  clubLogo={clubLogo}
                  onResetToDefault={handleResetToDefault}
                />
              </div>
            ) : (
              <div className="max-w-md mx-auto my-8">
                
                {/* ID & Password Admin Login Form */}
                <div id="admin-login-card" className="relative group bg-white border border-slate-200 rounded-[36px] p-8 sm:p-10 space-y-6 shadow-xl overflow-hidden text-center">
                  
                  {/* Top Right Silhouette Accent */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-red-100 rounded-full scale-110 animate-pulse"></div>
                    <div className="relative h-14 w-14 bg-[#D62828] text-white rounded-2xl flex items-center justify-center shadow-lg z-10">
                      <Lock className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="space-y-1 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-[#1F2937] tracking-tight font-serif">Admin Login</h2>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                      Pratap IISER Kolkata Athletics Hub
                    </p>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleIdPasswordLogin} className="space-y-4 text-left relative z-10">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-[#D62828]" />
                        Admin ID / Username
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. admin"
                        value={adminIdInput}
                        onChange={(e) => setAdminIdInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-3 rounded-xl font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#D62828] focus:border-transparent transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-[#D62828]" />
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-3 pr-11 rounded-xl font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#D62828] focus:border-transparent transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-bold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-[#D62828] hover:bg-red-700 text-white font-extrabold text-sm px-6 py-3.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer mt-2"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Log In to Admin Console
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Modal for Changing Admin ID and Password */}
        <AnimatePresence>
          {isChangeCredsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 bg-blue-50 text-[#2563EB] rounded-xl flex items-center justify-center">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#1F2937]">Change Admin Credentials</h3>
                      <p className="text-[11px] font-medium text-slate-500">Update your Admin ID & Password for future logins</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChangeCredsOpen(false)}
                    className="text-slate-400 hover:text-[#1F2937] transition p-1 font-bold text-lg"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveNewCredentials} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter current password"
                      value={currPassInput}
                      onChange={(e) => setCurrPassInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-2.5 rounded-xl font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">New Admin ID / Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. admin"
                      value={newIdInput}
                      onChange={(e) => setNewIdInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-2.5 rounded-xl font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <span className="text-[10px] text-slate-500">Current ID: {adminCredentials.id}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 4 characters"
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-2.5 rounded-xl font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassInput}
                      onChange={(e) => setConfirmPassInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-sm px-4 py-2.5 rounded-xl font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  {changeCredsError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-bold">
                      {changeCredsError}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangeCredsOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-xs"
                    >
                      Save Credentials
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>

      {/* Primary visual footer */}
      <footer id="app-footer" className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                <ClubLogo className="h-6 w-6" logoUrl={appLogo} />
              </div>
              <div className="text-left">
                <span className="block font-black text-[#1F2937] uppercase tracking-tight">IISER Kolkata Athletics</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sports Secretariat Council</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <a 
                href="mailto:pratap@iiserkol.ac.in"
                className="flex items-center gap-2 text-slate-600 hover:text-[#D62828] font-bold transition bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
              <a 
                href="https://www.instagram.com/athletics.iiserk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-pink-600 font-bold transition bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </a>
              <a 
                href="https://youtube.com/@pratapathleticsmeet?si=LVAXim9Ed4WBbpfM" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-[#D62828] font-bold transition bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                <Youtube className="h-3.5 w-3.5" />
                YouTube
              </a>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
            <p className="font-medium">© 2026 Athletics Club of IISER K. Restricted Access via @iiserkol.ac.in Credentials.</p>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>G-Suite Secure Access Hub</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
