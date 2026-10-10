import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wrench, Clock, RefreshCw, ShieldAlert, Sparkles, LogIn, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import toast from 'react-hot-toast';

export default function MaintenanceScreen() {
  const { appSettings, theme, profile } = useAppStore();
  const [checking, setChecking] = useState(false);

  const title = appSettings?.maintenanceTitle?.trim() || 'سنعود بعد قليل انتظرونا';
  const message = appSettings?.maintenanceMessage?.trim() || 'نقوم حالياً بإجراء بعض أعمال الصيانة والتطوير الدورية لتقديم تجربة أفضل وأسرع لكافة جماهير ومحبي سيد البلد. سنعود بعد قليل، انتظرونا!';
  const estimatedTime = appSettings?.maintenanceEstimatedTime?.trim();
  const logo = appSettings?.appLogo || '/icon.png';

  const socialLinks = appSettings?.socialLinks || {
    facebook: appSettings?.facebookPageUrl || 'https://www.facebook.com/Itthadalexchannel',
    youtube: 'https://youtube.com/@itthadalexchannel',
    instagram: 'https://instagram.com/itthadalexchannel',
    tiktok: 'https://tiktok.com/@itthadalexchannel',
    twitter: 'https://x.com/itthadalexchannel',
    whatsapp: 'https://wa.me/itthadalexchannel'
  };

  const handleRefreshStatus = async () => {
    setChecking(true);
    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('fs_cache_')) localStorage.removeItem(k);
        });
      }
      window.dispatchEvent(new CustomEvent('app-pull-refresh'));
      await new Promise(r => setTimeout(r, 900));
      toast.success('تم فحص حالة الخادم والبيانات بنجاح');
    } catch (e) {
      toast.error('تعذر تحديث الحالة حالياً');
    } finally {
      setChecking(false);
    }
  };

  const isAdmin = profile?.role === 'admin' || (profile?.roles && profile.roles.includes('admin')) || profile?.role === 'moderator';

  return (
    <div id="maintenance-screen-root" className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-4 md:p-8 relative overflow-hidden font-display selection:bg-emerald-500 selection:text-white" dir="rtl">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-900/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header info */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-3">
          <img 
            src={logo} 
            alt="شعار قناة الاتحاد" 
            className="w-11 h-11 object-contain drop-shadow-md"
            onError={(e) => { e.currentTarget.src = '/icon.png'; }}
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-sm font-black text-white leading-tight">قناة الاتحاد السكندري</h2>
            <p className="text-[10px] text-emerald-400 font-bold">صوت وجماهير زعيم الثغر</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            وضع الصيانة نشط
          </span>
        </div>
      </header>

      {/* Center Hero Card */}
      <main className="w-full max-w-xl my-auto py-8 z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-6"
        >
          {/* Animated Glow Rings */}
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/30 flex items-center justify-center relative shadow-2xl shadow-emerald-950/60 backdrop-blur-xl">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="text-emerald-400"
            >
              <Wrench size={52} strokeWidth={2.2} />
            </motion.div>
            
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-lg font-black text-xs">
              <Sparkles size={16} />
            </div>
          </div>
        </motion.div>

        {/* Big Display Title */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-4 drop-shadow-md"
        >
          {title}
        </motion.h1>

        {/* Explanatory Message */}
        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm md:text-base text-slate-300 font-bold leading-relaxed max-w-md mb-6"
        >
          {message}
        </motion.p>

        {/* Estimated Time Badge (if configured) */}
        {estimatedTime && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/30 px-4 py-2 rounded-2xl text-emerald-200 text-xs font-black mb-6 shadow-inner"
          >
            <Clock size={16} className="text-emerald-400 flex-shrink-0" />
            <span>العودة المتوقعة: <strong className="text-white font-mono">{estimatedTime}</strong></span>
          </motion.div>
        )}

        {/* Refresh Check Action */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs mb-8"
        >
          <button
            onClick={handleRefreshStatus}
            disabled={checking}
            id="maintenance-refresh-btn"
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 hover:shadow-emerald-700/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'جاري الفحص...' : 'فحص حالة الخدمة'}</span>
          </button>
        </motion.div>

        {/* Social Channels Section */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-5 backdrop-blur-md"
        >
          <p className="text-xs font-black text-slate-400 mb-3.5">
            تابع تغطياتنا وأحدث الأخبار عبر منصاتنا الرسمية:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {socialLinks?.facebook && (
              <a 
                href={socialLinks.facebook} 
                target="_blank" 
                rel="noreferrer"
                id="social-facebook-maintenance"
                className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5"
              >
                فيسبوك
              </a>
            )}
            {socialLinks?.youtube && (
              <a 
                href={socialLinks.youtube} 
                target="_blank" 
                rel="noreferrer"
                id="social-youtube-maintenance"
                className="px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5"
              >
                يوتيوب
              </a>
            )}
            {socialLinks?.instagram && (
              <a 
                href={socialLinks.instagram} 
                target="_blank" 
                rel="noreferrer"
                id="social-instagram-maintenance"
                className="px-3.5 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600 border border-pink-500/30 text-pink-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5"
              >
                إنستجرام
              </a>
            )}
            {socialLinks?.tiktok && (
              <a 
                href={socialLinks.tiktok} 
                target="_blank" 
                rel="noreferrer"
                id="social-tiktok-maintenance"
                className="px-3.5 py-2 rounded-xl bg-slate-700/40 hover:bg-slate-700 border border-slate-600/40 text-slate-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5"
              >
                تيك توك
              </a>
            )}
            {socialLinks?.whatsapp && (
              <a 
                href={socialLinks.whatsapp} 
                target="_blank" 
                rel="noreferrer"
                id="social-whatsapp-maintenance"
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-black transition-all flex items-center gap-1.5"
              >
                واتساب
              </a>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer & Admin access */}
      <footer className="w-full max-w-4xl flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-800/80 pt-4 z-10">
        <div>
          <span>© {new Date().getFullYear()} قناة الاتحاد السكندري. جميع الحقوق محفوظة.</span>
        </div>

        <div>
          {isAdmin ? (
            <Link
              to="/admin"
              id="admin-direct-link"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-500/30 text-emerald-300 font-black transition-colors"
            >
              <ShieldAlert size={14} />
              <span>لوحة التحكم (أنت مدير)</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              id="admin-login-link"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogIn size={13} />
              <span>دخول الإدارة</span>
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
