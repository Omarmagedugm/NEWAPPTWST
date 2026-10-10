import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Trophy, 
  ShoppingBag, 
  Newspaper, 
  PlayCircle, 
  ShieldCheck, 
  Globe, 
  Building2, 
  Sparkles, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Calendar, 
  Download, 
  RefreshCw, 
  Flame, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  PieChart,
  Activity,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { useAppStore } from '../../store';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { calculateTopActiveFans } from '../../lib/fanEngagement';
import toast from 'react-hot-toast';

type TimeFilter = 'all' | '30days' | '7days' | 'today';
type CategoryFilter = 'all' | 'community' | 'content' | 'store' | 'matches';

export default function AdminAnalytics() {
  const { 
    users, 
    news, 
    media, 
    matches, 
    fanPosts, 
    polls, 
    predictions, 
    orders, 
    businesses, 
    worldApplications,
    worldPosts,
    products,
    memberDiscounts,
    newsCategories
  } = useAppStore();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [liveCommentsCount, setLiveCommentsCount] = useState<number>(0);
  const [fanCommentsCount, setFanCommentsCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Listen to real-time live comments and fan comments count from Firestore & sync full users
  useEffect(() => {
    // Sync full users list to ensure all 500+ users are reflected immediately
    getDocs(collection(db, 'users')).then(snap => {
      const allUsers = snap.docs.map(d => ({ id: d.id, uid: d.id, ...(d.data() as any) }));
      useAppStore.getState().setUsers(allUsers);
    }).catch(err => console.warn('Sync users in analytics error:', err));

    const unsubLive = onSnapshot(collection(db, 'live_comments'), (snap) => {
      setLiveCommentsCount(snap.docs.length);
      setLastSyncTime(new Date());
    }, (err) => console.warn('Live comments listener error:', err));

    const unsubFanComments = onSnapshot(collection(db, 'fan_comments'), (snap) => {
      setFanCommentsCount(snap.docs.length);
      setLastSyncTime(new Date());
    }, (err) => console.warn('Fan comments listener error:', err));

    return () => {
      unsubLive();
      unsubFanComments();
    };
  }, []);

  // Time filter cutoff date
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (timeFilter === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (timeFilter === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    return new Date(0); // All time
  }, [timeFilter]);

  // Filtered Datasets based on time
  const filteredUsers = useMemo(() => {
    if (timeFilter === 'all') return users;
    return users.filter(u => {
      const d = u.createdAt ? new Date(u.createdAt) : null;
      return d ? d >= cutoffDate : true;
    });
  }, [users, cutoffDate, timeFilter]);

  const filteredFanPosts = useMemo(() => {
    if (timeFilter === 'all') return fanPosts;
    return fanPosts.filter(p => {
      const d = p.createdAt ? new Date(p.createdAt) : null;
      return d ? d >= cutoffDate : true;
    });
  }, [fanPosts, cutoffDate, timeFilter]);

  const filteredNews = useMemo(() => {
    if (timeFilter === 'all') return news;
    return news.filter(n => {
      const d = n.date ? new Date(n.date) : null;
      return d ? d >= cutoffDate : true;
    });
  }, [news, cutoffDate, timeFilter]);

  const filteredMedia = useMemo(() => {
    if (timeFilter === 'all') return media;
    return media.filter(m => {
      const d = m.createdAt ? new Date(m.createdAt) : null;
      return d ? d >= cutoffDate : true;
    });
  }, [media, cutoffDate, timeFilter]);

  const filteredPredictions = useMemo(() => {
    if (timeFilter === 'all') return predictions;
    return predictions.filter(p => {
      const d = p.createdAt ? new Date(p.createdAt) : null;
      return d ? d >= cutoffDate : true;
    });
  }, [predictions, cutoffDate, timeFilter]);

  const filteredOrders = useMemo(() => {
    if (timeFilter === 'all') return orders;
    return orders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d ? d >= cutoffDate : true;
    });
  }, [orders, cutoffDate, timeFilter]);

  // Aggregate Metrics Calculations (Real synchronized numbers)
  const totalLikes = useMemo(() => {
    return filteredFanPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
  }, [filteredFanPosts]);

  const totalPollVotes = useMemo(() => {
    return polls.reduce((total, poll) => {
      if (!poll.votes) return total;
      const pollVotes = Object.values(poll.votes).reduce((optSum, v) => optSum + (Number(v) || 0), 0);
      return total + pollVotes;
    }, 0);
  }, [polls]);

  const totalNewsViews = useMemo(() => {
    return news.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
  }, [news]);

  const totalMediaViews = useMemo(() => {
    return media.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
  }, [media]);

  const totalCompletedOrdersRevenue = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'completed' || o.status === 'confirmed')
      .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  }, [filteredOrders]);

  const totalPotentialOrdersRevenue = useMemo(() => {
    return filteredOrders
      .filter(o => o.status !== 'cancelled' && o.status !== 'rejected')
      .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  }, [filteredOrders]);

  const totalInteractions = useMemo(() => {
    return totalLikes + fanCommentsCount + liveCommentsCount + totalPollVotes + filteredPredictions.length;
  }, [totalLikes, fanCommentsCount, liveCommentsCount, totalPollVotes, filteredPredictions]);

  // Verified Official Club Members
  const verifiedClubMembersCount = useMemo(() => {
    return users.filter(u => u.isVerifiedMember || (u.membershipNumber && u.membershipNumber.trim() !== '')).length;
  }, [users]);

  // Active Users in last 7 days
  const activeRecentlyUsersCount = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return users.filter(u => {
      const last = u.lastActive ? new Date(u.lastActive) : (u.createdAt ? new Date(u.createdAt) : null);
      return last ? last >= sevenDaysAgo : false;
    }).length;
  }, [users]);

  // Top Most Engaged Fans (Leaderboard) with real dynamic points calculation
  const topActiveFans = useMemo(() => {
    return calculateTopActiveFans(users, {
      predictions,
      matches,
      fanPosts,
      polls,
      orders
    }, 5);
  }, [users, predictions, matches, fanPosts, polls, orders]);

  // Top Trending Fan Posts
  const topTrendingPosts = useMemo(() => {
    return [...filteredFanPosts]
      .sort((a, b) => ((b.likes || 0) + (b.commentsCount || 0)) - ((a.likes || 0) + (a.commentsCount || 0)))
      .slice(0, 5);
  }, [filteredFanPosts]);

  // Top Viewed News Articles
  const topViewedNews = useMemo(() => {
    return [...news]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  }, [news]);

  // Match Predictions Stats
  const predictionsStats = useMemo(() => {
    const total = filteredPredictions.length;
    const correct = filteredPredictions.filter(p => p.status === 'won' || p.pointsAwarded).length;
    const pending = filteredPredictions.filter(p => !p.status || p.status === 'pending').length;
    const accuracy = total > 0 ? Math.round((correct / (total - pending || 1)) * 100) : 0;
    return { total, correct, pending, accuracy: Math.min(100, Math.max(0, accuracy)) };
  }, [filteredPredictions]);

  // Store Orders Breakdown
  const ordersStats = useMemo(() => {
    const total = filteredOrders.length;
    const whatsapp = filteredOrders.filter(o => o.channel === 'whatsapp' || o.source === 'whatsapp').length;
    const completed = filteredOrders.filter(o => o.status === 'completed' || o.status === 'confirmed').length;
    const pending = filteredOrders.filter(o => o.status === 'pending' || !o.status).length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled' || o.status === 'rejected').length;
    return { total, whatsapp, completed, pending, cancelled };
  }, [filteredOrders]);

  // Manual Refresh action
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const allUsers = snap.docs.map(d => ({ id: d.id, uid: d.id, ...(d.data() as any) }));
      useAppStore.getState().setUsers(allUsers);
      setLastSyncTime(new Date());
      toast.success(`تمت مزامنة وتحديث جميع الإحصاءات لحظياً (${allUsers.length} عضو) ⚡`);
    } catch (e) {
      toast.error('فشل تحديث البيانات');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Export Analytics Report as JSON / CSV
  const handleExportData = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeFilter,
      summary: {
        totalUsers: users.length,
        verifiedMembers: verifiedClubMembersCount,
        activeRecentUsers: activeRecentlyUsersCount,
        totalFanInteractions: totalInteractions,
        totalLikes,
        fanCommentsCount,
        liveCommentsCount,
        totalPollVotes,
        totalPredictions: predictions.length,
        totalNewsArticles: news.length,
        totalNewsViews,
        totalMediaItems: media.length,
        totalMediaViews,
        totalStoreOrders: orders.length,
        totalCompletedRevenueEGP: totalCompletedOrdersRevenue,
        totalBusinesses: businesses.length,
        worldFansApplications: worldApplications.length
      },
      topActiveFans: topActiveFans.map(u => ({ name: u.userName, email: u.email, points: u.totalPoints })),
      ordersStats,
      predictionsStats
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ittihad_analytics_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم تصدير تقرير الإحصاءات بنجاح 📥');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 rounded-[32px] p-6 text-white border border-primary/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                مزامنة حية ولحظية (Live Firestore)
              </span>
              <span className="text-[11px] text-slate-400 font-bold">
                آخر تحديث: {lastSyncTime.toLocaleTimeString('ar-EG')}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              <BarChart3 className="text-primary-light w-8 h-8" />
              مركز الإحصاءات والتحليلات والتفاعل
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-bold leading-relaxed">
              متابعة حية وشاملة لكافة أنشطة الجماهير، منشورات الفان زون، مشاهدات الأخبار والميديا، مبيعات المتجر، وتفاعل رابطة مغتربي زعيم الثغر بأرقام حقيقية وموثوقة.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl text-white transition-all flex items-center gap-2 text-xs font-black border border-white/10"
              title="تحديث البيانات لحظياً"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-primary-light' : ''} />
              <span className="hidden sm:inline">تحديث فوري</span>
            </button>
            <button 
              onClick={handleExportData}
              className="px-4 py-3 bg-primary hover:bg-primary-light active:scale-95 text-white rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-primary/30"
            >
              <Download size={16} />
              <span>تصدير التقرير (JSON)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 relative z-10">
          {/* Time Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Clock size={12} />
              النطاق الزمني:
            </span>
            <button 
              onClick={() => setTimeFilter('all')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${timeFilter === 'all' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              كافة الأوقات
            </button>
            <button 
              onClick={() => setTimeFilter('30days')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${timeFilter === '30days' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              آخر 30 يوم
            </button>
            <button 
              onClick={() => setTimeFilter('7days')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${timeFilter === '7days' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              آخر 7 أيام
            </button>
            <button 
              onClick={() => setTimeFilter('today')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${timeFilter === 'today' ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              اليوم
            </button>
          </div>

          {/* Section Category Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Filter size={12} />
              القسم:
            </span>
            <button 
              onClick={() => setCategoryFilter('all')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setCategoryFilter('community')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${categoryFilter === 'community' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              الجماهير
            </button>
            <button 
              onClick={() => setCategoryFilter('content')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${categoryFilter === 'content' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              المحتوى
            </button>
            <button 
              onClick={() => setCategoryFilter('store')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${categoryFilter === 'store' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              المتجر
            </button>
            <button 
              onClick={() => setCategoryFilter('matches')} 
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${categoryFilter === 'matches' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              المباريات
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Community & Users */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-[28px] border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي قاعدة الجماهير</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {filteredUsers.length.toLocaleString('ar-EG')}
            </span>
            <span className="text-[11px] font-bold text-slate-400">مشجع مسجل</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={14} />
              {verifiedClubMembersCount} عضو نادي رسمي
            </span>
            <span>{activeRecentlyUsersCount} نشط حديثاً</span>
          </div>
        </div>

        {/* 2. Total Engagements */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-[28px] border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي التفاعلات الحية</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalInteractions.toLocaleString('ar-EG')}
            </span>
            <span className="text-[11px] font-bold text-orange-500">تفاعل نشط 🔥</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>{totalLikes} إعجاب</span>
            <span>{fanCommentsCount + liveCommentsCount} تعليق</span>
            <span>{totalPollVotes} تصويت</span>
          </div>
        </div>

        {/* 3. Content Reach & Views */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-[28px] border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مشاهدات المحتوى والميديا</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {(totalNewsViews + totalMediaViews).toLocaleString('ar-EG')}
            </span>
            <span className="text-[11px] font-bold text-blue-500">قراءة ومشاهدة</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>{news.length} خبر منشور</span>
            <span>{media.length} فيديو وميديا</span>
          </div>
        </div>

        {/* 4. Store Commerce & Value */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-[28px] border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مبيعات متجر النادي</span>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalCompletedOrdersRevenue.toLocaleString('ar-EG')}
            </span>
            <span className="text-[11px] font-bold text-primary">ج.م مؤكد</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>{ordersStats.total} إجمالي الطلبات</span>
            <span className="text-emerald-600 font-black">{ordersStats.whatsapp} عبر واتساب</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: FAN ENGAGEMENT & COMMUNITY INTELLIGENCE */}
      {(categoryFilter === 'all' || categoryFilter === 'community') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fan Interactions Breakdown Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">توزيع التفاعل الجماهيري (Real-time Breakdown)</h3>
                  <p className="text-[11px] text-slate-400 font-bold">تفاصيل تفاعل المشجعين عبر قنوات المنصة المختلفة</p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300">
                {totalInteractions} عملية تفاعل
              </span>
            </div>

            {/* Interactive Visual Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <ThumbsUp size={14} className="text-blue-500" />
                    إعجابات المنشورات (Likes)
                  </span>
                  <span className="font-black">{totalLikes} ({totalInteractions > 0 ? Math.round((totalLikes / totalInteractions) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-surface-dark overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" 
                    style={{ width: `${totalInteractions > 0 ? Math.max(5, Math.min(100, (totalLikes / totalInteractions) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <MessageSquare size={14} className="text-pink-500" />
                    تعليقات الفان زون والمناقشات
                  </span>
                  <span className="font-black">{fanCommentsCount} ({totalInteractions > 0 ? Math.round((fanCommentsCount / totalInteractions) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-surface-dark overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-700" 
                    style={{ width: `${totalInteractions > 0 ? Math.max(5, Math.min(100, (fanCommentsCount / totalInteractions) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <MessageCircle size={14} className="text-emerald-500" />
                    تعليقات البث المباشر (Live Chat)
                  </span>
                  <span className="font-black">{liveCommentsCount} ({totalInteractions > 0 ? Math.round((liveCommentsCount / totalInteractions) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-surface-dark overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700" 
                    style={{ width: `${totalInteractions > 0 ? Math.max(5, Math.min(100, (liveCommentsCount / totalInteractions) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <BarChart3 size={14} className="text-amber-500" />
                    تصويتات الاستطلاعات
                  </span>
                  <span className="font-black">{totalPollVotes} ({totalInteractions > 0 ? Math.round((totalPollVotes / totalInteractions) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-surface-dark overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700" 
                    style={{ width: `${totalInteractions > 0 ? Math.max(5, Math.min(100, (totalPollVotes / totalInteractions) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Trophy size={14} className="text-purple-500" />
                    توقعات نتائج المباريات
                  </span>
                  <span className="font-black">{filteredPredictions.length} ({totalInteractions > 0 ? Math.round((filteredPredictions.length / totalInteractions) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-surface-dark overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700" 
                    style={{ width: `${totalInteractions > 0 ? Math.max(5, Math.min(100, (filteredPredictions.length / totalInteractions) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-border-dark">
              <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400">منشورات الفان زون</span>
                <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{filteredFanPosts.length}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400">استطلاعات نشطة</span>
                <p className="text-base font-black text-emerald-600 mt-0.5">{polls.filter(p => p.active).length} من {polls.length}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400">دقة التوقعات</span>
                <p className="text-base font-black text-purple-600 mt-0.5">%{predictionsStats.accuracy}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-surface-dark rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400">مغتربين العالم</span>
                <p className="text-base font-black text-blue-600 mt-0.5">{worldApplications.length} عضو</p>
              </div>
            </div>
          </div>

          {/* Top Active Fans Leaderboard */}
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">صدارة المشجعين الأكثر تفاعلاً</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">نقاط الولاء</span>
              </div>

              <div className="space-y-3">
                {topActiveFans.map((fan, idx) => (
                  <div key={fan.userId || idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-amber-950 shadow-md' :
                          idx === 1 ? 'bg-slate-300 text-slate-900' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                          <span>{fan.userName}</span>
                          {fan.isVerifiedMember && <ShieldCheck size={12} className="text-primary shrink-0" />}
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${fan.rankBadge.bg} ${fan.rankBadge.color} shrink-0`}>
                            {fan.rankBadge.label}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold truncate">
                          🎯 {fan.correctScores} نتيجة | ✍️ {fan.totalPosts} منشور | ❤️ {fan.totalLikesReceived} لايك
                        </p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs">
                        {fan.totalPoints.toLocaleString('ar-EG')} نقطة
                      </span>
                    </div>
                  </div>
                ))}

                {topActiveFans.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs font-bold">لا يوجد مستخدمين مسجلين بعد</div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>يتم احتساب النقاط بناءً على التفاعل</span>
              <span className="text-primary font-black">نظام الجيميفيكيشن 🎮</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CONTENT & MEDIA INTELLIGENCE */}
      {(categoryFilter === 'all' || categoryFilter === 'content') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Viewed News Articles */}
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Newspaper size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">الأخبار الأكثر قراءة ومشاهدة</h3>
                  <p className="text-[11px] text-slate-400 font-bold">ترتيب المقالات حسب عدد الزيارات والمشاهدات الحقيقية</p>
                </div>
              </div>
              <span className="text-xs font-black text-blue-600">{totalNewsViews.toLocaleString('ar-EG')} مشاهدة</span>
            </div>

            <div className="space-y-3">
              {topViewedNews.map((article, i) => (
                <div key={article.id || i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{article.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {article.category || 'أخبار النادي'} • {article.date ? new Date(article.date).toLocaleDateString('ar-EG') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-black text-xs bg-white dark:bg-card-dark px-2.5 py-1 rounded-xl shadow-xs shrink-0">
                    <Eye size={12} className="text-blue-500" />
                    <span>{(article.views || 0).toLocaleString('ar-EG')}</span>
                  </div>
                </div>
              ))}

              {topViewedNews.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">لا توجد أخبار منشورة</div>
              )}
            </div>
          </div>

          {/* Top Trending Community Posts */}
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <Flame size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">المنشورات الأكثر تفاعلاً (الفان زون)</h3>
                  <p className="text-[11px] text-slate-400 font-bold">أقوى مشاركات الجماهير نقاشاً وإعجاباً</p>
                </div>
              </div>
              <span className="text-xs font-black text-orange-600">{filteredFanPosts.length} منشور</span>
            </div>

            <div className="space-y-3">
              {topTrendingPosts.map((post, i) => (
                <div key={post.id || i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 font-black text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">{post.content || post.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        بقلم: {post.userName || 'مشجع'} • {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ar-EG') : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs font-black">
                    <span className="flex items-center gap-1 text-blue-500">
                      <ThumbsUp size={12} />
                      {post.likes || 0}
                    </span>
                    <span className="flex items-center gap-1 text-pink-500">
                      <MessageSquare size={12} />
                      {post.commentsCount || 0}
                    </span>
                  </div>
                </div>
              ))}

              {topTrendingPosts.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">لا توجد منشورات جماهير بعد</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: STORE, BUSINESS & MATCHES INTELLIGENCE */}
      {(categoryFilter === 'all' || categoryFilter === 'store' || categoryFilter === 'matches') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Store & Orders Breakdown */}
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">حالة طلبات المتجر</h3>
                <p className="text-[10px] text-slate-400 font-bold">{ordersStats.total} إجمالي الطلبات</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  طلبات مؤكدة / مكتملة
                </span>
                <span className="text-sm font-black">{ordersStats.completed}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Clock size={14} />
                  قيد المراجعة / الانتظار
                </span>
                <span className="text-sm font-black">{ordersStats.pending}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-500/20 text-green-700 dark:text-green-300">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <MessageCircle size={14} />
                  طلبات عبر الواتساب المباشر
                </span>
                <span className="text-sm font-black">{ordersStats.whatsapp}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  ملغية أو مرفوضة
                </span>
                <span className="text-sm font-black">{ordersStats.cancelled}</span>
              </div>
            </div>
          </div>

          {/* Matches & Predictions Analytics */}
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">المباريات والتوقعات الرياضية</h3>
                <p className="text-[10px] text-slate-400 font-bold">{matches.length} مباراة مسجلة في الجدول</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">إجمالي التوقعات المسجلة</span>
                  <span className="text-sm font-black text-purple-600">{predictionsStats.total}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">التوقعات الفائزة المعتمدة</span>
                  <span className="text-sm font-black text-emerald-600">{predictionsStats.correct}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">نسبة دقة التوقعات</span>
                  <span className="text-sm font-black text-primary">%{predictionsStats.accuracy}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">sports_soccer</span>
                  <span className="text-xs font-black text-primary">مباريات كرة القدم</span>
                </div>
                <span className="text-xs font-black">{matches.filter(m => m.sport !== 'basketball').length} مباراة</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-xl">sports_basketball</span>
                  <span className="text-xs font-black text-orange-600">مباريات كرة السلة</span>
                </div>
                <span className="text-xs font-black">{matches.filter(m => m.sport === 'basketball').length} مباراة</span>
              </div>
            </div>
          </div>

          {/* Business & Diaspora Ecosystem */}
          <div className="bg-white dark:bg-card-dark rounded-[32px] p-6 border border-border-light dark:border-border-dark shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">بيزنس ومغتربي النادي</h3>
                <p className="text-[10px] text-slate-400 font-bold">منظومة الأعمال والانتشار العالمي</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-emerald-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">مشروعات اتحاداوي بيزنس</span>
                </div>
                <span className="text-xs font-black text-emerald-600">{businesses.length} مشروع</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">خصومات أعضاء النادي</span>
                </div>
                <span className="text-xs font-black text-amber-600">{memberDiscounts.length} شريك خصم</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">طلبات رابطة العالم (مغتربين)</span>
                </div>
                <span className="text-xs font-black text-blue-600">{worldApplications.length} طلب</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-100 dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">منشورات المغتربين</span>
                </div>
                <span className="text-xs font-black text-indigo-600">{worldPosts.length} منشور</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
