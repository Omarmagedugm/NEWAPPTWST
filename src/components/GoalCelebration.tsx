import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SafeImage } from './SafeImage';

interface GoalCelebrationProps {
  show: boolean;
  onComplete: () => void;
  teamName: string;
  match?: {
    homeTeam: string;
    awayTeam: string;
    homeScore: string;
    awayScore: string;
    homeLogo?: string;
    awayLogo?: string;
  };
}

export default function GoalCelebration({ show, onComplete, teamName, match }: GoalCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Trigger confetti
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ 
            ...defaults, 
            particleCount, 
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#10b981', '#ffffff', '#059669'] 
        });
        confetti({ 
            ...defaults, 
            particleCount, 
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#10b981', '#ffffff', '#059669'] 
        });
      }, 250);

      const timer = setTimeout(() => {
        onComplete();
      }, 6000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          
          <button 
            onClick={() => { setIsVisible(false); onComplete(); }}
            className="absolute top-8 right-8 z-50 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-xl rounded-full text-white border border-white/20 transition-all pointer-events-auto"
            title="إغلاق الاحتفال"
          >
            <X size={24} />
          </button>
          
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-white p-6 rounded-full shadow-2xl mb-6 ring-8 ring-primary/20"
            >
              <Trophy size={80} className="text-primary fill-primary" />
            </motion.div>

            <div className="text-center">
              <motion.h1 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_10px_20px_rgba(16,185,129,0.5)]"
              >
                GOOOOAL!
              </motion.h1>
              
              <h2 className="text-3xl font-black text-white mt-4 uppercase drop-shadow-lg">
                سيد البلد سجل!
              </h2>
              
              {match && (
                <div className="mt-8 flex justify-center">
                  <div className="inline-flex items-center gap-3 sm:gap-5 bg-black/80 backdrop-blur-3xl px-4 py-3 rounded-[32px] border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 p-2 flex items-center justify-center">
                        <SafeImage teamName={match.homeTeam} src={match.homeLogo} className="w-full h-full object-contain drop-shadow-md" alt={match.homeTeam} />
                      </div>
                      <span className="text-4xl font-black text-white tabular-nums">
                        {match.homeScore}
                      </span>
                    </div>
                    
                    <div className="h-8 w-[2px] bg-white/20 mx-1" />
                    
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-black text-white tabular-nums">
                        {match.awayScore}
                      </span>
                      <div className="w-12 h-12 rounded-2xl bg-white/5 p-2 flex items-center justify-center">
                        <SafeImage teamName={match.awayTeam} src={match.awayLogo} className="w-full h-full object-contain drop-shadow-md" alt={match.awayTeam} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
             <motion.div 
               animate={{ 
                 boxShadow: [
                   "0 0 0px 0px rgba(16,185,129,0)", 
                   "0 0 100px 50px rgba(16,185,129,0.3)", 
                   "0 0 0px 0px rgba(16,185,129,0)"
                 ] 
               }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="w-1 h-1 rounded-full"
             />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
