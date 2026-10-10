import { Link, useNavigate } from "react-router-dom";
import { updateDoc, serverTimestamp } from "firebase/firestore";
import { useAppStore, HomeSection, isStreamHidden } from "../store";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import {
  Menu,
  LayoutDashboard,
  Flag,
  Info,
  ShieldCheck,
  Mail,
  Edit2,
  Bell,
  Search,
  Settings,
  CloudSun,
  Cloud,
  CloudMoon,
  Moon,
  MapPin,
  Sunrise,
  Sunset,
  Thermometer,
  Trophy,
  CloudRain,
  Sun,
  Snowflake,
  CloudLightning,
  Activity,
  BarChart2,
  Dribbble,
  Plus,
  Minus,
  Play,
  CheckCircle2,
  Sparkles,
  Users,
  Building2,
} from "lucide-react";
import { onSnapshot, doc } from "firebase/firestore";
import HomeSkeleton from "../components/HomeSkeleton";
import { SafeImage } from "../components/SafeImage";
import { getOptimizedImage } from "../lib/cloudinary";

// Lazy-loaded secondary widgets to accelerate initial page paint
const AdvertiseWidget = lazy(() => import("../components/AdvertiseWidget"));
const TicketsWidget = lazy(() => import("../components/TicketsWidget"));
const HtmlWidget = lazy(() => import("../components/HtmlWidget"));
const ClubMembersWidget = lazy(() => import("../components/ClubMembersWidget"));
const BusinessWidget = lazy(() => import("../components/BusinessWidget"));
const WorldFansWidget = lazy(() => import("../components/worldFans/WorldFansWidget"));
const PublicServicesWidget = lazy(() => import("../components/widgets/PublicServicesWidget"));
const VideoEmbedWidget = lazy(() => import("../components/widgets/VideoEmbedWidget"));

function WidgetSkeletonFallback() {
  return (
    <div className="w-full h-32 rounded-3xl bg-slate-100/60 dark:bg-surface-dark/40 border border-slate-200/50 dark:border-white/5 animate-pulse" />
  );
}

function LiveMatchTimeDisplay({ match }: { match: any }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!match?.isTimerRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [match?.isTimerRunning, match?.timerStartTime]);

  if (!match) return null;
  const isBasketball = match.sport === 'basketball';
  const defaultBase = isBasketball ? 10 : 0;
  const baseMin = (match.timerBaseMinute !== undefined && match.timerBaseMinute !== null && match.timerBaseMinute !== '')
    ? Number(match.timerBaseMinute)
    : defaultBase;

  if (!match.isTimerRunning || !match.timerStartTime) {
    return <span>{`${String(baseMin).padStart(2, '0')}:00${isBasketball ? '' : "'"}`}</span>;
  }
  const start = new Date(match.timerStartTime).getTime();
  if (isNaN(start)) {
    return <span>{`${String(baseMin).padStart(2, '0')}:00${isBasketball ? '' : "'"}`}</span>;
  }
  const totalSeconds = Math.max(0, Math.floor((now - start) / 1000));
  if (isBasketball) {
    // Basketball countdown timer
    const baseSeconds = baseMin * 60;
    const remainingSeconds = Math.max(0, baseSeconds - totalSeconds);
    const mm = Math.floor(remainingSeconds / 60);
    const ss = remainingSeconds % 60;
    return <span>{`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`}</span>;
  }
  const baseSeconds = baseMin * 60;
  const currentSeconds = baseSeconds + totalSeconds;
  const mm = Math.floor(currentSeconds / 60);
  const ss = currentSeconds % 60;
  return <span>{`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}'`}</span>;
}

