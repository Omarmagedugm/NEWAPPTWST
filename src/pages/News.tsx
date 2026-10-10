import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rss, 
  SlidersHorizontal, 
  ChevronRight, 
  Play, 
  Newspaper, 
  PenTool, 
  FileText,
  User
} from 'lucide-react';
import { getOptimizedImage } from '../lib/cloudinary';

export default function News() {
  const { news } = useAppStore();
  const [selectedType, setSelectedType] = useState<'all' | 'news' | 'article'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const filteredNews = useMemo(() => {
    return news.filter(item => {
      // Type filter
      if (selectedType === 'news' && item.newsType === 'article') return false;
      if (selectedType === 'article' && item.newsType !== 'article') return false;
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      return true;
    });
  }, [news, selectedType, selectedCategory]);

  const featured = filteredNews[0];
  const otherNews = filteredNews.slice(1);

  // Available categories from current filtered type
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    news.forEach(n => {
      if (selectedType === 'all' || (selectedType === 'article' ? n.newsType === 'article' : n.newsType !== 'article')) {
        if (n.category) cats.add(n.category);
      }
    });
    return Array.from(cats);
  }, [news, selectedType]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  } as const;

  return (
    <div className="flex-1 w-full max-w-md md:max-w-6xl lg:max-w-7xl mx-auto flex flex-col pb-32 md:pb-16 px-0 md:px-6 bg-background-light dark:bg-background-dark min-h-screen">
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-x-hidden p-4 md:p-0 flex flex-col gap-6 pt-4"
      >
        {/* Main Classification Tabs: الكل | الأخبار | المقالات */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-card-dark rounded-2xl border border-slate-200/50 dark:border-border-dark/60 w-fit">
              <button
                onClick={() => { setSelectedType('all'); setSelectedCategory('all'); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedType === 'all'
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white'
                }`}
              >
                <span>الكل</span>
                <span className="text-[10px] opacity-80">({news.length})</span>
              </button>

              <button
                onClick={() => { setSelectedType('news'); setSelectedCategory('all'); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedType === 'news'
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white'
                }`}
              >
                <Newspaper size={14} />
                <span>الأخبار</span>
                <span className="text-[10px] opacity-80">
                  ({news.filter(n => n.newsType !== 'article').length})
                </span>
              </button>

              <button
                onClick={() => { setSelectedType('article'); setSelectedCategory('all'); }}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedType === 'article'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-white'
                }`}
              >
                <PenTool size={13} />
                <span>المقالات والآراء</span>
                <span className="text-[10px] opacity-80">
                  ({news.filter(n => n.newsType === 'article').length})
                </span>
              </button>
            </div>
          </div>

          {/* Sub Categories if available */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                كافة التصنيفات
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          {/* Featured News / Article Hero */}
          <AnimatePresence mode="wait">
            {featured && (
              <motion.section 
                key={featured.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                variants={itemVariants} 
                className="w-full"
              >
                <Link to={`/news/${featured.id}`} className="group relative block w-full overflow-hidden rounded-[40px] bg-white dark:bg-surface-dark shadow-premium hover:shadow-2xl transition-all duration-500 border border-border-light dark:border-border-dark cinematic-glow">
                  <div className="aspect-[16/10] w-full relative overflow-hidden">
                    <img 
                      src={getOptimizedImage(featured.image, 800)} 
                      alt={featured.title} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                    
                    <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap max-w-[85%]">
                      {/* News Type Badge */}
                      {featured.newsType === 'article' ? (
                        <div className="px-3 py-1 bg-amber-500/95 backdrop-blur-md rounded-xl text-[10px] font-black text-white flex items-center gap-1.5 shadow-premium">
                          <PenTool size={11} />
                          <span>مقال رأي</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-accent rounded-xl text-[9px] font-black text-white shadow-glow tracking-tighter">
                          خبر مميز
                        </div>
                      )}

                      {featured.videoUrl && (
                        <div className="px-3 py-1 bg-red-600/90 backdrop-blur-md rounded-xl text-[9px] font-black text-white flex items-center gap-1.5 shadow-premium">
                          <Play size={11} className="fill-current" />
                          <span>فيديو</span>
                        </div>
                      )}

                      {featured.category && (
                        <div className="px-3 py-1 bg-primary/90 backdrop-blur-md rounded-xl text-[9px] font-black text-white shadow-premium">
                          {featured.category}
                        </div>
                      )}

                      {featured.type === 'rss' && !featured.category && (
                        <div className="px-3 py-1 bg-orange-500 rounded-xl text-[9px] font-black text-white flex items-center gap-2 shadow-premium">
                          <Rss size={10} strokeWidth={3} /> RSS
                        </div>
                      )}

                      {featured.tagIds?.map(tagId => {
                        const tagObj = useAppStore.getState().newsTags?.find(t => t.id === tagId);
                        if (!tagObj) return null;
                        return (
                          <div key={tagObj.id} className="px-3 py-1 rounded-xl text-[9px] font-black text-white shadow-premium" style={{ backgroundColor: tagObj.color }}>
                            {tagObj.name}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="absolute bottom-6 left-6 right-6 z-20">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[9px] font-black text-white uppercase tracking-widest">
                          <span className="material-symbols-outlined !text-[12px]">schedule</span>
                          {formatDistanceToNow(new Date(featured.date), { locale: ar, addSuffix: true })}
                        </div>

                        {(featured.author || featured.editorName) && (
                          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] font-black text-white">
                            <User size={11} className="text-amber-400" />
                            <span>{featured.newsType === 'article' ? `بقلم: ${featured.author || featured.editorName}` : (featured.editorName || featured.author)}</span>
                          </div>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-2xl group-hover:text-accent transition-colors duration-300">
                        {featured.title}
                      </h2>
                    </div>
                  </div>
                </Link>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Side List - Trending Feed */}
          {filteredNews.length > 1 && (
            <motion.section variants={itemVariants}>
               <div className="glass-card p-6 rounded-[32px] shadow-premium">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-black flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-tight">
                      <span className="w-1.5 h-4 bg-primary rounded-full"></span> 
                      {selectedType === 'article' ? 'أحدث المقالات والتحليلات' : 'الأكثر قراءة الآن'}
                    </h3>
                    <SlidersHorizontal size={16} className="text-slate-300" />
                  </div>
                  <div className="flex flex-col gap-6">
                    {filteredNews.slice(1, 4).map((item, i) => (
                      <Link to={`/news/${item.id}`} key={item.id} className="group flex gap-4 items-center border-b border-border-light/40 dark:border-border-dark/40 pb-6 last:border-0 last:pb-0 pressable relative">
                        <div className="text-3xl font-black text-slate-100 dark:text-slate-800 italic group-hover:text-primary transition-colors duration-500">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                             {item.newsType === 'article' && (
                               <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 mt-0.5 border border-amber-500/20">
                                 مقال
                               </span>
                             )}
                             <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                              {item.title}
                             </h4>
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                             <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                              {formatDistanceToNow(new Date(item.date), { locale: ar, addSuffix: true })}
                             </span>
                             {(item.author || item.editorName) && (
                               <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">
                                 <User size={10} className="text-slate-400" />
                                 {item.newsType === 'article' ? `بقلم: ${item.author || item.editorName}` : (item.editorName || item.author)}
                                </span>
                             )}
                             {item.type === 'rss' && (
                               <div className="flex items-center gap-1 text-[10px] text-orange-400 font-black">
                                 <Rss size={10} strokeWidth={3} />
                                 NEWS
                               </div>
                             )}
                             {item.tagIds?.map(tagId => {
                               const tagObj = useAppStore.getState().newsTags?.find(t => t.id === tagId);
                               if (!tagObj) return null;
                               return (
                                 <span key={tagObj.id} className="text-[9px] font-black px-2 py-0.5 rounded-md text-white shadow-sm" style={{ backgroundColor: tagObj.color }}>
                                   {tagObj.name}
                                 </span>
                               );
                             })}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
               </div>
            </motion.section>
          )}

          {/* All News Grid */}
          <motion.section variants={itemVariants} className="space-y-6">
            <div className="flex flex-col px-1">
              <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none uppercase">
                {selectedType === 'article' ? 'قسم المقالات والآراء' : selectedType === 'news' ? 'البث الإخباري' : 'جميع المنشورات'}
              </h2>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                {selectedType === 'article' ? 'Articles & Editorial Columns' : 'Journalism Feed'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {otherNews.map((item) => (
                <Link to={`/news/${item.id}`} key={item.id} className="group flex flex-row md:flex-col gap-4 bg-white dark:bg-surface-dark rounded-[28px] overflow-hidden border border-border-light/40 dark:border-border-dark/40 shadow-premium hover:shadow-2xl transition-all duration-300 p-2.5 md:p-3.5">
                  <div className="w-[110px] h-[110px] md:w-full md:aspect-[16/10] md:h-auto overflow-hidden relative rounded-2xl flex-shrink-0">
                    <img 
                      src={getOptimizedImage(item.image, 400)} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer" 
                    />
                    
                    {/* Top Badges on Card */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                      {item.newsType === 'article' ? (
                        <div className="bg-amber-500 text-white backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm text-[8px] font-black">
                          <PenTool size={9} />
                          <span>مقال</span>
                        </div>
                      ) : null}
                      
                      {item.videoUrl && (
                        <div className="bg-red-600/90 text-white backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm text-[8px] font-black">
                          <Play size={9} className="fill-current" />
                          <span>فيديو</span>
                        </div>
                      )}
                    </div>

                    {item.type === 'rss' && (
                       <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm text-white">
                          <Rss size={8} className="text-orange-400" />
                          <span className="text-[8px] font-black tracking-tighter">FEED</span>
                       </div>
                    )}
                  </div>

                  <div className="py-2 pl-2 md:p-0 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex flex-col gap-1.5 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                              {item.category || 'نادي الاتحاد'}
                            </span>
                            {item.tagIds?.map(tagId => {
                              const tagObj = useAppStore.getState().newsTags?.find(t => t.id === tagId);
                              if (!tagObj) return null;
                              return (
                                <span key={tagObj.id} className="text-[8px] font-black px-1.5 py-0.5 rounded text-white shadow-sm" style={{ backgroundColor: tagObj.color }}>
                                  {tagObj.name}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[12px]">schedule</span>
                            {formatDistanceToNow(new Date(item.date), { locale: ar, addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>

                      {(item.author || item.editorName) && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                          <User size={11} className="text-slate-400" />
                          <span>{item.newsType === 'article' ? `بقلم: ${item.author || item.editorName}` : (item.editorName || item.author)}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end mt-2 md:mt-4">
                       <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                         <span>{item.newsType === 'article' ? 'قراءة المقال' : 'عرض الخبر'}</span>
                         <ChevronRight size={10} strokeWidth={3} className="rotate-180" />
                       </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {filteredNews.length === 0 && (
                <div className="w-full col-span-full py-20 flex flex-col items-center justify-center glass-card rounded-[40px] border-dashed border-2 border-slate-200 dark:border-border-dark text-slate-400">
                  <span className="material-symbols-outlined !text-4xl mb-4 opacity-20">news_off</span>
                  <span className="font-bold text-sm">لا توجد عناصر متاحة في هذا التصنيف</span>
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </motion.main>
    </div>
  );
}
