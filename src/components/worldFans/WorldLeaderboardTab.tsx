import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Star, Medal, Users, ShieldCheck, Sparkles, Heart } from 'lucide-react';
import { WorldGroup } from '../../types/worldFans';
import { useNavigate } from 'react-router-dom';

interface WorldLeaderboardTabProps {
  groups: WorldGroup[];
}

const BADGES = [
  {
    title: 'سفير سيد البلد',
    icon: '🌍',
    desc: 'يُمنح لممثلي الروابط المعتمدة الذين مثلوا النادي في الفعاليات الدولية.',
    color: 'from-amber-400 to-amber-600',
  },
  {
    title: 'مؤسس رابطة',
    icon: '🏛️',
    desc: 'يُمنح للمشجعين الذين بادروا بتأسيس وإطلاق رابطة رسمية في مدينتهم.',
    color: 'from-emerald-400 to-emerald-600',
  },
  {
    title: 'منظم التجمعات',
    icon: '☕',
    desc: 'يُمنح لأكثر من ينظم لقاءات ومشاهدات لمباريات الاتحاد بالخارج.',
    color: 'from-blue-400 to-indigo-600',
  },
  {
    title: 'المشجع الرحالة',
    icon: '✈️',
    desc: 'يُمنح لمن سافر وراء النادي وحضر بطولات دولية أو عربية خارج مصر.',
    color: 'from-purple-400 to-pink-600',
  },
];

export const WorldLeaderboardTab: React.FC<WorldLeaderboardTabProps> = ({ groups }) => {
  const navigate = useNavigate();
  const sortedGroups = [...groups].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top 3 Podium Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#063323] via-[#094731] to-[#042116] p-6 text-white shadow-2xl border border-emerald-500/30">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/30 mb-2">
            <Trophy size={14} />
            <span>لوحة شرف الروابط الأكثر تفاعلاً</span>
          </div>
          <h3 className="text-lg font-black">أكبر وأنشط روابط سيد البلد حول العالم</h3>
          <p className="text-xs text-emerald-200/80 mt-1">تعتمد الترتيبات على عدد الأعضاء، تجمعات المباريات، والمشاركات المجتمعية</p>
        </div>

        {/* Podium */}
        {sortedGroups.length === 0 ? (
          <div className="text-center py-8 text-emerald-100/70 text-xs font-medium">
            لا توجد روابط مسجلة حالياً في لوحة الشرف. كن أول من يؤسس رابطة في دولتك!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4">
            {/* Second Place */}
            {sortedGroups[1] && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => navigate(`/world-fans/group/${sortedGroups[1].id}`)}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className="relative mb-2">
                  <img
                    src={sortedGroups[1].logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-md group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-slate-300 text-slate-900 rounded-full font-black text-xs flex items-center justify-center shadow">
                    2
                  </span>
                </div>
                <h4 className="text-xs font-black text-center line-clamp-1 group-hover:text-amber-300">{sortedGroups[1].name}</h4>
                <span className="text-[10px] text-emerald-200">{sortedGroups[1].countryName}</span>
                <div className="w-full mt-2 h-20 bg-slate-400/20 backdrop-blur-md rounded-t-2xl border-t border-slate-300/40 flex flex-col items-center justify-center p-1">
                  <span className="text-xs font-black text-slate-200">{sortedGroups[1].memberCount}</span>
                  <span className="text-[9px] text-slate-300">عضو</span>
                </div>
              </motion.div>
            )}

            {/* First Place */}
            {sortedGroups[0] && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => navigate(`/world-fans/group/${sortedGroups[0].id}`)}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className="relative mb-2">
                  <img
                    src={sortedGroups[0].logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl ring-4 ring-amber-400/20 group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -top-3 -right-2 w-7 h-7 bg-amber-400 text-slate-950 rounded-full font-black text-sm flex items-center justify-center shadow-lg animate-bounce">
                    👑 1
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-center text-amber-300 line-clamp-1">{sortedGroups[0].name}</h4>
                <span className="text-[10px] text-emerald-200">{sortedGroups[0].countryName}</span>
                <div className="w-full mt-2 h-28 bg-gradient-to-t from-amber-500/20 to-amber-500/40 backdrop-blur-md rounded-t-2xl border-t-2 border-amber-400 flex flex-col items-center justify-center p-1">
                  <span className="text-sm font-black text-amber-300">{sortedGroups[0].memberCount}</span>
                  <span className="text-[10px] text-amber-200 font-bold">عضو نشط</span>
                </div>
              </motion.div>
            )}

            {/* Third Place */}
            {sortedGroups[2] && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => navigate(`/world-fans/group/${sortedGroups[2].id}`)}
                className="flex flex-col items-center cursor-pointer group"
              >
                <div className="relative mb-2">
                  <img
                    src={sortedGroups[2].logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80'}
                    alt=""
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-700 shadow-md group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-700 text-amber-100 rounded-full font-black text-xs flex items-center justify-center shadow">
                    3
                  </span>
                </div>
                <h4 className="text-xs font-black text-center line-clamp-1 group-hover:text-amber-300">{sortedGroups[2].name}</h4>
                <span className="text-[10px] text-emerald-200">{sortedGroups[2].countryName}</span>
                <div className="w-full mt-2 h-16 bg-amber-800/20 backdrop-blur-md rounded-t-2xl border-t border-amber-700/40 flex flex-col items-center justify-center p-1">
                  <span className="text-xs font-black text-amber-400">{sortedGroups[2].memberCount}</span>
                  <span className="text-[9px] text-amber-300/80">عضو</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Ambassador Badges System */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Award size={20} className="text-amber-500" />
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">أوسمة وسفراء سيد البلد بالخارج</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">تُمنح هذه الأوسمة التقديرية لأبناء الاتحاد المتميزين في خدمة الكيان بالمهجر</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BADGES.map((badge, idx) => (
            <div
              key={idx}
              className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm flex items-start gap-3.5"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${badge.color} text-white flex items-center justify-center text-2xl shadow-md shrink-0`}>
                {badge.icon}
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-white">{badge.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-1">
                  {badge.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
