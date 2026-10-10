import React from 'react';
import { motion } from 'motion/react';
import { Mail, MessageCircle } from 'lucide-react';

interface AdvertiseWidgetProps {
  backgroundImage?: string;
  backgroundOpacity?: number;
}

export default function AdvertiseWidget({ backgroundImage, backgroundOpacity = 70 }: AdvertiseWidgetProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#065f46] p-5 shadow-xl cinematic-glow group border border-emerald-500/20"
    >
      {/* Optional Background Image with Opacity Control */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
            opacity: backgroundOpacity / 100
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Decorative Elements */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-400/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-400/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
            <span className="px-2.5 py-0.5 bg-yellow-400/20 backdrop-blur-md rounded-full text-[8px] font-black text-yellow-400 uppercase tracking-widest border border-yellow-500/30">
              فرصة إعلانية
            </span>
          </div>
          <h2 className="text-xl font-black text-white leading-tight">
            إعلانك <br /> 
            <span className="text-yellow-400">هنا</span>
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
          <a 
            href="mailto:info@itthadalextv.com" 
            className="h-10 px-5 bg-white text-emerald-900 rounded-xl text-[10px] font-black shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-95 hover:scale-105 active:scale-95 transition-all group/btn"
          >
            <Mail size={12} />
            تواصل بريدياً
          </a>
          <a 
            href="https://wa.me/201278974053" 
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-5 bg-[#25D366] text-white rounded-xl text-[10px] font-black shadow-lg flex items-center justify-center gap-2 hover:bg-opacity-95 hover:scale-105 active:scale-95 transition-all"
          >
            <MessageCircle size={12} />
            واتساب مباشر
          </a>
        </div>
      </div>
    </motion.div>
  );
}
