import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppStore, AppRole, isStreamHidden } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { toDate, formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { db, auth, uploadImage, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  getDocs,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Newspaper, 
  Play,
  PlayCircle, 
  Trophy, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Radio, 
  Rss, 
  ArrowRight, 
  Users as UsersIcon, 
  Settings as SettingsIcon,
  ShieldAlert,
  Loader2,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Activity,
  UserPlus,
  Check,
  Menu,
  Tags,
  Star,
  History as HistoryIcon,
  ShoppingCart,
  Building2,
  Undo,
  Eye,
  EyeOff,
  RotateCcw,
  Music,
  BookOpen,
  Disc,
  ListMusic,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  CloudSun,
  MapPin,
  Sunrise,
  Sunset,
  Thermometer,
  Phone,
  AtSign,
  Bell,
  ExternalLink,
  Download,
  Database,
  Shield,
  Wrench,
  Copy,
  Pin,
  Save,
  Maximize2,
  MoveVertical,
  Minus,
  Search,
  Calendar,
  Zap,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Film,
  Globe,
  Layers,
  ShieldCheck,
  ShoppingBag,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Youtube,
  Tv,
  Video,
  Code,
  PenTool
} from 'lucide-react';
import { parseLiveStreamUrl, isYouTubeUrl, isFacebookUrl, isEmbedCode } from '../lib/videoUtils';
import VideoEmbedWidget from '../components/widgets/VideoEmbedWidget';
import { motion } from 'motion/react';
import AdminSidebar from '../components/AdminSidebar';
import AdminSidebarManager from '../components/AdminSidebarManager';
import AdminHomeSectionsManager from '../components/admin/AdminHomeSectionsManager';
import AdminSectionFlagsManager from '../components/admin/AdminSectionFlagsManager';
import AdminServicesManager from '../components/admin/AdminServicesManager';
import AdminBusiness from '../components/AdminBusiness';
import AdminWorldFans from '../components/admin/AdminWorldFans';
import AdminAuditLogs from '../components/admin/AdminAuditLogs';
import AdminAnalytics from '../components/admin/AdminAnalytics';
import { CloudinaryMigrationManager } from '../components/admin/CloudinaryMigrationManager';
import ScoreSelector from '../components/ScoreSelector';
import ImageUploader from '../components/ImageUploader';
import LivePlayer from '../components/live/LivePlayer';
import CsvMatchesImporter from '../components/CsvMatchesImporter';
import CsvVideosImporter from '../components/admin/CsvVideosImporter';
import { getOptimizedImage } from '../lib/cloudinary';
import { logAdminActivity } from '../lib/auditLogger';
import { compressImage } from '../lib/imageCompressor';

const handleFileUploadFn = async (
  e: React.ChangeEvent<HTMLInputElement>, 
  fieldName: string, 
  activeTab: string,
  setUploading: (val: boolean) => void,
  setFormData: (fn: any) => void,
  type: 'image' | 'video' | 'audio' = 'image'
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  try {
    let fileToUpload: File | Blob = file;
    if (type === 'image') {
      try {
        const compressed = await compressImage(file, {
          quality: 0.90,
          maxDimension: 1920,
          format: 'auto',
          preserveTransparency: true
        });
        fileToUpload = compressed.file;
      } catch (err) {
        console.warn('Smart compression fallback to direct file:', err);
      }
    }
    const url = await uploadImage(fileToUpload, activeTab, file.name);
    if (type === 'image') {
      toast.success('تم رفع الصورة بنجاح (تم تحسين الحجم والشفافية تلقائياً ⚡)');
    }
    if (type === 'video' && activeTab === 'media') {
      // Try to capture a frame or use a default thumbnail
      setFormData((prev: any) => ({ ...prev, [fieldName]: url, thumbnailUrl: 'https://images.unsplash.com/photo-1510563399035-7140409890a5' }));
    } else {
      setFormData((prev: any) => ({ ...prev, [fieldName]: url }));
    }
  } catch (err) {
    console.error(err);
    toast.error('فشل في رفع الملف');
  } finally {
    setUploading(false);
  }
};

const UploadField = ({ 
  label, 
  fieldName, 
  currentUrl, 
  type = 'image', 
  uploading, 
  handleFileUpload,
  setFormData,
  skipResize = false
}: { 
  label: string, 
  fieldName: string, 
  currentUrl?: string, 
  type?: 'image' | 'video' | 'audio',
  uploading: boolean,
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, type: 'image' | 'video' | 'audio') => void,
  setFormData: (data: any) => void,
  skipResize?: boolean
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase tracking-wider">{label}</label>}
      <div className="flex flex-col gap-2">
        {currentUrl && currentUrl.trim() !== '' ? (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark group flex items-center justify-center bg-slate-900 shadow-xl">
            {type === 'image' ? (
              <img src={getOptimizedImage(currentUrl, 400)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : type === 'video' ? (
              <video src={currentUrl} className="w-full h-full object-cover" controls />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Music size={40} className="text-primary" />
                <span className="text-[10px] font-bold text-white uppercase px-6 truncate w-full text-center bg-black/40 py-1 rounded-full backdrop-blur-md">Audio File</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
              <button 
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, [fieldName]: '' }))}
                className="bg-red-500 text-white p-3 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input 
              type="file" 
              ref={fileInputRef}
              accept={type === 'video' ? "video/*" : type === 'audio' ? "audio/*" : "image/*"} 
              className="hidden" 
              onChange={(e) => handleFileUpload(e, fieldName, type)}
              disabled={uploading}
            />
            
            {type === 'image' ? (
              <div className="bg-slate-50 dark:bg-surface-dark border-2 border-dashed border-slate-200 dark:border-border-dark py-10 rounded-2xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all group">
                <ImageUploader 
                  folderName={`admin_${fieldName}`}
                  onUploadSuccess={(url) => setFormData((prev: any) => ({ ...prev, [fieldName]: url }))}
                  onError={(err) => {
                    console.error("Image Upload Error:", err);
                    toast.error("حدث خطأ أثناء معالجة الصورة: " + err);
                  }}
                  buttonText={uploading ? "جاري الرفع..." : "اختر صورة للرفع"}
                  showPreview={false}
                  skipResize={skipResize}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-surface-dark border-2 border-dashed border-slate-200 dark:border-border-dark py-10 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all group relative overflow-hidden"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-primary" size={28} />
                    <span className="text-[10px] font-black text-slate-500 uppercase">جاري الرفع...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
                      <Plus size={24} />
                    </div>
                    <div className="text-center">
                       <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">اضغط لرفع ملف {type === 'video' ? 'فيديو' : 'صوت'}</span>
                       <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">MP4, MP3, WAV</span>
                    </div>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const UploadOrUrlField = ({ 
  label, 
  fieldName, 
  currentUrl, 
  type = 'image', 
  uploading, 
  handleFileUpload,
  setFormData,
  formData,
  skipResize = false
}: { 
  label: string, 
  fieldName: string, 
  currentUrl?: string, 
  type?: 'image' | 'video' | 'audio',
  uploading: boolean,
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, type: 'image' | 'video' | 'audio') => void,
  setFormData: (fn: any) => void,
  formData: any,
  skipResize?: boolean
}) => {
  const isExternalUrl = currentUrl && currentUrl.startsWith('http') && !currentUrl.includes('cloudinary.com') && !currentUrl.includes('firebasestorage.googleapis.com');
  const [internalMode, setInternalMode] = useState<'upload' | 'url'>(isExternalUrl ? 'url' : 'upload');

  // Keep internal mode in sync ONLY when field is initialized (e.g. opening different edit modals)
  useEffect(() => {
    if (currentUrl) {
      const isExt = currentUrl.startsWith('http') && !currentUrl.includes('cloudinary.com') && !currentUrl.includes('firebasestorage.googleapis.com');
      if (isExt) setInternalMode('url');
    }
  }, [fieldName]); // Re-evaluate only when the field being edited changes

  return (
    <div className="space-y-2 bg-slate-50/50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter block">{label}</label>
        <div className="flex gap-1 bg-white dark:bg-surface-dark p-1 rounded-lg border border-slate-200 dark:border-border-dark flex-wrap justify-end">
          {(fieldName === 'homeLogo' || fieldName === 'awayLogo') && (
            <button
              type="button"
              onClick={() => {
                setInternalMode('url');
                setFormData({ ...formData, [fieldName]: '/icon.png' });
              }}
              className="text-[8px] font-black px-2.5 py-1 rounded-md transition-all text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400"
              title="لوجو الاتحاد السكندري"
            >
              اتحاد
            </button>
          )}
          <button 
            type="button"
            onClick={() => setInternalMode('upload')}
            className={`text-[8px] font-black px-2.5 py-1 rounded-md transition-all ${internalMode === 'upload' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            UPLD
          </button>
          <button 
            type="button"
            onClick={() => setInternalMode('url')}
            className={`text-[8px] font-black px-2.5 py-1 rounded-md transition-all ${internalMode === 'url' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            URL
          </button>
        </div>
      </div>
      
      {internalMode === 'upload' ? (
        <UploadField 
          label="" 
          fieldName={fieldName} 
          currentUrl={currentUrl} 
          type={type} 
          uploading={uploading} 
          handleFileUpload={handleFileUpload} 
          setFormData={setFormData}
          skipResize={skipResize}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={type === 'image' ? "https://example.com/image.jpg" : type === 'video' ? "https://example.com/video.mp4" : "https://example.com/audio.mp3"} 
              className="w-full p-3 rounded-xl border border-border-light bg-white dark:bg-surface-dark dark:border-border-dark text-xs font-mono text-left dir-ltr focus:border-primary outline-none transition-all" 
              value={currentUrl || ''} 
              onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
            />
          </div>
          {currentUrl && currentUrl.trim() !== '' && (
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border-light dark:border-border-dark flex items-center justify-center bg-slate-900 group shadow-inner">
              {type === 'image' ? (
                <img src={getOptimizedImage(currentUrl, 400)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : type === 'video' ? (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <PlayCircle size={32} className="text-white opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Music size={32} className="text-primary" />
                  <span className="text-[10px] font-bold text-white uppercase truncate px-4 w-full text-center">{currentUrl.split('/').pop()}</span>
                </div>
              )}
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, [fieldName]: '' })}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Triggering deployment change
const ADMIN_VERSION = '1.3.0';

const APP_ROLES: { 
  id: AppRole; 
  label: string; 
  shortLabel: string;
  description: string;
  icon: any; 
  color: string;
  badgeBg: string;
}[] = [
  { 
    id: 'admin', 
    label: 'مدير نظام كامل (Super Admin)', 
    shortLabel: 'مدير كامل',
    description: 'الوصول لكافة الأقسام، إعدادات النظام، النسخ الاحتياطي، وإدارة المشرفين بالكامل',
    icon: Shield, 
    color: 'text-red-500',
    badgeBg: 'bg-red-500/10 text-red-500 border-red-500/20'
  },
  { 
    id: 'news_editor', 
    label: 'محرر الأخبار والتغطيات', 
    shortLabel: 'محرر أخبار',
    description: 'نشر وتعديل الأخبار، الأقسام، والوسوم الصحفية',
    icon: Newspaper, 
    color: 'text-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  { 
    id: 'matches_editor', 
    label: 'مدير المباريات والبث', 
    shortLabel: 'مدير مباريات',
    description: 'إدارة جدول المباريات، البث المباشر، قائمة الأندية، وتوقعات المباريات',
    icon: Trophy, 
    color: 'text-orange-500',
    badgeBg: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  },
  { 
    id: 'media_editor', 
    label: 'مدير الوسائط والمكتبة', 
    shortLabel: 'مدير وسائط',
    description: 'إدارة الملتيميديا، الفيديوهات، الأغاني، والكتب والمجلات الرقمية',
    icon: PlayCircle, 
    color: 'text-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
  { 
    id: 'store_editor', 
    label: 'مدير المتجر والتجارة', 
    shortLabel: 'مدير متجر',
    description: 'إدارة منتجات المتجر، طلبات الشراء، ومشاريع اتحاداوي بيزنس',
    icon: ShoppingBag, 
    color: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
  },
  { 
    id: 'layout_editor', 
    label: 'مدير الواجهة والتصميم', 
    shortLabel: 'مدير واجهة',
    description: 'تخصيص وترتيب أقسام الصفحة الرئيسية، القائمة الجانبية، التاريخ، والطقس',
    icon: LayoutDashboard, 
    color: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  },
  { 
    id: 'user_manager', 
    label: 'مدير الأعضاء والتفاعل', 
    shortLabel: 'مدير أعضاء',
    description: 'إدارة حسابات الأعضاء، المنشورات، تعليقات الجماهير، الاستطلاعات، والإشعارات',
    icon: UsersIcon, 
    color: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
  },
  { 
    id: 'members_editor', 
    label: 'مدير بوابة الأعضاء والخدمات', 
    shortLabel: 'مدير خدمات النادي',
    description: 'إدارة لجان النادي، الخدمات الحكومية، الرحلات، الإعلانات، وتخفيضات العضوية',
    icon: ShieldCheck, 
    color: 'text-teal-500',
    badgeBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20'
  },
];

export default function Admin() {
  const { 
    news, media, matches, liveStream, liveStreams, users, appSettings, profile, clubs, polls, fanPosts, predictions,
    clubTitles, clubStats, historyEvents, stadiums, newsCategories,
    products, orders, ads, homeSections, undoStack,
    songs, albums, playlists, mediaPlaylists, books, cityInfo,
    clubCommittees, clubAnnouncements, clubServices, clubTrips, clubMembersSettings, memberDiscounts,
    businesses, businessUpdates, worldGroups, worldEvents, worldPosts, worldHelpRequests,
    setClubTitles, setClubStats, setHistoryEvents, setStadiums, setNewsCategories,
    setProducts, setOrders, setAds, setHomeSections, pushToUndoStack, popFromUndoStack,
    setSongs, setAlbums, setPlaylists, setMediaPlaylists, setBooks, setCityInfo,
    setSettings,
    setClubCommittees, setClubAnnouncements, setClubServices, setClubTrips, setClubMembersSettings, setMemberDiscounts
  } = useAppStore();

  const committeesList = useMemo(() => {
    return (clubCommittees && clubCommittees.length > 0) ? clubCommittees.filter(c => c.status !== 'inactive').sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  }, [clubCommittees]);

  const announcementsList = useMemo(() => {
    return (clubAnnouncements && clubAnnouncements.length > 0) ? clubAnnouncements.filter(a => a.active !== false) : [];
  }, [clubAnnouncements]);

  const servicesList = useMemo(() => {
    return (clubServices && clubServices.length > 0) ? clubServices.filter(s => s.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  }, [clubServices]);

  const tripsList = useMemo(() => {
    return (clubTrips && clubTrips.length > 0) ? clubTrips.filter(t => t.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  }, [clubTrips]);

  const cleanPayload = (obj: any) => JSON.parse(JSON.stringify(obj));

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'overview';
  
  const setActiveTab = (tab: any) => {
    setSearchParams({ tab });
    try {
      if (typeof window !== 'undefined') localStorage.setItem('lastAdminTab', tab);
    } catch (e) {}
  };
  const [rssSources, setRssSources] = useState<any[]>([]);
  const [rssNews, setRssNews] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [customPages, setCustomPages] = useState<any[]>([]);
  const [jerseys, setJerseys] = useState<any[]>([]);
  const [aiConfig, setAiConfig] = useState<any>({ enabled: true, clubLogo: '' });
  const [showSidebar, setShowSidebar] = useState(false);
  const [historySubTab, setHistorySubTab] = useState<'stats' | 'titles' | 'timeline' | 'stadiums'>('stats');
  const [mediaSubTab, setMediaSubTab] = useState<'items' | 'playlists' | 'banner'>('items');
  const [musicSubTab, setMusicSubTab] = useState<'songs' | 'albums' | 'playlists'>('songs');
  const [liveSportSubTab, setLiveSportSubTab] = useState<'football' | 'basketball' | 'programs' | 'custom'>('football');
  const [clubSubTab, setClubSubTab] = useState<'committees' | 'announcements' | 'services' | 'trips' | 'discounts' | 'settings'>('committees');
  const [isExporting, setIsExporting] = useState(false);
  const [aiUsage, setAiUsage] = useState<any[]>([]);
  const [newsFilterType, setNewsFilterType] = useState<'all' | 'news' | 'article'>('all');

  const isOmar = profile.email?.toLowerCase() === 'omarmagedugm@ittihad.club';
  const isDev = profile.email?.toLowerCase() === 'copyrightofficialco@gmail.com';
  const isSuperAdmin = isDev || isOmar || profile.role === 'admin' || profile.role === 'superadmin' || (profile.roles && profile.roles.includes('admin'));
  const hasGranularRole = (profile.roles && profile.roles.length > 0) || profile.role === 'moderator' || profile.role === 'writer';
  const hasAdminAccess = isSuperAdmin || hasGranularRole;

  useEffect(() => {
    if (!profile.uid || !hasAdminAccess) return;

    let unsubPages = () => {};
    let unsubJerseys = () => {};
    let unsubAiConfig = () => {};
    let unsubUsage = () => {};

    try {
      const qPages = query(collection(db, 'custom_pages'), orderBy('createdAt', 'desc'));
      unsubPages = onSnapshot(qPages, (snapshot) => {
        const pagesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomPages(pagesList);
        useAppStore.getState().setCustomPages(pagesList);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'custom_pages');
        }
      });

      unsubJerseys = onSnapshot(collection(db, 'jerseys'), (snapshot) => {
        setJerseys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'jerseys');
        }
      });

      unsubAiConfig = onSnapshot(doc(db, 'settings', 'ai_config'), (snap) => {
        if (snap.exists()) setAiConfig(snap.data());
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'settings/ai_config');
        }
      });
      
      const usageToday = new Date().toISOString().split('T')[0];
      const qUsage = query(collection(db, 'ai_usage'), where('date', '==', usageToday));
      unsubUsage = onSnapshot(qUsage, (snapshot) => {
        setAiUsage(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'ai_usage');
        }
      });
    } catch (err) {
      console.error('Listener setup error:', err);
    }
    
    return () => { 
      unsubPages(); 
      unsubJerseys(); 
      unsubAiConfig(); 
      unsubUsage(); 
    };
  }, [profile.uid, profile.role, profile.roles]);

  const handleExportDatabase = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تحميل نسخة كاملة من قاعدة البيانات؟ قد تستغرق هذه العملية بعض الوقت.')) return;
    
    setIsExporting(true);
    try {
      const collectionsToExport = [
        'users', 'news', 'matches', 'clubs', 'polls', 'predictions', 'fan_posts', 
        'media', 'live_comments', 'fan_comments', 'city_info', 'settings', 'fcm_tokens', 
        'match_day_moments', 'match_day_attendance', 'ads', 'club_titles', 
        'club_stats', 'club_timeline', 'club_stadiums', 'songs', 'albums', 
        'playlists', 'books', 'news_categories', 'products', 'orders', 'home_sections',
        'notifications', 'bookmarks'
      ];

      const backupData: any = {};

      for (const collName of collectionsToExport) {
        try {
          const snapshot = await getDocs(collection(db, collName));
          backupData[collName] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (err) {
          console.warn(`Could not export collection ${collName}:`, err);
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('تم تحميل النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('فشل في إنشاء النسخة الاحتياطية');
    } finally {
      setIsExporting(false);
    }
  };

  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تحذير: هل أنت متأكد من استعادة النسخة الاحتياطية ومزامنتها في قاعدة البيانات؟')) {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading('جاري قراءة واستعادة ملف النسخة الاحتياطية...');
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      let restoredCollections = 0;
      let restoredDocs = 0;

      for (const [collName, items] of Object.entries<any>(backupData)) {
        if (!Array.isArray(items) || items.length === 0) continue;

        let batch = writeBatch(db);
        let batchCount = 0;

        for (const item of items) {
          const { id, ...data } = item;
          const docId = id || item.uid;
          if (!docId) continue;

          const ref = doc(db, collName, String(docId));
          batch.set(ref, cleanPayload({ id: docId, ...data }), { merge: true });
          batchCount++;
          restoredDocs++;

          if (batchCount === 400) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }
        restoredCollections++;
      }

      toast.success(`تمت استعادة النسخة بنجاح! (${restoredCollections} جداول، ${restoredDocs} سجل)`, { id: toastId });
      
      // Refresh local state if users are restored
      if (backupData.users && Array.isArray(backupData.users)) {
        useAppStore.getState().setUsers(backupData.users);
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      toast.error('حدث خطأ أثناء استعادة النسخة الاحتياطية: ' + (err.message || 'خطأ غير معروف'), { id: toastId });
    } finally {
      setIsRestoring(false);
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    }
  };

  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'delivered'>('all');
  const [comments, setComments] = useState<any[]>([]);
  const [fanComments, setFanComments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('adminDraft_showModal') : null;
      return saved ? JSON.parse(saved) : false;
    } catch (e) { return false; }
  });
  const [formData, setFormData] = useState<any>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('adminDraft_formData') : null;
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });
  const [isEditing, setIsEditing] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('adminDraft_isEditing') : null;
      return saved ? JSON.parse(saved) : false;
    } catch (e) { return false; }
  });
  const [editingId, setEditingId] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('adminDraft_editingId') || null : null;
    } catch (e) { return null; }
  });
  const [activeSearchField, setActiveSearchField] = useState<'home' | 'away' | null>(null);
  const [clubSearchQuery, setClubSearchQuery] = useState('');
  const [isCsvImporterOpen, setIsCsvImporterOpen] = useState(false);
  const [isCsvVideosImporterOpen, setIsCsvVideosImporterOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setActiveSearchField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminDraft_showModal', JSON.stringify(showModal));
        localStorage.setItem('adminDraft_formData', JSON.stringify(formData));
        localStorage.setItem('adminDraft_isEditing', JSON.stringify(isEditing));
        if (editingId) localStorage.setItem('adminDraft_editingId', editingId);
        else localStorage.removeItem('adminDraft_editingId');
      }
    } catch (e) {}
  }, [showModal, formData, isEditing, editingId]);
  const [baseData, setBaseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleEditItem = (item: any) => {
    let extraData: any = {};
    if (activeTab === 'media') {
      if (mediaSubTab === 'playlists') {
        const selectedMediaIds = media.filter(m => m.playlistId === item.id).map(m => m.id);
        extraData = { selectedMediaIds };
      } else {
        const vUrl = item.url || item.videoUrl || '';
        const src = item.source || (vUrl.includes('youtube.com') || vUrl.includes('youtu.be') ? 'youtube' : 'upload');
        extraData = {
          type: item.type || 'video',
          source: src,
          url: vUrl,
          videoUrl: vUrl
        };
      }
    } else if (activeTab === 'music') {
      if (musicSubTab === 'albums') {
        const albumSongIds = Array.from(new Set([
          ...(item.songIds || []),
          ...songs.filter(s => s.albumId === item.id).map(s => s.id)
        ]));
        extraData = { songIds: albumSongIds };
      } else if (musicSubTab === 'songs') {
        let albumId = item.albumId || '';
        if (!albumId) {
          const foundAlbum = albums.find(a => a.songIds?.includes(item.id));
          if (foundAlbum) albumId = foundAlbum.id;
        }
        extraData = { albumId };
      }
    }
    setFormData({ ...item, ...extraData });
    setBaseData({ ...item, ...extraData });
    setIsEditing(true);
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, type: 'image' | 'video' | 'audio' = 'image') => {
    handleFileUploadFn(e, fieldName, activeTab, setUploading, setFormData, type);
  };

  useEffect(() => {
    if (location.state?.editId && location.state?.editCategory) {
      const { editId, editCategory } = location.state;
      const list = editCategory === 'news' ? news : editCategory === 'media' ? media : matches;
      const item = list.find((i: any) => i.id === editId);
      if (item) {
        handleEditItem(item);
        setActiveTab(editCategory as any);
      }
    }
  }, [location.state, news, media, matches]);

  const hasPermission = (roles: AppRole | AppRole[]) => {
    if (isSuperAdmin) return true;
    const userRoles = [...(profile.roles || [])];
    
    // Legacy support for writer/moderator roles
    if (profile.role === 'writer' && !userRoles.includes('news_editor')) userRoles.push('news_editor');
    if (profile.role === 'moderator' && userRoles.length === 0) {
      userRoles.push('user_manager');
    }
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.some(r => userRoles.includes(r));
  };

  const isTabAllowed = (tab: string) => {
    if (isSuperAdmin) return true;
    if (tab === 'overview') return true;
    
    const roleMap: Record<string, AppRole[]> = {
      'news': ['news_editor'],
      'news-categories': ['news_editor'],
      'news-tags': ['news_editor'],
      'fanzone': ['user_manager'],
      'media': ['media_editor'],
      'music': ['media_editor'],
      'books': ['media_editor'],
      'matches': ['matches_editor'],
      'live': ['matches_editor'],
      'comments': ['matches_editor', 'user_manager'],
      'clubs': ['matches_editor', 'layout_editor'],
      'club_members': ['members_editor', 'layout_editor', 'user_manager'],
      'products': ['store_editor'],
      'orders': ['store_editor'],
      'business': ['store_editor', 'layout_editor', 'user_manager'],
      'world-fans': ['user_manager'],
      'layout': ['layout_editor'],
      'sidebar-menu': ['layout_editor'],
      'city': ['layout_editor'],
      'history': ['layout_editor'],
      'ai-studio': ['layout_editor'],
      'polls': ['layout_editor', 'user_manager'],
      'users': ['user_manager'],
      'audit-logs': ['user_manager', 'admin'],
      'posts': ['user_manager'],
      'fan-comments': ['user_manager'],
      'predictions': ['user_manager', 'matches_editor'],
      'settings': ['admin'],
      'backup': ['admin'],
    };

    const required = roleMap[tab];
    if (!required) return false;
    return hasPermission(required);
  };

  // If Omar or Dev, they are always admin in UI regardless of DB role
  const effectiveRole = isDev ? 'admin' : profile.role;
  const isAdminOrWriter = isDev || profile.role === 'admin' || profile.role === 'moderator' || (profile.roles && profile.roles.length > 0);

  if (!isAdminOrWriter) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black mb-2">عذراً، لا تمتلك صلاحيات</h1>
        <p className="text-slate-500 mb-6">هذه الصفحة مخصصة لمديري النظام أو المحررين فقط.</p>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2">
          <ArrowRight size={20} />
          العودة للرئيسية
        </button>
      </div>
    );
  }

  // Redirection logic based on role permissions
  useEffect(() => {
    if (!isTabAllowed(activeTab)) {
      const allowedTabs = ['overview', 'news', 'news-categories', 'news-tags', 'fanzone', 'world-fans', 'media', 'music', 'books', 'matches', 'live', 'clubs', 'club_members', 'products', 'orders', 'business', 'layout', 'sidebar-menu', 'city', 'history', 'ai-studio', 'polls', 'predictions', 'posts', 'fan-comments', 'comments', 'audit-logs', 'users', 'settings', 'backup'];
      const firstAllowed = allowedTabs.find(tab => isTabAllowed(tab));
      if (firstAllowed) {
        setActiveTab(firstAllowed as any);
      }
    }
  }, [profile.roles, profile.role, isDev]);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'moderator' | 'writer' | 'user'>('all');
  const [userTierFilter, setUserTierFilter] = useState<string>('all');
  const [contentSearch, setContentSearch] = useState('');
  const [newsTags, setNewsTags] = useState<string[]>([]);
  const [featuredMatchId, setFeaturedMatchId] = useState<string | null>(null);

  // Sync featured match and news categories/tags
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'featured_match'), (snap) => {
      if (snap.exists()) setFeaturedMatchId(snap.data().matchId);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/featured_match'));
    return () => unsub();
  }, []);

  const [syncingUsers, setSyncingUsers] = useState(false);

  const handleSyncUsers = async (showToast = true) => {
    setSyncingUsers(true);
    if (showToast) toast.loading('جاري تحديث قائمة الأعضاء...', { id: 'sync-users' });
    try {
      const snap = await getDocs(collection(db, 'users'));
      const freshUsers = snap.docs.map(d => ({ id: d.id, uid: d.id, ...(d.data() as any) }));
      useAppStore.getState().setUsers(freshUsers);
      if (showToast) toast.success(`تم تحديث قائمة الأعضاء بنجاح (${freshUsers.length} عضو)`, { id: 'sync-users' });
    } catch (err: any) {
      console.warn('Error syncing users:', err);
      if (showToast) toast.error('حدث خطأ أثناء تحديث قائمة الأعضاء', { id: 'sync-users' });
    } finally {
      setSyncingUsers(false);
    }
  };

  // Sync users whenever admin opens the users management tab
  useEffect(() => {
    if (activeTab === 'users') {
      handleSyncUsers(false);
    }
  }, [activeTab]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    }
  };

  const EGYPTIAN_CLUBS = ["الأهلي", "الزمالك", "بيراميدز", "المصري البورسعيدي", "سيراميكا كليوباترا", "إنبي", "فاركو", "مودرن سبورت", "سموحة", "الإسماعيلي", "البنك الأهلي", "طلائع الجيش", "الاتحاد السكندري", "المقاولون العرب", "زد إف سي", "الجونة", "وادي دجلة", "حرس الحدود", "بتروجت", "كهرباء الإسماعيلية"];

  const handleSeedClubs = async () => {
    setLoading(true);
    try {
      let added = 0;
      for (const clubName of EGYPTIAN_CLUBS) {
        if (!clubs.find(c => c.name === clubName)) {
            await addDoc(collection(db, 'clubs'), { name: clubName, logo: '' });
            added++;
        }
      }
      toast.success(added > 0 ? `تم إضافة ${added} نادي بنجاح` : 'جميع الأندية موجوة مسبقاً');
    } catch(err: any) {
      toast.error(err.message || 'حدث خطأ');
    }
    setLoading(false);
  };

  const handleToggleChannelVisibility = async (sportKey: 'football' | 'basketball' | 'programs' | 'custom', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const docName = sportKey === 'custom'
        ? 'liveStream_custom'
        : sportKey === 'programs'
          ? 'liveStream_programs'
          : sportKey === 'basketball'
            ? 'liveStream_basketball'
            : 'liveStream';
      const targetStream = liveStreams[sportKey] || {
        isActive: false,
        url: '',
        rawUrl: '',
        embedUrl: '',
        title: '',
        viewers: 0,
        sport: sportKey
      };
      const newHiddenState = !isStreamHidden(targetStream);

      const sportLabel = sportKey === 'custom'
        ? (targetStream.customName || 'البث المخصص')
        : sportKey === 'programs'
          ? 'برامج واستوديو'
          : sportKey === 'basketball'
            ? 'كرة السلة'
            : 'كرة القدم';

      const payload = {
        ...targetStream,
        hidden: newHiddenState,
        updatedAt: new Date().toISOString()
      };

      const cleanPayload = (obj: any) => JSON.parse(JSON.stringify(obj));
      await setDoc(doc(db, 'settings', docName), cleanPayload(payload), { merge: true });
      if (sportKey === 'football') {
        await setDoc(doc(db, 'settings', 'liveStream_football'), cleanPayload(payload), { merge: true });
      }

      const { updateLiveStreams } = useAppStore.getState();
      updateLiveStreams({
        [sportKey]: payload
      });

      if (liveSportSubTab === sportKey) {
        setFormData(prev => ({ ...prev, hidden: newHiddenState }));
      }

      if (newHiddenState) {
        toast.success(`تم إخفاء خانة (${sportLabel}) عن المشاهدين 👁️‍🗨️`);
      } else {
        toast.success(`تم إظهار خانة (${sportLabel}) للجمهور بنجاح 👁️`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/liveStream_${sportKey}`);
      toast.error('حدث خطأ أثناء تحديث حالة الظهور');
    }
  };

  const handleAdd = async () => {
    setLoading(true);
    const cleanPayload = (obj: any) => JSON.parse(JSON.stringify(obj));
    try {
      if (activeTab === 'news') {
        const payload = {
          title: formData.title || 'عنوان افتراضي',
          content: formData.content || '',
          image: formData.image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
          category: formData.category || 'أخبار النادي',
          date: isEditing ? (formData.date || new Date().toISOString()) : new Date().toISOString(),
          author: formData.author || 'الموقع الرسمي',
          editorName: formData.editorName || '',
          newsType: formData.newsType || 'news',
          type: formData.rssUrl ? 'rss' : 'manual',
          rssUrl: formData.rssUrl || '',
          videoUrl: (formData.videoUrl || '').trim(),
          videoType: formData.videoType || 'auto',
          tagIds: formData.tagIds || []
        };
        
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'news', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `news/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'news'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'news');
          }
        }
      } else if (activeTab === 'media') {
        if (mediaSubTab === 'playlists') {
          const payload = {
            title: formData.title || 'قائمة جديدة',
            description: formData.description || '',
            coverUrl: formData.coverUrl || 'https://images.unsplash.com/photo-1510563399035-7140409890a5',
            type: formData.type || 'video',
            createdAt: isEditing ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
          };

          let playlistId = editingId;

          if (isEditing && editingId) {
            await updateDoc(doc(db, 'media_playlists', editingId), cleanPayload(payload));
          } else {
            const docRef = await addDoc(collection(db, 'media_playlists'), cleanPayload(payload));
            playlistId = docRef.id;
          }

          // Sync media items
          const currentIds = formData.selectedMediaIds || [];
          const initialIds = baseData?.selectedMediaIds || [];
          
          const added = currentIds.filter((id: string) => !initialIds.includes(id));
          const removed = initialIds.filter((id: string) => !currentIds.includes(id));

          if (playlistId) {
            for (const id of added) {
              await updateDoc(doc(db, 'media', id), { playlistId });
            }
            for (const id of removed) {
              await updateDoc(doc(db, 'media', id), { playlistId: '' });
            }
          }
        } else {
          const payload = {
            title: formData.title || 'فيديو جديد',
            type: formData.type || 'video',
            source: formData.source || (formData.url?.includes('youtube.com') || formData.url?.includes('youtu.be') ? 'youtube' : formData.url?.includes('facebook.com') ? 'facebook' : 'upload'),
            url: formData.url || '',
            videoUrl: formData.type === 'video' ? (formData.url || '') : '',
            thumbnailUrl: formData.thumbnailUrl || (formData.type === 'video' ? 'https://images.unsplash.com/photo-1510563399035-7140409890a5' : (formData.url || 'https://images.unsplash.com/photo-1510563399035-7140409890a5')),
            date: isEditing ? (formData.date || new Date().toISOString()) : new Date().toISOString(),
            duration: formData.duration || '',
            views: formData.views || '0',
            likes: isEditing ? (formData.likes || []) : [],
            playlistId: formData.playlistId || '',
            isFeatured: formData.isFeatured ?? false
          };

          if (isEditing && editingId) {
            await updateDoc(doc(db, 'media', editingId), cleanPayload(payload));
          } else {
            await addDoc(collection(db, 'media'), cleanPayload(payload));
          }
        }
      } else if (activeTab === 'users') {
        const payload = {
          name: formData.name || '',
          role: formData.role || 'user',
          roles: formData.roles || [],
          tier: formData.tier || 'new'
        };

        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'users', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${editingId}`);
          }
        }
      } else if (activeTab === 'matches') {
        const payload = {
          homeTeam: formData.homeTeam || 'الاتحاد',
          awayTeam: formData.awayTeam || 'الفريق الخصم',
          homeLogo: formData.homeLogo || '/icon.png',
          awayLogo: formData.awayLogo || '/icon.png',
          homeScore: formData.homeScore !== undefined && formData.homeScore !== null ? String(formData.homeScore) : (formData.status === 'upcoming' ? '-' : '0'),
          awayScore: formData.awayScore !== undefined && formData.awayScore !== null ? String(formData.awayScore) : (formData.status === 'upcoming' ? '-' : '0'),
          date: formData.date || new Date().toISOString(),
          competition: formData.competition || 'الدوري المصري',
          status: formData.status || 'upcoming',
          stadium: formData.stadium || '',
          stadiumImage: formData.stadiumImage || '',
          stadiumOpacity: formData.stadiumOpacity ?? 0.2,
          // If we are editing a live match, we refresh the timerStartTime to "now" 
          // and use the provided base minute as the new starting point to ensure continuity
          timerStartTime: (formData.status === 'live' && formData.isTimerRunning) ? new Date().toISOString() : (formData.timerStartTime || null),
          timerBaseMinute: Number(formData.timerBaseMinute || 0),
          isTimerRunning: formData.isTimerRunning || false,
          isMatchDay: formData.isMatchDay || false,
          featured: formData.featured || false,
          sport: formData.sport || 'football'
        };

        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'matches', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `matches/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'matches'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'matches');
          }
        }

        // Add new clubs if they don't exist in the database
        const checkAndAddClub = async (name: string, logo: string) => {
          if (name && name !== 'الاتحاد' && name !== 'الفريق الخصم' && !clubs.find(c => c.name === name)) {
            try {
              await addDoc(collection(db, 'clubs'), { name, logo });
            } catch (err) {
              console.error("Error adding club automatically:", err);
            }
          }
        };
        await checkAndAddClub(payload.homeTeam, payload.homeLogo);
        await checkAndAddClub(payload.awayTeam, payload.awayLogo);
      } else if (activeTab === 'city') {
        const payload = {
          cityName: formData.cityName || 'الإسكندرية',
          temperature: formData.temperature || '--',
          condition: formData.condition || 'صافي',
          sunset: formData.sunset || '--:--',
          sunrise: formData.sunrise || '--:--',
          description: formData.description || '',
          image: formData.image || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
          active: formData.active ?? true,
          useAutoWeather: formData.useAutoWeather ?? true,
          weatherBg: formData.weatherBg || ''
        };
        
        try {
          await setDoc(doc(db, 'city_info', 'alexandria'), payload);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'city_info/alexandria');
        }
      } else if (activeTab === 'settings') {
        const facebookUrl = formData.socialFacebook !== undefined ? formData.socialFacebook : (formData.facebookPageUrl !== undefined ? formData.facebookPageUrl : (appSettings.socialLinks?.facebook || appSettings.facebookPageUrl || 'https://www.facebook.com/Itthadalexchannel'));
        const payload = {
          appName: formData.appName || appSettings.appName || '',
          appLogo: formData.appLogo || appSettings.appLogo || '',
          headerLogoLight: formData.headerLogoLight !== undefined ? formData.headerLogoLight : (appSettings.headerLogoLight || ''),
          headerLogoDark: formData.headerLogoDark !== undefined ? formData.headerLogoDark : (appSettings.headerLogoDark || ''),
          headerLogoSize: formData.headerLogoSize !== undefined ? formData.headerLogoSize : (appSettings.headerLogoSize || 'medium'),
          headerLogoHeight: formData.headerLogoHeight !== undefined ? Number(formData.headerLogoHeight) : (appSettings.headerLogoHeight || 48),
          logoType: formData.logoType || appSettings.logoType || 'image',
          logoText: formData.logoText || appSettings.logoText || '',
          defaultSport: formData.defaultSport || appSettings.defaultSport || 'auto',
          liveViewMode: formData.liveViewMode || appSettings.liveViewMode || 'both',
          libraryBanner: formData.libraryBanner !== undefined ? formData.libraryBanner : (appSettings.libraryBanner || ''),
          maintenanceEnabled: formData.maintenanceEnabled !== undefined ? formData.maintenanceEnabled : (appSettings.maintenanceEnabled || false),
          maintenanceTitle: formData.maintenanceTitle !== undefined ? formData.maintenanceTitle : (appSettings.maintenanceTitle || 'سنعود بعد قليل انتظرونا'),
          maintenanceMessage: formData.maintenanceMessage !== undefined ? formData.maintenanceMessage : (appSettings.maintenanceMessage || 'نقوم حالياً بإجراء بعض التحديثات وأعمال الصيانة لتحسين تجربة استخدام قناة الاتحاد السكندري. سنعود بعد قليل، انتظرونا!'),
          maintenanceEstimatedTime: formData.maintenanceEstimatedTime !== undefined ? formData.maintenanceEstimatedTime : (appSettings.maintenanceEstimatedTime || ''),
          facebookPageUrl: facebookUrl,
          socialLinks: {
            facebook: facebookUrl,
            youtube: formData.socialYoutube !== undefined ? formData.socialYoutube : (appSettings.socialLinks?.youtube || 'https://youtube.com/@itthadalexchannel'),
            instagram: formData.socialInstagram !== undefined ? formData.socialInstagram : (appSettings.socialLinks?.instagram || 'https://instagram.com/itthadalexchannel'),
            tiktok: formData.socialTiktok !== undefined ? formData.socialTiktok : (appSettings.socialLinks?.tiktok || 'https://tiktok.com/@itthadalexchannel'),
            twitter: formData.socialTwitter !== undefined ? formData.socialTwitter : (appSettings.socialLinks?.twitter || 'https://x.com/itthadalexchannel'),
            whatsapp: formData.socialWhatsapp !== undefined ? formData.socialWhatsapp : (appSettings.socialLinks?.whatsapp || 'https://wa.me/itthadalexchannel')
          }
        };
        try {
          await setDoc(doc(db, 'settings', 'global'), payload);
          const { setSettings } = useAppStore.getState();
          setSettings(payload);
          toast.success('تم حفظ كافة الإعدادات وروابط منصات التواصل بنجاح');
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'settings/global');
        }
      } else if (activeTab === 'live') {
        try {
          const docName = liveSportSubTab === 'custom'
            ? 'liveStream_custom'
            : liveSportSubTab === 'programs' 
              ? 'liveStream_programs' 
              : liveSportSubTab === 'basketball' 
                ? 'liveStream_basketball' 
                : 'liveStream';
          const currentStream = liveSportSubTab === 'custom'
            ? liveStreams.custom
            : liveSportSubTab === 'programs' 
              ? liveStreams.programs 
              : liveSportSubTab === 'basketball' 
                ? liveStreams.basketball 
                : liveStreams.football;
          const rawUrl = (formData.url !== undefined ? formData.url : (currentStream?.url || currentStream?.rawUrl || '')).trim();
          const parsed = parseLiveStreamUrl(rawUrl);
          
          const customName = liveSportSubTab === 'custom'
            ? (formData.customName !== undefined ? formData.customName.trim() : (currentStream?.customName || 'بث خاص'))
            : undefined;

          const isHiddenValue = formData.hidden !== undefined ? !!formData.hidden : isStreamHidden(currentStream);

          const payload = {
            isActive: formData.isActive !== undefined ? formData.isActive : (currentStream?.isActive ?? false),
            hidden: isHiddenValue,
            url: rawUrl, // Preserve exact iframe or URL string as entered by admin!
            rawUrl: rawUrl,
            embedUrl: parsed.embedUrl || rawUrl,
            useProxy: formData.useProxy !== undefined ? !!formData.useProxy : (currentStream?.useProxy ?? false),
            isWebView: formData.isWebView !== undefined ? !!formData.isWebView : (currentStream?.isWebView ?? false),
            title: formData.title !== undefined ? formData.title : (currentStream?.title || ''),
            viewers: Number(formData.viewers || currentStream?.viewers || 0),
            sport: liveSportSubTab,
            streamType: parsed.type,
            bannerUrl: formData.bannerUrl !== undefined ? formData.bannerUrl : (currentStream?.bannerUrl || ''),
            bannerLink: formData.bannerLink !== undefined ? formData.bannerLink : (currentStream?.bannerLink || ''),
            ...(customName ? { customName } : {}),
            updatedAt: new Date().toISOString()
          };

          await setDoc(doc(db, 'settings', docName), cleanPayload(payload), { merge: true });
          if (liveSportSubTab === 'football') {
            await setDoc(doc(db, 'settings', 'liveStream_football'), cleanPayload(payload), { merge: true });
          }

          // Immediately update local store
          const { updateLiveStreams } = useAppStore.getState();
          updateLiveStreams({
            [liveSportSubTab]: payload
          });

          const sportLabel = liveSportSubTab === 'custom'
            ? (customName || 'البث المخصص')
            : liveSportSubTab === 'programs' 
              ? 'البرامج' 
              : liveSportSubTab === 'basketball' 
                ? 'كرة السلة' 
                : 'كرة القدم';
          toast.success(`تم تحديث وحفظ بث ${sportLabel} بنجاح ✅`);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `settings/liveStream_${liveSportSubTab}`);
        }
      } else if (activeTab === 'clubs') {
        const payload = {
          name: formData.name || '',
          logo: formData.logo || ''
        };
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'clubs', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `clubs/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'clubs'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'clubs');
          }
        }
      } else if (activeTab === 'polls') {
        const options = (Array.isArray(formData.options) 
          ? formData.options 
          : (formData.options ? formData.options.split(',').map((o: string) => o.trim()) : []))
          .filter(o => o.trim() !== '');
        const payload = {
          question: formData.question || '',
          options,
          votes: isEditing ? (formData.votes || {}) : Object.fromEntries(options.map((_, i) => [i, 0])),
          voters: isEditing ? (formData.voters || []) : [],
          voterChoices: isEditing ? (formData.voterChoices || {}) : {},
          active: formData.active ?? true,
          createdAt: isEditing ? formData.createdAt : new Date().toISOString()
        };
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'polls', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `polls/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'polls'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'polls');
          }
        }
      } else if (activeTab === 'predictions') {
        const payload = {
          matchId: formData.matchId || '',
          homeScore: Number(formData.homeScore || 0),
          awayScore: Number(formData.awayScore || 0),
          userId: isEditing ? formData.userId : (auth.currentUser?.uid || 'guest'),
          userName: formData.userName || 'مشجع إتحادي',
          userEmail: formData.userEmail || '',
          createdAt: isEditing ? formData.createdAt : new Date().toISOString()
        };
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'predictions', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `predictions/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'predictions'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'predictions');
          }
        }
      } else if (activeTab === 'news-categories') {
        const categories = formData.categories || newsCategories;
        try {
          await setDoc(doc(db, 'settings', 'newsCategories'), { list: categories });
          setNewsCategories(categories);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'settings/newsCategories');
        }
      } else if (activeTab === 'news-tags') {
        const tags = formData.tags || useAppStore.getState().newsTags;
        try {
          await setDoc(doc(db, 'settings', 'newsTags'), { tags });
          useAppStore.getState().setNewsTags(tags);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'settings/newsTags');
        }
      } else if (activeTab === 'products') {
        const payload = {
          name: formData.name || '',
          price: Number(formData.price || 0),
          description: formData.description || '',
          category: formData.category || 'tshirt',
          imageUrl: formData.imageUrl || '',
          stock: Number(formData.stock || 0)
        };
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'products', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `products/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'products'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'products');
          }
        }
      } else if (activeTab === 'history') {
        if (historySubTab === 'stats') {
          const payload = {
            label: formData.label || '',
            value: Number(formData.value || 0),
            icon: formData.icon || 'star',
            order: formData.order !== undefined && formData.order !== '' ? Number(formData.order) : (isEditing ? (clubStats.find(s => s.id === editingId)?.order ?? 0) : clubStats.length),
            hidden: formData.hidden ?? false
          };
          if (isEditing && editingId) {
            const oldData = clubStats.find(s => s.id === editingId);
            if (oldData) pushToUndoStack({ collection: 'club_stats', action: 'update', data: { ...oldData } });
            try {
              await updateDoc(doc(db, 'club_stats', editingId), cleanPayload(payload));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `club_stats/${editingId}`);
            }
          } else {
            try {
              const res = await addDoc(collection(db, 'club_stats'), cleanPayload(payload));
              pushToUndoStack({ collection: 'club_stats', action: 'add', data: { id: res.id } });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'club_stats');
            }
          }
        } else if (historySubTab === 'titles') {
          const payload = {
            name: formData.name || '',
            count: Number(formData.count || 0),
            icon: formData.icon || 'trophy',
            category: formData.category || 'football',
            order: formData.order !== undefined && formData.order !== '' ? Number(formData.order) : (isEditing ? (clubTitles.find(t => t.id === editingId)?.order ?? 0) : clubTitles.length),
            hidden: formData.hidden ?? false
          };
          if (isEditing && editingId) {
            const oldData = clubTitles.find(t => t.id === editingId);
            if (oldData) pushToUndoStack({ collection: 'club_titles', action: 'update', data: { ...oldData } });
            try {
              await updateDoc(doc(db, 'club_titles', editingId), cleanPayload(payload));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `club_titles/${editingId}`);
            }
          } else {
            try {
              const res = await addDoc(collection(db, 'club_titles'), cleanPayload(payload));
              pushToUndoStack({ collection: 'club_titles', action: 'add', data: { id: res.id } });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'club_titles');
            }
          }
        } else if (historySubTab === 'timeline') {
          const payload = {
            year: formData.year || '',
            title: formData.title || '',
            desc: formData.desc || '',
            order: formData.order !== undefined && formData.order !== '' ? Number(formData.order) : (isEditing ? (historyEvents.find(e => e.id === editingId)?.order ?? 0) : historyEvents.length),
            hidden: formData.hidden ?? false
          };
          if (isEditing && editingId) {
            const oldData = historyEvents.find(e => e.id === editingId);
            if (oldData) pushToUndoStack({ collection: 'club_timeline', action: 'update', data: { ...oldData } });
            try {
              await updateDoc(doc(db, 'club_timeline', editingId), cleanPayload(payload));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `club_timeline/${editingId}`);
            }
          } else {
            try {
              const res = await addDoc(collection(db, 'club_timeline'), cleanPayload(payload));
              pushToUndoStack({ collection: 'club_timeline', action: 'add', data: { id: res.id } });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'club_timeline');
            }
          }
        } else if (historySubTab === 'stadiums') {
          const payload = {
            name: formData.name || '',
            type: formData.type || '',
            desc: formData.desc || '',
            imageUrl: formData.imageUrl || '',
            order: formData.order !== undefined && formData.order !== '' ? Number(formData.order) : (isEditing ? (stadiums.find(s => s.id === editingId)?.order ?? 0) : stadiums.length),
            hidden: formData.hidden ?? false
          };
          if (isEditing && editingId) {
            const oldData = stadiums.find(s => s.id === editingId);
            if (oldData) pushToUndoStack({ collection: 'club_stadiums', action: 'update', data: { ...oldData } });
            try {
              await updateDoc(doc(db, 'club_stadiums', editingId), cleanPayload(payload));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `club_stadiums/${editingId}`);
            }
          } else {
            try {
              const res = await addDoc(collection(db, 'club_stadiums'), cleanPayload(payload));
              pushToUndoStack({ collection: 'club_stadiums', action: 'add', data: { id: res.id } });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'club_stadiums');
            }
          }
        }
      } else if (activeTab === 'music') {
        if (musicSubTab === 'songs') {
          const songAlbumId = formData.albumId || '';
          const payload = {
            title: formData.title || '',
            artist: formData.artist || '',
            albumId: songAlbumId,
            audioUrl: formData.audioUrl || '',
            coverUrl: formData.coverUrl || '',
            category: formData.category || 'chant',
            duration: formData.duration || '03:30',
            hidden: formData.hidden || false,
            createdAt: isEditing ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
          };
          let songId = editingId;
          if (isEditing && editingId) {
            try {
              await updateDoc(doc(db, 'songs', editingId), cleanPayload(payload));
              setSongs(songs.map(s => s.id === editingId ? { id: editingId, ...payload } : s));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `songs/${editingId}`);
            }
          } else {
            try {
              const docRef = await addDoc(collection(db, 'songs'), cleanPayload(payload));
              songId = docRef.id;
              setSongs([{ id: songId, ...payload }, ...songs]);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'songs');
            }
          }

          // Sync Album songIds
          if (songId) {
            const updatedAlbums = albums.map(alb => {
              const currentSongIds = alb.songIds || [];
              if (alb.id === songAlbumId) {
                if (!currentSongIds.includes(songId)) {
                  const newIds = [...currentSongIds, songId];
                  updateDoc(doc(db, 'albums', alb.id), { songIds: newIds }).catch(() => {});
                  return { ...alb, songIds: newIds };
                }
              } else {
                if (currentSongIds.includes(songId)) {
                  const newIds = currentSongIds.filter(id => id !== songId);
                  updateDoc(doc(db, 'albums', alb.id), { songIds: newIds }).catch(() => {});
                  return { ...alb, songIds: newIds };
                }
              }
              return alb;
            });
            setAlbums(updatedAlbums);
          }
        } else if (musicSubTab === 'albums') {
          const selectedSongIds: string[] = Array.isArray(formData.songIds) ? formData.songIds : [];
          const payload = {
            title: formData.title || '',
            artist: formData.artist || 'الاتحاد السكندري',
            coverUrl: formData.coverUrl || '',
            year: formData.year || new Date().getFullYear().toString(),
            songIds: selectedSongIds,
            hidden: formData.hidden || false
          };
          let currentAlbumId = editingId;
          if (isEditing && editingId) {
            try {
              await updateDoc(doc(db, 'albums', editingId), cleanPayload(payload));
              setAlbums(albums.map(a => a.id === editingId ? { id: editingId, ...payload } : a));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `albums/${editingId}`);
            }
          } else {
            try {
              const docRef = await addDoc(collection(db, 'albums'), cleanPayload(payload));
              currentAlbumId = docRef.id;
              setAlbums([{ id: currentAlbumId, ...payload }, ...albums]);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'albums');
            }
          }

          // Sync Songs albumId
          if (currentAlbumId) {
            const updatedSongs = songs.map(s => {
              if (selectedSongIds.includes(s.id)) {
                if (s.albumId !== currentAlbumId) {
                  updateDoc(doc(db, 'songs', s.id), { albumId: currentAlbumId }).catch(() => {});
                  return { ...s, albumId: currentAlbumId };
                }
              } else if (s.albumId === currentAlbumId) {
                updateDoc(doc(db, 'songs', s.id), { albumId: '' }).catch(() => {});
                return { ...s, albumId: '' };
              }
              return s;
            });
            setSongs(updatedSongs);
          }
        } else if (musicSubTab === 'playlists') {
          const payload = {
            title: formData.title || '',
            coverUrl: formData.coverUrl || '',
            songIds: formData.songIds || [],
            hidden: formData.hidden || false
          };
          if (isEditing && editingId) {
            try {
              await updateDoc(doc(db, 'playlists', editingId), cleanPayload(payload));
              setPlaylists(playlists.map(p => p.id === editingId ? { id: editingId, ...payload } : p));
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `playlists/${editingId}`);
            }
          } else {
            try {
              const docRef = await addDoc(collection(db, 'playlists'), cleanPayload(payload));
              setPlaylists([{ id: docRef.id, ...payload }, ...playlists]);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'playlists');
            }
          }
        }
      } else if (activeTab === 'books') {
        const payload = {
          title: formData.title || '',
          author: formData.author || '',
          coverUrl: formData.coverUrl || '',
          pdfUrl: formData.pdfUrl || '',
          desc: formData.desc || '',
          category: formData.category || 'كتاب',
          hidden: formData.hidden || false
        };
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'books', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `books/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'books'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'books');
          }
        }
      } else if (activeTab === 'layout' && formData.__isCustomPage) {
        const payload = {
          title: formData.title || 'صفحة جديدة',
          slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-'),
          content: formData.content || '',
          active: formData.active ?? true,
          createdAt: isEditing ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
        };
        
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'custom_pages', editingId), cleanPayload(payload));
            try { if (typeof window !== 'undefined') localStorage.removeItem('fs_cache_custom_pages'); } catch (e) {}
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `custom_pages/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'custom_pages'), cleanPayload(payload));
            try { if (typeof window !== 'undefined') localStorage.removeItem('fs_cache_custom_pages'); } catch (e) {}
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'custom_pages');
          }
        }
      } else if (activeTab === 'ai-studio') {
        const payload = {
          name: formData.name || 'تيشيرت جديد',
          url: formData.url || '',
          createdAt: isEditing ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
        };
        if (isEditing && editingId) {
          try {
            await updateDoc(doc(db, 'jerseys', editingId), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `jerseys/${editingId}`);
          }
        } else {
          try {
            await addDoc(collection(db, 'jerseys'), cleanPayload(payload));
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'jerseys');
          }
        }
      } else if (activeTab === 'club_members') {
        if (clubSubTab === 'committees') {
          const payload = {
            name: formData.name || '',
            description: formData.description || '',
            president: formData.president || '',
            vicePresident: formData.vicePresident || '',
            icon: formData.icon || 'groups',
            image: formData.image || '',
            status: formData.status || 'active',
            order: Number(formData.order || 0)
          };
          if (isEditing && editingId) {
            await setDoc(doc(db, 'club_committees', editingId), cleanPayload(payload));
            setClubCommittees(
              (clubCommittees || []).some(c => c.id === editingId)
                ? (clubCommittees || []).map(c => c.id === editingId ? { id: editingId, ...payload } : c)
                : [...(clubCommittees || []), { id: editingId, ...payload }]
            );
          } else {
            const docRef = await addDoc(collection(db, 'club_committees'), cleanPayload(payload));
            setClubCommittees([{ id: docRef.id, ...payload }, ...(clubCommittees || [])]);
          }
        } else if (clubSubTab === 'announcements') {
          const payload = {
            title: formData.title || '',
            content: formData.content || '',
            image: formData.image || '',
            category: formData.category || 'عام',
            priority: formData.priority || 'normal',
            committeeId: formData.committeeId || '',
            pinned: formData.pinned ?? false,
            active: formData.active ?? true,
            createdAt: isEditing ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
          };
          if (isEditing && editingId) {
            await setDoc(doc(db, 'club_announcements', editingId), cleanPayload(payload));
            setClubAnnouncements(
              (clubAnnouncements || []).some(a => a.id === editingId)
                ? (clubAnnouncements || []).map(a => a.id === editingId ? { id: editingId, ...payload } : a)
                : [...(clubAnnouncements || []), { id: editingId, ...payload }]
            );
          } else {
            const docRef = await addDoc(collection(db, 'club_announcements'), cleanPayload(payload));
            setClubAnnouncements([{ id: docRef.id, ...payload }, ...(clubAnnouncements || [])]);
          }
        } else if (clubSubTab === 'services') {
          const payload = {
            title: formData.title || '',
            description: formData.description || '',
            category: formData.category || 'الخدمات الحكومية',
            location: formData.location || '',
            workingHours: formData.workingHours || '',
            phone: formData.phone || '',
            requirements: formData.requirements || '',
            image: formData.image || '',
            bookingUrl: formData.bookingUrl || '',
            bookingText: formData.bookingText || '',
            active: formData.active ?? true,
            order: Number(formData.order || 0)
          };
          if (isEditing && editingId) {
            await setDoc(doc(db, 'club_services', editingId), cleanPayload(payload));
            setClubServices(
              (clubServices || []).some(s => s.id === editingId)
                ? (clubServices || []).map(s => s.id === editingId ? { id: editingId, ...payload } : s)
                : [...(clubServices || []), { id: editingId, ...payload }]
            );
          } else {
            const docRef = await addDoc(collection(db, 'club_services'), cleanPayload(payload));
            setClubServices([{ id: docRef.id, ...payload }, ...(clubServices || [])]);
          }
        } else if (clubSubTab === 'trips') {
          const payload = {
            title: formData.title || '',
            description: formData.description || '',
            destination: formData.destination || '',
            startDate: formData.startDate || '',
            endDate: formData.endDate || '',
            priceMember: Number(formData.priceMember || 0),
            priceNonMember: Number(formData.priceNonMember || 0),
            features: formData.features || '',
            requirements: formData.requirements || '',
            maxParticipants: Number(formData.maxParticipants || 0),
            image: formData.image || '',
            status: formData.status || 'upcoming',
            active: formData.active ?? true,
            order: Number(formData.order || 0),
            createdAt: isEditing ? (formData.createdAt || new Date().toISOString()) : new Date().toISOString()
          };
          if (isEditing && editingId) {
            await setDoc(doc(db, 'club_trips', editingId), cleanPayload(payload));
            setClubTrips(
              (clubTrips || []).some(t => t.id === editingId)
                ? (clubTrips || []).map(t => t.id === editingId ? { id: editingId, ...payload } : t)
                : [...(clubTrips || []), { id: editingId, ...payload }]
            );
          } else {
            const docRef = await addDoc(collection(db, 'club_trips'), cleanPayload(payload));
            setClubTrips([{ id: docRef.id, ...payload }, ...(clubTrips || [])]);
          }
        } else if (clubSubTab === 'settings') {
          const payload = {
            phoneHotline: formData.phoneHotline || '',
            workingHours: formData.workingHours || '',
            memberNotice: formData.memberNotice || '',
            updatedAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'club_members_settings', 'main'), cleanPayload(payload));
          setClubMembersSettings(payload as any);
        } else if (clubSubTab === 'discounts') {
          const payload = {
            name: formData.name || '',
            category: formData.category || 'مستشفيات',
            address: formData.address || '',
            location: formData.location || 'سموحة',
            discountDetails: formData.discountDetails || '',
            phoneNumbers: formData.phoneNumbers || '',
            mapsUrl: formData.mapsUrl || '',
            active: formData.active !== undefined ? formData.active : true,
            featured: formData.featured !== undefined ? formData.featured : false,
            updatedAt: new Date().toISOString()
          };
          if (isEditing && editingId) {
            await updateDoc(doc(db, 'member_discounts', editingId), cleanPayload(payload));
            setMemberDiscounts(
              (memberDiscounts || []).some(d => d.id === editingId)
                ? (memberDiscounts || []).map(d => d.id === editingId ? { id: editingId, ...payload } : d)
                : [...(memberDiscounts || []), { id: editingId, ...payload }]
            );
          } else {
            const docRef = await addDoc(collection(db, 'member_discounts'), cleanPayload(payload));
            setMemberDiscounts([{ id: docRef.id, ...payload }, ...(memberDiscounts || [])]);
          }
        }
      }

      toast.success('تم الحفظ بنجاح');
      setShowModal(false);
      setFormData({});
      setIsEditing(false);
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'comments') {
      const q = query(collection(db, 'live_comments'), orderBy('createdAt', 'desc'), limit(50));
      return onSnapshot(q, (snapshot) => {
        setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'live_comments'));
    } else if (activeTab === 'fan-comments' || activeTab === 'fanzone') {
      const q = query(collection(db, 'fan_comments'), orderBy('createdAt', 'desc'), limit(100));
      return onSnapshot(q, (snapshot) => {
        setFanComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'fan_comments'));
    }
  }, [activeTab]);

  const handleDelete = async (coll: string, id: string) => {
    if (window.confirm('هل أنت متأكد من الحذف؟')) {
      // Find item for undo and audit logging snapshot
      let item: any = null;
      let itemTitle = 'عنصر بدون عنوان';

      if (coll === 'media') {
        item = media.find(i => i.id === id);
        itemTitle = item?.title || 'عنصر ميديا';
      } else if (coll === 'media_playlists') {
        item = mediaPlaylists.find(i => i.id === id);
        itemTitle = item?.title || 'قائمة تشغيل وسائط';
      } else if (coll === 'news') {
        item = news.find(i => i.id === id);
        itemTitle = item?.title || 'خبر';
      } else if (coll === 'matches') {
        item = matches.find(i => i.id === id);
        itemTitle = item ? `${item.homeTeam} ضد ${item.awayTeam}` : 'مباراة';
      } else if (coll === 'products') {
        item = products.find(i => i.id === id);
        itemTitle = item?.name || 'منتج';
      } else if (coll === 'orders') {
        item = orders.find(i => i.id === id);
        itemTitle = item ? `طلب #${item.id?.slice(0, 6)} - ${item.userName}` : 'طلب متجر';
      } else if (coll === 'songs') {
        item = songs.find(i => i.id === id);
        itemTitle = item?.title || 'أغنية';
      } else if (coll === 'albums') {
        item = albums.find(i => i.id === id);
        itemTitle = item?.title || 'ألبوم';
      } else if (coll === 'playlists') {
        item = playlists.find(i => i.id === id);
        itemTitle = item?.title || 'قائمة أغانٍ';
      } else if (coll === 'books') {
        item = books.find(i => i.id === id);
        itemTitle = item?.title || 'كتاب';
      } else if (coll === 'fan_posts') {
        item = fanPosts.find(i => i.id === id);
        itemTitle = item?.content?.slice(0, 40) || 'منشور جماهير';
      } else if (coll === 'fan_comments') {
        item = fanComments.find(i => i.id === id);
        itemTitle = item?.content?.slice(0, 40) || 'تعليق جماهير';
      } else if (coll === 'polls') {
        item = polls.find(i => i.id === id);
        itemTitle = item?.question || 'استطلاع رأي';
      } else if (coll === 'predictions') {
        item = predictions.find(i => i.id === id);
        itemTitle = item ? `توقع ${item.userName}` : 'توقع مباراة';
      } else if (coll === 'clubs') {
        item = clubs.find(i => i.id === id);
        itemTitle = item?.name || 'نادي';
      } else if (coll === 'club_committees') {
        item = committeesList.find((i: any) => i.id === id);
        itemTitle = item?.name || 'لجنة';
      } else if (coll === 'club_announcements') {
        item = announcementsList.find((i: any) => i.id === id);
        itemTitle = item?.title || 'إعلان';
      } else if (coll === 'club_services') {
        item = servicesList.find((i: any) => i.id === id);
        itemTitle = item?.title || item?.name || 'خدمة';
      } else if (coll === 'club_trips') {
        item = tripsList.find((i: any) => i.id === id);
        itemTitle = item?.title || 'رحلة';
      } else if (coll === 'member_discounts') {
        item = memberDiscounts.find(i => i.id === id);
        itemTitle = item?.name || 'خصم أعضاء';
      } else if (coll === 'businesses') {
        item = businesses.find(i => i.id === id);
        itemTitle = item?.businessName || 'نشاط تجاري';
      } else if (coll === 'world_groups') {
        item = worldGroups.find(i => i.id === id);
        itemTitle = item?.name || item?.countryName || 'رابطة اتحاداوية';
      } else if (coll === 'world_events') {
        item = worldEvents.find(i => i.id === id);
        itemTitle = item?.title || 'فعالية';
      } else if (coll === 'world_posts') {
        item = worldPosts.find(i => i.id === id);
        itemTitle = item?.content?.slice(0, 40) || 'منشور مغتربين';
      } else if (coll === 'world_help_requests') {
        item = worldHelpRequests.find(i => i.id === id);
        itemTitle = item?.title || 'طلب مساعدة';
      } else if (coll === 'club_stats') {
        item = clubStats.find(i => i.id === id);
        itemTitle = item?.label || 'إحصائية';
      } else if (coll === 'club_titles') {
        item = clubTitles.find(i => i.id === id);
        itemTitle = item?.name || 'بطولة';
      } else if (coll === 'club_timeline') {
        item = historyEvents.find(i => i.id === id);
        itemTitle = item?.title || 'حدث تاريخي';
      } else if (coll === 'club_stadiums') {
        item = stadiums.find(i => i.id === id);
        itemTitle = item?.name || 'ملعب';
      } else if (coll === 'custom_pages') {
        item = customPages.find(i => i.id === id);
        itemTitle = item?.title || 'صفحة مخصصة';
      } else if (coll === 'users') {
        item = users.find(i => (i.uid === id || (i as any).id === id));
        itemTitle = item?.name || 'عضو';
      }

      if (item) pushToUndoStack({ collection: coll, action: 'delete', data: { ...item } });

      // Instantly update Zustand store and local states FIRST so the element disappears from UI and stays deleted
      const store = useAppStore.getState();
      if (coll === 'news') {
        store.deleteNews(id);
      } else if (coll === 'media') {
        store.deleteMedia(id);
      } else if (coll === 'media_playlists') {
        store.setMediaPlaylists((store.mediaPlaylists || []).filter(p => p.id !== id));
      } else if (coll === 'matches') {
        store.deleteMatch(id);
      } else if (coll === 'products') {
        store.setProducts((store.products || []).filter(p => p.id !== id));
      } else if (coll === 'orders') {
        store.setOrders((store.orders || []).filter(o => o.id !== id));
      } else if (coll === 'songs') {
        store.setSongs((store.songs || []).filter(s => s.id !== id));
      } else if (coll === 'albums') {
        store.setAlbums((store.albums || []).filter(a => a.id !== id));
      } else if (coll === 'playlists') {
        store.setPlaylists((store.playlists || []).filter(p => p.id !== id));
      } else if (coll === 'books') {
        store.setBooks((store.books || []).filter(b => b.id !== id));
      } else if (coll === 'fan_posts') {
        store.setFanPosts((store.fanPosts || []).filter(p => p.id !== id));
      } else if (coll === 'fan_comments') {
        setFanComments(prev => prev.filter(c => c.id !== id));
      } else if (coll === 'live_comments') {
        setComments(prev => prev.filter(c => c.id !== id));
      } else if (coll === 'polls') {
        store.setPolls((store.polls || []).filter(p => p.id !== id));
      } else if (coll === 'predictions') {
        store.setPredictions((store.predictions || []).filter(p => p.id !== id));
      } else if (coll === 'clubs') {
        store.setClubs((store.clubs || []).filter(c => c.id !== id));
      } else if (coll === 'club_committees') {
        store.setClubCommittees((store.clubCommittees || []).filter(c => c.id !== id));
      } else if (coll === 'club_announcements') {
        store.setClubAnnouncements((store.clubAnnouncements || []).filter(a => a.id !== id));
      } else if (coll === 'club_services') {
        store.setClubServices((store.clubServices || []).filter(s => s.id !== id));
      } else if (coll === 'club_trips') {
        store.setClubTrips((store.clubTrips || []).filter(t => t.id !== id));
      } else if (coll === 'member_discounts') {
        store.setMemberDiscounts((store.memberDiscounts || []).filter(d => d.id !== id));
      } else if (coll === 'businesses') {
        store.setBusinesses((store.businesses || []).filter(b => b.id !== id));
      } else if (coll === 'world_groups') {
        store.setWorldGroups((store.worldGroups || []).filter(g => g.id !== id));
      } else if (coll === 'world_events') {
        store.setWorldEvents((store.worldEvents || []).filter(e => e.id !== id));
      } else if (coll === 'world_posts') {
        store.setWorldPosts((store.worldPosts || []).filter(p => p.id !== id));
      } else if (coll === 'world_help_requests') {
        store.setWorldHelpRequests((store.worldHelpRequests || []).filter(h => h.id !== id));
      } else if (coll === 'club_stats') {
        store.setClubStats((store.clubStats || []).filter(s => s.id !== id));
      } else if (coll === 'club_titles') {
        store.setClubTitles((store.clubTitles || []).filter(t => t.id !== id));
      } else if (coll === 'club_timeline') {
        store.setHistoryEvents((store.historyEvents || []).filter(h => h.id !== id));
      } else if (coll === 'club_stadiums') {
        store.setStadiums((store.stadiums || []).filter(s => s.id !== id));
      } else if (coll === 'custom_pages') {
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('fs_cache_custom_pages');
          }
        } catch (e) {}
        setCustomPages(prev => prev.filter(p => p.id !== id));
        store.setCustomPages(store.customPages.filter(p => p.id !== id));
      } else if (coll === 'users') {
        store.deleteUser(id);
      } else if (coll === 'ads') {
        store.setAds((store.ads || []).filter(a => a.id !== id));
      }

      toast.success('تم الحذف بنجاح 🗑️');

      // Now sync delete with Firestore
      try {
        const docRef = doc(db, coll, id);
        await deleteDoc(docRef);
        logAdminActivity({
          action: 'delete',
          collectionName: coll,
          itemId: id,
          itemTitle: itemTitle,
          itemData: item ? { ...item } : { id },
          details: `تم الحذف من لوحة التحكم بواسطة ${profile.name || auth.currentUser?.email || 'مشرف'}`
        }).catch(() => {});
      } catch (err: any) {
        console.warn(`Firestore sync note for ${coll}/${id}:`, err?.message || err);
      }
    }
  };

  const toggleFeaturedMedia = async (item: any) => {
    try {
      const newStatus = !item.isFeatured;
      await updateDoc(doc(db, 'media', item.id), { isFeatured: newStatus });
      toast.success(newStatus ? 'تم تعيين العنصر كعنصر مميز بنجاح' : 'تم إلغاء التمييز بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء تحديث حالة التمييز');
    }
  };

  const handleToggleAIBan = async (member: any) => {
    try {
      const newStatus = !member.isBannedFromAI;
      await updateDoc(doc(db, 'users', member.uid), { isBannedFromAI: newStatus });
      toast.success(newStatus ? 'تم حظر العضو من الاستوديو' : 'تم إلغاء حظر العضو');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  const handleDeleteMember = async (member: any) => {
    if (!window.confirm(`هل أنت متأكد من حذف العضو "${member.name || member.email}" نهائياً من التطبيق؟`)) return;
    
    const memberId = member.uid || member.id;
    useAppStore.getState().deleteUser(memberId);
    toast.success('تم حذف العضو بنجاح 🗑️');

    try {
      await deleteDoc(doc(db, 'users', memberId));
      logAdminActivity({
        action: 'delete',
        collectionName: 'users',
        itemId: memberId,
        itemTitle: member.name || member.email || 'عضو تطبيق',
        itemThumbnail: member.avatar || '',
        itemData: { ...member },
        details: `تم حذف العضو "${member.name}" بواسطة ${profile.name || auth.currentUser?.email || 'مشرف'}`
      }).catch(() => {});
    } catch (err) {
      console.warn('Firestore user delete note:', err);
    }
  };

  const handleToggleVisibility = async (coll: string, item: any) => {
    try {
      const newHidden = !item.hidden;
      pushToUndoStack({ collection: coll, action: 'update', data: { ...item } });
      await updateDoc(doc(db, coll, item.id), { hidden: newHidden });
      toast.success(newHidden ? 'تم الإخفاء' : 'تم الإظهار');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${coll}/${item.id}`);
    }
  };

  const handleUndo = async () => {
    const op = popFromUndoStack();
    if (!op) {
      toast.error('لا توجد عمليات للتراجع عنها');
      return;
    }

    setLoading(true);
    try {
      if (op.action === 'add') {
        // Reverse of add is delete
        await deleteDoc(doc(db, op.collection, op.data.id));
      } else if (op.action === 'delete') {
        // Reverse of delete is add (re-create with same ID)
        const { id, ...data } = op.data;
        await setDoc(doc(db, op.collection, id), data);
      } else if (op.action === 'update') {
        // Reverse of update is setting it back to original data
        const { id, ...data } = op.data;
        await updateDoc(doc(db, op.collection, id), data);
      }
      toast.success('تم التراجع بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('فشل التراجع');
    } finally {
      setLoading(false);
    }
  };

  const handleTimerAction = async (action: 'start' | 'pause' | 'reset', match: any) => {
    let updates: any = {};
    const now = new Date().toISOString();
    const isBasketball = match.sport === 'basketball';
    
    if (action === 'start') {
      updates = {
        isTimerRunning: true,
        timerStartTime: now,
        status: 'live'
      };
      if (isBasketball && (!match.timerBaseMinute || match.timerBaseMinute === 0)) {
        updates.timerBaseMinute = 10;
      }
    } else if (action === 'pause') {
      const elapsed = match.timerStartTime ? Math.floor((new Date().getTime() - new Date(match.timerStartTime).getTime()) / 60000) : 0;
      if (isBasketball) {
        const base = (match.timerBaseMinute !== undefined && match.timerBaseMinute !== null && match.timerBaseMinute !== '') ? Number(match.timerBaseMinute) : 10;
        updates = {
          isTimerRunning: false,
          timerBaseMinute: Math.max(0, base - elapsed),
          timerStartTime: null
        };
      } else {
        updates = {
          isTimerRunning: false,
          timerBaseMinute: (match.timerBaseMinute || 0) + elapsed,
          timerStartTime: null
        };
      }
    } else if (action === 'reset') {
      updates = {
        isTimerRunning: false,
        timerBaseMinute: isBasketball ? 10 : 0,
        timerStartTime: null,
        status: 'upcoming'
      };
    }

    try {
      await updateDoc(doc(db, 'matches', match.id), updates);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحديث المؤقت');
    }
  };

  const calculateCurrentMinute = (match: any) => {
    const isBasketball = match.sport === 'basketball';
    const defaultBase = isBasketball ? 10 : 0;
    const baseMin = (match.timerBaseMinute !== undefined && match.timerBaseMinute !== null && match.timerBaseMinute !== '')
      ? Number(match.timerBaseMinute)
      : defaultBase;
    if (!match.isTimerRunning || !match.timerStartTime) return baseMin;
    const start = new Date(match.timerStartTime).getTime();
    if (isNaN(start)) return baseMin;
    const elapsed = Math.max(0, Math.floor((new Date().getTime() - start) / 60000));
    if (isBasketball) {
      return Math.max(0, baseMin - elapsed);
    }
    return baseMin + elapsed;
  };

  const sortHistoryList = <T extends { order?: number }>(items: T[], fallbackSort?: (a: T, b: T) => number): T[] => {
    return [...items].sort((a, b) => {
      const hasA = typeof a.order === 'number';
      const hasB = typeof b.order === 'number';
      if (hasA && hasB) return (a.order as number) - (b.order as number);
      if (hasA) return -1;
      if (hasB) return 1;
      if (fallbackSort) return fallbackSort(a, b);
      return 0;
    });
  };

  const handleReorderHistory = async (sub: 'stats' | 'titles' | 'timeline' | 'stadiums', index: number, direction: 'up' | 'down') => {
    let list: any[] = [];
    let colName = '';
    let setter: ((d: any[]) => void) | null = null;

    if (sub === 'stats') {
      list = sortHistoryList(clubStats);
      colName = 'club_stats';
      setter = setClubStats;
    } else if (sub === 'titles') {
      list = sortHistoryList(clubTitles, (a, b) => b.count - a.count);
      colName = 'club_titles';
      setter = setClubTitles;
    } else if (sub === 'timeline') {
      list = sortHistoryList(historyEvents, (a, b) => (a.year || '').localeCompare(b.year || ''));
      colName = 'club_timeline';
      setter = setHistoryEvents;
    } else if (sub === 'stadiums') {
      list = sortHistoryList(stadiums);
      colName = 'club_stadiums';
      setter = setStadiums;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    const updatedList = newList.map((item, idx) => ({ ...item, order: idx }));
    if (setter) setter(updatedList);

    try {
      const item1 = updatedList[index];
      const item2 = updatedList[targetIndex];
      await Promise.all([
        updateDoc(doc(db, colName, item1.id), { order: index }),
        updateDoc(doc(db, colName, item2.id), { order: targetIndex })
      ]);
      toast.success('تم حفظ الترتيب الجديد بنجاح');
    } catch (err) {
      console.error('Error reordering history items:', err);
      toast.error('حدث خطأ أثناء حفظ الترتيب');
    }
  };

  const openEditModal = (data: any, id: string) => {
    const freshData = { ...data };
    setFormData(freshData);
    setBaseData(freshData);
    setIsEditing(true);
    setEditingId(id);
    setShowModal(true);
  };

  const handleEditMatch = (match: any) => {
    const data = { ...match };
    setFormData(data);
    setBaseData(data);
    setIsEditing(true);
    setEditingId(match.id);
    setActiveTab('matches');
    setShowModal(true);
  };

  const handleEditNews = (item: any) => {
    const data = { 
      ...item, 
      image: item.image || item.imageUrl,
      newsType: item.newsType || 'news',
      videoUrl: item.videoUrl || '',
      videoType: item.videoType || 'auto'
    };
    setFormData(data);
    setBaseData(data);
    setIsEditing(true);
    setEditingId(item.id);
    setShowModal(true);
  };

  const openAddModal = () => {
    let initialData: any = {};
    if (activeTab === 'news') {
      initialData = { title: '', content: '', image: '', category: 'أخبار النادي', author: 'الموقع الرسمي', newsType: 'news', videoUrl: '', videoType: 'auto', tagIds: [] };
    } else if (activeTab === 'polls') {
      initialData = { options: ['', ''], active: true };
    } else if (activeTab === 'media') {
      initialData = { type: 'video', source: 'youtube', url: '', videoUrl: '', date: new Date().toISOString() };
    } else if (activeTab === 'music') {
      if (musicSubTab === 'songs') {
        initialData = { title: '', artist: 'نادي الاتحاد السكندري', category: 'chant', audioUrl: '', coverUrl: '', duration: '03:30', albumId: '', hidden: false };
      } else if (musicSubTab === 'albums') {
        initialData = { title: '', artist: 'نادي الاتحاد السكندري', year: new Date().getFullYear().toString(), coverUrl: '', songIds: [], hidden: false };
      } else if (musicSubTab === 'playlists') {
        initialData = { title: '', coverUrl: '', songIds: [], hidden: false };
      }
    } else if (activeTab === 'books') {
      initialData = { title: '', author: 'نادي الاتحاد السكندري', coverUrl: '', pdfUrl: '', desc: '', hidden: false };
    }
    setFormData(initialData);
    setBaseData(initialData);
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  if (profile.uid && !hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
        <div className="text-center p-8 bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark shadow-xl max-w-md w-full">
          <ShieldAlert size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">دخول غير مصرح</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mb-6">لا تمتلك الصلاحيات الكافية للوصول إلى لوحة التحكم.</p>
          <Link to="/" className="inline-block bg-primary hover:bg-primary-light text-white px-8 py-3 rounded-2xl font-black transition-all shadow-md shadow-primary/20 cursor-pointer">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-h-screen bg-slate-50 dark:bg-background-dark flex flex-col lg:flex-row relative">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setShowSidebar(false)}
        />
      )}
      
      {/* Mobile Drawer Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-[70] lg:hidden transition-transform duration-300 transform ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
        <AdminSidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setShowSidebar(false); }} onClose={() => setShowSidebar(false)} />
      </div>

      {/* Desktop Persistent Docked Sidebar */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 lg:border-l lg:border-border-light lg:dark:border-border-dark lg:bg-white lg:dark:bg-card-dark z-30">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Responsive Admin Topbar */}
        <header className="bg-white dark:bg-card-dark border-b border-border-light dark:border-border-dark px-4 lg:px-8 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-40 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSidebar(true)} 
              className="lg:hidden h-10 px-3.5 bg-slate-100 dark:bg-surface-dark rounded-xl flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 border border-border-light dark:border-border-dark pressable active:scale-95 transition-all text-xs font-black"
            >
              <Menu size={18} />
              <span>القائمة</span>
            </button>

            <div className="hidden lg:flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">لوحة الإدارة الشاملة</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="h-10 px-3.5 rounded-xl bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 dark:hover:bg-surface-dark/80 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-2 transition-colors border border-border-light dark:border-border-dark"
            >
              <span className="material-symbols-outlined !text-[18px]">open_in_new</span>
              <span className="hidden sm:inline">عرض التطبيق</span>
            </Link>

            <button 
              onClick={async () => {
                try {
                  await auth.signOut();
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/auth';
                } catch (error) {
                  console.error('Logout error:', error);
                  window.location.href = '/auth';
                }
              }}
              className="h-10 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm pressable active:scale-95 transition-all cursor-pointer"
            >
              <span>خروج</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto pb-32 lg:pb-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'overview' ? 'لوحة التحكم' :
             activeTab === 'analytics' ? 'مركز الإحصاءات والتحليلات والتفاعل' :
             activeTab === 'world-fans' ? 'رابطة اتحاداوية العالم (مغتربين)' :
             activeTab === 'news' ? 'إدارة الأخبار' : 
             activeTab === 'news-categories' ? 'إدارة أقسام الأخبار' :
             activeTab === 'news-tags' ? 'إدارة وسوم الأخبار' :
             activeTab === 'public-services' ? 'خدمات الجمهور والتعليم المجاني' :
             activeTab === 'fanzone' ? 'إدارة منطقة الجماهير' :
             activeTab === 'media' ? 'إدارة الميديا' : 
             activeTab === 'matches' ? 'إدارة المباريات' : 
             activeTab === 'posts' ? 'منشورات الجماهير' :
             activeTab === 'predictions' ? 'إدارة توقعات المباريات' :
             activeTab === 'audit-logs' ? 'سجل نشاط المشرفين وسلة المحذوفات' :
             activeTab === 'users' ? 'إدارة الأعضاء' : 
             activeTab === 'settings' ? 'إعدادات التطبيق' : 
             activeTab === 'clubs' ? 'إدارة الأندية' : 
             activeTab === 'orders' ? 'إدارة المشتريات' :
             activeTab === 'polls' ? 'إدارة الاستطلاعات' : 
             activeTab === 'layout' ? 'تعديل الصفحة الرئيسية' :
             activeTab === 'sidebar-menu' ? 'ترتيب القائمة الجانبية' :
             activeTab === 'history' ? 'تاريخ النادي' :
             activeTab === 'city' ? 'طقس الإسكندرية' :
             activeTab === 'live' ? 'البث المباشر' :
             activeTab === 'ai-studio' ? 'إعدادات استوديو الصور (AI)' :
             activeTab === 'backup' ? 'النسخ الاحتياطي واستعادة البيانات' :
             activeTab === 'comments' ? 'تعليقات البث المباشر' : 'لوحة التحكم'}
          </h1>
          <div className="flex items-center gap-2">
            {activeTab === 'matches' && (
              <button 
                onClick={() => setIsCsvImporterOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm shadow-emerald-600/20 hover:scale-105 transition-all text-xs"
              >
                <FileSpreadsheet size={15} />
                <span>رفع CSV (إضافة بالجملة)</span>
              </button>
            )}
            {activeTab === 'media' && (
              <button 
                onClick={() => setIsCsvVideosImporterOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm shadow-emerald-600/20 hover:scale-105 transition-all text-xs"
              >
                <FileSpreadsheet size={15} />
                <span>رفع CSV (فيديوهات بالجملة)</span>
              </button>
            )}
            {['news', 'media', 'matches', 'clubs', 'polls', 'predictions', 'products', 'history', 'music', 'books', 'ai-studio'].includes(activeTab) && (
              <button 
                onClick={openAddModal}
                className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg font-bold shadow-sm shadow-primary/20 hover:scale-105 transition-all text-xs"
              >
                <Plus size={14} />
                إضافة
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {activeTab === 'public-services' && (
            <AdminServicesManager />
          )}

          {activeTab === 'fanzone' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setActiveTab('posts')}
                  className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex flex-col items-center gap-2 shadow-sm hover:scale-105 transition-all"
                >
                  <MessageSquare size={24} className="text-orange-500" />
                  <span className="font-black text-xs">منشورات الجماهير</span>
                  <span className="text-[10px] font-bold text-slate-400">{fanPosts.length} منشور</span>
                </button>
                <button 
                  onClick={() => setActiveTab('fan-comments')}
                  className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex flex-col items-center gap-2 shadow-sm hover:scale-105 transition-all"
                >
                  <MessageSquare size={24} className="text-pink-500" />
                  <span className="font-black text-xs">تعليقات الفان زون</span>
                  <span className="text-[10px] font-bold text-slate-400">{fanComments.length} تعليق</span>
                </button>
                <button 
                  onClick={() => setActiveTab('polls')}
                  className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex flex-col items-center gap-2 shadow-sm hover:scale-105 transition-all"
                >
                  <BarChart3 size={24} className="text-green-500" />
                  <span className="font-black text-xs">الاستطلاعات</span>
                  <span className="text-[10px] font-bold text-slate-400">{polls.length} استطلاع</span>
                </button>
                <button 
                  onClick={() => setActiveTab('predictions')}
                  className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex flex-col items-center gap-2 shadow-sm hover:scale-105 transition-all"
                >
                  <Trophy size={24} className="text-yellow-500" />
                  <span className="font-black text-xs">توقعات المباريات</span>
                  <span className="text-[10px] font-bold text-slate-400">{predictions.length} توقع</span>
                </button>
                <button 
                  onClick={() => setActiveTab('comments')}
                  className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex flex-col items-center gap-2 shadow-sm hover:scale-105 transition-all"
                >
                  <MessageSquare size={24} className="text-blue-500" />
                  <span className="font-black text-xs">تعليقات البث</span>
                  <span className="text-[10px] font-bold text-slate-400">{comments.length} تعليق</span>
                </button>
              </div>

              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20">
                <h3 className="font-black text-sm mb-2 text-primary">إحصائيات سريعة</h3>
                <div className="flex justify-between items-center bg-white dark:bg-card-dark p-4 rounded-xl">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">الأكثر تفاعلاً</p>
                    <p className="text-sm font-black text-primary">
                      {fanPosts.length > 0 ? (fanPosts.sort((a,b) => (b.likes||0) - (a.likes||0))[0].userName) : '---'}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-slate-100 mx-4"></div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">تصويتات اليوم</p>
                    <p className="text-sm font-black text-primary">
                      {polls.filter(p => p.active).length} نشط
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'city' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-card-dark rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <CloudSun size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">بيانات مدينة الإسكندرية</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Alexandria City Info</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openEditModal(cityInfo || {}, 'cityInfo')}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 flex items-center gap-2 transition-all pressable"
                  >
                    <Edit2 size={14} />
                    تعديل البيانات
                  </button>
                </div>

                {cityInfo ? (
                  <div className="space-y-6">
                    <div className="relative h-48 rounded-3xl overflow-hidden border border-border-light dark:border-border-dark">
                      <img src={cityInfo.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                        <div className="flex items-end justify-between">
                          <div>
                            <h2 className="text-2xl font-black text-white leading-none">{cityInfo.cityName}</h2>
                            <p className="text-white/70 text-[10px] font-bold mt-1 flex items-center gap-1">
                              <MapPin size={10} /> مصر، الإسكندرية
                            </p>
                          </div>
                          <div className="text-right">
                             <div className="flex items-center gap-2 text-white">
                               <Thermometer size={20} className="text-primary" />
                               <span className="text-3xl font-black">{cityInfo.temperature}°</span>
                             </div>
                             <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">{cityInfo.condition}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-border-dark flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Sunrise size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">الشروق</p>
                          <p className="text-sm font-black tabular-nums">{cityInfo.sunrise}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-border-dark flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                          <Sunset size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">الغروب</p>
                          <p className="text-sm font-black tabular-nums">{cityInfo.sunset}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-border-dark">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">نبذة عن المدينة</h4>
                       <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold">{cityInfo.description}</p>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className={`w-3 h-3 rounded-full ${cityInfo.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs font-black uppercase tracking-tighter">
                        الحالة: {cityInfo.active ? 'نشط على الموقع' : 'مخفي'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-3xl">
                     <CloudSun size={48} className="opacity-20" />
                     <p className="text-xs font-bold">لا توجد بيانات مسجلة لمدينة الإسكندرية</p>
                     <button onClick={openAddModal} className="text-primary text-xs font-black border-b border-primary/30">إضافة البيانات الآن</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sections-control' && (
            <AdminSectionFlagsManager />
          )}

          {activeTab === 'layout' && (
            <div className="space-y-8">
              <AdminHomeSectionsManager />
              
              <div className="bg-white dark:bg-card-dark rounded-[32px] p-4 border border-border-light dark:border-border-dark shadow-sm mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">الصفحات المخصصة</h3>
                  <button 
                    onClick={() => {
                      setFormData({ __isCustomPage: true, active: true });
                      setIsEditing(false);
                      setEditingId(null);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-1 text-xs font-black bg-primary text-white px-3 py-1.5 rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all"
                  >
                    <Plus size={14} /> إضافة
                  </button>
                </div>
                {customPages.length === 0 ? (
                  <p className="text-xs text-slate-500 font-bold text-center py-6">لا توجد صفحات مخصصة</p>
                ) : (
                  <div className="space-y-3">
                    {customPages.map(page => (
                      <div key={page.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark rounded-2xl">
                        <div>
                          <h4 className="text-sm font-black">{page.title}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 w-full max-w-[200px] truncate">{page.slug}</p>
                          <div className="mt-2 flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${page.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                             <span className="text-[9px] font-bold text-slate-400">{page.active ? 'نشط' : 'مخفي'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Link to={`/page/${page.slug}`} target="_blank" className="p-2 bg-white dark:bg-card-dark text-slate-400 rounded-xl border border-border-light dark:border-border-dark hover:text-green-500">
                            <Eye size={16} />
                          </Link>
                          <button onClick={() => {
                            setFormData({ ...page, __isCustomPage: true });
                            setIsEditing(true);
                            setEditingId(page.id);
                            setShowModal(true);
                          }} className="p-2 bg-white dark:bg-card-dark text-slate-400 rounded-xl border border-border-light dark:border-border-dark hover:text-primary">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete('custom_pages', page.id)} className="p-2 bg-white dark:bg-card-dark text-red-400 rounded-xl border border-border-light dark:border-border-dark hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sidebar-menu' && (
            <AdminSidebarManager />
          )}

          {activeTab === 'ai-studio' && (
            <div className="space-y-6">
              {/* AI Global Settings */}
              <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">إعدادات استوديو الذكاء الاصطناعي</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">AI Feature Configuration</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-border-dark">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${aiConfig.enabled ? 'bg-green-500' : 'bg-red-500'} shadow-glow`}></div>
                      <span className="text-sm font-black tracking-tight">{aiConfig.enabled ? 'الميزة مفعلة' : 'الميزة معطلة'}</span>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'settings', 'ai_config'), { ...aiConfig, enabled: !aiConfig.enabled }, { merge: true });
                          toast.success('تم تحديث حالة الميزة');
                        } catch (err) {
                          toast.error('فشل التحديث');
                        }
                      }}
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                        aiConfig.enabled ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {aiConfig.enabled ? 'إيقاف الميزة' : 'تفعيل الميزة'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">عنوان البانر (FanZone)</label>
                      <input 
                        type="text" 
                        value={aiConfig.bannerTitle || ''}
                        onChange={(e) => setAiConfig({ ...aiConfig, bannerTitle: e.target.value })}
                        className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-xs font-bold text-right"
                        placeholder="استوديو المشجع الاتحادي"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">وصف البانر (FanZone)</label>
                      <input 
                        type="text" 
                        value={aiConfig.bannerDescription || ''}
                        onChange={(e) => setAiConfig({ ...aiConfig, bannerDescription: e.target.value })}
                        className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-xs font-bold text-right"
                        placeholder="حول صورتك بالذكاء الاصطناعي..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الحد اليومي للمستخدم (0 = غير محدود)</label>
                      <input 
                        type="number" 
                        value={aiConfig.userDailyLimit !== undefined ? aiConfig.userDailyLimit : 20}
                        onChange={(e) => setAiConfig({ ...aiConfig, userDailyLimit: Number(e.target.value) })}
                        className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-xs font-bold text-right"
                        placeholder="20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">صورة البانر، الشفافية واللوجو</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark space-y-4">
                        <UploadOrUrlField 
                          label="صورة خلفية اعلان منطقة المشجعين" 
                          fieldName="bannerImage" 
                          currentUrl={aiConfig.bannerImage} 
                          formData={aiConfig} 
                          setFormData={setAiConfig} 
                          uploading={uploading} 
                          handleFileUpload={handleFileUpload} 
                        />

                        {/* Background Image Opacity Control */}
                        <div className="pt-2 border-t border-slate-200 dark:border-border-dark space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                              درجة وضوح/شفافية خلفية الإعلان (Opacity)
                            </label>
                            <span className="text-xs font-black text-primary font-mono px-2 py-0.5 rounded bg-primary/10">
                              {aiConfig.bannerOpacity !== undefined ? aiConfig.bannerOpacity : 70}%
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={aiConfig.bannerOpacity !== undefined ? aiConfig.bannerOpacity : 70}
                            onChange={(e) => setAiConfig({ ...aiConfig, bannerOpacity: Number(e.target.value) })}
                            className="w-full accent-primary cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                          />
                          <p className="text-[9px] text-slate-400 font-bold">
                            التحكم في نسبة ظهور صورة الخلفية مع التدرج الداكن لتوضيح النصوص.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark">
                        <UploadOrUrlField 
                          label="لوجو النادي (AI)" 
                          fieldName="clubLogo" 
                          currentUrl={aiConfig.clubLogo} 
                          formData={aiConfig} 
                          setFormData={setAiConfig} 
                          uploading={uploading} 
                          handleFileUpload={handleFileUpload} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                       onClick={async () => {
                         try {
                           await setDoc(doc(db, 'settings', 'ai_config'), { ...aiConfig }, { merge: true });
                           toast.success('تم حفظ الإعدادات بنجاح');
                         } catch (err) {
                           toast.error('فشل حفظ الإعدادات');
                         }
                       }}
                       className="bg-primary text-white px-8 py-3 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      <span>حفظ الإعدادات العامة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quota Monitor */}
              <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm overflow-hidden">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-sm border border-orange-500/20">
                         <Activity size={24} />
                       </div>
                       <div>
                         <h3 className="font-black text-base text-slate-800 dark:text-white">مراقب استهلاك الحصة (Quota)</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">تتجدد الحصة تلقائياً كل 24 ساعة (عند منتصف الليل)</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="bg-slate-100 dark:bg-surface-dark px-4 py-2 rounded-2xl border border-slate-200 dark:border-border-dark text-[11px] font-black text-slate-600 dark:text-slate-300 shadow-inner flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                         {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    {aiUsage.length === 0 ? (
                      <div className="text-center py-16 bg-slate-50 dark:bg-surface-dark rounded-[32px] border border-dashed border-slate-200 dark:border-border-dark">
                        <div className="w-16 h-16 bg-white dark:bg-card-dark rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl text-slate-200 dark:text-slate-700">
                          <Activity size={32} />
                        </div>
                        <h4 className="text-sm font-black text-slate-400">لا توجد عمليات توليد صور حتى الآن</h4>
                        <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">No activities recorded today</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {aiUsage.map((usage: any) => {
                          const userProfile = users.find(u => u.uid === usage.userId);
                          const isAdminMember = userProfile?.role === 'admin';
                          const limit = isAdminMember ? 25 : 5;
                          const percentage = Math.min(100, (usage.count / limit) * 100);
                          
                          return (
                            <div key={usage.id} className="bg-slate-50 dark:bg-surface-dark p-1 rounded-[24px] border border-slate-100 dark:border-border-dark group hover:border-primary/30 transition-all duration-500">
                              <div className="bg-white dark:bg-card-dark rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm group-hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 min-w-0">
                                   <div className="relative shrink-0">
                                     <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden ring-4 ring-slate-50 dark:ring-border-dark group-hover:ring-primary/10 transition-all">
                                       <img src={userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'User')}&background=random`} className="w-full h-full object-cover" />
                                     </div>
                                     {isAdminMember && (
                                       <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white dark:border-card-dark">
                                         <ShieldCheck size={10} />
                                       </div>
                                     )}
                                   </div>
                                   <div className="min-w-0">
                                     <div className="flex items-center gap-2">
                                       <p className="text-xs font-black truncate text-slate-800 dark:text-white">{userProfile?.name || 'مستخدم غير معروف'}</p>
                                       {isAdminMember && <span className="bg-accent/10 text-accent text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Admin</span>}
                                     </div>
                                     <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5 font-mono">{userProfile?.email || usage.userId}</p>
                                   </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:w-48">
                                   <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                      <span className="text-slate-400">الاستهلاك اليومي</span>
                                      <span className={usage.count >= limit ? 'text-red-500' : 'text-primary'}>
                                        {usage.count} / {limit}
                                      </span>
                                   </div>
                                   <div className="h-2 bg-slate-100 dark:bg-surface-dark rounded-full overflow-hidden shadow-inner border border-slate-200/30 dark:border-white/5">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className={`h-full rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-primary to-accent'}`} 
                                      />
                                   </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-40 border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0">
                                   <div className="text-right">
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">آخر عملية</p>
                                     <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                                       {usage.lastUsed ? new Date(usage.lastUsed).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                     </span>
                                   </div>
                                   <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${usage.count >= limit ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-50 text-green-500 border border-green-100'}`}>
                                      {usage.count >= limit ? 'Quota Full' : 'Available'}
                                   </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Member Usage Stats */}
                <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <BarChart3 size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-white">إحصائيات استخدام الأعضاء (اليوم)</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daily Member Usage & Studio Control</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-border-dark">
                          <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">العضو</th>
                          <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الاستخدام</th>
                          <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الحد الأقصى</th>
                          <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">آخر نشاط</th>
                          <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">حالة الوصول</th>
                          <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                        {aiUsage.map((usage: any) => {
                          const user = users.find(u => u.uid === usage.userId);
                          if (!user) return null;
                          const limit = user.role === 'admin' ? 25 : 5;
                          return (
                            <tr key={usage.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3 text-right">
                                  <img src={user.avatar || 'https://ui-avatars.com/api/?name=U'} className="w-8 h-8 rounded-lg object-cover" />
                                  <div>
                                    <p className="text-xs font-black text-slate-800 dark:text-white leading-none mb-1">{user.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter truncate max-w-[120px]">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="text-xs font-black tabular-nums">{usage.count}</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">/ {limit}</span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tabular-nums">
                                  {usage.lastUsed ? new Date(usage.lastUsed).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {user.isBannedFromAI ? (
                                  <span className="text-[9px] font-black text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-md">محظور</span>
                                ) : (
                                  <span className="text-[9px] font-black text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-md">مسموح</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button 
                                  onClick={() => handleToggleAIBan(user)}
                                  className={`p-2 rounded-lg transition-all ${user.isBannedFromAI ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                                  title={user.isBannedFromAI ? "إلغاء حظر الاستوديو" : "حظر من الاستوديو"}
                                >
                                  {user.isBannedFromAI ? <Check size={14} /> : <ShieldAlert size={14} />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {aiUsage.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-20 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">لا يوجد نشاط مسجل اليوم</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Jerseys Management */}
              <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">إدارة قمصان النادي</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Manage AI Jerseys</p>
                    </div>
                  </div>
                  <button 
                    onClick={openAddModal}
                    className="bg-primary text-white p-2 rounded-xl"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {jerseys.map(jersey => (
                    <div key={jersey.id} className="bg-slate-50 dark:bg-surface-dark p-3 rounded-2xl border border-slate-100 dark:border-border-dark flex flex-col gap-3 relative group">
                      <div className="aspect-square rounded-xl overflow-hidden bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark">
                        <img src={jersey.url} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black truncate">{jersey.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(jersey, jersey.id)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={12} /></button>
                          <button onClick={() => handleDelete('jerseys', jersey.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {jerseys.length === 0 && (
                    <div className="col-span-2 py-10 text-center border-2 border-dashed border-slate-100 dark:border-border-dark rounded-3xl text-slate-400 text-xs font-bold">
                       لا توجد قمصان مسجلة حالياً
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8">

              {/* Live Analytics Shortcut Banner */}
              <div 
                onClick={() => setActiveTab('analytics')}
                className="cursor-pointer bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white p-6 rounded-[32px] border border-primary/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xl transition-all group relative overflow-hidden"
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">
                    <Activity className="w-7 h-7 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black animate-pulse">
                        🟢 متزامن لحظياً
                      </span>
                      <span className="text-xs font-bold text-slate-400">تحديثات Firestore الحية</span>
                    </div>
                    <h3 className="font-black text-lg text-white mt-1">مركز الإحصاءات والتحليلات والتفاعل 📊</h3>
                    <p className="text-xs text-slate-300 font-bold">
                      تحليل شامل لمشاركات الجماهير، مشاهدات الأخبار، إعجابات الفان زون، ومبيعات المتجر لحظة بلحظة.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-black shrink-0 transition-all shadow-md group-hover:translate-x-[-4px] relative z-10">
                  <span>فتح لوحة التحليلات المتقدمة</span>
                  <ChevronLeft size={16} />
                </div>
              </div>

              {/* Pending Alert Banner for Businesses */}
              {(businesses.filter(b => b.status === 'pending').length > 0 || businessUpdates.filter(u => u.status === 'pending').length > 0) && (
                <div 
                  onClick={() => setActiveTab('business')}
                  className="cursor-pointer bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-5 rounded-[28px] shadow-lg flex items-center justify-between hover:opacity-95 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-xl">
                      <Building2 className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-base">يوجد طلبات بانتظار المراجعة في "اتحاداوي بيزنس"! 🏢</h4>
                      <p className="text-xs font-bold text-white/90 mt-0.5">
                        هناك {businesses.filter(b => b.status === 'pending').length} مشروع جديد و {businessUpdates.filter(u => u.status === 'pending').length} طلب تعديل بحاجة لموافقتك.
                      </p>
                    </div>
                  </div>
                  <button className="px-5 py-2.5 bg-white text-amber-700 rounded-xl font-black text-xs shadow-md shrink-0 group-hover:bg-amber-50 transition-all">
                    مراجعة الآن
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                 <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark flex flex-col gap-2 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center text-primary mb-2">
                       <UsersIcon size={24} />
                    </div>
                    <span className="text-3xl font-black">{users.length}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">عضو مسجل</span>
                 </div>
                 <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark flex flex-col gap-2 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-500 mb-2">
                       <Newspaper size={24} />
                    </div>
                    <span className="text-3xl font-black">{news.length}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">خبر منشور</span>
                 </div>
                 <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark flex flex-col gap-2 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-orange-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
                       <MessageSquare size={24} />
                    </div>
                    <span className="text-3xl font-black">{fanPosts.length}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">منشور جماهير</span>
                 </div>
                 <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark flex flex-col gap-2 shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="bg-green-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-green-500 mb-2">
                       <BarChart3 size={24} />
                    </div>
                    <span className="text-3xl font-black">{predictions.length}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">توقعات مباريات</span>
                 </div>
                 <div 
                  onClick={() => setActiveTab('business')}
                  className="cursor-pointer bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark flex flex-col gap-2 shadow-sm hover:shadow-xl transition-all duration-300"
                 >
                    <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-emerald-600 mb-2">
                       <Building2 size={24} />
                    </div>
                    <span className="text-3xl font-black">{businesses.length}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">مشروع بيزنس</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-card-dark rounded-[32px] border border-border-light dark:border-border-dark p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-base flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Activity size={18} /></div>
                      النشاط الأخير
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {(([...news, ...media, ...fanPosts] as any[])
                      .sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
                      .slice(0, 5) as any[])
                      .map((item, i) => (
                        <div key={i} className="flex items-center gap-4 pb-4 border-b border-slate-50 dark:border-border-dark last:border-0 last:pb-0">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-surface-dark flex items-center justify-center flex-shrink-0 text-slate-400">
                             {item.title ? <Newspaper size={18} /> : <MessageSquare size={18} />}
                          </div>
                          <div className="flex-1">
                             <p className="text-xs font-black line-clamp-1">{item.title || item.content}</p>
                             <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(item.date || item.createdAt || 0).toLocaleString('ar-EG')}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-card-dark rounded-[32px] border border-border-light dark:border-border-dark p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-base flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><UserPlus size={18} /></div>
                      أحدث الأعضاء
                    </h3>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {users.slice(0, 5).map((u, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="relative">
                          {u.avatar && u.avatar.trim() !== '' ? (
                            <img src={u.avatar} className="w-12 h-12 rounded-2xl border-2 border-white dark:border-border-dark shadow-md group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-300 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-md">
                              <UsersIcon size={20} />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-black truncate w-full text-center text-slate-500 group-hover:text-primary transition-colors">{u.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news-categories' && (
            <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Tags size={20} />
                </div>
                <div>
                   <h3 className="font-black text-sm">أقسام الأخبار</h3>
                   <p className="text-[10px] font-bold text-slate-400">إدارة التصنيفات المتاحة للأخبار</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {newsCategories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-surface-dark px-3 py-2 rounded-xl border border-slate-100 dark:border-border-dark group">
                    <span className="text-xs font-bold">{cat}</span>
                    <button 
                      onClick={() => {
                        const newList = [...newsCategories];
                        const updatedName = prompt('تعديل اسم القسم:', cat);
                        if (updatedName && updatedName.trim() !== '') {
                          newList[i] = updatedName.trim();
                          setDoc(doc(db, 'settings', 'newsCategories'), { list: newList });
                        }
                      }}
                      className="text-blue-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => {
                        const newList = newsCategories.filter((_, idx) => idx !== i);
                        setDoc(doc(db, 'settings', 'newsCategories'), { list: newList });
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  id="new-category"
                  placeholder="اسم القسم الجديد..." 
                  className="flex-1 p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-xs font-bold" 
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('new-category') as HTMLInputElement;
                    if (input.value.trim()) {
                      const newList = [...newsCategories, input.value.trim()];
                      setDoc(doc(db, 'settings', 'newsCategories'), { list: newList });
                      input.value = '';
                    }
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs"
                >
                  إضافة
                </button>
              </div>
            </div>
          )}

          {activeTab === 'news-tags' && (
            <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Tags size={20} />
                </div>
                <div>
                   <h3 className="font-black text-sm">وسوم الأخبار</h3>
                   <p className="text-[10px] font-bold text-slate-400">الوسوم الافتراضية: مباشر, عاجل, رائج, هام، إلخ</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {useAppStore.getState().newsTags?.map((tag, i) => (
                  <div key={tag.id} className="flex items-center gap-2 bg-slate-50 dark:bg-surface-dark px-3 py-2 rounded-xl border border-slate-100 dark:border-border-dark group">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-xs font-bold" style={{ color: tag.color }}>{tag.name}</span>
                    <button 
                      onClick={() => {
                        const tags = [...useAppStore.getState().newsTags];
                        const updatedName = prompt('تعديل اسم الوسم:', tag.name);
                        const updatedColor = prompt('لون الوسم (HEX):', tag.color);
                        if (updatedName && updatedName.trim() !== '') {
                          tags[i] = { ...tag, name: updatedName.trim(), color: updatedColor || tag.color };
                          setDoc(doc(db, 'settings', 'newsTags'), { tags });
                        }
                      }}
                      className="text-blue-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100 mr-2"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا الوسم؟')) {
                          const tags = useAppStore.getState().newsTags.filter((_, idx) => idx !== i);
                          setDoc(doc(db, 'settings', 'newsTags'), { tags });
                        }
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  id="new-tag-color"
                  defaultValue="#3B82F6"
                  className="w-12 h-10 rounded-xl cursor-pointer"
                />
                <input 
                  type="text" 
                  id="new-tag-name"
                  placeholder="اسم الوسم الجديد..." 
                  className="flex-1 p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-xs font-bold" 
                />
                <button 
                  onClick={() => {
                    const nameInput = document.getElementById('new-tag-name') as HTMLInputElement;
                    const colorInput = document.getElementById('new-tag-color') as HTMLInputElement;
                    if (nameInput.value.trim()) {
                      const tags = [...(useAppStore.getState().newsTags || [])];
                      tags.push({ id: uuidv4(), name: nameInput.value.trim(), color: colorInput.value });
                      setDoc(doc(db, 'settings', 'newsTags'), { tags });
                      nameInput.value = '';
                    }
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs"
                >
                  إضافة
                </button>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button onClick={openAddModal} className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-[11px] flex items-center gap-2 pressable">
                  <Plus size={14} /> منتج جديد
                </button>
                <div className="text-right">
                   <h3 className="text-xs font-black">إدارة المخزن</h3>
                   <p className="text-[10px] text-slate-400 font-bold">إضافة وتعديل منتجات متجر الجماهير</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {products.map(product => (
                  <div key={product.id} className="bg-white dark:bg-card-dark p-3 rounded-2xl border border-border-light dark:border-border-dark flex items-center gap-4">
                    {product.imageUrl && product.imageUrl.trim() !== '' ? (
                      <img src={product.imageUrl} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                        <ShoppingCart size={24} className="text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 text-right">
                       <h4 className="text-xs font-black">{product.name}</h4>
                       <p className="text-[10px] text-primary font-bold tabular-nums mt-0.5">{product.price} ج.م</p>
                       <span className="text-[9px] bg-slate-100 dark:bg-surface-dark px-2 py-0.5 rounded-lg text-slate-500 font-bold">{product.category}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(product, product.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete('products', product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="flex flex-col gap-6">
               <div className="flex items-center justify-between px-2">
                 <div className="flex flex-col text-right">
                   <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">سجل المشتريات</h3>
                 </div>
                 <div className="bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-2xl border border-primary/20 text-primary flex items-center gap-2">
                   <ShoppingCart size={18} />
                   <span className="text-sm font-black tabular-nums">{orders.length}</span>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {orders.map(order => (
                   <div key={order.id} className="relative bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark shadow-premium hover:shadow-2xl transition-all overflow-hidden group text-right">
                     <div className="flex items-center justify-between border-b border-slate-50 dark:border-border-dark pb-3 mb-4">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                          order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-600' : 
                          order.status === 'ready' ? 'bg-purple-100 text-purple-600' : 
                          order.status === 'sold' ? 'bg-green-100 text-green-600' : 
                          order.status === 'delivered' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.status === 'pending' ? 'تحت التحضير' : 
                           order.status === 'processing' ? 'جاري التنفيذ' :
                           order.status === 'ready' ? 'جاهز' : 
                           order.status === 'sold' ? 'تم البيع' : 
                           order.status === 'delivered' ? 'تم الاستلام' : 'جاري التنفيذ'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">{new Date(order.createdAt).toLocaleString('ar-EG')}</span>
                     </div>

                     <div className="flex gap-4 items-start mb-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark">
                           {order.productImage && order.productImage.trim() !== '' ? (
                             <img src={order.productImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                             <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                               <ShoppingCart size={20} className="text-slate-300" />
                             </div>
                           )}
                        </div>
                        <div className="flex-1 space-y-2">
                           <div className="flex justify-between items-start">
                              <p className="text-xs font-black text-slate-800 dark:text-white">{order.productName}</p>
                              <div className="text-left">
                                 <p className="text-[10px] text-primary font-bold tabular-nums">الإجمالي: {order.totalPrice} ج.م</p>
                                 <p className="text-[9px] text-slate-500 font-bold">الكمية: {order.quantity || 1}</p>
                              </div>
                           </div>
                           
                           <div className="bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark p-3 rounded-2xl space-y-2 group-hover:bg-white dark:group-hover:bg-card-dark transition-colors">
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <UsersIcon size={12} />
                                 </div>
                                 <p className="text-[10px] font-black text-slate-800 dark:text-white">{order.userName}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Phone size={12} />
                                 </div>
                                 <p className="text-[10px] text-slate-500 font-bold tabular-nums">{order.userPhone}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <AtSign size={12} />
                                 </div>
                                 <p className="text-[9px] text-slate-400 font-bold">{order.userEmail}</p>
                              </div>
                              <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-border-dark">
                                 <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                    <MapPin size={12} />
                                 </div>
                                 <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                    📍 {order.userAddress}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <select 
                          className="flex-1 p-2 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-[10px] font-black outline-none appearance-none"
                          value={order.status}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, 'orders', order.id), { status: e.target.value as any });
                              toast.success('تم تحديث الحالة بنجاح');
                            } catch (err) {
                              console.error(err);
                              toast.error('فشل تحديث الحالة');
                            }
                          }}
                        >
                          <option value="pending">تحت التحضير</option>
                          <option value="processing">جاري التنفيذ</option>
                          <option value="ready">جاهز</option>
                          <option value="delivered">تم الاستلام</option>
                          <option value="sold">تم البيع</option>
                        </select>
                        <button 
                          onClick={() => handleDelete('orders', order.id)} 
                          className="px-4 text-red-500 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                   </div>
                 ))}
                 {orders.length === 0 && (
                   <div className="py-20 text-center text-slate-400 font-bold text-sm">لا توجد طلبات شراء حالياً</div>
                 )}
               </div>
            </div>
          )}

          {/* Content Search Bar for applicable tabs */}
          {['news', 'media', 'matches', 'products', 'books', 'music'].includes(activeTab) && (
            <div className="mb-6">
               <div className="relative group">
                  <div className="absolute inset-y-0 right-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                     <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="ابحث في المحتوى..." 
                    className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-border-dark text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                  />
                  {contentSearch && (
                    <button 
                      onClick={() => setContentSearch('')} 
                      className="absolute inset-y-0 left-4 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-6">
              {/* Type filter tabs for Admin News */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark w-fit">
                <button
                  type="button"
                  onClick={() => setNewsFilterType('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    newsFilterType === 'all'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                  }`}
                >
                  الكل ({news.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterType('news')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    newsFilterType === 'news'
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                  }`}
                >
                  <Newspaper size={14} />
                  <span>الأخبار ({news.filter(n => n.newsType !== 'article').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewsFilterType('article')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    newsFilterType === 'article'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <PenTool size={13} />
                  <span>المقالات ({news.filter(n => n.newsType === 'article').length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {news.filter(item => {
                  if (newsFilterType === 'news' && item.newsType === 'article') return false;
                  if (newsFilterType === 'article' && item.newsType !== 'article') return false;
                  if (contentSearch && contentSearch.trim() !== '') {
                    const q = contentSearch.toLowerCase();
                    return item.title?.toLowerCase().includes(q) || 
                           item.content?.toLowerCase().includes(q) ||
                           item.category?.toLowerCase().includes(q) ||
                           item.author?.toLowerCase().includes(q) ||
                           item.editorName?.toLowerCase().includes(q);
                  }
                  return true;
                }).map((item) => (
                  <div key={item.id} className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                          <div className="relative overflow-hidden rounded-2xl shrink-0">
                            {item.image && item.image.trim() !== '' ? (
                              <img src={item.image} alt="" className="w-20 h-20 object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-20 h-20 bg-slate-100 dark:bg-surface-dark flex items-center justify-center">
                                {item.newsType === 'article' ? <PenTool size={28} className="text-amber-400" /> : <Newspaper size={32} className="text-slate-300" />}
                              </div>
                            )}
                          </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                           {item.newsType === 'article' ? (
                             <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-black shrink-0 border border-amber-500/20">
                               <PenTool size={10} />
                               <span>مقال</span>
                             </span>
                           ) : (
                             <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-black shrink-0 border border-primary/20">
                               <Newspaper size={10} />
                               <span>خبر</span>
                             </span>
                           )}

                           <h3 className="font-black text-base line-clamp-2 leading-tight text-slate-800 dark:text-white">{item.title}</h3>
                           
                           {item.videoUrl && (
                             <div className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[10px] font-black shrink-0 border border-red-500/20">
                               <Play size={10} className="fill-current" />
                               <span>فيديو</span>
                             </div>
                           )}
                           {item.type === 'rss' && <div className="bg-orange-500/10 text-orange-500 p-1 rounded-lg"><Rss size={12} /></div>}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(item.date).toLocaleDateString('ar-EG')}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-surface-dark text-slate-500 rounded-lg">{item.category || 'أخبار'}</span>
                          {(item.author || item.editorName) && (
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {item.newsType === 'article' ? `بقلم: ${item.author || item.editorName}` : (item.editorName || item.author)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditNews(item)} className="p-3 text-blue-500 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete('news', item.id)} className="p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="flex flex-col gap-6">
              {/* Sub Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl w-fit">
                  <button 
                    onClick={() => setMediaSubTab('items')} 
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${mediaSubTab === 'items' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    الميديا ({media.length})
                  </button>
                  <button 
                    onClick={() => setMediaSubTab('playlists')} 
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${mediaSubTab === 'playlists' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    قوائم التشغيل ({mediaPlaylists.length})
                  </button>
                  <button 
                    onClick={() => setMediaSubTab('banner')} 
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${mediaSubTab === 'banner' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    خلفية البانر
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setIsCsvVideosImporterOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/20"
                  >
                    <FileSpreadsheet size={14} />
                    <span>رفع فيديوهات CSV (بالجملة) 📁</span>
                  </button>
                </div>
              </div>

              {mediaSubTab === 'items' && (
                <div className="grid grid-cols-1 gap-4">
                  {media.filter(item => 
                    item.title.toLowerCase().includes(contentSearch.toLowerCase())
                  ).map((item) => (
                    <div key={item.id} className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                          {item.thumbnailUrl && item.thumbnailUrl.trim() !== '' ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                              <PlayCircle size={32} className="text-slate-300" />
                            </div>
                          )}
                          {item.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <PlayCircle size={20} className="text-white drop-shadow-lg" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-sm line-clamp-1 leading-tight text-slate-800 dark:text-white mb-1">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-surface-dark text-slate-500 rounded-lg">
                              {item.type === 'video' ? 'فيديو' : 'صورة'}
                            </span>
                            {item.isFeatured && (
                              <span className="text-[10px] font-black px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center gap-1 border border-amber-500/20">
                                <Sparkles size={10} className="fill-amber-500 text-amber-500" />
                                <span>مميز</span>
                              </span>
                            )}
                            {item.playlistId && (
                               <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-lg">
                                  <Layers size={10} className="shrink-0" />
                                  <span className="text-[10px] font-black truncate max-w-[120px]">
                                     {mediaPlaylists.find(p => p.id === item.playlistId)?.title || 'قائمة غير موجودة'}
                                  </span>
                               </div>
                            )}
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(item.date).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => toggleFeaturedMedia(item)} 
                            title={item.isFeatured ? "إلغاء التمييز" : "تعيين كعنصر مميز"}
                            className={`p-2.5 rounded-2xl transition-all ${
                              item.isFeatured 
                                ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' 
                                : 'text-slate-400 bg-slate-100 dark:bg-surface-dark hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                            }`}
                          >
                            <Sparkles size={16} className={item.isFeatured ? 'fill-amber-500' : ''} />
                          </button>
                          <button 
                            onClick={() => handleEditItem(item)} 
                            className="p-2.5 text-blue-500 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete('media', item.id)} 
                            className="p-2.5 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mediaSubTab === 'playlists' && (
                <div className="grid grid-cols-1 gap-4">
                  {mediaPlaylists.filter(p => 
                    p.title.toLowerCase().includes(contentSearch.toLowerCase())
                  ).map((playlist) => (
                    <div key={playlist.id} className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 flex items-center gap-4 shadow-sm hover:shadow-xl transition-all">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                          <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       </div>
                       <div className="flex-1">
                          <h3 className="font-black text-sm text-slate-800 dark:text-white mb-1">{playlist.title}</h3>
                          <div className="flex items-center gap-2 mb-1">
                             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${playlist.type === 'video' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                {playlist.type === 'video' ? 'فيديو' : 'صور'}
                             </span>
                             <p className="text-[10px] text-slate-400 font-bold line-clamp-1">{playlist.description || 'لا يوجد وصف'}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                                {media.filter(m => m.playlistId === playlist.id).length} عنصر
                             </span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEditItem(playlist)} 
                            className="p-2.5 text-blue-500 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete('media_playlists', playlist.id)} 
                            className="p-2.5 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
              )}

              {mediaSubTab === 'banner' && (
                <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-6 shadow-sm flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">خلفية بانر مكتبة الوسائط الرقمية</h3>
                    <p className="text-xs text-slate-500 font-bold">يمكنك رفع صورة خلفية مخصصة للبانر العلوي في صفحة المكتبة الرقمية (أغاني، صور، فيديوهات، كتب)</p>
                  </div>

                  <UploadOrUrlField 
                    label="صورة خلفية البانر" 
                    fieldName="libraryBanner" 
                    currentUrl={formData.libraryBanner !== undefined ? formData.libraryBanner : (appSettings.libraryBanner || '')} 
                    formData={formData} 
                    setFormData={setFormData}
                    uploading={uploading} 
                    handleFileUpload={handleFileUpload} 
                  />

                  {/* Banner Live Preview */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black text-slate-500">معاينة مباشرة للبانر:</span>
                    <div className="relative h-48 md:h-56 rounded-3xl overflow-hidden bg-primary shadow-inner border border-border-light dark:border-border-dark">
                      {(formData.libraryBanner || appSettings.libraryBanner) ? (
                        <>
                          <img 
                            src={formData.libraryBanner ?? appSettings.libraryBanner} 
                            alt="Banner Preview" 
                            className="absolute inset-0 w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-black/40"></div>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-emerald-700 opacity-95"></div>
                          <div className="absolute inset-0 bg-gradient-to-tr from-[#023823]/90 via-primary-dark/80 to-[#045536]/80"></div>
                        </>
                      )}
                      <div className="relative z-10 h-full flex flex-col justify-end p-6">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30 w-fit mb-1">
                          المحتوى الرقمي الشامل
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-white">المكتبة الرقمية والوسائط</h2>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button 
                      onClick={async () => {
                        const payload = {
                          ...appSettings,
                          libraryBanner: formData.libraryBanner !== undefined ? formData.libraryBanner : (appSettings.libraryBanner || '')
                        };
                        try {
                          await setDoc(doc(db, 'settings', 'global'), payload);
                          const { setSettings } = useAppStore.getState();
                          setSettings(payload);
                          toast.success('تم حفظ خلفية بانر المكتبة بنجاح');
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                        }
                      }} 
                      disabled={loading}
                      className="flex-1 bg-primary text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.01] transition-all"
                    >
                      {loading && <Loader2 className="animate-spin" size={18} />}
                      حفظ خلفية البانر
                    </button>

                    {(formData.libraryBanner || appSettings.libraryBanner) && (
                      <button 
                        type="button"
                        onClick={async () => {
                          setFormData({ ...formData, libraryBanner: '' });
                          const payload = { ...appSettings, libraryBanner: '' };
                          try {
                            await setDoc(doc(db, 'settings', 'global'), payload);
                            const { setSettings } = useAppStore.getState();
                            setSettings(payload);
                            toast.success('تم إزالة الصورة واستعادة الخلفية الافتراضية');
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, 'settings/global');
                          }
                        }}
                        className="px-4 py-3.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-2xl font-black text-sm transition-colors"
                      >
                        إعادة للافتراضي
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'club_members' && (
            <div className="flex flex-col gap-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-emerald-900 via-primary to-primary-dark p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={24} className="text-amber-300" />
                    <h2 className="text-xl font-black">إدارة قسم أعضاء النادي</h2>
                  </div>
                  <p className="text-xs font-medium text-amber-200/90">إدارة اللجان العاملة، لوحة الإعلانات الرقمية، ودليل الخدمات الحكومية والاجتماعية للأعضاء</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {clubSubTab !== 'settings' && (
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingId(null);
                        setFormData(
                          clubSubTab === 'committees' ? { status: 'active', order: (committeesList.length || 0) + 1 } :
                          clubSubTab === 'announcements' ? { priority: 'normal', active: true, pinned: false } :
                          clubSubTab === 'services' ? { active: true, order: (servicesList.length || 0) + 1 } :
                          { status: 'upcoming', active: true, priceMember: 0, priceNonMember: 0, order: (tripsList.length || 0) + 1 }
                        );
                        setShowModal(true);
                      }}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-900 px-5 py-3 rounded-2xl text-xs font-black shadow-md flex items-center gap-2 transition-transform active:scale-95 shrink-0"
                    >
                      <Plus size={16} />
                      <span>إضافة {clubSubTab === 'committees' ? 'لجنة جديدة' : clubSubTab === 'announcements' ? 'إعلان جديد' : clubSubTab === 'services' ? 'خدمة جديدة' : 'رحلة جديدة'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="flex items-center gap-2 bg-white dark:bg-card-dark p-1.5 rounded-2xl border border-border-light dark:border-border-dark w-fit flex-wrap">
                {[
                  { id: 'committees', label: 'اللجان العاملة', count: committeesList.length },
                  { id: 'announcements', label: 'لوحة الإعلانات', count: announcementsList.length },
                  { id: 'services', label: 'دليل الخدمات', count: servicesList.length },
                  { id: 'trips', label: 'رحلات النادي', count: tripsList.length },
                  { id: 'settings', label: 'إعدادات قسم الأعضاء', count: null },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setClubSubTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                      clubSubTab === tab.id 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-primary'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${clubSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-surface-dark text-slate-500'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* TAB 1: COMMITTEES LIST */}
              {clubSubTab === 'committees' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {committeesList.map((comm) => (
                    <div key={comm.id} className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <h3 className="font-black text-sm text-slate-800 dark:text-white">{comm.name}</h3>
                          </div>
                          {comm.president && <p className="text-[11px] font-bold text-primary">رئيس اللجنة: {comm.president}</p>}
                          {comm.vicePresident && <p className="text-[11px] font-medium text-slate-500">نائب رئيس اللجنة: {comm.vicePresident}</p>}
                          <p className="text-xs text-slate-500 line-clamp-2">{comm.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditingId(comm.id);
                              setFormData({ ...comm });
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete('club_committees', comm.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {comm.image && (
                        <div className="h-24 rounded-xl overflow-hidden bg-slate-100">
                          <img src={comm.image} alt={comm.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  ))}
                  {committeesList.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark">
                      لا توجد لجان مسجلة حالياً
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ANNOUNCEMENTS LIST */}
              {clubSubTab === 'announcements' && (
                <div className="space-y-3">
                  {announcementsList.map((ann) => (
                    <div key={ann.id} className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {ann.priority === 'urgent' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-red-500 text-white">🚨 عاجل</span>}
                          {ann.priority === 'important' && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-600">⭐ هام</span>}
                          {ann.pinned && <span className="px-2 py-0.5 rounded text-[9px] font-black bg-primary/10 text-primary">📌 مثبت</span>}
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(ann.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-white">{ann.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2">{ann.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setEditingId(ann.id);
                            setFormData({ ...ann });
                            setShowModal(true);
                          }}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete('club_announcements', ann.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {announcementsList.length === 0 && (
                    <div className="py-12 text-center text-slate-400 font-bold bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark">
                      لا توجد إعلانات مسجلة حالياً
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SERVICES LIST */}
              {clubSubTab === 'services' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {servicesList.map((serv) => (
                    <div key={serv.id} className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-primary/10 text-primary">{serv.category}</span>
                          <h3 className="font-black text-sm text-slate-800 dark:text-white">{serv.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditingId(serv.id);
                              setFormData({ ...serv });
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete('club_services', serv.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{serv.description}</p>
                      <div className="text-[11px] font-semibold text-slate-400 space-y-1 border-t border-slate-100 dark:border-border-dark pt-2">
                        <div>📍 {serv.location}</div>
                        <div>⏰ {serv.workingHours}</div>
                        {serv.phone && <div>📞 {serv.phone}</div>}
                      </div>
                    </div>
                  ))}
                  {servicesList.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark">
                      لا توجد خدمات مسجلة حالياً
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TRIPS LIST */}
              {clubSubTab === 'trips' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tripsList.map((trip) => (
                    <div key={trip.id} className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark shadow-sm space-y-3">
                      {trip.image && (
                        <div className="h-32 rounded-xl overflow-hidden bg-slate-100">
                          <img src={trip.image} alt={trip.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              trip.status === 'upcoming' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                              trip.status === 'ongoing' ? 'bg-amber-500/10 text-amber-600' :
                              trip.status === 'completed' ? 'bg-slate-200 text-slate-600' : 'bg-red-500/10 text-red-600'
                            }`}>
                              {trip.status === 'upcoming' ? '🚌 متاحة للحجز' : trip.status === 'ongoing' ? '⏳ جارية حالياً' : trip.status === 'completed' ? '✅ منتهية' : '❌ ملغاة'}
                            </span>
                            {trip.destination && <span className="text-[10px] font-bold text-slate-400">📍 {trip.destination}</span>}
                          </div>
                          <h3 className="font-black text-sm text-slate-800 dark:text-white">{trip.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditingId(trip.id);
                              setFormData({ ...trip });
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete('club_trips', trip.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{trip.description}</p>
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 dark:bg-surface-dark rounded-xl text-xs font-bold border border-slate-100 dark:border-border-dark">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-normal">سعر العضو</span>
                          <span className="text-primary font-black">{trip.priceMember} ج.م</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-normal">سعر المرافق</span>
                          <span className="text-slate-700 dark:text-slate-200 font-black">{trip.priceNonMember} ج.م</span>
                        </div>
                      </div>
                      {(trip.startDate || trip.endDate) && (
                        <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between pt-1">
                          <span>📅 {trip.startDate} {trip.endDate ? `إلى ${trip.endDate}` : ''}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {tripsList.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark">
                      لا توجد رحلات مسجلة حالياً
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SETTINGS FORM */}
              {clubSubTab === 'settings' && (
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-border-light dark:border-border-dark shadow-sm space-y-4 max-w-xl">
                  <h3 className="font-black text-base text-slate-800 dark:text-white">إعدادات قسم الأعضاء الترحيبية والتواصل</h3>
                  
                  <div>
                    <label className="text-xs font-black text-slate-500 mb-1 block">رقم الخط الساخن / الهاتف</label>
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-sm font-bold"
                      value={formData.phoneHotline !== undefined ? formData.phoneHotline : (clubMembersSettings?.phoneHotline || '1914 / 03-4802201')}
                      onChange={(e) => setFormData({ ...formData, phoneHotline: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 mb-1 block">ساعات ومواعيد العمل الرسمية</label>
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-sm font-bold"
                      value={formData.workingHours !== undefined ? formData.workingHours : (clubMembersSettings?.workingHours || 'يومياً من ٩ صباحاً حتى ١٠ مساءً')}
                      onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 mb-1 block">الرسالة الترحيبية / التنويه الرئيسي للرأسية</label>
                    <textarea
                      className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark text-sm min-h-[90px]"
                      value={formData.memberNotice !== undefined ? formData.memberNotice : (clubMembersSettings?.memberNotice || 'مرحباً بأعضاء نادي الاتحاد السكندري - نعتز بملاحظتكم وخدمتكم عبر بوابتنا الرقمية')}
                      onChange={(e) => setFormData({ ...formData, memberNotice: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const payload = {
                        phoneHotline: formData.phoneHotline !== undefined ? formData.phoneHotline : (clubMembersSettings?.phoneHotline || '1914 / 03-4802201'),
                        workingHours: formData.workingHours !== undefined ? formData.workingHours : (clubMembersSettings?.workingHours || 'يومياً من ٩ صباحاً حتى ١٠ مساءً'),
                        memberNotice: formData.memberNotice !== undefined ? formData.memberNotice : (clubMembersSettings?.memberNotice || 'مرحباً بأعضاء نادي الاتحاد السكندري - نعتز بملاحظتكم وخدمتكم عبر بوابتنا الرقمية'),
                        updatedAt: new Date().toISOString()
                      };
                      try {
                        await setDoc(doc(db, 'club_members_settings', 'main'), payload);
                        toast.success('تم حفظ إعدادات قسم الأعضاء بنجاح');
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, 'club_members_settings/main');
                      }
                    }}
                    className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="flex flex-col gap-3">
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm shadow-emerald-600/30">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">إضافة جدول المباريات بالجملة (CSV)</h3>
                    <p className="text-xs font-bold text-slate-500">رفع ملف CSV لإضافة وإدراج عدة مباريات دفعة واحدة في جدول القناة</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCsvImporterOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm shrink-0 hover:scale-105 transition-all active:scale-95"
                >
                  رفع ملف CSV
                </button>
              </div>
              {matches.filter(item => 
                item.homeTeam.toLowerCase().includes(contentSearch.toLowerCase()) || 
                item.awayTeam.toLowerCase().includes(contentSearch.toLowerCase()) ||
                item.competition?.toLowerCase().includes(contentSearch.toLowerCase())
              ).map((item) => (
                <div key={item.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex flex-col gap-2">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-right whitespace-nowrap">{item.homeTeam} × {item.awayTeam}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold text-right ${item.status === 'live' ? 'text-red-500' : 'text-slate-500'}`}>
                        {item.status === 'live' ? 'مباشر' : item.status === 'finished' ? 'منتهية' : 'قادمة'}
                      </span>
                      {item.isMatchDay && (
                        <span className="text-[10px] font-black bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Match Day</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black ml-1">{item.homeScore} - {item.awayScore}</span>
                  {item.status === 'live' && (
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-surface-dark px-2 py-1 rounded-lg border border-border-light dark:border-border-dark">
                      <span className="text-[10px] font-black tabular-nums">
                        {item.sport === 'basketball' ? `${calculateCurrentMinute(item)}:00 (تنازلي)` : `${calculateCurrentMinute(item)}'`}
                      </span>
                      <button 
                        onClick={() => handleTimerAction(item.isTimerRunning ? 'pause' : 'start', item)}
                        className={`p-1 rounded-md transition-colors ${item.isTimerRunning ? 'text-orange-500 bg-orange-50' : 'text-green-500 bg-green-50'}`}
                      >
                        {item.isTimerRunning ? <X size={12} /> : <PlayCircle size={12} />}
                      </button>
                      <button 
                        onClick={() => handleTimerAction('reset', item)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={async () => {
                        const newId = featuredMatchId === item.id ? null : item.id;
                        await setDoc(doc(db, 'settings', 'featured_match'), { matchId: newId });
                        toast.success(newId ? 'تم تمييز المباراة في الصفحة الرئيسية' : 'تم إلغاء تمييز المباراة');
                      }}
                      className={`p-1.5 rounded-lg transition-all ${featuredMatchId === item.id ? 'text-yellow-500 bg-yellow-50' : 'text-slate-400 hover:text-yellow-500'}`}
                    >
                      <Star size={16} fill={featuredMatchId === item.id ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => handleEditMatch(item)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete('matches', item.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
          )}

          {activeTab === 'posts' && (
            <div className="flex flex-col gap-3">
              {fanPosts.map((post) => (
                <div key={post.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                  {post.userAvatar && post.userAvatar.trim() !== '' ? (
                    <img src={post.userAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UsersIcon size={14} className="text-slate-400" />
                  )}
                </div>
                      <div>
                        <p className="text-xs font-black">{post.userName}</p>
                        <p className="text-[9px] text-slate-400 font-bold">
                          {(() => {
                            if (!post.createdAt) return 'منذ فترة';
                            const createdAny = post.createdAt as any;
                            const d = createdAny.seconds ? new Date(createdAny.seconds * 1000) : new Date(createdAny);
                            return isNaN(d.getTime()) ? 'منذ فترة' : d.toLocaleString('ar-EG');
                          })()}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete('fan_posts', post.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">{post.content}</p>
                  {post.image && post.image.trim() !== '' && (
                    <img src={post.image} className="w-full h-32 object-cover rounded-lg border border-border-light dark:border-border-dark" referrerPolicy="no-referrer" />
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-border-dark">
                    <span className="text-[10px] font-black text-slate-500">إعجابات: {post.likes || 0}</span>
                  </div>
                </div>
              ))}
              {fanPosts.length === 0 && <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 dark:border-border-dark text-slate-400 font-bold text-sm">لا توجد منشورات جماهير</div>}
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="flex flex-col gap-3">
              {predictions.map((p) => {
                const match = matches.find(m => m.id === p.matchId);
                const isMatchFinished = match?.status === 'finished';
                const isCorrect = isMatchFinished && 
                                Number(match.homeScore) === Number(p.homeScore) && 
                                Number(match.awayScore) === Number(p.awayScore);
                
                return (
                  <div key={p.id} className={`bg-white dark:bg-card-dark rounded-xl border ${isCorrect ? 'border-green-500 shadow-green-100' : 'border-border-light dark:border-border-dark shadow-sm'} p-3 flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full w-fit">{p.userName}</span>
                          {isMatchFinished && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {isCorrect ? <Check size={8} /> : <X size={8} />}
                              {isCorrect ? 'توقع صحيح' : 'توقع خاطئ'}
                            </span>
                          )}
                        </div>
                        <span className="text-[8px] text-slate-400 font-bold mt-1">{p.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditItem(p)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete('predictions', p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-surface-dark p-2 rounded-lg">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{match?.homeTeam || 'فريق غير معروف'}</span>
                      <div className="flex items-center gap-2">
                         <div className="flex flex-col items-center">
                           <span className="text-[8px] text-slate-400 mb-0.5">توقعه</span>
                           <span className={`w-6 h-6 flex items-center justify-center bg-white dark:bg-card-dark border ${isCorrect ? 'border-green-200 text-green-600' : 'border-border-light dark:border-border-dark'} rounded font-black text-sm`}>{p.homeScore}</span>
                         </div>
                         <span className="text-xs text-slate-400 font-black">-</span>
                         <div className="flex flex-col items-center">
                           <span className="text-[8px] text-slate-400 mb-0.5">توقعه</span>
                           <span className={`w-6 h-6 flex items-center justify-center bg-white dark:bg-card-dark border ${isCorrect ? 'border-green-200 text-green-600' : 'border-border-light dark:border-border-dark'} rounded font-black text-sm`}>{p.awayScore}</span>
                         </div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{match?.awayTeam || 'فريق غير معروف'}</span>
                    </div>
                    {isMatchFinished && (
                      <div className="text-center px-2 py-1 bg-slate-100/50 dark:bg-surface-dark/50 rounded-md flex items-center justify-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase">النتيجة الحقيقية:</span>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{match.homeScore} - {match.awayScore}</span>
                      </div>
                    )}
                    <p className="text-[8px] text-slate-400 text-left font-bold">{p.createdAt ? new Date(p.createdAt).toLocaleString('ar-EG') : ''}</p>
                  </div>
                );
              })}
              {predictions.length === 0 && <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 dark:border-border-dark text-slate-400 font-bold text-sm">لا توجد توقعات بعد</div>}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-card-dark p-4 rounded-3xl border border-border-light dark:border-border-dark shadow-sm">
                <div>
                  <h3 className="font-black text-sm text-slate-800 dark:text-white">إدارة أعضاء وحسابات التطبيق</h3>
                  <p className="text-xs text-slate-400 font-bold">مزامنة الأعضاء المسجلين والتحكم بالصلاحيات والرتب</p>
                </div>
                <button
                  onClick={() => handleSyncUsers(true)}
                  disabled={syncingUsers}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={syncingUsers ? 'animate-spin' : ''} />
                  <span>{syncingUsers ? 'جاري المزامنة والتحديث...' : 'تحديث ومزامنة الأعضاء'}</span>
                </button>
              </div>

              {/* Statistics & Classification Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                 <button
                   type="button"
                   onClick={() => setUserRoleFilter('all')}
                   className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${userRoleFilter === 'all' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-slate-300'}`}
                 >
                    <div>
                       <p className={`text-[10px] font-bold uppercase ${userRoleFilter === 'all' ? 'text-white/80' : 'text-slate-400'}`}>الكل</p>
                       <h4 className="text-xl font-black">{users.length}</h4>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userRoleFilter === 'all' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                      <UsersIcon size={20} />
                    </div>
                 </button>

                 <button
                   type="button"
                   onClick={() => setUserRoleFilter('admin')}
                   className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${userRoleFilter === 'admin' ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20 scale-[1.02]' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-slate-300'}`}
                 >
                    <div>
                       <p className={`text-[10px] font-bold uppercase ${userRoleFilter === 'admin' ? 'text-white/80' : 'text-slate-400'}`}>المديرون</p>
                       <h4 className="text-xl font-black">{users.filter(u => u.role === 'admin' || (u.roles && u.roles.includes('admin'))).length}</h4>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userRoleFilter === 'admin' ? 'bg-white/20 text-white' : 'bg-red-500/10 text-red-500'}`}>
                      <Shield size={20} />
                    </div>
                 </button>

                 <button
                   type="button"
                   onClick={() => setUserRoleFilter('moderator')}
                   className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${userRoleFilter === 'moderator' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20 scale-[1.02]' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-slate-300'}`}
                 >
                    <div>
                       <p className={`text-[10px] font-bold uppercase ${userRoleFilter === 'moderator' ? 'text-white/80' : 'text-slate-400'}`}>المشرفون</p>
                       <h4 className="text-xl font-black">{users.filter(u => (u.role === 'moderator' || (u.roles && u.roles.length > 0 && !u.roles.includes('admin') && u.role !== 'writer')) && u.role !== 'admin').length}</h4>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userRoleFilter === 'moderator' ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                      <ShieldCheck size={20} />
                    </div>
                 </button>

                 <button
                   type="button"
                   onClick={() => setUserRoleFilter('writer')}
                   className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${userRoleFilter === 'writer' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 scale-[1.02]' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-slate-300'}`}
                 >
                    <div>
                       <p className={`text-[10px] font-bold uppercase ${userRoleFilter === 'writer' ? 'text-white/80' : 'text-slate-400'}`}>المحررون</p>
                       <h4 className="text-xl font-black">{users.filter(u => u.role === 'writer' || (u.roles && u.roles.includes('news_editor') && u.role !== 'admin')).length}</h4>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userRoleFilter === 'writer' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                      <Newspaper size={20} />
                    </div>
                 </button>

                 <button
                   type="button"
                   onClick={() => setUserRoleFilter('user')}
                   className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${userRoleFilter === 'user' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 scale-[1.02]' : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-slate-300'}`}
                 >
                    <div>
                       <p className={`text-[10px] font-bold uppercase ${userRoleFilter === 'user' ? 'text-white/80' : 'text-slate-400'}`}>الأعضاء العاديون</p>
                       <h4 className="text-xl font-black">{users.filter(u => (!u.role || u.role === 'user') && (!u.roles || u.roles.length === 0)).length}</h4>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${userRoleFilter === 'user' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      <UsersIcon size={20} />
                    </div>
                 </button>
              </div>

              {/* Search & Sub-Filter Bar */}
              <div className="bg-white dark:bg-card-dark p-4 rounded-3xl border border-border-light dark:border-border-dark shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 right-4 flex items-center text-slate-400"><Search size={18} /></div>
                    <input 
                      type="text" 
                      placeholder="ابحث عن عضو بالإسم أو البريد الإلكتروني أو الصلاحية..." 
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark text-sm font-bold focus:border-primary outline-none transition-all"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                    {userSearch && (
                      <button onClick={() => setUserSearch('')} className="absolute inset-y-0 left-4 flex items-center text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    )}
                 </div>

                 <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <span className="text-xs font-black text-slate-400 shrink-0">الرتبة:</span>
                    <select
                      value={userTierFilter}
                      onChange={(e) => setUserTierFilter(e.target.value)}
                      className="px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark text-xs font-bold text-slate-700 dark:text-white outline-none shrink-0 cursor-pointer"
                    >
                      <option value="all">جميع الرتب (Tiers)</option>
                      <option value="premium">عضو ملكي 👑 (Premium)</option>
                      <option value="diamond">عضو ماسي 💎 (Diamond)</option>
                      <option value="gold">عضو ذهبي 🥇 (Gold)</option>
                      <option value="silver">عضو فضي 🥈 (Silver)</option>
                      <option value="bronze">عضو برونزي 🥉 (Bronze)</option>
                      <option value="new">عضو جديد (New)</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {users
                  .filter(u => {
                    const searchLower = userSearch.toLowerCase();
                    const nameMatch = (u.name || '').toLowerCase().includes(searchLower);
                    const emailMatch = (u.email || '').toLowerCase().includes(searchLower);
                    const roleMatch = (u.roles || []).some((r: string) => r.toLowerCase().includes(searchLower));
                    const matchesSearch = nameMatch || emailMatch || roleMatch;

                    // Role Filter
                    let matchesRole = true;
                    if (userRoleFilter === 'admin') {
                      matchesRole = u.role === 'admin' || (u.roles && u.roles.includes('admin'));
                    } else if (userRoleFilter === 'moderator') {
                      matchesRole = (u.role === 'moderator' || (u.roles && u.roles.length > 0 && !u.roles.includes('admin') && u.role !== 'writer')) && u.role !== 'admin';
                    } else if (userRoleFilter === 'writer') {
                      matchesRole = (u.role === 'writer' || (u.roles && u.roles.includes('news_editor'))) && u.role !== 'admin';
                    } else if (userRoleFilter === 'user') {
                      matchesRole = (!u.role || u.role === 'user') && (!u.roles || u.roles.length === 0);
                    }

                    // Tier Filter
                    let matchesTier = true;
                    if (userTierFilter !== 'all') {
                      matchesTier = (u.tier || 'new') === userTierFilter;
                    }

                    return matchesSearch && matchesRole && matchesTier;
                  })
                  .map(member => (
                  <div key={member.uid} className="bg-white dark:bg-card-dark p-4 rounded-[28px] border border-border-light dark:border-border-dark flex items-center justify-between group hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {member.avatar ? (
                          <img src={member.avatar} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400"><UsersIcon size={24} /></div>
                        )}
                        {member.role === 'admin' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white"><Shield size={10} /></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                          {member.name}
                          {member.tier === 'premium' && <Star size={12} className="text-yellow-500 fill-current" />}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400">{member.email}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                           <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                             member.role === 'admin' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 
                             member.role === 'moderator' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 
                             member.role === 'writer' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 
                             'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-dark'
                           }`}>
                             {member.role === 'admin' ? 'مدير التطبيق' : member.role === 'moderator' ? 'مشرف مخصص' : member.role === 'writer' ? 'محرر' : 'عضو'}
                           </span>
                           {member.tier && (
                             <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                               {member.tier === 'premium' ? 'عضو ملكي 👑' : member.tier === 'diamond' ? 'عضو ماسي 💎' : member.tier === 'gold' ? 'عضو ذهبي 🥇' : member.tier === 'silver' ? 'عضو فضي 🥈' : member.tier === 'bronze' ? 'عضو برونزي 🥉' : 'عضو جديد'}
                             </span>
                           )}
                           {member.roles && member.roles.length > 0 && (
                             member.roles.map(r => {
                               const roleDef = APP_ROLES.find(ar => ar.id === r);
                               return (
                                 <span key={r} className={`px-2 py-0.5 rounded-lg text-[9px] font-black border flex items-center gap-1 ${roleDef?.badgeBg || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                   {roleDef?.shortLabel || r}
                                 </span>
                               );
                             })
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleAIBan(member)}
                        title={member.isBannedFromAI ? "إلغاء حظر الاستوديو" : "حظر من الاستوديو"}
                        className={`p-2.5 rounded-xl transition-all ${member.isBannedFromAI ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-dark'}`}
                      >
                        <Zap size={18} fill={member.isBannedFromAI ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        onClick={() => handleEditItem({...member, id: member.uid, roles: member.roles || []})}
                        className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                      >
                        <Shield size={18} />
                      </button>
                      <button onClick={() => handleDelete('users', member.uid!)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {users.length === 0 ? (
                  <div className="py-20 text-center bg-white dark:bg-card-dark rounded-[32px] border-2 border-dashed border-slate-200 text-slate-400 font-bold">لا يوجد أعضاء مضافون بعد</div>
                ) : (
                  users.filter(u => {
                    const searchLower = userSearch.toLowerCase();
                    const nameMatch = (u.name || '').toLowerCase().includes(searchLower);
                    const emailMatch = (u.email || '').toLowerCase().includes(searchLower);
                    const roleMatch = (u.roles || []).some((r: string) => r.toLowerCase().includes(searchLower));
                    const matchesSearch = nameMatch || emailMatch || roleMatch;

                    let matchesRole = true;
                    if (userRoleFilter === 'admin') {
                      matchesRole = u.role === 'admin' || (u.roles && u.roles.includes('admin'));
                    } else if (userRoleFilter === 'moderator') {
                      matchesRole = (u.role === 'moderator' || (u.roles && u.roles.length > 0 && !u.roles.includes('admin') && u.role !== 'writer')) && u.role !== 'admin';
                    } else if (userRoleFilter === 'writer') {
                      matchesRole = (u.role === 'writer' || (u.roles && u.roles.includes('news_editor'))) && u.role !== 'admin';
                    } else if (userRoleFilter === 'user') {
                      matchesRole = (!u.role || u.role === 'user') && (!u.roles || u.roles.length === 0);
                    }

                    let matchesTier = true;
                    if (userTierFilter !== 'all') {
                      matchesTier = (u.tier || 'new') === userTierFilter;
                    }

                    return matchesSearch && matchesRole && matchesTier;
                  }).length === 0 && (
                    <div className="py-16 text-center bg-white dark:bg-card-dark rounded-[28px] border border-dashed border-slate-200 dark:border-border-dark text-slate-400 font-bold flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                        <UsersIcon size={24} />
                      </div>
                      <p className="text-sm">لا توجد نتائج تطابق التصنيف أو البحث المحدد</p>
                      <button 
                        onClick={() => { setUserRoleFilter('all'); setUserTierFilter('all'); setUserSearch(''); }}
                        className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-black transition-all"
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col text-right px-2">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">إدارة النظام والنسخ الاحتياطي</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">System Maintenance & Data Management</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-border-light dark:border-border-dark flex flex-col items-center text-center">
                   <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4">
                      <Database size={28} />
                   </div>
                   <h4 className="text-sm font-black mb-1">نسخة احتياطية كاملة</h4>
                   <p className="text-[10px] font-bold text-slate-500 mb-6 leading-relaxed">
                     تحميل ملف JSON يحتوي على كافة بيانات التطبيق من Firestore
                   </p>
                   <button 
                    onClick={handleExportDatabase}
                    disabled={isExporting}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                   >
                     {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                     تحميل النسخة الآن
                   </button>
                </div>

                <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-border-light dark:border-border-dark flex flex-col items-center text-center">
                   <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                      <LayoutDashboard size={28} />
                   </div>
                   <h4 className="text-sm font-black mb-1">معلومات النظام</h4>
                   <div className="w-full space-y-2 mb-4">
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-surface-dark p-2 px-3 rounded-lg border border-border-light dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Version</span>
                        <span className="text-[10px] font-black tabular-nums">{ADMIN_VERSION}</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-surface-dark p-2 px-3 rounded-lg border border-border-light dark:border-white/5">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Status</span>
                        <span className="text-[10px] font-black text-green-500">Active</span>
                      </div>
                   </div>
                   <p className="text-[9px] font-bold text-slate-400 italic">
                     تم تصميم النظام لخدمة مشجعي نادي الاتحاد السكندري
                   </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 flex gap-3 items-start text-right">
                <Shield size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                   <h5 className="font-black text-amber-800 dark:text-amber-500 text-[10px] mb-0.5">تنبيه أمني</h5>
                   <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                     النسخة الاحتياطية تحتوي على بيانات حساسة. يرجى الحفاظ على الملف في مكان آمن وعدم مشاركته مع أطراف غير مصرح لها.
                   </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-card-dark rounded-xl p-5 shadow-sm space-y-5 border border-border-light dark:border-border-dark">
              
              {/* Maintenance Mode Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/25 border-2 border-amber-500/40 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                      <Wrench size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>وضع الصيانة</span>
                        {(formData.maintenanceEnabled !== undefined ? formData.maintenanceEnabled : (appSettings.maintenanceEnabled || false)) ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                            مُفعل حالياً
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-surface-dark text-slate-500 text-[10px] font-black">
                            معطل (التطبيق متاح للجميع)
                          </span>
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                        عند التفعيل، تظهر شاشة صيانة لجميع الزوار مع استثناء المسؤولين للإشراف
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.maintenanceEnabled !== undefined ? formData.maintenanceEnabled : (appSettings.maintenanceEnabled || false)}
                      onChange={(e) => setFormData({...formData, maintenanceEnabled: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 mb-1 block">
                      عنوان شاشة الصيانة
                    </label>
                    <input
                      type="text"
                      value={formData.maintenanceTitle !== undefined ? formData.maintenanceTitle : (appSettings.maintenanceTitle || 'سنعود بعد قليل انتظرونا')}
                      onChange={(e) => setFormData({...formData, maintenanceTitle: e.target.value})}
                      placeholder="سنعود بعد قليل انتظرونا"
                      className="w-full p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-900/60 bg-white dark:bg-card-dark text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 mb-1 block">
                      الوقت المتوقع للعودة (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.maintenanceEstimatedTime !== undefined ? formData.maintenanceEstimatedTime : (appSettings.maintenanceEstimatedTime || '')}
                      onChange={(e) => setFormData({...formData, maintenanceEstimatedTime: e.target.value})}
                      placeholder="مثال: خلال 30 دقيقة / الساعة 10:00 مساءً"
                      className="w-full p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-900/60 bg-white dark:bg-card-dark text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 mb-1 block">
                      رسالة الصيانة والتوضيح
                    </label>
                    <textarea
                      rows={2}
                      value={formData.maintenanceMessage !== undefined ? formData.maintenanceMessage : (appSettings.maintenanceMessage || 'نقوم حالياً بإجراء بعض التحديثات وأعمال الصيانة لتحسين تجربة استخدام قناة الاتحاد السكندري. سنعود بعد قليل، انتظرونا!')}
                      onChange={(e) => setFormData({...formData, maintenanceMessage: e.target.value})}
                      placeholder="اكتب تفاصيل الرسالة المعروضة للجماهير..."
                      className="w-full p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-900/60 bg-white dark:bg-card-dark text-xs font-bold text-slate-900 dark:text-white focus:border-amber-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Centralized Section Flags Manager */}
              <div className="pt-2">
                <AdminSectionFlagsManager />
              </div>

              <div className="pb-4 border-b border-border-light dark:border-border-dark">
                 <h3 className="text-sm font-black mb-1">الهوية البصرية</h3>
                 <p className="text-[10px] text-slate-500 font-bold">تحكم في اسم وشعار التطبيق الذي يظهر لجميع المستخدمين</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 mb-1.5 block">اسم التطبيق</label>
                <input 
                  type="text" 
                  value={formData.appName ?? appSettings.appName} 
                  onChange={(e) => setFormData({...formData, appName: e.target.value})}
                  className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 mb-1.5 block">نوع الشعار</label>
                <div className="flex bg-slate-100 dark:bg-surface-dark rounded-xl p-1 mb-4">
                  <button 
                    onClick={() => setFormData({...formData, logoType: 'image'})}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      (formData.logoType || appSettings.logoType || 'image') === 'image' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-slate-500'
                    }`}
                  >
                    صورة
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, logoType: 'text'})}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      (formData.logoType || appSettings.logoType) === 'text' ? 'bg-white dark:bg-card-dark shadow-sm text-primary' : 'text-slate-500'
                    }`}
                  >
                    نص مكتوب
                  </button>
                </div>

                {(formData.logoType || appSettings.logoType || 'image') === 'image' ? (
                  <div className="space-y-4">
                    <UploadOrUrlField 
                      label="لوجو التطبيق الأساسي (يظهر خارج الهيدر)" 
                      fieldName="appLogo" 
                      currentUrl={formData.appLogo !== undefined ? formData.appLogo : (appSettings.appLogo || '')} 
                      formData={formData} 
                      setFormData={setFormData}
                      uploading={uploading} 
                      handleFileUpload={handleFileUpload} 
                      skipResize={true}
                    />
                    
                    <UploadOrUrlField 
                      label="لوجو الهيدر (الوضع الفاتح)" 
                      fieldName="headerLogoLight" 
                      currentUrl={formData.headerLogoLight !== undefined ? formData.headerLogoLight : (appSettings.headerLogoLight || '')} 
                      formData={formData} 
                      setFormData={setFormData}
                      uploading={uploading} 
                      handleFileUpload={handleFileUpload} 
                      skipResize={true}
                    />

                    <UploadOrUrlField 
                      label="لوجو الهيدر (الوضع المظلم)" 
                      fieldName="headerLogoDark" 
                      currentUrl={formData.headerLogoDark !== undefined ? formData.headerLogoDark : (appSettings.headerLogoDark || '')} 
                      formData={formData} 
                      setFormData={setFormData}
                      uploading={uploading} 
                      handleFileUpload={handleFileUpload} 
                      skipResize={true}
                    />

                    {/* Header Logo Size Controller */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white">حجم لوجو الهيدر العلوي</h4>
                          <p className="text-[10px] text-slate-400 font-medium">اختر مقاساً جاهزاً أو اضبط الارتفاع بالسلايدر</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-black border border-primary/20">
                          {formData.headerLogoHeight ?? appSettings.headerLogoHeight ?? 48} px
                        </span>
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'small', label: 'صغير (36px)', height: 36 },
                          { id: 'medium', label: 'متوسط (48px)', height: 48 },
                          { id: 'large', label: 'كبير (62px)', height: 62 },
                          { id: 'xlarge', label: 'كبير جداً (78px)', height: 78 },
                        ].map((preset) => {
                          const currentHeight = formData.headerLogoHeight ?? appSettings.headerLogoHeight ?? 48;
                          const isSelected = (formData.headerLogoSize || appSettings.headerLogoSize || 'medium') === preset.id || currentHeight === preset.height;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setFormData({ 
                                ...formData, 
                                headerLogoSize: preset.id as any, 
                                headerLogoHeight: preset.height 
                              })}
                              className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all border ${
                                isSelected 
                                  ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]' 
                                  : 'bg-white dark:bg-slate-800/80 border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 hover:border-primary/50'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Slider Control */}
                      <div className="space-y-1.5 pt-2 border-t border-border-light/60 dark:border-border-dark/60">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>شريط السحب للتحكم الدقيق:</span>
                          <span className="text-primary font-black">{formData.headerLogoHeight ?? appSettings.headerLogoHeight ?? 48} بيكسل</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="85" 
                          step="2"
                          value={formData.headerLogoHeight ?? appSettings.headerLogoHeight ?? 48}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            let sizeType: 'small' | 'medium' | 'large' | 'xlarge' | 'custom' = 'custom';
                            if (val <= 38) sizeType = 'small';
                            else if (val <= 52) sizeType = 'medium';
                            else if (val <= 68) sizeType = 'large';
                            else sizeType = 'xlarge';

                            setFormData({
                              ...formData,
                              headerLogoHeight: val,
                              headerLogoSize: sizeType
                            });
                          }}
                          className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                          <span>30px (صغير)</span>
                          <span>48px (افتراضي)</span>
                          <span>85px (كبير جداً)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="text-[10px] font-black text-slate-500 mb-1.5 block">النص البديل للشعار</label>
                    <input 
                      type="text" 
                      value={formData.logoText ?? appSettings.logoText ?? ''} 
                      onChange={(e) => setFormData({...formData, logoText: e.target.value})}
                      className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold focus:border-primary outline-none transition-colors"
                      placeholder="مثال: الاتحاد السكندري"
                    />
                  </>
                )}

                <div className="mt-4 p-6 bg-slate-50 dark:bg-surface-dark rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-border-dark min-h-[120px]">
                   {(formData.logoType || appSettings.logoType || 'image') === 'image' ? (
                     <div className="flex flex-col items-center gap-2">
                       {/* Preview with exact chosen header height */}
                       <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-border-light dark:border-border-dark shadow-sm flex items-center justify-center">
                         <img 
                           src={formData.headerLogoLight || formData.appLogo || appSettings.headerLogoLight || appSettings.appLogo || '/icon.png'} 
                           onError={(e) => { e.currentTarget.src = '/icon.png'; }} 
                           style={{ height: `${formData.headerLogoHeight ?? appSettings.headerLogoHeight ?? 48}px` }}
                           className="w-auto object-contain drop-shadow-md transition-all duration-300" 
                           referrerPolicy="no-referrer" 
                         />
                       </div>
                       <span className="text-[11px] text-primary font-black">
                         معاينة حجم لوجو الهيدر ({formData.headerLogoHeight ?? appSettings.headerLogoHeight ?? 48}px)
                       </span>
                     </div>
                   ) : (
                     <h1 className="text-3xl font-black text-primary-dark dark:text-white drop-shadow-md mb-2">
                       {formData.logoText || appSettings.logoText || 'شعار الموقع'}
                     </h1>
                   )}
                </div>
              </div>

                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                 <h3 className="text-sm font-black mb-1">إعدادات الصفحة الرئيسية</h3>
                 <p className="text-[10px] text-slate-500 font-bold mb-4">تحكم في القسم الافتراضي الذي يظهر للمستخدم عند فتح التطبيق</p>
                 
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-500 block">الرياضة الافتراضية لعرض المباريات</label>
                   <div className="grid grid-cols-3 gap-2">
                     <button 
                       onClick={() => setFormData({...formData, defaultSport: 'auto'})}
                       className={`py-3 px-2 rounded-xl border text-[10px] font-black transition-all ${
                         (formData.defaultSport || appSettings.defaultSport || 'auto') === 'auto' 
                           ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                           : 'bg-slate-50 dark:bg-surface-dark border-border-light dark:border-border-dark text-slate-500'
                       }`}
                     >
                       تلقائي (حسب الأولوية)
                     </button>
                     <button 
                       onClick={() => setFormData({...formData, defaultSport: 'football'})}
                       className={`py-3 px-2 rounded-xl border text-[10px] font-black transition-all ${
                         (formData.defaultSport || appSettings.defaultSport) === 'football' 
                           ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                           : 'bg-slate-50 dark:bg-surface-dark border-border-light dark:border-border-dark text-slate-500'
                       }`}
                     >
                       كرة القدم دائماً
                     </button>
                     <button 
                       onClick={() => setFormData({...formData, defaultSport: 'basketball'})}
                       className={`py-3 px-2 rounded-xl border text-[10px] font-black transition-all ${
                         (formData.defaultSport || appSettings.defaultSport) === 'basketball' 
                           ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                           : 'bg-slate-50 dark:bg-surface-dark border-border-light dark:border-border-dark text-slate-500'
                       }`}
                     >
                       كرة السلة دائماً
                     </button>
                   </div>
                   <p className="text-[9px] text-slate-400 font-bold italic leading-relaxed">
                     * ملاحظة: الخيار الافتراضي هو "تلقائي" حيث يقوم النظام بإظهار مباريات كرة القدم أو السلة حسب وجود مباريات جارية أو تم تمييزها. اختيار رياضة محددة سيلغي هذا السلوك وسيظهر الرياضة المختارة دائماً عند الفتح.
                   </p>
                 </div>
               </div>
                <div className="pt-4 border-t border-border-light dark:border-border-dark mt-4 mb-4">
                  <h3 className="text-sm font-black mb-1">خلفية بانر مكتبة الوسائط</h3>
                  <p className="text-[10px] text-slate-500 font-bold mb-4">رفع أو تخصيص صورة خلفية البانر العلوي لصفحة المكتبة الرقمية والوسائط</p>
                  
                  <UploadOrUrlField 
                    label="صورة خلفية البانر" 
                    fieldName="libraryBanner" 
                    currentUrl={formData.libraryBanner !== undefined ? formData.libraryBanner : (appSettings.libraryBanner || '')} 
                    formData={formData} 
                    setFormData={setFormData}
                    uploading={uploading} 
                    handleFileUpload={handleFileUpload} 
                  />

                  {(formData.libraryBanner || appSettings.libraryBanner) && (
                    <div className="mt-3 relative h-32 rounded-2xl overflow-hidden border border-border-light dark:border-border-dark group shadow-md">
                      <img 
                        src={formData.libraryBanner ?? appSettings.libraryBanner} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, libraryBanner: ''})}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-black rounded-xl shadow-lg hover:bg-red-700 transition-colors"
                        >
                          إزالة الصورة
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border-light dark:border-border-dark mt-4 mb-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-black mb-1">منصات التواصل الرسمية لقناة الاتحاد السكندري</h3>
                    <p className="text-[10px] text-slate-500 font-bold">
                      تحكم في جميع روابط الحسابات الرسمية لقناة الاتحاد السكندري المعروضة في قسم السوشيال ميديا بالتطبيق
                    </p>
                  </div>

                  {/* Facebook */}
                  <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        صفحة فيسبوك الرسمية (Facebook)
                      </label>
                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400" dir="ltr">@itthadalexchannel</span>
                    </div>
                    <input 
                      type="url" 
                      value={formData.socialFacebook !== undefined ? formData.socialFacebook : (formData.facebookPageUrl !== undefined ? formData.facebookPageUrl : (appSettings.socialLinks?.facebook || appSettings.facebookPageUrl || 'https://www.facebook.com/Itthadalexchannel'))} 
                      onChange={(e) => setFormData({...formData, socialFacebook: e.target.value, facebookPageUrl: e.target.value})}
                      placeholder="https://www.facebook.com/Itthadalexchannel"
                      className="w-full p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-xs font-bold focus:border-primary outline-none transition-colors"
                      dir="ltr"
                    />
                  </div>

                  {/* YouTube */}
                  <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        قناة اليوتيوب الرسمية (YouTube)
                      </label>
                      <span className="text-[9px] font-black text-red-600 dark:text-red-400" dir="ltr">@itthadalexchannel</span>
                    </div>
                    <input 
                      type="url" 
                      value={formData.socialYoutube !== undefined ? formData.socialYoutube : (appSettings.socialLinks?.youtube || 'https://youtube.com/@itthadalexchannel')} 
                      onChange={(e) => setFormData({...formData, socialYoutube: e.target.value})}
                      placeholder="https://youtube.com/@itthadalexchannel"
                      className="w-full p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-xs font-bold focus:border-primary outline-none transition-colors"
                      dir="ltr"
                    />
                  </div>

                  {/* Instagram */}
                  <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-600"></span>
                        حساب إنستجرام الرسمي (Instagram)
                      </label>
                      <span className="text-[9px] font-black text-pink-600 dark:text-pink-400" dir="ltr">@itthadalexchannel</span>
                    </div>
                    <input 
                      type="url" 
                      value={formData.socialInstagram !== undefined ? formData.socialInstagram : (appSettings.socialLinks?.instagram || 'https://instagram.com/itthadalexchannel')} 
                      onChange={(e) => setFormData({...formData, socialInstagram: e.target.value})}
                      placeholder="https://instagram.com/itthadalexchannel"
                      className="w-full p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-xs font-bold focus:border-primary outline-none transition-colors"
                      dir="ltr"
                    />
                  </div>

                  {/* TikTok */}
                  <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-800 dark:bg-slate-300"></span>
                        حساب تيك توك الرسمي (TikTok)
                      </label>
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-300" dir="ltr">@itthadalexchannel</span>
                    </div>
                    <input 
                      type="url" 
                      value={formData.socialTiktok !== undefined ? formData.socialTiktok : (appSettings.socialLinks?.tiktok || 'https://tiktok.com/@itthadalexchannel')} 
                      onChange={(e) => setFormData({...formData, socialTiktok: e.target.value})}
                      placeholder="https://tiktok.com/@itthadalexchannel"
                      className="w-full p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-xs font-bold focus:border-primary outline-none transition-colors"
                      dir="ltr"
                    />
                  </div>

                  {/* X / Twitter */}
                  <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        حساب إكس الرسمي (X / Twitter)
                      </label>
                      <span className="text-[9px] font-black text-sky-600 dark:text-sky-400" dir="ltr">@itthadalexchannel</span>
                    </div>
                    <input 
                      type="url" 
                      value={formData.socialTwitter !== undefined ? formData.socialTwitter : (appSettings.socialLinks?.twitter || 'https://x.com/itthadalexchannel')} 
                      onChange={(e) => setFormData({...formData, socialTwitter: e.target.value})}
                      placeholder="https://x.com/itthadalexchannel"
                      className="w-full p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-xs font-bold focus:border-primary outline-none transition-colors"
                      dir="ltr"
                    />
                  </div>

                  {/* WhatsApp Chat Account */}
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        حساب واتساب الرسمي للدردشة (WhatsApp Chat)
                      </label>
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400" dir="ltr">@itthadalexchannel</span>
                    </div>
                    <input 
                      type="text" 
                      value={formData.socialWhatsapp !== undefined ? formData.socialWhatsapp : (appSettings.socialLinks?.whatsapp || 'https://wa.me/itthadalexchannel')} 
                      onChange={(e) => setFormData({...formData, socialWhatsapp: e.target.value})}
                      placeholder="https://wa.me/itthadalexchannel"
                      className="w-full p-2.5 rounded-xl border border-emerald-200 bg-white dark:bg-card-dark dark:border-emerald-900/60 text-xs font-bold focus:border-emerald-500 outline-none transition-colors"
                      dir="ltr"
                    />
                    <p className="text-[9px] text-emerald-700/80 dark:text-emerald-400/80 font-bold">
                      حساب الدردشة الرسمي المعتمد: @itthadalexchannel (الرابط: https://wa.me/itthadalexchannel)
                    </p>
                  </div>
                </div>

              <button 
                onClick={handleAdd} 
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                حفظ كافة الإعدادات
              </button>
            </div>
          )}

          {activeTab === 'clubs' && (
            <div className="flex flex-col gap-3">
              <button 
                  onClick={handleSeedClubs} 
                  disabled={loading}
                  className="bg-accent/10 border border-accent/20 text-accent dark:bg-accent/20 dark:border-accent/30 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-accent/20 transition-all mb-2"
              >
                 <Plus size={16} /> إضافة أندية الدوري المصري تلقائياً
              </button>
              {clubs.map((club) => (
                  <div key={club.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {club.logo && club.logo.trim() !== '' ? (
                        <img src={club.logo} alt="" className="w-10 h-10 rounded-lg object-contain bg-slate-50 dark:bg-surface-dark p-1" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-surface-dark flex items-center justify-center p-1">
                           <Trophy size={20} className="text-slate-300" />
                        </div>
                      )}
                      <span className="font-bold text-sm">{club.name}</span>
                    </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditItem(club)} 
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete('clubs', club.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {clubs.length === 0 && <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 dark:border-border-dark text-slate-400 font-bold text-sm">لا توجد أندية مضافة</div>}
            </div>
          )}

          {activeTab === 'polls' && (
            <div className="flex flex-col gap-3">
              {polls.map((poll) => (
                <div key={poll.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm leading-tight mb-1">{poll.question}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${poll.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {poll.active ? 'نشط' : 'مغلق'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">{poll.options?.length || 0} خيارات • {Object.values(poll.votes || {}).reduce((a, b) => a + Number(b), 0)} صوت</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditItem(poll)} 
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete('polls', poll.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {polls.length === 0 && <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 dark:border-border-dark text-slate-400 font-bold text-sm">لا توجد استطلاعات رأي</div>}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="flex flex-col gap-3">
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 mb-2">
                <span className="text-[10px] font-black text-primary uppercase">تعليقات الدردشة المباشرة (Live Chat)</span>
              </div>
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs">{comment.userName}</span>
                      <span className="text-[10px] text-slate-400">{comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن'}</span>
                    </div>
                    <button onClick={() => handleDelete('live_comments', comment.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-surface-dark p-2 rounded-lg">{comment.text}</p>
                </div>
              ))}
              {comments.length === 0 && <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">لا توجد تعليقات</div>}
            </div>
          )}

           {activeTab === 'history' && (
            <div className="flex flex-col gap-6">
              {/* History Header */}
              <div className="bg-gradient-to-r from-primary to-primary-dark p-8 rounded-[40px] text-white shadow-2xl shadow-primary/20 p-8 border border-white/10 group overflow-hidden relative">
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-3 opacity-80">
                        <HistoryIcon size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">History Management</span>
                     </div>
                     <button 
                       onClick={handleUndo}
                       disabled={undoStack.length === 0}
                       className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 p-2 px-3 rounded-full backdrop-blur-md border border-white/10 transition-all text-[10px] font-black uppercase"
                     >
                       <Undo size={14} />
                       Undo ({undoStack.length})
                     </button>
                   </div>
                   <h2 className="text-3xl font-black mb-1 tracking-tighter">إدارة البيانات التاريخية</h2>
                   <p className="text-sm text-white/70 max-w-md font-bold">
                      تحكم في سجل البطولات والأرقام القياسية والتاريخ العريق لناديكم المفضل.
                   </p>
                </div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rotate-45 translate-x-12 -translate-y-12"></div>
              </div>

              <div className="flex p-1 bg-slate-100 dark:bg-surface-dark rounded-2xl">
                {['stats', 'titles', 'timeline', 'stadiums'].map((sub) => (
                  <button 
                    key={sub}
                    onClick={() => setHistorySubTab(sub as any)}
                    className={`flex-1 py-1.5 text-[10px] font-black rounded-xl transition-all ${historySubTab === sub ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500'}`}
                  >
                    {sub === 'stats' ? 'أرقام قياسية' : sub === 'titles' ? 'كؤوس وبطولات' : sub === 'timeline' ? 'أحداث تاريخية' : 'ملاعب النادي'}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-primary/10 dark:bg-primary/5 p-3 rounded-2xl border border-primary/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black text-xs">
                    ↕
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">إعادة ترتيب العناصر بسهولة</p>
                    <p className="text-[10px] text-slate-500 font-bold">اضغط على أزرار الأسهم (⬆️ ⬇️) بجانب أي عنصر لتغيير ترتيب ظهوره المباشر في صفحات الموقع وتطبيق النادي.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {historySubTab === 'stats' && sortHistoryList(clubStats).map((item, idx, arr) => (
                  <div key={item.id} className={`bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between gap-2 ${item.hidden ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-surface-dark px-2 py-1 rounded-xl border border-border-light dark:border-border-dark">
                        <span className="text-[10px] font-black text-primary font-mono ml-1">#{idx + 1}</span>
                        <button 
                          onClick={() => handleReorderHistory('stats', idx, 'up')}
                          disabled={idx === 0}
                          title="تحريك لأعلى"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          onClick={() => handleReorderHistory('stats', idx, 'down')}
                          disabled={idx === arr.length - 1}
                          title="تحريك لأسفل"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-surface-dark flex items-center justify-center text-primary flex-shrink-0">
                        <Star size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black">{item.label}</p>
                          {item.hidden && <span className="bg-slate-100 dark:bg-surface-dark text-[8px] font-black px-1.5 py-0.5 rounded text-slate-500">مخفي</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{item.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleVisibility('club_stats', item)} className="p-2 text-slate-400 hover:text-primary transition-all">
                        {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => openEditModal(item, item.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete('club_stats', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}

                {historySubTab === 'titles' && sortHistoryList(clubTitles, (a, b) => b.count - a.count).map((item, idx, arr) => (
                  <div key={item.id} className={`bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between gap-2 ${item.hidden ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-surface-dark px-2 py-1 rounded-xl border border-border-light dark:border-border-dark">
                        <span className="text-[10px] font-black text-primary font-mono ml-1">#{idx + 1}</span>
                        <button 
                          onClick={() => handleReorderHistory('titles', idx, 'up')}
                          disabled={idx === 0}
                          title="تحريك لأعلى"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          onClick={() => handleReorderHistory('titles', idx, 'down')}
                          disabled={idx === arr.length - 1}
                          title="تحريك لأسفل"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-surface-dark flex items-center justify-center text-primary flex-shrink-0">
                        <Trophy size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black">{item.name}</p>
                          {item.hidden && <span className="bg-slate-100 dark:bg-surface-dark text-[8px] font-black px-1.5 py-0.5 rounded text-slate-500">مخفي</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{item.count} بطل • {item.category === 'football' ? 'قدم' : 'سلة'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleVisibility('club_titles', item)} className="p-2 text-slate-400 hover:text-primary transition-all">
                        {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => openEditModal(item, item.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete('club_titles', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}

                {historySubTab === 'timeline' && sortHistoryList(historyEvents, (a, b) => (a.year || '').localeCompare(b.year || '')).map((item, idx, arr) => (
                  <div key={item.id} className={`bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between gap-2 ${item.hidden ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-surface-dark px-2 py-1 rounded-xl border border-border-light dark:border-border-dark flex-shrink-0">
                        <span className="text-[10px] font-black text-primary font-mono ml-1">#{idx + 1}</span>
                        <button 
                          onClick={() => handleReorderHistory('timeline', idx, 'up')}
                          disabled={idx === 0}
                          title="تحريك لأعلى"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          onClick={() => handleReorderHistory('timeline', idx, 'down')}
                          disabled={idx === arr.length - 1}
                          title="تحريك لأسفل"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-surface-dark flex items-center justify-center text-primary flex-shrink-0">
                        <HistoryIcon size={14} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black truncate">{item.year}: {item.title}</p>
                          {item.hidden && <span className="bg-slate-100 dark:bg-surface-dark text-[8px] font-black px-1.5 py-0.5 rounded text-slate-500">مخفي</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold truncate">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleToggleVisibility('club_timeline', item)} className="p-2 text-slate-400 hover:text-primary transition-all">
                        {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => openEditModal(item, item.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete('club_timeline', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}

                {historySubTab === 'stadiums' && sortHistoryList(stadiums).map((item, idx, arr) => (
                  <div key={item.id} className={`bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between gap-2 ${item.hidden ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-surface-dark px-2 py-1 rounded-xl border border-border-light dark:border-border-dark flex-shrink-0">
                        <span className="text-[10px] font-black text-primary font-mono ml-1">#{idx + 1}</span>
                        <button 
                          onClick={() => handleReorderHistory('stadiums', idx, 'up')}
                          disabled={idx === 0}
                          title="تحريك لأعلى"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          onClick={() => handleReorderHistory('stadiums', idx, 'down')}
                          disabled={idx === arr.length - 1}
                          title="تحريك لأسفل"
                          className="p-1 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-card-dark disabled:opacity-20 disabled:pointer-events-none transition-all"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {item.imageUrl && item.imageUrl.trim() !== '' ? (
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                           <Activity size={20} className="text-slate-300" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black">{item.name}</p>
                          {item.hidden && <span className="bg-slate-100 dark:bg-surface-dark text-[8px] font-black px-1.5 py-0.5 rounded text-slate-500">مخفي</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleVisibility('club_stadiums', item)} className="p-2 text-slate-400 hover:text-primary transition-all">
                        {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => openEditModal(item, item.id)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete('club_stadiums', item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fan-comments' && (
            <div className="flex flex-col gap-3">
              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 mb-2">
                <span className="text-[10px] font-black text-primary uppercase">تعليقات Fan Zone (المنشورات)</span>
              </div>
              {fanComments.map((comment) => (
                <div key={comment.id} className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs">{comment.userName}</span>
                      <span className="text-[10px] text-slate-400">{comment.createdAt ? new Date(comment.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}</span>
                    </div>
                    <button onClick={() => handleDelete('fan_comments', comment.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[8px] text-slate-400 font-black uppercase">التواجد في المنشور ID: {comment.postId?.slice(0, 8)}...</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-surface-dark p-2 rounded-lg">{comment.text}</p>
                  </div>
                </div>
              ))}
              {fanComments.length === 0 && <div className="text-center py-10 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">لا توجد تعليقات في Fan Zone</div>}
            </div>
          )}

          {activeTab === 'live' && (
             <div className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-4 flex flex-col gap-4">
               <div>
                  <label className="text-xs font-bold mb-1.5 block">وضع عرض البث للجماهير</label>
                  <select 
                    className="w-full p-2.5 rounded-lg border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" 
                    value={appSettings.liveViewMode || 'both'} 
                    onChange={async (e) => {
                       const val = e.target.value;
                       try {
                         await updateDoc(doc(db, 'settings', 'global'), { liveViewMode: val });
                         setSettings({ ...appSettings, liveViewMode: val });
                         toast.success('تم تحديث وضع العرض');
                       } catch (err) {
                         toast.error('فشل تحديث وضع العرض');
                       }
                    }}
                  >
                     <option value="both">كافة القنوات (عرض تلقائي)</option>
                     <option value="football">كرة قدم فقط</option>
                     <option value="basketball">كرة سلة فقط</option>
                     <option value="programs">برامج فقط</option>
                     <option value="custom">الخانة المخصصة ({liveStreams.custom?.customName || 'بث خاص'})</option>
                  </select>
               </div>

               {(() => {
                 const currentStream = liveSportSubTab === 'custom'
                   ? liveStreams.custom
                   : liveSportSubTab === 'programs' 
                     ? liveStreams.programs 
                     : liveSportSubTab === 'basketball' 
                       ? liveStreams.basketball 
                       : liveStreams.football;
                 const currentUrl = formData.url !== undefined ? formData.url : (currentStream?.url || '');
                 const parsedStream = parseLiveStreamUrl(currentUrl);

                 const getIsChannelHidden = (channelKey: any) => {
                   if (liveSportSubTab === channelKey && formData.hidden !== undefined) {
                     return !!formData.hidden;
                   }
                   return isStreamHidden(liveStreams[channelKey]);
                 };

                 return (
                   <>
                     <div className="flex bg-slate-100 dark:bg-surface-dark p-1 rounded-xl w-fit flex-wrap items-center gap-1.5">
                        {/* Football */}
                        <div className={`flex items-center rounded-lg transition-all ${liveSportSubTab === 'football' ? 'bg-white dark:bg-card-dark shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                          <button 
                            onClick={() => {
                                setLiveSportSubTab('football');
                                setFormData({});
                            }} 
                            className={`px-3 py-2 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${liveSportSubTab === 'football' ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            <Trophy size={14} />
                            <span>كرة القدم</span>
                            {liveStreams.football?.isActive && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleChannelVisibility('football', e)}
                            title={getIsChannelHidden('football') ? 'خانة كرة القدم مخفية (اضغط للإظهار)' : 'خانة كرة القدم ظاهرة (اضغط للإخفاء)'}
                            className={`p-1.5 mx-1 rounded-md transition-all cursor-pointer ${getIsChannelHidden('football') ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'}`}
                          >
                            {getIsChannelHidden('football') ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>

                        {/* Basketball */}
                        <div className={`flex items-center rounded-lg transition-all ${liveSportSubTab === 'basketball' ? 'bg-white dark:bg-card-dark shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                          <button 
                            onClick={() => {
                                setLiveSportSubTab('basketball');
                                setFormData({});
                            }} 
                            className={`px-3 py-2 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${liveSportSubTab === 'basketball' ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            <Trophy size={14} />
                            <span>كرة السلة</span>
                            {liveStreams.basketball?.isActive && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleChannelVisibility('basketball', e)}
                            title={getIsChannelHidden('basketball') ? 'خانة كرة السلة مخفية (اضغط للإظهار)' : 'خانة كرة السلة ظاهرة (اضغط للإخفاء)'}
                            className={`p-1.5 mx-1 rounded-md transition-all cursor-pointer ${getIsChannelHidden('basketball') ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'}`}
                          >
                            {getIsChannelHidden('basketball') ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>

                        {/* Programs */}
                        <div className={`flex items-center rounded-lg transition-all ${liveSportSubTab === 'programs' ? 'bg-white dark:bg-card-dark shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                          <button 
                            onClick={() => {
                                setLiveSportSubTab('programs');
                                setFormData({});
                            }} 
                            className={`px-3 py-2 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${liveSportSubTab === 'programs' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            <Tv size={14} />
                            <span>برامج</span>
                            {liveStreams.programs?.isActive && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleChannelVisibility('programs', e)}
                            title={getIsChannelHidden('programs') ? 'خانة البرامج مخفية (اضغط للإظهار)' : 'خانة البرامج ظاهرة (اضغط للإخفاء)'}
                            className={`p-1.5 mx-1 rounded-md transition-all cursor-pointer ${getIsChannelHidden('programs') ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'}`}
                          >
                            {getIsChannelHidden('programs') ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>

                        {/* Custom Channel */}
                        <div className={`flex items-center rounded-lg transition-all ${liveSportSubTab === 'custom' ? 'bg-white dark:bg-card-dark shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                          <button 
                            onClick={() => {
                                setLiveSportSubTab('custom');
                                setFormData({});
                            }} 
                            className={`px-3 py-2 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${liveSportSubTab === 'custom' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            <Radio size={14} />
                            <span>{liveStreams.custom?.customName?.trim() ? `بث مخصص (${liveStreams.custom.customName})` : 'خانة بث مخصصة +'}</span>
                            {liveStreams.custom?.isActive && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleToggleChannelVisibility('custom', e)}
                            title={getIsChannelHidden('custom') ? 'الخانة المخصصة مخفية (اضغط للإظهار)' : 'الخانة المخصصة ظاهرة (اضغط للإخفاء)'}
                            className={`p-1.5 mx-1 rounded-md transition-all cursor-pointer ${getIsChannelHidden('custom') ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'}`}
                          >
                            {getIsChannelHidden('custom') ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                     </div>

                     {/* Custom Channel Name Customizer */}
                     {liveSportSubTab === 'custom' && (
                       <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex flex-col gap-2.5">
                         <div className="flex items-center gap-2">
                           <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                             <Radio size={16} />
                           </div>
                           <div>
                             <h4 className="text-xs font-black text-slate-800 dark:text-white">تخصيص اسم خانة البث (يظهر للمشاهدين بجوار البرامج والكرة والسلة)</h4>
                             <p className="text-[10px] text-slate-500 dark:text-slate-400">حدد الاسم الذي تريده أن يظهر للجمهور في صفحة البث المباشر (مثل: كرة اليد، ألعاب صالات، مؤتمر صحفي، تغطية خاصة)</p>
                           </div>
                         </div>
                         <input 
                           type="text" 
                           className="w-full p-3 rounded-xl border border-emerald-500/40 bg-white dark:bg-card-dark text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30" 
                           value={formData.customName !== undefined ? formData.customName : (currentStream?.customName || '')} 
                           placeholder="اكتب اسم الخانة المخصصة هنا (مثال: كرة اليد / مؤتمر صحفي / صالات الاتحاد)"
                           onChange={(e) => setFormData({...formData, customName: e.target.value})}
                         />
                       </div>
                     )}

                     {/* YouTube Live info banner */}
                     <div className="p-4 bg-gradient-to-r from-red-500/10 via-red-500/5 to-primary/10 border border-red-500/20 dark:border-red-500/30 rounded-2xl flex flex-col gap-2">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2.5">
                           <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/30">
                             <Youtube size={18} />
                           </div>
                           <div>
                             <h4 className="text-xs font-black text-slate-800 dark:text-white">إضافة بث يوتيوب لايف (YouTube Live)</h4>
                             <p className="text-[10px] text-slate-500 dark:text-slate-400">يدعم كافة صيغ يوتيوب: البث المباشر المباشر (Live)، الفيديوهات، أو كود التضمين</p>
                           </div>
                         </div>
                         {parsedStream.type === 'youtube' && (
                           <span className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg flex items-center gap-1.5 shadow-sm animate-pulse">
                             <span className="w-2 h-2 rounded-full bg-white"></span>
                             يوتيوب لايف مفعّل
                           </span>
                         )}
                       </div>
                     </div>

                     {/* Hidden Status Warning Banner */}
                     {(formData.hidden !== undefined ? formData.hidden : isStreamHidden(currentStream)) && (
                       <div className="p-3.5 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                           <EyeOff size={18} />
                         </div>
                         <div className="flex-1">
                           <h4 className="text-xs font-black text-rose-800 dark:text-rose-300">هذه الخانة مخفية حالياً عن المشاهدين</h4>
                           <p className="text-[10px] text-rose-600/80 dark:text-rose-400">تم حجب هذه الخانة ولن تظهر في قائمة القنوات بصفحة البث المباشر حتى تختار "إظهار الخانة" أو تضغط على أيقونة العين بالأعلى.</p>
                         </div>
                       </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <label className="text-xs font-bold mb-1.5 block">حالة بث {liveSportSubTab === 'custom' ? (formData.customName || currentStream?.customName || 'الخانة المخصصة') : liveSportSubTab === 'programs' ? 'البرامج' : liveSportSubTab === 'basketball' ? 'كرة السلة' : 'كرة القدم'}</label>
                          <select 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" 
                            value={formData.isActive !== undefined ? (formData.isActive ? '1' : '0') : (currentStream?.isActive ? '1' : '0')} 
                            onChange={(e) => setFormData({...formData, isActive: e.target.value === '1'})}
                          >
                             <option value="1">🟢 مباشر الآن (مفتوح للجماهير)</option>
                             <option value="0">⚪ مغلق (يظهر مؤشر انتظار موعد المباراة أو البرنامج)</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold mb-1.5 flex items-center justify-between">
                            <span>ظهور الخانة للجمهور</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${!(formData.hidden !== undefined ? formData.hidden : isStreamHidden(currentStream)) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                              {!(formData.hidden !== undefined ? formData.hidden : isStreamHidden(currentStream)) ? 'ظاهرة 👁️' : 'مخفية 🚫'}
                            </span>
                          </label>
                          <select 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" 
                            value={formData.hidden !== undefined ? (formData.hidden ? '1' : '0') : (isStreamHidden(currentStream) ? '1' : '0')} 
                            onChange={(e) => setFormData({...formData, hidden: e.target.value === '1'})}
                          >
                             <option value="0">👁️ إظهار الخانة (ظاهرة للجمهور في صفحة البث)</option>
                             <option value="1">🚫 إخفاء الخانة (حجب هذه الخانة تماماً عن الجمهور)</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold mb-1.5 block">عنوان البث المباشر</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" 
                            value={formData.title !== undefined ? formData.title : (currentStream?.title || '')} 
                            placeholder={liveSportSubTab === 'custom' ? 'مثال: تغطية خاصة - البث المباشر الحصري' : liveSportSubTab === 'programs' ? 'مثال: استوديو قلعة الشاطبي - تحليل ما بعد المباراة' : 'مثال: الاتحاد السكندري vs الأهلي - بث مباشر'}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                          />
                       </div>
                     </div>

                     <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                             <Tv size={16} className="text-primary" />
                             كود الـ Iframe أو رابط البث المباشر (YouTube Live / HLS / MP4)
                          </label>
                          {parsedStream.type && (
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-surface-dark px-2.5 py-1 rounded-lg border border-border-light dark:border-border-dark flex items-center gap-1">
                              {parsedStream.rawIframe || (typeof currentUrl === 'string' && currentUrl.includes('<iframe')) ? (
                                <span className="text-indigo-600 dark:text-indigo-400 font-black">🌐 كود تضمين (Iframe كامل - يُحفظ ويُعرض كـ Iframe أصلي)</span>
                              ) : parsedStream.type === 'youtube' ? (
                                <span className="text-red-600 font-bold">🔴 يوتيوب (YouTube Live / Video)</span>
                              ) : parsedStream.type === 'video' || parsedStream.type === 'hls' ? (
                                <span className="text-emerald-600 font-bold">⚡ سيرفر مباشر (HLS / m3u8 / MP4)</span>
                              ) : (
                                <span>🔗 رابط مخصص</span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <textarea 
                            rows={3}
                            className="w-full p-3.5 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-xs text-left dir-ltr font-mono resize-y focus:ring-2 focus:ring-primary/20" 
                            value={currentUrl} 
                            placeholder='<iframe src="https://..." allowfullscreen ...></iframe> أو https://www.youtube.com/live/... أو https://.../stream.m3u8'
                            onChange={(e) => setFormData({...formData, url: e.target.value})}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed flex items-center gap-1.5">
                          <span>💡</span>
                          <span>عند وضع كود <strong className="text-primary font-mono font-bold">&lt;iframe&gt;...&lt;/iframe&gt;</strong> يتم الاحتفاظ به كاملاً وتشغيله مباشرة دون تحويله إلى رابط.</span>
                        </p>

                        {/* Universal Formats Supported Info */}
                        <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/25 rounded-2xl flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center gap-2">
                            <Film size={15} className="text-indigo-600 dark:text-indigo-400" />
                            <h5 className="text-xs font-black text-slate-800 dark:text-white">صيغ الفيديو المدعومة (مباشرة وغير مباشرة)</h5>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            يدعم المشغل: <strong>YouTube Live</strong>، <strong>Facebook Video/Live</strong>، <strong>Twitch</strong>، <strong>Vimeo</strong>، <strong>Dailymotion</strong>، <strong>Streamable</strong>، <strong>Rumble</strong>، <strong>OK.ru</strong>، <strong>TikTok</strong>، <strong>Archive.org</strong>، <strong>Google Drive</strong>، سيرفرات <strong>HLS (.m3u8 و .m3u IPTV)</strong>، سيرفرات <strong>MPEG-DASH (.mpd)</strong>، الفيديوهات المسجلة <strong>(MP4, WebM, MKV, MOV, TS, AVI, FLV, WMV)</strong>، وأكواد الـ <strong>Iframe</strong>، وبثوث الراديو <strong>(MP3, AAC)</strong>.
                          </p>
                        </div>

                        {/* M3U Proxy Toggle Option */}
                        <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 mt-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <ShieldCheck size={18} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white">تشغيل البث عبر البروكسي الداخلي (تخطي حجب التضمين لـ M3U/M3U8) 🛡️</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">إخفاء الدومين الأصلي للسيرفر وتجاوز قيود CORS ومنع الـ embedding عند استخدام روابط IPTV أو M3U8 أو سيرفرات خارجية تمنع التضمين.</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={formData.useProxy !== undefined ? !!formData.useProxy : (currentStream?.useProxy ?? false)}
                              onChange={(e) => setFormData({ ...formData, useProxy: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        {/* WebView Mode Toggle Option */}
                        <div className="p-3.5 bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 rounded-2xl flex items-center justify-between gap-3 mt-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Globe size={18} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white">تفعيل نمط متصفح الويب المدمج (WebView) 🌐</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">عرض أي موقع أو صفحة مباريات بالكامل داخل شاشة الفيديو كمتصفح ويب مدمج، مع إمكانية التفاعل الكامل وتجاوز قيود X-Frame-Options.</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={formData.isWebView !== undefined ? !!formData.isWebView : (currentStream?.isWebView ?? false)}
                              onChange={(e) => setFormData({ ...formData, isWebView: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                          </label>
                        </div>
                     </div>

                     {/* Custom Image Banner with Link above Live Stream */}
                     <div className="p-4 bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl space-y-3">
                       <div className="flex items-center justify-between">
                         <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                           <ImageIcon size={16} className="text-primary" />
                           بانر صورة مخصص أعلى البث المباشر (مع رابط موجه)
                         </label>
                         <span className="text-[10px] text-slate-400 font-bold">يظهر للجمهور أعلى شاشة البث مباشرة</span>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         <div>
                           <label className="text-[11px] font-bold text-slate-500 mb-1 block">رابط صورة البانر (Image URL)</label>
                           <div className="flex gap-2">
                             <input
                               type="text"
                               className="flex-1 p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark text-xs font-mono text-left dir-ltr"
                               placeholder="/nada_ad.png أو https://..."
                               value={formData.bannerUrl !== undefined ? formData.bannerUrl : (currentStream?.bannerUrl || '')}
                               onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                             />
                             <button
                               type="button"
                               onClick={() => setFormData({ ...formData, bannerUrl: '/nada_ad.png' })}
                               className="px-2.5 py-1 text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-xl border border-emerald-500/30 whitespace-nowrap cursor-pointer transition-all"
                               title="استخدام البانر المرفوع nada_ad.png"
                             >
                               البانر المرفوع 🖼️
                             </button>
                           </div>
                         </div>

                         <div>
                           <label className="text-[11px] font-bold text-slate-500 mb-1 block">الرابط الموجه عند الضغط (Link URL)</label>
                           <input
                             type="text"
                             className="w-full p-2.5 rounded-xl border border-border-light bg-white dark:bg-card-dark text-xs font-mono text-left dir-ltr"
                             placeholder="https://..."
                             value={formData.bannerLink !== undefined ? formData.bannerLink : (currentStream?.bannerLink || '')}
                             onChange={(e) => setFormData({ ...formData, bannerLink: e.target.value })}
                           />
                         </div>
                       </div>

                       {/* Banner Preview if URL is set */}
                       {(formData.bannerUrl !== undefined ? formData.bannerUrl : (currentStream?.bannerUrl || '')) && (
                         <div className="relative rounded-xl overflow-hidden border border-border-light dark:border-border-dark mt-2 max-h-[140px] bg-black/5">
                           <img
                             src={formData.bannerUrl !== undefined ? formData.bannerUrl : (currentStream?.bannerUrl || '')}
                             alt="معاينة البانر"
                             className="w-full h-auto max-h-[140px] object-cover"
                           />
                           <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                             <ExternalLink size={10} />
                             <span>معاينة البانر</span>
                           </div>
                         </div>
                       )}
                     </div>

                     {/* Live Stream Preview */}
                     {currentUrl && (
                       <div className="bg-slate-100/70 dark:bg-surface-dark/70 rounded-2xl p-4 border border-border-light dark:border-border-dark">
                         <div className="flex items-center justify-between mb-3">
                           <span className="text-xs font-black flex items-center gap-2">
                             <Tv size={16} className="text-primary" />
                             معاينة البث المباشر (Live Preview)
                           </span>
                           <span className="text-[10px] text-slate-400">تأكد من تشغيل الفيديو قبل الحفظ</span>
                         </div>

                         <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                            <LivePlayer 
                              key={`preview-${currentUrl}-${formData.useProxy !== undefined ? formData.useProxy : (currentStream?.useProxy ?? false)}-${formData.isWebView !== undefined ? formData.isWebView : (currentStream?.isWebView ?? false)}`}
                              url={currentUrl} 
                              title={formData.title || currentStream?.title || "معاينة البث"} 
                              isActive={true} 
                              useProxy={formData.useProxy !== undefined ? !!formData.useProxy : (currentStream?.useProxy ?? false)}
                              isWebView={formData.isWebView !== undefined ? !!formData.isWebView : (currentStream?.isWebView ?? false)}
                            />
                          </div>
                        </div>
                      )}

                      <button onClick={handleAdd} className="w-full mt-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-black text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <CheckCircle2 size={18} />
                        حفظ وتحديث البث المباشر
                     </button>
                   </>
                 );
               })()}
             </div>
          )}

          {activeTab === 'music' && (
             <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                   <div className="flex bg-slate-100 dark:bg-surface-dark p-1 rounded-xl w-fit">
                      <button onClick={() => setMusicSubTab('songs')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${musicSubTab === 'songs' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>الأغاني ({songs.length})</button>
                      <button onClick={() => setMusicSubTab('albums')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${musicSubTab === 'albums' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>الألبومات ({albums.length})</button>
                      <button onClick={() => setMusicSubTab('playlists')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${musicSubTab === 'playlists' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>القوائم ({playlists.length})</button>
                   </div>
                   <button 
                     onClick={openAddModal}
                     className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                   >
                     <Plus size={16} />
                     <span>{musicSubTab === 'songs' ? 'إضافة أغنية/تسجيل' : musicSubTab === 'albums' ? 'إضافة ألبوم جديد' : 'إضافة قائمة تشغيل'}</span>
                   </button>
                </div>
                
                <div className="flex flex-col gap-3">
                   {musicSubTab === 'songs' && (
                     <>
                       {songs.map(song => (
                         <div key={song.id} className="bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {song.coverUrl && song.coverUrl.trim() !== '' ? (
                                  <img src={song.coverUrl} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center">
                                     <Music size={20} className="text-slate-300" />
                                  </div>
                                )}
                               <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-black">{song.title}</p>
                                    {(() => {
                                      const songAlbum = albums.find(a => a.id === song.albumId || a.songIds?.includes(song.id));
                                      return songAlbum ? (
                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black">
                                          ألبوم: {songAlbum.title}
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold">{song.artist} • {song.category === 'song' ? 'أغنية' : 'تسجيل صوتي'} {song.duration ? `• ${song.duration}` : ''}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditItem(song)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                               <button onClick={() => handleDelete('songs', song.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                         </div>
                       ))}
                       {songs.length === 0 && (
                         <div className="py-12 text-center bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark flex flex-col items-center justify-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                             <Music size={24} />
                           </div>
                           <p className="text-sm font-bold text-slate-500">لا توجد أغانٍ أو تسجيلات صوتية حالياً</p>
                           <button onClick={openAddModal} className="text-xs font-black text-primary hover:underline cursor-pointer">
                             + إضافة أول أغنية
                           </button>
                         </div>
                       )}
                     </>
                   )}
                   
                   {musicSubTab === 'albums' && (
                     <>
                       {albums.map(album => (
                         <div key={album.id} className="bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {album.coverUrl && album.coverUrl.trim() !== '' ? (
                                  <img src={album.coverUrl} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center">
                                     <Disc size={20} className="text-slate-300" />
                                  </div>
                                )}
                               <div>
                                  <p className="text-xs font-black">{album.title}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">
                                    {album.artist} {album.year ? `• ${album.year}` : ''} • <span className="text-primary font-black">{(album.songIds?.length || songs.filter(s => s.albumId === album.id).length)} أغنية</span>
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditItem(album)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                               <button onClick={() => handleDelete('albums', album.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                         </div>
                       ))}
                       {albums.length === 0 && (
                         <div className="py-12 text-center bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark flex flex-col items-center justify-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                             <Disc size={24} />
                           </div>
                           <p className="text-sm font-bold text-slate-500">لا توجد ألبومات مضافة حالياً</p>
                           <button onClick={openAddModal} className="text-xs font-black text-primary hover:underline cursor-pointer">
                             + إضافة أول ألبوم
                           </button>
                         </div>
                       )}
                     </>
                   )}

                   {musicSubTab === 'playlists' && (
                     <>
                       {playlists.map(playlist => (
                         <div key={playlist.id} className="bg-white dark:bg-card-dark p-3 rounded-xl border border-border-light dark:border-border-dark flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {playlist.coverUrl && playlist.coverUrl.trim() !== '' ? (
                                  <img src={playlist.coverUrl} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center">
                                     <ListMusic size={20} className="text-slate-300" />
                                  </div>
                                )}
                               <div>
                                  <p className="text-xs font-black">{playlist.title}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{playlist.songIds?.length || 0} أغنية</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditItem(playlist)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"><Edit2 size={16} /></button>
                               <button onClick={() => handleDelete('playlists', playlist.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                         </div>
                       ))}
                       {playlists.length === 0 && (
                         <div className="py-12 text-center bg-white dark:bg-card-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark flex flex-col items-center justify-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                             <ListMusic size={24} />
                           </div>
                           <p className="text-sm font-bold text-slate-500">لا توجد قوائم تشغيل مضافة حالياً</p>
                           <button onClick={openAddModal} className="text-xs font-black text-primary hover:underline cursor-pointer">
                             + إضافة أول قائمة تشغيل
                           </button>
                         </div>
                       )}
                     </>
                   )}
                </div>
             </div>
           )}

           {activeTab === 'books' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {books.map(book => (
                  <div key={book.id} className="bg-white dark:bg-card-dark p-4 rounded-2xl border border-border-light dark:border-border-dark flex gap-4">
                    <div className="relative w-20 h-28 bg-slate-100 rounded-xl overflow-hidden shadow-md flex items-center justify-center">
                      {book.coverUrl && book.coverUrl.trim() !== '' ? (
                        <img src={book.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <BookOpen size={32} className="text-slate-300" />
                      )}
                    </div>
                     <div className="flex-1 min-w-0">
                        <h4 className="font-black text-xs mb-1 truncate">{book.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mb-2">{book.author}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditItem(book)} className="flex-1 bg-slate-50 dark:bg-surface-dark py-2 rounded-lg text-[10px] font-black text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">تعديل</button>
                           <button onClick={() => handleDelete('books', book.id)} className="px-3 bg-slate-50 dark:bg-surface-dark py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"><Trash2 size={14} /></button>
                        </div>
                     </div>
                  </div>
                ))}
                {books.length === 0 && <div className="col-span-full py-10 text-center bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">لا توجد كتب مضافة</div>}
             </div>
           )}

           {activeTab === 'business' && <AdminBusiness />}
           {activeTab === 'analytics' && <AdminAnalytics />}
           {(activeTab === 'world-fans' || activeTab === 'world_fans') && <AdminWorldFans />}
           {(activeTab === 'audit-logs' || activeTab === 'audit_logs') && <AdminAuditLogs />}

           {activeTab === 'backup' && (
             <div className="flex flex-col gap-6 max-w-4xl mx-auto">
               <CloudinaryMigrationManager />

               <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 md:p-8 rounded-[32px] shadow-lg border border-slate-700">
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                     <Database size={28} />
                   </div>
                   <div>
                     <h2 className="text-xl font-black">النسخ الاحتياطي واستعادة البيانات</h2>
                     <p className="text-xs text-slate-300 font-bold">تصدير واسترجاع بيانات الأعضاء، الأخبار، الميديا، والمباريات بالكامل</p>
                   </div>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed font-bold">
                   يمكنك تحميل نسخة كاملة من كافة بيانات التطبيق بصيغة JSON، أو استعادة نسخة احتياطية سابقة لمزامنتها مع قاعدة بيانات التطبيق.
                 </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Export */}
                 <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between">
                   <div className="space-y-3">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                       <Download size={24} />
                     </div>
                     <h3 className="font-black text-base text-slate-800 dark:text-white">تصدير نسخة احتياطية</h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                       تحميل ملف يحتوي على كافة الجداول (الأعضاء، المنشورات، الأخبار، التاريخ، الإعدادات).
                     </p>
                   </div>
                   <button
                     onClick={handleExportDatabase}
                     disabled={isExporting}
                     className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                     <span>{isExporting ? 'جاري تصدير البيانات...' : 'تحميل نسخة احتياطية (JSON)'}</span>
                   </button>
                 </div>

                 {/* Import / Restore */}
                 <div className="bg-white dark:bg-card-dark p-6 rounded-[32px] border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between">
                   <div className="space-y-3">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                       <Upload size={24} />
                     </div>
                     <h3 className="font-black text-base text-slate-800 dark:text-white">استعادة نسخة احتياطية</h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                       رفع ملف النسخة الاحتياطية (JSON) واسترجاع كافة الأعضاء والبيانات المفقودة فوراً.
                     </p>
                   </div>

                   <div>
                     <input
                       type="file"
                       ref={restoreFileInputRef}
                       accept=".json"
                       onChange={handleRestoreDatabase}
                       className="hidden"
                     />
                     <button
                       onClick={() => restoreFileInputRef.current?.click()}
                       disabled={isRestoring}
                       className="mt-6 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                     >
                       {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                       <span>{isRestoring ? 'جاري استعادة البيانات...' : 'اختيار واستعادة ملف النسخة (JSON)'}</span>
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           )}
        </div>
      </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-card-dark w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar no-pull">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-card-dark z-20 py-2 -mt-2">
              <h3 className="text-lg font-bold">
                {isEditing ? 'تعديل' : 'إضافة'} {
                  activeTab === 'club_members' ? (clubSubTab === 'committees' ? 'لجنة' : clubSubTab === 'announcements' ? 'إعلان' : clubSubTab === 'services' ? 'خدمة' : 'رحلة') :
                  activeTab === 'news' ? 'خبر' : 
                  activeTab === 'media' ? 'ميديا' : 
                  activeTab === 'matches' ? 'مباراة' : 
                  activeTab === 'city' ? 'بيانات المدينة' :
                  activeTab === 'clubs' ? 'نادي' : 
                  activeTab === 'products' ? 'منتج' :
                  activeTab === 'history' ? (historySubTab === 'stats' ? 'رقم' : historySubTab === 'titles' ? 'بطولة' : historySubTab === 'timeline' ? 'حدث' : 'ملعب') :
                  'عنصر'
                }
              </h3>
              <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setShowModal(false);
                      setIsEditing(false);
                      setEditingId(null);
                    }} 
                    className="p-2 bg-slate-100 dark:bg-surface-dark text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-border-light dark:border-border-dark"
                    title="إغلاق"
                  >
                    <X size={24} />
                  </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 no-scrollbar text-right">
                {activeTab === 'ai-studio' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block text-right">اسم القميص</label>
                      <input type="text" placeholder="مثلاً: الطقم الأساسي 2024" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold text-right" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <UploadOrUrlField label="صورة القميص" fieldName="url" currentUrl={formData.url} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                    <p className="text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-surface-dark p-3 rounded-xl border border-dashed border-slate-200 text-right">
                      ملاحظة: يفضل أن تكون صورة القميص واضحة وبخلفية شفافة أو بيضاء للحصول على أفضل نتائج في الدمج بالذكاء الاصطناعي.
                    </p>
                  </>
                )}

                {activeTab === 'products' && (
                 <>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم المنتج</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">السعر</label>
                      <input type="number" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.price || ''} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">النوع</label>
                      <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.category || 'tshirt'} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        <option value="tshirt">تيشيرت</option>
                        <option value="mug">مج / كوب</option>
                        <option value="scarf">سكارف</option>
                        <option value="bracelet">حظاظة</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">الوصف</label>
                      <textarea className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold min-h-[100px]" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <UploadOrUrlField label="صورة المنتج" fieldName="imageUrl" currentUrl={formData.imageUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                 </>
               )}

               {activeTab === 'history' && (
                 <>
                   {historySubTab === 'stats' && (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">العنوان (مثل: سنة تاريخ)</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.label || ''} onChange={(e) => setFormData({...formData, label: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">القيمة (الرقم)</label>
                          <input type="number" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.value || ''} onChange={(e) => setFormData({...formData, value: e.target.value})} />
                        </div>
                     </>
                   )}
                   {historySubTab === 'titles' && (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم البطولة</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">العدد</label>
                          <input type="number" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.count || ''} onChange={(e) => setFormData({...formData, count: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">التصنيف</label>
                          <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.category || 'football'} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                            <option value="football">كرة قدم</option>
                            <option value="basketball">كرة سلة</option>
                          </select>
                        </div>
                     </>
                   )}
                   {historySubTab === 'timeline' && (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">السنة</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.year || ''} onChange={(e) => setFormData({...formData, year: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">العنوان</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">الوصف</label>
                          <textarea className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm min-h-[100px]" value={formData.desc || ''} onChange={(e) => setFormData({...formData, desc: e.target.value})} />
                        </div>
                     </>
                   )}
                   {historySubTab === 'stadiums' && (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم الملعب</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">النوع (مثل: أول ملعب)</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.type || ''} onChange={(e) => setFormData({...formData, type: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">الوصف</label>
                          <textarea className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm min-h-[100px]" value={formData.desc || ''} onChange={(e) => setFormData({...formData, desc: e.target.value})} />
                        </div>
                        <UploadOrUrlField label="صورة الملعب" fieldName="imageUrl" currentUrl={formData.imageUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                     </>
                   )}
                   <div className="mt-2">
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">رقم الترتيب (اختياري - يحدد أولوية الظهور)</label>
                     <input 
                       type="number" 
                       placeholder="مثال: 0, 1, 2..." 
                       className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" 
                       value={formData.order ?? ''} 
                       onChange={(e) => setFormData({...formData, order: e.target.value === '' ? undefined : Number(e.target.value)})} 
                     />
                   </div>
                   <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark mt-2">
                     <input 
                       type="checkbox" 
                       id="hide-history-item" 
                       className="w-4 h-4 accent-primary" 
                       checked={formData.hidden || false} 
                       onChange={(e) => setFormData({...formData, hidden: e.target.checked})} 
                     />
                     <label htmlFor="hide-history-item" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">إخفاء هذا العنصر من الموقع الرسمي</label>
                   </div>
                 </>
               )}

               {activeTab === 'music' && (
                 <>
                   {musicSubTab === 'songs' ? (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان الأغنية/التسجيل الصوتي</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">الفنان / المؤدي</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.artist || ''} onChange={(e) => setFormData({...formData, artist: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">التصنيف</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.category || 'chant'} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                               <option value="song">أغاني</option>
                               <option value="chant">تسجيلات صوتية</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">الألبوم التابع له (اختياري)</label>
                            <select 
                              className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" 
                              value={formData.albumId || ''} 
                              onChange={(e) => setFormData({...formData, albumId: e.target.value})}
                            >
                              <option value="">-- بدون ألبوم (أغنية منفردة) --</option>
                              {albums.map(alb => (
                                <option key={alb.id} value={alb.id}>
                                  {alb.title} {alb.year ? `(${alb.year})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <UploadOrUrlField label="رابط الملف الصوتي (MP3)" fieldName="audioUrl" currentUrl={formData.audioUrl} type="audio" formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        <UploadOrUrlField label="صورة الغلاف" fieldName="coverUrl" currentUrl={formData.coverUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                     </>
                   ) : musicSubTab === 'albums' ? (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان الألبوم</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">الفنان / المصدر</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.artist || ''} onChange={(e) => setFormData({...formData, artist: e.target.value})} placeholder="الاتحاد السكندري" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">سنة الإصدار</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.year || ''} onChange={(e) => setFormData({...formData, year: e.target.value})} placeholder="2025" />
                          </div>
                        </div>
                        <UploadOrUrlField label="صورة الغلاف" fieldName="coverUrl" currentUrl={formData.coverUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        
                        <div className="space-y-2 pt-2 border-t border-border-light dark:border-border-dark">
                           <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 block text-right">
                                اختر الأغاني التابعة لهذا الألبوم ({formData.songIds?.length || 0} أغنية محددة)
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, songIds: songs.map(s => s.id) })}
                                  className="text-[10px] text-primary font-black hover:underline cursor-pointer"
                                >
                                  تحديد الكل
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, songIds: [] })}
                                  className="text-[10px] text-slate-400 font-black hover:underline cursor-pointer"
                                >
                                  إلغاء التحديد
                                </button>
                              </div>
                           </div>
                           
                           <div className="max-h-[220px] overflow-y-auto border border-border-light dark:border-border-dark rounded-xl p-2 space-y-1 bg-slate-50/50 dark:bg-surface-dark/50">
                              {songs.map(song => {
                                const isChecked = (formData.songIds || []).includes(song.id);
                                return (
                                  <label 
                                    key={song.id} 
                                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                                      isChecked 
                                        ? 'bg-primary/10 border-primary/30 text-primary-dark dark:text-emerald-300' 
                                        : 'bg-white dark:bg-card-dark border-transparent hover:bg-slate-100 dark:hover:bg-card-dark/80'
                                    }`}
                                  >
                                     <div className="flex items-center gap-3 min-w-0">
                                        <input 
                                         type="checkbox" 
                                         className="w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                                         checked={isChecked} 
                                         onChange={(e) => {
                                           const ids = formData.songIds || [];
                                           if (e.target.checked) setFormData({...formData, songIds: [...ids, song.id]});
                                           else setFormData({...formData, songIds: ids.filter((id: string) => id !== song.id)});
                                         }}
                                        />
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-surface-dark flex items-center justify-center shrink-0 overflow-hidden">
                                           {song.coverUrl && song.coverUrl.trim() !== '' ? (
                                             <img src={song.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                           ) : (
                                             <Music size={14} className="text-slate-400" />
                                           )}
                                        </div>
                                        <div className="min-w-0">
                                           <p className="text-xs font-black truncate text-slate-800 dark:text-white">{song.title}</p>
                                           <p className="text-[10px] text-slate-400 font-bold truncate">{song.artist} • {song.duration || '03:30'}</p>
                                        </div>
                                     </div>
                                     {isChecked && (
                                       <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-white dark:bg-surface-dark rounded-md shrink-0 shadow-xs">
                                         ✓ في الألبوم
                                       </span>
                                     )}
                                  </label>
                                );
                              })}
                              {songs.length === 0 && (
                                <p className="text-[10px] text-slate-400 text-center py-4">لا توجد أغانٍ مسجلة حالياً لاختيارها</p>
                               )}
                           </div>
                        </div>
                     </>
                   ) : (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان قائمة التشغيل</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <UploadOrUrlField label="صورة الغلاف" fieldName="coverUrl" currentUrl={formData.coverUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 block text-right">اختر الأغاني</label>
                           <div className="max-h-[200px] overflow-y-auto border border-border-light dark:border-border-dark rounded-xl p-2 space-y-1">
                              {songs.map(song => (
                                <label key={song.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-card-dark rounded-lg cursor-pointer">
                                   <input 
                                    type="checkbox" 
                                    className="w-4 h-4 accent-primary"
                                    checked={formData.songIds?.includes(song.id)} 
                                    onChange={(e) => {
                                      const ids = formData.songIds || [];
                                      if (e.target.checked) setFormData({...formData, songIds: [...ids, song.id]});
                                      else setFormData({...formData, songIds: ids.filter((id: string) => id !== song.id)});
                                    }}
                                   />
                                   <div className="flex items-center gap-2">
                                      {song.coverUrl && song.coverUrl.trim() !== '' ? (
                                        <img src={song.coverUrl} className="w-6 h-6 rounded object-cover" />
                                      ) : (
                                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                          <Music size={10} className="text-slate-400" />
                                        </div>
                                      )}
                                      <span className="text-[10px] font-bold">{song.title}</span>
                                   </div>
                                </label>
                              ))}
                              {songs.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">لا توجد أغاني لاختيارها</p>}
                           </div>
                        </div>
                     </>
                   )}
                 </>
               )}

               {activeTab === 'books' && (
                 <>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان الكتاب</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">الكاتب / المصدر</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm" value={formData.author || ''} onChange={(e) => setFormData({...formData, author: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط الـ PDF (رابط مباشر أو Google Drive Preview)</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm text-left dir-ltr" value={formData.pdfUrl || ''} onChange={(e) => setFormData({...formData, pdfUrl: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">وصف قصير</label>
                      <textarea className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm min-h-[80px]" value={formData.desc || ''} onChange={(e) => setFormData({...formData, desc: e.target.value})} />
                    </div>
                    <UploadOrUrlField label="صورة الغلاف" fieldName="coverUrl" currentUrl={formData.coverUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                 </>
               )}

               {activeTab === 'news' && (
                 <>
                   {/* Switcher: خبر صحفي أو مقال رأي */}
                   <div className="p-3 bg-slate-100 dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark space-y-2">
                     <label className="text-xs font-black text-slate-800 dark:text-white block">نوع المنشور الإخباري</label>
                     <div className="grid grid-cols-2 gap-2">
                       <button
                         type="button"
                         onClick={() => setFormData({ 
                           ...formData, 
                           newsType: 'news',
                           author: formData.author === 'كاتب ومحلل رياضي' ? 'الموقع الرسمي' : formData.author
                         })}
                         className={`p-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all ${
                           (formData.newsType || 'news') === 'news'
                             ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.01]'
                             : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border-border-light dark:border-border-dark hover:border-primary/50'
                         }`}
                       >
                         <Newspaper size={16} />
                         <span>خبر صحفي</span>
                       </button>

                       <button
                         type="button"
                         onClick={() => setFormData({ 
                           ...formData, 
                           newsType: 'article',
                           category: (formData.category === 'أخبار النادي' || !formData.category) ? 'مقالات وآراء' : formData.category,
                           author: formData.author === 'الموقع الرسمي' ? '' : formData.author
                         })}
                         className={`p-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all ${
                           formData.newsType === 'article'
                             ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20 scale-[1.01]'
                             : 'bg-white dark:bg-surface-dark text-slate-600 dark:text-slate-300 border-border-light dark:border-border-dark hover:border-amber-500/50'
                         }`}
                       >
                         <PenTool size={15} />
                         <span>مقال / رأي وتحليل</span>
                       </button>
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">
                       {formData.newsType === 'article' ? 'عنوان المقال' : 'عنوان الخبر'}
                     </label>
                     <input type="text" placeholder={formData.newsType === 'article' ? "مثلاً: رؤية فنية حول أداء خط الوسط في المواجهات الأخيرة" : "مثلاً: الاتحاد يحقق فوزاً ثميناً"} className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">
                       {formData.newsType === 'article' ? 'نص المقال والتحليل' : 'محتوى الخبر'}
                     </label>
                     <textarea placeholder={formData.newsType === 'article' ? "اكتب نص المقال والتحليل هنا..." : "اكتب تفاصيل الخبر هنا..."} className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm min-h-[140px]" value={formData.content || ''} onChange={(e) => setFormData({...formData, content: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">التصنيف</label>
                      <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-sm font-bold" value={formData.category || (formData.newsType === 'article' ? 'مقالات وآراء' : 'أخبار النادي')} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                          {newsCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          {formData.newsType === 'article' && !newsCategories.includes('مقالات وآراء') && (
                            <option value="مقالات وآراء">مقالات وآراء</option>
                          )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">
                        {formData.newsType === 'article' ? 'اسم كاتب المقال *' : 'مصدر الخبر'}
                      </label>
                      <input 
                        type="text" 
                        placeholder={formData.newsType === 'article' ? "مثلاً: د. أحمد رفعت" : "مثلاً: الموقع الرسمي"} 
                        className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                        value={formData.author || ''} 
                        onChange={(e) => setFormData({...formData, author: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">
                        {formData.newsType === 'article' ? 'صفة الكاتب / التخصص' : 'اسم المحرر'}
                      </label>
                      <input 
                        type="text" 
                        placeholder={formData.newsType === 'article' ? "مثلاً: ناقد ومحلل رياضي" : "مثلاً: أحمد محمد"} 
                        className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" 
                        value={formData.editorName || ''} 
                        onChange={(e) => setFormData({...formData, editorName: e.target.value})} 
                      />
                    </div>
                   </div>
                    <UploadOrUrlField 
                      label={formData.newsType === 'article' ? "صورة المقال أو صورة الكاتب" : "صورة الخبر"} 
                      fieldName="image" 
                      currentUrl={formData.image} 
                      formData={formData} 
                      setFormData={setFormData} 
                      uploading={uploading} 
                      handleFileUpload={handleFileUpload} 
                    />

                    {/* Video Embedding Field (YouTube / Facebook / Direct / Embed Code) */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Play size={15} className="text-red-500 fill-current" />
                          <span>{formData.newsType === 'article' ? 'تضمين فيديو في المقال (رابط أو كود Embed)' : 'تضمين فيديو في الخبر (رابط أو كود Embed)'}</span>
                        </label>
                        {formData.videoUrl && formData.videoUrl.trim() !== '' && (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isEmbedCode(formData.videoUrl)
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : isYouTubeUrl(formData.videoUrl) 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                              : isFacebookUrl(formData.videoUrl)
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {isEmbedCode(formData.videoUrl) ? 'كود Embed (Iframe)' : isYouTubeUrl(formData.videoUrl) ? 'YouTube مُكتشف' : isFacebookUrl(formData.videoUrl) ? 'Facebook مُكتشف' : 'فيديو مباشر'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="relative">
                          {isEmbedCode(formData.videoUrl) ? (
                            <textarea 
                              placeholder="ألصق كود التضمين <iframe> هنا أو رابط الفيديو..." 
                              rows={3}
                              className="w-full p-3 pl-10 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-slate-800 dark:text-white text-xs font-mono text-left dir-ltr shadow-xs" 
                              value={formData.videoUrl || ''} 
                              onChange={(e) => setFormData({...formData, videoUrl: e.target.value})} 
                            />
                          ) : (
                            <input 
                              type="text" 
                              placeholder="ألصق رابط فيديو (YouTube / Facebook) أو كود التضمين <iframe> هنا..." 
                              className="w-full p-3 pl-10 rounded-xl border border-border-light bg-white dark:bg-card-dark dark:border-border-dark text-slate-800 dark:text-white text-xs font-bold text-left dir-ltr shadow-xs" 
                              value={formData.videoUrl || ''} 
                              onChange={(e) => setFormData({...formData, videoUrl: e.target.value})} 
                            />
                          )}
                          <div className="absolute left-3 top-3.5 pointer-events-none text-slate-400">
                            {isEmbedCode(formData.videoUrl) ? (
                              <Code size={18} className="text-purple-500" />
                            ) : isYouTubeUrl(formData.videoUrl) ? (
                              <Youtube size={18} className="text-red-500" />
                            ) : isFacebookUrl(formData.videoUrl) ? (
                              <span className="text-blue-600 font-black text-sm">f</span>
                            ) : (
                              <Video size={18} />
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          يدعم: روابط YouTube، روابط Facebook، أكواد التضمين المباشرة (مثل &lt;iframe&gt; من أي منصة أو موقع)، وملفات الفيديو MP4.
                        </p>
                      </div>

                      {formData.videoUrl && formData.videoUrl.trim() !== '' && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-border-dark/60">
                          <p className="text-[10px] font-black text-slate-500 mb-2">معاينة الفيديو المضمن:</p>
                          <div className="rounded-2xl overflow-hidden border border-border-light dark:border-border-dark">
                            <VideoEmbedWidget 
                              videoUrl={formData.videoUrl} 
                              videoType={formData.videoType || 'auto'}
                              title={formData.title || 'معاينة فيديو الخبر'}
                              subtitle="معاينة فورية داخل لوحة التحكم"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط RSS (لجلب الخبر تلقائياً)</label>
                     <input type="text" placeholder="https://..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.rssUrl || ''} onChange={(e) => setFormData({...formData, rssUrl: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block mt-2">وسوم الخبر</label>
                     <div className="flex flex-wrap gap-2">
                       {useAppStore.getState().newsTags?.map((tag: any) => (
                         <label key={tag.id} className="cursor-pointer flex items-center gap-1 bg-slate-50 dark:bg-surface-dark px-3 py-1.5 rounded-xl border border-slate-100 dark:border-border-dark group active:scale-95 transition-transform">
                           <input 
                             type="checkbox" 
                             checked={formData.tagIds?.includes(tag.id) || false}
                             onChange={(e) => {
                               const currentTags = formData.tagIds || [];
                               if (e.target.checked) setFormData({...formData, tagIds: [...currentTags, tag.id]});
                               else setFormData({...formData, tagIds: currentTags.filter((id: any) => id !== tag.id)});
                             }}
                             className="hidden"
                           />
                           <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                           <span className={`text-xs font-bold ${formData.tagIds?.includes(tag.id) ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{tag.name}</span>
                           {formData.tagIds?.includes(tag.id) && <Check size={12} className="text-primary ml-1" />}
                         </label>
                       ))}
                     </div>
                   </div>
                 </>
               )}

               {activeTab === 'users' && (
                 <>
                   <div className="flex flex-col items-center mb-4">
                     {formData.avatar && formData.avatar.trim() !== '' ? (
                       <img src={formData.avatar} className="w-20 h-20 rounded-full border-2 border-primary mb-2 shadow-lg object-cover" alt="avatar" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200 mb-2 flex items-center justify-center">
                         <UsersIcon size={32} className="text-slate-300" />
                       </div>
                     )}
                     <p className="text-[10px] font-bold text-slate-400 capitalize">{formData.tier || 'new'} Member</p>
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم العضو</label>
                     <input type="text" placeholder="الاسم الجديد" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">البريد الإلكتروني (للعرض فقط)</label>
                     <input type="text" disabled className="w-full p-3 rounded-xl border border-border-light bg-slate-200 dark:bg-slate-800 dark:border-border-dark text-sm opacity-50 cursor-not-allowed text-left dir-ltr" value={formData.email || ''} />
                   </div>
                   <div className="grid grid-cols-2 gap-3 mt-3">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">نوع الحساب الأساسي</label>
                       <select 
                         className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                         value={formData.role || 'user'} 
                         onChange={(e) => {
                           const newRole = e.target.value;
                           let updatedRoles = formData.roles || [];
                           if (newRole === 'admin') {
                             updatedRoles = APP_ROLES.map(r => r.id);
                           } else if (newRole === 'user') {
                             updatedRoles = [];
                           }
                           setFormData({ ...formData, role: newRole, roles: updatedRoles });
                         }}
                       >
                         <option value="user">عضو عادي (بدون لوحة تحكم)</option>
                         <option value="moderator">مشرف مخصص الصلاحيات (Granular)</option>
                         <option value="writer">محرر أخبار</option>
                         <option value="admin">مدير نظام كامل (Super Admin)</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">الرتبة التقديرية (Tier)</label>
                       <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.tier || 'new'} onChange={(e) => setFormData({...formData, tier: e.target.value})}>
                         <option value="new">عضو جديد (New)</option>
                         <option value="bronze">عضو برونزي (Bronze)</option>
                         <option value="silver">عضو فضي (Silver)</option>
                         <option value="gold">عضو ذهبي (Gold)</option>
                         <option value="diamond">عضو ماسي (Diamond)</option>
                         <option value="premium">عضو ملكي (Premium)</option>
                       </select>
                     </div>
                   </div>

                   <div className="mt-4 p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark">
                     <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                       <div>
                         <label className="text-xs font-black text-slate-800 dark:text-white block">الصلاحيات المخصصة للمشرف</label>
                         <span className="text-[10px] text-slate-400 font-bold">حدد الأقسام المسموح لهذا المشرف بالوصول إليها فقط</span>
                       </div>
                       <div className="flex items-center gap-1.5 flex-wrap">
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'admin', roles: APP_ROLES.map(r => r.id) })}
                           className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black transition-all"
                         >
                           منح كل الصلاحيات
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'user', roles: [] })}
                           className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black transition-all"
                         >
                           تفريغ الصلاحيات
                         </button>
                       </div>
                     </div>

                     {/* Quick Role Templates */}
                     <div className="mb-3 p-2.5 bg-white dark:bg-card-dark rounded-xl border border-slate-100 dark:border-border-dark">
                       <p className="text-[10px] font-black text-slate-400 mb-2">قوالب جاهزة سريعة:</p>
                       <div className="flex flex-wrap gap-1.5">
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'moderator', roles: ['news_editor'] })}
                           className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black hover:bg-blue-100 transition-all border border-blue-200 dark:border-blue-500/20"
                         >
                           📰 محرر أخبار
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'moderator', roles: ['matches_editor'] })}
                           className="px-2.5 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-[10px] font-black hover:bg-orange-100 transition-all border border-orange-200 dark:border-orange-500/20"
                         >
                           🏆 مدير مباريات
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'moderator', roles: ['store_editor'] })}
                           className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black hover:bg-emerald-100 transition-all border border-emerald-200 dark:border-emerald-500/20"
                         >
                           🛍️ مدير المتجر
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'moderator', roles: ['media_editor'] })}
                           className="px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg text-[10px] font-black hover:bg-purple-100 transition-all border border-purple-200 dark:border-purple-500/20"
                         >
                           🎬 مدير الوسائط
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'moderator', roles: ['members_editor'] })}
                           className="px-2.5 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg text-[10px] font-black hover:bg-teal-100 transition-all border border-teal-200 dark:border-teal-500/20"
                         >
                           🛡️ خدمات الأعضاء
                         </button>
                         <button
                           type="button"
                           onClick={() => setFormData({ ...formData, role: 'moderator', roles: ['layout_editor'] })}
                           className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black hover:bg-amber-100 transition-all border border-amber-200 dark:border-amber-500/20"
                         >
                           🎨 مدير الواجهة
                         </button>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 gap-2.5">
                       {APP_ROLES.map(role => {
                         const isChecked = formData.roles?.includes(role.id) || formData.role === 'admin';
                         return (
                           <label 
                             key={role.id} 
                             className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                               isChecked 
                                 ? 'bg-primary/5 border-primary shadow-sm dark:bg-primary/10' 
                                 : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark hover:border-slate-300'
                             }`}
                           >
                             <input 
                               type="checkbox"
                               className="hidden"
                               checked={isChecked}
                               onChange={(e) => {
                                 const currentRoles = formData.roles || [];
                                 let newRoles: AppRole[];
                                 if (e.target.checked) {
                                   newRoles = Array.from(new Set([...currentRoles, role.id]));
                                 } else {
                                   newRoles = currentRoles.filter((r: string) => r !== role.id);
                                 }
                                 const newRole = newRoles.length > 0 ? (newRoles.includes('admin') ? 'admin' : 'moderator') : 'user';
                                 setFormData({ ...formData, roles: newRoles, role: newRole });
                               }}
                             />
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                               isChecked ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 dark:bg-surface-dark text-slate-400'
                             }`}>
                               <role.icon size={20} />
                             </div>
                             <div className="flex-1">
                               <div className="flex items-center justify-between">
                                 <p className={`text-xs font-black ${isChecked ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>{role.label}</p>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">{role.id}</span>
                               </div>
                               <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-relaxed">{role.description}</p>
                             </div>
                             <div className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                               isChecked ? 'bg-primary border-primary text-white shadow-sm' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-surface-dark'
                             }`}>
                               {isChecked && <Check size={14} strokeWidth={3.5} />}
                             </div>
                           </label>
                         );
                       })}
                     </div>
                   </div>
                 </>
               )}

               {activeTab === 'layout' && formData.__isCustomPage && (
                 <>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان الصفحة</label>
                     <input type="text" placeholder="عنوان يظهر للأعضاء" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط الصفحة (Slug - تلقائي إذا تُرك فارغاً)</label>
                     <input type="text" placeholder="مثال: my-custom-page" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-mono text-left dir-ltr" value={formData.slug || ''} onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">محتوى الصفحة (HTML أو Iframe)</label>
                     <textarea placeholder="<iframe src='...' width='100%' height='500px' /> أو كود HTML مخصص" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-[10px] font-mono min-h-[200px] text-left dir-ltr" value={formData.content || ''} onChange={(e) => setFormData({...formData, content: e.target.value})} />
                   </div>
                   <div>
                     <label className="flex items-center gap-2 mt-4 cursor-pointer">
                        <input type="checkbox" checked={formData.active ?? true} onChange={(e) => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">عرض الصفحة للجمهور</span>
                     </label>
                   </div>
                 </>
               )}

               {activeTab === 'media' && (
                 <>
                   {mediaSubTab === 'items' ? (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">العنوان</label>
                          <input type="text" placeholder="مثلاً: أهداف مباراة الأمس" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                         <div>
                           <label className="text-[10px] font-black text-slate-500 mb-1 block">النوع</label>
                           <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.type || 'video'} onChange={(e) => setFormData({...formData, type: e.target.value, source: formData.source || 'youtube'})}>
                              <option value="video">فيديو</option>
                              <option value="photo">صورة</option>
                           </select>
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">قائمة التشغيل (اختياري)</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.playlistId || ''} onChange={(e) => setFormData({...formData, playlistId: e.target.value})}>
                               <option value="">بدون قائمة</option>
                               {mediaPlaylists.map(p => (
                                 <option key={p.id} value={p.id}>{p.title}</option>
                               ))}
                            </select>
                          </div>
                        </div>

                        {(formData.type || 'video') === 'video' && (
                          <div className="grid grid-cols-1 gap-2">
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">المصدر</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.source || 'upload'} onChange={(e) => setFormData({...formData, source: e.target.value})}>
                              <option value="upload">رفع فيديو</option>
                              <option value="youtube">رابط يوتيوب</option>
                              <option value="embed">تضمين (Embed URL)</option>
                            </select>
                          </div>
                        )}

                        {(formData.type || 'video') === 'video' && (formData.source || 'youtube') === 'youtube' && (
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط يوتيوب</label>
                            <input 
                              type="text" 
                              placeholder="https://www.youtube.com/watch?v=..." 
                              className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-mono text-left dir-ltr" 
                              value={formData.url || ''} 
                              onChange={(e) => {
                                const url = e.target.value;
                                let thumb = formData.thumbnailUrl;
                                if (url.includes('youtube.com/watch?v=')) {
                                  const id = url.split('v=')[1]?.split('&')[0];
                                  thumb = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
                                } else if (url.includes('youtu.be/')) {
                                  const id = url.split('youtu.be/')[1]?.split('?')[0];
                                  thumb = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
                                }
                                setFormData({...formData, url, thumbnailUrl: thumb, source: 'youtube'});
                              }} 
                            />
                          </div>
                        )}

                        {(formData.type || 'video') === 'video' && (formData.source || 'youtube') === 'upload' && (
                          <UploadOrUrlField label="ملف الفيديو" fieldName="url" currentUrl={formData.url || formData.videoUrl} formData={formData} setFormData={(val) => setFormData({...val, videoUrl: val.url})} uploading={uploading} handleFileUpload={handleFileUpload} type="video" />
                        )}

                        {(formData.type || 'video') === 'video' && (formData.source || 'youtube') === 'embed' && (
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط التضمين (Embed URL)</label>
                            <input 
                              type="text" 
                              placeholder="https://..." 
                              className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-mono text-left dir-ltr" 
                              value={formData.url || ''} 
                              onChange={(e) => setFormData({...formData, url: e.target.value})} 
                            />
                          </div>
                        )}

                        {formData.type === 'photo' && (
                          <UploadOrUrlField label="الصورة" fieldName="url" currentUrl={formData.url} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        )}

                        <div>
                          <UploadOrUrlField label="الصورة المصغرة" fieldName="thumbnailUrl" currentUrl={formData.thumbnailUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        </div>

                        {(formData.type || 'video') === 'video' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 mb-1 block">المدة (مثلاً 04:30)</label>
                              <input type="text" placeholder="00:00" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black text-center" value={formData.duration || ''} onChange={(e) => setFormData({...formData, duration: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-500 mb-1 block">عدد المشاهدات</label>
                              <input type="number" placeholder="0" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black text-center" value={formData.views || '0'} onChange={(e) => setFormData({...formData, views: e.target.value})} />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl mt-2">
                          <input 
                            type="checkbox" 
                            id="isFeaturedMediaCheckbox"
                            checked={formData.isFeatured ?? false} 
                            onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})} 
                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer" 
                          />
                          <label htmlFor="isFeaturedMediaCheckbox" className="text-xs font-black text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 select-none">
                            <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                            <span>تعيين كعنصر مميز (يظهر كفيديو أو صورة مميزة بالمرئيات والمكتبة)</span>
                          </label>
                        </div>
                     </>
                   ) : (
                     <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم القائمة</label>
                          <input type="text" placeholder="مثلاً: ذكريات الزمن الجميل" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">نوع القائمة</label>
                          <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.type || 'video'} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                             <option value="video">قائمة فيديو</option>
                             <option value="photo">قائمة صور</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">وصف القائمة</label>
                          <textarea placeholder="وصف يعبر عن محتوى القائمة..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold min-h-[100px]" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div>
                          <UploadOrUrlField label="غلاف القائمة" fieldName="coverUrl" currentUrl={formData.coverUrl} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        </div>
                        
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 block text-right">محتوى القائمة (اختر الفيديوهات/الصور)</label>
                           <div className="max-h-[250px] overflow-y-auto border border-border-light dark:border-border-dark rounded-2xl p-2.5 space-y-2 bg-slate-50/50 dark:bg-surface-dark">
                              {media.map(item => (
                                <label key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${formData.selectedMediaIds?.includes(item.id) ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white dark:bg-card-dark border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                   <div className="relative">
                                     <input 
                                      type="checkbox" 
                                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                                      checked={formData.selectedMediaIds?.includes(item.id)} 
                                      onChange={(e) => {
                                        const ids = formData.selectedMediaIds || [];
                                        if (e.target.checked) setFormData({...formData, selectedMediaIds: [...ids, item.id]});
                                        else setFormData({...formData, selectedMediaIds: ids.filter((id: string) => id !== item.id)});
                                      }}
                                     />
                                   </div>
                                   <div className="relative w-12 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 shadow-sm">
                                      {item.thumbnailUrl ? (
                                        <img src={item.thumbnailUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                          <PlayCircle size={16} className="text-slate-300" />
                                        </div>
                                      )}
                                      <div className="absolute top-1 right-1">
                                        <span className={`text-[6px] px-1 py-0.5 rounded shadow-sm text-white font-black uppercase ${item.type === 'video' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                          {item.type === 'video' ? 'فيديو' : 'صورة'}
                                        </span>
                                      </div>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className={`text-[10px] font-black truncate ${formData.selectedMediaIds?.includes(item.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{item.title}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] text-slate-400 font-bold">{new Date(item.date).toLocaleDateString('ar-EG')}</span>
                                        {item.playlistId && item.playlistId !== editingId && (
                                          <span className="text-[8px] text-orange-500 font-bold flex items-center gap-0.5 leading-none">
                                            <Layers size={8} />
                                            موجود في قائمة أخرى
                                          </span>
                                        )}
                                      </div>
                                   </div>
                                   {formData.selectedMediaIds?.includes(item.id) && (
                                     <div className="bg-primary text-white p-1 rounded-full">
                                       <Check size={10} strokeWidth={4} />
                                     </div>
                                   )}
                                </label>
                              ))}
                              {media.length === 0 && (
                                <div className="text-center py-10 opacity-50">
                                   <PlayCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                   <p className="text-[10px] text-slate-400 font-bold">لا توجد ميديا متاحة للإضافة</p>
                                </div>
                              )}
                           </div>
                           <p className="text-[9px] text-slate-400 font-bold px-1">سيتم ربط الميديا المختارة بهذه القائمة تلقائياً عند الحفظ.</p>
                        </div>
                     </>
                   )}
                 </>
               )}
               
                {activeTab === 'city' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم المدينة</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.cityName || ''} onChange={(e) => setFormData({...formData, cityName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-black text-slate-500 mb-1 block">درجة الحرارة</label>
                         <input type="text" placeholder="مثلاً: 25" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.temperature || ''} onChange={(e) => setFormData({...formData, temperature: e.target.value})} />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-500 mb-1 block">حالة الطقس</label>
                         <input type="text" placeholder="مثلاً: صافي / غائم جزئياً" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.condition || ''} onChange={(e) => setFormData({...formData, condition: e.target.value})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-black text-slate-500 mb-1 block">وقت الشروق</label>
                         <input type="text" placeholder="06:30 AM" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black tabular-nums" value={formData.sunrise || ''} onChange={(e) => setFormData({...formData, sunrise: e.target.value})} />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-500 mb-1 block">وقت الغروب</label>
                         <input type="text" placeholder="07:15 PM" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black tabular-nums" value={formData.sunset || ''} onChange={(e) => setFormData({...formData, sunset: e.target.value})} />
                       </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-1 block">وصف للمدينة</label>
                      <textarea className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm min-h-[100px]" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <UploadOrUrlField label="صورة الغلاف للمدينة" fieldName="image" currentUrl={formData.image} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                    <UploadOrUrlField label="خلفية بطاقة الطقس" fieldName="weatherBg" currentUrl={formData.weatherBg} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                        <input type="checkbox" id="cityActive" checked={formData.active ?? true} onChange={(e) => setFormData({...formData, active: e.target.checked})} />
                        <label htmlFor="cityActive" className="text-xs font-bold cursor-pointer">تفعيل عرض بطاقة المدينة في الصفحة الرئيسية</label>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                        <input type="checkbox" id="cityAutoWeather" checked={formData.useAutoWeather ?? true} onChange={(e) => setFormData({...formData, useAutoWeather: e.target.checked})} />
                        <label htmlFor="cityAutoWeather" className="text-xs font-bold cursor-pointer">ترتبيط تلقائي للطقس من الإنترنت (Open-Meteo)</label>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'matches' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block">الرياضة</label>
                        <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.sport || 'football'} onChange={(e) => setFormData({...formData, sport: e.target.value})}>
                           <option value="football">كرة قدم</option>
                           <option value="basketball">كرة سلة</option>
                        </select>
                      </div>
                      <div className="opacity-0 pointer-events-none">Placeholder</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 relative" ref={searchRef}>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block">الفريق المضيف</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="الفريق المضيف" 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                            value={formData.homeTeam || ''} 
                            onFocus={() => {
                              setActiveSearchField('home');
                              setClubSearchQuery(formData.homeTeam || '');
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setClubSearchQuery(val);
                              const matchedClub = clubs.find(c => c.name === val);
                              setFormData({...formData, homeTeam: val, ...(matchedClub?.logo ? { homeLogo: matchedClub.logo } : {})});
                            }} 
                          />
                          {activeSearchField === 'home' && clubSearchQuery.length > 0 && (
                            <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-premium max-h-48 overflow-y-auto">
                              {clubs.filter(c => c.name.toLowerCase().includes(clubSearchQuery.toLowerCase())).map((club) => (
                                <button
                                  key={club.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({...formData, homeTeam: club.name, homeLogo: club.logo});
                                    setActiveSearchField(null);
                                  }}
                                  className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-surface-dark border-b border-border-light last:border-0"
                                >
                                  <img src={club.logo} className="w-6 h-6 object-contain" alt="" />
                                  <span className="text-xs font-bold">{club.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block">الفريق الخصم</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="الفريق الخصم" 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                            value={formData.awayTeam || ''} 
                            onFocus={() => {
                              setActiveSearchField('away');
                              setClubSearchQuery(formData.awayTeam || '');
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              setClubSearchQuery(val);
                              const matchedClub = clubs.find(c => c.name === val);
                              setFormData({...formData, awayTeam: val, ...(matchedClub?.logo ? { awayLogo: matchedClub.logo } : {})});
                            }} 
                          />
                          {activeSearchField === 'away' && clubSearchQuery.length > 0 && (
                            <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-premium max-h-48 overflow-y-auto">
                              {clubs.filter(c => c.name.toLowerCase().includes(clubSearchQuery.toLowerCase())).map((club) => (
                                <button
                                  key={club.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({...formData, awayTeam: club.name, awayLogo: club.logo});
                                    setActiveSearchField(null);
                                  }}
                                  className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-surface-dark border-b border-border-light last:border-0"
                                >
                                  <img src={club.logo} className="w-6 h-6 object-contain" alt="" />
                                  <span className="text-xs font-bold">{club.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <UploadOrUrlField label="لوجو صاحب الأرض" fieldName="homeLogo" currentUrl={formData.homeLogo} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} skipResize={true} />
                     </div>
                     <div>
                       <UploadOrUrlField label="لوجو الخصم" fieldName="awayLogo" currentUrl={formData.awayLogo} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} skipResize={true} />
                     </div>
                   </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block">أهدافنا</label>
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            placeholder="0" 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                            value={formData.homeScore ?? ''} 
                            onChange={(e) => setFormData({...formData, homeScore: e.target.value})} 
                          />
                          {formData.sport === 'basketball' && (
                            <div className="flex gap-1">
                              {[1, 2, 3].map(n => (
                                <button key={n} type="button" onClick={() => setFormData({...formData, homeScore: String(parseInt(formData.homeScore || '0') + n)})} className="flex-1 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold">+{n}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block">أهداف الخصم</label>
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            placeholder="0" 
                            className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                            value={formData.awayScore ?? ''} 
                            onChange={(e) => setFormData({...formData, awayScore: e.target.value})} 
                          />
                          {formData.sport === 'basketball' && (
                            <div className="flex gap-1">
                              {[1, 2, 3].map(n => (
                                <button key={n} type="button" onClick={() => setFormData({...formData, awayScore: String(parseInt(formData.awayScore || '0') + n)})} className="flex-1 py-1 bg-orange-500/10 text-orange-600 rounded-lg text-[10px] font-bold">+{n}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">الحالة</label>
                       <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.status || 'upcoming'} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                          <option value="upcoming">قادمة</option>
                          <option value="live">مباشر</option>
                          <option value="finished">منتهية</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">
                         {formData.sport === 'basketball' ? 'الدقيقة الابتدائية للعد التنازلي' : 'الدقيقة الحالية'}
                       </label>
                       <input 
                         type="number" 
                         placeholder={formData.sport === 'basketball' ? '10' : '0'} 
                         className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                         value={formData.timerBaseMinute ?? (formData.sport === 'basketball' ? 10 : 0)} 
                         onChange={(e) => setFormData({...formData, timerBaseMinute: e.target.value})} 
                       />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">البطولة</label>
                       <input type="text" placeholder="البطولة" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.competition || ''} onChange={(e) => setFormData({...formData, competition: e.target.value})} />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">الملعب</label>
                       <input type="text" placeholder="الملعب" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.stadium || ''} onChange={(e) => setFormData({...formData, stadium: e.target.value})} />
                     </div>
                   </div>
                   <div className="mt-4 mb-4">
                     <UploadOrUrlField label="صورة الملعب" fieldName="stadiumImage" currentUrl={formData.stadiumImage} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                    <div className="mt-2 text-right">
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">شفافية خلفية الملعب (0.0 - 1.0)</label>
                       <div className="flex items-center gap-3">
                         <input 
                           type="range" 
                           min="0" 
                           max="1" 
                           step="0.05"
                           className="flex-1 accent-primary"
                           value={formData.stadiumOpacity ?? 0.2}
                           onChange={(e) => setFormData({...formData, stadiumOpacity: parseFloat(e.target.value)})}
                         />
                         <span className="text-xs font-black tabular-nums w-8">{(formData.stadiumOpacity ?? 0.2).toFixed(2)}</span>
                       </div>
                    </div>
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-500 mb-1 block">تاريخ ووقت المباراة (بتوقيت مصر)</label>
                     <input type="datetime-local" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.date && !isNaN(new Date(formData.date).getTime()) ? formatInTimeZone(new Date(formData.date), 'Africa/Cairo', 'yyyy-MM-dd\'T\'HH:mm') : ''} onChange={(e) => setFormData({...formData, date: e.target.value ? fromZonedTime(e.target.value, 'Africa/Cairo').toISOString() : ''})} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                       <div className="flex items-center gap-3 p-4 bg-slate-100/50 dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark group cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all">
                          <input 
                            type="checkbox" 
                            id="matchFeatured" 
                            className="w-5 h-5 rounded-lg border-border-light text-primary focus:ring-primary h-5 w-5"
                            checked={formData.featured || false} 
                            onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                          />
                          <label htmlFor="matchFeatured" className="flex-1 cursor-pointer">
                             <p className="text-xs font-black text-slate-800 dark:text-white">تمييز المباراة (Featured)</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase">Show in prominent hero slider</p>
                          </label>
                          <Star size={18} className={formData.featured ? 'text-yellow-500 fill-current' : 'text-slate-300'} />
                       </div>

                       <div className="flex items-center gap-3 p-4 bg-slate-100/50 dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark group cursor-pointer hover:bg-accent/5 hover:border-accent/20 transition-all">
                          <input 
                            type="checkbox" 
                            id="isMatchDay" 
                            className="w-5 h-5 rounded-lg border-border-light text-accent focus:ring-accent h-5 w-5"
                            checked={formData.isMatchDay || false} 
                            onChange={(e) => setFormData({...formData, isMatchDay: e.target.checked})}
                          />
                          <label htmlFor="isMatchDay" className="flex-1 cursor-pointer">
                             <p className="text-xs font-black text-slate-800 dark:text-white">جعلها مباراة اليوم (Match Day)</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase">Activate match-day specific UI</p>
                          </label>
                          <Zap size={18} className={formData.isMatchDay ? 'text-accent fill-current' : 'text-slate-300'} />
                       </div>
                    </div>
                   </div>
                  </>
                )}

                {activeTab === 'club_members' && (
                  <>
                    {clubSubTab === 'committees' && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم اللجنة</label>
                          <input type="text" placeholder="مثلاً: اللجنة الثقافية والاجتماعية" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">رئيس اللجنة</label>
                            <input type="text" placeholder="اسم رئيس اللجنة" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.president || ''} onChange={(e) => setFormData({...formData, president: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">نائب رئيس اللجنة</label>
                            <input type="text" placeholder="اسم نائب رئيس اللجنة" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.vicePresident || ''} onChange={(e) => setFormData({...formData, vicePresident: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">وصف اللجنة وأنشطتها</label>
                          <textarea placeholder="توضيح لأهداف وااختصاصات اللجنة..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold min-h-[100px]" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <UploadOrUrlField label="صورة اللجنة / الهيدر" fieldName="image" currentUrl={formData.image} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">الترتيب</label>
                            <input type="number" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.order || 1} onChange={(e) => setFormData({...formData, order: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">الحالة</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.status || 'active'} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                              <option value="active">نشطة</option>
                              <option value="inactive">غير نشطة</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {clubSubTab === 'announcements' && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان الإعلان</label>
                          <input type="text" placeholder="عنوان الإعلان أو التنويه" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">نص الإعلان</label>
                          <textarea placeholder="اكتب التفاصيل الكاملة للإعلان..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm min-h-[120px]" value={formData.content || ''} onChange={(e) => setFormData({...formData, content: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">اللجنة التابعة (اختياري)</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.committeeId || ''} onChange={(e) => setFormData({...formData, committeeId: e.target.value})}>
                              <option value="">إعلان عام للأعضاء</option>
                              {committeesList.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">الأهمية</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.priority || 'normal'} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                              <option value="normal">عادي</option>
                              <option value="important">هام ⭐</option>
                              <option value="urgent">عاجل 🚨</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">التصنيف / الوسم</label>
                          <input type="text" placeholder="مثلاً: تنويه مهم، نشاط صيفي..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                        </div>
                        <UploadOrUrlField label="صورة مرفقة بالإعلان" fieldName="image" currentUrl={formData.image} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                          <input type="checkbox" id="annPinned" checked={formData.pinned || false} onChange={(e) => setFormData({...formData, pinned: e.target.checked})} />
                          <label htmlFor="annPinned" className="text-xs font-bold cursor-pointer">تثبيت الإعلان في أعلى القائمة 📌</label>
                        </div>
                      </>
                    )}

                    {clubSubTab === 'services' && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم الخدمة</label>
                          <input type="text" placeholder="مثلاً: استخراج الفيش الجنائي" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">تصنيف الخدمة</label>
                            <input type="text" placeholder="خدمات حكومية، رياضة، ترفيه..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">رقم التليفون / الاستفسار</label>
                            <input type="text" placeholder="01200000000" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">موقع تقديم الخدمة</label>
                            <input type="text" placeholder="مقر الشاطبي - المبنى الإداري" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">مواعيد العمل</label>
                            <input type="text" placeholder="يومياً من 9 ص إلى 3 م" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.workingHours || ''} onChange={(e) => setFormData({...formData, workingHours: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">وصف الخدمة</label>
                          <textarea placeholder="شرح مبسط للخدمة..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold min-h-[80px]" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">المستندات والأوراق المطلوبة</label>
                          <textarea placeholder="• بطاقة الرقم القومي&#10;• صورة شخصية..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm min-h-[90px]" value={formData.requirements || ''} onChange={(e) => setFormData({...formData, requirements: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط الحجز الإلكتروني (اختياري)</label>
                            <input type="url" placeholder="https://..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.bookingUrl || ''} onChange={(e) => setFormData({...formData, bookingUrl: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">نص زر الحجز</label>
                            <input type="text" placeholder="حجز الخدمة إلكترونياً" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.bookingText || ''} onChange={(e) => setFormData({...formData, bookingText: e.target.value})} />
                          </div>
                        </div>
                        <UploadOrUrlField label="صورة تظهر للخدمة" fieldName="image" currentUrl={formData.image} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                      </>
                    )}

                    {clubSubTab === 'trips' && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">عنوان الرحلة</label>
                          <input type="text" placeholder="مثلاً: رحلة الأقصر وأسوان الشتوية" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">الوجهة / المدينة</label>
                            <input type="text" placeholder="الأقصر وأسوان، شرم الشيخ..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.destination || ''} onChange={(e) => setFormData({...formData, destination: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">حالة الحجز والرحلة</label>
                            <select className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.status || 'upcoming'} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                              <option value="upcoming">🚌 متاحة للحجز</option>
                              <option value="ongoing">⏳ جارية حالياً</option>
                              <option value="completed">✅ منتهية</option>
                              <option value="cancelled">❌ ملغاة</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">تاريخ بداية الرحلة</label>
                            <input type="date" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.startDate || ''} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">تاريخ العودة</label>
                            <input type="date" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.endDate || ''} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">سعر الاشتراك للعضو (ج.م)</label>
                            <input type="number" placeholder="4500" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black text-primary" value={formData.priceMember ?? ''} onChange={(e) => setFormData({...formData, priceMember: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">سعر الاشتراك للمرافق (ج.م)</label>
                            <input type="number" placeholder="5200" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black" value={formData.priceNonMember ?? ''} onChange={(e) => setFormData({...formData, priceNonMember: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">وصف وتفاصيل الرحلة</label>
                          <textarea placeholder="برنامج ونظام الإقامة والانتقالات..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-medium min-h-[90px]" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">مميزات وبرنامج الرحلة</label>
                          <textarea placeholder="• إقامة فندقية 5 نجوم&#10;• وجبات بوفيه مفتوح&#10;• مزارات سياحية..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-medium min-h-[90px]" value={formData.features || ''} onChange={(e) => setFormData({...formData, features: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">الشروط والأوراق المطلوبة للحجز</label>
                          <textarea placeholder="• صورة بطاقة الرقم القومي&#10;• صورة كارنيه العضوية مجدد..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-medium min-h-[90px]" value={formData.requirements || ''} onChange={(e) => setFormData({...formData, requirements: e.target.value})} />
                        </div>
                        <UploadOrUrlField label="صورة غلاف للرحلة" fieldName="image" currentUrl={formData.image} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} />
                      </>
                    )}

                    {clubSubTab === 'discounts' && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم مقدم الخدمة / الجهة</label>
                          <input type="text" placeholder="مثلاً: مستشفى السلامة بالأسكندرية" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">التصنيف الرئيسي</label>
                            <input type="text" placeholder="مستشفيات، معامل، أسنان، صيدليات..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">المنطقة / الفرع</label>
                            <input type="text" placeholder="سموحة، الشاطبي، محرم بك..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">العنوان التفصيلي</label>
                          <input type="text" placeholder="شارع فوزي معاذ - سموحة" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 mb-1 block">تفاصيل الخصم ونسب الخصم</label>
                          <textarea placeholder="خصم 20% على الكشف والمعامل..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold min-h-[90px]" value={formData.discountDetails || ''} onChange={(e) => setFormData({...formData, discountDetails: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">أرقام التواصل والتليفون</label>
                            <input type="text" placeholder="03-1234567 / 01200000000" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.phoneNumbers || ''} onChange={(e) => setFormData({...formData, phoneNumbers: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-500 mb-1 block">رابط خرائط جوجل (Google Maps URL)</label>
                            <input type="text" placeholder="https://maps.google.com/..." className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.mapsUrl || ''} onChange={(e) => setFormData({...formData, mapsUrl: e.target.value})} />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {activeTab === 'clubs' && (
                   <>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم النادي</label>
                       <input type="text" placeholder="مثلاً: نادي الاتحاد" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                     </div>
                     <div>
                      <UploadOrUrlField label="شعار النادي" fieldName="logo" currentUrl={formData.logo} formData={formData} setFormData={setFormData} uploading={uploading} handleFileUpload={handleFileUpload} skipResize={true} />

                     </div>
                   </>
                 )}

                  {activeTab === 'polls' && (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block">سؤال الاستطلاع</label>
                        <input type="text" placeholder="مثلاً: من هو أفضل لاعب هذا الشهر؟" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.question || ''} onChange={(e) => setFormData({...formData, question: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-1 block uppercase">خيارات الاستطلاع</label>
                        <div className="space-y-2">
                          {(Array.isArray(formData.options) ? formData.options : ['', '']).map((option: string, idx: number) => (
                             <div key={idx} className="flex gap-2">
                               <div className="flex flex-col gap-1 flex-1">
                                 <label className="text-[8px] font-bold text-slate-400 uppercase px-1">الخيار {idx + 1}</label>
                                 <input 
                                   type="text" 
                                   placeholder={`الخيار ${idx + 1}`}
                                   className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" 
                                   value={option || ''} 
                                   onChange={(e) => {
                                     const newOptions = [...(formData.options || ['', ''])];
                                     newOptions[idx] = e.target.value;
                                     setFormData({...formData, options: newOptions});
                                   }} 
                                 />
                               </div>
                               <div className="w-20">
                                 <label className="text-[8px] font-bold text-slate-400 uppercase px-1">الأصوات</label>
                                 <input 
                                   type="number" 
                                   className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-black text-primary text-center" 
                                   value={formData.votes?.[idx] || 0} 
                                   onChange={(e) => {
                                     const newVotes = { ...(formData.votes || {}) };
                                     newVotes[idx] = Number(e.target.value);
                                     setFormData({...formData, votes: newVotes});
                                   }}
                                 />
                               </div>
                               {((formData.options?.length || 0) > 2) && (
                                <button 
                                  onClick={() => {
                                    const newOptions = [...(formData.options || [])];
                                    newOptions.splice(idx, 1);
                                    setFormData({...formData, options: newOptions});
                                  }}
                                  className="px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                         ))}
                         <button 
                           onClick={() => {
                             const newOptions = Array.isArray(formData.options) ? [...formData.options] : ['', ''];
                             newOptions.push('');
                             setFormData({...formData, options: newOptions});
                           }}
                           className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-border-dark rounded-xl text-[10px] font-black text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-1"
                         >
                           <Plus size={12} />
                           إضافة خيار
                         </button>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="pollActive" 
                          checked={formData.active ?? true} 
                          onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        />
                        <label htmlFor="pollActive" className="text-xs font-bold font-sans dark:text-white">تفعيل الاستطلاع ليظهر للمشجعين</label>
                     </div>
                   </>
                 )}

                 {activeTab === 'predictions' && (
                   <>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">المباراة</label>
                       <select 
                        className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold"
                        value={formData.matchId || ''}
                        onChange={(e) => setFormData({...formData, matchId: e.target.value})}
                       >
                         <option value="">اختر المباراة</option>
                         {matches.map(m => (
                           <option key={m.id} value={m.id}>{m.homeTeam} × {m.awayTeam} ({new Date(m.date).toLocaleDateString('ar-EG')})</option>
                         ))}
                       </select>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-black text-slate-500 mb-1 block">أهداف الفريق 1</label>
                         <input type="number" placeholder="0" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.homeScore ?? ''} onChange={(e) => setFormData({...formData, homeScore: Number(e.target.value)})} />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-500 mb-1 block">أهداف الفريق 2</label>
                         <input type="number" placeholder="0" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm font-bold" value={formData.awayScore ?? ''} onChange={(e) => setFormData({...formData, awayScore: Number(e.target.value)})} />
                       </div>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">اسم المتوقع</label>
                       <input type="text" placeholder="مثلاً: محمد علي" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.userName || ''} onChange={(e) => setFormData({...formData, userName: e.target.value})} />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 mb-1 block">البريد الإلكتروني (اختياري)</label>
                       <input type="email" placeholder="email@example.com" className="w-full p-3 rounded-xl border border-border-light bg-slate-50 dark:bg-surface-dark dark:border-border-dark text-slate-800 dark:text-white text-sm" value={formData.userEmail || ''} onChange={(e) => setFormData({...formData, userEmail: e.target.value})} />
                     </div>
                   </>
                 )}
            </div>

            <button 
              onClick={() => {
                if (window.confirm(isEditing ? 'هل أنت متأكد من حفظ التعديلات؟' : 'هل أنت متأكد من الإضافة؟')) {
                  handleAdd();
                }
              }} 
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm mt-6 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {isEditing ? 'تعديل وحفظ' : 'إضافة وحفظ'}
            </button>
          </div>
        </div>
      )}

      {/* CSV Matches Importer Modal */}
      <CsvMatchesImporter 
        isOpen={isCsvImporterOpen} 
        onClose={() => setIsCsvImporterOpen(false)} 
        onSuccess={() => {
          toast.success('تم تحديث جدول المباريات في لوحة التحكم');
        }}
      />

      {/* CSV Videos Importer Modal */}
      <CsvVideosImporter 
        isOpen={isCsvVideosImporterOpen} 
        onClose={() => setIsCsvVideosImporterOpen(false)} 
        defaultDestination="media"
      />
    </div>
  );
}
