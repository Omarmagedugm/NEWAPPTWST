import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Building2, Store, MapPin, ArrowLeft, Plus, Star } from 'lucide-react';

export default function BusinessWidget({ title }: { title?: string }) {
  const navigate = useNavigate();
  const { businesses } = useAppStore();

  const approvedBusinesses = businesses.filter(b => b.status === 'approved');
  const featuredBusinesses = approvedBusinesses.filter(b => b.featured);
  const displayList = featuredBusinesses.length > 0 ? featuredBusinesses.slice(0, 4) : approvedBusinesses.slice(0, 4);

  return (
    <div className="bg-white dark:bg-card-dark rounded-3xl p-5 border border-slate-200/80 dark:border-border-dark shadow-lg space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-inner">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{title || 'اتحاداوي بيزنس'}</span>
              <span className="text-xs text-emerald-600 font-bold">💚</span>
            </h2>
            <p className="text-[11px] font-bold text-slate-400">
              دليل مشروعات وأعمال جمهور زعيم الثغر
            </p>
          </div>
        </div>

        <Link
          to="/business"
          className="text-xs font-black text-primary hover:text-primary-dark transition-colors flex items-center gap-1 group"
        >
          <span>عرض الكل ({approvedBusinesses.length})</span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Grid or Horizontal Cards */}
      {displayList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayList.map((bus) => (
            <div
              key={bus.id}
              onClick={() => navigate(`/business/${bus.id}`)}
              className="bg-slate-50 dark:bg-surface-dark rounded-2xl p-2.5 border border-slate-100 dark:border-border-dark/60 hover:border-emerald-500/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-24 w-full rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-2">
                  <img
                    src={bus.coverImage}
                    alt={bus.businessName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {bus.featured && (
                    <div className="absolute top-1 right-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                      ⭐
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    {bus.category}
                  </div>
                </div>

                <h3 className="font-black text-xs text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                  {bus.businessName}
                </h3>
              </div>

              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1 truncate">
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{bus.address}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center bg-slate-50 dark:bg-surface-dark rounded-2xl border border-dashed border-slate-200 dark:border-border-dark space-y-2">
          <Store className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">
            كن أول من يضيف مشروعه في دليل اتحاداوي بيزنس!
          </p>
        </div>
      )}

      {/* Widget Footer CTA */}
      <div className="pt-1 flex items-center gap-2">
        <button
          onClick={() => navigate('/business')}
          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-primary hover:from-emerald-700 hover:to-primary-dark text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>أضف مشروعك أو محلك مجاناً</span>
        </button>
      </div>
    </div>
  );
}
