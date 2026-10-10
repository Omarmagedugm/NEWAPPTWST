import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppStore, PublicService } from '../../store';
import {
  GraduationCap,
  Briefcase,
  Award,
  BookOpen,
  Sparkles,
  Lightbulb,
  ArrowLeft,
  ChevronLeft,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function PublicServicesWidget() {
  const navigate = useNavigate();
  const { services } = useAppStore();

  const activeServices = services
    .filter(s => s.status !== 'hidden')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 4);

  const renderIcon = (iconName: string) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className={iconClass} />;
      case 'Briefcase':
        return <Briefcase className={iconClass} />;
      case 'Award':
        return <Award className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      case 'Lightbulb':
        return <Lightbulb className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>خدمات الجمهور</span>
              <span className="text-emerald-500">💚</span>
            </h2>
            <p className="text-[11px] text-slate-500 font-bold">
              خدمات ومحتوى مجاني نقدمه لجمهور زعيم الثغر
            </p>
          </div>
        </div>

        <Link
          to="/services"
          className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          <span>عرض الكل</span>
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {activeServices.map((service, index) => {
          const isEducation = service.targetType === 'education' || service.id === 'service-education';
          const isAvailable = service.status === 'active';

          return (
            <Link
              key={service.id}
              to={isEducation ? '/services/education' : '/services'}
              className="group bg-white dark:bg-card-dark rounded-2xl p-3.5 border border-slate-200/80 dark:border-border-dark hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {renderIcon(service.icon)}
                </div>

                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    isAvailable
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {service.badge || (isAvailable ? 'متاح' : 'قريباً')}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                  {service.title}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold line-clamp-2 mt-0.5 leading-snug">
                  {service.description}
                </p>
              </div>

              <div className="flex items-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 pt-1 group-hover:translate-x-[-2px] transition-transform">
                <span>{isEducation ? 'تصفح الكورسات' : 'التفاصيل'}</span>
                <ChevronLeft className="w-3 h-3 mr-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
