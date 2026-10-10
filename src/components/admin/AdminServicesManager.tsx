import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, PublicService, EducationVideo } from '../../store';
import { db, auth } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { extractYouTubeId } from '../../lib/videoUtils';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Briefcase,
  Award,
  BookOpen,
  Sparkles,
  Lightbulb,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  ExternalLink,
  Save,
  X,
  Play,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Search,
  Filter,
  Layers,
  Video,
  Star,
  FileSpreadsheet
} from 'lucide-react';
import CsvVideosImporter from './CsvVideosImporter';

export default function AdminServicesManager() {
  const {
    services,
    educationVideos,
    setServices,
    setEducationVideos,
    addService,
    updateService,
    deleteService,
    addEducationVideo,
    updateEducationVideo,
    deleteEducationVideo
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'services' | 'education' | 'suggestions'>('services');
  const [loading, setLoading] = useState(false);

  // Deduplicated lists for rendering
  const displayServices = React.useMemo(() => {
    const seen = new Set<string>();
    return services.filter(s => {
      if (!s?.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [services]);

  const displayEducationVideos = React.useMemo(() => {
    const seen = new Set<string>();
    return educationVideos.filter(v => {
      if (!v?.id || seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [educationVideos]);

  // Service Modal state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<PublicService | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<PublicService>>({
    title: '',
    description: '',
    icon: 'Sparkles',
    iconType: 'lucide',
    status: 'active',
    badge: 'متاح الآن',
    badgeColor: '#10b981',
    targetType: 'modal',
    targetUrl: '',
    image: '',
    order: services.length + 1,
    features: []
  });
  const [featuresInput, setFeaturesInput] = useState('');

  // Education Video Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isCsvVideosImporterOpen, setIsCsvVideosImporterOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<EducationVideo | null>(null);
  const [videoForm, setVideoForm] = useState<Partial<EducationVideo>>({
    title: '',
    description: '',
    youtubeUrl: '',
    category: 'برمجة وتكنولوجيا',
    instructor: '',
    duration: '',
    isFeatured: false,
    order: educationVideos.length + 1
  });

  // Suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (activeTab === 'suggestions') {
      fetchSuggestions();
    }
  }, [activeTab]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const snap = await getDocs(collection(db, 'service_suggestions'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSuggestions(list);
    } catch (err) {
      console.warn('Error fetching suggestions', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'service_suggestions', id));
      setSuggestions(prev => prev.filter(s => s.id !== id));
      toast.success('تم حذف الاقتراح');
    } catch (err) {
      toast.error('تعذر الحذف');
    }
  };

  // SERVICE ACTIONS
  const handleOpenServiceModal = (service?: PublicService) => {
    if (service) {
      setEditingService(service);
      setServiceForm(service);
      setFeaturesInput(service.features?.join('، ') || '');
    } else {
      setEditingService(null);
      setServiceForm({
        title: '',
        description: '',
        icon: 'Sparkles',
        iconType: 'lucide',
        status: 'active',
        badge: 'متاح الآن',
        badgeColor: '#10b981',
        targetType: 'modal',
        targetUrl: '',
        image: '',
        order: services.length + 1,
        features: []
      });
      setFeaturesInput('');
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title?.trim() || !serviceForm.description?.trim()) {
      toast.error('يرجى ملء اسم ووصف الخدمة');
      return;
    }

    setLoading(true);
    try {
      const parsedFeatures = featuresInput
        .split(/[،,]/)
        .map(f => f.trim())
        .filter(Boolean);

      const serviceData: PublicService = {
        id: editingService ? editingService.id : `service-${Date.now()}`,
        title: serviceForm.title.trim(),
        description: serviceForm.description.trim(),
        icon: serviceForm.icon || 'Sparkles',
        iconType: 'lucide',
        image: serviceForm.image?.trim() || '',
        status: serviceForm.status || 'active',
        badge: serviceForm.badge?.trim() || (serviceForm.status === 'active' ? 'متاح الآن' : 'قيد التجهيز'),
        badgeColor: serviceForm.status === 'active' ? '#10b981' : '#f59e0b',
        targetType: serviceForm.targetType || 'modal',
        targetUrl: serviceForm.targetUrl?.trim() || '',
        order: Number(serviceForm.order) || 1,
        features: parsedFeatures,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'public_services', serviceData.id), serviceData, { merge: true });

      if (editingService) {
        updateService(serviceData.id, serviceData);
        toast.success('تم تحديث الخدمة بنجاح ✅');
      } else {
        addService(serviceData);
        toast.success('تمت إضافة الخدمة بنجاح ✅');
      }

      setIsServiceModalOpen(false);
    } catch (err) {
      console.error('Save service error', err);
      toast.error('حدث خطأ أثناء حفظ الخدمة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      await deleteDoc(doc(db, 'public_services', id));
      deleteService(id);
      toast.success('تم حذف الخدمة');
    } catch (err) {
      console.error('Delete service error', err);
      toast.error('فشل حذف الخدمة');
    }
  };

  const handleToggleServiceStatus = async (service: PublicService) => {
    const nextStatus: 'active' | 'under_construction' | 'hidden' =
      service.status === 'active' ? 'under_construction' : service.status === 'under_construction' ? 'hidden' : 'active';

    const nextBadge = nextStatus === 'active' ? 'متاح الآن' : nextStatus === 'under_construction' ? 'قيد التجهيز' : 'مخفي';

    try {
      await updateDoc(doc(db, 'public_services', service.id), {
        status: nextStatus,
        badge: nextBadge
      });
      updateService(service.id, { status: nextStatus, badge: nextBadge });
      toast.success(`تم تغيير الحالة إلى: ${nextBadge}`);
    } catch (err) {
      toast.error('فشل تغيير الحالة');
    }
  };

  // VIDEO ACTIONS
  const handleOpenVideoModal = (video?: EducationVideo) => {
    if (video) {
      setEditingVideo(video);
      setVideoForm(video);
    } else {
      setEditingVideo(null);
      setVideoForm({
        title: '',
        description: '',
        youtubeUrl: '',
        category: 'برمجة وتكنولوجيا',
        instructor: '',
        duration: '',
        isFeatured: false,
        order: educationVideos.length + 1
      });
    }
    setIsVideoModalOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.title?.trim() || !videoForm.youtubeUrl?.trim()) {
      toast.error('يرجى ملء عنوان ورابط فيديو يوتيوب');
      return;
    }

    const yId = extractYouTubeId(videoForm.youtubeUrl.trim());
    if (!yId) {
      toast.error('رابط يوتيوب غير صالح، يرجى التأكد من الرابط');
      return;
    }

    setLoading(true);
    try {
      const videoData: EducationVideo = {
        id: editingVideo ? editingVideo.id : `edu-vid-${Date.now()}`,
        title: videoForm.title.trim(),
        description: videoForm.description?.trim() || '',
        youtubeUrl: videoForm.youtubeUrl.trim(),
        youtubeId: yId,
        thumbnailUrl: `https://img.youtube.com/vi/${yId}/hqdefault.jpg`,
        category: videoForm.category?.trim() || 'عام',
        instructor: videoForm.instructor?.trim() || '',
        duration: videoForm.duration?.trim() || '',
        isFeatured: !!videoForm.isFeatured,
        order: Number(videoForm.order) || 1,
        views: editingVideo?.views || 0,
        likes: editingVideo?.likes || 0,
        createdAt: editingVideo?.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, 'education_videos', videoData.id), videoData, { merge: true });

      if (editingVideo) {
        updateEducationVideo(videoData.id, videoData);
        toast.success('تم تحديث الفيديو التعليمي ✅');
      } else {
        addEducationVideo(videoData);
        toast.success('تمت إضافة الفيديو التعليمي بنجاح ✅');
      }

      setIsVideoModalOpen(false);
    } catch (err) {
      console.error('Save video error', err);
      toast.error('حدث خطأ أثناء حفظ الفيديو');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
    try {
      await deleteDoc(doc(db, 'education_videos', id));
      deleteEducationVideo(id);
      toast.success('تم حذف الفيديو بنجاح');
    } catch (err) {
      console.error('Delete video error', err);
      toast.error('فشل حذف الفيديو');
    }
  };

  const handleToggleFeaturedVideo = async (video: EducationVideo) => {
    try {
      await updateDoc(doc(db, 'education_videos', video.id), {
        isFeatured: !video.isFeatured
      });
      updateEducationVideo(video.id, { isFeatured: !video.isFeatured });
      toast.success(video.isFeatured ? 'تمت إزالة التمييز' : 'تم تعيينه كفيديو مميز ⭐');
    } catch (err) {
      toast.error('فشل التحديث');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-card-dark p-5 rounded-3xl border border-slate-200/80 dark:border-border-dark shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-emerald-500">🟢</span>
            <span>إدارة خدمات الجمهور والتعليم المجاني</span>
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1">
            تحكم كامل في الخدمات المعروضة للجمهور وفيديوهات ودورات اليوتيوب المجانية
          </p>
        </div>

        {/* Action Button */}
        {activeTab === 'services' && (
          <button
            onClick={() => handleOpenServiceModal()}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خدمة جديدة</span>
          </button>
        )}

        {activeTab === 'education' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCsvVideosImporterOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>رفع فيديوهات CSV بالجملة</span>
            </button>
            <button
              onClick={() => handleOpenVideoModal()}
              className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة كورس / فيديو يوتيوب</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-card-dark rounded-2xl border border-slate-200/80 dark:border-border-dark">
        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeTab === 'services'
              ? 'bg-white dark:bg-surface-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>خدمات الجمهور ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('education')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeTab === 'education'
              ? 'bg-white dark:bg-surface-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>فيديوهات التعليم المجاني ({educationVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            activeTab === 'suggestions'
              ? 'bg-white dark:bg-surface-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>اقتراحات المشجعين ({suggestions.length})</span>
        </button>
      </div>

      {/* TAB 1: AUDIENCE SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayServices.map((service) => {
              const isAvailable = service.status === 'active';
              const isUnderConst = service.status === 'under_construction';

              return (
                <div
                  key={service.id}
                  className="bg-white dark:bg-card-dark rounded-3xl p-5 border border-slate-200/80 dark:border-border-dark shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        onClick={() => handleToggleServiceStatus(service)}
                        className={`cursor-pointer px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 transition-transform hover:scale-105 ${
                          isAvailable
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            : isUnderConst
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                            : 'bg-slate-500/15 text-slate-500 border-slate-500/30'
                        }`}
                        title="انقر لتغيير الحالة"
                      >
                        {isAvailable ? <CheckCircle2 className="w-3 h-3" /> : isUnderConst ? <Clock className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{service.badge || (isAvailable ? 'متاح' : isUnderConst ? 'قيد التجهيز' : 'مخفي')}</span>
                      </span>

                      <span className="text-[10px] font-bold text-slate-400">
                        الترتيب: #{service.order}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {service.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>

                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-dark">
                        النوع: {service.targetType}
                      </span>
                      {service.targetUrl && (
                        <span className="truncate max-w-[150px] text-emerald-600">
                          {service.targetUrl}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-border-dark">
                    <button
                      onClick={() => handleToggleServiceStatus(service)}
                      className="text-xs font-black text-slate-500 hover:text-emerald-600 transition-colors"
                      title="تبديل الحالة"
                    >
                      {isAvailable ? 'تعيين كقيد التجهيز' : isUnderConst ? 'إخفاء' : 'تفعيل الخدمة'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenServiceModal(service)}
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: EDUCATION VIDEOS */}
      {activeTab === 'education' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayEducationVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white dark:bg-card-dark rounded-3xl overflow-hidden border border-slate-200/80 dark:border-border-dark shadow-sm flex flex-col justify-between"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-slate-900">
                  <img
                    src={video.thumbnailUrl || `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Featured badge */}
                  {video.isFeatured && (
                    <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-slate-950" />
                      <span>مميز</span>
                    </span>
                  )}

                  {video.duration && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-black">
                      {video.duration}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                      {video.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold line-clamp-2">
                      {video.description}
                    </p>
                    {video.instructor && (
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span>المحاضر: </span>
                        <span className="text-emerald-600">{video.instructor}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-border-dark">
                    <button
                      onClick={() => handleToggleFeaturedVideo(video)}
                      className={`text-xs font-black flex items-center gap-1 transition-colors ${
                        video.isFeatured ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${video.isFeatured ? 'fill-amber-500' : ''}`} />
                      <span>{video.isFeatured ? 'مميز' : 'تمييز'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <a
                        href={video.youtubeUrl || `https://www.youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 transition-colors"
                        title="مشاهدة على يوتيوب"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => handleOpenVideoModal(video)}
                        className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteVideo(video.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FAN SUGGESTIONS */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          {loadingSuggestions ? (
            <div className="p-12 text-center text-xs text-slate-500 font-bold">
              جارٍ تحميل الاقتراحات...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white dark:bg-card-dark rounded-3xl p-10 text-center border border-slate-200/80 dark:border-border-dark">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">لا توجد مقترحات واردة من المشجعين حتى الآن.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-slate-200/80 dark:border-border-dark flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                      "{item.text}"
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                      <span>المرسل: {item.userName || 'مشجع'}</span>
                      {item.userEmail && <span>({item.userEmail})</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSuggestion(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                    title="حذف المقترح"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD/EDIT SERVICE */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-border-dark shadow-2xl p-6 space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-dark">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة للجمهور'}
                </h3>
                <button
                  onClick={() => setIsServiceModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-3.5 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">اسم الخدمة *</label>
                  <input
                    type="text"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                    required
                    placeholder="مثال: فرص العمل والتوظيف"
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">وصف الخدمة *</label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    required
                    rows={2}
                    placeholder="شرح موجز عن محتوى الخدمة وما تقدمه للجمهور..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">الحالة</label>
                    <select
                      value={serviceForm.status}
                      onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="active">متاح الآن</option>
                      <option value="under_construction">قيد التجهيز</option>
                      <option value="hidden">مخفي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">الأيقونة</label>
                    <select
                      value={serviceForm.icon}
                      onChange={(e) => setServiceForm({ ...serviceForm, icon: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="GraduationCap">GraduationCap (تعليم)</option>
                      <option value="Briefcase">Briefcase (وظائف)</option>
                      <option value="Award">Award (منح وكورسات)</option>
                      <option value="BookOpen">BookOpen (مكتبة ومعرفة)</option>
                      <option value="Sparkles">Sparkles (مواهب وإبداع)</option>
                      <option value="Lightbulb">Lightbulb (مهارات وتدريب)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">نوع التوجيه</label>
                    <select
                      value={serviceForm.targetType}
                      onChange={(e) => setServiceForm({ ...serviceForm, targetType: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="education">منصة التعليم المجاني (/services/education)</option>
                      <option value="modal">نافذة تفاصيل (Modal)</option>
                      <option value="internal">رابط داخلي بالتطبيق</option>
                      <option value="link">رابط خارجي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">الرابط الموجه (اختياري)</label>
                    <input
                      type="text"
                      value={serviceForm.targetUrl || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, targetUrl: e.target.value })}
                      placeholder="/library أو https://..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">رابط صورة الغلاف (اختياري)</label>
                  <input
                    type="text"
                    value={serviceForm.image || ''}
                    onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">المزايا (مفصولة بفواصل)</label>
                  <input
                    type="text"
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    placeholder="وظائف بالإسكندرية، تدريب عملي، تواصل مباشر"
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-border-dark">
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'جارٍ الحفظ...' : 'حفظ الخدمة'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD/EDIT VIDEO */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-border-dark shadow-2xl p-6 space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border-dark">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingVideo ? 'تعديل الفيديو التعليمي' : 'إضافة فيديو تعليمي من يوتيوب'}
                </h3>
                <button
                  onClick={() => setIsVideoModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVideo} className="space-y-3.5 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">عنوان الفيديو أو الكورس *</label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    required
                    placeholder="مثال: دورة تعلم البرمجة بايثون للمبتدئين"
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">رابط يوتيوب (URL أو ID) *</label>
                  <input
                    type="text"
                    value={videoForm.youtubeUrl}
                    onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">التصنيف</label>
                    <input
                      type="text"
                      value={videoForm.category}
                      onChange={(e) => setVideoForm({ ...videoForm, category: e.target.value })}
                      placeholder="برمجة وتكنولوجيا، لغات، تسويق..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">المحاضر أو القناة</label>
                    <input
                      type="text"
                      value={videoForm.instructor || ''}
                      onChange={(e) => setVideoForm({ ...videoForm, instructor: e.target.value })}
                      placeholder="اسم المحاضر / القناة"
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1">المدة التقريبية</label>
                    <input
                      type="text"
                      value={videoForm.duration || ''}
                      onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
                      placeholder="مثال: 25:00"
                      className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!videoForm.isFeatured}
                        onChange={(e) => setVideoForm({ ...videoForm, isFeatured: e.target.checked })}
                        className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="text-slate-800 dark:text-white font-bold">تعيين كفيديو مميز في الواجهة</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-1">وصف مختصر</label>
                  <textarea
                    value={videoForm.description || ''}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    rows={2}
                    placeholder="نبذة عن ما سيتعلمه المشاهد..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-border-dark">
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'جارٍ الحفظ...' : 'حفظ الفيديو'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Videos Importer Modal */}
      <CsvVideosImporter 
        isOpen={isCsvVideosImporterOpen} 
        onClose={() => setIsCsvVideosImporterOpen(false)} 
        defaultDestination="education" 
      />
    </div>
  );
}
