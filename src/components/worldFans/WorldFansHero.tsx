import React from 'react';
import { motion } from 'motion/react';
import { Globe, Users, Calendar, Sparkles, MapPin, Search, ShieldCheck } from 'lucide-react';
import { WorldCountry, WorldGroup, WorldEvent } from '../../types/worldFans';

interface WorldFansHeroProps {
  countries: WorldCountry[];
  groups: WorldGroup[];
  events: WorldEvent[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenFoundLeague: () => void;
}

export const WorldFansHero: React.FC<WorldFansHeroProps> = ({
  countries,
  groups,
  events,
  searchQuery,
  setSearchQuery,
  onOpenFoundLeague,
}) => {
  const activeCountries = countries.filter(c => c.active !== false);
  const activeGroups = groups.filter(g => g.active !== false);
  const totalMembers = activeGroups.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#063323] via-[#094731] to-[#042116] p-5 sm:p-6 text-white shadow-2xl border border-emerald-500/30 mb-6">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none translate-y-1/3 -translate-x-1/3" />
      
      {/* Top Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-amber-400/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-xl shrink-0 relative">
            <Globe size={30} className="animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-[#063323] flex items-center justify-center">
              <Sparkles size={9} className="text-slate-900" />
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                رابطة اتحاداوية العالم
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm">
                سيد البلد في كل قارة 🌍
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/80 font-medium mt-1 max-w-xl leading-relaxed">
              الملتقى الرسمي لجماهير نادي الاتحاد السكندري في بلاد المهجر. ابحث عن رابطة مدينتك، شارك في تجمعات المباريات، أو أسس رابطة جديدة رسمية.
            </p>
          </div>
        </div>

        {/* Founding League Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenFoundLeague}
            className="w-full md:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Sparkles size={16} />
            <span>طلب تأسيس رابطة رسمية</span>
          </button>
        </div>
      </div>

      {/* Expat Realtime Key Metrics */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
        <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Globe size={20} />
          </div>
          <div>
            <div className="text-lg font-black text-white leading-tight">
              {activeCountries.length}
            </div>
            <div className="text-[10px] text-emerald-200/80 font-bold">
              دولة حول العالم
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-lg font-black text-amber-300 leading-tight">
              {activeGroups.length}
            </div>
            <div className="text-[10px] text-emerald-200/80 font-bold">
              رابطة مسجلة
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-200 flex items-center justify-center shrink-0 border border-emerald-400/30">
            <Users size={20} />
          </div>
          <div>
            <div className="text-lg font-black text-emerald-300 leading-tight">
              {totalMembers > 0 ? `+${totalMembers.toLocaleString('ar-EG')}` : '0'}
            </div>
            <div className="text-[10px] text-emerald-200/80 font-bold">
              مشجع مسجل
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-400/20 text-red-300 flex items-center justify-center shrink-0 border border-red-400/30">
            <Calendar size={20} />
          </div>
          <div>
            <div className="text-lg font-black text-red-300 leading-tight">
              {upcomingEvents.length}
            </div>
            <div className="text-[10px] text-emerald-200/80 font-bold">
              تجمع قادم
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative z-10 mt-5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن دولة، مدينة (مثال: الرياض، دبي، لندن، نيويورك، برلين، باريس)..."
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-3 pr-11 pl-4 text-xs font-bold text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all shadow-inner"
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-white/20 text-[10px] font-bold text-white hover:bg-white/30"
            >
              مسح
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
