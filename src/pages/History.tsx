import { motion, useInView, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Trophy, History as HistoryIcon, MapPin, Calendar, Star, Award, Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

const AnimatedCounter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration });
      return controls.stop;
    }
  }, [isInView, value, count, duration]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
};

export default function History() {
  const [activeTab, setActiveTab] = useState<'titles' | 'timeline' | 'stadiums'>('titles');
  const navigate = useNavigate();
  
  const { 
    clubStats: storeStats, 
    clubTitles: storeTitles, 
    historyEvents: storeEvents, 
    stadiums: storeStadiums,
    dataLoaded 
  } = useAppStore();

  const sortHistoryItems = <T extends { order?: number }>(items: T[], fallbackSort?: (a: T, b: T) => number): T[] => {
    return [...items].sort((a, b) => {
      const hasA = typeof a.order === 'number';
      const hasB = typeof b.order === 'number';
      if (hasA && hasB) return (a.order as number) - (b.order as number);
      if (hasA) return -1;
      if (hasB) return 1;
      if (fallbackSort) return fallbackSort(a, b);
      return 0;
    });
  };

  const clubStats = sortHistoryItems((storeStats || []).filter(i => !i.hidden));
  const clubTitles = sortHistoryItems((storeTitles || []).filter(i => !i.hidden), (a, b) => b.count - a.count);
  const historyEvents = sortHistoryItems((storeEvents || []).filter(i => !i.hidden), (a, b) => (a.year || '').localeCompare(b.year || ''));
  const stadiums = sortHistoryItems((storeStadiums || []).filter(i => !i.hidden));
  const loading = !dataLoaded && clubTitles.length === 0 && historyEvents.length === 0;
  
  const getStatIcon = (label: string) => {
    if (label.includes('سنة')) return <Calendar className="text-blue-500" />;
    if (label.includes('كأس')) return <Trophy className="text-yellow-500" />;
    if (label.includes('دوري')) return <Star className="text-primary" />;
    if (label.includes('سلة')) return <Award className="text-orange-500" />;
    return <Star className="text-primary" />;
  };

  const getTitleIcon = (name: string) => {
    if (name.includes('كأس')) return <Trophy size={16} />;
    if (name.includes('دوري')) return <Shield size={16} />;
    if (name.includes('دورة') || name.includes('بطولة')) return <Star size={16} />;
    return <Award size={16} />;
  };

  const footballTitles = clubTitles.filter(t => t.category === 'football');
  const basketballTitles = clubTitles.filter(t => t.category === 'basketball');

  return (
    <div className="flex-1 w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto bg-background-light dark:bg-background-dark min-h-screen pb-32 md:pb-16 px-0 md:px-6">
      <main className="px-4 md:px-0 py-6 space-y-8 text-right">
        {/* Founding Year Hero */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-[40px] -z-10"></div>
          <div className="text-[120px] font-black text-primary/10 dark:text-primary/5 leading-none absolute inset-0 flex items-center justify-center pointer-events-none select-none">1906</div>
          <motion.h1 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-6xl sm:text-8xl font-black bg-gradient-to-br from-primary via-primary-dark to-primary-light bg-clip-text text-transparent drop-shadow-sm mb-2"
          >
            1906
          </motion.h1>
          <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mr-1">تاريخ التأسيس</p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {clubStats.map((stat, idx) => (
            <motion.div 
              key={stat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-4 rounded-3xl flex flex-col items-center text-center gap-1 shadow-premium bg-white/50 dark:bg-surface-dark/50"
            >
              <div className="h-10 w-10 rounded-2xl bg-white dark:bg-card-dark shadow-sm flex items-center justify-center mb-1 ring-1 ring-border-light dark:ring-border-dark">
                {getStatIcon(stat.label)}
              </div>
              <div className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                <AnimatedCounter value={Number(stat.value)} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</span>
            </motion.div>
          ))}
          {clubStats.length === 0 && (
             <div className="col-span-2 py-8 text-center text-slate-400 font-bold text-sm">لا توجد أرقام تاريخية مضافة</div>
          )}
        </div>

        {/* Dynamic Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-surface-dark rounded-2xl">
          <button 
            onClick={() => setActiveTab('titles')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${activeTab === 'titles' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-400'}`}
          >
            البطولات
          </button>
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${activeTab === 'timeline' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-400'}`}
          >
            التاريخ
          </button>
          <button 
            onClick={() => setActiveTab('stadiums')}
            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${activeTab === 'stadiums' ? 'bg-white dark:bg-card-dark text-primary shadow-sm' : 'text-slate-400'}`}
          >
            الملاعب
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'titles' && (
            <motion.div 
              key="titles-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Football Titles */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-1 bg-primary rounded-full"></div>
                   <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">بطولات كرة القدم</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {footballTitles.map((title) => (
                    <div key={title.id} className="bg-white dark:bg-card-dark p-3 rounded-2xl border border-border-light dark:border-border-dark flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-surface-dark rounded-xl text-primary">
                          {getTitleIcon(title.name)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{title.name}</span>
                      </div>
                      <span className="text-xs font-black text-primary bg-primary/5 px-2 py-1 rounded-lg tabular-nums">{title.count}</span>
                    </div>
                  ))}
                  {footballTitles.length === 0 && <div className="col-span-2 text-center text-slate-400 text-xs py-4">سيتم إضافة البطولات قريباً</div>}
                </div>
              </div>

              {/* Basketball Titles */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-1 bg-orange-500 rounded-full"></div>
                   <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">بطولات كرة السلة</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {basketballTitles.map((title) => (
                    <div key={title.id} className="bg-white dark:bg-card-dark p-3 rounded-2xl border border-border-light dark:border-border-dark flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-surface-dark rounded-xl text-orange-500">
                          {getTitleIcon(title.name)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{title.name}</span>
                      </div>
                      <span className="text-xs font-black text-orange-500 bg-orange-500/5 px-2 py-1 rounded-lg tabular-nums">{title.count}</span>
                    </div>
                  ))}
                  {basketballTitles.length === 0 && <div className="col-span-2 text-center text-slate-400 text-xs py-4">سيتم إضافة البطولات قريباً</div>}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div 
              key="timeline-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative space-y-8 pr-4"
            >
              {/* Vertical Line */}
              <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-slate-200 dark:via-border-dark to-transparent"></div>
              
              {historyEvents.map((event) => (
                <div key={event.id} className="relative pr-8 pl-2 text-right">
                  <div className="absolute -right-[11px] top-0 h-6 w-6 rounded-full border-[6px] border-background-light dark:border-background-dark bg-primary shadow-sm z-10"></div>
                  <div className="bg-white dark:bg-card-dark p-5 rounded-3xl border border-border-light dark:border-border-dark shadow-sm hover:border-primary/30 transition-all group">
                     <span className="text-sm font-black text-primary-dark dark:text-primary-light block mb-1">{event.year}</span>
                     <h3 className="text-xs font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tighter group-hover:text-primary transition-colors">{event.title}</h3>
                     <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{event.desc}</p>
                  </div>
                </div>
              ))}
              {historyEvents.length === 0 && <div className="text-center text-slate-400 text-xs py-8">لا توجد أحداث تاريخية مضافة</div>}
            </motion.div>
          )}

          {activeTab === 'stadiums' && (
            <motion.div 
              key="stadiums-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
               {stadiums.map((stadium) => (
                 <div key={stadium.id} className="bg-white dark:bg-card-dark rounded-[32px] overflow-hidden border border-border-light dark:border-border-dark shadow-premium group">
                    <div className="h-40 bg-slate-900 relative overflow-hidden">
                       <img 
                          src={stadium.imageUrl || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000'} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" 
                          alt={stadium.name} 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                       <div className="absolute bottom-4 right-4 left-4 text-right">
                          <span className="text-[8px] font-black text-primary-light bg-primary/20 backdrop-blur-md px-2 py-0.5 rounded-lg border border-primary/30 uppercase tracking-widest mb-1 inline-block">
                             {stadium.type}
                          </span>
                          <h3 className="text-lg font-black text-white leading-tight">{stadium.name}</h3>
                       </div>
                    </div>
                    <div className="p-6 text-right">
                       <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          {stadium.desc}
                       </p>
                    </div>
                 </div>
               ))}
               {stadiums.length === 0 && <div className="text-center text-slate-400 text-xs py-8">لا توجد ملاعب مضافة</div>}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
