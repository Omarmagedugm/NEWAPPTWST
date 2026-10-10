import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ar } from 'date-fns/locale';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Trophy, MapPin, Edit2, Play, Users, Send, Target, X, FileText, Dribbble } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import ScoreSelector from '../components/ScoreSelector';
import { getOptimizedImage } from '../lib/cloudinary';
import { SafeImage } from '../components/SafeImage';

export default function Matches() {
  const { matches, profile } = useAppStore();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<'all' | 'football' | 'basketball'>('all');
  const [showPredictionsList, setShowPredictionsList] = useState<string | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});
  const [predictionMatchId, setPredictionMatchId] = useState<string | null>(null);
  const [homePrediction, setHomePrediction] = useState('0');
  const [awayPrediction, setAwayPrediction] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userPredictions, setUserPredictions] = useState<Record<string, any>>({});

  const isPastPredictionDeadline = (matchDate: string) => {
    const matchTime = new Date(matchDate).getTime();
    const now = new Date().getTime();
    return (matchTime - now) < (24 * 60 * 60 * 1000);
  };

  // Fetch all predictions for a specific match
  useEffect(() => {
    if (!showPredictionsList) {
      setMatchPredictions([]);
      return;
    }
    const q = query(collection(db, 'predictions'), where('matchId', '==', showPredictionsList));
    return onSnapshot(q, (snap) => {
      const allPreds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatchPredictions(allPreds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `predictions/${showPredictionsList}`);
    });
  }, [showPredictionsList]);

  // Fetch existing predictions for this user
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'predictions'), where('userId', '==', auth.currentUser.uid));
    return onSnapshot(q, (snap) => {
      const preds: Record<string, any> = {};
      snap.forEach(doc => {
        const data = doc.data();
        preds[data.matchId] = { id: doc.id, ...data };
      });
      setUserPredictions(preds);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'predictions-user');
    });
  }, [auth.currentUser]);

  const handleSavePrediction = async () => {
    if (!auth.currentUser || !predictionMatchId) return;
    
    const hScore = parseInt(homePrediction);
    const aScore = parseInt(awayPrediction);
    
    if (isNaN(hScore) || isNaN(aScore) || hScore < 0 || aScore < 0) {
      setSubmitError('يرجى إدخال أرقام صحيحة');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const match = matches.find(m => m.id === predictionMatchId);
      if (match && isPastPredictionDeadline(match.date)) {
        setSubmitError('عذراً، لا يمكن تغيير التوقع قبل المباراة بأقل من 24 ساعة');
        setIsSubmitting(false);
        return;
      }

      const predData = {
        matchId: predictionMatchId,
        userId: auth.currentUser.uid,
        userName: profile.name || auth.currentUser.displayName || 'مشجع',
        userEmail: auth.currentUser.email,
        homeScore: hScore,
        awayScore: aScore,
        createdAt: new Date().toISOString()
      };

      // Check if already exists to update or create
      const existing = userPredictions[predictionMatchId];
      if (existing) {
        await setDoc(doc(db, 'predictions', existing.id), predData);
      } else {
        await addDoc(collection(db, 'predictions'), predData);
      }

      setPredictionMatchId(null);
    } catch (error) {
      setSubmitError('حدث خطأ أثناء حفظ التوقع. يرجى المحاولة مرة أخرى.');
      handleFirestoreError(error, OperationType.WRITE, 'predictions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const hasLiveRunningMatch = matches.some(m => m.status === 'live' && m.isTimerRunning);

  useEffect(() => {
    if (!hasLiveRunningMatch) return;
    const interval = setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasLiveRunningMatch]);

  const calculateCurrentTimeFormat = (match: any) => {
    const isBasketball = match.sport === 'basketball';
    const defaultBase = isBasketball ? 10 : 0;
    const baseMin = (match.timerBaseMinute !== undefined && match.timerBaseMinute !== null && match.timerBaseMinute !== '')
      ? Number(match.timerBaseMinute)
      : defaultBase;

    if (!match.isTimerRunning || !match.timerStartTime) {
      return `${String(baseMin).padStart(2, '0')}:00${isBasketball ? '' : "'"}`;
    }
    const start = new Date(match.timerStartTime).getTime();
    if (isNaN(start)) {
      return `${String(baseMin).padStart(2, '0')}:00${isBasketball ? '' : "'"}`;
    }
    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - start) / 1000));
    
    if (isBasketball) {
      // Basketball countdown timer
      const baseSeconds = baseMin * 60;
      const remainingSeconds = Math.max(0, baseSeconds - totalSeconds);
      const mm = Math.floor(remainingSeconds / 60);
      const ss = remainingSeconds % 60;
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    } else {
      // Football count up
      const baseSeconds = baseMin * 60;
      const currentSeconds = baseSeconds + totalSeconds;
      const mm = Math.floor(currentSeconds / 60);
      const ss = currentSeconds % 60;
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}'`;
    }
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = new Date(a.date || 0).getTime();
    const timeB = new Date(b.date || 0).getTime();

    // 1. Live matches first
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (a.status !== 'live' && b.status === 'live') return 1;

    // 2. Upcoming matches before finished
    if (a.status === 'upcoming' && b.status === 'finished') return -1;
    if (a.status === 'finished' && b.status === 'upcoming') return 1;

    // 3. For upcoming matches: closest date/time first (ascending order)
    if (a.status === 'upcoming' && b.status === 'upcoming') {
      return timeA - timeB;
    }

    // 4. For finished matches: most recently finished first (descending order)
    if (a.status === 'finished' && b.status === 'finished') {
      return timeB - timeA;
    }

    return timeA - timeB;
  });

  const getNewestMatch = (sportMatches: any[]) => {
    return sportMatches.find(m => m.status === 'live') || sportMatches.find(m => m.status === 'upcoming') || sportMatches[0];
  };

  const footballMatches = sortedMatches.filter(m => m.sport === 'football' || !m.sport);
  const basketballMatches = sortedMatches.filter(m => m.sport === 'basketball');

  const sportSections = [
    { 
      id: 'football', 
      title: 'مباريات', 
      subtitle: 'Football Matches', 
      matches: footballMatches, 
      newestMatch: getNewestMatch(footballMatches),
      icon: <Trophy size={16} className="text-primary" /> 
    },
    { 
      id: 'basketball', 
      title: 'مباريات كرة السلة', 
      subtitle: 'Basketball Matches', 
      matches: basketballMatches, 
      newestMatch: getNewestMatch(basketballMatches),
      icon: <Dribbble size={16} className="text-[#ea580c]" /> 
    }
  ].filter(section => selectedSport === 'all' || section.id === selectedSport);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0, 
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  } as const;

  const seasonStats = matches.filter(m => m.status === 'finished' && (m.homeTeam === 'الاتحاد' || m.awayTeam === 'الاتحاد')).reduce((acc, match) => {
    const isHome = match.homeTeam === 'الاتحاد';
    const homeScore = parseInt(match.homeScore);
    const awayScore = parseInt(match.awayScore);
    
    if (homeScore === awayScore) {
      acc.draws += 1;
    } else if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) {
      acc.wins += 1;
    } else {
      acc.losses += 1;
    }
    return acc;
  }, { wins: 0, draws: 0, losses: 0 });

  const totalGames = (seasonStats.wins + seasonStats.draws + seasonStats.losses) || 1;
  const winRate = (seasonStats.wins / totalGames) * 100;
  const drawRate = (seasonStats.draws / totalGames) * 100;
  const lossRate = (seasonStats.losses / totalGames) * 100;

  return (
    <div className="flex-1 w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto flex flex-col pb-32 md:pb-16 px-0 md:px-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="sticky top-[65px] z-30 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl px-4 py-2 border-b border-border-light/40 dark:border-border-dark/40 flex flex-col gap-2">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-surface-dark rounded-2xl">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'football', label: 'كرة القدم' },
            { id: 'basketball', label: 'كرة السلة' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setSelectedSport(tab.id as any)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all duration-300 ${
                selectedSport === tab.id 
                  ? 'bg-white dark:bg-primary text-primary-dark dark:text-white shadow-premium' 
                  : 'text-slate-500 hover:text-primary-dark dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <motion.main 
        key={selectedSport}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-x-hidden px-4 pt-2 pb-6 flex flex-col gap-8"
      >
        {/* Matches Feed Upgrade */}
        <motion.section variants={itemVariants} className="space-y-12">
          {sportSections.map((section) => (
            section.matches.length > 0 && (
              <div key={section.id} className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex flex-col">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none uppercase flex items-center gap-2">
                       {section.icon}
                       {section.title}
                    </h2>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{section.subtitle}</span>
                  </div>
                </div>

                {section.newestMatch && (
                  <motion.div variants={itemVariants}>
                    <div className={`relative w-full rounded-[40px] overflow-hidden shadow-2xl ${section.id === 'basketball' ? 'bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12] border border-orange-400/40' : 'stadium-gradient border border-white/5'} cinematic-glow`}>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay rounded-[inherit]"></div>
                      
                      {section.id === 'basketball' && (
                        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-[inherit]">
                          <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 400 200">
                            <defs>
                              <pattern id="bb-pebbles-matches" width="16" height="16" patternUnits="userSpaceOnUse">
                                <circle cx="4" cy="4" r="1.2" fill="#000000" opacity="0.35" />
                                <circle cx="12" cy="12" r="1.2" fill="#000000" opacity="0.35" />
                                <circle cx="12" cy="4" r="0.8" fill="#ffffff" opacity="0.25" />
                                <circle cx="4" cy="12" r="0.8" fill="#ffffff" opacity="0.25" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#bb-pebbles-matches)" />
                            <path d="M -50,100 Q 200,-30 450,100" fill="none" stroke="#000000" strokeWidth="4" opacity="0.25" />
                            <path d="M -50,100 Q 200,230 450,100" fill="none" stroke="#000000" strokeWidth="4" opacity="0.25" />
                            <line x1="200" y1="-20" x2="200" y2="220" stroke="#000000" strokeWidth="4" opacity="0.25" />
                            <line x1="-20" y1="100" x2="420" y2="100" stroke="#000000" strokeWidth="4" opacity="0.25" />
                            <circle cx="200" cy="100" r="55" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" opacity="0.15" />
                          </svg>
                          <div className="absolute inset-0 bg-radial from-orange-400/30 via-transparent to-black/60 mix-blend-overlay pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#431407]/90 via-transparent to-[#431407]/40" />
                        </div>
                      )}
                      
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[9px] font-black text-white ring-1 ring-white/20 uppercase tracking-widest">
                            {section.id === 'basketball' ? <Dribbble size={10} className="text-orange-400" /> : <Trophy size={10} className="text-accent" />}
                            {section.newestMatch.competition}
                          </div>
                          <div className="flex flex-col items-end shrink-0 max-w-[60%]">
                            <div className="flex flex-col items-center text-white/90 text-[8px] sm:text-[10px] font-black max-w-full w-fit bg-black/30 px-2.5 py-1 rounded-xl border border-white/10 leading-tight">
                              <span className="whitespace-nowrap max-w-full">{format(new Date(section.newestMatch.date), 'd MMMM yyyy', { locale: ar })}</span>
                              <div className="flex items-center gap-1 whitespace-nowrap max-w-full">
                                <span className="text-amber-400 font-black">{format(new Date(section.newestMatch.date), 'h:mm a', { locale: ar })}</span>
                                <span className="text-white/60">-</span>
                                <span>{format(new Date(section.newestMatch.date), 'EEEE', { locale: ar })}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center items-center gap-4 sm:gap-8 my-2">
                          <div className="flex flex-col items-center gap-2 sm:gap-4 w-20 sm:w-32 shrink-0">
                            <div className="w-18 h-18 sm:w-24 sm:h-24 shrink-0 bg-white/10 backdrop-blur-xl rounded-[24px] sm:rounded-[32px] p-2.5 sm:p-4 flex items-center justify-center ring-1 ring-white/20 shadow-premium animate-float">
                              <SafeImage teamName={section.newestMatch.homeTeam} src={section.newestMatch.homeLogo} width={200} className="w-full h-full object-contain filter drop-shadow-2xl" />
                            </div>
                            <span className={`text-white font-black text-center uppercase tracking-widest whitespace-nowrap max-w-full w-full ${((section.newestMatch.homeTeam || '').trim().includes(' ') || (section.newestMatch.homeTeam || '').length > 7) ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-[11px]'}`}>{section.newestMatch.homeTeam}</span>
                          </div>

                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`font-black text-white tracking-widest flex items-center justify-center gap-1 sm:gap-2 tabular-nums ${String(section.newestMatch.homeScore).length > 2 || String(section.newestMatch.awayScore).length > 2 ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-5xl'} ${section.id === 'basketball' ? 'drop-shadow-[0_5px_15px_rgba(234,88,12,0.3)]' : 'drop-shadow-[0_5px_15px_rgba(46,204,113,0.3)]'}`}>
                              {section.newestMatch.status === 'upcoming' ? (
                                <span className="text-2xl opacity-40 italic">VS</span>
                              ) : (
                                <>
                                  <span>{section.newestMatch.homeScore}</span>
                                  <span className={`${section.id === 'basketball' ? 'text-orange-400' : 'text-accent'} opacity-50`}>:</span>
                                  <span>{section.newestMatch.awayScore}</span>
                                </>
                              )}
                            </div>
                            {section.newestMatch.status === 'live' && (
                               <div className="mt-4 flex flex-col items-center gap-2">
                                 <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full animate-pulse shadow-glow">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                    <span className="text-white text-[9px] font-black tracking-widest">بث مباشر</span>
                                 </div>
                               </div>
                            )}
                            {section.newestMatch.status === 'live' && (
                              <div className="mt-2 text-white font-digital font-black text-[12px] tabular-nums text-center tracking-widest">
                                {calculateCurrentTimeFormat(section.newestMatch)}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-2 sm:gap-4 w-20 sm:w-32 shrink-0">
                            <div className="w-18 h-18 sm:w-24 sm:h-24 shrink-0 bg-white/10 backdrop-blur-xl rounded-[24px] sm:rounded-[32px] p-2.5 sm:p-4 flex items-center justify-center ring-1 ring-white/20 shadow-premium animate-float [animation-delay:0.5s]">
                              <SafeImage teamName={section.newestMatch.awayTeam} src={section.newestMatch.awayLogo} width={200} className="w-full h-full object-contain filter drop-shadow-2xl" />
                            </div>
                            <span className={`text-white font-black text-center uppercase tracking-widest whitespace-nowrap max-w-full w-full ${((section.newestMatch.awayTeam || '').trim().includes(' ') || (section.newestMatch.awayTeam || '').length > 7) ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-[11px]'}`}>{section.newestMatch.awayTeam}</span>
                          </div>
                        </div>

                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {section.newestMatch.status === 'live' && (
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/live')}
                                className="h-12 bg-red-600 text-white font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-premium animate-pulse shadow-red-500/20"
                              >
                                  <Play size={16} fill="white" />
                                  البث المباشر
                              </motion.button>
                            )}
                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              onClick={() => navigate('/news')}
                              className={`h-12 font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 shadow-2xl transition-all ${
                                section.newestMatch.status === 'live' 
                                  ? 'bg-white/10 backdrop-blur-md text-white border border-white/20' 
                                  : 'bg-white text-primary-dark'
                              }`}
                            >
                                <span className="material-symbols-outlined font-variation-settings-fill !text-[20px]">article</span>
                                تغطية المباراة
                            </motion.button>
                            {section.newestMatch.status === 'finished' && (
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/library?tab=videos')}
                                className="h-12 bg-white/10 backdrop-blur-md text-white border border-white/20 font-black text-[11px] rounded-2xl flex items-center justify-center gap-2 transition-all"
                              >
                                  <Play size={16} fill="white" />
                                  ملخص المباراة
                              </motion.button>
                            )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                  {section.matches.slice(0, visibleCount[section.id] || 5).map((match) => (
                    <motion.div 
                      key={match.id} 
                      className={`flex flex-col glass-card p-5 rounded-[32px] border shadow-premium overflow-hidden relative group transition-all duration-300 ${match.status === 'live' ? 'border-red-500/30' : 'hover:border-primary/40 text-slate-400'}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(match.status === 'live' ? '/live' : '/matches')}
                    >
                      {match.status === 'live' && (
                        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse"></div>
                      )}
                      
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-100 dark:bg-surface-dark rounded-lg text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                            {match.sport === 'basketball' ? <Dribbble size={10} className="text-orange-500" /> : <Trophy size={10} />}
                            {match.competition}
                          </div>
                          {match.isMatchDay && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/20 text-accent rounded-lg text-[8px] font-black uppercase tracking-tighter ring-1 ring-accent/30">
                              Match Day
                            </div>
                          )}
                          {match.stadium && (
                            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
                              <MapPin size={8} />
                              {match.stadium}
                            </div>
                          )}
                          {match.sport === 'basketball' && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-[8px] font-black uppercase tracking-tighter ring-1 ring-orange-500/30">
                              <FileText size={10} />
                              تغطية شاملة
                            </div>
                          )}
                        </div>
                        <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                          match.status === 'live' ? 'bg-red-500 text-white animate-pulse' : 
                          match.status === 'finished' ? 'bg-slate-100 dark:bg-surface-dark text-slate-400' : 
                          'bg-primary/10 text-primary'
                        }`}>
                          {match.status === 'live' ? 'بث مباشر' : match.status === 'finished' ? 'انتهت' : 'قيد الانتظار'}
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-4 sm:gap-8">
                        <div className="flex flex-col items-center gap-2 sm:gap-3 w-20 sm:w-28 shrink-0 group/team">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-slate-50 dark:bg-background-dark rounded-2xl p-2 sm:p-3 shadow-inner ring-1 ring-border-light dark:ring-border-dark flex items-center justify-center transition-transform group-hover/team:scale-110">
                            <SafeImage teamName={match.homeTeam} src={match.homeLogo} width={100} className="w-full h-full object-contain filter drop-shadow-md" />
                          </div>
                          <span className={`font-black text-slate-800 dark:text-white uppercase text-center whitespace-nowrap max-w-full w-full ${((match.homeTeam || '').trim().includes(' ') || (match.homeTeam || '').length > 7) ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-xs'}`}>{match.homeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`font-black text-slate-800 dark:text-white tabular-nums flex items-center justify-center gap-1 sm:gap-3 filter drop-shadow-md ${String(match.homeScore).length > 2 || String(match.awayScore).length > 2 ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>
                            {match.status === 'upcoming' ? (
                              <span className="text-xs sm:text-sm opacity-20 italic">VS</span>
                            ) : (
                              <>
                                <span>{match.homeScore}</span>
                                <span className={`opacity-20 text-sm sm:text-xl`}>-</span>
                                <span>{match.awayScore}</span>
                              </>
                            )}
                          </div>
                          {match.status === 'live' && (
                            <span className="text-[12px] font-digital font-black text-red-500 mt-2 tracking-widest">{calculateCurrentTimeFormat(match)}</span>
                          )}
                          {match.status === 'finished' && (
                            <span className="text-[9px] font-black text-slate-500 mt-2 bg-slate-100 dark:bg-surface-dark px-2 whitespace-nowrap rounded border border-slate-200 dark:border-border-dark py-1">المباراة انتهت</span>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-2 sm:gap-3 w-20 sm:w-28 shrink-0 group/team">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-slate-50 dark:bg-background-dark rounded-2xl p-2 sm:p-3 shadow-inner ring-1 ring-border-light dark:ring-border-dark flex items-center justify-center transition-transform group-hover/team:scale-110 [animation-delay:0.5s]">
                            <SafeImage teamName={match.awayTeam} src={match.awayLogo} width={100} className="w-full h-full object-contain filter drop-shadow-md" />
                          </div>
                          <span className={`font-black text-slate-800 dark:text-white uppercase text-center whitespace-nowrap max-w-full w-full ${((match.awayTeam || '').trim().includes(' ') || (match.awayTeam || '').length > 7) ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-xs'}`}>{match.awayTeam}</span>
                        </div>
                      </div>
                      <div className="mt-5 pt-3 border-t border-border-light/40 dark:border-border-dark/40 flex flex-wrap items-center justify-between gap-2 max-w-full">
                         <div className="flex flex-wrap items-center gap-2 max-w-full min-w-0">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[8px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 max-w-full w-fit bg-slate-50 dark:bg-surface-dark shrink-0">
                              <Calendar size={12} className="shrink-0 text-primary" />
                              <div className="flex flex-col max-w-full leading-tight">
                                <span className="whitespace-nowrap">{format(new Date(match.date), 'd MMMM yyyy', { locale: ar })}</span>
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <span className="text-amber-500 dark:text-amber-400 font-black">{format(new Date(match.date), 'h:mm a', { locale: ar })}</span>
                                  <span>-</span>
                                  <span>{format(new Date(match.date), 'EEEE', { locale: ar })}</span>
                                </div>
                              </div>
                            </div>
                            {auth.currentUser && (
                              <div className="flex items-center gap-2">
                                {match.status === 'upcoming' && (
                                  <button 
                                    disabled={isPastPredictionDeadline(match.date)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPredictionMatchId(match.id);
                                      const existing = userPredictions[match.id];
                                      setHomePrediction(existing ? String(existing.homeScore) : '0');
                                      setAwayPrediction(existing ? String(existing.awayScore) : '0');
                                    }}
                                    className={`h-6 px-3 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all ${isPastPredictionDeadline(match.date) ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : userPredictions[match.id] ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white'}`}
                                  >
                                    <Target size={10} />
                                    {isPastPredictionDeadline(match.date) ? 'انتهت مهلة التوقع' : userPredictions[match.id] ? 'تعديل التوقع' : 'توقع النتيجة'}
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPredictionsList(match.id);
                                  }}
                                  className="h-6 px-3 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                  <Users size={10} />
                                  توقعات الجماهير
                                </button>
                              </div>
                            )}
                         </div>
                          <div className="flex items-center gap-2">
                            {match.status === 'live' && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/live');
                                }}
                                className="h-8 px-3 rounded-xl bg-red-600 text-white flex items-center justify-center gap-1.5 text-[9px] font-black hover:bg-red-700 transition-all cursor-pointer shadow-glow animate-pulse"
                              >
                                <Play size={10} fill="currentColor" />
                                بث مباشر
                              </div>
                            )}
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/news');
                              }}
                              className="h-8 px-3 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[9px] font-black hover:bg-primary hover:text-white transition-all cursor-pointer"
                            >
                                التغطية
                                <ChevronRight size={12} strokeWidth={3} className="rotate-180 mr-1" />
                            </div>
                          </div>
                      </div>

                      {profile?.role === 'admin' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/admin', { state: { editCategory: 'matches', editId: match.id } });
                          }}
                          className="absolute top-4 right-4 p-2.5 bg-accent/10 text-accent rounded-2xl border border-accent/20 pressable opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                  {section.matches.length > (visibleCount[section.id] || 5) && (
                    <button 
                      onClick={() => setVisibleCount(prev => ({ ...prev, [section.id]: (prev[section.id] || 5) + 5 }))}
                      className="w-full h-12 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl flex items-center justify-center font-black text-xs text-primary shadow-sm hover:scale-[1.02] active:scale-95 transition-all mt-2"
                    >
                      المزيد من المباريات
                    </button>
                  )}
                </div>
              </div>
            )
          ))}
          
          {sortedMatches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 glass-card rounded-[40px] border-dashed border-2 border-slate-200 dark:border-border-dark text-slate-400">
                <span className="material-symbols-outlined !text-4xl mb-4 opacity-20">sports_soccer</span>
                <span className="font-bold text-sm">لا توجد مواجهات مسجلة حالياً</span>
              </div>
          )}
        </motion.section>

        {/* Season Statistics Upgrade */}
        <motion.section variants={itemVariants} className="mt-4">
           <div className="glass-card p-6 rounded-[32px] shadow-premium">
              <div className="flex items-center justify-between mb-8">
                <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  تحليل أداء الموسم
                </h4>
                <div className="h-8 px-3 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-[9px] font-black text-slate-500">
                  Total Games: {totalGames}
                </div>
              </div>
              
              <div className="space-y-8">
                 {[
                   { label: 'انتصارات', count: seasonStats.wins, rate: winRate, color: 'bg-accent' },
                   { label: 'تعادلات', count: seasonStats.draws, rate: drawRate, color: 'bg-slate-400' },
                   { label: 'هزائم', count: seasonStats.losses, rate: lossRate, color: 'bg-red-500' }
                 ].map((stat, i) => (
                   <div key={i}>
                     <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">{stat.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400">{Math.round(stat.rate)}%</span>
                          <span className={`text-xs font-black text-white px-2.5 py-1 rounded-xl shadow-premium ${stat.color}`}>{stat.count}</span>
                        </div>
                     </div>
                     <div className="w-full h-2.5 bg-slate-100 dark:bg-background-dark rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${stat.rate}%` }} 
                          transition={{ duration: 1.5, delay: i * 0.2, ease: 'circOut' }} 
                          className={`h-full rounded-full shadow-glow ${stat.color}`}
                        />
                     </div>
                   </div>
                 ))}
              </div>
           </div>
        </motion.section>
      </motion.main>
      
      {/* Prediction Modal */}
      <AnimatePresence>
        {predictionMatchId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPredictionMatchId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-card-dark rounded-[32px] p-6 shadow-2xl overflow-hidden"
            >
               <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary"></div>
               
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">توقع النتيجة</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Make your prediction</p>
                  </div>
                  <button onClick={() => { setPredictionMatchId(null); setSubmitError(null); }} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
               </div>

               {submitError && (
                 <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold">
                   <span className="material-symbols-outlined !text-lg">error</span>
                   {submitError}
                 </div>
               )}

                {(() => {
                  const match = matches.find(m => m.id === predictionMatchId);
                  if (!match) return null;
                  const isBasketball = match.sport === 'basketball';
                  
                  return (
                    <div className="flex flex-col gap-8">
                      {isBasketball ? (
                        <div className="flex flex-col gap-6">
                           <div className="text-center font-black text-[10px] text-slate-400 uppercase tracking-widest">اختر الفريق الفائز</div>
                           <div className="flex gap-4">
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setHomePrediction('1'); setAwayPrediction('0'); }}
                                className={`flex-1 flex flex-col items-center gap-4 p-5 rounded-[28px] border-2 transition-all duration-300 ${homePrediction === '1' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border-light dark:border-border-dark opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                              >
                                <div className="w-14 h-14 bg-white dark:bg-surface-dark rounded-2xl p-2.5 flex items-center justify-center border border-border-light dark:border-border-dark shadow-sm">
                                  <SafeImage teamName={match.homeTeam} src={match.homeLogo} width={150} className="w-full h-full object-contain" alt={match.homeTeam} />
                                </div>
                                <span className="text-[9px] font-black uppercase text-center line-clamp-1 h-3">{match.homeTeam}</span>
                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${homePrediction === '1' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>فوز</div>
                              </motion.button>

                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { setHomePrediction('0'); setAwayPrediction('1'); }}
                                className={`flex-1 flex flex-col items-center gap-4 p-5 rounded-[28px] border-2 transition-all duration-300 ${awayPrediction === '1' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border-light dark:border-border-dark opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                              >
                                <div className="w-14 h-14 bg-white dark:bg-surface-dark rounded-2xl p-2.5 flex items-center justify-center border border-border-light dark:border-border-dark shadow-sm">
                                  <SafeImage teamName={match.awayTeam} src={match.awayLogo} width={150} className="w-full h-full object-contain" alt={match.awayTeam} />
                                </div>
                                <span className="text-[9px] font-black uppercase text-center line-clamp-1 h-3">{match.awayTeam}</span>
                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black ${awayPrediction === '1' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>فوز</div>
                              </motion.button>
                           </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-4">
                           <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-surface-dark rounded-2xl p-3 flex items-center justify-center border border-border-light dark:border-border-dark">
                                <SafeImage teamName={match.homeTeam} src={match.homeLogo} width={150} className="w-full h-full object-contain" alt={match.homeTeam} />
                              </div>
                              <span className="text-[10px] font-black uppercase text-center w-20 line-clamp-1">{match.homeTeam}</span>
                               <ScoreSelector 
                                  value={parseInt(homePrediction) || 0}
                                  onChange={(val) => setHomePrediction(String(val))}
                                  min={0}
                                  max={10}
                               />
                           </div>

                           <div className="text-2xl font-black text-slate-300">VS</div>

                           <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 dark:bg-surface-dark rounded-2xl p-3 flex items-center justify-center border border-border-light dark:border-border-dark">
                                <SafeImage teamName={match.awayTeam} src={match.awayLogo} width={150} className="w-full h-full object-contain" alt={match.awayTeam} />
                              </div>
                              <span className="text-[10px] font-black uppercase text-center w-20 line-clamp-1">{match.awayTeam}</span>
                               <ScoreSelector 
                                  value={parseInt(awayPrediction) || 0}
                                  onChange={(val) => setAwayPrediction(String(val))}
                                  min={0}
                                  max={10}
                               />
                           </div>
                        </div>
                      )}

                     <button 
                       onClick={handleSavePrediction}
                       disabled={isSubmitting}
                       className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                     >
                       {isSubmitting ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                       ) : (
                         <>
                           <Send size={18} />
                           حفظ التوقع وتأكيده
                         </>
                       )}
                     </button>
                   </div>
                 );
               })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Predictions list modal */}
      <AnimatePresence>
        {showPredictionsList && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPredictionsList(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-card-dark rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase leading-none">توقعات الجمهور</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Community Predictions</p>
                  </div>
                  <button onClick={() => setShowPredictionsList(null)} className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {matchPredictions.length > 0 ? (
                    matchPredictions.map((pred) => {
                      const match = matches.find(m => m.id === pred.matchId);
                      const isFinished = match?.status === 'finished';
                      const isBasketball = match?.sport === 'basketball';
                      const isCorrect = isBasketball 
                        ? (isFinished && ((Number(match.homeScore) > Number(match.awayScore) && Number(pred.homeScore) > Number(pred.awayScore)) || (Number(match.awayScore) > Number(match.homeScore) && Number(pred.awayScore) > Number(pred.homeScore))))
                        : (isFinished && Number(match.homeScore) === Number(pred.homeScore) && Number(match.awayScore) === Number(pred.awayScore));
                      
                      return (
                        <div key={pred.id} className={`p-4 rounded-2xl border ${isCorrect ? 'border-green-500 bg-green-50/20 dark:bg-green-900/10' : 'border-border-light dark:border-border-dark bg-slate-50 dark:bg-surface-dark'} flex items-center justify-between transition-all group`}>
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                               <span className={`text-[11px] font-black uppercase ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>{pred.userName}</span>
                               {isFinished && (
                                  <div className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isCorrect ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-red-100 text-red-700'}`}>
                                    {isCorrect ? (
                                      <>
                                        <span className="material-symbols-outlined !text-[10px]">stars</span>
                                        توقع صحيح
                                      </>
                                    ) : (
                                      <>
                                        <X size={8} />
                                        غير دقيق
                                      </>
                                    )}
                                  </div>
                               )}
                             </div>
                             <span className="text-[9px] font-bold text-slate-400">{format(new Date(pred.createdAt), 'dd/MM HH:mm')}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {isBasketball ? (
                               <div className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase shadow-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                                 فوز {pred.homeScore > pred.awayScore ? match?.homeTeam : match?.awayTeam}
                               </div>
                             ) : (
                               <>
                                 <div className="flex flex-col items-center">
                                   <span className={`w-8 h-8 flex items-center justify-center border rounded-lg font-black text-sm ${isCorrect ? 'bg-white dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-800 dark:text-white'}`}>{pred.homeScore}</span>
                                 </div>
                                 <span className={`text-sm font-black ${isCorrect ? 'text-green-400' : 'text-slate-300'}`}>-</span>
                                 <div className="flex flex-col items-center">
                                   <span className={`w-8 h-8 flex items-center justify-center border rounded-lg font-black text-sm ${isCorrect ? 'bg-white dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-800 dark:text-white'}`}>{pred.awayScore}</span>
                                 </div>
                               </>
                             )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center text-slate-400 font-bold text-xs">
                      لا توجد توقعات لهذا اللقاء بعد
                    </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

