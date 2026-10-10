import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Globe, Users, ChevronLeft, MapPin, Sparkles, Plus, Flag } from 'lucide-react';
import { useAppStore } from '../../store';
import { CountryFlag } from './CountryFlag';

// Helper to guarantee accurate country emoji flag for any country
export const getCountryFlag = (countryIdOrName?: string, fallbackFlag?: string): string => {
  if (!countryIdOrName && !fallbackFlag) return '🌍';
  const val = (countryIdOrName || '').toLowerCase().trim();

  const flagMap: Record<string, string> = {
    ae: '🇦🇪', uae: '🇦🇪', 'الإمارات': '🇦🇪', 'الإمارات العربية المتحدة': '🇦🇪',
    sa: '🇸🇦', ksa: '🇸🇦', 'السعودية': '🇸🇦', 'المملكة العربية السعودية': '🇸🇦',
    kw: '🇰🇼', kuwait: '🇰🇼', 'الكويت': '🇰🇼',
    gb: '🇬🇧', uk: '🇬🇧', 'المملكة المتحدة': '🇬🇧', 'بريطانيا': '🇬🇧', 'انجلترا': '🇬🇧', 'إنجلترا': '🇬🇧',
    us: '🇺🇸', usa: '🇺🇸', 'الولايات المتحدة': '🇺🇸', 'الولايات المتحدة الأمريكية': '🇺🇸', 'امريكا': '🇺🇸', 'أمريكا': '🇺🇸',
    eu: '🇪🇺', europe: '🇪🇺', 'الاتحاد الأوروبي': '🇪🇺', 'أوروبا': '🇪🇺', 'اوروبا': '🇪🇺',
    east_asia: '🌏', 'east asia': '🌏', 'شرق آسيا': '🌏', 'شرق اسيا': '🌏', 'آسيا': '🌏',
    de: '🇩🇪', germany: '🇩🇪', 'ألمانيا': '🇩🇪', 'المانيا': '🇩🇪',
    qa: '🇶🇦', qatar: '🇶🇦', 'قطر': '🇶🇦',
    om: '🇴🇲', oman: '🇴🇲', 'عمان': '🇴🇲', 'سلطنة عمان': '🇴🇲', 'سلطنة عُمان': '🇴🇲',
    bh: '🇧🇭', bahrain: '🇧🇭', 'البحرين': '🇧🇭',
    eg: '🇪🇬', egypt: '🇪🇬', 'مصر': '🇪🇬',
    fr: '🇫🇷', france: '🇫🇷', 'فرنسا': '🇫🇷',
    it: '🇮🇹', italy: '🇮🇹', 'إيطاليا': '🇮🇹', 'ايطاليا': '🇮🇹',
    es: '🇪🇸', spain: '🇪🇸', 'إسبانيا': '🇪🇸', 'اسبانيا': '🇪🇸',
    ca: '🇨🇦', canada: '🇨🇦', 'كندا': '🇨🇦',
    au: '🇦🇺', australia: '🇦🇺', 'أستراليا': '🇦🇺', 'استراليا': '🇦🇺',
    tr: '🇹🇷', turkey: '🇹🇷', 'تركيا': '🇹🇷',
    jo: '🇯🇴', jordan: '🇯🇴', 'الأردن': '🇯🇴', 'الاردن': '🇯🇴',
    lb: '🇱🇧', lebanon: '🇱🇧', 'لبنان': '🇱🇧',
    iq: '🇮🇶', iraq: '🇮🇶', 'العراق': '🇮🇶',
    sd: '🇸🇩', sudan: '🇸🇩', 'السودان': '🇸🇩',
    nl: '🇳🇱', netherlands: '🇳🇱', 'هولندا': '🇳🇱',
    se: '🇸🇪', sweden: '🇸🇪', 'السويد': '🇸🇪',
  };

  if (flagMap[val]) return flagMap[val];

  if (fallbackFlag && fallbackFlag !== '🏳️' && fallbackFlag !== '🌍') {
    return fallbackFlag;
  }

  return '🌍';
};

