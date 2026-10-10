import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Flame, 
  Star, 
  ShieldCheck, 
  Sparkles, 
  Target, 
  MessageSquare, 
  Heart, 
  Info, 
  ChevronDown, 
  TrendingUp,
  Users,
  Search,
  Zap,
  Medal
} from 'lucide-react';
import { useAppStore } from '../../store';
import { calculateTopActiveFans, calculateUserEngagement } from '../../lib/fanEngagement';
import { getOptimizedImage } from '../../lib/cloudinary';

export const FansLeaderboard: React.FC = () => {
  const { users, predictions, matches, fanPosts, polls, orders, profile } = useAppStore();
  const [filterType, setFilterType] = useState<'overall' | 'predictions' | 'creators'>('overall');
  const [showPointsGuide, setShowPointsGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Engagement context for calculations
  const context = useMemo(() => ({
    predictions,
    matches,
    fanPosts,
    polls,
    orders
  }), [predictions, matches, fanPosts, polls, orders]);

  // Calculate top active fans with real dynamic data
  const allFans = useMemo(() => {
    return calculateTopActiveFans(users, context, 100);
  }, [users, context]);

  // Current user's stats
  const currentUserStats = useMemo(() => {
    if (!profile || (!profile.uid && !profile.name)) return null;
    const stats = calculateUserEngagement(profile, context);
    const rankIndex = allFans.findIndex(f => f.userId === profile.uid || f.userName === profile.name || (profile.email && f.email === profile.email));
    return {
      ...stats,
      rank: rankIndex !== -1 ? rankIndex + 1 : allFans.length + 1
    };
  }, [profile, context, allFans]);

  // Filtered leaderboard list based on selected tab and search
  const displayFans = useMemo(() => {
    let list = [...allFans];
    if (filterType === 'predictions') {
      list = list.sort((a, b) => (b.predictionsPoints + b.correctScores * 30) - (a.predictionsPoints + a.correctScores * 30) || b.correctScores - a.correctScores || b.totalPoints - a.totalPoints);
    } else if (filterType === 'creators') {
      list = list.sort((a, b) => (b.postsPoints + b.likesReceivedPoints + b.commentsPoints) - (a.postsPoints + a.likesReceivedPoints + a.commentsPoints) || b.totalLikesReceived - a.totalLikesReceived || b.totalPoints - a.totalPoints);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(f => f.userName.toLowerCase().includes(q) || (f.membershipNumber && f.membershipNumber.toLowerCase().includes(q)));
    }

    return list;
  }, [allFans, filterType, searchQuery]);

  const topThree = displayFans.slice(0, 3);
  const remainingFans = displayFans.length > 3 ? displayFans.slice(3) : displayFans;

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#063323] via-[#094731] to-[#042116] p-6 text-white shadow-xl border border-emerald-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/30">
              <Trophy size={14} className="text-amber-400" />
              <span>صدارة مشجعي زعيم الثغر</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              لوحة شرف المشجعين الأكثر تفاعلاً
            </h2>
            <p className="text-xs text-emerald-200/80 max-w-xl leading-relaxed">
              تُحتسب النقاط تلقائياً بناءً على توقعات المباريات الصحيحة، التفاعل في الفان زون، التعليقات، والمشاركات الرسمية بنظام الجيميفيكيشن الواقعي.
            </p>
          </div>

          <button
            onClick={() => setShowPointsGuide(!showPointsGuide)}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black backdrop-blur-md border border-white/10 transition-all active:scale-95 cursor-pointer"
          >
            <Info size={15} className="text-amber-300" />
            <span>كيف تُحسب النقاط؟</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${showPointsGuide ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* How points are earned collapsible */}
        <AnimatePresence>
          {showPointsGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-5 pt-5 border-t border-emerald-500/20"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-lg">🎯</span>
                  <span className="text-xs font-black text-amber-300">+50 نقطة</span>
                  <span className="text-[10px] text-emerald-100/70 font-medium">النتيجة الدقيقة</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-lg">⚽</span>
                  <span className="text-xs font-black text-amber-300">+25 نقطة</span>
                  <span className="text-[10px] text-emerald-100/70 font-medium">توقع الفائز</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-lg">✍️</span>
                  <span className="text-xs font-black text-amber-300">+20 نقطة</span>
                  <span className="text-[10px] text-emerald-100/70 font-medium">منشور بالفان زون</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-lg">❤️</span>
                  <span className="text-xs font-black text-amber-300">+5 نقاط</span>
                  <span className="text-[10px] text-emerald-100/70 font-medium">إعجاب على منشورك</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-lg">📊</span>
                  <span className="text-xs font-black text-amber-300">+15 نقطة</span>
                  <span className="text-[10px] text-emerald-100/70 font-medium">تصويت بالاستطلاع</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-lg">🏛️</span>
                  <span className="text-xs font-black text-amber-300">+200 نقطة</span>
                  <span className="text-[10px] text-emerald-100/70 font-medium">عضوية النادي الموثقة</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Current Logged In User Card */}
      {currentUserStats && (
        <div className="p-4 rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="relative shrink-0">
              <img
                src={getOptimizedImage(currentUserStats.userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserStats.userName)}&background=random`}
                alt={currentUserStats.userName}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-primary shadow-sm"
              />
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow">
                #{currentUserStats.rank}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">{currentUserStats.userName} (أنت)</h4>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${currentUserStats.rankBadge.bg} ${currentUserStats.rankBadge.color}`}>
                  {currentUserStats.rankBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                توقع: {currentUserStats.totalPredictions} | منشورات: {currentUserStats.totalPosts} | لايكات نالها: {currentUserStats.totalLikesReceived} | لايكات عملها: {currentUserStats.totalLikesGiven}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-border-dark">
            <div className="text-right sm:text-left">
              <span className="text-[10px] font-bold text-slate-400 block">رصيد نقاطك الحالي</span>
              <span className="text-lg font-black text-primary">
                {currentUserStats.totalPoints.toLocaleString('ar-EG')} نقطة
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('overall')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterType === 'overall'
                ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy size={14} />
            <span>الترتيب العام الشامل</span>
          </button>

          <button
            onClick={() => setFilterType('predictions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterType === 'predictions'
                ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target size={14} />
            <span>صدارة التوقعات</span>
          </button>

          <button
            onClick={() => setFilterType('creators')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              filterType === 'creators'
                ? 'bg-white dark:bg-card-dark text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame size={14} />
            <span>أنشط المتفاعلين</span>
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن مشجع بالاسم..."
            className="w-full bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-2xl pr-9 pl-4 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Podium for Top 3 (Rendered when no search query) */}
      {!searchQuery && topThree.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white dark:from-surface-dark dark:to-card-dark p-6 border border-border-light dark:border-border-dark shadow-sm">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 max-w-lg mx-auto">
            {/* Rank 2 - Silver */}
            {topThree[1] ? (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <img
                    src={getOptimizedImage(topThree[1].userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(topThree[1].userName)}&background=random`}
                    alt={topThree[1].userName}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-md"
                  />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-slate-300 text-slate-900 rounded-full font-black text-xs flex items-center justify-center shadow">
                    2
                  </span>
                </div>
                <h4 className="text-xs font-black text-center line-clamp-1 text-slate-800 dark:text-white">{topThree[1].userName}</h4>
                <span className="text-[10px] text-slate-400 font-bold">{topThree[1].rankBadge.label.split(' ')[0]}</span>
                <div className="w-full mt-2 h-20 bg-slate-200/50 dark:bg-slate-800/60 rounded-t-2xl border-t-2 border-slate-300 flex flex-col items-center justify-center p-1">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{topThree[1].totalPoints.toLocaleString('ar-EG')}</span>
                  <span className="text-[9px] text-slate-400">نقطة</span>
                </div>
              </motion.div>
            ) : <div />}

            {/* Rank 1 - Gold */}
            {topThree[0] && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <img
                    src={getOptimizedImage(topThree[0].userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(topThree[0].userName)}&background=random`}
                    alt={topThree[0].userName}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl ring-4 ring-amber-400/20"
                  />
                  <span className="absolute -top-3 -right-2 w-7 h-7 bg-amber-400 text-slate-950 rounded-full font-black text-sm flex items-center justify-center shadow-lg animate-bounce">
                    👑 1
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-center text-amber-600 dark:text-amber-400 line-clamp-1">{topThree[0].userName}</h4>
                <span className="text-[10px] text-amber-500 font-bold">{topThree[0].rankBadge.label}</span>
                <div className="w-full mt-2 h-28 bg-gradient-to-t from-amber-500/20 to-amber-500/40 rounded-t-2xl border-t-2 border-amber-400 flex flex-col items-center justify-center p-1">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-300">{topThree[0].totalPoints.toLocaleString('ar-EG')}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-200 font-bold">نقطة صدارة</span>
                </div>
              </motion.div>
            )}

            {/* Rank 3 - Bronze */}
            {topThree[2] ? (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <img
                    src={getOptimizedImage(topThree[2].userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(topThree[2].userName)}&background=random`}
                    alt={topThree[2].userName}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-700 shadow-md"
                  />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-700 text-amber-100 rounded-full font-black text-xs flex items-center justify-center shadow">
                    3
                  </span>
                </div>
                <h4 className="text-xs font-black text-center line-clamp-1 text-slate-800 dark:text-white">{topThree[2].userName}</h4>
                <span className="text-[10px] text-slate-400 font-bold">{topThree[2].rankBadge.label.split(' ')[0]}</span>
                <div className="w-full mt-2 h-16 bg-amber-900/10 dark:bg-amber-900/30 rounded-t-2xl border-t-2 border-amber-700 flex flex-col items-center justify-center p-1">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300">{topThree[2].totalPoints.toLocaleString('ar-EG')}</span>
                  <span className="text-[9px] text-slate-400">نقطة</span>
                </div>
              </motion.div>
            ) : <div />}
          </div>
        </div>
      )}

      {/* Leaderboard Detailed Table/Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {searchQuery ? `نتائج البحث (${displayFans.length})` : 'ترتيب قائمة المشجعين'}
          </h4>
          <span className="text-[10px] font-bold text-slate-400">
            {displayFans.length} مشجع
          </span>
        </div>

        {displayFans.map((fan, idx) => {
          const rank = idx + 1;
          return (
            <motion.div
              key={fan.userId || `${fan.userName}_${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className={`flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-card-dark border shadow-sm transition-colors ${
                rank === 1 
                  ? 'border-amber-400/40 bg-amber-50/20 dark:bg-amber-500/5' 
                  : rank === 2 
                  ? 'border-slate-300/40' 
                  : rank === 3 
                  ? 'border-amber-700/30' 
                  : 'border-border-light dark:border-border-dark hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className={`w-7 text-center font-black text-xs shrink-0 ${
                  rank === 1 ? 'text-amber-500 font-extrabold' : rank === 2 ? 'text-slate-400' : rank === 3 ? 'text-amber-700' : 'text-slate-400'
                }`}>
                  #{rank}
                </span>

                <div className="relative shrink-0">
                  <img
                    src={getOptimizedImage(fan.userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(fan.userName)}&background=random`}
                    alt={fan.userName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-100 dark:border-border-dark"
                  />
                  {fan.isVerifiedMember && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow">
                      <ShieldCheck size={10} />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h5 className="font-black text-xs text-slate-900 dark:text-white truncate">
                      {fan.userName}
                    </h5>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${fan.rankBadge.bg} ${fan.rankBadge.color} shrink-0`}>
                      {fan.rankBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-bold mt-0.5 flex-wrap">
                    <span>🎯 {fan.correctScores} صائبة ({fan.totalPredictions} توقع)</span>
                    <span>✍️ {fan.totalPosts} منشور</span>
                    <span>❤️ {fan.totalLikesReceived} لايك ناله</span>
                    <span>👍 {fan.totalLikesGiven} لايك عمله</span>
                  </div>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs border border-amber-500/20">
                  {fan.totalPoints.toLocaleString('ar-EG')} نقطة
                </span>
              </div>
            </motion.div>
          );
        })}

        {displayFans.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm font-bold bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark">
            لا توجد بيانات مشجعين مطابقة لبحثك
          </div>
        )}
      </div>
    </div>
  );
};
