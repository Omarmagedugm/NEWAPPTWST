import React from 'react';
import { motion } from 'motion/react';
import { Ticket, ArrowRight, ExternalLink } from 'lucide-react';

interface TicketsWidgetProps {
  title?: string;
  link?: string;
}

export default function TicketsWidget({ title, link }: TicketsWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-700 via-[#064e3b] to-[#047857] p-5 shadow-xl border border-emerald-500/20 group"
    >
      {/* Background Decorative Rings */}
      <div className="absolute -top-12 -right-12 w-40 h-40 border-[20px] border-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-1000"></div>
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
      
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white shadow-lg shadow-yellow-500/30 group-hover:rotate-12 transition-transform duration-500">
            <Ticket size={28} strokeWidth={2.5} className="drop-shadow-md" />
          </div>
          
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg font-black text-white italic leading-tight">
              {title || "تذاكر المباراة متاحة الآن"}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,1)]"></span>
              احجز مقعدك الآن
            </div>
          </div>
        </div>

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-emerald-900 transition-all duration-300 shadow-xl group/btn"
          >
            <ExternalLink size={20} className="group-hover/btn:scale-110 transition-transform" />
          </a>
        ) : (
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
            <Ticket size={18} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            whileInView={{ width: '70%' }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
          />
        </div>
        <span className="text-[10px] font-black text-white/60">نفاد تدريجي</span>
      </div>
    </motion.div>
  );
}
