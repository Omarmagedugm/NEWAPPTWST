import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone } from 'lucide-react';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Android/Chrome logic
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay to show it
      setTimeout(() => setShowAndroidPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowAndroidPrompt(false);
      setShowIosPrompt(false);
      setDeferredPrompt(null);
    });

    // iOS logic
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIos && isSafari && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => setShowIosPrompt(true), 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowAndroidPrompt(false);
    }
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {/* Android/Chrome Prompt */}
      {showAndroidPrompt && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[999] sm:max-w-md sm:mx-auto standalone:hidden"
        >
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-5 shadow-2xl border border-border-light dark:border-border-dark flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                   <Smartphone size={24} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-800 dark:text-white">تثبيت قناة الاتحاد</h3>
                   <p className="text-[10px] font-bold text-slate-500">تصفح أسرع وبدون إنترنت</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl text-[11px] font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  تثبيت الآن
                </button>
                <button 
                  onClick={() => setShowAndroidPrompt(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
             </div>
          </div>
        </motion.div>
      )}

      {/* iOS Safari Prompt */}
      {showIosPrompt && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[999] sm:max-w-md sm:mx-auto standalone:hidden"
        >
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 shadow-2xl border border-border-light dark:border-border-dark relative overflow-hidden">
             {/* Decorative element */}
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
             
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Smartphone size={24} />
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white">أضف قناة الاتحاد لهاتفك</h3>
                      <p className="text-[10px] font-bold text-slate-500">تجربة تطبيق كاملة على iPhone</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowIosPrompt(false)}
                  className="p-1 text-slate-400"
                >
                  <X size={16} />
                </button>
             </div>

             <div className="space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-surface-dark p-3 rounded-2xl">
                   <div className="w-7 h-7 bg-white dark:bg-card-dark rounded-lg flex items-center justify-center shadow-sm">
                      <Share size={14} className="text-blue-500" />
                   </div>
                   <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">1. اضغط على زر "مشاركة" في Safari</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-surface-dark p-3 rounded-2xl">
                   <div className="w-7 h-7 bg-white dark:bg-card-dark rounded-lg flex items-center justify-center shadow-sm">
                      <PlusSquare size={14} className="text-slate-700 dark:text-white" />
                   </div>
                   <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">2. اختر "إضافة لقائمة الشاشة الرئيسية"</p>
                </div>
             </div>

             <div className="mt-4 flex flex-col items-center gap-2">
                <div className="animate-bounce">
                   <div className="w-1 h-4 bg-primary rounded-full"></div>
                   <div className="w-3 h-3 border-r-4 border-b-4 border-primary rotate-45 -mt-2"></div>
                </div>
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">تطبيق سريع وبسيط</span>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
