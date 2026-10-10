import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAppStore, AppRole } from '../store';
import { 
  LayoutDashboard, 
  Newspaper, 
  PlayCircle, 
  Trophy, 
  Users as UsersIcon, 
  Settings as SettingsIcon,
  MessageSquare,
  BarChart3,
  Radio,
  History as HistoryIcon,
  Rss,
  MessageCircle,
  Tags,
  ShoppingBag,
  ShoppingCart,
  Music,
  BookOpen,
  CloudSun,
  Bell,
  Database,
  Sparkles,
  Shield,
  ShieldCheck,
  Building2,
  Globe,
  Menu,
  RotateCcw,
  RadioTower,
  TrendingUp,
  HeartHandshake,
  Sliders,
  X
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onClose?: () => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, onClose }: AdminSidebarProps) {
  const { profile, businesses, businessUpdates, orders, worldApplications } = useAppStore();

  const pendingBusinessesCount = businesses.filter(b => b.status === 'pending').length + businessUpdates.filter(u => u.status === 'pending').length;
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const pendingWorldApplicationsCount = (worldApplications || []).filter(a => a.status === 'pending').length;
  const navigate = useNavigate();
  const Shield = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );

  const isDev = auth.currentUser?.email === 'copyrightofficialco@gmail.com' || auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isSuperAdmin = isDev || profile.role === 'admin' || profile.role === 'superadmin' || (profile.roles && profile.roles.includes('admin'));
  
  const hasRole = (role: AppRole | AppRole[]) => {
    if (isSuperAdmin) return true;
    const userRoles = [...(profile.roles || [])];
    
    // Legacy support for older roles
    if (profile.role === 'writer' && !userRoles.includes('news_editor')) userRoles.push('news_editor');
    if (profile.role === 'moderator' && userRoles.length === 0) {
      userRoles.push('user_manager');
    }
    
    const requiredRoles = Array.isArray(role) ? role : [role];
    return requiredRoles.some(r => userRoles.includes(r));
  };

  const isAdmin = isSuperAdmin;

  interface TabItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    show: boolean;
    link?: string;
    badge?: number;
  }

  const groupedTabs: { title: string; items: TabItem[] }[] = [
    { title: 'الرئيسية', items: [
      { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'لوحة القيادة', show: true },
      { id: 'analytics', icon: <TrendingUp size={18} className="text-emerald-500" />, label: 'الإحصاءات والتفاعل ⚡', show: true },
      { id: 'sections-control', icon: <Sliders size={18} className="text-emerald-500" />, label: 'التحكم في الأقسام (ON/OFF)', show: isSuperAdmin || hasRole('layout_editor') },
      { id: 'layout', icon: <LayoutDashboard size={18} />, label: 'إدارة الصفحة الرئيسية', show: hasRole('layout_editor') },
      { id: 'sidebar-menu', icon: <Menu size={18} />, label: 'ترتيب القائمة الجانبية', show: hasRole('layout_editor') },
    ]},
    { title: 'إدارة الأخبار', items: [
      { id: 'news', icon: <Newspaper size={18} />, label: 'الأخبار والمقالات', show: hasRole('news_editor') },
      { id: 'news-categories', icon: <Tags size={18} />, label: 'أقسام الأخبار', show: hasRole('news_editor') },
      { id: 'news-tags', icon: <Tags size={18} />, label: 'وسوم الأخبار', show: hasRole('news_editor') },
    ]},
    { title: 'المباريات والفعاليات', items: [
      { id: 'clubs', icon: <Shield size={18} />, label: 'قائمة الأندية', show: hasRole(['matches_editor', 'layout_editor']) },
      { id: 'matches', icon: <Trophy size={18} />, label: 'المباريات', show: hasRole('matches_editor') },
      { id: 'live', icon: <Radio size={18} />, label: 'البث المباشر', show: hasRole('matches_editor') },
    ]},
    { title: 'محتوى المنصة', items: [
      { id: 'public-services', icon: <HeartHandshake size={18} className="text-emerald-500" />, label: 'خدمات الجمهور والتعليم 🟢', show: hasRole(['layout_editor', 'user_manager', 'media_editor']) },
      { id: 'club_members', icon: <ShieldCheck size={18} />, label: 'أعضاء النادي', show: hasRole(['members_editor', 'layout_editor', 'user_manager']) },
      { id: 'media', icon: <PlayCircle size={18} />, label: 'المالتيميديا والفيديو', show: hasRole('media_editor') },
      { id: 'music', icon: <Music size={18} />, label: 'المكتبة الموسيقية', show: hasRole('media_editor') },
      { id: 'books', icon: <BookOpen size={18} />, label: 'الكتب والمجلات', show: hasRole('media_editor') },
      { id: 'history', icon: <HistoryIcon size={18} />, label: 'تاريخ النادي', show: hasRole('layout_editor') },
      { id: 'city', icon: <CloudSun size={18} />, label: 'طقس الإسكندرية', show: hasRole('layout_editor') },
    ]},
    { title: 'التفاعل والجماهير', items: [
      { id: 'world-fans', icon: <Globe size={18} />, label: 'رابطة اتحاداوية العالم', show: isSuperAdmin || hasRole('user_manager'), badge: pendingWorldApplicationsCount },
      { id: 'fanzone', icon: <UsersIcon size={18} />, label: 'منطقة الجماهير', show: isSuperAdmin || hasRole('user_manager') },
      { id: 'posts', icon: <MessageSquare size={18} />, label: 'المنشورات', show: isSuperAdmin || hasRole('user_manager') },
      { id: 'fan-comments', icon: <MessageCircle size={18} />, label: 'التعليقات والمناقشات', show: isSuperAdmin || hasRole('user_manager') },
      { id: 'polls', icon: <BarChart3 size={18} />, label: 'الاستطلاعات', show: hasRole(['layout_editor', 'user_manager']) },
      { id: 'predictions', icon: <Trophy size={18} />, label: 'توقعات المباريات', show: hasRole(['matches_editor', 'user_manager']) },
      { id: 'ai-studio', icon: <Sparkles size={18} />, label: 'استوديو الصور (AI)', show: hasRole('layout_editor') },
      { id: 'comments', icon: <MessageSquare size={18} />, label: 'تعليقات البث المباشر', show: hasRole(['matches_editor', 'user_manager']) },
    ]},
    { title: 'المتجر والتجارة', items: [
      { id: 'products', icon: <ShoppingBag size={18} />, label: 'إدارة المتجر والمنتجات', show: hasRole('store_editor') },
      { id: 'orders', icon: <ShoppingCart size={18} />, label: 'طلبات الشراء', show: hasRole('store_editor'), badge: pendingOrdersCount },
      { id: 'business', icon: <Building2 size={18} />, label: 'اتحاداوي بيزنس', show: hasRole(['store_editor', 'layout_editor', 'user_manager']), badge: pendingBusinessesCount },
    ]},
    { title: 'النظام والإدارة', items: [
      { id: 'audit-logs', icon: <RotateCcw size={18} className="text-emerald-500" />, label: 'سجل العمليات وسلة المحذوفات', show: isSuperAdmin || hasRole('user_manager') },
      { id: 'users', icon: <UsersIcon size={18} />, label: 'إدارة الأعضاء والصلاحيات', show: isSuperAdmin || hasRole('user_manager') },
      { id: 'settings', icon: <SettingsIcon size={18} />, label: 'إعدادات النظام', show: isSuperAdmin },
      { id: 'backup', icon: <Database size={18} />, label: 'نسخة احتياطية', show: isSuperAdmin },
    ]}
  ];

  return (
    <div className="w-64 lg:w-72 bg-white dark:bg-card-dark border-l border-border-light dark:border-border-dark flex flex-col h-full overflow-y-auto no-scrollbar py-6">
      <div className="px-5 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h2 className="font-black text-base tracking-tight leading-none text-slate-900 dark:text-white">إدارة المنصة</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Control</span>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose} 
            className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-4 mb-3">
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-surface-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-slate-600 dark:text-slate-300 text-xs font-black transition-colors"
        >
          <span className="material-symbols-outlined !text-[16px]">home</span>
          <span>العودة إلى التطبيق</span>
        </Link>
      </div>

      <div className="flex flex-col px-4 pb-8 space-y-6">
        {groupedTabs.map((group, gIdx) => {
          const visibleItems = group.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;
          
          return (
            <div key={gIdx} className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase px-4 mb-2 tracking-widest select-none">
                {group.title}
              </h3>
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if ((item as any).link) {
                      navigate((item as any).link);
                    } else {
                      setActiveTab(item.id as any);
                    }
                    if (onClose) onClose();
                  }}
                  className={`flex items-center w-full gap-3 px-4 py-2.5 rounded-2xl transition-all font-bold text-sm ${
                    activeTab === item.id 
                      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-dark pressable'
                  }`}
                >
                  <span className={activeTab === item.id ? 'text-primary' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="mr-auto px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {activeTab === item.id && (!item.badge || item.badge === 0) && (
                    <div className="mr-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow"></div>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-auto px-4 pt-4 border-t border-slate-100 dark:border-border-dark">
        <div className="bg-slate-50 dark:bg-surface-dark p-4 rounded-3xl border border-slate-100 dark:border-border-dark">
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase">حالة النظام: متصل</p>
          </div>
          <button 
            onClick={async () => {
              try {
                await auth.signOut();
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.clear();
                    sessionStorage.clear();
                  }
                } catch (e) {}
                navigate('/auth', { replace: true });
              } catch (error) {
                console.error('Logout error:', error);
                navigate('/auth', { replace: true });
              }
            }}
            className="w-full py-2.5 rounded-xl bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark text-[10px] font-black text-slate-500 hover:text-red-500 transition-colors"
          >
            تسجيل الخروج من الإدارة
          </button>
        </div>
      </div>
    </div>
  );
}
