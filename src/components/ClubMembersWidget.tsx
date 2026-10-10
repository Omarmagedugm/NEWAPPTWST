import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, Dumbbell, Compass, ArrowLeft, 
  Sparkles, Building2, Calendar, ShieldCheck 
} from 'lucide-react';

export default function ClubMembersWidget({ title }: { title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-[#043927] to-[#022015] border border-primary/30 p-5 sm:p-6 shadow-2xl text-white group"
    >
      {/* Background Glows & Pattern */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-400/30 transition-all duration-700 pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl group-hover:bg-amber-400/25 transition-all duration-700 pointer-events-none" />

      {/* Header Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-black text-amber-300 shadow-sm">
          <ShieldCheck size={14} className="text-amber-400" />
          <span>{title || 'بوابة أعضاء نادي الاتحاد السكندري'}</span>
        </div>
        <span className="text-[9px] font-bold text-emerald-300/80 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
          <Sparkles size={10} className="text-amber-300 animate-pulse" />
          متاحة الآن
        </span>
      </div>

      {/* Title & Description */}
      <div className="relative z-10 space-y-2 mb-4">
        <h3 className="text-lg sm:text-xl font-black text-white leading-tight flex items-center gap-2">
          <span>دليلك الشامل لخدمات وأنشطة الأعضاء</span>
          <Users size={22} className="text-amber-400 shrink-0" />
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-200/90 font-medium leading-relaxed max-w-lg">
          تابع مواعيد الصالات والملاعب الرياضية، الرحلات والمصايف الصيفية، الخدمات الحكومية، وتنبيهات اللجان الرسمية بالنادي.
        </p>
      </div>

      {/* Features Grid Badges */}
      <div className="relative z-10 grid grid-cols-2 gap-2 mb-5">
        <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
            <Dumbbell size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black text-white truncate">الجيم والرياضات</h4>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
            <Compass size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black text-white truncate">رحلات ومصايف</h4>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-400/30">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black text-white truncate">خدمات حكومية</h4>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center shrink-0 border border-purple-400/30">
            <Calendar size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black text-white truncate">لجان وتنبيهات</h4>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="relative z-10 flex items-center justify-end pt-2 border-t border-white/10">
        <Link
          to="/club-members"
          className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 group/btn cursor-pointer"
        >
          <span>دخول بوابة الأعضاء</span>
          <ArrowLeft size={16} className="group-hover/btn:-translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
