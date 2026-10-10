import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, MapPin, Users, ChevronLeft, Sparkles, Filter } from 'lucide-react';
import { WorldCountry } from '../../types/worldFans';
import { CountryFlag } from './CountryFlag';
import { useAppStore } from '../../store';

interface WorldCountryMapGridProps {
  countries: WorldCountry[];
  selectedCountryId: string | null;
  onSelectCountry: (id: string | null) => void;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

const REGIONS = [
  { id: 'all', name: 'جميع القارات 🌍' },
  { id: 'gulf', name: 'الخليج العربي 🇸🇦' },
  { id: 'europe', name: 'أوروبا 🇪🇺' },
  { id: 'north_america', name: 'أمريكا الشمالية 🇺🇸' },
  { id: 'asia', name: 'شرق آسيا والقارة 🌏' },
  { id: 'africa', name: 'إفريقيا 🌍' },
];

export const WorldCountryMapGrid: React.FC<WorldCountryMapGridProps> = ({
  countries,
  selectedCountryId,
  onSelectCountry,
  selectedRegion,
  onSelectRegion,
}) => {
  const { worldGroups } = useAppStore();
  const activeCountries = countries.filter(c => c.active !== false);

  const filteredCountries = activeCountries.filter(c => {
    if (selectedRegion === 'all') return true;
    return c.region === selectedRegion;
  });

  return (
    <div className="mb-8">
      {/* Section Title & Region Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Globe size={18} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-white">
              خريطة تواجد الاتحاداوية حول العالم
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              اختر القارة أو الدولة لتصفح الروابط والتجمعات الخاصة بها
            </p>
          </div>
        </div>

        {selectedCountryId && (
          <button
            onClick={() => onSelectCountry(null)}
            className="self-start sm:self-auto px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20 flex items-center gap-1"
          >
            <span>عرض كل الدول</span>
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Region Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
        {REGIONS.map((region) => {
          const isSelected = selectedRegion === region.id;
          return (
            <button
              key={region.id}
              onClick={() => {
                onSelectRegion(region.id);
                onSelectCountry(null);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60'
              }`}
            >
              <span>{region.name}</span>
            </button>
          );
        })}
      </div>

      {/* Countries Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredCountries.map((country) => {
          const isSelected = selectedCountryId === country.id;
          const countryGroups = (worldGroups || []).filter(
            g => (g.countryId === country.id || g.countryName === country.name || g.countryName === country.nameAr) && g.active !== false
          );
          const actualGroupsCount = countryGroups.length;
          const countryMembers = countryGroups.reduce((acc, g) => acc + (Number(g.memberCount) || 0), 0);
          const displayFans = countryMembers > 0 ? countryMembers : (Number(country.fanCount) || 0);

          return (
            <motion.div
              key={country.id}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectCountry(isSelected ? null : country.id)}
              className={`relative p-3.5 rounded-2xl cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-emerald-500 shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400'
                  : 'bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/40 shadow-sm'
              }`}
            >
              {country.featured && (
                <span className="absolute top-2 left-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <CountryFlag
                  countryCode={country.id}
                  flag={country.flag}
                  countryName={country.name || country.nameAr}
                  size="lg"
                  className="shadow-sm"
                />
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {actualGroupsCount > 0 ? `${actualGroupsCount} رابطة` : 'تجمع جماهيري'}
                </span>
              </div>

              <h4 className="text-xs font-black line-clamp-1 mb-1">
                {country.name || country.nameAr}
              </h4>
              <p
                className={`text-[10px] font-semibold line-clamp-1 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {country.nameEn || country.name}
              </p>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[10px] font-bold">
                <span className={isSelected ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}>
                  الجمهور التقديري
                </span>
                <span className={`font-black ${isSelected ? 'text-amber-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {displayFans > 0 ? displayFans.toLocaleString('ar-EG') : '0'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
