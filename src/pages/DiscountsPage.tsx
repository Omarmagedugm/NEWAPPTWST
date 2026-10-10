import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, ArrowRight, Percent, MapPin, Phone, Filter, ShieldAlert,
  ChevronLeft, Star, Compass, Sparkles, X, RotateCcw, Tag
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore, MemberDiscount } from '../store';

export function getHighestDiscountPercentage(text: string): number {
  if (!text) return 0;
  // Convert Arabic numerals to Western numerals
  const normalized = text.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  const percentMatches = normalized.match(/(\d+(?:\.\d+)?)\s*[%٪]/g);
  let max = 0;
  if (percentMatches) {
    for (const match of percentMatches) {
      const num = parseFloat(match.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > max) max = num;
    }
  }
  if (max === 0) {
    const discountMatches = normalized.match(/خصم\s*(\d+(?:\.\d+)?)/gi);
    if (discountMatches) {
      for (const match of discountMatches) {
        const num = parseFloat(match.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > max) max = num;
      }
    }
  }
  return max;
}

export function getCategoryBadge(cat: string) {
  if (cat.includes('مستشفيات')) return { icon: '🏥', label: 'مستشفيات', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  if (cat.includes('عيادات')) return { icon: '🩺', label: 'عيادات', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' };
  if (cat.includes('معامل')) return { icon: '🧪', label: 'معامل وتحاليل', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
  if (cat.includes('أسنان')) return { icon: '🦷', label: 'أسنان', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' };
  if (cat.includes('بصريات')) return { icon: '👓', label: 'بصريات', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' };
  if (cat.includes('علاج طبيعي')) return { icon: '💆', label: 'علاج طبيعي وتأهيل', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
  if (cat.includes('أطباء') || cat.includes('طبيب')) return { icon: '❤️', label: 'أطباء وتخصصات', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
  if (cat.includes('أجهزة') || cat.includes('خدمات طبية')) return { icon: '💊', label: 'أجهزة وخدمات طبية', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
  if (cat.includes('تجميل')) return { icon: '✨', label: 'تجميل', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' };
  if (cat.includes('مراكز')) return { icon: '🏢', label: 'مراكز طبية', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' };
  return { icon: '📋', label: cat || 'أخرى', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' };
}

const CATEGORIES_FILTER = [
  { id: 'all', name: 'الكل', icon: '🌟' },
  { id: 'مستشفيات', name: 'مستشفيات', icon: '🏥' },
  { id: 'عيادات', name: 'عيادات', icon: '🩺' },
  { id: 'معامل وتحاليل', name: 'معامل وتحاليل', icon: '🧪' },
  { id: 'أسنان', name: 'أسنان', icon: '🦷' },
  { id: 'بصريات', name: 'بصريات', icon: '👓' },
  { id: 'علاج طبيعي وتأهيل', name: 'علاج طبيعي وتأهيل', icon: '💆' },
  { id: 'أطباء وتخصصات', name: 'أطباء وتخصصات', icon: '❤️' },
  { id: 'أجهزة وخدمات طبية', name: 'أجهزة وخدمات طبية', icon: '💊' },
  { id: 'تجميل', name: 'تجميل', icon: '✨' },
  { id: 'مراكز طبية', name: 'مراكز طبية', icon: '🏢' },
  { id: 'أخرى', name: 'أخرى', icon: '📋' },
];

const LOCATIONS_FILTER = [
  'جميع المناطق',
  'سموحة',
  'سيدي جابر',
  'محطة الرمل',
  'محرم بك',
  'ميامي',
  'سيدي بشر',
  'الإبراهيمية',
  'جليم',
  'لوران',
  'جناكليس',
  'رشدي',
  'سبورتنج',
  'كليوباترا',
  'زيزينيا',
  'البيطاش',
  'برج العرب',
  'كامب شيزار',
  'أخرى'
];

export default function DiscountsPage() {
  const navigate = useNavigate();
  const { memberDiscounts } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('جميع المناطق');
  const [sortBy, setSortBy] = useState<'default' | 'highest_discount' | 'alphabetical'>('default');

  // Source discounts list
  const sourceList = useMemo(() => {
    if (memberDiscounts && memberDiscounts.length > 0) {
      return memberDiscounts.filter(d => d.active !== false);
    }
    return [];
  }, [memberDiscounts]);

  // Filtered and Sorted list
  const filteredDiscounts = useMemo(() => {
    return sourceList.filter(item => {
      // Search match
      const q = searchQuery.trim().toLowerCase();
      const matchQuery = !q || 
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.discountDetails.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q));

      // Category match
      let matchCategory = true;
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'أطباء وتخصصات') {
          matchCategory = item.category.includes('أطباء') || item.category.includes('طبيب');
        } else if (selectedCategory === 'أجهزة وخدمات طبية') {
          matchCategory = item.category.includes('أجهزة') || item.category.includes('خدمات طبية');
        } else if (selectedCategory === 'أخرى') {
          const knownCats = ['مستشفيات', 'عيادات', 'معامل', 'أسنان', 'بصريات', 'علاج طبيعي', 'أطباء', 'أجهزة', 'تجميل', 'مراكز'];
          matchCategory = !knownCats.some(kc => item.category.includes(kc));
        } else {
          matchCategory = item.category.includes(selectedCategory);
        }
      }

      // Location match
      let matchLoc = true;
      if (selectedLocation !== 'جميع المناطق') {
        if (selectedLocation === 'أخرى') {
          const knownLocs = ['سموحه', 'سموحة', 'سيدي جابر', 'سيدى جابر', 'محطة الرمل', 'محرم بك', 'ميامي', 'سيدي بشر', 'سيدى بشر', 'الإبراهيمية', 'الابراهيمية', 'جليم', 'لوران', 'جناكليس', 'جانكليس', 'رشدي', 'رشدى', 'سبورتنج', 'كليوباترا', 'زيزينيا', 'البيطاش', 'برج العرب', 'كامب شيزار'];
          const combined = (item.address + ' ' + (item.location || '')).toLowerCase();
          matchLoc = !knownLocs.some(kl => combined.includes(kl.toLowerCase()));
        } else {
          const searchLoc = selectedLocation.replace('ة', 'ه').toLowerCase();
          const altLoc = selectedLocation.replace('ه', 'ة').toLowerCase();
          const combined = (item.address + ' ' + (item.location || '')).toLowerCase();
          matchLoc = combined.includes(selectedLocation.toLowerCase()) || combined.includes(searchLoc) || combined.includes(altLoc);
        }
      }

      return matchQuery && matchCategory && matchLoc;
    }).sort((a, b) => {
      if (sortBy === 'highest_discount') {
        const percA = getHighestDiscountPercentage(a.discountDetails);
        const percB = getHighestDiscountPercentage(b.discountDetails);
        return percB - percA;
      }
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name, 'ar');
      }
      // default: featured first, then original order
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [sourceList, searchQuery, selectedCategory, selectedLocation, sortBy]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('جميع المناطق');
    setSortBy('default');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-right" dir="rtl">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white pt-5 pb-6 px-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              onClick={() => navigate('/club-members')}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/15"
              aria-label="رجوع"
            >
              <ArrowRight size={20} />
            </button>
            
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-1.5">
                <Percent size={20} className="text-amber-300" />
                <h1 className="text-lg font-black tracking-tight text-white">الخصومات</h1>
              </div>
              <p className="text-[11px] font-medium text-emerald-100/80">المزايا والخصومات المتاحة لأعضاء النادي</p>
            </div>

            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Sparkles size={18} />
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mt-2">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-200/70 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مستشفى، عيادة، معمل، أو طبيب..."
              className="w-full bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl py-2.5 pr-10 pl-9 text-xs text-white placeholder-emerald-100/60 focus:outline-none focus:ring-2 focus:ring-amber-300/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* Medical / Service Disclaimer Banner */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-[11px] text-amber-700 dark:text-amber-300">تنويه هام للأعضاء:</span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
              هذه الخدمة استرشادية فقط لأعضاء نادي الاتحاد السكندري. لا تقدم المنصة أي توصيات طبية ولا تقيم جودة الخدمات الطبية.
            </p>
          </div>
        </div>

        {/* Categories Horizontal Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Tag size={14} className="text-primary" /> التخصص / الفئة
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              {filteredDiscounts.length} جهة
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {CATEGORIES_FILTER.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-sm scale-[1.02]'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500/30'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Sort Controls Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            {/* Location Selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Compass size={12} className="text-emerald-600" /> المنطقة / الحي:
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LOCATIONS_FILTER.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-36 shrink-0">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Filter size={12} className="text-emerald-600" /> الترتيب:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="default">الافتراضي (المميز أولاً)</option>
                <option value="highest_discount">الأعلى خصمًا %</option>
                <option value="alphabetical">أبجديًا (أ - ي)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {(selectedCategory !== 'all' || selectedLocation !== 'جميع المناطق' || searchQuery || sortBy !== 'default') && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-500 font-medium">الفلاتر المطبقة</span>
              <button
                onClick={handleResetFilters}
                className="text-primary hover:text-emerald-600 font-bold flex items-center gap-1 text-[10px]"
              >
                <RotateCcw size={12} /> إعادة ضبط
              </button>
            </div>
          )}
        </div>

        {/* Discounts Providers List Grid */}
        {filteredDiscounts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm my-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Search size={28} />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">لم نجد نتائج مطابقة</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs mx-auto">
              جرب البحث بكلمات مختلفة أو تغيير التخصص أو المنطقة
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-all inline-flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> عرض جميع الخصومات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredDiscounts.map((item) => {
              const badge = getCategoryBadge(item.category);
              const maxPerc = getHighestDiscountPercentage(item.discountDetails);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                >
                  {/* Top Bar: Category Badge & Featured Tag */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.featured && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900 flex items-center gap-1 shadow-sm">
                          <Star size={10} className="fill-slate-900" /> مميز
                        </span>
                      )}
                      {maxPerc > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-sm">
                          حتى {maxPerc}٪
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Provider Name */}
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>

                  {/* Discount Offer Highlight Box */}
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl p-2.5 mb-3 text-xs text-emerald-900 dark:text-emerald-200 font-bold leading-relaxed flex items-start gap-2">
                    <Percent size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-bold">{item.discountDetails}</span>
                  </div>

                  {/* Address & Location */}
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-3">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">
                        {item.address}
                      </span>
                    </div>

                    {item.phoneNumbers && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr text-right">
                          {item.phoneNumbers}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                      <Compass size={12} /> {item.location || 'الإسكندرية'}
                    </span>

                    <button
                      onClick={() => navigate(`/club-members/discounts/${item.id}`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white dark:hover:bg-primary text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>عرض التفاصيل والاتصال</span>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
