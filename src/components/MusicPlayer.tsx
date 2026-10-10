import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  X,
  ChevronDown,
  ChevronUp,
  Repeat,
  Shuffle,
  Music,
  Disc
} from 'lucide-react';
import { useAppStore } from '../store';

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export default function MusicPlayer() {
  const { currentSong, isPlaying, setIsPlaying, setCurrentSong, activePlaylist, albums } = useAppStore();
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleNext = () => {
    if (!activePlaylist.length || !currentSong) return;
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * activePlaylist.length);
      setCurrentSong(activePlaylist[randomIndex]);
    } else {
      const currentIndex = activePlaylist.findIndex(s => s.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % activePlaylist.length;
      setCurrentSong(activePlaylist[nextIndex]);
    }
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    if (!activePlaylist.length || !currentSong) return;
    if (audioRef.current && currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const currentIndex = activePlaylist.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + activePlaylist.length) % activePlaylist.length;
    setCurrentSong(activePlaylist[prevIndex]);
    setIsPlaying(true);
  };

  // Find album title for the current song
  const specificAlbumName = React.useMemo(() => {
    if (!currentSong) return '';
    if (currentSong.albumId && Array.isArray(albums)) {
      const found = albums.find(a => String(a.id) === String(currentSong.albumId));
      if (found?.title) return found.title;
    }
    if (Array.isArray(albums)) {
      const foundBySong = albums.find(a => a.songIds?.map(String).includes(String(currentSong.id)));
      if (foundBySong?.title) return foundBySong.title;
    }
    if ((currentSong as any).album && typeof (currentSong as any).album === 'string') {
      return (currentSong as any).album;
    }
    if ((currentSong as any).albumTitle && typeof (currentSong as any).albumTitle === 'string') {
      return (currentSong as any).albumTitle;
    }
    return '';
  }, [currentSong, albums]);

  const currentAlbumTitle = specificAlbumName || 'أغاني الاتحاد السكندري';

  // Keep refs for actions to avoid stale closures in mediaSession action handlers
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;
  const handlePreviousRef = useRef(handlePrevious);
  handlePreviousRef.current = handlePrevious;

  // Media Session Metadata updates
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    try {
      const artworkSrc = (currentSong.coverUrl && currentSong.coverUrl.trim() !== '')
        ? currentSong.coverUrl
        : `${window.location.origin}/icon.png`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'أغنية الاتحاد',
        artist: currentSong.artist || 'نادي الاتحاد السكندري',
        album: currentAlbumTitle,
        artwork: [
          { src: artworkSrc, sizes: '96x96' },
          { src: artworkSrc, sizes: '128x128' },
          { src: artworkSrc, sizes: '192x192' },
          { src: artworkSrc, sizes: '256x256' },
          { src: artworkSrc, sizes: '384x384' },
          { src: artworkSrc, sizes: '512x512' },
        ]
      });
    } catch (err) {
      console.warn('Error setting MediaMetadata:', err);
    }
  }, [currentSong, currentAlbumTitle]);

  // Handle Playback state in Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }, [isPlaying]);

  // Handle Position state in Media Session for lock screen scrub bar
  useEffect(() => {
    if (!('mediaSession' in navigator) || !audioRef.current) return;
    if (typeof navigator.mediaSession.setPositionState === 'function') {
      try {
        if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audioRef.current.playbackRate || 1,
            position: Math.min(Math.max(currentTime, 0), duration)
          });
        }
      } catch (e) {}
    }
  }, [currentTime, duration]);

  // Register Media Session Action Handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => {
        setIsPlaying(true);
        audioRef.current?.play().catch(() => {});
      }],
      ['pause', () => {
        setIsPlaying(false);
        audioRef.current?.pause();
      }],
      ['previoustrack', () => {
        handlePreviousRef.current();
      }],
      ['nexttrack', () => {
        handleNextRef.current();
      }],
      ['seekbackward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        }
      }],
      ['seekforward', (details) => {
        if (audioRef.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration || 0);
        }
      }],
      ['seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined && !details.fastSeek) {
          audioRef.current.currentTime = details.seekTime;
        }
      }],
      ['stop', () => {
        setIsPlaying(false);
        audioRef.current?.pause();
      }]
    ];

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {
        // Some browsers may not support specific actions like seekto
      }
    });

    return () => {
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (e) {}
      });
    };
  }, [setIsPlaying]);

  useEffect(() => {
    if (audioRef.current && currentSong?.audioUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          console.warn("Playback prevented or failed:", e);
          setIsPlaying(false);
          if (e.name === 'NotAllowedError') {
            setError("التشغيل التلقائي محظور. يرجى الضغط على التشغيل يدوياً.");
          }
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    setError(null);
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  if (!currentSong) return null;

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = parseFloat(e.target.value);
    if (audioRef.current && duration) {
      audioRef.current.currentTime = (p / 100) * duration;
      setProgress(p);
    }
  };

  const handleEnded = () => {
    if (repeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      handleNext();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={`fixed z-[100] transition-all duration-300 ${
          expanded 
            ? 'inset-0 bg-background-light dark:bg-background-dark md:inset-auto md:bottom-6 md:left-6 md:right-auto md:w-[380px] md:h-[560px] md:rounded-[32px] md:border md:border-emerald-500/20 md:shadow-2xl' 
            : 'bottom-[110px] left-3.5 right-3.5 md:left-auto md:right-6 md:bottom-6 md:w-[370px] h-[78px]'
        }`}
      >
        <audio 
          ref={audioRef}
          src={currentSong.audioUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={(e) => {
            const audio = e.currentTarget;
            const err = audio.error;
            let errorMessage = "حدث خطأ أثناء تحميل الملف";
            if (err) {
              if (err.code === 1) errorMessage = "تم إيقاف التحميل";
              else if (err.code === 2) errorMessage = "خطأ في الشبكة";
              else if (err.code === 3) errorMessage = "خطأ في معالجة الملف";
              else if (err.code === 4) errorMessage = "رابط غير صالح";
            }
            setError(errorMessage);
            setIsPlaying(false);
          }}
        />

        {/* Minimized Floating Widget */}
        {!expanded && (
          <div 
            onClick={() => setExpanded(true)}
            className="w-full h-full bg-slate-900 text-white border-slate-700 shadow-[0_12px_32px_rgba(0,0,0,0.35)] dark:bg-white dark:text-slate-900 dark:border-emerald-500/30 dark:shadow-[0_12px_32px_rgba(0,0,0,0.25),0_0_20px_rgba(16,185,129,0.2)] rounded-2xl md:rounded-3xl border-2 backdrop-blur-xl overflow-hidden flex flex-col cursor-pointer transition-all group"
          >
            <div className="flex-1 flex items-center px-3 gap-2 sm:gap-3">
              {/* Cover Art with subtle animation */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 shadow-md border border-emerald-500/40">
                {currentSong.coverUrl && currentSong.coverUrl.trim() !== '' ? (
                  <img 
                    src={currentSong.coverUrl} 
                    className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow scale-105' : ''}`} 
                    referrerPolicy="no-referrer" 
                    alt={currentSong.title}
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-900 dark:bg-emerald-100 flex items-center justify-center text-emerald-300 dark:text-primary">
                    <Music size={20} />
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                )}
              </div>
              
              {/* Song Title & Artist */}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black truncate text-white dark:text-emerald-700 transition-colors">
                  {error || currentSong.title}
                </h4>
                <p className={`text-[11px] font-bold truncate mt-0.5 ${error ? 'text-red-400 dark:text-red-600' : 'text-emerald-300 dark:text-emerald-600'}`}>
                  {error ? 'خطأ التشغيل' : `${currentSong.artist}${specificAlbumName ? ` • ${specificAlbumName}` : ''}`}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {/* Previous Button */}
                <button 
                  onClick={handlePrevious}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 dark:text-slate-600 dark:hover:text-emerald-700 dark:hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                  title="السابق"
                >
                  <SkipBack size={16} fill="currentColor" />
                </button>

                {/* Play / Pause Button */}
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 hover:bg-emerald-400 text-slate-950 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white hover:scale-105 active:scale-95 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/30 transition-all cursor-pointer font-black"
                  title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                >
                  {isPlaying ? <Pause fill="currentColor" size={16} /> : <Play fill="currentColor" size={16} className="ml-0.5" />}
                </button>

                {/* Next Button */}
                <button 
                  onClick={handleNext}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 dark:text-slate-600 dark:hover:text-emerald-700 dark:hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                  title="التالي"
                >
                  <SkipForward size={16} fill="currentColor" />
                </button>

                {/* Close Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentSong(null); }}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-white/10 dark:text-slate-400 dark:hover:text-red-500 dark:hover:bg-slate-100 rounded-lg transition-all cursor-pointer mr-0.5"
                  title="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Miniature Progress Bar */}
            <div className="h-1 bg-black/40 dark:bg-slate-100 w-full overflow-hidden" dir="ltr">
               <div 
                 className="h-full bg-gradient-to-r from-emerald-500 to-green-400 dark:from-emerald-600 dark:to-emerald-400 transition-all duration-300" 
                 style={{ width: `${progress}%` }} 
               />
            </div>
          </div>
        )}

        {/* Expanded View */}
        {expanded && (
          <div className="w-full h-full flex flex-col bg-white dark:bg-card-dark md:rounded-[32px] overflow-hidden relative">
            {/* Header: Safe padding on mobile to clear the camera notch and dynamic island */}
            <div className="flex flex-row items-center justify-between pt-14 sm:pt-16 md:pt-6 px-6 pb-4 border-b border-border-light/60 dark:border-border-dark/60">
              <button 
                onClick={() => setExpanded(false)} 
                className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 dark:hover:bg-emerald-950/80 rounded-full active:scale-90 transition-all shadow-xs cursor-pointer"
                title="تصغير"
              >
                <ChevronDown size={22} />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-primary uppercase tracking-wider">مشغل الصوت</span>
                <span className="text-[9px] text-slate-400 font-bold">قناة الاتحاد</span>
              </div>

              <button 
                onClick={() => { setExpanded(false); setCurrentSong(null); }} 
                className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-surface-dark hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 rounded-full active:scale-90 transition-all shadow-xs cursor-pointer"
                title="إغلاق المشغل"
              >
                <X size={22} />
              </button>
            </div>

            {/* Artwork */}
            <div className="flex-1 flex items-center justify-center px-8 py-4 relative">
               <div className={`relative w-full max-w-[280px] aspect-square rounded-[36px] overflow-hidden shadow-2xl shadow-primary/20 border-2 border-primary/20 transition-all duration-700 ${isPlaying ? 'scale-100' : 'scale-90 opacity-90'}`}>
                 {currentSong.coverUrl && currentSong.coverUrl.trim() !== '' ? (
                    <img src={currentSong.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={currentSong.title} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-emerald-950 flex items-center justify-center">
                      <Music className="text-emerald-400" size={64} />
                    </div>
                  )}
               </div>
            </div>

            {/* Info & Controls */}
            <div className="p-6 md:p-8 pb-10">
              <div className="text-center mb-6">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white truncate mb-1.5">{error || currentSong.title}</h2>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <p className={`text-xs md:text-sm font-bold ${error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>{currentSong.artist}</p>
                  {specificAlbumName && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black border border-emerald-500/20">
                      <Disc size={12} />
                      <span>ألبوم: {specificAlbumName}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar (Left-to-Right Music Standard) */}
              <div className="mb-6" dir="ltr">
                <div className="relative h-2 group w-full flex items-center" dir="ltr">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={progress}
                    onChange={handleProgressChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    dir="ltr"
                  />
                  <div className="w-full h-2 bg-slate-100 dark:bg-surface-dark rounded-full overflow-hidden" dir="ltr">
                    <div className="h-full bg-gradient-to-r from-primary to-emerald-400 relative rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  {/* Thumb */}
                  <div 
                    className="absolute h-3.5 w-3.5 bg-white border-2 border-primary rounded-full shadow-md pointer-events-none group-hover:scale-125 transition-transform"
                    style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-mono font-bold text-slate-400" dir="ltr">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main Buttons */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShuffle(!shuffle)} className={`p-3 rounded-full transition-colors cursor-pointer ${shuffle ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Shuffle size={20} />
                </button>
                
                <div className="flex items-center gap-4">
                  <button onClick={handlePrevious} className="p-4 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                    <SkipBack size={24} fill="currentColor" />
                  </button>
                  
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-18 h-18 bg-primary hover:bg-primary-dark text-white rounded-3xl flex items-center justify-center shadow-xl shadow-primary/30 transform active:scale-95 transition-all hover:scale-105 cursor-pointer"
                  >
                    {isPlaying ? <Pause fill="white" size={30} /> : <Play fill="white" size={30} className="ml-1" />}
                  </button>
                  
                  <button onClick={handleNext} className="p-4 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                    <SkipForward size={24} fill="currentColor" />
                  </button>
                </div>

                <button onClick={() => setRepeat(!repeat)} className={`p-3 rounded-full transition-colors cursor-pointer ${repeat ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Repeat size={20} />
                </button>
              </div>
              
              {/* Volume (Desktop Only) */}
              <div className="hidden md:flex items-center gap-3 max-w-[200px] mx-auto opacity-70 hover:opacity-100 transition-opacity" dir="ltr">
                 <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">
                   {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                 </button>
                 <input 
                   type="range" 
                   min="0" 
                   max="1" 
                   step="0.01"
                   value={isMuted ? 0 : volume}
                   onChange={(e) => setVolume(parseFloat(e.target.value))}
                   className="w-full h-1.5 bg-slate-100 dark:bg-surface-dark rounded-full appearance-none cursor-pointer accent-primary"
                   dir="ltr"
                 />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