export default function WorldFansWidget({ title }: { title?: string }) {
  const navigate = useNavigate();
  const { worldCountries, worldGroups, worldEvents } = useAppStore();

  const activeGroups = (worldGroups || []).filter(g => g.active !== false && g.status !== 'rejected');
  const activeCountries = (worldCountries || []).filter(c => c.active !== false);

  // Group actual groups by country to get exact dynamic numbers
  const countryStatsMap = React.useMemo(() => {
    const map = new Map<string, {
      countryId: string;
      countryName: string;
      countryFlag: string;
      groupsCount: number;
      fanCount: number;
    }>();

    // First populate from active countries
    activeCountries.forEach(c => {
      map.set(c.id, {
        countryId: c.id,
        countryName: c.name,
        countryFlag: getCountryFlag(c.id, c.flag),
        groupsCount: 0,
        fanCount: 0,
      });
    });

    // Aggregate actual group counts and member sums
    activeGroups.forEach(g => {
      const cId = g.countryId || 'other';
      const flag = getCountryFlag(g.countryId || g.countryName, g.countryFlag);
      const name = g.countryName || 'دولة أخرى';
      const members = Number(g.memberCount) || 0;

      if (!map.has(cId)) {
        map.set(cId, {
          countryId: cId,
          countryName: name,
          countryFlag: flag,
          groupsCount: 0,
          fanCount: 0,
        });
      }

      const entry = map.get(cId)!;
      entry.groupsCount += 1;
      entry.fanCount += members;
    });

    return map;
  }, [activeGroups, activeCountries]);

  // Actual dynamic list of countries that have actual groups or fans
  const dynamicCountriesList = React.useMemo(() => {
    const list = Array.from(countryStatsMap.values());
    
    // Sort so countries with active groups appear first, then by fan count
    return list
      .filter(item => item.groupsCount > 0 || item.fanCount > 0)
      .sort((a, b) => (b.groupsCount - a.groupsCount) || (b.fanCount - a.fanCount));
  }, [countryStatsMap]);

  // Dynamic Metrics
  const approvedGroupsCount = activeGroups.length;
  const representedCountriesCount = dynamicCountriesList.length > 0 ? dynamicCountriesList.length : activeCountries.length;
  
  const totalFans = activeGroups.reduce((acc, g) => acc + (Number(g.memberCount) || 0), 0) ||
    dynamicCountriesList.reduce((acc, c) => acc + (c.fanCount || 0), 0);

  return (
    <div id="world-fans-widget" className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#042f2e] text-white p-5 shadow-xl border border-emerald-500/20">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -translate-x-12 -translate-y-12" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none translate-x-12 translate-y-12" />
      <Globe className="absolute -left-6 -bottom-6 text-white/5 pointer-events-none w-44 h-44" />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 font-black">
            <Globe size={24} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase tracking-wider">
                مغتربين حول العالم
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-1">{title || 'رابطة اتحاداوية العالم'}</h3>
            <p className="text-[11px] text-emerald-100/75 font-medium">ملتقى عشاق سيد البلد في كافة الدول والعواصم</p>
          </div>
        </div>

        <button
          id="btn-open-world-fans"
          onClick={() => navigate('/world-fans')}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur-md border border-white/10 transition-all flex items-center gap-1 text-xs font-bold shrink-0"
        >
          <span>استكشف</span>
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Stats Quick Bar (Real Dynamic Numbers) */}
      <div className="relative z-10 grid grid-cols-3 gap-2 bg-black/25 backdrop-blur-md rounded-2xl p-2.5 mb-4 border border-white/10 text-center">
        <div>
          <div className="text-[10px] text-emerald-200/80 font-bold">الدول الممثلة</div>
          <div className="text-sm font-black text-white tabular-nums">{representedCountriesCount} دولة</div>
        </div>
        <div className="border-r border-l border-white/10">
          <div className="text-[10px] text-emerald-200/80 font-bold">الروابط المعتمدة</div>
          <div className="text-sm font-black text-amber-300 tabular-nums">{approvedGroupsCount} رابطة</div>
        </div>
        <div>
          <div className="text-[10px] text-emerald-200/80 font-bold">جمهور الاغتراب</div>
          <div className="text-sm font-black text-emerald-300 tabular-nums">+{totalFans.toLocaleString('ar-EG')}</div>
        </div>
      </div>

      {/* Featured Countries / Groups Horizontal Scroll */}
      <div className="relative z-10">
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-200/90 mb-2 px-1">
          <span>أبرز الروابط والدول المعتمدة</span>
          <button 
            onClick={() => navigate('/world-fans')} 
            className="text-amber-300 hover:underline flex items-center gap-0.5 text-[10px]"
          >
            عرض الكل
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {dynamicCountriesList.slice(0, 8).map((country) => (
            <motion.button
              key={country.countryId}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/world-fans?country=${country.countryId}`)}
              className="shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 text-right transition-all group"
            >
              <CountryFlag
                countryCode={country.countryId}
                flag={country.countryFlag}
                countryName={country.countryName}
                size="md"
                shape="rounded"
              />
              <div className="min-w-0">
                <div className="text-xs font-black text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                  {country.countryName}
                </div>
                <div className="text-[9px] text-emerald-200/80 font-medium whitespace-nowrap">
                  {country.groupsCount > 0 ? `${country.groupsCount} رابطة` : 'تجمع جماهيري'} • {country.fanCount || 0} مشجع
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
        <button
          id="btn-world-fans-explore-main"
          onClick={() => navigate('/world-fans')}
          className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <Globe size={14} />
          <span>تصفح روابط العالم والفعاليات</span>
        </button>

        <button
          id="btn-world-fans-found-league"
          onClick={() => navigate('/world-fans?action=found')}
          className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold backdrop-blur-md border border-white/15 flex items-center gap-1 transition-all shrink-0"
          title="تأسيس رابطة جديدة في بلدك"
        >
          <Plus size={14} />
          <span>تأسيس رابطة</span>
        </button>
      </div>
    </div>
  );
}
