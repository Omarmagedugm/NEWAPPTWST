import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, PublicService } from '../store';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Briefcase,
  Award,
  BookOpen,
  Sparkles,
  Lightbulb,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Info,
  ExternalLink,
  ShieldCheck,
  Search,
  MessageCircle,
  HelpCircle,
  X,
  Share2,
  Heart
} from 'lucide-react';

export default function PublicServices() {
  const navigate = useNavigate();
  const { services, profile } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'under_construction'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [suggestionText, setSuggestionText] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  const isDev = auth.currentUser?.email === 'copyrightofficialco@gmail.com' || auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isAdmin = (profile?.role === 'admin' || profile?.role === 'moderator' || (profile?.roles && (profile.roles.includes('admin') || profile.roles.includes('moderator')))) || isDev;

  // Filter services
  const visibleServices = services.filter(service => {
    // Hide 'hidden' services unless user is admin
    if (service.status === 'hidden' && !isAdmin) return false;

    // Filter tab
    if (activeFilter === 'active' && service.status !== 'active') return false;
    if (activeFilter === 'under_construction' && service.status !== 'under_construction') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = service.title.toLowerCase().includes(q);
      const matchDesc = service.description.toLowerCase().includes(q);
      const matchFeatures = service.features?.some(f => f.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchFeatures) return false;
    }

    return true;
  }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const renderServiceIcon = (iconName: string) => {
    const iconClass = "w-6 h-6";
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className={iconClass} />;
      case 'Briefcase':
        return <Briefcase className={iconClass} />;
      case 'Award':
        return <Award className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      case 'Lightbulb':
        return <Lightbulb className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const handleServiceClick = (service: PublicService) => {
    if (service.targetType === 'education') {
      navigate(service.targetUrl || '/services/education');
    } else if (service.targetType === 'internal' && service.targetUrl) {
      navigate(service.targetUrl);
    } else if (service.targetType === 'link' && service.targetUrl) {
      window.open(service.targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedService(service);
    }
  };

  const handleShare = async (service: PublicService) => {
    const shareData = {
      title: `${service.title} | خدمات الجمهور - قناة الاتحاد السكندري`,
      text: `${service.title} - ${service.description}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        toast.success('تم نسخ الرابط بنجاح!');
      } catch (err) {
        toast.error('تعذر نسخ الرابط');
      }
    }
  };

  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    setIsSubmittingSuggestion(true);
    try {
      await addDoc(collection(db, 'service_suggestions'), {
        text: suggestionText.trim(),
        userId: auth.currentUser?.uid || 'guest',
        userName: profile?.name || 'مشجع سكندري',
        userEmail: auth.currentUser?.email || '',
        createdAt: serverTimestamp(),
      });
      toast.success('شكراً لاقتراحك! تم إرسال طلبك لإدارة القناة بنجاح 💚');
      setSuggestionText('');
    } catch (err) {
      console.error('Error submitting suggestion:', err);
      toast.error('حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-12 text-slate-800 dark:text-slate-100 bg-background-light dark:bg-background-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/15 via-primary/5 to-transparent pt-6 pb-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>بوابة مجانية 100% للجمهور</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2"
          >
            <span>خدمات الجمهور</span>
            <span className="text-emerald-500">💚</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto font-bold leading-relaxed"
          >
            خدمات ومحتوى مجاني نقدمه لجمهور الاتحاد السكندري العظيم لدعم الشباب وتطوير المهارات وفتح آفاق جديدة للعمل والمعرفة
          </motion.p>

          {/* Quick Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative max-w-md mx-auto pt-2"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن خدمة، دورة، أو فرصة..."
                className="w-full pl-10 pr-11 py-3 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-md transition-all"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Education Highlight Banner (Spotlight) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-950 p-6 sm:p-7 text-white shadow-xl border border-emerald-500/20"
        >
          {/* Subtle Background Accent */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/30">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>الخدمة المميزة</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                منصة التعليم المجاني 🎓
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed">
                مكتبة تعليمية متكاملة تضم أفضل الدورات والشروحات المجانية المختارة في البرمجة، اللغات، ريادة الأعمال، والتسويق، مصممة خصيصاً لشباب الثغر.
              </p>
            </div>

            <Link
              to="/services/education"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 shrink-0 self-stretch md:self-auto text-center"
            >
              <span>دخول منصة التعليم</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-card-dark rounded-2xl border border-slate-200/80 dark:border-border-dark">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-surface-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              جميع الخدمات ({services.length})
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeFilter === 'active'
                  ? 'bg-white dark:bg-surface-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              متاح الآن ({services.filter(s => s.status === 'active').length})
            </button>
            <button
              onClick={() => setActiveFilter('under_construction')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeFilter === 'under_construction'
                  ? 'bg-white dark:bg-surface-dark text-amber-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              قيد التجهيز ({services.filter(s => s.status === 'under_construction').length})
            </button>
          </div>

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>إدارة الخدمات من لوحة التحكم ⚙️</span>
            </Link>
          )}
        </div>

        {/* Services Grid */}
        {visibleServices.length === 0 ? (
          <div className="bg-white dark:bg-card-dark rounded-3xl p-10 text-center border border-slate-200/80 dark:border-border-dark shadow-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">لم يتم العثور على خدمات مطابقة</h3>
            <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
              جرب البحث بكلمات أخرى أو اختر تصفح جميع الخدمات المتاحة
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleServices.map((service, index) => {
              const isAvailable = service.status === 'active';
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white dark:bg-card-dark rounded-3xl border border-slate-200/80 dark:border-border-dark hover:border-emerald-500/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Card Header Image / Thumbnail (if available) */}
                  {service.image && (
                    <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-black shadow-md backdrop-blur-md flex items-center gap-1.5 ${
                            isAvailable
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-amber-500/90 text-white'
                          }`}
                        >
                          {isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{service.badge || (isAvailable ? 'متاح الآن' : 'قيد التجهيز')}</span>
                        </span>
                      </div>

                      {/* Share Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(service);
                        }}
                        className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center transition-colors"
                        title="مشاركة الخدمة"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* Icon overlay */}
                      <div className="absolute -bottom-4 right-4 w-12 h-12 rounded-2xl bg-white dark:bg-surface-dark shadow-lg border border-slate-200/80 dark:border-border-dark flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold z-10 group-hover:scale-110 transition-transform">
                        {renderServiceIcon(service.icon)}
                      </div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className={`p-5 flex-1 flex flex-col justify-between space-y-4 ${service.image ? 'pt-6' : ''}`}>
                    <div className="space-y-2">
                      {!service.image && (
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            {renderServiceIcon(service.icon)}
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              isAvailable
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {service.badge || (isAvailable ? 'متاح الآن' : 'قيد التجهيز')}
                          </span>
                        </div>
                      )}

                      <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {service.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed line-clamp-3">
                        {service.description}
                      </p>

                      {/* Features bullets */}
                      {service.features && service.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {service.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-border-dark/60"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-border-dark">
                      <button
                        onClick={() => handleServiceClick(service)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          isAvailable
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-98'
                            : 'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {service.targetType === 'education' ? (
                          <>
                            <span>دخول المنصة التعليمية</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </>
                        ) : service.targetType === 'internal' ? (
                          <>
                            <span>تصفح المحتوى</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </>
                        ) : service.targetType === 'link' ? (
                          <>
                            <span>زيارة الرابط</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </>
                        ) : isAvailable ? (
                          <>
                            <span>عرض التفاصيل والتسجيل</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>معلومات عن موعد الإطلاق</span>
                            <Info className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Suggestion Box for Audience */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-card-dark rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-border-dark shadow-sm space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                اقترح خدمة تهم جمهور الاتحاد السكندري 💡
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                نسعى دائماً لخدمتكم، شاركنا أفكارك لكورسات أو ملتقيات أو خدمات مجانية ترغب في توفيرها
              </p>
            </div>
          </div>

          <form onSubmit={handleSendSuggestion} className="space-y-3">
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="اكتب مقترحك أو الخدمة التي ترغب بوجودها..."
              rows={3}
              className="w-full p-3.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingSuggestion || !suggestionText.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingSuggestion ? 'جارٍ الإرسال...' : 'إرسال المقترح'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Modal Dialog for Service Details (Jobs, Scholarships, Talents, etc.) */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-border-dark shadow-2xl overflow-hidden p-6 space-y-4"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 left-4 p-2 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Service Header */}
              <div className="flex items-center gap-3 pr-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  {renderServiceIcon(selectedService.icon)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedService.title}
                  </h3>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black mt-1 ${
                      selectedService.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {selectedService.badge || (selectedService.status === 'active' ? 'متاح الآن' : 'قيد التجهيز')}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 bg-slate-50 dark:bg-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-border-dark">
                <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-500" />
                  <span>عن الخدمة</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                  {selectedService.description}
                </p>
              </div>

              {/* Features List */}
              {selectedService.features && selectedService.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">
                    أبرز المزايا والتفاصيل:
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedService.features.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notice for Under Construction */}
              {selectedService.status === 'under_construction' ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>هذه الخدمة قيد الإعداد حالياً وسيتم إطلاقها رسمياً عبر إشعار خاص قريباً.</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>الخدمة مجانية 100% لجميع أفراد جمهور زعيم الثغر.</span>
                </div>
              )}

              {/* Footer Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setSelectedService(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    handleShare(selectedService);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>مشاركة</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
