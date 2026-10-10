import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Music, 
  BookOpen, 
  Play, 
  Pause, 
  Search, 
  Clock, 
  Star,
  Download,
  Share2,
  Headphones,
  Disc,
  Library as LibraryIcon,
  Book as BookIcon,
  Maximize2,
  Minimize2,
  X,
  Image as ImageIcon,
  Video,
  Heart,
  Eye,
  Calendar,
  Sparkles,
  Radio,
  Layers,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Sliders,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppStore } from '../store';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getOptimizedImage } from '../lib/cloudinary';

type TabType = 'photos' | 'videos' | 'songs' | 'books';

const safeFormatDate = (dateVal: any, formatStr = 'dd MMMM yyyy') => {
  if (!dateVal) return '';
  try {
    let d: Date;
    if (typeof dateVal?.toDate === 'function') {
      d = dateVal.toDate();
    } else if (typeof dateVal === 'object' && dateVal !== null && typeof dateVal.seconds === 'number') {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return '';
    return format(d, formatStr, { locale: ar });
  } catch (err) {
    return '';
  }
};

const isLikedByUser = (likes: any, uid: string | undefined) => {
  if (!uid || !Array.isArray(likes)) return false;
  return likes.includes(uid);
};

const getLikesCount = (likes: any) => {
  if (Array.isArray(likes)) return likes.length;
  if (typeof likes === 'number') return likes;
  return 0;
};

const getViewsCount = (views: any): number => {
  if (views === undefined || views === null) return 0;
  if (typeof views === 'number') return views;
  const num = parseInt(views, 10);
  return isNaN(num) ? 0 : num;
};

export default function Library() {
  const { 
    songs, 
    setSongs, 
    books, 
    setBooks, 
    albums, 
    setAlbums, 
    media,
    setMedia,
    mediaPlaylists,
    setMediaPlaylists,
    news,
    fanPosts,
    stadiums,
    historyEvents,
    matches,
    products,
    ads,
    clubs,
    currentSong, 
    setCurrentSong, 
    setIsPlaying, 
    isPlaying,
    setActivePlaylist,
    appSettings 
  } = useAppStore();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab management from URL param
  const getTabFromParam = (param: string | null): TabType => {
    if (param === 'photo' || param === 'photos') return 'photos';
    if (param === 'video' || param === 'videos') return 'videos';
    if (param === 'music' || param === 'songs') return 'songs';
    if (param === 'book' || param === 'books') return 'books';
    return 'photos';
  };

  const [activeTab, setActiveTabState] = useState<TabType>(getTabFromParam(searchParams.get('tab')));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  // Modals state
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [isBookLoading, setIsBookLoading] = useState(true);

  // Book reader enhanced controls state
  const [bookPage, setBookPage] = useState<number>(1);
  const [bookZoom, setBookZoom] = useState<number>(100);
  const [bookViewMode, setBookViewMode] = useState<'fit-width' | 'fit-height' | 'single'>('fit-width');
  const [bookPageInput, setBookPageInput] = useState<string>('1');
  const [isFullscreenBook, setIsFullscreenBook] = useState<boolean>(false);

  // Reset book reader state when a book is selected
  const handleOpenBook = (book: any) => {
    setSelectedBook(book);
    setBookPage(1);
    setBookPageInput('1');
    setBookZoom(100);
    setBookViewMode('fit-width');
    setIsBookLoading(true);
    setIsFullscreenBook(false);
  };

  // Filters
  const [songFilterCategory, setSongFilterCategory] = useState<string>('all');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Scroll refs for horizontal scroll bars
  const mainTabsRef = React.useRef<HTMLDivElement>(null);
  const photoPlaylistsRef = React.useRef<HTMLDivElement>(null);
  const videoPlaylistsRef = React.useRef<HTMLDivElement>(null);
  const songCategoriesRef = React.useRef<HTMLDivElement>(null);
  const albumsRef = React.useRef<HTMLDivElement>(null);

  const scrollHorizontally = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 220;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const currentTab = getTabFromParam(searchParams.get('tab'));
    if (currentTab !== activeTab) {
      setActiveTabState(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTabState(tab);
    setSelectedPlaylistId(null);
    setSearchParams({ tab }, { replace: true });
  };

  const handleDownload = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenVideo = (videoItem: any) => {
    setSelectedVideo(videoItem);
    if (videoItem?.id && typeof videoItem.id === 'string' && !videoItem.id.startsWith('media_video_')) {
      try {
        updateDoc(doc(db, 'media', videoItem.id), {
          views: increment(1)
        }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleOpenPhoto = (photoItem: any) => {
    setSelectedPhoto(photoItem);
    if (photoItem?.id && typeof photoItem.id === 'string' && !photoItem.id.startsWith('media_photo_')) {
      try {
        updateDoc(doc(db, 'media', photoItem.id), {
          views: increment(1)
        }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleLikeMedia = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!auth.currentUser) return toast.error('يرجى تسجيل الدخول أولاً للمشاركة والتفاعل');
    
    if (typeof item.id === 'string' && item.id.includes('-') && !item.id.startsWith('media-')) {
      toast('يمكنك التفاعل والإعجاب بهذه الصورة من قسمها الأصلي');
      return;
    }

    const likesArray = Array.isArray(item.likes) ? item.likes : [];
    const hasLiked = auth.currentUser?.uid ? likesArray.includes(auth.currentUser.uid) : false;
    try {
      await updateDoc(doc(db, 'media', item.id), {
        likes: hasLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
      toast.success(hasLiked ? 'تم إزالة الإعجاب' : 'تم إضافة الإعجاب');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  // Effective media items strictly from user data
  const effectiveMedia = media || [];
  const effectiveMediaPlaylists = mediaPlaylists || [];
  const effectiveSongs = songs || [];
  const effectiveBooks = books || [];
  const effectiveAlbums = albums || [];

  // Photos strictly from Media section, sorted newest first
  const mediaPhotos = effectiveMedia
    .filter(m => m.type === 'photo' || (m.type as string) === 'image' || (m.type as string) === 'photos' || (!m.videoUrl && m.type !== 'video'))
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : ((a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0);
      const timeB = b.date ? new Date(b.date).getTime() : ((b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0);
      return timeB - timeA;
    });

  // Filter based on playlist selection or search query
  const photos = mediaPhotos.filter(m => {
    if (selectedPlaylistId && m.playlistId !== selectedPlaylistId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      if (!matchTitle) return false;
    }
    return true;
  });

  const videos = effectiveMedia.filter(m => 
    m.type === 'video' && 
    (!selectedPlaylistId || m.playlistId === selectedPlaylistId) &&
    (m.title?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const featuredVideo = !selectedPlaylistId && videos.length > 0 
    ? (videos.find(v => v.isFeatured) || videos[0]) 
    : null;

  const featuredPhoto = !selectedPlaylistId && photos.length > 0 
    ? (photos.find(p => p.isFeatured) || null) 
    : null;

  const filteredSongs = effectiveSongs.filter(s => {
    const matchesSearch = (s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = songFilterCategory === 'all' || s.category === songFilterCategory;
    const matchesAlbum = !selectedAlbumId || s.albumId === selectedAlbumId || effectiveAlbums.find(a => a.id === selectedAlbumId)?.songIds?.includes(s.id);
    return matchesSearch && matchesCategory && matchesAlbum;
  });

  const filteredBooks = effectiveBooks.filter(b => 
    (b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || b.author?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const photoPlaylists = effectiveMediaPlaylists.filter(p => (p.type as string) === 'photo' || (p.type as string) === 'all');
  const videoPlaylists = effectiveMediaPlaylists.filter(p => (p.type as string) === 'video' || (p.type as string) === 'all');

  const handlePlaySong = (song: any) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setActivePlaylist(filteredSongs);
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handlePlayAlbum = (e: React.MouseEvent, album: any) => {
    e.stopPropagation();
    const albumSongs = effectiveSongs.filter(s => s.albumId === album.id || album.songIds?.includes(s.id));
    if (albumSongs.length > 0) {
      setActivePlaylist(albumSongs);
      setCurrentSong(albumSongs[0]);
      setIsPlaying(true);
      toast.success(`جاري تشغيل ألبوم "${album.title}"`);
    } else {
      toast('لا توجد أغانٍ مسجلة في هذا الألبوم بعد');
    }
  };

  useEffect(() => {
    if (selectedBook || selectedVideo || selectedPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedBook, selectedVideo, selectedPhoto]);

  const getEmbedUrl = (url?: string, source?: string) => {
    if (!url) return null;
    if (source === 'embed') return url;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('youtube.com/embed/')) {
      return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    } else if (url.includes('facebook.com/')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
    }
    return null;
  };

  const isEmbeddable = (url?: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('facebook.com');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-32 overflow-x-hidden w-full max-w-full touch-pan-y">
      {/* Header Banner */}
      <div className="relative h-[260px] md:h-[300px] overflow-hidden bg-primary">
        {appSettings?.libraryBanner ? (
          <>
            <img 
              src={getOptimizedImage(appSettings.libraryBanner, 1200) || appSettings.libraryBanner} 
              alt="Library Banner Background" 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-black/40"></div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-emerald-700 opacity-95"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#023823]/90 via-primary-dark/80 to-[#045536]/80"></div>
            
            {/* Background Decorative Pattern */}
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"></div>
          </>
        )}

        <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl shrink-0">
              <LibraryIcon size={32} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                  المحتوى الرقمي الشامل
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight mt-1">المكتبة الرقمية والوسائط</h1>
            </div>
          </motion.div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 relative z-20">
        {/* Search & Global Stats Bar */}
        <div className="bg-white dark:bg-card-dark rounded-3xl p-3 md:p-4 shadow-xl border border-border-light dark:border-border-dark flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder={
                activeTab === 'photos' ? "ابحث في معرض الصور..." :
                activeTab === 'videos' ? "ابحث عن مباراة، ملخص، أو فيديو..." :
                activeTab === 'songs' ? "ابحث عن أغنية، أنشودة، أو فنان..." : "ابحث عن كتاب أو مستند..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border-none outline-none focus:ring-2 ring-primary/20 text-xs md:text-sm font-bold text-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-border-dark">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Sparkles size={16} className="text-emerald-500" />
              <span>محتوى متجدد حصرياً لجماهير السيد البلد</span>
            </div>
          </div>
        </div>

        {/* Categories Cards Section */}
        <div className="mt-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="text-primary" size={22} />
              <span>أقسام المكتبة الرقمية والوسائط</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">اختر القسم لعرض المحتوى الخاص به</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-5">
            {[
              { 
                id: 'photos', 
                label: 'معرض الصور', 
                desc: 'ألبومات وصور الفعاليات', 
                icon: ImageIcon, 
                badge: `${photos.length} صورة`,
                color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400'
              },
              { 
                id: 'videos', 
                label: 'الفيديوهات والملخصات', 
                desc: 'ملخصات المباريات والكواليس', 
                icon: Video, 
                badge: `${videos.length} فيديو`,
                color: 'from-amber-500/20 to-amber-600/10 text-amber-600 dark:text-amber-400'
              },
              { 
                id: 'songs', 
                label: 'الأغاني', 
                desc: 'الأغاني والتسجيلات الصوتية', 
                icon: Music, 
                badge: `${effectiveSongs.length} صوتيات`,
                color: 'from-rose-500/20 to-rose-600/10 text-rose-600 dark:text-rose-400'
              },
              { 
                id: 'books', 
                label: 'الكتب والمستندات', 
                desc: 'الوثائق وإصدارات التاريخ', 
                icon: BookOpen, 
                badge: `${effectiveBooks.length} كتاب`,
                color: 'from-blue-500/20 to-blue-600/10 text-blue-600 dark:text-blue-400'
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button 
                  key={tab.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`p-4 md:p-5 rounded-3xl text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between border cursor-pointer min-h-[120px] md:min-h-[140px] ${
                    isActive 
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/25 ring-2 ring-primary/40' 
                      : 'bg-white dark:bg-card-dark text-slate-800 dark:text-white border-border-light dark:border-border-dark hover:border-primary/40 hover:shadow-lg'
                  }`}
                >
                  {/* Subtle decorative background glow when active */}
                  {isActive && (
                    <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
                  )}

                  <div className="flex items-start justify-between mb-3 relative z-10 w-full">
                    <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-white/20 text-white backdrop-blur-md' 
                        : `bg-gradient-to-br ${tab.color} border border-black/5`
                    }`}>
                      <Icon size={22} />
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      isActive 
                        ? 'bg-white/20 text-white backdrop-blur-md' 
                        : 'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.badge}
                    </span>
                  </div>

                  <div className="relative z-10 mt-1">
                    <h3 className={`font-black text-xs md:text-base leading-tight ${
                      isActive ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}>
                      {tab.label}
                    </h3>
                    <p className={`text-[10px] md:text-[11px] font-bold mt-1 line-clamp-1 ${
                      isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-400'
                    }`}>
                      {tab.desc}
                    </p>
                  </div>

                  {isActive && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/60"></div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {/* ---------------- 1. PHOTOS TAB ---------------- */}
            {activeTab === 'photos' && (
              <motion.div
                key="photos-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Photo Playlists / Albums */}
                {photoPlaylists.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Layers size={16} className="text-primary" />
                        <span>ألبومات الصور</span>
                      </h3>
                      {selectedPlaylistId && (
                        <button 
                          onClick={() => setSelectedPlaylistId(null)}
                          className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                        >
                          <X size={14} /> إزالة التصفية
                        </button>
                      )}
                    </div>

                    <div className="relative flex items-center group/photo-playlists">
                      <button
                        type="button"
                        onClick={() => scrollHorizontally(photoPlaylistsRef, 'right')}
                        className="absolute -right-2 z-10 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                      >
                        <ChevronRight size={16} />
                      </button>

                      <div ref={photoPlaylistsRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-6 scroll-smooth w-full">
                        <button
                          onClick={() => setSelectedPlaylistId(null)}
                          className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
                            !selectedPlaylistId ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'
                          }`}
                        >
                          جميع الصور
                        </button>
                        {photoPlaylists.map(playlist => (
                          <button
                            key={playlist.id}
                            onClick={() => setSelectedPlaylistId(playlist.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-2 ${
                              selectedPlaylistId === playlist.id ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'
                            }`}
                          >
                            <ImageIcon size={14} />
                            <span>{playlist.title}</span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollHorizontally(photoPlaylistsRef, 'left')}
                        className="absolute -left-2 z-10 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>
                )}



                {/* Featured Photo Hero Card */}
                {featuredPhoto && (
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-800 dark:text-white">
                      <Sparkles size={16} className="text-amber-500 fill-amber-500" />
                      <span>الصورة المميزة</span>
                    </div>
                    <div 
                      onClick={() => setSelectedPhoto(featuredPhoto)}
                      className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[380px] rounded-3xl overflow-hidden group shadow-2xl border border-white/10 cursor-pointer bg-slate-900"
                    >
                      <img 
                        src={getOptimizedImage(featuredPhoto.thumbnailUrl || featuredPhoto.url, 1000) || featuredPhoto.thumbnailUrl || featuredPhoto.url} 
                        alt={featuredPhoto.title} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      
                      <div className="absolute top-4 left-4 flex gap-2 z-10">
                        <div className="px-3 py-1 bg-amber-500/90 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-wider shadow-md flex items-center gap-1">
                          <Sparkles size={12} className="fill-white" />
                          <span>صورة مميزة</span>
                        </div>
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col justify-end z-10">
                        <h3 className="text-white text-base md:text-xl font-black line-clamp-2 leading-snug drop-shadow-md">
                          {featuredPhoto.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-xs font-bold text-white/80">
                          <span>{safeFormatDate(featuredPhoto.date)}</span>
                          <span className="flex items-center gap-1 text-rose-400">
                            <Heart size={14} fill="currentColor" />
                            {getLikesCount(featuredPhoto.likes)} إعجاب
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((item) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ y: -4 }}
                      onClick={() => handleOpenPhoto(item)}
                      className="group relative h-64 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer bg-slate-900 border border-border-light dark:border-border-dark"
                    >
                      <img 
                        src={getOptimizedImage(item.thumbnailUrl || item.url || (item as any).imageUrl || (item as any).image, 500) || item.thumbnailUrl || item.url || (item as any).imageUrl || (item as any).image} 
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                      
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                        {item.isFeatured && (
                          <div className="px-2.5 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[9px] font-black rounded-lg flex items-center gap-1 shadow-md">
                            <Sparkles size={10} className="fill-white" />
                            <span>مميز</span>
                          </div>
                        )}
                        {(item as any).sectionName && (
                          <div className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-emerald-300 text-[9px] font-black rounded-lg flex items-center gap-1 shadow-md border border-emerald-500/30">
                            <Layers size={10} />
                            <span>{(item as any).sectionName}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Top Action Controls */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 scale-90 group-hover:scale-100 transition-all opacity-0 group-hover:opacity-100 z-10">
                        <button 
                          onClick={(e) => handleLikeMedia(e, item)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md border transition-all ${
                            isLikedByUser(item.likes, auth.currentUser?.uid) ? 'bg-primary text-white border-primary' : 'bg-white/20 text-white border-white/20 hover:bg-primary'
                          }`}
                        >
                          <Heart size={16} fill={isLikedByUser(item.likes, auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(item.thumbnailUrl || item.url, item.title); }}
                          className="w-9 h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 hover:bg-slate-800 transition-all"
                        >
                          <Download size={16} />
                        </button>
                      </div>

                      {/* Content Info */}
                      <div className="absolute inset-0 flex flex-col justify-end p-5">
                        <h3 className="text-white text-sm font-black leading-snug line-clamp-2">{item.title}</h3>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] text-white/70 font-bold">
                          <span>{safeFormatDate(item.date)}</span>
                          <span className="flex items-center gap-1">
                            <Heart size={12} fill="currentColor" className="text-primary" />
                            {getLikesCount(item.likes)}
                          </span>
                        </div>
                      </div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary/90 text-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-all duration-300 shadow-xl">
                        <Maximize2 size={20} />
                      </div>
                    </motion.div>
                  ))}

                  {photos.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark p-6">
                      <ImageIcon className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={56} />
                      <h4 className="text-slate-700 dark:text-slate-200 font-black text-base">لا توجد صور متوفرة</h4>
                      <p className="text-slate-400 font-bold text-xs mt-1">جرّب تغيير عبارة البحث أو اختيار ألبوم آخر</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ---------------- 2. VIDEOS & SUMMARIES TAB ---------------- */}
            {activeTab === 'videos' && (
              <motion.div
                key="videos-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Featured Video Card */}
                {featuredVideo && (
                  <div 
                    onClick={() => handleOpenVideo(featuredVideo)}
                    className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[420px] rounded-3xl overflow-hidden group shadow-2xl border border-white/10 cursor-pointer bg-slate-900"
                  >
                    <img 
                      src={getOptimizedImage(featuredVideo.thumbnailUrl, 1000) || featuredVideo.thumbnailUrl} 
                      alt={featuredVideo.title} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    
                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                      <div className="px-3 py-1 bg-primary/90 backdrop-blur-md rounded-xl text-[10px] font-black text-white uppercase tracking-wider shadow-md">
                        فيديو مميز
                      </div>
                      {featuredVideo.duration && (
                        <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-xl text-[10px] font-black text-white flex items-center gap-1">
                          <Clock size={12} /> {featuredVideo.duration}
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/90 text-white rounded-full flex items-center justify-center border-2 border-white/40 shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-primary">
                        <Play size={32} fill="white" className="mr-0.5" />
                      </div>
                    </div>
                    
                    <div className="absolute bottom-6 left-6 right-6">
                      <h2 className="text-lg md:text-2xl font-black text-white leading-tight mb-2 group-hover:text-primary-light transition-colors drop-shadow-md">
                        {featuredVideo.title}
                      </h2>
                      <div className="flex items-center gap-4 text-white/70 text-xs font-bold">
                        {featuredVideo.date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            {safeFormatDate(featuredVideo.date)}
                          </div>
                        )}
                        {getViewsCount(featuredVideo.views) > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full">
                            <Eye size={12} />
                            {getViewsCount(featuredVideo.views)} مشاهدة
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Playlists / Summary Albums */}
                {videoPlaylists.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Layers size={16} className="text-primary" />
                        <span>أقسام الفيديوهات والملخصات</span>
                      </h3>
                      {selectedPlaylistId && (
                        <button 
                          onClick={() => setSelectedPlaylistId(null)}
                          className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                        >
                          <X size={14} /> إزالة التصفية
                        </button>
                      )}
                    </div>

                    <div className="relative flex items-center group/video-playlists">
                      <button
                        type="button"
                        onClick={() => scrollHorizontally(videoPlaylistsRef, 'right')}
                        className="absolute -right-2 z-10 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                      >
                        <ChevronRight size={16} />
                      </button>

                      <div ref={videoPlaylistsRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-6 scroll-smooth w-full">
                        <button
                          onClick={() => setSelectedPlaylistId(null)}
                          className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
                            !selectedPlaylistId ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'
                          }`}
                        >
                          جميع الفيديوهات
                        </button>
                        {videoPlaylists.map(playlist => (
                          <button
                            key={playlist.id}
                            onClick={() => setSelectedPlaylistId(playlist.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-2 ${
                              selectedPlaylistId === playlist.id ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'
                            }`}
                          >
                            <Video size={14} />
                            <span>{playlist.title}</span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollHorizontally(videoPlaylistsRef, 'left')}
                        className="absolute -left-2 z-10 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Videos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map((item) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ y: -5 }}
                      onClick={() => handleOpenVideo(item)}
                      className="group bg-white dark:bg-card-dark rounded-3xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        <img 
                          src={getOptimizedImage(item.thumbnailUrl, 600) || item.thumbnailUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                        {item.isFeatured && (
                          <div className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[9px] font-black rounded-lg flex items-center gap-1 shadow-md">
                            <Sparkles size={10} className="fill-white" />
                            <span>مميز</span>
                          </div>
                        )}

                        {item.duration && (
                          <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-black rounded-lg flex items-center gap-1">
                            <Clock size={12} /> {item.duration}
                          </div>
                        )}

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-xl">
                          <Play size={20} fill="white" className="mr-0.5" />
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-black text-sm md:text-base text-slate-800 dark:text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-border-dark text-[11px] font-bold text-slate-400">
                          <span>{safeFormatDate(item.date)}</span>
                          <div className="flex items-center gap-3">
                            {getViewsCount(item.views) > 0 && (
                              <span className="flex items-center gap-1">
                                <Eye size={12} /> {getViewsCount(item.views)}
                              </span>
                            )}
                            <button 
                              onClick={(e) => handleLikeMedia(e, item)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                                isLikedByUser(item.likes, auth.currentUser?.uid) ? 'text-primary bg-primary/10' : 'hover:text-primary'
                              }`}
                            >
                              <Heart size={12} fill={isLikedByUser(item.likes, auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                              <span>{getLikesCount(item.likes)}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {videos.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark p-6">
                      <Video className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={56} />
                      <h4 className="text-slate-700 dark:text-slate-200 font-black text-base">لا توجد فيديوهات أو ملخصات متوفرة</h4>
                      <p className="text-slate-400 font-bold text-xs mt-1">جرّب البحث باسم آخر أو اختيار قسم مختلف</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ---------------- 3. SONGS TAB ---------------- */}
            {activeTab === 'songs' && (
              <motion.div
                key="songs-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-10 overflow-x-hidden w-full max-w-full touch-pan-y"
              >
                {/* Official Albums */}
                {effectiveAlbums.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-white">
                        <Disc className="text-primary" size={20} />
                        <span>الألبومات الرسمية</span>
                      </h2>
                    </div>

                    <div className="relative flex items-center group/albums">
                      <button
                        type="button"
                        onClick={() => scrollHorizontally(albumsRef, 'right')}
                        className="absolute -right-2 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                      >
                        <ChevronRight size={18} />
                      </button>

                      <div 
                        ref={albumsRef} 
                        className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 px-2 scroll-smooth w-full"
                      >
                        {effectiveAlbums.map((album) => {
                          const isSelected = selectedAlbumId === album.id;
                          const albumSongCount = album.songIds?.length || effectiveSongs.filter(s => s.albumId === album.id).length;
                          return (
                            <motion.div 
                              key={album.id}
                              whileHover={{ y: -4 }}
                              onClick={() => setSelectedAlbumId(isSelected ? null : album.id)}
                              className={`group bg-white dark:bg-card-dark p-3.5 rounded-3xl border shadow-sm hover:shadow-xl transition-all shrink-0 w-44 sm:w-52 cursor-pointer ${
                                isSelected ? 'border-primary ring-2 ring-primary/30 bg-primary/5 dark:bg-primary/10' : 'border-border-light dark:border-border-dark'
                              }`}
                            >
                              <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative bg-slate-100 dark:bg-surface-dark">
                                {album.coverUrl && album.coverUrl.trim() !== '' ? (
                                  <img 
                                    src={album.coverUrl} 
                                    alt={album.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    referrerPolicy="no-referrer" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Disc size={40} className="text-slate-300" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={(e) => handlePlayAlbum(e, album)}
                                    className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105"
                                    title="تشغيل الألبوم"
                                  >
                                    <Play fill="currentColor" size={20} className="mr-0.5" />
                                  </button>
                                </div>
                              </div>
                              <h3 className="font-black text-xs md:text-sm truncate text-slate-800 dark:text-white">{album.title}</h3>
                              <p className="text-[10px] text-slate-400 font-bold">{album.artist} {album.year ? `• ${album.year}` : ''} • {albumSongCount} أغنية</p>
                            </motion.div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollHorizontally(albumsRef, 'left')}
                        className="absolute -left-2 z-10 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-900 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                      >
                        <ChevronLeft size={18} />
                      </button>
                    </div>
                  </section>
                )}

                {/* Songs List */}
                <section>
                  {/* Selected Album Filter Banner */}
                  {selectedAlbumId && (
                    <div className="flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-2xl mb-4 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <Disc size={18} className="text-primary shrink-0" />
                        <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                          ألبوم: {effectiveAlbums.find(a => a.id === selectedAlbumId)?.title} ({filteredSongs.length} أغنية)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={(e) => {
                            const alb = effectiveAlbums.find(a => a.id === selectedAlbumId);
                            if (alb) handlePlayAlbum(e, alb);
                          }}
                          className="px-3 py-1 bg-primary text-white rounded-xl text-xs font-black flex items-center gap-1 hover:bg-primary-dark cursor-pointer transition-all"
                        >
                          <Play size={12} fill="white" />
                          <span>تشغيل الألبوم</span>
                        </button>
                        <button 
                          onClick={() => setSelectedAlbumId(null)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer transition-all"
                          title="إلغاء التصفية"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-white">
                      <Headphones className="text-primary" size={20} />
                      <span>قائمة الأغاني</span>
                    </h2>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {[
                        { id: 'all', label: 'الكل' },
                        { id: 'song', label: 'أغاني' },
                        { id: 'chant', label: 'تسجيلات صوتية' }
                      ].map(cat => (
                        <button 
                          key={cat.id}
                          onClick={() => setSongFilterCategory(cat.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 ${
                            songFilterCategory === cat.id 
                              ? 'bg-primary text-white shadow-md' 
                              : 'bg-white dark:bg-card-dark text-slate-500 border border-border-light dark:border-border-dark hover:bg-slate-50'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-3 overflow-x-hidden w-full">
                    {filteredSongs.map((song, index) => {
                      const isCurrentSong = currentSong?.id === song.id;
                      const isPlayingThis = isCurrentSong && isPlaying;
                      const songAlbum = effectiveAlbums.find(a => 
                        (song.albumId && String(a.id) === String(song.albumId)) || 
                        (Array.isArray(a.songIds) && a.songIds.map(String).includes(String(song.id))) ||
                        ((song as any).album && a.title === (song as any).album)
                      );
                      const songAlbumTitle = songAlbum?.title || (song as any).album || (song as any).albumTitle;

                      return (
                        <motion.div 
                          key={song.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`group flex items-center gap-3 md:gap-4 p-3 rounded-2xl border transition-all ${
                            isCurrentSong 
                              ? 'bg-primary/5 border-primary shadow-sm' 
                              : 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark hover:shadow-md'
                          }`}
                        >
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-surface-dark">
                            {song.coverUrl && song.coverUrl.trim() !== '' ? (
                              <img src={song.coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={song.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music size={20} className="text-slate-300" />
                              </div>
                            )}
                            <button 
                              onClick={() => handlePlaySong(song)}
                              className={`absolute inset-0 flex items-center justify-center transition-all ${
                                isPlayingThis ? 'bg-primary/80 text-white' : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isPlayingThis ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} className="mr-0.5" />}
                            </button>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs md:text-sm font-black truncate text-slate-800 dark:text-white">{song.title}</h4>
                              {songAlbumTitle && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (songAlbum) setSelectedAlbumId(songAlbum.id);
                                  }}
                                  className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 flex items-center gap-1"
                                  title="تصفية حسب الألبوم"
                                >
                                  <Disc size={10} />
                                  <span>ألبوم: {songAlbumTitle}</span>
                                </button>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{song.artist} • {song.category === 'song' ? 'أغنية' : 'تسجيل صوتي'}</p>
                          </div>

                          <div className="flex items-center gap-2 md:gap-4 px-2">
                            {song.duration && (
                              <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                                <Clock size={12} />
                                {song.duration}
                              </span>
                            )}
                            <button 
                              onClick={() => handlePlaySong(song)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
                                isPlayingThis 
                                  ? 'bg-primary text-white shadow-sm' 
                                  : 'bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white'
                              }`}
                            >
                              {isPlayingThis ? <Pause size={14} /> : <Play size={14} />}
                              <span className="hidden sm:inline">{isPlayingThis ? 'إيقاف' : 'تشغيل'}</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}

                    {filteredSongs.length === 0 && (
                      <div className="py-12 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark p-6">
                        <Music className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={48} />
                        <p className="text-slate-500 font-bold text-xs">لا توجد أغاني مطابقة للبحث</p>
                      </div>
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {/* ---------------- 4. BOOKS & DOCUMENTS TAB ---------------- */}
            {activeTab === 'books' && (
              <motion.div
                key="books-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {filteredBooks.map((book) => (
                  <motion.div 
                    key={book.id}
                    whileHover={{ y: -6 }}
                    className="flex flex-col group"
                  >
                    <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-md group-hover:shadow-2xl transition-all relative mb-3 bg-slate-900 border border-border-light dark:border-border-dark">
                      {book.coverUrl && book.coverUrl.trim() !== '' ? (
                        <img src={book.coverUrl} className="w-full h-full object-cover transition-all duration-700" referrerPolicy="no-referrer" alt={book.title} />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center">
                          <BookOpen size={48} className="text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
                      
                      <div className="absolute inset-0 flex flex-col justify-end p-5 translate-y-2 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                        {book.category && (
                          <p className="text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1">{book.category}</p>
                        )}
                        <h3 className="text-white text-sm font-black leading-snug mb-3 line-clamp-2">{book.title}</h3>
                        <button 
                          onClick={() => handleOpenBook(book)}
                          className="w-full bg-white text-primary py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                          <BookIcon size={16} />
                          قراءة الكتاب
                        </button>
                      </div>
                    </div>
                    <div className="px-1">
                      <h3 className="font-black text-xs md:text-sm text-slate-800 dark:text-white truncate">{book.title}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{book.author}</p>
                    </div>
                  </motion.div>
                ))}

                {filteredBooks.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-white dark:bg-card-dark rounded-3xl border-2 border-dashed border-slate-200 dark:border-border-dark p-6">
                    <BookIcon className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={56} />
                    <h4 className="text-slate-700 dark:text-slate-200 font-black text-base">لا توجد كتب أو مستندات متوفرة</h4>
                    <p className="text-slate-400 font-bold text-xs mt-1">المزيد من الإصدارات والتاريخ قادم قريباً</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* 1. Photo Fullscreen View Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 pt-[max(2.5rem,env(safe-area-inset-top))] cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl flex flex-col gap-4 cursor-default"
            >
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="text-lg md:text-xl font-black">{selectedPhoto.title}</h2>
                  {selectedPhoto.date && (
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      {safeFormatDate(selectedPhoto.date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleLikeMedia(e, selectedPhoto)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${
                      isLikedByUser(selectedPhoto.likes, auth.currentUser?.uid) ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Heart size={16} fill={isLikedByUser(selectedPhoto.likes, auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                    {getLikesCount(selectedPhoto.likes)}
                  </button>
                  <button 
                    onClick={() => handleDownload(selectedPhoto.url || selectedPhoto.thumbnailUrl, selectedPhoto.title)}
                    className="px-4 py-2 bg-white/10 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-white/20 transition-all"
                  >
                    <Download size={16} />
                    تحميل
                  </button>
                  <button 
                    onClick={() => setSelectedPhoto(null)}
                    className="p-2.5 bg-white/10 text-white hover:bg-red-500 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-[80vh] w-full rounded-3xl overflow-hidden bg-slate-900 flex items-center justify-center border border-white/10">
                <img 
                  src={selectedPhoto.url || selectedPhoto.thumbnailUrl || (selectedPhoto as any).imageUrl || (selectedPhoto as any).image} 
                  alt={selectedPhoto.title} 
                  className="max-h-[80vh] w-auto max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedVideo(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 pt-[max(2.5rem,env(safe-area-inset-top))] cursor-pointer"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl flex flex-col gap-4 cursor-default"
            >
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="text-lg md:text-xl font-black leading-tight">{selectedVideo.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-1">
                    {selectedVideo.date && <span>{safeFormatDate(selectedVideo.date)}</span>}
                    {getViewsCount(selectedVideo.views) > 0 && <span>{getViewsCount(selectedVideo.views)} مشاهدة</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleLikeMedia(e, selectedVideo)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${
                      isLikedByUser(selectedVideo.likes, auth.currentUser?.uid) ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Heart size={16} fill={isLikedByUser(selectedVideo.likes, auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                    {getLikesCount(selectedVideo.likes)}
                  </button>
                  {selectedVideo.videoUrl && !isEmbeddable(selectedVideo.videoUrl) && (
                    <button 
                      onClick={() => handleDownload(selectedVideo.videoUrl, selectedVideo.title)}
                      className="px-4 py-2 bg-white/10 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-white/20 transition-all"
                    >
                      <Download size={16} />
                      تحميل
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedVideo(null)}
                    className="p-2.5 bg-white/10 text-white hover:bg-red-500 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 shadow-2xl relative border border-white/10">
                {isEmbeddable(selectedVideo.videoUrl) ? (
                  <iframe 
                    src={getEmbedUrl(selectedVideo.videoUrl, selectedVideo.source) || undefined} 
                    className="w-full h-full border-none"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={selectedVideo.title}
                  />
                ) : (
                  <video 
                    src={selectedVideo.videoUrl || undefined} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Book Reader Modal */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-2 pt-[max(2.5rem,env(safe-area-inset-top))] ${
              isFullscreenBook ? 'p-0 pt-0' : 'sm:p-4 md:p-6'
            }`}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full h-full bg-white dark:bg-background-dark overflow-hidden shadow-2xl flex flex-col ${
                isFullscreenBook ? 'rounded-none max-w-none' : 'max-w-6xl rounded-3xl'
              }`}
            >
              {/* Modal Header */}
              <div className="p-3 sm:p-4 border-b border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-surface-dark shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedBook.coverUrl && selectedBook.coverUrl.trim() !== '' ? (
                    <img src={selectedBook.coverUrl} className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0" referrerPolicy="no-referrer" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-card-dark flex items-center justify-center shadow-sm shrink-0">
                      <BookOpen size={18} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-black text-sm md:text-base text-slate-800 dark:text-white truncate">{selectedBook.title}</h3>
                    <p className="text-xs text-slate-400 font-bold truncate">{selectedBook.author}</p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => setIsFullscreenBook(!isFullscreenBook)}
                    title={isFullscreenBook ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
                    className="p-2 bg-slate-100 dark:bg-card-dark hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
                  >
                    {isFullscreenBook ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>

                  {selectedBook.pdfUrl && (
                    <>
                      <a 
                        href={selectedBook.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="فتح في نافذة جديدة"
                        className="p-2 bg-slate-100 dark:bg-card-dark hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all hidden sm:flex items-center justify-center"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedBook.pdfUrl;
                          link.target = '_blank';
                          link.download = `${selectedBook.title}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-black transition-all"
                      >
                        <Download size={14} />
                        <span className="hidden sm:inline">تحميل</span>
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => { setSelectedBook(null); setIsBookLoading(true); setIsFullscreenBook(false); }}
                    className="p-2 bg-slate-100 dark:bg-card-dark hover:bg-red-500 hover:text-white text-slate-500 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Reader Controls Toolbar Bar */}
              <div className="px-3 py-2 bg-slate-100/90 dark:bg-slate-900/90 border-b border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
                {/* Page Navigation & Flip Controls */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-2.5 py-1 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                  <button
                    onClick={() => {
                      const nextP = Math.max(1, bookPage - 1);
                      setBookPage(nextP);
                      setBookPageInput(String(nextP));
                    }}
                    disabled={bookPage <= 1}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-card-dark disabled:opacity-30 rounded-lg text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight size={16} />
                    <span className="hidden md:inline text-[11px] font-black">السابقة</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    <span className="text-[11px] font-black text-slate-400">صفحة</span>
                    <input 
                      type="number"
                      min={1}
                      max={999}
                      value={bookPageInput}
                      onChange={(e) => setBookPageInput(e.target.value)}
                      onBlur={() => {
                        const parsed = parseInt(bookPageInput, 10);
                        if (!isNaN(parsed) && parsed > 0) {
                          setBookPage(parsed);
                        } else {
                          setBookPageInput(String(bookPage));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const parsed = parseInt(bookPageInput, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            setBookPage(parsed);
                          }
                        }
                      }}
                      className="w-12 text-center py-0.5 px-1 bg-slate-100 dark:bg-card-dark text-slate-900 dark:text-white rounded-lg border border-border-light dark:border-border-dark font-black text-xs outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button 
                      onClick={() => {
                        const parsed = parseInt(bookPageInput, 10);
                        if (!isNaN(parsed) && parsed > 0) setBookPage(parsed);
                      }}
                      className="px-2 py-1 bg-primary text-white rounded-lg text-[10px] font-black hover:bg-primary-dark transition-all"
                    >
                      انتقال
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const nextP = bookPage + 1;
                      setBookPage(nextP);
                      setBookPageInput(String(nextP));
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-card-dark rounded-lg text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all"
                    title="الصفحة التالية"
                  >
                    <span className="hidden md:inline text-[11px] font-black">التالية</span>
                    <ChevronLeft size={16} />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-2.5 py-1 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                  <button 
                    onClick={() => setBookZoom(z => Math.max(50, z - 20))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-card-dark rounded-lg text-slate-700 dark:text-slate-200 transition-all"
                    title="تصغير"
                  >
                    <ZoomOut size={15} />
                  </button>

                  <span className="text-[11px] font-black px-2 py-0.5 bg-slate-100 dark:bg-card-dark text-slate-800 dark:text-slate-200 rounded-lg min-w-[42px] text-center">
                    {bookZoom}%
                  </span>

                  <button 
                    onClick={() => setBookZoom(z => Math.min(250, z + 20))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-card-dark rounded-lg text-slate-700 dark:text-slate-200 transition-all"
                    title="تكبير"
                  >
                    <ZoomIn size={15} />
                  </button>

                  <button 
                    onClick={() => setBookZoom(100)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-card-dark rounded-lg text-slate-500 hover:text-primary transition-all"
                    title="إعادة ضبط الحجم 100%"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>

                {/* View Mode Controls */}
                <div className="flex items-center gap-1 bg-white dark:bg-surface-dark p-1 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
                  <button
                    onClick={() => setBookViewMode('fit-width')}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                      bookViewMode === 'fit-width' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-card-dark'
                    }`}
                  >
                    احتواء العرض
                  </button>
                  <button
                    onClick={() => setBookViewMode('fit-height')}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                      bookViewMode === 'fit-height' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-card-dark'
                    }`}
                  >
                    ملء الصفحة
                  </button>
                </div>
              </div>
              
              {/* Book Viewer Canvas */}
              <div className="flex-1 bg-slate-900 relative overflow-auto flex items-center justify-center p-2 sm:p-4">
                {isBookLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-20 text-center p-4 backdrop-blur-sm">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white font-black text-xs animate-pulse">جاري تحميل الكتاب والصفحات...</p>
                  </div>
                )}

                {/* Floating Side Page Flipping Controls */}
                <button
                  onClick={() => {
                    const nextP = Math.max(1, bookPage - 1);
                    setBookPage(nextP);
                    setBookPageInput(String(nextP));
                  }}
                  disabled={bookPage <= 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-primary text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/20 transition-all disabled:opacity-20 disabled:hover:bg-black/70 active:scale-90"
                  title="الصفحة السابقة"
                >
                  <ChevronRight size={24} />
                </button>

                <button
                  onClick={() => {
                    const nextP = bookPage + 1;
                    setBookPage(nextP);
                    setBookPageInput(String(nextP));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/70 hover:bg-primary text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/20 transition-all active:scale-90"
                  title="الصفحة التالية"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Floating Bottom Page Bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-black shadow-xl flex items-center gap-3">
                  <span className="text-amber-400">الصفحة {bookPage}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-300">التقريب {bookZoom}%</span>
                </div>

                {/* PDF Frame */}
                <div 
                  className={`w-full h-full flex justify-center transition-all duration-200 ${
                    bookViewMode === 'fit-width' ? 'items-start' : 'items-center'
                  }`}
                  style={{
                    transform: `scale(${bookZoom / 100})`,
                    transformOrigin: 'top center'
                  }}
                >
                  {selectedBook.pdfUrl ? (
                    <iframe 
                      key={`book-frame-p${bookPage}-z${bookZoom}-${selectedBook.id}`}
                      src={
                        selectedBook.pdfUrl.includes('drive.google.com')
                          ? `${selectedBook.pdfUrl.replace('/view', '/preview')}#page=${bookPage}&zoom=${bookZoom}`
                          : `${selectedBook.pdfUrl}#page=${bookPage}&zoom=${bookZoom}`
                      } 
                      className={`w-full h-full border-none rounded-xl shadow-2xl bg-white ${
                        bookViewMode === 'fit-height' ? 'max-h-[85vh]' : 'min-h-[500px]'
                      }`}
                      title="book-reader"
                      allow="autoplay"
                      onLoad={() => setIsBookLoading(false)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-400 font-bold">
                      لا يتوفر رابط لمستند الكتاب
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