export default function Home() {
  const {
    news,
    media,
    matches,
    liveStream,
    liveStreams,
    profile,
    homeSections,
    cityInfo,
    ads,
    appSettings,
    newsTags,
    stadiumOpacity,
    setStadiumOpacity,
    dataLoaded,
    sectionFlags,
    aiConfig: storeAiConfig
  } = useAppStore();
  const [clarityOpen, setClarityOpen] = useState(false);
  
  const aiConfig = storeAiConfig || { 
    enabled: true, 
    bannerTitle: 'استوديو المشجع الاتحادي', 
    bannerDescription: 'حول صورتك بالذكاء الاصطناعي وارتدي تيشيرت نادي الاتحاد في معقل زعيم الثغر',
    bannerImage: ''
  };

  const isOmar = auth.currentUser?.email?.toLowerCase() === "omarmagedugm@ittihad.club";
  const isDev = auth.currentUser?.email?.toLowerCase() === "copyrightofficialco@gmail.com";
  const isAdmin = (auth.currentUser && (profile?.role === "admin" || profile?.role === "moderator" || (profile?.roles && profile?.roles.length > 0))) || isOmar || isDev;
  const [selectedSport, setSelectedSport] = useState<"football" | "basketball" | "auto">(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem("selected_sport") : null;
      return (saved as "football" | "basketball" | "auto") || "auto";
    } catch (e) {
      return "auto";
    }
  });
  const [autoWeather, setAutoWeather] = useState<{
    temp: string;
    condition: string;
    sunrise: string;
    sunset: string;
    isDay?: boolean;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (appSettings?.defaultSport && selectedSport === "auto") {
      setSelectedSport(appSettings.defaultSport);
    }
  }, [appSettings?.defaultSport, selectedSport]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem("selected_sport", selectedSport);
    } catch (e) {}
  }, [selectedSport]);

  useEffect(() => {
    const citySection = homeSections.find(
      (s) => s.type === "city" || s.id === "city",
    );
    if (citySection?.active && (!cityInfo || cityInfo.active !== false)) {
      // Check session cache first (15 mins valid)
      try {
        const cached = sessionStorage.getItem('ittihad_alex_weather');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && (Date.now() - parsed.ts < 15 * 60 * 1000)) {
            setAutoWeather(parsed.data);
            return;
          }
        }
      } catch (e) {}

      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=31.2001&longitude=29.9187&current_weather=true&daily=sunrise,sunset&timezone=Africa%2FCairo&forecast_days=1",
      )
        .then(async (r) => {
          if (!r.ok) {
            throw new Error(`Weather API responded with status: ${r.status}`);
          }
          return r.json();
        })
        .then((data) => {
          if (
            !data ||
            !data.current_weather ||
            !data.daily ||
            !data.daily.sunrise ||
            !data.daily.sunset
          )
            return;

          const weatherCodeToText = (code: number) => {
            if (code === 0) return "sun";
            if (code === 1) return "sun";
            if (code === 2) return "partly_cloudy";
            if (code === 3) return "cloudy";
            if (code === 45 || code === 48) return "foggy";
            if (code >= 51 && code <= 55) return "drizzle";
            if (code >= 61 && code <= 65) return "rainy";
            if (code >= 71 && code <= 75) return "snowy";
            if (code >= 80 && code <= 82) return "showers";
            if (code >= 95) return "thunderstorm";
            return "cloudy";
          };

          const formatTime = (timeStr: string) => {
            try {
              if (!timeStr) return "--:--";
              const date = new Date(timeStr);
              if (isNaN(date.getTime())) return "--:--";
              let hours = date.getHours();
              const mins = date.getMinutes().toString().padStart(2, "0");
              const ampm = hours >= 12 ? "PM" : "AM";
              hours = hours % 12;
              hours = hours ? hours : 12;
              return `${hours}:${mins} ${ampm}`;
            } catch (e) {
              return "--:--";
            }
          };

          const weatherPayload = {
            temp: Math.round(data.current_weather.temperature ?? 25).toString(),
            condition: weatherCodeToText(data.current_weather.weathercode ?? 0),
            sunrise: formatTime(data.daily.sunrise[0]),
            sunset: formatTime(data.daily.sunset[0]),
            isDay: data.current_weather.is_day === 1,
          };

          setAutoWeather(weatherPayload);
          try {
            sessionStorage.setItem('ittihad_alex_weather', JSON.stringify({ ts: Date.now(), data: weatherPayload }));
          } catch (e) {}
        })
        .catch((err) => {
          console.warn("Weather fetch suppressed:", err.message);
        });
    }
  }, [homeSections, cityInfo?.active]);

  const handleScoreUpdate = async (matchId: string, team: 'home' | 'away', change: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const currentScore = team === 'home' ? parseInt(match.homeScore || "0") : parseInt(match.awayScore || "0");
    const newScore = Math.max(0, currentScore + change);

    try {
      await updateDoc(doc(db, 'matches', matchId), {
        [team === 'home' ? 'homeScore' : 'awayScore']: newScore.toString(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  const handleStatusUpdate = async (matchId: string, newStatus: 'live' | 'finished' | 'upcoming', toggleTimer?: boolean) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (toggleTimer !== undefined) {
        updates.isTimerRunning = !match.isTimerRunning;
        if (updates.isTimerRunning) {
          updates.timerStartTime = new Date().toISOString();
        } else {
          // Store current minute as base before stopping
          const now = new Date();
          const start = match.timerStartTime ? new Date(match.timerStartTime) : now;
          const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
          if (match.sport === 'basketball') {
            const currentBase = typeof match.timerBaseMinute === 'number' ? match.timerBaseMinute : (Number(match.timerBaseMinute) || 10);
            updates.timerBaseMinute = Math.max(0, currentBase - diffMinutes);
          } else {
            updates.timerBaseMinute = (match.timerBaseMinute || 0) + diffMinutes;
          }
        }
      } else if (newStatus === 'live' && match.status !== 'live') {
        updates.isTimerRunning = true;
        updates.timerStartTime = new Date().toISOString();
        updates.timerBaseMinute = match.sport === 'basketball' ? (match.timerBaseMinute ?? 10) : 0;
      } else if (newStatus === 'finished') {
        updates.isTimerRunning = false;
      }

      await updateDoc(doc(db, 'matches', matchId), updates);
      toast.success(toggleTimer ? (updates.isTimerRunning ? 'تم استئناف الوقت' : 'تم إيقاف الوقت مؤقتاً') : 'تم تحديث حالة المباراة');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('فشل تحديث الحالة');
    }
  };

  // Auto-start timer logic: if an upcoming match's time has passed, and we are admin, we can auto-start or prompt.
  // The user asked for "start automatically".
  useEffect(() => {
    if (!isAdmin) return;
    
    const checkUpcoming = () => {
      const now = new Date();
      matches.forEach(m => {
        if (m.status === 'upcoming' && m.date) {
          const matchDate = new Date(m.date);
          if (now >= matchDate) {
            // Auto-trigger live status
            handleStatusUpdate(m.id, 'live');
          }
        }
      });
    };

    const interval = setInterval(checkUpcoming, 30000); // Check every 30s
    checkUpcoming(); // Initial check
    return () => clearInterval(interval);
  }, [matches, isAdmin]);

  const recentNews = news.slice(0, 5);
  const recentMedia = media.slice(0, 5);

  const allFeatured = useMemo(() => matches
    .filter((m) => m.featured === true)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()), [matches]);

  const allLive = useMemo(() => matches.filter((m) => m.status === "live"), [matches]);

  const defaultSport = useMemo(() => allFeatured[0]?.sport || allLive[0]?.sport || 'football', [allFeatured, allLive]);
  
  const effectiveSport = useMemo(() => selectedSport === "auto" ? defaultSport : selectedSport, [selectedSport, defaultSport]);

  const sportMatches = useMemo(() => {
    const filtered = matches.filter(
      (m) => m.sport === effectiveSport || (!m.sport && effectiveSport === "football")
    );
    return filtered.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (a.status !== 'live' && b.status === 'live') return 1;
      if (a.status === 'upcoming' && b.status === 'finished') return -1;
      if (a.status === 'finished' && b.status === 'upcoming') return 1;
      if (a.status === 'upcoming') return timeA - timeB;
      return timeB - timeA;
    });
  }, [matches, effectiveSport]);

  // Strict hero selection that respects active filter without cross-sport fallbacks
  const heroMatch = useMemo(() => 
    sportMatches.find((m) => m.status === "live") ||
    sportMatches.find((m) => m.featured === true) ||
    sportMatches.find((m) => m.status === "upcoming") ||
    sportMatches[0], [sportMatches]); // If there are no matches, this is undefined. We do NOT fallback to another sport here to avoid bugs.

  // Logic for upcoming matches: prioritize the 'current' sport selected by user
  const currentSport = effectiveSport || "football";
  
  const upcomingMatches = matches
    .filter(
      (m) =>
        m.status === "upcoming" &&
        m.id !== heroMatch?.id &&
        (m.sport === currentSport || (!m.sport && currentSport === "football")),
    )
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
    .slice(0, 3);

  let timeLeft = { d: 0, h: 0, m: 0, s: 0 };
  let isUpcoming = false;
  if (heroMatch?.status === "upcoming" && heroMatch.date) {
    const diff = new Date(heroMatch.date).getTime() - new Date().getTime();
    if (diff > 0) {
      isUpcoming = true;
      timeLeft = {
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60),
      };
    }
  }

  const renderSection = (section: any) => {
    if (!section.active) return null;

    const hour = new Date().getHours();
    const timePhase = hour >= 6 && hour < 18 ? "day" : "night";

    const cardBg = effectiveSport === "basketball" 
      ? "bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12] border-orange-400/40" 
      : timePhase === "day" 
        ? "bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#047857] border-[#065f46]/30" 
        : "bg-gradient-to-br from-[#022c1b] via-[#044a2b] to-[#01140c] border-[#045532]/40";

    switch (
      section.type === "custom" && section.id === "city" ? "city" : section.type
    ) {
      case "hero": {
        const rawName = profile?.name || auth.currentUser?.displayName || (auth.currentUser ? 'عضو الاتحاد' : 'يا سيد البلد');
        const userAvatar = profile?.avatar || auth.currentUser?.photoURL || '';
        const userTier = profile?.tier;

        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative space-y-3.5 mb-1"
          >
            {/* Elegant Welcome Greeting Header */}
            <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
              <Link 
                to={auth.currentUser ? "/profile" : "/profile"} 
                className="flex items-center gap-3 group transition-transform active:scale-98"
              >
                <div className="relative shrink-0">
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={rawName} 
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold group-hover:scale-105 transition-all">
                      <span className="text-base font-black">
                        {rawName.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-background-dark flex items-center justify-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  </span>
                </div>

                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">أهلاً،</span>
                      <span className="text-primary dark:text-emerald-400 font-black">{rawName}</span>
                    </h2>
                    {userTier === 'premium' && (
                      <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-0.5 shadow-xs">
                        عضو ملكي 👑
                      </span>
                    )}
                    {isAdmin && (
                      <span className="bg-red-500/10 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-0.5">
                        <ShieldCheck size={10} />
                        إدارة
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>

            {!heroMatch ? (
              <div className="relative bg-slate-50 dark:bg-surface-dark p-12 rounded-[40px] flex flex-col items-center justify-center text-center gap-3 border border-dashed border-slate-300 dark:border-border-dark shadow-sm">
                {effectiveSport === "football" ? (
                  <Trophy size={48} className="text-slate-300 dark:text-slate-600" />
                ) : (
                  <Dribbble size={48} className="text-slate-300 dark:text-slate-600" />
                )}
                <p className="text-[11px] font-black text-slate-500">
                  لا توجد مباريات {effectiveSport === "football" ? "كرة قدم" : "كرة سلة"} حالياً
                </p>
              </div>
            ) : (
              <div className="relative">
                {isAdmin && (
                  <button
                    onClick={() =>
                      navigate("/admin", {
                        state: { editCategory: "matches", editId: heroMatch.id },
                      })
                    }
                    className="absolute -top-2 -right-2 z-40 p-2.5 bg-accent text-white rounded-2xl shadow-premium shadow-accent/20 pressable"
                  >
                    <Edit2 size={16} />
                  </button>
                )}

                <div className="relative rounded-[40px] shadow-2xl overflow-hidden">
                  <div className={`relative w-full h-full cinematic-glow ${cardBg} border p-5 sm:p-6 rounded-[40px]`}>
                    {/* Background Effects Container */}
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none rounded-[40px]">
                      {/* Stadium Image Background */}
                      <div className="absolute inset-0 z-0 rounded-[40px] overflow-hidden">
                        {heroMatch?.stadiumImage ? (
                          <img 
                            src={getOptimizedImage(heroMatch.stadiumImage, 600) || undefined} 
                            className="w-full h-full object-cover filter saturate-50 transition-all duration-500 rounded-[40px]" 
                            style={{ 
                              opacity: heroMatch?.stadiumOpacity ?? stadiumOpacity,
                              filter: `saturate(0.5) blur(${(heroMatch?.stadiumOpacity ?? stadiumOpacity) > 0.5 ? '0px' : '2px'})`
                            }}
                            alt="stadium"
                          />
                        ) : (
                          <div className={`w-full h-full rounded-[40px] ${
                            effectiveSport === "basketball"
                              ? "bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12]"
                              : "bg-gradient-to-br from-[#023823] via-[#045536] to-[#012215]"
                          }`} />
                        )}

                        {/* Basketball Texture & Court Pattern Overlay */}
                        {effectiveSport === "basketball" && (
                          <>
                            {/* Basketball Court Seam & Texture Overlay */}
                            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 400 200">
                              <defs>
                                <pattern id="bb-pebbles" width="16" height="16" patternUnits="userSpaceOnUse">
                                  <circle cx="4" cy="4" r="1.2" fill="#000000" opacity="0.35" />
                                  <circle cx="12" cy="12" r="1.2" fill="#000000" opacity="0.35" />
                                  <circle cx="12" cy="4" r="0.8" fill="#ffffff" opacity="0.25" />
                                  <circle cx="4" cy="12" r="0.8" fill="#ffffff" opacity="0.25" />
                                </pattern>
                              </defs>
                              <rect width="100%" height="100%" fill="url(#bb-pebbles)" />
                              {/* Classic curved basketball seams */}
                              <path d="M -50,100 Q 200,-30 450,100" fill="none" stroke="#000000" strokeWidth="4" opacity="0.25" />
                              <path d="M -50,100 Q 200,230 450,100" fill="none" stroke="#000000" strokeWidth="4" opacity="0.25" />
                              <line x1="200" y1="-20" x2="200" y2="220" stroke="#000000" strokeWidth="4" opacity="0.25" />
                              <line x1="-20" y1="100" x2="420" y2="100" stroke="#000000" strokeWidth="4" opacity="0.25" />
                              {/* Basketball Court Key and Free Throw Circle watermark */}
                              <circle cx="200" cy="100" r="55" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" opacity="0.15" />
                            </svg>
                            {/* Radial Glow highlights for basketball 3D ball curve */}
                            <div className="absolute inset-0 bg-radial from-orange-400/30 via-transparent to-black/60 mix-blend-overlay pointer-events-none" />
                          </>
                        )}

                        <div className={`absolute inset-0 rounded-[40px] ${
                          effectiveSport === "basketball"
                            ? "bg-gradient-to-t from-[#431407]/90 via-transparent to-[#431407]/40"
                            : "bg-gradient-to-t from-[#011a10] via-[#011a10]/40 to-transparent"
                        }`} />
                      </div>
                    </div>

                    <div className="relative z-10">
                      <div className="mb-6 flex items-center justify-center w-full relative h-8">
                        {/* Right: Competition */}
                        <div className={`absolute right-0 top-0 text-[10px] sm:text-[11px] shrink-0 font-black text-white px-2 sm:px-3 py-1.5 h-8 rounded-lg backdrop-blur-md border border-white/10 tracking-tighter flex items-center justify-center gap-1.5 z-20 ${effectiveSport === "basketball" ? "bg-orange-500/30" : "bg-white/10"}`}>
                          {effectiveSport === "basketball" ? <Dribbble size={12} className="text-orange-400 shrink-0" /> : <Trophy size={12} className="text-white shrink-0" />}
                          <span className="whitespace-nowrap">{heroMatch.competition}</span>
                        </div>
                        
                        {/* Center: Live / Timer */}
                        <div className="flex items-center justify-center z-20">
                          {heroMatch.status === "live" ? (
                            <div className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 h-8 bg-red-600/90 rounded-lg animate-pulse shadow-glow border border-red-500/50">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                              <span className="text-white text-[9px] sm:text-[10px] font-black tracking-widest leading-none">مباشر</span>
                            </div>
                          ) : isUpcoming ? (
                            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5 text-white dir-ltr scale-[0.80] sm:scale-100" dir="ltr" style={{ transformOrigin: "center" }}>
                              {[
                                { val: timeLeft.d, label: "يوم" },
                                { val: timeLeft.h, label: "ساعة" },
                                { val: timeLeft.m, label: "دقيقة" },
                                { val: timeLeft.s, label: "ثانية", accent: true }
                              ].map((unit, idx, arr) => (
                                <div key={unit.label} className="flex items-center gap-0.5 sm:gap-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 bg-black/30 rounded flex items-center justify-center border border-white/10 text-[10px] sm:text-xs font-mono font-black tabular-nums backdrop-blur-md ${unit.accent ? 'text-accent' : ''}`}>
                                      {unit.val.toString().padStart(2, "0")}
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] opacity-70 leading-none tracking-widest font-bold">{unit.label}</span>
                                  </div>
                                  {idx < arr.length - 1 && <span className="text-white/30 text-[10px] mb-3 font-bold">:</span>}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {/* Left: Sport Switcher */}
                        <div className="absolute left-0 top-0 flex shrink-0 bg-white/10 backdrop-blur-md border border-white/10 p-0.5 rounded-lg h-8 z-20">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSport("football");
                            }}
                            className={`flex items-center justify-center px-1.5 sm:px-2 h-full rounded-md transition-all duration-200 pointer-events-auto ${effectiveSport === "football" ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                            aria-label="كرة قدم"
                          >
                            <Trophy size={12} />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSport("basketball");
                            }}
                            className={`flex items-center justify-center px-1.5 sm:px-2 h-full rounded-md transition-all duration-200 pointer-events-auto ${effectiveSport === "basketball" ? "bg-[#ea580c] text-white shadow-glow" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                            aria-label="كرة سلة"
                          >
                            <Dribbble size={12} />
                          </motion.button>
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-2 sm:gap-6 py-4 sm:py-6 px-1 sm:px-4">
                        <div className="flex flex-col items-center gap-2 sm:gap-4 w-[84px] sm:w-36 group/team shrink-0 z-10">
                          <div className={`relative flex items-center justify-center rounded-[24px] sm:rounded-[36px] bg-white/10 p-2.5 sm:p-4 ring-1 ring-white/20 backdrop-blur-xl shadow-premium h-20 w-20 sm:h-32 sm:w-32 shrink-0`}>
                            <SafeImage teamName={heroMatch.homeTeam} alt={heroMatch.homeTeam} className="w-full h-full object-contain filter drop-shadow-2xl" src={heroMatch.homeLogo || undefined} width={200} />
                          </div>
                          <span className={`text-center font-black text-white uppercase tracking-wider whitespace-nowrap max-w-full w-full ${((heroMatch.homeTeam || '').trim().includes(' ') || (heroMatch.homeTeam || '').length > 7) ? 'text-[8px] sm:text-[12px]' : 'text-[10px] sm:text-[14px]'}`}>{heroMatch.homeTeam}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-1 px-1 sm:px-4 z-10 min-w-0 max-w-[50%] sm:max-w-none overflow-hidden">
                          <div className={`font-black text-white filter flex flex-col items-center w-full ${effectiveSport === "basketball" ? "drop-shadow-[0_5px_15px_rgba(234,88,12,0.3)]" : "drop-shadow-[0_5px_15px_rgba(46,204,113,0.3)]"}`}>
                            {heroMatch.status === "upcoming" ? (
                              <div className="flex flex-col items-center w-full justify-center gap-1 sm:gap-2">
                                <div className="text-xl sm:text-3xl opacity-60">VS</div>
                                <div className="w-fit max-w-full mx-auto text-center font-bold text-white/90 bg-black/40 px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-white/10 leading-tight overflow-hidden">
                                  {heroMatch.date && !isNaN(new Date(heroMatch.date).getTime()) ? (
                                    <div className="flex flex-col items-center justify-center gap-0.5 max-w-full text-[9px] sm:text-xs">
                                      <span className="text-slate-200 whitespace-nowrap max-w-full">{format(new Date(heroMatch.date), "d MMMM yyyy", { locale: ar })}</span>
                                      <div className="flex items-center gap-1.5 whitespace-nowrap max-w-full">
                                        <span className="text-amber-400 font-black">{format(new Date(heroMatch.date), "h:mm a", { locale: ar })}</span>
                                        <span className="text-white/60">-</span>
                                        <span className="text-white/90">{format(new Date(heroMatch.date), "EEEE", { locale: ar })}</span>
                                      </div>
                                    </div>
                                  ) : "غير محدد"}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`flex items-center justify-center gap-1 sm:gap-4 tracking-tighter sm:tracking-widest tabular-nums ${String(heroMatch.homeScore).length > 2 || String(heroMatch.awayScore).length > 2 ? "text-2xl sm:text-4xl" : "text-3xl sm:text-5xl"}`}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {isAdmin && heroMatch.status === 'live' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScoreUpdate(heroMatch.id, "home", 1);
                                      }}
                                      className="p-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors mb-1"
                                    >
                                      <Plus size={16} className="text-white" />
                                    </button>
                                  )}
                                  <span>{heroMatch.homeScore}</span>
                                  {isAdmin && heroMatch.status === 'live' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScoreUpdate(
                                          heroMatch.id,
                                          "home",
                                          -1,
                                        );
                                      }}
                                      className="p-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors mt-1"
                                    >
                                      <Minus size={16} className="text-white" />
                                    </button>
                                  )}
                                </div>
                                <span
                                  className={
                                    effectiveSport === "basketball"
                                      ? "text-orange-400"
                                      : "text-accent"
                                  }
                                >
                                  :
                                </span>
                                <div className="flex flex-col items-center gap-1">
                                  {isAdmin && heroMatch.status === 'live' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScoreUpdate(heroMatch.id, "away", 1);
                                      }}
                                      className="p-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors mb-1"
                                    >
                                      <Plus size={16} className="text-white" />
                                    </button>
                                  )}
                                  <span>{heroMatch.awayScore}</span>
                                  {isAdmin && heroMatch.status === 'live' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScoreUpdate(
                                          heroMatch.id,
                                          "away",
                                          -1,
                                        );
                                      }}
                                      className="p-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors mt-1"
                                    >
                                      <Minus size={16} className="text-white" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {heroMatch.status === "finished" && (
                              <div className="flex flex-col items-center gap-1 mt-2">
                                <div className="px-2 sm:px-3 py-1 bg-black/40 border border-white/20 rounded-xl text-white font-black text-[8px] sm:text-[10px] whitespace-nowrap text-center shadow-inner">
                                  المباراة انتهت
                                </div>
                              </div>
                            )}
                            {heroMatch.status === "live" && (
                              <div className="flex flex-col items-center gap-2 mt-4">
                                <div className="px-5 py-1.5 bg-black/40 border border-white/20 rounded-xl text-white font-digital font-black text-[18px] tabular-nums text-center tracking-widest shadow-inner">
                                  <LiveMatchTimeDisplay match={heroMatch} />
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(heroMatch.id, 'live', true);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-black flex items-center gap-1 transition-colors ${heroMatch.isTimerRunning ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'}`}
                                    >
                                      {heroMatch.isTimerRunning ? <span className="material-symbols-outlined !text-[12px]">pause</span> : <Play size={10} fill="currentColor" />}
                                      {heroMatch.isTimerRunning ? 'إيقاف مؤقت' : 'تشغيل الوقت'}
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if(window.confirm('هل أنت متأكد من إنهاء المباراة؟')) {
                                          handleStatusUpdate(heroMatch.id, 'finished');
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg border bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 text-[10px] font-black flex items-center gap-1 transition-colors"
                                    >
                                      <span className="material-symbols-outlined !text-[12px]">stop</span>
                                      إنهاء المباراة
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 sm:gap-4 w-[84px] sm:w-36 group/team shrink-0 z-10">
                          <div
                            className={`relative flex items-center justify-center rounded-[24px] sm:rounded-[36px] bg-white/10 p-2.5 sm:p-4 ring-1 ring-white/20 backdrop-blur-xl shadow-premium h-20 w-20 sm:h-32 sm:w-32 shrink-0`}
                          >
                            <SafeImage
                              teamName={heroMatch.awayTeam}
                              alt={heroMatch.awayTeam}
                              className="w-full h-full object-contain filter drop-shadow-2xl"
                              src={heroMatch.awayLogo || undefined}
                              width={200}
                            />
                          </div>
                          <span className={`text-center font-black text-white uppercase tracking-wider whitespace-nowrap max-w-full w-full ${((heroMatch.awayTeam || '').trim().includes(' ') || (heroMatch.awayTeam || '').length > 7) ? 'text-[8px] sm:text-[12px]' : 'text-[10px] sm:text-[14px]'}`}>
                            {heroMatch.awayTeam}
                          </span>
                        </div>
                      </div>

                      {/* Restored Action Buttons for Everyone */}
                      <div className="mt-8 grid grid-cols-2 gap-4 relative z-20">
                        <Link
                          to={
                            heroMatch.status === "live" ||
                            (!isStreamHidden(liveStreams.football) && liveStreams.football?.isActive) ||
                            (!isStreamHidden(liveStreams.basketball) && liveStreams.basketball?.isActive) ||
                            (!isStreamHidden(liveStreams.programs) && liveStreams.programs?.isActive) ||
                            (!isStreamHidden(liveStreams.custom) && liveStreams.custom?.isActive)
                              ? "/live"
                              : "/matches"
                          }
                          className="h-14 rounded-2xl bg-white text-primary-dark hover:bg-primary-light hover:text-white transition-all duration-300 font-black text-[12px] flex items-center justify-center gap-3 shadow-premium group/btn relative z-30 cursor-pointer"
                        >
                          <span className="material-symbols-outlined !text-[20px] group-hover/btn:translate-x-1 transition-transform">
                            {heroMatch.status === "live" ||
                            (!isStreamHidden(liveStreams.football) && liveStreams.football?.isActive) ||
                            (!isStreamHidden(liveStreams.basketball) && liveStreams.basketball?.isActive) ||
                            (!isStreamHidden(liveStreams.programs) && liveStreams.programs?.isActive) ||
                            (!isStreamHidden(liveStreams.custom) && liveStreams.custom?.isActive)
                              ? "sensors"
                              : "event"}
                          </span>
                          {heroMatch.status === "live" ||
                          (!isStreamHidden(liveStreams.football) && liveStreams.football?.isActive) ||
                          (!isStreamHidden(liveStreams.basketball) && liveStreams.basketball?.isActive) ||
                          (!isStreamHidden(liveStreams.programs) && liveStreams.programs?.isActive) ||
                          (!isStreamHidden(liveStreams.custom) && liveStreams.custom?.isActive)
                            ? "دخول البث"
                            : "التفاصيل"}
                        </Link>

                        {heroMatch.status === "upcoming" ? (
                          <Link
                            to="/fan-zone"
                            state={{ activeTab: "predictions" }}
                            className={`h-14 rounded-2xl text-white transition-all duration-300 font-black text-[12px] flex items-center justify-center gap-3 shadow-premium animate-pulse relative z-30 cursor-pointer ${effectiveSport === "basketball" ? "bg-orange-600 hover:bg-orange-700" : "bg-accent hover:bg-accent-dark"}`}
                          >
                            <span className="material-symbols-outlined !text-[20px]">
                              stadium
                            </span>
                            توقع النتيجة
                          </Link>
                        ) : (
                          <Link
                            to="/library?tab=videos"
                            className="h-14 rounded-2xl bg-[#EAB308] text-white hover:bg-[#CA8A04] transition-all duration-300 font-black text-[12px] flex items-center justify-center gap-3 shadow-premium relative z-30 cursor-pointer"
                          >
                            <span className="material-symbols-outlined !text-[20px]">
                              movie
                            </span>
                            ملخص المباراة
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        );
      }

      case "live":
        if (
          (!isStreamHidden(liveStreams.football) && liveStreams.football?.isActive) ||
          (!isStreamHidden(liveStreams.basketball) && liveStreams.basketball?.isActive) ||
          (!isStreamHidden(liveStreams.programs) && liveStreams.programs?.isActive) ||
          (!isStreamHidden(liveStreams.custom) && liveStreams.custom?.isActive)
        ) {
          return (
            <motion.section
              key={section.id}
              variants={itemVariants}
              className="relative z-20"
            >
              <Link
                to="/live"
                className="flex items-center justify-between p-4 rounded-[32px] bg-accent/10 border border-accent/20 cinematic-glow pressable relative z-30 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center text-white shadow-glow animate-pulse">
                    <span className="material-symbols-outlined font-variation-settings-fill">
                      broadcast_on_home
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      بث مباشر متاح الآن
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {!isStreamHidden(liveStreams.football) && liveStreams.football?.isActive && (
                        <span className="text-[8px] font-black bg-primary text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[10px]">sports_soccer</span>
                          كرة القدم
                        </span>
                      )}
                      {!isStreamHidden(liveStreams.basketball) && liveStreams.basketball?.isActive && (
                        <span className="text-[8px] font-black bg-orange-600 text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[10px]">sports_basketball</span>
                          كرة السلة
                        </span>
                      )}
                      {!isStreamHidden(liveStreams.programs) && liveStreams.programs?.isActive && (
                        <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[10px]">live_tv</span>
                          برامج
                        </span>
                      )}
                      {!isStreamHidden(liveStreams.custom) && liveStreams.custom?.isActive && (
                        <span className="text-[8px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[10px]">sensors</span>
                          {liveStreams.custom?.customName?.trim() || 'بث خاص'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white dark:bg-surface-dark flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined rotate-180">
                    arrow_back
                  </span>
                </div>
              </Link>
            </motion.section>
          );
        }
        return null;

      case "custom":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Link
              to="/fan-zone"
              className="block relative overflow-hidden rounded-[40px] bg-slate-900 shadow-2xl group cinematic-glow border border-white/5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#023823] via-[#045536] to-[#012215] opacity-95 group-hover:scale-105 transition-transform duration-1000"></div>
              <div className="absolute inset-0 stadium-gradient mix-blend-multiply opacity-80"></div>
              <div className="absolute inset-0 bg-gradient-to-l from-[#011a10]/90 via-[#011a10]/40 to-transparent"></div>

              <div className="relative p-7 flex flex-col items-start gap-2">
                <div className="flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-md px-3 py-1 border border-primary/30">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-glow"></div>
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">
                    {section.title || "Fan Community Hub"}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white leading-tight">
                  منطقة المشجعين
                </h3>
                <p className="text-[10px] text-slate-300 font-bold max-w-[200px] leading-relaxed mt-1">
                  ساهم في النقاشات، توقع نتائج المباريات، وكن المشجع المثالي
                  لزعيم الثغر.
                </p>
                <div className="mt-6 h-11 px-6 bg-white text-primary-dark rounded-2xl text-[11px] font-black shadow-2xl flex items-center justify-center gap-2 group/cta hover:bg-primary-light hover:text-white transition-all">
                  دخول Fan Zone
                  <span className="material-symbols-outlined !text-sm group-hover:translate-x-1 transition-transform">
                    forum
                  </span>
                </div>
              </div>
            </Link>
          </motion.section>
        );

      case "news":
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none">
                  {section.title || "آخر الأخبار"}
                </h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Latest Club Updates
                </span>
              </div>
              <Link
                to="/news"
                className="h-8 px-4 rounded-xl glass-card flex items-center justify-center text-[10px] font-black text-primary hover:bg-primary hover:text-white transition-all"
              >
                عرض الكل
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-1 -mx-4 px-4">
              {recentNews.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="flex-shrink-0 w-[280px] snap-center group"
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={`/news/${item.id}`}
                    className="block relative overflow-hidden rounded-[32px] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-premium hover:shadow-2xl transition-all duration-500"
                  >
                    <div className="aspect-[16/10] overflow-hidden relative">
                      <SafeImage
                        src={item.image || undefined}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                        width={800}
                        fetchPriority={index === 0 ? "high" : "auto"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute top-4 left-4 z-20 flex gap-1.5 flex-wrap max-w-[90%]">
                        {item.newsType === 'article' && (
                          <div className="h-7 px-2.5 bg-amber-500/95 backdrop-blur-md rounded-lg flex items-center justify-center gap-1 text-[8px] font-black text-white uppercase tracking-widest ring-1 ring-white/20 shadow-premium">
                            <span className="material-symbols-outlined !text-[14px]">edit_note</span>
                            <span>مقال</span>
                          </div>
                        )}
                        {item.videoUrl && (
                          <div className="h-7 px-2.5 bg-red-600/90 backdrop-blur-md rounded-lg flex items-center justify-center gap-1 text-[8px] font-black text-white uppercase tracking-widest ring-1 ring-white/20 shadow-premium">
                            <span className="material-symbols-outlined !text-[14px]">play_arrow</span>
                            <span>فيديو</span>
                          </div>
                        )}
                        <div className="h-7 px-3 bg-primary/90 backdrop-blur-md rounded-lg flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest ring-1 ring-white/20 shadow-premium">
                          {item.category || (item.type === "rss" ? "أخبار خارجية" : "رسمي")}
                        </div>
                        {item.tagIds?.map((tagId: string) => {
                          const tagObj = newsTags?.find((t: any) => t.id === tagId);
                          if (!tagObj) return null;
                          return (
                            <div 
                              key={tagObj.id} 
                              className="h-7 px-3 backdrop-blur-md rounded-lg flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest ring-1 ring-white/20 shadow-premium"
                              style={{ backgroundColor: `${tagObj.color}cc` }}
                            >
                              {tagObj.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-relaxed min-h-[40px] group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400">
                          <span className="material-symbols-outlined !text-[12px]">
                            schedule
                          </span>
                          {formatDistanceToNow(new Date(item.date), {
                            locale: ar,
                            addSuffix: true,
                          })}
                        </div>
                        <div className="text-[10px] font-black text-primary-light">
                          اقرأ المزيد
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        );

      case "media":
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none">
                    {section.title || "ميديا الاتحاد"}
                  </h2>
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                    {media.length}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Exclusive Multimedia
                </span>
              </div>
              <Link
                to="/library?tab=videos"
                className="h-8 px-4 rounded-xl glass-card flex items-center justify-center text-[10px] font-black text-primary hover:bg-primary hover:text-white transition-all"
              >
                عرض المزيد
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {recentMedia.map((item, idx) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className={idx === 0 ? "col-span-2" : ""}
                >
                  <Link
                    to={`/library?tab=${item.type === 'photo' ? 'photos' : 'videos'}`}
                    className={`relative flex ${idx === 0 ? "aspect-[16/9]" : "aspect-square"} overflow-hidden rounded-[32px] shadow-premium group cinematic-glow`}
                  >
                    <SafeImage
                      src={item.thumbnailUrl || undefined}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      width={600}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                    <div className="absolute top-4 right-4 h-9 w-9 rounded-2xl glass-card flex items-center justify-center text-white ring-1 ring-white/10 group-hover:bg-primary transition-colors">
                      <span className="material-symbols-outlined !text-[18px] font-variation-settings-fill">
                        {item.type === "video" ? "play_arrow" : "photo_library"}
                      </span>
                    </div>

                    <div className="absolute bottom-5 left-5 right-5">
                      {item.type === "video" && item.duration && (
                        <span className="inline-block mb-2 text-[8px] bg-accent px-1.5 py-0.5 rounded-lg text-white font-black tracking-tighter shadow-glow">
                          {item.duration}
                        </span>
                      )}
                      <p
                        className={`font-black text-white leading-tight ${idx === 0 ? "text-lg" : "text-xs"} line-clamp-2 drop-shadow-xl`}
                      >
                        {item.title}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        );

      case "matches":
        if (upcomingMatches.length === 0) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="space-y-4"
          >
            <div className="flex flex-col px-1">
              <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none">
                {section.title || "مباريات مرتقبة"}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Upcoming Fixtures
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {upcomingMatches.map((match) => (
                <Link
                  key={match.id}
                  to="/matches"
                  className="flex items-center justify-between glass-card p-3 sm:p-4 rounded-[28px] sm:rounded-[32px] shadow-premium hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center -space-x-4 rtl:space-x-reverse">
                      <div className="h-14 w-14 rounded-2xl bg-white dark:bg-background-dark p-2.5 shadow-premium ring-1 ring-border-light dark:ring-border-dark flex items-center justify-center z-10 transition-transform hover:scale-110">
                        <SafeImage
                          teamName={match.homeTeam}
                          src={match.homeLogo}
                          alt={match.homeTeam}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-white dark:bg-background-dark p-2.5 shadow-premium ring-1 ring-border-light dark:ring-border-dark flex items-center justify-center z-0 scale-90 opacity-90 transition-transform hover:scale-110">
                        <SafeImage
                          teamName={match.awayTeam}
                          src={match.awayLogo}
                          alt={match.awayTeam}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-xs font-black text-slate-800 dark:text-white">
                        {match.homeTeam} × {match.awayTeam}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-black text-primary-light bg-primary/5 px-2 py-0.5 rounded-lg">
                          {match.competition}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex flex-col items-start gap-0.5">
                          <span>{format(new Date(match.date), "d MMMM yyyy", { locale: ar })}</span>
                          <span className="flex items-center gap-1">
                            <span className="text-amber-500 dark:text-amber-400 font-black">{format(new Date(match.date), "h:mm a", { locale: ar })}</span>
                            <span>-</span>
                            <span>{format(new Date(match.date), "EEEE", { locale: ar })}</span>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-background-dark text-slate-300 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined !text-[18px] rotate-180">
                      arrow_back
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        );

      case "history":
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative overflow-hidden rounded-[40px] bg-primary text-white p-6 shadow-2xl cinematic-glow"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">
                  {section.title || "تاريخ العراقة"}
                </h2>
                <Link
                  to="/history"
                  className="h-9 px-4 bg-white/20 backdrop-blur-md rounded-xl text-[10px] font-black flex items-center justify-center hover:bg-white text-white hover:text-primary transition-all"
                >
                  تصفح التاريخ
                </Link>
              </div>
              <p className="text-xs font-bold opacity-80 leading-relaxed">
                أكثر من ١٠٠ عام من المجد والبطولات وتاريخ كتبه الرواد في قلب
                الإسكندرية.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-3xl font-black">٦</span>
                  <span className="text-[8px] font-black uppercase opacity-60">
                    كأس مصر
                  </span>
                </div>
                <div className="h-10 w-[1px] bg-white/20"></div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black">٧٥</span>
                  <span className="text-[8px] font-black uppercase opacity-60">
                    بطولة سلة
                  </span>
                </div>
                <div className="h-10 w-[1px] bg-white/20"></div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black">١٩٠٦</span>
                  <span className="text-[8px] font-black uppercase opacity-60">
                    سنة التأسيس
                  </span>
                </div>
              </div>
            </div>
          </motion.section>
        );

      case "ads": {
        const activeAds = ads.filter((a) => a.active);
        if (activeAds.length === 0) return null;

        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative z-20"
          >
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-2">
              {activeAds.map((ad) => (
                <div
                  key={ad.id}
                  className="flex-shrink-0 w-full group snap-center"
                >
                  {ad.link ? (
                    <a
                      href={ad.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative aspect-[21/9] rounded-[32px] overflow-hidden shadow-premium group-hover:shadow-2xl transition-all duration-500"
                    >
                      <img
                        src={ad.image}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 text-right">
                        <h4 className="text-white text-lg font-black leading-tight drop-shadow-lg">
                          {ad.title}
                        </h4>
                      </div>
                    </a>
                  ) : (
                    <div className="relative aspect-[21/9] rounded-[32px] overflow-hidden shadow-premium">
                      <img
                        src={ad.image}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5 text-right">
                        <h4 className="text-white text-lg font-black leading-tight drop-shadow-lg">
                          {ad.title}
                        </h4>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {activeAds.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {activeAds.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 w-4 rounded-full bg-slate-200 dark:bg-slate-700"
                  />
                ))}
              </div>
            )}
          </motion.section>
        );
      }

      case "poll":
      // Wait, the store uses 'polls' in the switch but let's check
      case "polls":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <div className="glass-card rounded-[40px] p-8 border border-primary/10 shadow-premium relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
              <div className="relative flex flex-col items-center text-center gap-4">
                <div className="h-14 w-14 rounded-[24px] bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined !text-3xl">
                    how_to_vote
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white leading-none">
                    توقعات الجماهير
                  </h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    Voice your opinion
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-bold max-w-[240px]">
                  شاركنا رأيك وتوقعاتك في استفتاءات نادي الاتحاد الأسبوعية.
                </p>
                <Link
                  to="/fan-zone"
                  className="w-full h-12 bg-slate-900 dark:bg-primary text-white rounded-2xl text-[11px] font-black shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                >
                  عرض الاستطلاعات
                </Link>
              </div>
            </div>
          </motion.section>
        );

      case "widget":
        if (!section.htmlCode) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="overflow-hidden rounded-2xl shadow-sm"
          >
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <HtmlWidget htmlCode={section.htmlCode} id={section.id} />
            </Suspense>
          </motion.section>
        );

      case "video":
      case "video_embed":
      case "youtube":
      case "facebook":
        if (!section.videoUrl) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
          >
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <VideoEmbedWidget 
                id={section.id}
                title={section.title}
                subtitle={section.subtitle}
                videoUrl={section.videoUrl}
                videoType={section.videoType}
                aspectRatio={section.aspectRatio}
                autoplay={section.autoplay}
              />
            </Suspense>
          </motion.section>
        );

      case "image":
        if (!section.imageUrl) return null;
        const ImageContent = (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl shadow-lg border border-border-light dark:border-border-dark bg-white dark:bg-card-dark"
          >
            <img
              src={section.imageUrl}
              alt={section.title || "Banner"}
              className="w-full h-auto object-cover max-h-[400px]"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {section.title && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white text-sm font-black">
                  {section.title}
                </h3>
              </div>
            )}
          </motion.section>
        );

        if (section.link) {
          return (
            <a
              key={section.id}
              href={section.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block active:scale-[0.98] transition-transform"
            >
              {ImageContent}
            </a>
          );
        }
        return ImageContent;

      case "advertise":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <AdvertiseWidget />
            </Suspense>
          </motion.section>
        );

      case "club_members":
      case "club_members_ad":
      case "club_members_banner":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <ClubMembersWidget title={section.title} />
            </Suspense>
          </motion.section>
        );

      case "world_fans":
      case "world_association":
        if (sectionFlags.worldFans === false) return null;
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <WorldFansWidget title={section.title} />
            </Suspense>
          </motion.section>
        );

      case "public_services":
      case "services":
        if (sectionFlags.fanServices === false) return null;
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <PublicServicesWidget />
            </Suspense>
          </motion.section>
        );

      case "business":
      case "business_directory":
      case "ittihad_business":
        if (sectionFlags.itthadawyBusiness === false) return null;
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <BusinessWidget title={section.title} />
            </Suspense>
          </motion.section>
        );

      case "store":
      case "fan_store":
      case "shop":
        if (sectionFlags.fanStore === false) return null;
        return null;

      case "tickets":
        return (
          <motion.section key={section.id} variants={itemVariants}>
            <Suspense fallback={<WidgetSkeletonFallback />}>
              <TicketsWidget title={section.title} link={section.link} />
            </Suspense>
          </motion.section>
        );

      case "ai_banner":
        if (!aiConfig.enabled) return null;
        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#064e3b] to-primary p-4 shadow-xl shadow-primary/10 group cursor-pointer"
              onClick={() => navigate('/jersey-tryon')}
            >
              {/* Background Image with custom opacity */}
              {aiConfig.bannerImage && (
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
                  style={{ 
                    backgroundImage: `url(${aiConfig.bannerImage})`,
                    opacity: (aiConfig.bannerOpacity !== undefined ? aiConfig.bannerOpacity : 70) / 100
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"></div>
              
              {/* Fan / Stadium Background Watermark Icon on the Left */}
              <Users size={80} className="absolute -left-3 -bottom-4 text-white/10 pointer-events-none group-hover:scale-110 group-hover:text-amber-300/20 transition-all duration-500" />

              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="text-right flex-1">
                  <h3 className="text-sm sm:text-base font-black text-white italic drop-shadow">
                    {aiConfig.bannerTitle || "صورتك بتيشيرت الاتحاد"}
                  </h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-bold text-white/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse"></span>
                    جرب الآن مجاناً
                  </div>
                </div>

                {/* Fan & Stadium Badge Icon on the Left */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-500/30 backdrop-blur-md border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative">
                    <Users size={22} className="text-amber-300" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <Sparkles size={9} className="text-white" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.section>
        );

      case "city": {
        const isCityActive = cityInfo ? cityInfo.active : true;
        if (!isCityActive) return null;

        const useAuto = cityInfo?.useAutoWeather ?? true;
        
        // Cairo time for manual day/night determination
        const cairoHourStr = new Intl.DateTimeFormat("en-US", {
          timeZone: "Africa/Cairo",
          hour: "numeric",
          hour12: false,
        }).format(new Date());
        const cairoHour = parseInt(cairoHourStr === "24" ? "0" : cairoHourStr);

        const isDay = useAuto ? (autoWeather?.isDay ?? (cairoHour >= 6 && cairoHour < 19)) : (cairoHour >= 6 && cairoHour < 19);
        
        // Simplified mapping for conditions
        const rawCondition = (useAuto ? autoWeather?.condition || "sun" : (cityInfo?.condition || "صافي")).toLowerCase();
        let cond = "sun";
        
        if (rawCondition.includes("rain") || rawCondition.includes("مطر") || rawCondition.includes("زخات")) cond = "rainy";
        else if (rawCondition.includes("storm") || rawCondition.includes("رعد")) cond = "thunderstorm";
        else if (rawCondition.includes("snow") || rawCondition.includes("ثلج")) cond = "snowy";
        else if (rawCondition.includes("cloud") || rawCondition.includes("غائم") || rawCondition.includes("سحب")) cond = "cloudy";
        else if (rawCondition.includes("fog") || rawCondition.includes("ضباب")) cond = "foggy";
        else if (rawCondition.includes("clear") || rawCondition.includes("sunny") || rawCondition.includes("صافي") || rawCondition.includes("شمس")) cond = "sun";

        const displayCity = {
          cityName: cityInfo?.cityName || "الاسكندرية",
          temperature:
            useAuto && autoWeather?.temp
              ? autoWeather.temp
              : cityInfo?.temperature || "25",
          conditionText:
            useAuto && autoWeather?.condition
              ? autoWeather.condition === "sun"
                ? "صافي"
                : autoWeather.condition === "mostly_sunny"
                  ? "غالباً صافي"
                  : autoWeather.condition === "partly_cloudy"
                    ? "غائم جزئياً"
                    : autoWeather.condition === "cloudy"
                      ? "غائم"
                      : autoWeather.condition === "foggy"
                        ? "ضباب"
                        : autoWeather.condition === "drizzle"
                          ? "رذاذ"
                          : autoWeather.condition === "rainy"
                            ? "ممطر"
                            : autoWeather.condition === "snowy"
                              ? "ثلوج"
                              : autoWeather.condition === "showers"
                                ? "زخات مطر"
                                : autoWeather.condition === "thunderstorm"
                                  ? "عواصف رعدية"
                                  : "غائم"
              : cityInfo?.condition || "صافي",
          sunrise:
            useAuto && autoWeather?.sunrise
              ? autoWeather.sunrise
              : cityInfo?.sunrise || "06:30 AM",
          sunset:
            useAuto && autoWeather?.sunset
              ? autoWeather.sunset
              : cityInfo?.sunset || "07:15 PM",
          image:
            cityInfo?.image ||
            "https://images.unsplash.com/photo-1572214350916-571eac7bfced?q=80&w=1000&auto=format&fit=crop",
          weatherBg: cityInfo?.weatherBg || "",
          description:
            cityInfo?.description ||
            "عروس البحر الأبيض المتوسط وعاصمة الرياضة والثقافة.",
        };

        const tempInt = parseInt(displayCity.temperature) || 25;
        let cardBg = "";
        let iconBg = "";
        let iconColor = "";
        let IconElement = CloudSun;
        let textColor = "text-white";
        let subtextColor = "text-white/80";
        let effectType:
          | "sun"
          | "stars"
          | "rain"
          | "snow"
          | "storm"
          | "clouds" = "sun";

        // Simplified time phase to Day and Night only as requested
        const timePhase = isDay ? "day" : "night";

        // Theme Logic based on timePhase and condition
        if (cond === "rainy" || cond === "showers" || cond === "drizzle") {
          // Rain
          cardBg =
            timePhase === "night"
              ? "from-slate-900 via-blue-950 to-black border-blue-900/30"
              : "from-blue-600 via-blue-800 to-indigo-900 border-blue-400/40";
          iconBg = "bg-white/10 backdrop-blur-xl ring-1 ring-white/20";
          iconColor = "text-blue-100";
          IconElement = CloudRain;
          effectType = "rain";
        } else if (cond === "thunderstorm") {
          // Storms
          cardBg =
            timePhase === "night"
              ? "from-slate-950 via-gray-900 to-black border-slate-700/50"
              : "from-slate-800 via-slate-900 to-black border-slate-600/50";
          iconBg = "bg-yellow-400/20 backdrop-blur-xl ring-1 ring-yellow-400/30";
          iconColor = "text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]";
          IconElement = CloudLightning;
          effectType = "storm";
        } else if (cond === "snowy") {
          // Snow
          cardBg =
            timePhase === "night"
              ? "from-slate-900 via-blue-950 to-slate-900 border-white/20"
              : "from-sky-50 via-white to-blue-50 border-white/60";
          iconBg = "bg-white/20 backdrop-blur-xl ring-1 ring-white/30";
          iconColor = timePhase === "night" ? "text-blue-200" : "text-sky-600";
          IconElement = Snowflake;
          effectType = "snow";
          if (timePhase === "day") {
            textColor = "text-slate-900";
            subtextColor = "text-slate-600";
          }
        } else if (cond === "cloudy" || cond === "partly_cloudy" || cond === "foggy") {
          // Clouds
          IconElement = timePhase === "night" ? CloudMoon : CloudSun;
          effectType = "clouds";
          if (timePhase === "night") {
            cardBg = "from-slate-900 via-blue-950 to-black border-blue-900/20";
            iconBg = "bg-indigo-500/10 backdrop-blur-xl ring-1 ring-white/10";
            iconColor = "text-indigo-300";
          } else {
            cardBg = "from-sky-300 via-sky-400 to-blue-500 border-sky-200/40";
            iconBg = "bg-white/20 backdrop-blur-xl ring-1 ring-white/30";
            iconColor = "text-white";
          }
        } else {
          // Clear / Sunny
          if (timePhase === "night") {
            cardBg = "from-[#0f172a] via-[#1e3a8a] to-[#020617] border-blue-500/20";
            iconBg = "bg-blue-900/40 backdrop-blur-2xl ring-1 ring-white/20 shadow-lg shadow-blue-500/20";
            iconColor = "text-blue-100";
            IconElement = Moon;
            effectType = "stars";
          } else {
            cardBg = "from-sky-400 via-sky-500 to-blue-600 border-sky-300/40";
            iconBg = "bg-yellow-400/20 backdrop-blur-2xl ring-1 ring-white/30 shadow-lg shadow-yellow-400/20";
            iconColor = "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
            IconElement = Sun;
            effectType = "sun";
          }
        }

        return (
          <motion.section
            key={section.id}
            variants={itemVariants}
            className="p-1" // Add padding to prevent shadow clipping
          >
            <div
              className={`relative overflow-hidden rounded-[40px] bg-gradient-to-br ${cardBg} shadow-2xl transition-all duration-1000 border hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-[1.02]`}
            >
              {/* Optional Background Image */}
              {displayCity.weatherBg && (
                <div className="absolute inset-0 z-0 rounded-[inherit] overflow-hidden">
                  <img
                    src={getOptimizedImage(displayCity.weatherBg, 800) || undefined}
                    className="w-full h-full object-cover opacity-30 mix-blend-overlay rounded-[inherit]"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

                {/* Background Effects Container */}
              <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden select-none rounded-[inherit]">
                {/* Storm Lightning Flash */}
                {effectType === "storm" && (
                  <motion.div
                    animate={{
                      opacity: [0, 0, 0.4, 0, 0.8, 0, 0, 0.3, 0, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 2,
                    }}
                    className="absolute inset-0 bg-white z-[20] pointer-events-none"
                  />
                )}

                {/* Sun Glow Effect */}
                {effectType === "sun" && (
                  <div className="absolute inset-0 z-[5] overflow-hidden rounded-[40px]">
                    {/* The Glow */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0.5, 0.3]
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-24 -right-24 w-80 h-80 bg-yellow-300 blur-[100px] rounded-full"
                    />
                    {/* The Sun Body */}
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.05, 1],
                        opacity: [0.4, 0.6, 0.4]
                      }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-yellow-200 to-yellow-400 blur-[20px] rounded-full"
                    />
                    {/* Subtle Rays */}
                    {[...Array(8)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ 
                          rotate: [i * 45, i * 45 + 360],
                          opacity: [0.1, 0.3, 0.1]
                        }}
                        transition={{ 
                          rotate: { duration: 60, repeat: Infinity, ease: "linear" },
                          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
                        }}
                        className="absolute top-22 right-22 w-[1px] h-[400px] bg-gradient-to-b from-white/30 to-transparent blur-[1px]"
                        style={{ transformOrigin: 'top center' }}
                      />
                    ))}
                    {/* Floating Sun Particles */}
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={`particle-${i}`}
                        animate={{
                          y: [-20, 20, -20],
                          x: [-10, 10, -10],
                          opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{
                          duration: 3 + i,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i
                        }}
                        className="absolute w-1 h-1 bg-yellow-200 rounded-full blur-[1px]"
                      />
                    ))}
                  </div>
                )}

                {/* Stars Effect for Night */}
                {effectType === "stars" && (
                  <div className="absolute inset-0 z-[5] overflow-hidden rounded-[40px]">
                    {/* The Moon Body - Centered backdrop, extremely faint and subtle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-blue-100 shadow-[0_0_120px_rgba(255,255,255,0.01)] flex items-center justify-center overflow-hidden opacity-[0.03] pointer-events-none z-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-slate-200"></div>
                      <div className="absolute top-12 left-24 w-10 h-10 rounded-full bg-slate-400 opacity-5 blur-[4px]"></div>
                    </div>

                    {/* Consolidated Twinkling Stars - Static & Polished */}
                    {[...Array(40)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute bg-white rounded-full z-0"
                        style={{
                          left: `${(i * 137.5) % 100}%`,
                          top: `${(i * 243.7) % 100}%`,
                          width: `${(i % 5 === 0) ? 1.2 : 0.6}px`,
                          height: `${(i % 5 === 0) ? 1.2 : 0.6}px`,
                        }}
                        animate={{
                          opacity: [0.05, 0.4, 0.05],
                        }}
                        transition={{
                          duration: 3 + (i % 4),
                          repeat: Infinity,
                          delay: i * 0.1,
                          ease: "easeInOut"
                        }}
                      />
                    ))}

                    {/* Shooting Stars (شهب) - Faster and more rare */}
                    {[...Array(2)].map((_, i) => (
                      <motion.div
                        key={`shooting-${i}`}
                        className="absolute h-[0.5px] bg-gradient-to-r from-transparent via-blue-50 to-transparent z-[1]"
                        style={{
                          width: '150px',
                          left: '-20%',
                          top: `${10 + i * 40}%`,
                          rotate: '20deg',
                          filter: 'blur(0.5px)',
                        }}
                        animate={{
                          left: ['-20%', '130%'],
                          opacity: [0, 0.6, 0],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          repeatDelay: 15 + i * 20,
                          delay: i * 12,
                          ease: "easeIn"
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Rain Particles */}
                {(effectType === "rain" || effectType === "storm") && (
                  <div className="absolute inset-0 z-[16] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay opacity-30" />
                    {[...Array(120)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute bg-white/40 w-[1.5px] h-[20px]"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-20px`,
                        }}
                        animate={{
                          top: ["0%", "110%"],
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 0.4 + Math.random() * 0.3,
                          repeat: Infinity,
                          ease: "linear",
                          delay: Math.random() * 2,
                        }}
                      />
                    ))}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] animate-rain"
                      style={{ backgroundSize: '100px 100px' }}
                    />
                  </div>
                )}

                {/* Cloud Effects */}
                {effectType === "clouds" && (
                  <div className="absolute inset-0 z-[10] overflow-hidden opacity-40">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          x: i % 2 === 0 ? [-200, 600] : [600, -200],
                        }}
                        transition={{
                          duration: 20 + i * 10,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute bg-white/30 blur-[40px] rounded-full"
                        style={{
                          width: `${150 + Math.random() * 150}px`,
                          height: `${80 + Math.random() * 80}px`,
                          top: `${(i * 20) % 100}%`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Rain Drops Effect */}
                {(effectType === "rain" || effectType === "storm") && (
                  <div className="absolute inset-0 z-[12] overflow-hidden pointer-events-none rounded-[40px]">
                    {/* Background Mist layer during rain */}
                    <motion.div 
                      animate={{ 
                        opacity: [0.45, 0.75, 0.45],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-blue-900/40 backdrop-blur-[3px] rounded-[40px]"
                    />
                    
                    {[...Array(60)].map((_, i) => {
                      const leftPos = Math.random() * 120 - 10;
                      const duration = 0.6 + Math.random() * 0.8;
                      const delay = Math.random() * -5;
                      const isMain = i < 30; // 30 main drops, 30 background ones

                      return (
                        <motion.div
                          key={i}
                          className="absolute bg-gradient-to-t from-white/60 to-transparent rounded-full"
                          style={{
                            left: `${leftPos}%`,
                            top: `-100px`,
                            width: isMain ? '1.5px' : '0.8px',
                            height: isMain ? `${30 + Math.random() * 40}px` : `${15 + Math.random() * 20}px`,
                            transform: "rotate(15deg)",
                            opacity: isMain ? 0.5 + Math.random() * 0.4 : 0.2 + Math.random() * 0.2,
                            filter: isMain ? "none" : "blur(1px)",
                          }}
                          animate={{
                            top: ["-10%", "120%"],
                            x: [0, 30],
                          }}
                          transition={{
                            duration: duration,
                            repeat: Infinity,
                            ease: "linear",
                            delay: delay,
                          }}
                        />
                      );
                    })}

                    {/* Ground Splash effect (simulated) */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/10 to-transparent blur-sm" />
                  </div>
                )}

                {/* Storm Flash Effect */}
                {effectType === "storm" && (
                  <motion.div
                    animate={{ opacity: [0, 0, 0.6, 0, 0.4, 0, 0] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      delay: Math.random() * 8,
                      times: [0, 0.8, 0.82, 0.84, 0.86, 0.9, 1],
                    }}
                    className="absolute inset-0 bg-white/80 z-[15]"
                  />
                )}

                {/* Snow Effect */}
                {effectType === "snow" && (
                  <div className="absolute inset-0 rounded-[40px] overflow-hidden z-[12]">
                    {[...Array(30)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute h-1.5 w-1.5 bg-white rounded-full blur-[0.3px]"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-10px`,
                        }}
                        animate={{
                          top: ["0%", "110%"],
                          x: [0, Math.random() * 30 - 15, 0],
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 4 + Math.random() * 6,
                          repeat: Infinity,
                          ease: "linear",
                          delay: Math.random() * 5,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="absolute inset-0 bg-black/5 opacity-10 rounded-[40px] z-[8]"></div>
              </div>

              <div className="relative p-5 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                        <MapPin size={14} className={textColor} />
                      </div>
                      <h3
                        className={`text-lg font-black tracking-tight ${textColor} drop-shadow-sm`}
                      >
                        {displayCity.cityName}
                      </h3>
                    </div>

                    <div
                      className={`flex flex-col gap-0.5 ${subtextColor} text-[10px] font-bold mt-1 pr-1`}
                    >
                      <div className="flex items-center gap-2 opacity-100">
                        <span className="material-symbols-outlined !text-[12px]">
                          calendar_today
                        </span>
                        <span>
                          {format(new Date(), "EEEE d MMMM", { locale: ar })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="material-symbols-outlined !text-[14px] animate-pulse">
                          schedule
                        </span>
                        <span className="font-black tracking-wider">
                          {format(new Date(), "h:mm a", { locale: ar })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <div className="flex items-start">
                        <span
                          className={`text-4xl font-black ${textColor} leading-none tracking-tighter drop-shadow-2xl`}
                        >
                          {displayCity.temperature}
                        </span>
                        <span
                          className={`text-xl font-bold ${textColor} mt-1 opacity-60`}
                        >
                          °
                        </span>
                      </div>
                      <span
                        className={`mt-2 text-[9px] font-black uppercase px-3 py-1 bg-white/20 backdrop-blur-md ${textColor} rounded-xl text-center border border-white/10 shadow-lg`}
                      >
                        {displayCity.conditionText}
                      </span>
                    </div>
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                        rotate: effectType === "sun" ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className={`h-12 w-12 rounded-[20px] ${iconBg} flex items-center justify-center ${iconColor} shadow-2xl ring-1 ring-white/30`}
                    >
                      <IconElement size={24} strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        );
      }

      default:
        return null;
    }
  };

  const sectionsToRender: HomeSection[] = homeSections && homeSections.length > 0 
    ? [...homeSections]
    : [
        { id: 'hero', type: 'hero', active: true, order: 0, spacing: 20 },
        { id: 'ads', type: 'ads', active: true, order: 1, spacing: 20 },
        { id: 'live', type: 'live', active: true, order: 2, spacing: 16 },
        { id: 'matches', type: 'matches', active: true, order: 3, spacing: 24 },
        { id: 'ai_banner', type: 'ai_banner', active: true, order: 4, spacing: 20 },
        { id: 'city', type: 'city', active: true, order: 5, spacing: 24 },
        { id: 'news', type: 'news', active: true, order: 6, spacing: 24 },
        { id: 'media', type: 'media', active: true, order: 7, spacing: 24 },
        { id: 'club_members', type: 'club_members', active: true, order: 8, spacing: 24 },
        { id: 'world_fans', type: 'world_fans', active: true, order: 9, spacing: 24 },
        { id: 'business', type: 'business', active: true, order: 10, spacing: 24 },
        { id: 'tickets', type: 'tickets', active: true, order: 11, spacing: 20 },
        { id: 'polls', type: 'polls', active: true, order: 12, spacing: 24 },
        { id: 'history', type: 'history', active: true, order: 13, spacing: 24 },
      ];

  const sortedSections = [...sectionsToRender].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 },
    },
  } as const;

  const hasContent = news.length > 0 || matches.length > 0;
  if (!dataLoaded && !hasContent) {
    return <HomeSkeleton />;
  }

  const isEmpty = dataLoaded && news.length === 0 && matches.length === 0;

  return (
    <div className="flex-1 w-full max-w-md md:max-w-6xl lg:max-w-7xl mx-auto flex flex-col pb-32 md:pb-16 px-0 md:px-6 bg-background-light dark:bg-background-dark min-h-screen">
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-x-hidden px-4 md:px-0 flex flex-col gap-0 pt-2 pb-6"
      >
        {isEmpty && (
          <motion.div 
            variants={itemVariants}
            className="p-8 rounded-[40px] bg-white dark:bg-surface-dark border border-dashed border-primary/30 flex flex-col items-center text-center gap-6 mb-8"
          >
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined !text-[40px]">database_off</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">قاعدة البيانات فارغة</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                يبدو أن هذا هو التشغيل الأول للتطبيق. قم باتباع الخطوات التالية:
              </p>
            </div>
            
            {isAdmin ? (
              <div className="w-full flex flex-col gap-3">
                <Link 
                  to="/admin" 
                  className="w-full h-12 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-black text-xs shadow-premium"
                >
                  <span className="material-symbols-outlined !text-sm">auto_fix_high</span>
                  الذهاب للوحة التحكم وبدء التغذية
                </Link>
                <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-xl border border-accent/20">
                  <span className="material-symbols-outlined !text-xs text-accent">info</span>
                  <span className="text-[9px] text-accent font-black">تحتاج إلى الضغط على "Seed Data" في لوحة التحكم</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                 <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                   برجاء التواصل مع إدارة التطبيق لتهيئة البيانات الأولية.
                 </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Goal Celebration Trigger is in App.tsx */}
      
      {sortedSections.filter(section => section.active !== false).map((section, index) => {
          const content = renderSection(section);
          if (!content) return null;
          return (
            <div
              key={section.id}
              className={index > 3 ? "cv-auto" : ""}
              style={{ marginBottom: `${section.spacing ?? 24}px` }}
            >
              {content}
            </div>
          );
        })}

        <motion.footer variants={itemVariants} className="mt-12 mb-6 text-center px-4 border-t border-slate-100 dark:border-slate-800/40 pt-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-normal sm:tracking-wider whitespace-nowrap overflow-x-auto no-scrollbar">
            <a 
              href="https://itthadalextv.com/privacy-policy" 
              className="hover:text-primary transition-colors hover:underline whitespace-nowrap shrink-0"
            >
              Privacy Policy (سياسة الخصوصية)
            </a>
            <span className="text-slate-300 dark:text-slate-700 font-normal shrink-0">|</span>
            <a 
              href="https://itthadalextv.com/terms" 
              className="hover:text-primary transition-colors hover:underline whitespace-nowrap shrink-0"
            >
              Terms of Service (شروط الخدمة)
            </a>
          </div>
          <p className="mt-2.5 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
            تصميم وتطوير : عمر ماجد
          </p>
          <p className="mt-2 text-[8px] font-medium text-slate-400/60 dark:text-slate-500/40 uppercase tracking-tighter">
            © {new Date().getFullYear()} Ittihad Alexandria Fan App
          </p>
        </motion.footer>
      </motion.main>
    </div>
  );
}
