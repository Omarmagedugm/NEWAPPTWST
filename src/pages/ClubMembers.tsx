import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Pin, Megaphone, Clock, MapPin, Phone, FileText, ChevronLeft, 
  Search, ShieldCheck, Dumbbell, Building2, HelpCircle, Calendar, 
  CheckCircle2, AlertCircle, ArrowLeft, X, ExternalLink, Sparkles, Filter, Info,
  Compass, Ticket, DollarSign, Palmtree, User, Waves, Target, Trophy, Activity,
  CalendarDays, Clock3, Medal, Percent, Sun, BookOpen, UserCheck, Landmark, BadgeCheck,
  GraduationCap, HeartPulse, ShoppingBag, Code
} from 'lucide-react';
import { useAppStore, ClubCommittee, ClubAnnouncement, ClubService, ClubTrip } from '../store';

export default function ClubMembers() {
  const navigate = useNavigate();
  const { clubCommittees, clubAnnouncements, clubServices, clubTrips, clubMembersSettings } = useAppStore();

  const [activeTab, setActiveTab] = useState<'committees' | 'services' | 'noticeboard' | 'trips'>('committees');
  const [selectedCommittee, setSelectedCommittee] = useState<ClubCommittee | null>(null);
  const [selectedService, setSelectedService] = useState<ClubService | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<ClubAnnouncement | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<ClubTrip | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const getServiceSportIcon = (title: string, category: string) => {
    const t = title.toLowerCase();
    const c = category.toLowerCase();
    if (t.includes('أحوال مدنية') || t.includes('سجل مدني') || t.includes('رقم قومي') || t.includes('شهادات')) {
      return <Landmark size={20} className="text-indigo-500 shrink-0" />;
    }
    if (t.includes('فصل العضوية') || t.includes('عضوية') || c.includes('عضوية') || c.includes('اشتراكات') || t.includes('اشتراك')) {
      return <UserCheck size={20} className="text-emerald-500 shrink-0" />;
    }
    if (t.includes('تعليم') || t.includes('تطوع') || t.includes('معلم') || t.includes('ألماني') || t.includes('دورات') || c.includes('تعليم')) {
      return <GraduationCap size={20} className="text-blue-500 shrink-0" />;
    }
    if (t.includes('برمج') || t.includes('ذكاء اصطناعي') || t.includes('ai') || t.includes('كود')) {
      return <Code size={20} className="text-purple-500 shrink-0" />;
    }
    if (t.includes('صحة') || t.includes('طبي') || t.includes('إنجابي') || t.includes('تنظيم أسرة') || c.includes('طبي')) {
      return <HeartPulse size={20} className="text-rose-500 shrink-0" />;
    }
    if (t.includes('معرض') || t.includes('مدارس') || t.includes('أدوات') || t.includes('مكتب') || t.includes('school')) {
      return <ShoppingBag size={20} className="text-amber-500 shrink-0" />;
    }
    if (t.includes('مولد') || t.includes('حفل') || t.includes('احتفال') || t.includes('مناسبات')) {
      return <Sparkles size={20} className="text-amber-500 shrink-0" />;
    }
    if (t.includes('صيفية') || t.includes('صيفي') || t.includes('أكاديميات')) {
      return <Sun size={20} className="text-amber-500 shrink-0" />;
    }
    if (t.includes('قرآن') || t.includes('تحفيظ')) {
      return <BookOpen size={20} className="text-emerald-600 shrink-0" />;
    }
    if (t.includes('جيم') || t.includes('gym') || t.includes('لياقة') || t.includes('صالة')) {
      return <Dumbbell size={20} className="text-amber-500 shrink-0" />;
    }
    if (t.includes('بادل') || t.includes('padel') || t.includes('راكت') || t.includes('مضرب')) {
      return <Target size={20} className="text-emerald-500 shrink-0" />;
    }
    if (t.includes('سباحة') || t.includes('مسبح') || t.includes('pool') || t.includes('غطس') || t.includes('مياه')) {
      return <Waves size={20} className="text-cyan-500 shrink-0" />;
    }
    if (t.includes('تنس') || t.includes('طاولة') || t.includes('tennis')) {
      return <Trophy size={20} className="text-purple-500 shrink-0" />;
    }
    if (t.includes('قدم') || t.includes('سلة') || t.includes('طائرة') || t.includes('كاراتيه') || t.includes('جودو') || t.includes('ملعب') || t.includes('نشاط')) {
      return <Activity size={20} className="text-green-500 shrink-0" />;
    }
    if (c.includes('حكومية') || t.includes('فيش') || t.includes('توثيق') || t.includes('شهر عقاري')) {
      return <FileText size={20} className="text-blue-500 shrink-0" />;
    }
    return <Building2 size={20} className="text-primary shrink-0" />;
  };

  const committeesList = useMemo(() => {
    const list = (clubCommittees && clubCommittees.length > 0) ? clubCommittees.filter(c => c.status !== 'inactive') : [];
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [clubCommittees]);

  const servicesList = useMemo(() => {
    const list = (clubServices && clubServices.length > 0) ? clubServices.filter(s => s.active !== false) : [];
    
    return list.filter(service => {
      const matchQuery = !searchQuery || 
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.requirements && service.requirements.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchCat = selectedCategory === 'all' || service.category === selectedCategory;

      return matchQuery && matchCat;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [clubServices, searchQuery, selectedCategory]);

  const announcementsList = useMemo(() => {
    const list = (clubAnnouncements && clubAnnouncements.length > 0) ? clubAnnouncements.filter(a => a.active !== false) : [];

    return list.filter(ann => {
      // Exclude trip announcements from the main announcements tab as requested ("شيل اعلانات الرحلات من قسم الاعلانات")
      const isTrip = ann.category === 'لجنة الرحلات' || 
                     ann.category === 'الرحلات' || 
                     ann.committeeId === 'comm-2' ||
                     (ann.title && (ann.title.includes('رحل') || ann.title.includes('الغردقة') || ann.title.includes('بورسعيد') || ann.title.includes('مطروح')));
      if (isTrip) return false;

      const matchQuery = !searchQuery || 
        ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ann.category && ann.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchPriority = selectedPriority === 'all' || ann.priority === selectedPriority;

      return matchQuery && matchPriority;
    }).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [clubAnnouncements, searchQuery, selectedPriority]);

  const tripsList = useMemo(() => {
    const list = (clubTrips && clubTrips.length > 0) ? clubTrips.filter(t => t.active !== false) : [];

    return list.filter(trip => {
      const matchQuery = !searchQuery || 
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchQuery;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [clubTrips, searchQuery]);

  const serviceCategories = useMemo(() => {
    const categories = new Set<string>();
    if (clubServices && clubServices.length > 0) {
      clubServices.forEach(s => { if (s.category && s.active !== false) categories.add(s.category); });
    }
    return Array.from(categories);
  }, [clubServices]);

  const hotline = clubMembersSettings?.phoneHotline || '1914 / 03-4802201';
  const hours = clubMembersSettings?.workingHours || 'يومياً من ٩ صباحاً حتى ١٠ مساءً';
  const notice = clubMembersSettings?.memberNotice || 'مرحباً بأعضاء نادي الاتحاد السكندري - نعتز بملاحظتكم وخدمتكم عبر بوابتنا الرقمية';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-24 pt-2">
      {/* Top Banner Identity */}
      <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 mb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-dark via-primary to-emerald-900 text-white p-5 shadow-xl border border-primary/30">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-white leading-tight">بوابة أعضاء النادي</h1>
                  <p className="text-[10px] font-bold text-amber-300/90 tracking-wider">نادي الاتحاد السكندري - زعيم الثغر</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Sparkles size={12} /> الخدمة الذاتية
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-100/90 leading-relaxed bg-white/5 p-2.5 rounded-2xl border border-white/10">
              {notice}
            </p>

            {/* Quick Stats/Hotline Bar */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-bold text-slate-200">
              <a href={`tel:${hotline.split('/')[0].trim()}`} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all p-2 rounded-xl border border-white/10">
                <Phone size={14} className="text-amber-300 shrink-0" />
                <div className="truncate">
                  <span className="block text-[9px] text-slate-300 font-normal">الخط الساخن</span>
                  <span className="font-black text-amber-200">{hotline}</span>
                </div>
              </a>
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10">
                <Clock size={14} className="text-amber-300 shrink-0" />
                <div className="truncate">
                  <span className="block text-[9px] text-slate-300 font-normal">ساعات العمل</span>
                  <span className="font-bold text-white text-[10px]">{hours}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discounts Feature Card Banner */}
      <div className="max-w-md mx-auto px-4 mb-4">
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/club-members/discounts')}
          className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-3.5 text-white shadow-md border border-emerald-500/30 cursor-pointer relative overflow-hidden flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 z-10">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
              <Percent size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-white leading-tight">الخصومات</h2>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900">جديد</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-100/90 mt-0.5">استفد من الخصومات والمزايا المتاحة للأعضاء</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:bg-white/30 transition-all z-10">
            <ChevronLeft size={18} />
          </div>
        </motion.div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 mb-4">
        <div className="flex items-center bg-white dark:bg-card-dark p-1.5 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
          <button
            onClick={() => setActiveTab('committees')}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'committees' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <Users size={16} />
            <span>لجان النادي</span>
          </button>
          
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'services' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <Building2 size={16} />
            <span>الخدمات</span>
          </button>

          <button
            onClick={() => setActiveTab('noticeboard')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'noticeboard' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <Megaphone size={14} />
            <span>الإعلانات</span>
          </button>

          <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'trips' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-slate-600 dark:text-slate-400 hover:text-primary'
            }`}
          >
            <Palmtree size={14} />
            <span>الرحلات</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      {(activeTab === 'services' || activeTab === 'noticeboard' || activeTab === 'trips') && (
        <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 mb-4 space-y-2">
          <div className="relative flex items-center">
            <Search size={18} className="absolute right-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'services' ? "ابحث في خدمات النادي (الفيش، الجيم...)" : activeTab === 'trips' ? "ابحث في رحلات النادي (الأقصر، شرم الشيخ...)" : "ابحث في الإعلانات والتنويهات..."}
              className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-card-dark text-slate-800 dark:text-white rounded-2xl border border-border-light dark:border-border-dark text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Pills for Services */}
          {activeTab === 'services' && serviceCategories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                  selectedCategory === 'all' 
                    ? 'bg-primary/10 text-primary border border-primary/30' 
                    : 'bg-white dark:bg-card-dark text-slate-500 border border-border-light dark:border-border-dark'
                }`}
              >
                الكل
              </button>
              {serviceCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-primary/10 text-primary border border-primary/30' 
                      : 'bg-white dark:bg-card-dark text-slate-500 border border-border-light dark:border-border-dark'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Filter Pills for Announcements */}
          {activeTab === 'noticeboard' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'جميع الإعلانات' },
                { id: 'urgent', label: '🚨 عاجل' },
                { id: 'important', label: '⭐ هام' },
                { id: 'normal', label: 'عام' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPriority(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                    selectedPriority === p.id 
                      ? 'bg-primary/10 text-primary border border-primary/30' 
                      : 'bg-white dark:bg-card-dark text-slate-500 border border-border-light dark:border-border-dark'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4">
        {/* ----------------- TAB 1: COMMITTEES ----------------- */}
        {activeTab === 'committees' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Users size={16} className="text-primary" />
                لجان النادي العاملة
              </h2>
              <span className="text-[10px] font-bold text-slate-400">اختر اللجنة لعرض لوحة إعلاناتها</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {committeesList.map((committee) => {
                const committeeAnnouncementsCount = (clubAnnouncements || []).filter(
                  a => a.committeeId === committee.id && a.active !== false
                ).length;

                return (
                  <motion.div
                    key={committee.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCommittee(committee)}
                    className="group bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-border-light dark:border-border-dark shadow-sm hover:border-primary/40 transition-all cursor-pointer flex flex-col"
                  >
                    {committee.image && (
                      <div className="relative h-28 w-full overflow-hidden bg-slate-200">
                        <img 
                          src={committee.image} 
                          alt={committee.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <span className="absolute bottom-2 right-3 text-white font-black text-sm drop-shadow">
                          {committee.name}
                        </span>
                        {committeeAnnouncementsCount > 0 && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm flex items-center gap-1">
                            <Megaphone size={10} /> {committeeAnnouncementsCount} إعلان
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-4 flex flex-col justify-between flex-1">
                      {!committee.image && (
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-black text-slate-800 dark:text-white">{committee.name}</h3>
                          {committeeAnnouncementsCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              {committeeAnnouncementsCount} إعلان
                            </span>
                          )}
                        </div>
                      )}
                      
                      {(committee.president || committee.vicePresident) && (
                        <div className="mb-2 p-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-1 text-[11px]">
                          {committee.president && (
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary">الرئيس</span>
                              <span>{committee.president}</span>
                            </div>
                          )}
                          {committee.vicePresident && (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">النائب</span>
                              <span>{committee.vicePresident}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {committee.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-xs font-bold text-primary">
                        <span className="flex items-center gap-1">
                          عرض لوحة الإعلانات والتفاصيل
                        </span>
                        <ChevronLeft size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: SERVICES CENTER ----------------- */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            {/* Professional Sports & Activity Weekly Timetable Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-primary-dark to-slate-900 text-white p-4 rounded-3xl shadow-lg border border-primary/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">جدول المواعيد والأنشطة الأسبوعية</h3>
                    <p className="text-[10px] text-amber-200/90 font-bold">مواعيد الصالات والملاعب وأنشطة النادي</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Clock3 size={11} /> جدول ٢٠٢٦
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold">
                    <Dumbbell size={16} />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white truncate">الجيم والصالة الرياضية</span>
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded shrink-0">السبت - الخميس</span>
                    </div>
                    <p className="text-[10px] text-slate-200">٨:٠٠ ص - ١٠:٠٠ م | الجمعة: ٢:٠٠ ظ - ٩:٠٠ م</p>
                    <span className="text-[9px] text-slate-300 font-semibold block truncate">📍 فرع الشاطبي وسموحة (مواعيد خاصة للسيدات)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 font-bold">
                    <Target size={16} />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white truncate">ملاعب البادل والراكت</span>
                      <span className="text-[9px] font-bold text-emerald-300 bg-emerald-400/20 px-1.5 py-0.5 rounded shrink-0">يومياً</span>
                    </div>
                    <p className="text-[10px] text-slate-200">٩:٠٠ ص - ١٢:٠٠ منتصف الليل (الحجز مسبقاً)</p>
                    <span className="text-[9px] text-slate-300 font-semibold block truncate">📍 فرع سموحة وفرع الشاطبي</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 font-bold">
                    <Waves size={16} />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white truncate">حمام السباحة الأولمبي</span>
                      <span className="text-[9px] font-bold text-cyan-300 bg-cyan-400/20 px-1.5 py-0.5 rounded shrink-0">يومياً</span>
                    </div>
                    <p className="text-[10px] text-slate-200">٧:٠٠ ص - ٩:٠٠ م (سباحة حرة وأكاديمية)</p>
                    <span className="text-[9px] text-slate-300 font-semibold block truncate">📍 الشاطبي وسموحة</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 font-bold">
                    <Trophy size={16} />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white truncate">أكاديمية تنس الطاولة</span>
                      <span className="text-[9px] font-bold text-purple-300 bg-purple-400/20 px-1.5 py-0.5 rounded shrink-0">أحد، ثلاثاء، خميس، جمعة</span>
                    </div>
                    <p className="text-[10px] text-slate-200">٤:٠٠ م - ١٠:٠٠ م (لأبناء وأعضاء النادي)</p>
                    <span className="text-[9px] text-slate-300 font-semibold block truncate">📍 الصالات المغطاة الشاطبي</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 size={16} className="text-primary" />
                دليل خدمات وأنشطة النادي
              </h2>
              <span className="text-[10px] font-bold text-slate-400">{servicesList.length} خدمة متاحة</span>
            </div>

            {servicesList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {servicesList.map((service) => (
                  <motion.div
                    key={service.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedService(service)}
                    className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm hover:border-primary/40 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center shrink-0 border border-border-light dark:border-border-dark">
                          {getServiceSportIcon(service.title, service.category)}
                        </div>
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black bg-primary/10 text-primary">
                            {service.category}
                          </span>
                          <h3 className="text-sm font-black text-slate-800 dark:text-white leading-snug">
                            {service.title}
                          </h3>
                        </div>
                      </div>

                      {service.phone && (
                        <a
                          href={`tel:${service.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 hover:bg-emerald-500 hover:text-white transition-all"
                          title="اتصال مباشر"
                        >
                          <Phone size={16} />
                        </a>
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>

                    <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-100 dark:border-border-dark text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-primary shrink-0" />
                        <span className="truncate">{service.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-500/5 p-1.5 rounded-xl border border-amber-500/15">
                        <Clock size={13} className="text-amber-500 shrink-0" />
                        <span className="truncate text-amber-800 dark:text-amber-300 font-bold">{service.workingHours}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <HelpCircle size={36} className="mx-auto opacity-50" />
                <p className="text-xs font-bold">لم يتم العثور على خدمات مطابقة</p>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 3: NOTICE BOARD ----------------- */}
        {activeTab === 'noticeboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Megaphone size={16} className="text-amber-500" />
                لوحة الإعلانات والتنويهات الرقمية
              </h2>
              <span className="text-[10px] font-bold text-slate-400">{announcementsList.length} إعلان</span>
            </div>

            {announcementsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {announcementsList.map((ann) => (
                  <motion.div
                    key={ann.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedAnnouncement(ann)}
                    className={`bg-white dark:bg-card-dark rounded-2xl p-4 border shadow-sm transition-all cursor-pointer relative overflow-hidden ${
                      ann.priority === 'urgent' 
                        ? 'border-red-500/40 bg-red-500/5' 
                        : ann.pinned 
                        ? 'border-amber-500/40 bg-amber-500/5' 
                        : 'border-border-light dark:border-border-dark'
                    }`}
                  >
                    {ann.pinned && (
                      <div className="absolute top-2 left-2 text-amber-500" title="إعلان مثبت">
                        <Pin size={14} className="rotate-45" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-1.5">
                      {ann.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-red-500 text-white animate-pulse">
                          🚨 عاجل جداً
                        </span>
                      )}
                      {ann.priority === 'important' && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          ⭐ هام
                        </span>
                      )}
                      {ann.category && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300">
                          {ann.category}
                        </span>
                      )}
                      <span className="text-[9px] font-medium text-slate-400 mr-auto">
                        {new Date(ann.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1.5 leading-snug">
                      {ann.title}
                    </h3>

                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {ann.content}
                    </p>

                    {ann.image && (
                      <div className="mt-3 rounded-xl overflow-hidden h-32 bg-slate-100">
                        <img src={ann.image} alt={ann.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Megaphone size={36} className="mx-auto opacity-50" />
                <p className="text-xs font-bold">لا توجد إعلانات حالياً</p>
              </div>
            )}
          </div>
        )}

        {/* TRIPS TAB */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            {tripsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {tripsList.map((trip) => (
                  <motion.div
                    key={trip.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedTrip(trip)}
                    className="p-4 rounded-3xl bg-white dark:bg-card-dark border border-border-light dark:border-border-dark hover:border-primary/40 transition-all shadow-sm cursor-pointer space-y-3 relative overflow-hidden"
                  >
                    {trip.image && (
                      <div className="rounded-2xl overflow-hidden h-36 bg-slate-100 relative">
                        <img src={trip.image} alt={trip.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black backdrop-blur-md shadow-md ${
                            trip.status === 'upcoming' ? 'bg-emerald-500/90 text-white' :
                            trip.status === 'ongoing' ? 'bg-amber-500/90 text-white' :
                            trip.status === 'completed' ? 'bg-slate-700/90 text-white' : 'bg-red-500/90 text-white'
                          }`}>
                            {trip.status === 'upcoming' ? '🚌 متاحة للحجز' : trip.status === 'ongoing' ? '⏳ جارية' : trip.status === 'completed' ? '✅ منتهية' : '❌ ملغاة'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-primary">
                        <Compass size={13} />
                        <span>📍 {trip.destination}</span>
                        {(trip.startDate || trip.endDate) && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 dark:text-slate-400">📅 {trip.startDate}</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-800 dark:text-white leading-snug line-clamp-2">
                        {trip.title}
                      </h3>

                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {trip.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-border-dark text-xs">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-normal">سعر العضو</span>
                          <span className="text-primary font-black">{trip.priceMember} ج.م</span>
                        </div>
                        {trip.priceNonMember > 0 && (
                          <div>
                            <span className="text-[9px] text-slate-400 block font-normal">المرافق</span>
                            <span className="text-slate-600 dark:text-slate-300 font-extrabold">{trip.priceNonMember} ج.م</span>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 bg-primary/10 px-2.5 py-1 rounded-xl">
                        التفاصيل والحجز
                        <ChevronLeft size={12} />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Palmtree size={36} className="mx-auto opacity-50" />
                <p className="text-xs font-bold">لا توجد رحلات مسجلة حالياً</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------- MODALS ------------------- */}

      {/* COMMITTEE MODAL (Notice board for selected committee) */}
      <AnimatePresence>
        {selectedCommittee && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCommittee(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white dark:bg-card-dark rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-border-light dark:border-border-dark"
            >
              {/* Header Image */}
              {selectedCommittee.image ? (
                <div className="relative h-40 w-full bg-slate-200 shrink-0">
                  <img 
                    src={selectedCommittee.image} 
                    alt={selectedCommittee.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                  <button 
                    onClick={() => setSelectedCommittee(null)}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <div className="absolute bottom-3 right-4 left-4 text-white">
                    <h2 className="text-lg font-black">{selectedCommittee.name}</h2>
                    <p className="text-[10px] text-slate-200">لوحة الإعلانات والتوجيهات الخاصة باللجنة</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-primary text-white flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-base font-black">{selectedCommittee.name}</h2>
                    <p className="text-[10px] text-amber-200">لوحة إعلانات اللجنة</p>
                  </div>
                  <button 
                    onClick={() => setSelectedCommittee(null)}
                    className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Committee Leadership & Description */}
              <div className="p-4 border-b border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-surface-dark space-y-2">
                {(selectedCommittee.president || selectedCommittee.vicePresident) && (
                  <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-white dark:bg-card-dark border border-border-light dark:border-border-dark">
                    {selectedCommittee.president && (
                      <div>
                        <span className="text-[10px] font-black text-slate-400 block mb-0.5">رئيس اللجنة</span>
                        <span className="font-bold text-slate-800 dark:text-white">{selectedCommittee.president}</span>
                      </div>
                    )}
                    {selectedCommittee.vicePresident && (
                      <div>
                        <span className="text-[10px] font-black text-slate-400 block mb-0.5">نائب رئيس اللجنة</span>
                        <span className="font-bold text-slate-800 dark:text-white">{selectedCommittee.vicePresident}</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedCommittee.description}
                </p>
              </div>

              {/* Committee Announcements List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
                  <Megaphone size={14} className="text-amber-500" />
                  إعلانات وقرارات اللجنة
                </h3>

                {(() => {
                  const isTripComm = selectedCommittee.id === 'comm-2' || selectedCommittee.name.includes('الرحلات');
                  const committeeAnns = (clubAnnouncements || []).filter(
                    a => (a.committeeId === selectedCommittee.id || (isTripComm && (a.category === 'لجنة الرحلات' || a.category === 'الرحلات' || a.title.includes('رحل')))) && a.active !== false
                  );

                  return (
                    <div className="space-y-3">
                      {committeeAnns.length === 0 && (!isTripComm || tripsList.length === 0) ? (
                        <div className="py-8 text-center text-slate-400 space-y-1">
                          <Info size={28} className="mx-auto opacity-50" />
                          <p className="text-xs font-bold">لا توجد إعلانات منشورة لهذه اللجنة حالياً</p>
                        </div>
                      ) : (
                        committeeAnns.map((ann) => (
                          <div 
                            key={ann.id}
                            onClick={() => setSelectedAnnouncement(ann)}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary/40 cursor-pointer transition-all space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                {ann.category || 'إعلان مهم'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {new Date(ann.createdAt).toLocaleDateString('ar-EG')}
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white">{ann.title}</h4>
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {ann.content}
                            </p>
                          </div>
                        ))
                      )}

                      {isTripComm && tripsList.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-border-dark space-y-2">
                          <h4 className="text-xs font-black text-primary uppercase flex items-center gap-1.5">
                            <Palmtree size={14} />
                            جدول رحلات وبرامج النادي المتاحة
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {tripsList.map((trip) => (
                              <div
                                key={trip.id}
                                onClick={() => setSelectedTrip(trip)}
                                className="p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/20 cursor-pointer transition-all flex items-center justify-between gap-3"
                              >
                                <div>
                                  <h5 className="text-xs font-black text-slate-800 dark:text-white">{trip.title}</h5>
                                  <p className="text-[10px] font-bold text-primary">{trip.destination} • {trip.priceMember} ج.م للعضو</p>
                                </div>
                                <span className="px-2.5 py-1 bg-primary text-white text-[10px] font-black rounded-xl shrink-0">
                                  التفاصيل
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SERVICE DETAIL MODAL */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedService(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white dark:bg-card-dark rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-border-light dark:border-border-dark"
            >
              <div className="p-4 bg-primary text-white flex items-center justify-between shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-amber-300 bg-white/10 px-2 py-0.5 rounded">
                    {selectedService.category}
                  </span>
                  <h2 className="text-base font-black leading-tight">{selectedService.title}</h2>
                </div>
                <button 
                  onClick={() => setSelectedService(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
                {selectedService.image && (
                  <div className="rounded-2xl overflow-hidden h-36 bg-slate-100">
                    <img src={selectedService.image} alt={selectedService.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 dark:text-white">وصف الخدمة:</h3>
                  <p className="font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedService.description}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    <MapPin size={16} className="text-primary shrink-0" />
                    <span>الموقع: {selectedService.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                    <Clock size={16} className="text-amber-500 shrink-0" />
                    <span>مواعيد العمل: {selectedService.workingHours}</span>
                  </div>
                  {selectedService.phone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                      <Phone size={16} className="text-emerald-500 shrink-0" />
                      <span>الهاتف: {selectedService.phone}</span>
                    </div>
                  )}
                </div>

                {selectedService.requirements && (
                  <div className="space-y-1.5">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-1">
                      <FileText size={14} className="text-primary" />
                      المستندات والمتطلبات اللازمة:
                    </h3>
                    <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                      {selectedService.requirements}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-card-dark shrink-0 flex flex-col gap-2">
                {selectedService.bookingUrl && (
                  <a
                    href={selectedService.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-xs"
                  >
                    <ExternalLink size={16} />
                    {selectedService.bookingText || 'حجز الخدمة إلكترونياً'}
                  </a>
                )}
                {selectedService.phone && (
                  <a
                    href={`tel:${selectedService.phone}`}
                    className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all text-xs"
                  >
                    <Phone size={16} />
                    اتصل للاستفسار ({selectedService.phone})
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ANNOUNCEMENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white dark:bg-card-dark rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-border-light dark:border-border-dark"
            >
              <div className="p-4 bg-primary text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-amber-300" />
                  <span className="text-xs font-black">تفاصيل الإعلان الرقمي</span>
                </div>
                <button 
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div className="flex items-center gap-2">
                  {selectedAnnouncement.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-red-500 text-white">
                      🚨 عاجل جداً
                    </span>
                  )}
                  {selectedAnnouncement.category && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary">
                      {selectedAnnouncement.category}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 mr-auto">
                    {new Date(selectedAnnouncement.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <h2 className="text-base font-black text-slate-800 dark:text-white leading-snug">
                  {selectedAnnouncement.title}
                </h2>

                {selectedAnnouncement.image && (
                  <div className="rounded-2xl overflow-hidden h-44 bg-slate-100 my-2">
                    <img src={selectedAnnouncement.image} alt={selectedAnnouncement.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}

                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-surface-dark p-3.5 rounded-2xl border border-border-light dark:border-border-dark">
                  {selectedAnnouncement.content}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRIP DETAIL MODAL */}
      <AnimatePresence>
        {selectedTrip && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrip(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white dark:bg-card-dark rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-border-light dark:border-border-dark"
            >
              <div className="p-4 bg-primary text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Palmtree size={18} className="text-amber-300" />
                  <span className="text-xs font-black">تفاصيل رحلة النادي</span>
                </div>
                <button 
                  onClick={() => setSelectedTrip(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
                {selectedTrip.image && (
                  <div className="rounded-2xl overflow-hidden h-40 bg-slate-100 relative">
                    <img src={selectedTrip.image} alt={selectedTrip.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black backdrop-blur-md shadow-md ${
                        selectedTrip.status === 'upcoming' ? 'bg-emerald-500/90 text-white' :
                        selectedTrip.status === 'ongoing' ? 'bg-amber-500/90 text-white' :
                        selectedTrip.status === 'completed' ? 'bg-slate-700/90 text-white' : 'bg-red-500/90 text-white'
                      }`}>
                        {selectedTrip.status === 'upcoming' ? '🚌 متاحة للحجز' : selectedTrip.status === 'ongoing' ? '⏳ جارية' : selectedTrip.status === 'completed' ? '✅ منتهية' : '❌ ملغاة'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Compass size={14} />
                    <span>📍 الوجهة: {selectedTrip.destination}</span>
                  </div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white leading-snug">
                    {selectedTrip.title}
                  </h2>
                  {(selectedTrip.startDate || selectedTrip.endDate) && (
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-0.5">
                      <Calendar size={13} className="text-amber-500" />
                      <span>التاريخ: {selectedTrip.startDate} {selectedTrip.endDate ? `إلى ${selectedTrip.endDate}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Price card */}
                <div className="p-3.5 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 bg-white dark:bg-card-dark rounded-xl border border-primary/20">
                    <span className="text-[10px] text-slate-400 font-bold block">سعر العضو</span>
                    <span className="text-sm font-black text-primary">{selectedTrip.priceMember} ج.م</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark">
                    <span className="text-[10px] text-slate-400 font-bold block">سعر المرافق</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{selectedTrip.priceNonMember} ج.م</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 dark:text-white">تفاصيل الرحلة والبرنامج:</h3>
                  <p className="font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-surface-dark p-3 rounded-2xl border border-border-light dark:border-border-dark">
                    {selectedTrip.description}
                  </p>
                </div>

                {selectedTrip.features && (
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-1">
                      <Sparkles size={14} className="text-amber-500" />
                      مميزات وبرنامج الرحلة:
                    </h3>
                    <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                      {selectedTrip.features}
                    </div>
                  </div>
                )}

                {selectedTrip.requirements && (
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-1">
                      <FileText size={14} className="text-primary" />
                      الشروط والأوراق المطلوبة للحجز:
                    </h3>
                    <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                      {selectedTrip.requirements}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-border-dark bg-slate-50 dark:bg-card-dark shrink-0 space-y-2">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black shadow-md">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block uppercase">
                      التواصل مع اللجنة
                    </span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                      أ/ {committeesList.find(c => c.id === 'comm-2' || c.name.includes('الرحلات'))?.president || 'محمد عشم شلبي'}
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {committeesList.find(c => c.id === 'comm-2' || c.name.includes('الرحلات'))?.vicePresident ? `نائب رئيس اللجنة: أ/ ${committeesList.find(c => c.id === 'comm-2' || c.name.includes('الرحلات'))?.vicePresident}` : 'مقر إدارة الأنشطة بالنادي'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center">
                  📍 يتم الحجز بمقر إدارة الأنشطة بالنادي فرع الشاطبي / سموحة يومياً من 9 ص حتى 3 م
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
