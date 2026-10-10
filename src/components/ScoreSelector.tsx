import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

interface ScoreSelectorProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
}

export default function ScoreSelector({ value, onChange, label, min = 0, max = 15 }: ScoreSelectorProps) {
  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>}
      <div className="flex flex-col items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); increment(); }}
          className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-colors"
        >
          <ChevronUp size={20} />
        </motion.button>
        
        <div className="w-16 h-16 glass-card border-2 border-primary/20 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-800 dark:text-white shadow-inner">
          {value}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); decrement(); }}
          className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-colors"
        >
          <ChevronDown size={20} />
        </motion.button>
      </div>
    </div>
  );
}
