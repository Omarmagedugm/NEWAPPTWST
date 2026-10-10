import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, EducationVideo } from '../store';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Play,
  Search,
  X,
  Share2,
  Heart,
  Eye,
  Clock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  PlusCircle,
  ThumbsUp
} from 'lucide-react';

export default function EducationService() {
  const navigate = useNavigate();
  const { educationVideos, educationCategories, profile } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<EducationVideo | null>(null);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});

  const isDev = auth.currentUser?.email === 'copyrightofficialco@gmail.com' || auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isAdmin = (profile?.role === 'admin' || profile?.role === 'moderator' || (profile?.roles && (profile.roles.includes('admin') || profile.roles.includes('moderator')))) || isDev;

  // Categories list
  const categories = ['الكل', ...Array.from(new Set(educationVideos.map(v => v.category).filter(Boolean)))];

  // Filtered and deduplicated videos
  const filteredVideos = React.useMemo(() => {
    const seen = new Set<string>();
    return educationVideos.filter(video => {
      if (!video?.id || seen.has(video.id)) return false;
      seen.add(video.id);

      if (selectedCategory !== 'الكل' && video.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = video.title?.toLowerCase().includes(q);
        const matchDesc = video.description?.toLowerCase().includes(q);
        const matchInstructor = video.instructor?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchInstructor) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [educationVideos, selectedCategory, searchQuery]);

  const featuredVideo = React.useMemo(() => {
    return filteredVideos.find(v => v.isFeatured) || filteredVideos[0] || null;
  }, [filteredVideos]);

  const handleOpenVideo = (video: EducationVideo) => {
    setActiveVideo(video);
    // Increment view count in firestore if exists
    try {
      if (video.id && !video.id.startsWith('edu-vid-')) {
        updateDoc(doc(db, 'education_videos', video.id), {
          views: increment(1)
        });
      }
    } catch (e) {
      // Non-critical
    }
  };

  const handleLike = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    const isLiked = likedVideos[videoId];
    setLikedVideos(prev => ({ ...prev, [videoId]: !isLiked }));
    
    if (!isLiked) {
      toast.success('تمت الإضافة للمفضلة ❤️');
      try {
        if (!videoId.startsWith('edu-vid-')) {
          updateDoc(doc(db, 'education_videos', videoId), {
            likes: increment(1)
          });
        }
      } catch (e) {
        // Non-critical
      }
    }
  };

  const handleShareVideo = async (video: EducationVideo) => {
    const shareData = {
      title: `${video.title} | التعليم المجاني - قناة الاتحاد`,
      text: `${video.title} - شاهد الدورة المجانية المقدمة لجمهور الاتحاد السكندري`,
      url: video.youtubeUrl || `https://www.youtube.com/watch?v=${video.youtubeId}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        toast.success('تم نسخ رابط الفيديو بنجاح!');
      } catch (err) {
        toast.error('تعذر نسخ الرابط');
      }
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-12 text-slate-800 dark:text-slate-100 bg-background-light dark:bg-background-dark">
      {/* Header & Breadcrumb */}
      <div className="bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pt-4 pb-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى خدمات الجمهور</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black hover:bg-emerald-500/25 transition-all"
              >
                <span>إدارة الفيديوهات ⚙️</span>
              </Link>
            )}
          </div>

          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>محتوى تعليمي مجاني 100%</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              منصة التعليم والتطوير 🎓
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
              دورات وشروحات يوتيوب مجانية مختارة بعناية لتأهيل وتطوير مهارات شباب الإسكندرية وجمهور الاتحاد السكندري 💚
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md mx-auto pt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كورس، تخصص، أو محاضر..."
              className="w-full pl-10 pr-11 py-3 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-md transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-102'
                  : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-border-dark hover:border-emerald-500/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Spotlight Video (if no search and featured exists) */}
        {!searchQuery && selectedCategory === 'الكل' && featuredVideo && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleOpenVideo(featuredVideo)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white dark:bg-card-dark border border-slate-200/80 dark:border-border-dark hover:border-emerald-500/50 shadow-lg transition-all"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
              {/* Thumbnail */}
              <div className="relative md:col-span-7 h-52 sm:h-64 md:h-full min-h-[220px] overflow-hidden bg-slate-900">
                <img
                  src={featuredVideo.thumbnailUrl || `https://img.youtube.com/vi/${featuredVideo.youtubeId}/hqdefault.jpg`}
                  alt={featuredVideo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Duration Badge */}
                {featuredVideo.duration && (
                  <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-white text-[10px] font-black flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{featuredVideo.duration}</span>
                  </span>
                )}

                {/* Featured Badge */}
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3 h-3" />
                  <span>دورة مميزة</span>
                </span>
              </div>

              {/* Details */}
              <div className="md:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black">
                    {featuredVideo.category}
                  </span>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                    {featuredVideo.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-3">
                    {featuredVideo.description}
                  </p>

                  {featuredVideo.instructor && (
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                      <span>تقديم: </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">{featuredVideo.instructor}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-border-dark">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{featuredVideo.views || 1}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{featuredVideo.likes || 0}</span>
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenVideo(featuredVideo);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>مشاهدة الكورس</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Video Cards Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>الدورات المتاحة</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {filteredVideos.length} فيديو
              </span>
            </h2>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="bg-white dark:bg-card-dark rounded-3xl p-10 text-center border border-slate-200/80 dark:border-border-dark shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">لم يتم العثور على شروحات مطابقة</h3>
              <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
                جرب البحث بكلمة مختلفة أو اختر تصنيفاً آخر
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video, idx) => {
                const isLiked = likedVideos[video.id];
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleOpenVideo(video)}
                    className="group cursor-pointer bg-white dark:bg-card-dark rounded-3xl border border-slate-200/80 dark:border-border-dark hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                      <img
                        src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* Duration */}
                      {video.duration && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md text-white text-[10px] font-black">
                          {video.duration}
                        </span>
                      )}

                      {/* Category */}
                      <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                        {video.category}
                      </span>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleLike(e, video.id)}
                        className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-colors ${
                          isLiked
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/40 text-white hover:bg-black/60'
                        }`}
                        title="إضافة للمفضلة"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold line-clamp-2">
                          {video.description}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-border-dark text-[11px] font-bold text-slate-500">
                        <span className="truncate max-w-[120px] text-emerald-600 dark:text-emerald-400 font-black">
                          {video.instructor || 'أكاديمية التعليم'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareVideo(video);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            title="مشاركة"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Video Modal Player */}
      <AnimatePresence>
        {activeVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 space-y-0"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-black truncate">
                    {activeVideo.title}
                  </span>
                </div>

                <button
                  onClick={() => setActiveVideo(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* YouTube Responsive Player */}
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0`}
                  title={activeVideo.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Info Footer */}
              <div className="p-4 sm:p-5 bg-slate-900/90 text-white space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black">
                    {activeVideo.category}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={activeVideo.youtubeUrl || `https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح في يوتيوب</span>
                    </a>

                    <button
                      onClick={() => handleShareVideo(activeVideo)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-colors"
                      title="مشاركة"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-bold leading-relaxed">
                  {activeVideo.description}
                </p>

                {activeVideo.instructor && (
                  <div className="text-xs font-bold text-slate-400">
                    <span>المحاضر / القناة: </span>
                    <span className="text-emerald-400 font-black">{activeVideo.instructor}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
