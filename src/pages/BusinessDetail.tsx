import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, BusinessItem } from '../store';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { 
  Building2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Globe, 
  Instagram, 
  Facebook, 
  Share2, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  Eye,
  MousePointerClick,
  Store,
  User,
  AlertCircle,
  X,
  Send,
  ZoomIn,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Percent,
  Gift,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { businesses, profile } = useAppStore();
  
  const business = useMemo(() => {
    if (!id) return null;
    return businesses.find(b => b.id === id) || null;
  }, [id, businesses]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isAdmin = profile?.role === 'admin' || (profile?.roles && profile.roles.includes('admin')) || auth.currentUser?.email === 'copyrightofficialco@gmail.com' || auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isOwner = profile?.uid && business?.ownerId === profile.uid;

  const viewedRef = React.useRef<string | null>(null);

  // Combine cover image and gallery into one array of unique images
  const allImages = useMemo(() => {
    if (!business) return [];
    const list = [business.coverImage, ...(business.gallery || [])].filter(Boolean);
    return Array.from(new Set(list));
  }, [business]);

  // Keyboard navigation for Lightbox (ESC to exit, Arrow keys to navigate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || allImages.length === 0) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allImages.length : 0));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allImages.length) % allImages.length : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, allImages.length]);

  // Increment view count in firestore safely ONCE per session per business ID
  useEffect(() => {
    if (!id) return;
    const sessionKey = `viewed_biz_${id}`;
    if (!sessionStorage.getItem(sessionKey) && viewedRef.current !== id) {
      viewedRef.current = id;
      sessionStorage.setItem(sessionKey, 'true');
      try {
        const busRef = doc(db, 'businesses', id);
        updateDoc(busRef, {
          'stats.views': increment(1)
        }).catch(() => {});
      } catch (e) {}
    }
  }, [id]);

  const handleStatClick = (statKey: string, actionFn: () => void) => {
    if (business?.id) {
      try {
        const busRef = doc(db, 'businesses', business.id);
        updateDoc(busRef, {
          [`stats.${statKey}`]: increment(1)
        }).catch(() => {});
      } catch (e) {}
    }
    actionFn();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: business?.businessName || 'اتحاداوي بيزنس',
          text: business?.description || 'شاهد هذا المشروع في اتحاداوي بيزنس',
          url: window.location.href,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ رابط المشروع بنجاح');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) {
      toast.error('يرجى اختيار سبب الإبلاغ');
      return;
    }
    if (!business) return;

    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'business_reports'), {
        businessId: business.id,
        businessName: business.businessName,
        userId: profile?.uid || 'guest',
        userName: profile?.name || 'زائر',
        reason: reportReason,
        details: reportDetails.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('تم إرسال بلاغك بنجاح وسيتولى فريق الإدارة مراجعته 💚');
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء إرسال البلاغ');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (!business) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4 animate-bounce" />
        <h2 className="text-xl font-black mb-2">جاري تحميل بيانات المشروع...</h2>
        <p className="text-sm text-slate-500 mb-6">إذا لم يظهر المشروع قد يكون غير موجود أو تحت المراجعة.</p>
        <button
          onClick={() => navigate('/business')}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-2xl shadow-lg hover:bg-primary-dark transition-all"
        >
          العودة لدليل المشروعات
        </button>
      </div>
    );
  }

  // Check visibility if not approved
  if (business.status !== 'approved' && !isAdmin && !isOwner) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-xl font-black mb-2">المشروع قيد المراجعة أو غير متاح</h2>
        <p className="text-sm text-slate-500 mb-6">هذا المشروع ليس منشوراً للعامة حالياً.</p>
        <button
          onClick={() => navigate('/business')}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-2xl shadow-lg hover:bg-primary-dark transition-all"
        >
          العودة لدليل المشروعات
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-24">
      {/* Top Navigation */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-card-dark/80 backdrop-blur-md border-b border-slate-200/60 dark:border-border-dark px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/business')}
          className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm hover:text-primary transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>دليل اتحاداوي بيزنس</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            title="مشاركة"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 transition-colors"
            title="الإبلاغ عن المشكلات"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-6">

        {/* Status Alert for Owner/Admin */}
        {business.status !== 'approved' && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
            business.status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300' :
            business.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-300' :
            'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
          }`}>
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div className="text-xs font-bold">
              <span className="block font-black text-sm">حالة المشروع: {
                business.status === 'pending' ? '🟡 قيد المراجعة والتدقيق' :
                business.status === 'rejected' ? '🔴 تم رفض الطلب' : 'متوقف'
              }</span>
              {business.rejectionReason && (
                <span className="block mt-1 text-red-600 dark:text-red-400">سبب الرفض: {business.rejectionReason}</span>
              )}
              {business.status === 'pending' && 'سيتم تفعيل المشروع للعموم فور مراجعته من الإدارة.'}
            </div>
          </div>
        )}

        {/* Cover Image & Header Card */}
        <div className="bg-white dark:bg-card-dark rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-border-dark">
          <div 
            className="relative h-64 sm:h-80 w-full bg-slate-900 group cursor-pointer"
            onClick={() => setLightboxIndex(0)}
            title="انقر لتكبير صورة الغلاف"
          >
            <img 
              src={business.coverImage} 
              alt={business.businessName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>تكبير صورة الغلاف</span>
            </div>

            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
              {business.featured && (
                <div className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <span>⭐ مشروع مميز</span>
                </div>
              )}
              {business.discountPercentage && (
                <div className="bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-white/20">
                  <Percent className="w-3.5 h-3.5" />
                  <span>خصم {business.discountPercentage}% للاتحادوية</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 right-4 left-4 text-white">
              <div className="inline-block bg-primary/90 text-white text-xs font-black px-3 py-1 rounded-lg mb-2 backdrop-blur-md">
                {business.category}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md mb-2">
                {business.businessName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  {business.address}
                </span>

                {business.ownerName && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    صاحب المشروع: {business.ownerName}
                  </span>
                )}

                <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  عضو في مجتمع الاتحاد
                </span>
              </div>
            </div>
          </div>

          {/* Business Overview & Stats */}
          <div className="p-6 space-y-6">
            
            {/* Owner Stats Section if Owner */}
            {isOwner && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-200/80 dark:border-border-dark space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-primary" /> إحصائيات التفاعل لمشروعك:
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2">
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-slate-100 dark:border-border-dark">
                    <span className="block text-lg font-black text-primary">{business.stats?.views ?? 0}</span>
                    <span className="text-[10px] text-slate-400 font-bold">المشاهدات</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-slate-100 dark:border-border-dark">
                    <span className="block text-lg font-black text-emerald-500">{business.stats?.phoneClicks ?? 0}</span>
                    <span className="text-[10px] text-slate-400 font-bold">نقرات الاتصال</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-slate-100 dark:border-border-dark">
                    <span className="block text-lg font-black text-green-500">{business.stats?.whatsappClicks ?? 0}</span>
                    <span className="text-[10px] text-slate-400 font-bold">نقرات الواتساب</span>
                  </div>
                  <div className="bg-white dark:bg-card-dark p-2.5 rounded-xl border border-slate-100 dark:border-border-dark">
                    <span className="block text-lg font-black text-blue-500">{business.stats?.mapClicks ?? 0}</span>
                    <span className="text-[10px] text-slate-400 font-bold">نقرات الخريطة</span>
                  </div>
                </div>
              </div>
            )}

            {/* Special Ittihad Community Discount Card */}
            {business.discountPercentage && (
              <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white shadow-xl border border-emerald-400/40">
                {/* Decorative background glow */}
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shrink-0 shadow-inner">
                      <span className="text-xl font-black text-amber-300">%{business.discountPercentage}</span>
                      <span className="text-[9px] font-black uppercase text-emerald-100">خصم</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-amber-400 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5" />
                          <span>خصم خاص للاتحادوية</span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-100 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> عرض حصري
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white">
                        وفر {business.discountPercentage}% عند تعاملك مع هذا المشروع!
                      </h3>

                      <p className="text-xs sm:text-sm font-medium text-emerald-50 leading-relaxed">
                        {business.discountNote 
                          ? business.discountNote 
                          : 'يسري هذا الخصم الحصري لجمهور وأعضاء نادي الاتحاد السكندري ومتابعي قناة الاتحاد.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end sm:justify-center">
                    <div className="px-4 py-2 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15 text-center">
                      <span className="block text-[10px] font-bold text-emerald-200">طريقة الاستفادة</span>
                      <span className="text-xs font-black text-white">أظهر تطبيق الاتحاد السكندري 📱</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">عن المشروع</h3>
              <p className="text-sm sm:text-base leading-relaxed font-bold text-slate-700 dark:text-slate-200 whitespace-pre-line">
                {business.description}
              </p>
            </div>

            {/* Photo Gallery Grid */}
            {allImages.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span>معرض الصور</span>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                      {allImages.length} صور
                    </span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">انقر لتكبير أي صورة</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {allImages.map((imgUrl, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setLightboxIndex(idx)}
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-border-dark hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Gallery ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <span className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                          <ZoomIn className="w-4 h-4" />
                          <span>توسيع</span>
                        </span>
                      </div>
                      {idx === 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                          الصورة الرئيسية
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">التواصل والتفاعل</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Phone Call Button */}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    onClick={() => handleStatClick('phoneClicks', () => {})}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <Phone className="w-5 h-5" />
                    <span>اتصل الآن ({business.phone})</span>
                  </a>
                )}

                {/* WhatsApp Button */}
                {business.whatsapp && (
                  <a
                    href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStatClick('whatsappClicks', () => {})}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-green-500 hover:bg-green-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>تواصل عبر واتساب</span>
                  </a>
                )}

                {/* Google Maps Button */}
                {business.mapsUrl && (
                  <a
                    href={business.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStatClick('mapClicks', () => {})}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>الموقع على خرائط جوجل</span>
                  </a>
                )}

                {/* Website Button */}
                {business.websiteUrl && (
                  <a
                    href={business.websiteUrl.startsWith('http') ? business.websiteUrl : `https://${business.websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStatClick('websiteClicks', () => {})}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all"
                  >
                    <Globe className="w-5 h-5" />
                    <span>زيارة الموقع الإلكتروني</span>
                  </a>
                )}

                {/* Instagram Button */}
                {business.instagramUrl && (
                  <a
                    href={business.instagramUrl.startsWith('http') ? business.instagramUrl : `https://${business.instagramUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStatClick('socialClicks', () => {})}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all"
                  >
                    <Instagram className="w-5 h-5" />
                    <span>إنستغرام المشروع</span>
                  </a>
                )}

                {/* Facebook Button */}
                {business.facebookUrl && (
                  <a
                    href={business.facebookUrl.startsWith('http') ? business.facebookUrl : `https://${business.facebookUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStatClick('socialClicks', () => {})}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all"
                  >
                    <Facebook className="w-5 h-5" />
                    <span>صفحة الفيسبوك</span>
                  </a>
                )}

              </div>
            </div>

            {/* Disclaimer Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-700 dark:text-slate-300 text-xs font-bold leading-relaxed space-y-1">
              <span className="block font-black text-amber-600 dark:text-amber-400">⚠️ تنبيه إخلاء مسؤولية مهم:</span>
              <p>
                هذا الدليل هو خدمة مجتمعية تهدف لربط جماهير نادي الاتحاد السكندري ببعضهم البعض ودعم مشروعاتهم، ولا يمثل نشاطاً رسمياً أو تعاقدياً لنادي الاتحاد السكندري. إدارة المنصة غير مسؤولة عن جودة الخدمات أو المعاملات التجارية بين الأطراف.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox Modal for Gallery */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <div 
          className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Center Image Stage Container */}
          <div 
            className="relative flex-1 flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Control Bar directly ABOVE the image frame */}
            <div className="w-full flex items-center justify-between mb-3 px-2 max-w-2xl">
              <div className="bg-white/10 backdrop-blur-md text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full border border-white/10">
                صورة {lightboxIndex + 1} من {allImages.length}
              </div>

              {/* Exit Button directly ABOVE the image */}
              <button 
                onClick={() => setLightboxIndex(null)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm rounded-full shadow-2xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-red-400/30 ring-2 ring-red-500/20"
                title="إغلاق المعرض (ESC)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>إغلاق (X)</span>
              </button>
            </div>

            {/* Image frame with Next / Prev buttons */}
            <div className="relative flex items-center justify-center w-full max-w-2xl my-1">
              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev - 1 + allImages.length) % allImages.length : 0))}
                    className="absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 bg-black/70 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-all z-20 active:scale-90 border border-white/20 shadow-2xl cursor-pointer"
                    title="الصورة السابقة"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
                  </button>

                  <button 
                    onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev + 1) % allImages.length : 0))}
                    className="absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3.5 bg-black/70 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-all z-20 active:scale-90 border border-white/20 shadow-2xl cursor-pointer"
                    title="الصورة التالية"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
                  </button>
                </>
              )}

              <img 
                src={allImages[lightboxIndex]} 
                alt={`Gallery view ${lightboxIndex + 1}`} 
                className="max-w-full max-h-[58vh] sm:max-h-[64vh] rounded-2xl sm:rounded-3xl object-contain shadow-2xl border border-white/10 transition-all duration-300"
              />
            </div>

            {/* Exit Button directly BELOW the image frame */}
            <div className="mt-3 flex items-center justify-center">
              <button 
                onClick={() => setLightboxIndex(null)}
                className="px-5 py-2 bg-red-600/90 hover:bg-red-600 text-white font-black text-xs sm:text-sm rounded-full shadow-2xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-red-400/40"
              >
                <X className="w-4 h-4" />
                <span>إغلاق المعرض</span>
              </button>
            </div>
          </div>

          {/* Bottom Bar Thumbnails & Dismiss Hint */}
          <div className="w-full max-w-4xl mx-auto space-y-2 z-10 mt-2" onClick={(e) => e.stopPropagation()}>
            {allImages.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 transition-all border-2 cursor-pointer ${
                      lightboxIndex === idx ? 'border-primary scale-105 shadow-lg ring-2 ring-primary/50' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <p className="text-center text-[11px] font-bold text-slate-400">
              يمكنك أيضاً الضغط على زر ESC أو النقر في أي مكان خارج الصورة للخروج
            </p>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card-dark rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-border-dark shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark pb-3">
              <h3 className="font-black text-base flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-5 h-5" />
                <span>الإبلاغ عن المشروع</span>
              </h3>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1">سبب الإبلاغ *</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  required
                >
                  <option value="">اختر السبب...</option>
                  <option value="محتوى غير لائق أو مخالف">محتوى غير لائق أو مخالف للقيم</option>
                  <option value="بيانات وهمية أو احتيال">بيانات وهمية أو شبهة احتيال</option>
                  <option value="معلومات اتصال خاطئة">معلومات اتصال خاطئة أو لا تعمل</option>
                  <option value="صاحب المشروع لا ينتمي للجمهور">صاحب المشروع لا ينتمي للجمهور</option>
                  <option value="أخرى">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-1">تفاصيل إضافية (اختياري)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="اكتب توضيحاً للإدارة..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال البلاغ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="py-3 px-5 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
