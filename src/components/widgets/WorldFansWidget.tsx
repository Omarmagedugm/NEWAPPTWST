import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Globe, Users, Calendar, MapPin, ChevronLeft, Sparkles, Plus, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../store';
import { CountryFlag } from '../worldFans/CountryFlag';

export const WorldFansWidget: React.FC = () => {
  const navigate = useNavigate();
  const { worldGroups, worldCountries, worldEvents } = useAppStore();

  const allGroups = worldGroups || [];
  const activeGroups = allGroups.filter(g => g.active !== false && g.status !== 'rejected');

  const allCountries = worldCountries || [];
  const activeCountries = allCountries.filter(c => c.active !== false);

  const featuredGroups = activeGroups.slice(0, 6);
  const upcomingEvents = (worldEvents || []).filter(e => e.status === 'upcoming');
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  const totalMembers = activeGroups.reduce((acc, g) => acc + (Number(g.memberCount) || 0), 0);
  const totalCountries = activeCountries.length;

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#063b28] via-[#0b4d35] to-[#04281a] p-5 shadow-xl border border-emerald-500/20 text-white group"
      >
        {/* Ambient background glow & pattern */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-amber-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-lg relative">
              <Globe size={22} className="animate-spin-slow" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-[#063b28] animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-white tracking-tight">
                  رابطة اتحاداوية العالم
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  خارج مصر 🌍
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium mt-0.5">
                منصة تواصل وعشاق سيد البلد في بلاد المهجر
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/world-fans')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-emerald-200 hover:text-white transition-all border border-white/10"
          >
            <span>استكشف</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Live Expat Stats Bar */}
        <div className="relative z-10 grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 mb-4">
          <div className="text-center">
            <div className="text-sm font-black text-amber-300 leading-tight">
              {totalCountries} دولة
            </div>
            <div className="text-[10px] text-emerald-200/70 font-semibold">
              الدول الممثلة
            </div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-sm font-black text-white leading-tight">
              {activeGroups.length} رابطة
            </div>
            <div className="text-[10px] text-emerald-200/70 font-semibold">
              الروابط المعتمدة
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-black text-emerald-300 leading-tight">
              +{totalMembers.toLocaleString('ar-EG')}
            </div>
            <div className="text-[10px] text-emerald-200/70 font-semibold">
              جمهور الاغتراب
            </div>
          </div>
        </div>

        {/* Next Match Watch Party (if available) */}
        {nextEvent && (
          <div 
            onClick={() => navigate('/world-fans')}
            className="relative z-10 mb-4 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 hover:border-amber-400/50 cursor-pointer transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                <Calendar size={16} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                    تجمع قادم
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{nextEvent.title}</h4>
                </div>
                <p className="text-[10px] text-emerald-200/80 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} />
                  <span>{nextEvent.city}، {nextEvent.countryName}</span>
                  <span>•</span>
                  <span>{nextEvent.time}</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20 shrink-0">
              {nextEvent.participantsCount} حاضر
            </span>
          </div>
        )}

        {/* Featured Regional Leagues Horizontal Scroll */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black text-emerald-200">
              أبرز روابط المغتربين المعتمدة
            </span>
            <button
              onClick={() => navigate('/world-fans')}
              className="text-[10px] font-bold text-amber-300 hover:underline"
            >
              عرض الكل
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {featuredGroups.map((group) => {
              return (
                <div
                  key={group.id}
                  onClick={() => navigate(`/world-fans/group/${group.id}`)}
                  className="shrink-0 w-36 p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 cursor-pointer transition-all flex flex-col items-center text-center"
                >
                  <div className="relative mb-2">
                    <img
                      src={group.logo || '/icon.png'}
                      alt={group.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400/50 shadow-md bg-white/5"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 p-0.5 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center">
                      <CountryFlag
                        countryCode={group.countryId}
                        flag={group.countryFlag}
                        countryName={group.countryName}
                        size="xs"
                        shape="circle"
                      />
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {group.name}
                  </h4>
                  <p className="text-[10px] text-emerald-200/80 mt-0.5 line-clamp-1">
                    {group.city}، {group.countryName}
                  </p>
                  <div className="mt-2 text-[9px] font-bold text-amber-300/90 flex items-center gap-1">
                    <Users size={10} />
                    <span>{group.memberCount || 0} عضو</span>
                  </div>
                </div>
              );
            })}

            {/* CTA to Found a League */}
            <div
              onClick={() => navigate('/world-fans?action=found')}
              className="shrink-0 w-32 p-2.5 rounded-2xl bg-emerald-900/40 hover:bg-emerald-900/60 active:scale-95 border border-dashed border-emerald-400/40 cursor-pointer transition-all flex flex-col items-center justify-center text-center group/btn"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-1.5 group-hover/btn:scale-110 transition-transform">
                <Sparkles size={18} />
              </div>
              <span className="text-[11px] font-black text-white leading-tight">
                أنشئ رابطة
              </span>
              <span className="text-[9px] text-emerald-300/80 font-medium mt-0.5">
                في مدينتك
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Fast Action Banner */}
        <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-100 font-medium">
              عايش برة مصر؟ انضم لرابطة مدينتك الآن
            </span>
          </div>
          <button
            onClick={() => navigate('/world-fans')}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-[11px] font-black shadow-md flex items-center gap-1 active:scale-95 transition-all"
          >
            <span>دخول الرابطة</span>
            <ArrowLeft size={12} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
