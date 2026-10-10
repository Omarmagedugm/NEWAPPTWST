import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Globe, 
  ArrowRight, 
  Users, 
  MessageSquare, 
  Calendar, 
  Compass, 
  Trophy, 
  Sparkles,
  Search,
  ShieldCheck,
  Settings,
  PlusCircle
} from 'lucide-react';
import { useAppStore } from '../store';
import { WorldFansHero } from '../components/worldFans/WorldFansHero';
import { WorldGroupsList } from '../components/worldFans/WorldGroupsList';
import { WorldFeedTab } from '../components/worldFans/WorldFeedTab';
import { WorldEventsTab } from '../components/worldFans/WorldEventsTab';
import { WorldHelpTab } from '../components/worldFans/WorldHelpTab';
import { WorldLeaderboardTab } from '../components/worldFans/WorldLeaderboardTab';
import { WorldFoundLeagueModal } from '../components/worldFans/WorldFoundLeagueModal';

export const WorldFans: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    worldCountries, 
    worldGroups, 
    worldPosts, 
    worldEvents, 
    worldHelpRequests,
    worldApplications,
    profile
  } = useAppStore();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const pendingAppsCount = worldApplications.filter(a => a.status === 'pending').length;

  const tabParam = searchParams.get('tab') || 'leagues';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFoundLeagueOpen, setIsFoundLeagueOpen] = useState<boolean>(false);

  useEffect(() => {
    if (tabParam === 'found') {
      setIsFoundLeagueOpen(true);
    } else if (['leagues', 'feed', 'events', 'help', 'leaderboard'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const TABS = [
    { id: 'leagues', label: 'الروابط المسجلة', icon: Globe, count: worldGroups.length },
    { id: 'feed', label: 'ملتقى المغتربين', icon: MessageSquare, count: worldPosts.length },
    { id: 'events', label: 'تجمعات المباريات', icon: Calendar, count: worldEvents.filter(e => e.status === 'upcoming').length },
    { id: 'help', label: 'دليل المغترب', icon: Compass, count: worldHelpRequests.length },
    { id: 'leaderboard', label: 'لوحة الشرف والأوسمة', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-28 pt-2">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between py-3 mb-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all"
          >
            <ArrowRight size={18} />
            <span>العودة للرئيسية</span>
          </button>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin?tab=world-fans')}
                className="flex items-center gap-1.5 text-[11px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-3 py-1 rounded-xl border border-amber-400/40 shadow-sm active:scale-95 transition-all"
              >
                <Settings size={13} />
                <span>لوحة تحكم المشرف العام</span>
                {pendingAppsCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full animate-bounce">
                    {pendingAppsCount}
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                المجتمع الدولي 🌍
              </span>
            </div>
          </div>
        </div>

        {/* Global Admin Fast Action Bar */}
        {isAdmin && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900/20 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                👑
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-white">
                  أنت مسجل كـ مشرف عام للتطبيق (صلاحيات كاملة)
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  تحكم في كافة الروابط، البلدان، طلبات التأسيس ({pendingAppsCount} معلقة)، الفعاليات والمنشورات.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin?tab=world-fans')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Settings size={14} />
                <span>إدارة الروابط بالكامل</span>
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <WorldFansHero
          countries={worldCountries}
          groups={worldGroups}
          events={worldEvents}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenFoundLeague={() => setIsFoundLeagueOpen(true)}
        />

        {/* Navigation Tabs Bar */}
        <div className="sticky top-2 z-30 mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 min-w-[130px] sm:min-w-0 py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          {activeTab === 'leagues' && (
            <motion.div
              key="leagues"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Registered World Groups List Only */}
              <WorldGroupsList
                groups={worldGroups.filter(g => g.status !== 'rejected' && g.status !== 'suspended')}
                onOpenFoundLeague={() => setIsFoundLeagueOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <WorldFeedTab
                posts={worldPosts}
                groups={worldGroups}
              />
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <WorldEventsTab
                events={worldEvents}
                groups={worldGroups}
              />
            </motion.div>
          )}

          {activeTab === 'help' && (
            <motion.div
              key="help"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <WorldHelpTab
                helpRequests={worldHelpRequests}
                countries={worldCountries}
              />
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <WorldLeaderboardTab
                groups={worldGroups}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Found League Modal */}
        <WorldFoundLeagueModal
          isOpen={isFoundLeagueOpen}
          onClose={() => setIsFoundLeagueOpen(false)}
          countries={worldCountries}
        />
      </div>
    </div>
  );
};

export default WorldFans;

