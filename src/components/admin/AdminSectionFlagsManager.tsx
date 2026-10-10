import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppStore } from '../../store';
import { ManagedSectionKey, SectionFlags, MANAGED_SECTIONS } from '../../types/sections';
import { logAdminActivity } from '../../lib/auditLogger';
import toast from 'react-hot-toast';
import { 
  Sliders, 
  HeartHandshake, 
  Globe, 
  ShoppingBag, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Sparkles,
  Layers,
  Database
} from 'lucide-react';

export default function AdminSectionFlagsManager() {
  const { sectionFlags, setSectionFlags } = useAppStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Helper to get typed flag value (default true if undefined)
  const isEnabled = (key: ManagedSectionKey): boolean => {
    return sectionFlags[key] !== false;
  };

  const handleToggle = async (key: ManagedSectionKey, currentVal: boolean) => {
    const nextVal = !currentVal;
    setIsUpdating(key);

    const updatedFlags: Partial<SectionFlags> = {
      [key]: nextVal
    };

    // Optimistic UI update
    setSectionFlags(updatedFlags);

    try {
      // 1. Primary write to appSettings/sections as requested
      await setDoc(doc(db, 'appSettings', 'sections'), updatedFlags, { merge: true });
      
      // 2. Dual write to settings/sections for seamless backwards-compatibility
      await setDoc(doc(db, 'settings', 'sections'), updatedFlags, { merge: true });

      // 3. Log audit activity
      const sectionInfo = MANAGED_SECTIONS[key];
      await logAdminActivity({
        action: 'update',
        collectionName: 'appSettings',
        collectionLabel: 'التحكم المركزي في الأقسام',
        itemId: `section_${key}`,
        itemTitle: `${sectionInfo.name} (${nextVal ? 'تفعيل ON' : 'تعطيل OFF'})`,
        details: `تم تغيير حالة قسم ${sectionInfo.name} إلى ${nextVal ? 'مُفعل (ON)' : 'مُعطل (OFF)'}`
      });

      toast.success(
        nextVal 
          ? `تم تفعيل قسم "${sectionInfo.name}" بنجاح 🟢` 
          : `تم إيقاف وتعطيل قسم "${sectionInfo.name}" بالكامل 🔴`
      );
    } catch (err) {
      console.error('Failed to update section flag:', err);
      // Revert optimistic update
      setSectionFlags({ [key]: currentVal });
      toast.error('حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة مرة أخرى');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSetAll = async (targetState: boolean) => {
    setIsBatchUpdating(true);

    const newFlags: SectionFlags = {
      fanServices: targetState,
      worldFans: targetState,
      fanStore: targetState,
      itthadawyBusiness: targetState
    };

    setSectionFlags(newFlags);

    try {
      await setDoc(doc(db, 'appSettings', 'sections'), newFlags, { merge: true });
      await setDoc(doc(db, 'settings', 'sections'), newFlags, { merge: true });

      await logAdminActivity({
        action: 'update',
        collectionName: 'appSettings',
        collectionLabel: 'التحكم المركزي في الأقسام',
        itemId: 'sections_batch',
        itemTitle: targetState ? 'تفعيل جميع الأقسام الأربعة' : 'تعطيل جميع الأقسام الأربعة',
        details: `تم تبديل حالة كافة الأقسام إلى ${targetState ? 'ON' : 'OFF'}`
      });

      toast.success(targetState ? 'تم تفعيل جميع الأقسام بنجاح 🟢' : 'تم تعطيل جميع الأقسام الأربعة 🔴');
    } catch (err) {
      console.error('Failed batch section flag update:', err);
      toast.error('حدث خطأ أثناء تطبيق الإعدادات المجمعة');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const sectionsList: {
    key: ManagedSectionKey;
    title: string;
    englishKey: string;
    description: string;
    icon: React.ReactNode;
    colorTheme: {
      activeBg: string;
      activeBorder: string;
      activeText: string;
      badgeBg: string;
      iconBg: string;
    };
    paths: string[];
    detailsOnDisabled: string[];
  }[] = [
    {
      key: 'fanServices',
      title: 'خدمات الجماهير والتعليم المجاني',
      englishKey: 'fanServices',
      description: 'منصة خدمات الجمهور، دليل الطوارئ والخدمات العامة، ومنصة التعليم والتدريب المهني المجاني للجماهير.',
      icon: <HeartHandshake size={22} />,
      colorTheme: {
        activeBg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
        activeBorder: 'border-emerald-500/30',
        activeText: 'text-emerald-700 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
      },
      paths: ['/services', '/public-services', '/services/education', '/education'],
      detailsOnDisabled: [
        'إخفاء ويدجت خدمات الجمهور من الصفحة الرئيسية (Home)',
        'إخفاء بند خدمات الجمهور من القائمة الجانبية (Sidebar)',
        'حظر مسارات /services وتوجيه الزائر تلقائياً للصفحة الرئيسية',
        'منع تنفيذ أي استعلام Firestore لقوائم الخدمات وفيديوهات التعليم'
      ]
    },
    {
      key: 'worldFans',
      title: 'رابطة اتحاداوية العالم',
      englishKey: 'worldFans',
      description: 'شبكة المشجعين والروابط الخارجية حول العالم، مجتمعات المغتربين، الفعاليات الدولية، وطلبات المساعدة والدعم.',
      icon: <Globe size={22} />,
      colorTheme: {
        activeBg: 'bg-sky-500/10 dark:bg-sky-950/20',
        activeBorder: 'border-sky-500/30',
        activeText: 'text-sky-700 dark:text-sky-400',
        badgeBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
        iconBg: 'bg-sky-500/20 text-sky-600 dark:text-sky-400'
      },
      paths: ['/world-fans', '/world-fans/group/*', '/world-association'],
      detailsOnDisabled: [
        'إخفاء ويدجت اتحاداوية العالم من الصفحة الرئيسية (Home)',
        'إخفاء الرابط من القائمة العلوية للكمبيوتر (Header) والقائمة الجانبية',
        'حظر مسارات /world-fans وحماية الروابط الفرعية بموجه أمان',
        'منع استعلامات مجموعات وفعاليات المغتربين من Firestore'
      ]
    },
    {
      key: 'fanStore',
      title: 'متجر الجماهير',
      englishKey: 'fanStore',
      description: 'كتالوج منتجات وتيشيرتات وتذكارات النادي الرسمية، نظام عربة التسوق، ومتابعة طلبات الشراء والمبيعات.',
      icon: <ShoppingBag size={22} />,
      colorTheme: {
        activeBg: 'bg-purple-500/10 dark:bg-purple-950/20',
        activeBorder: 'border-purple-500/30',
        activeText: 'text-purple-700 dark:text-purple-400',
        badgeBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
      },
      paths: ['/store'],
      detailsOnDisabled: [
        'إخفاء المتجر من القائمة الجانبية (Sidebar) والملاحة العامة',
        'حظر مسار /store وإعادة توجيه أي محاولة تصفح مباشرة',
        'عدم تحميل ملف كود صفحة المتجر (React.lazy JS Chunk)',
        'عدم تنفيذ استعلامات جلب المنتجات والمخزون من Firestore'
      ]
    },
    {
      key: 'itthadawyBusiness',
      title: 'اتحاداوي بيزنس',
      englishKey: 'itthadawyBusiness',
      description: 'دليل الشركات والأنشطة التجارية والمشروعات الاستثمارية لجمهور الاتحاد، مع العروض والخصومات المتبادلة.',
      icon: <Building2 size={22} />,
      colorTheme: {
        activeBg: 'bg-amber-500/10 dark:bg-amber-950/20',
        activeBorder: 'border-amber-500/30',
        activeText: 'text-amber-700 dark:text-amber-400',
        badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
      },
      paths: ['/business', '/business/*'],
      detailsOnDisabled: [
        'إخفاء ويدجت دليل الأعمال من الصفحة الرئيسية (Home)',
        'إخفاء اتحاداوي بيزنس من القائمة الجانبية (Sidebar)',
        'حظر مسارات /business وحماية صفحات التفاصيل',
        'إيقاف استعلامات الشركات وتقارير الأعمال من Firestore'
      ]
    }
  ];

  const activeCount = sectionsList.filter(s => isEnabled(s.key)).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#0B3D2E] via-primary to-[#06241B] rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-black border border-white/10">
              <Sliders size={14} />
              <span>إدارة ميزات وأقسام التطبيق المركزية (Feature Flags)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              التحكم في ظهور وتحميل الأقسام
            </h2>
            <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
              تحكم فوري من Firestore في تشغيل أو إيقاف أي من الأقسام الأربعة المحددة. عند الإيقاف يتم إخفاء القسم بالكامل من الرئيسية والقوائم، حظر مساراته، ومنع استعلامات وتحميل ملفاته.
            </p>
          </div>

          {/* Quick Metrics & Document Info */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-2xl text-center">
              <span className="text-[10px] text-white/70 block font-bold">الأقسام النشطة</span>
              <span className="text-lg font-black text-emerald-300">
                {activeCount} <span className="text-xs text-white/60">من 4</span>
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-2xl text-right">
              <span className="text-[10px] text-white/70 block font-bold flex items-center gap-1">
                <Database size={12} className="text-emerald-300" />
                <span>مسار المستند</span>
              </span>
              <span className="text-xs font-mono font-bold text-white tracking-wide">
                appSettings/sections
              </span>
            </div>
          </div>
        </div>

        {/* Global Batch Controls */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-white/75 font-bold">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>التغييرات تنعكس فورياً في نفس اللحظة عبر المستمع الحي Real-time</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetAll(true)}
              disabled={isBatchUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>تفعيل الكل (ALL ON)</span>
            </button>

            <button
              onClick={() => handleSetAll(false)}
              disabled={isBatchUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <XCircle size={14} />
              <span>تعطيل الكل (ALL OFF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {sectionsList.map((section) => {
          const active = isEnabled(section.key);
          const updating = isUpdating === section.key || isBatchUpdating;

          return (
            <div
              key={section.key}
              className={`rounded-3xl border transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between ${
                active
                  ? 'bg-white dark:bg-card-dark border-border-light dark:border-border-dark shadow-sm'
                  : 'bg-slate-50/80 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-90'
              }`}
            >
              <div>
                {/* Card Top: Icon, Title, Status & Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                        active
                          ? section.colorTheme.iconBg
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {section.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                          {section.title}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-dark text-slate-500 font-bold">
                          {section.englishKey}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            مُفعّل (ON)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            مُعطّل بالكامل (OFF)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleToggle(section.key, active)}
                      aria-label={`تبديل حالة ${section.title}`}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          active ? 'translate-x-0' : '-translate-x-6'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                  {section.description}
                </p>

                {/* Protected Paths */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">المسارات:</span>
                  {section.paths.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* Status Explanation Box */}
                <div className="mt-4 pt-3 border-t border-border-light/60 dark:border-border-dark/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    {active ? '🟢 سلوك النظام حالياً (مفعل):' : '🔴 سلوك النظام حالياً (معطل ومحظور):'}
                  </span>
                  
                  {active ? (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 size={13} className="shrink-0" />
                        <span>يظهر في الصفحة الرئيسية والقوائم والروابط التنقلية</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                        <span>يتم استدعاء بيانات Firestore عند حاجة المستخدم إليها فقط</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 space-y-1">
                      {section.detailsOnDisabled.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                          <XCircle size={13} className="shrink-0" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Action Toggle */}
              <div className="mt-5 pt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold">
                  {updating ? 'جارٍ الحفظ في Firestore...' : active ? 'القسم متاح للجمهور' : 'القسم محجوب تماماً'}
                </span>

                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleToggle(section.key, active)}
                  className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl transition-all ${
                    active
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                  } disabled:opacity-50 cursor-pointer`}
                >
                  {updating ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : active ? (
                    <>
                      <EyeOff size={13} />
                      <span>إيقاف القسم (OFF)</span>
                    </>
                  ) : (
                    <>
                      <Eye size={13} />
                      <span>تشغيل القسم (ON)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
