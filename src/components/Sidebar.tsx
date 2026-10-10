import { useState, useEffect } from 'react';
import { doc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { X, LayoutDashboard, Flag, MessageSquare, Info, Mail, Home, LogOut, ShieldCheck, FileText, Building2, Globe, HeartHandshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, UserProfile, SidebarMenuItem, DEFAULT_SIDEBAR_ITEMS } from '../store';
import { getOptimizedImage } from '../lib/cloudinary';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export default function Sidebar({ isOpen, onClose, profile }: SidebarProps) {
  const { appSettings, customPages, aiConfig, sidebarMenuItems, sectionFlags } = useAppStore();
  const navigate = useNavigate();
  
  // High-level admin check
  const isOmar = auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isDev = auth.currentUser?.email === 'copyrightofficialco@gmail.com';
  const isAdmin = (profile?.role === 'admin' || profile?.role === 'moderator' || (profile?.roles && (profile.roles.includes('admin') || profile.roles.includes('moderator')))) || isOmar || isDev;
  const isAnonymous = !auth.currentUser || auth.currentUser.isAnonymous;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      try {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
      } catch (e) {}
      onClose();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth', { replace: true });
    }
  };

  // Merge items with fallback to defaults if store items are empty
  let rawItems = (sidebarMenuItems && sidebarMenuItems.length > 0) ? [...sidebarMenuItems] : [...DEFAULT_SIDEBAR_ITEMS];

  // Guarantee that essential default items like world-fans and club-members are present even if an older cached sidebar array exists
  DEFAULT_SIDEBAR_ITEMS.forEach(defaultItem => {
    if (!rawItems.some(item => item.id === defaultItem.id || item.path === defaultItem.path)) {
      rawItems.push(defaultItem);
    }
  });
  
  // Filter active and sort by order
  const sortedItems = [...rawItems]
    .filter(item => item.active !== false)
    .filter(item => {
      if (item.id === 'jersey-tryon' && aiConfig?.enabled === false) return false;
      if (sectionFlags.fanServices === false && (item.id === 'public-services' || item.id === 'services' || item.path === '/services' || item.path === '/public-services' || item.path?.startsWith('/services') || item.path?.startsWith('/education'))) return false;
      if (sectionFlags.worldFans === false && (item.id === 'world-fans' || item.path === '/world-fans' || item.path === '/world-association')) return false;
      if (sectionFlags.fanStore === false && (item.id === 'store' || item.path === '/store')) return false;
      if (sectionFlags.itthadawyBusiness === false && (item.id === 'business' || item.path === '/business' || item.path?.startsWith('/business'))) return false;
      return true;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const mainMenuItems = sortedItems.filter(item => item.group !== 'more' && item.group !== 'legal');
  const moreMenuItems = sortedItems.filter(item => item.group === 'more');

  const renderSidebarIcon = (item: SidebarMenuItem) => {
    if (item.iconType === 'facebook' || item.id === 'social') {
      return (
        <div className="w-5 h-5 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </div>
      );
    }
    if (item.icon === 'ShieldCheck' || item.id === 'club-members') {
      return <ShieldCheck size={20} className="text-amber-500 shrink-0" />;
    }
    if (item.icon === 'Globe' || item.id === 'world-fans') {
      return <Globe size={20} className="text-emerald-500 shrink-0" />;
    }
    if (item.icon === 'volunteer_activism' || item.id === 'public-services') {
      return <HeartHandshake size={20} className="text-emerald-500 shrink-0" />;
    }
    if (item.icon === 'Building2' || item.id === 'business') {
      return <Building2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (item.icon === 'live_tv' || item.id === 'live') {
      return <span className="material-symbols-outlined !text-[20px] text-red-500 animate-pulse shrink-0">live_tv</span>;
    }
    if (item.icon === 'stadium' || item.id === 'fan-zone') {
      return <span className="material-symbols-outlined !text-[20px] text-accent shrink-0">stadium</span>;
    }
    if (item.icon === 'home' || item.id === 'home') {
      return <span className="material-symbols-outlined !text-[20px] text-primary shrink-0">home</span>;
    }
    if (item.icon === 'bolt' || item.id === 'jersey-tryon') {
      return <span className="material-symbols-outlined !text-[20px] text-primary shrink-0">bolt</span>;
    }
    if (item.icon === 'newspaper') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">newspaper</span>;
    }
    if (item.icon === 'sports_soccer') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">sports_soccer</span>;
    }
    if (item.icon === 'perm_media') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">perm_media</span>;
    }
    if (item.icon === 'history_edu') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">history_edu</span>;
    }
    if (item.icon === 'shopping_bag') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">shopping_bag</span>;
    }
    if (item.icon === 'person') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">person</span>;
    }
    if (item.icon === 'bookmark') {
      return <span className="material-symbols-outlined !text-[20px] shrink-0">bookmark</span>;
    }
    return <span className="material-symbols-outlined !text-[20px] shrink-0">{item.icon || 'link'}</span>;
  };

  const getItemCardClasses = (item: SidebarMenuItem) => {
    // If explicitly not highlighted or highlighted is undefined/false without a highlight flag
    if (item.highlighted) {
      const color = item.highlightColor || 'primary';
      switch (color) {
        case 'amber':
          return 'bg-amber-500/10 hover:bg-amber-500/20 text-slate-800 dark:text-white border border-amber-500/30';
        case 'blue':
          return 'bg-blue-500/10 hover:bg-blue-500/20 text-slate-800 dark:text-white border border-blue-500/30';
        case 'emerald':
          return 'bg-emerald-500/10 hover:bg-emerald-500/20 text-slate-800 dark:text-white border border-emerald-500/30';
        case 'purple':
          return 'bg-purple-500/10 hover:bg-purple-500/20 text-slate-800 dark:text-white border border-purple-500/30';
        case 'red':
          return 'bg-red-500/10 hover:bg-red-500/20 text-slate-800 dark:text-white border border-red-500/30';
        case 'primary':
        default:
          return 'bg-primary/10 hover:bg-primary/20 text-slate-800 dark:text-white border border-primary/30';
      }
    }
    return 'hover:bg-slate-50 dark:hover:bg-surface-dark text-slate-700 dark:text-slate-300';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-4/5 max-w-sm h-full bg-white/95 dark:bg-card-dark/95 backdrop-blur-2xl shadow-2xl flex flex-col border-l border-white/20 dark:border-white/10"
          >
            {/* Sidebar Header */}
            <div className="p-6 pb-8 bg-gradient-to-br from-primary to-primary-dark text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              <button 
                onClick={onClose}
                className="absolute top-4 left-4 h-8 w-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>
              <Link to="/profile" onClick={onClose} className="flex items-center gap-4 relative z-10 pt-4 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="h-16 w-16 rounded-2xl bg-white/20 p-2 ring-1 ring-white/30 shadow-inner overflow-hidden flex items-center justify-center">
                  <img src={getOptimizedImage((isAnonymous ? appSettings.appLogo : profile.avatar), 200) || undefined} onError={(e) => { e.currentTarget.src = '/icon.png'; }} alt="Profile" className="w-full h-full object-contain rounded-[14px]" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isAnonymous ? "أهلاً مشجع اتحاداوي" : `أهلاً، ${profile.name || 'مشجع إتحادي'}`}
                  </h3>
                </div>
              </Link>
            </div>

            {/* Sidebar Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {isAdmin && (
                <Link to="/admin" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light border border-primary/20 pressable mb-4">
                  <LayoutDashboard size={20} />
                  <div className="flex flex-col">
                    <span className="text-sm font-black italic">ADMIN CONSOLE</span>
                    <span className="text-[9px] font-bold opacity-70">إدارة محتوى التطبيق</span>
                  </div>
                </Link>
              )}

              <div className="pt-2 pb-1 px-4">
                 <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">الأقسام الرئيسية</p>
              </div>
              
              {mainMenuItems.map((item) => {
                const isExternal = item.path.startsWith('http://') || item.path.startsWith('https://');
                if (isExternal) {
                  return (
                    <a
                      key={item.id}
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-colors pressable ${getItemCardClasses(item)}`}
                    >
                      <div className="flex items-center gap-3">
                        {renderSidebarIcon(item)}
                        <span className="text-sm font-bold">{item.title}</span>
                      </div>
                      {item.badge && item.badge.trim() !== '' && (
                        <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase ${item.badgeColor || 'bg-primary text-white'}`}>
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-colors pressable ${getItemCardClasses(item)}`}
                  >
                    <div className="flex items-center gap-3">
                      {renderSidebarIcon(item)}
                      <span className="text-sm font-bold">{item.title}</span>
                    </div>
                    {item.badge && item.badge.trim() !== '' && (
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase ${item.badgeColor || 'bg-primary text-white'}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              {customPages.filter(page => page.active !== false).length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-4 mt-2 border-t border-slate-100 dark:border-border-dark">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-2">صفحات إضافية</p>
                  </div>
                  {customPages.filter(page => page.active !== false).map(page => (
                    <Link key={page.id} to={`/page/${page.slug}`} onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-surface-dark transition-colors text-slate-700 dark:text-slate-300 pressable">
                      <FileText size={20} className="text-slate-400 shrink-0" />
                      <span className="text-sm font-bold">{page.title}</span>
                    </Link>
                  ))}
                </>
              )}

              {moreMenuItems.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-4 border-t border-slate-100 dark:border-border-dark mt-2">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-2">استكشف المزيد</p>
                  </div>
                  {moreMenuItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={onClose}
                      className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-surface-dark transition-colors text-slate-700 dark:text-slate-300 pressable"
                    >
                      <div className="flex items-center gap-3">
                        {renderSidebarIcon(item)}
                        <span className="text-sm font-bold">{item.title}</span>
                      </div>
                      {item.badge && item.badge.trim() !== '' && (
                        <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase ${item.badgeColor || 'bg-primary text-white'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </>
              )}

              <div className="pt-2 pb-1 px-4 border-t border-slate-100 dark:border-border-dark mt-2">
                 <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-2">قانوني / Legal</p>
              </div>

              <a href="https://itthadalextv.com/privacy" className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-surface-dark transition-colors text-slate-700 dark:text-slate-300 pressable">
                <ShieldCheck size={20} className="text-slate-400 shrink-0" />
                <span className="text-sm font-bold">سياسة الخصوصية</span>
              </a>
              
              <a href="https://itthadalextv.com/terms" className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-surface-dark transition-colors text-slate-700 dark:text-slate-300 pressable">
                <FileText size={20} className="text-slate-400 shrink-0" />
                <span className="text-sm font-bold">شروط الاستخدام</span>
              </a>

              <button onClick={() => { 
                toast((t) => (
                  <div className="flex flex-col gap-2 p-1">
                    <p className="font-black text-sm text-slate-800">يمكنك مراسلتنا عبر:</p>
                    <p className="text-xs font-bold text-primary">info@itthadalextv.com</p>
                    <p className="text-[10px] font-bold text-slate-500">أو عبر رسائل الصفحة الرسمية على فيسبوك</p>
                    <button 
                      onClick={() => toast.dismiss(t.id)}
                      className="mt-2 bg-slate-100 py-1.5 rounded-lg text-[10px] font-black uppercase"
                    >
                      إغلاق
                    </button>
                  </div>
                ), { duration: 6000 });
                onClose(); 
              }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-surface-dark transition-colors text-slate-700 dark:text-slate-300 pressable text-right">
                <Mail size={20} className="shrink-0" />
                <span className="text-sm font-bold">اتصل بنا</span>
              </button>
              
              {!isAnonymous ? (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-red-50 text-red-500 dark:hover:bg-red-500/10 transition-colors pressable text-right mt-4"
                >
                  <LogOut size={20} className="shrink-0" />
                  <span className="text-sm font-black">تسجيل الخروج</span>
                </button>
              ) : (
                <Link 
                  to="/auth"
                  onClick={onClose}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-primary text-white hover:bg-primary-dark transition-colors pressable text-right mt-4"
                >
                  <span className="material-symbols-outlined !text-[20px] shrink-0">login</span>
                  <span className="text-sm font-black">تسجيل الدخول</span>
                </Link>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-border-dark">
              <div className="flex items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-card-dark/50 border border-border-light dark:border-border-dark gap-3">
                {(appSettings.logoType || 'image') === 'image' ? (
                  <img src={getOptimizedImage(appSettings.appLogo, 100) || undefined} onError={(e) => { e.currentTarget.src = '/icon.png'; }} className="h-8 w-8 opacity-40 grayscale" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xl font-black text-slate-400 opacity-60">{appSettings.logoText}</span>
                )}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400">إصدار التطبيق 1.2.0</p>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{appSettings.appName}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
