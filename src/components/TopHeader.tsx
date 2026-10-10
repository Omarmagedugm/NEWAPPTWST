import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Menu, Bell, Search, ChevronRight, Sun, Moon, Settings, BellRing } from 'lucide-react';
import { useAppStore } from '../store';
import { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { auth } from '../lib/firebase';
import { requestNotificationPermission, isNotificationPermissionGranted } from '../lib/onesignal';
import toast from 'react-hot-toast';

export default function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, theme, toggleTheme, appSettings, sectionFlags } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [permission, setPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  });
  const [isActivating, setIsActivating] = useState(false);
  const desktopNavRef = useRef<HTMLElement>(null);

  // Auto-scroll active desktop navigation item into view
  useEffect(() => {
    if (desktopNavRef.current) {
      const activeEl = desktopNavRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  }, [location.pathname]);

  // Page logo is PNG by default (/icon.png or custom configured logo)
  const customLightLogo = appSettings?.headerLogoLight || appSettings?.appLogo || '/icon.png';
  const customDarkLogo = appSettings?.headerLogoDark || appSettings?.appLogo || '/icon.png';
  const currentLogo = (theme === 'dark' ? (customDarkLogo || customLightLogo) : (customLightLogo || customDarkLogo)) || '/icon.png';

  // Check if image is already cached/loaded to avoid text flash during client navigation
  const [isImageLoaded, setIsImageLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = currentLogo;
      return img.complete && img.naturalWidth > 0;
    }
    return false;
  });

  useEffect(() => {
    setImageError(false);
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = currentLogo;
      if (img.complete && img.naturalWidth > 0) {
        setIsImageLoaded(true);
      }
    }
  }, [currentLogo]);

  // Keep permission state in sync with browser efficiently via focus/visibilitychange
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const updatePermission = () => {
        setPermission(Notification.permission);
      };
      updatePermission();
      window.addEventListener('focus', updatePermission);
      document.addEventListener('visibilitychange', updatePermission);
      return () => {
        window.removeEventListener('focus', updatePermission);
        document.removeEventListener('visibilitychange', updatePermission);
      };
    }
  }, []);

  const handleNotificationClick = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('المتصفح الحالي لا يدعم إشعارات الويب');
      return;
    }

    if (Notification.permission === 'denied') {
      toast.error('تم حظر الإشعارات في المتصفح. اضغط على أيقونة القفل 🔒 بجانب الرابط وفعل الإشعارات.', {
        duration: 6000
      });
      return;
    }

    setIsActivating(true);
    try {
      const result = await requestNotificationPermission();
      const currentPerm = (typeof window !== 'undefined' && 'Notification' in window) ? (Notification.permission as string) : 'denied';
      setPermission(currentPerm);

      if (result.success) {
        toast.success('تم تفعيل إشعارات المباريات والبث المباشر بنجاح 🔔', {
          icon: '✅',
          duration: 4000
        });
      } else if (result.reason === 'ios_not_standalone') {
        toast('يرجى تثبيت التطبيق أولاً (إضافة إلى الشاشة الرئيسية 📲) لتفعيل الإشعارات على هواتف آيفون', {
          duration: 6000
        });
      } else if (result.reason === 'permission_denied') {
        toast.error('تم حظر الإشعارات في المتصفح. اضغط على أيقونة القفل 🔒 بجانب الرابط وفعل الإشعارات.', {
          duration: 6000
        });
      } else if (result.reason === 'subscription_creation_timeout') {
        toast('تم منح الإذن في المتصفح! جارٍ تسجيل الجهاز في OneSignal...', {
          icon: '⏳',
          duration: 5000
        });
      } else if (result.reason === 'unsupported') {
        toast.error('المتصفح الحالي لا يدعم إشعارات الويب');
      }
    } catch (err: any) {
      console.error('Notification activation error:', err);
      toast.error('تعذر تفعيل الإشعارات، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsActivating(false);
    }
  };

  const hideHeaderPaths = ['/auth'];
  if (hideHeaderPaths.includes(location.pathname)) return null;

  const isHome = location.pathname === '/';
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'قناة الاتحاد السكندري';
    if (path === '/news') return 'مركز الأخبار';
    if (path.startsWith('/news/')) return 'تفاصيل الخبر';
    if (path === '/media' || path === '/library') return 'المكتبة الرقمية والوسائط';
    if (path === '/live') return 'البث المباشر';
    if (path === '/matches') return 'مباريات كرة القدم';
    if (path === '/profile') return 'ملفي الشخصي';
    if (path === '/fan-zone' || path === '/feed') return 'منطقة المشجعين';
    if (path === '/club-members') return 'أعضاء النادي';
    if (path === '/history') return 'تاريخ النادي';
    if (path === '/social' || path === '/social-media' || path === '/facebook') return 'سوشيال ميديا';
    if (path === '/business' || path.startsWith('/business/')) return 'اتحاداوي بيزنس';
    if (path === '/store') return 'متجر النادي';
    if (path === '/bookmarks') return 'المحفوظات';
    if (path === '/admin') return 'لوحة التحكم';
    return 'الاتحاد السكندري';
  };

  const title = getPageTitle();

  const isOmar = auth.currentUser?.email?.toLowerCase() === 'omarmagedugm@ittihad.club';
  const isDev = auth.currentUser?.email?.toLowerCase() === 'copyrightofficialco@gmail.com';
  const isAdmin = (profile?.role === 'admin' || profile?.role === 'moderator' || (profile?.roles && (profile.roles.includes('admin') || profile.roles.includes('moderator')))) || isOmar || isDev;

  const logoHeight = appSettings?.headerLogoHeight || (
    appSettings?.headerLogoSize === 'small' ? 36 :
    appSettings?.headerLogoSize === 'large' ? 62 :
    appSettings?.headerLogoSize === 'xlarge' ? 78 : 48
  );
  const spacerHeight = Math.max(60, logoHeight + 16);

  const isPushGranted = permission === 'granted';

  return (
    <>
      {/* Spacer to prevent content from going under the fixed header */}
      <div style={{ height: `calc(env(safe-area-inset-top) + ${spacerHeight}px)` }} className="w-full"></div>
      <header id="global-header" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }} className="fixed top-0 inset-x-0 w-full z-50 glass-header border-b border-black/5 dark:border-white/[0.07] px-3 sm:px-4 md:px-8 pb-2.5 transition-colors duration-200">
        <div className="flex items-center justify-between gap-2 w-full max-w-7xl mx-auto">
          {/* Right Section: Mobile Menu / Back + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            {isHome ? (
              <button 
                id="menu-button"
                aria-label="القائمة الرئيسية"
                onClick={() => setIsMenuOpen(true)}
                className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full glass-chip text-slate-600 dark:text-slate-300 hover:text-primary active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Menu size={22} strokeWidth={2.5} />
              </button>
            ) : (
              <button 
                id="back-button"
                aria-label="الرجوع للصفحة السابقة"
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full glass-chip text-slate-600 dark:text-slate-300 hover:text-primary active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <ChevronRight size={24} className="rotate-180" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-2 py-0.5 min-w-0 shrink">
              {/* Written text logo: only shown before the image loads or as fallback if image errors */}
              {(!isImageLoaded || imageError) && (
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-primary-dark dark:text-white truncate max-w-[170px] sm:max-w-[240px]">
                  {appSettings?.logoText || 'قناة الاتحاد السكندري'}
                </h1>
              )}

              {/* PNG Page Logo Image */}
              {!imageError && (
                <img 
                  src={currentLogo} 
                  alt={appSettings?.appName || "قناة الاتحاد السكندري"} 
                  style={{
                    height: `${logoHeight}px`,
                    maxHeight: '92px',
                    display: isImageLoaded ? 'block' : 'none'
                  }}
                  className="w-auto max-w-[150px] sm:max-w-[200px] md:max-w-[250px] lg:max-w-[300px] object-contain transition-all duration-300 shrink" 
                  referrerPolicy="no-referrer"
                  onLoad={() => {
                    setIsImageLoaded(true);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageError(true);
                    setIsImageLoaded(false);
                  }}
                />
              )}
            </Link>
          </div>

          {/* Desktop Navigation Links (Visible on PC / Tablet) */}
          <nav 
            id="desktop-main-menu"
            ref={desktopNavRef}
            onWheel={(e) => {
              if (e.deltaY !== 0 && desktopNavRef.current) {
                desktopNavRef.current.scrollLeft += e.deltaY;
              }
            }}
            aria-label="القائمة الرئيسية"
            className="hidden md:flex items-center gap-1 flex-nowrap shrink whitespace-nowrap overflow-x-auto no-scrollbar scroll-smooth max-w-xl lg:max-w-2xl xl:max-w-3xl select-none"
          >
            {[
              { path: '/', label: 'الرئيسية' },
              { path: '/news', label: 'الأخبار' },
              { path: '/matches', label: 'المباريات' },
              { path: '/live', label: 'البث المباشر 🔴' },
              { path: '/fan-zone', label: 'فان زون ⚽' },
              ...(sectionFlags.worldFans !== false ? [{ path: '/world-fans', label: 'اتحاداوية العالم 🌍' }] : []),
              { path: '/library', label: 'المكتبة' },
              { path: '/social', label: 'سوشيال ميديا' },
            ].map(item => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-active={isActive ? "true" : "false"}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors duration-200 shrink-0 ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Left Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAdmin && location.pathname.includes('/admin') && (
              <button 
                onClick={() => navigate(-1)}
                aria-label="رجوع للصفحة السابقة"
                className="flex h-10 w-10 items-center justify-center rounded-full glass-chip text-slate-500 dark:text-slate-400 hover:text-primary active:scale-95 transition-all duration-200 shadow-sm cursor-pointer"
                title="رجوع للصفحة السابقة"
              >
                <ChevronRight size={22} strokeWidth={2.5} />
              </button>
            )}
            {isAdmin && !location.pathname.includes('/admin') && (
              <Link 
                to={`/admin?tab=${(() => {
                  try {
                    return typeof window !== 'undefined' ? localStorage.getItem('lastAdminTab') || 'overview' : 'overview';
                  } catch (e) { return 'overview'; }
                })()}`}
                aria-label="لوحة التحكم"
                className="flex h-10 w-10 items-center justify-center rounded-full glass-chip text-slate-500 dark:text-slate-400 hover:text-primary active:scale-95 transition-all duration-200 shadow-sm cursor-pointer"
                title="لوحة التحكم"
              >
                <Settings size={20} strokeWidth={2.5} />
              </Link>
            )}

            {/* OneSignal Web Push Notifications Bell Toggle */}
            <button 
              id="notification-button"
              type="button"
              aria-label={isPushGranted ? 'إشعارات OneSignal مفعلة' : 'تفعيل إشعارات OneSignal'}
              onClick={handleNotificationClick}
              disabled={isActivating}
              className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
                isPushGranted
                  ? 'glass-chip text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'glass-chip text-primary border border-primary/20'
              }`}
              title={isPushGranted ? 'إشعارات المباريات مفعلة 🔔' : 'اضغط لتفعيل إشعارات المباريات والأهداف 🔔'}
            >
              {isPushGranted ? (
                <BellRing size={20} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Bell size={20} strokeWidth={2.5} className="animate-pulse text-primary" />
              )}
              
              {/* Status Dot */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none">
                {isPushGranted ? (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white dark:ring-surface-dark"></span>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary ring-2 ring-white dark:ring-surface-dark"></span>
                  </>
                )}
              </span>
            </button>

            {/* Theme Toggle Button */}
            <button 
              id="theme-toggle-button"
              type="button"
              aria-label="تبديل المظهر"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full glass-chip text-slate-500 dark:text-slate-400 hover:text-primary active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </button>

            {/* Search News Button */}
            <Link 
              id="search-button-link"
              aria-label="البحث عن الأخبار"
              to="/news"
              className="flex h-10 w-10 items-center justify-center rounded-full glass-chip text-slate-500 dark:text-slate-400 hover:text-primary transition-all duration-300 cursor-pointer"
              title="البحث عن الأخبار"
            >
              <Search size={20} strokeWidth={2.5} />
            </Link>

            {/* User Profile Quick Link on Desktop */}
            <Link
              to="/profile"
              className="hidden md:flex items-center justify-center h-10 w-10 rounded-full glass-chip text-slate-600 dark:text-slate-300 hover:text-primary transition-all overflow-hidden cursor-pointer"
              title="الملف الشخصي"
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="material-symbols-outlined !text-[20px]">person</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} profile={profile} />
    </>
  );
}
