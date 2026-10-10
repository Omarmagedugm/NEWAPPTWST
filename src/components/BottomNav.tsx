import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', icon: 'home', label: 'الرئيسية' },
  { path: '/news', icon: 'newspaper', label: 'الأخبار' },
  { path: '/fan-zone', icon: 'stadium', label: 'فان زون' },
  { path: '/library', icon: 'perm_media', label: 'الوسائط' },
  { path: '/profile', icon: 'person', label: 'حسابي' },
];

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav
      aria-label="شريط التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-50 md:hidden px-4 pointer-events-none select-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      <div className="pointer-events-auto mx-auto max-w-md glass-nav rounded-full p-1.5 flex items-center justify-between gap-1 border border-black/5 dark:border-white/10 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        {navItems.map((item) => {
          const isActive = path === item.path || (item.path !== '/' && path.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-center gap-1.5 h-12 rounded-full transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-primary text-white px-4 shadow-sm'
                  : 'w-12 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined !text-[24px]"
                style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
              >
                {item.icon}
              </span>
              {isActive && <span className="text-[12px] font-bold whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
