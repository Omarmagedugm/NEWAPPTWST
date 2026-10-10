import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio, Volume2, Sparkles, Disc, Waves, Mic } from 'lucide-react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  coverUrl?: string;
  title?: string;
  presenter?: string;
  frequency?: string;
  volume?: number;
  isMuted?: boolean;
}

export default function AudioVisualizer({
  isPlaying,
  coverUrl,
  title,
  presenter,
  frequency = '90.5 FM',
  volume = 0.9,
  isMuted = false,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<'bars' | 'wave' | 'combined'>('combined');
  const animFrameId = useRef<number | null>(null);

  // Bars physics state
  const barCount = 42;
  const barsData = useRef<number[]>(new Array(barCount).fill(5));
  const peaksData = useRef<number[]>(new Array(barCount).fill(5));
  const peakHold = useRef<number[]>(new Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Current effective volume multiplier
      const effectiveVol = isMuted ? 0 : volume;

      // Update frequency bars with smooth rhythmic audio simulation
      for (let i = 0; i < barCount; i++) {
        if (isPlaying && effectiveVol > 0) {
          // Dynamic frequency calculation combining sine waves, harmonics and random jitter
          const harmonic1 = Math.sin(t * 0.08 + i * 0.25);
          const harmonic2 = Math.cos(t * 0.05 + i * 0.15);
          const harmonic3 = Math.sin(t * 0.12 - i * 0.1);
          const jitter = Math.random() * 0.3;
          
          // Frequency curve: bass is higher in middle/low, smooth roll-off
          const bellCurve = Math.sin((i / (barCount - 1)) * Math.PI);
          const raw = (harmonic1 * 0.4 + harmonic2 * 0.3 + harmonic3 * 0.2 + jitter + 0.9) * 0.5;
          const targetHeight = Math.max(8, raw * (height * 0.82) * bellCurve * effectiveVol + Math.random() * 6);
          
          // Smooth transition to target
          barsData.current[i] += (targetHeight - barsData.current[i]) * 0.25;
        } else {
          // Fall down to baseline
          barsData.current[i] += (4 - barsData.current[i]) * 0.15;
        }

        // Peak drop physics
        if (barsData.current[i] >= peaksData.current[i]) {
          peaksData.current[i] = barsData.current[i];
          peakHold.current[i] = 12; // hold peak frames
        } else {
          if (peakHold.current[i] > 0) {
            peakHold.current[i]--;
          } else {
            peaksData.current[i] = Math.max(4, peaksData.current[i] - 1.8);
          }
        }
      }

      // 1. Draw Waveform or Combined Glow Background
      if (visualizerMode === 'wave' || visualizerMode === 'combined') {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        const gradientWave = ctx.createLinearGradient(0, 0, width, 0);
        gradientWave.addColorStop(0, 'rgba(16, 185, 129, 0.1)');
        gradientWave.addColorStop(0.3, 'rgba(52, 211, 153, 0.8)');
        gradientWave.addColorStop(0.5, 'rgba(16, 185, 129, 1)');
        gradientWave.addColorStop(0.7, 'rgba(52, 211, 153, 0.8)');
        gradientWave.addColorStop(1, 'rgba(16, 185, 129, 0.1)');
        ctx.strokeStyle = gradientWave;

        const sliceWidth = width / barCount;
        let x = 0;

        for (let i = 0; i < barCount; i++) {
          const v = barsData.current[i] / height;
          const waveHeight = isPlaying ? Math.sin(t * 0.1 + i * 0.3) * (barsData.current[i] * 0.35) : 0;
          const y = height / 2 - waveHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        // Wave fill reflection
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        const fillGrad = ctx.createLinearGradient(0, height / 2, 0, height);
        fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
        fillGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }

      // 2. Draw Frequency Spectrum Bars
      if (visualizerMode === 'bars' || visualizerMode === 'combined') {
        const barWidth = Math.max(3, (width / barCount) - 3.5);
        const gap = (width - (barWidth * barCount)) / (barCount - 1);

        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.max(3, barsData.current[i]);
          const x = i * (barWidth + gap);
          const y = height - barHeight;

          // Bar Gradient: Emerald green -> Light lime -> Gold peak
          const barGrad = ctx.createLinearGradient(0, height, 0, y);
          barGrad.addColorStop(0, 'rgba(5, 150, 105, 0.95)');
          barGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.95)');
          barGrad.addColorStop(0.85, 'rgba(52, 211, 153, 1)');
          barGrad.addColorStop(1, 'rgba(251, 191, 36, 1)');

          ctx.fillStyle = barGrad;
          
          // Draw rounded bar
          const radius = Math.min(barWidth / 2, 3);
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, height);
          ctx.lineTo(x, height);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();

          // Draw floating peak indicator cap
          const peakY = height - Math.max(barHeight + 2, peaksData.current[i]);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
          ctx.fillRect(x, peakY, barWidth, 2.5);
        }
      }

      t++;
      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isPlaying, visualizerMode, volume, isMuted]);

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white select-none overflow-hidden">
      
      {/* Background Ambience / Glow */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 blur-xl scale-110 pointer-events-none"
        style={{ backgroundImage: `url(${coverUrl || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1000'})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/90 pointer-events-none" />

      {/* Top Status & Mode Badges */}
      <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{isPlaying ? 'جاري البث الصوتي الحي 🎙️' : 'البث متوقف'}</span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-emerald-300">
            <Radio size={12} />
            {frequency} STEREO
          </span>
        </div>

        {/* Visualizer Mode Switcher */}
        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 text-[11px]">
          <button
            onClick={() => setVisualizerMode('combined')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              visualizerMode === 'combined' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            استوديو احترافي
          </button>
          <button
            onClick={() => setVisualizerMode('bars')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              visualizerMode === 'bars' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            أعمدة التردد
          </button>
          <button
            onClick={() => setVisualizerMode('wave')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              visualizerMode === 'wave' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            الموجة الصوتية
          </button>
        </div>
      </div>

      {/* Center Turntable & Animated Sonic Wave Rings */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-3">
        
        {/* Pulsating Sonic Rings around Vinyl */}
        <div className="relative flex items-center justify-center">
          {isPlaying && (
            <>
              <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-emerald-500/20 animate-ping pointer-events-none" />
              <div className="absolute w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-emerald-400/15 animate-pulse pointer-events-none" />
              <div className="absolute w-60 h-60 sm:w-72 sm:h-72 rounded-full border border-emerald-500/10 pointer-events-none" />
            </>
          )}

          {/* Vinyl Disc */}
          <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-emerald-500/40 p-1.5 shadow-2xl shadow-emerald-500/30 bg-slate-900 relative transition-transform ${
            isPlaying ? 'animate-spin-slow scale-105' : 'scale-100 opacity-90'
          }`}>
            <img 
              src={coverUrl || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1000'}
              alt={title || 'إذاعة زعيم الثغر'}
              className="w-full h-full object-cover rounded-full"
            />
            {/* Center Spindle & Disc Hole */}
            <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 border-2 border-emerald-400 rounded-full flex items-center justify-center shadow-lg">
              <Disc size={18} className={`text-emerald-400 ${isPlaying ? 'animate-spin' : ''}`} />
            </div>
          </div>
        </div>

        {/* Station info text */}
        <div className="text-center mt-3 space-y-0.5 max-w-md px-2">
          <h3 className="text-base sm:text-lg font-black text-white line-clamp-1">
            {title || 'إذاعة صوت زعيم الثغر'}
          </h3>
          <p className="text-xs text-slate-300 font-medium line-clamp-1">
            {presenter || 'طاقم الإذاعة ونخبة نجوم الاتحاد السكندري'}
          </p>
        </div>

        {/* Live Audio Quality Meters */}
        <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-slate-400 bg-black/30 px-3 py-1 rounded-full border border-white/5">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Sparkles size={11} />
            48.0 kHz HD AUDIO
          </span>
          <span>•</span>
          <span className="text-slate-300">320 kbps STEREO</span>
          <span>•</span>
          <span className="text-emerald-300">{frequency}</span>
        </div>
      </div>

      {/* Bottom Spectrum Canvas Visualizer */}
      <div className="relative z-10 w-full h-24 sm:h-28 mt-auto">
        <canvas
          ref={canvasRef}
          width={640}
          height={110}
          className="w-full h-full block"
        />

        {/* Subtle Frequency Scale line below */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-1 border-t border-white/5">
          <span>20 Hz (Sub-bass)</span>
          <span>250 Hz (Bass)</span>
          <span>1 kHz (Mid)</span>
          <span>4 kHz (Presence)</span>
          <span>20 kHz (Air)</span>
        </div>
      </div>

    </div>
  );
}
