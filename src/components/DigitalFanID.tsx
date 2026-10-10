import React, { useRef, useState } from 'react';
import { Download, Loader2, Share2, Check, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import { getOptimizedImage } from '../lib/cloudinary';
import toast from 'react-hot-toast';

interface DigitalFanIDProps {
  username: string;
  memberId?: string;
  avatarUrl: string;
  role?: string;
  tier?: string;
}

export default function DigitalFanID({ username, memberId, avatarUrl, role, tier }: DigitalFanIDProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { appSettings } = useAppStore();

  const getBadgeLabel = () => {
    if (role === 'admin') return 'مدير التطبيق 🛡️';
    if (role === 'moderator') return 'مشرف النظام ⚡';
    if (tier === 'premium') return 'عضو ملكي 👑';
    if (tier === 'diamond') return 'عضو ماسي 💎';
    if (tier === 'gold') return 'عضو ذهبي 🥇';
    if (tier === 'silver') return 'عضو فضي 🥈';
    if (tier === 'bronze') return 'عضو برونزي 🥉';
    return 'عضو مشجع 🟢';
  };

  const generateCardBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    
    // Dynamically load html2canvas on demand to keep initial app bundle super lightweight
    const { default: html2canvas } = await import('html2canvas');
    
    // Configure html2canvas with optimal cross-origin and rendering options
    const canvas = await html2canvas(cardRef.current, {
      scale: 3, // High resolution crisp output
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.querySelector('[data-card-id="fan-id-card"]') as HTMLElement;
        if (clonedCard) {
          clonedCard.style.boxShadow = 'none';
        }
      }
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png', 1.0);
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    const toastId = toast.loading('جاري تجهيز بطاقة المشجع بدقة عالية...');
    setDownloading(true);

    try {
      const blob = await generateCardBlob();
      if (!blob) {
        throw new Error('فشل إنشاء صورة البطاقة');
      }

      const fileName = `Ittihad-Fan-ID-${username.replace(/\s+/g, '_')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Check if Web Share API with files is supported (Mobile Safari, Chrome Android)
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: 'بطاقة مشجع نادي الاتحاد السكندري الرقمية',
            text: `بطاقة مشجع نادي الاتحاد السكندري الخاصة بي - ${username}`
          });
          toast.success('تمت المشاركة والحفظ بنجاح!', { id: toastId });
          return;
        } catch (shareErr: any) {
          // If user aborted share modal, don't trigger download error
          if (shareErr.name === 'AbortError') {
            toast.dismiss(toastId);
            return;
          }
          console.log('Native share failed or aborted, falling back to download:', shareErr);
        }
      }

      // Standard Blob Download fallback for Desktop & other browsers
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast.success('تم تحميل بطاقة المشجع بنجاح! 🟢⚪', { id: toastId });
    } catch (err: any) {
      console.error('Failed to generate image:', err);
      toast.error('حدث خطأ أثناء تحميل البطاقة، يرجى المحاولة مرة أخرى', { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('تم نسخ رابط الملف الشخصي');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayId = memberId || '#UC-1906';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* The ID Card */}
      <div 
        ref={cardRef}
        data-card-id="fan-id-card"
        className="relative overflow-hidden rounded-[28px] shadow-2xl flex flex-col justify-between select-none"
        style={{
          width: '100%',
          maxWidth: '380px',
          height: '230px',
          background: 'linear-gradient(135deg, #0A5C36 0%, #158A4D 60%, #10b981 100%)',
          color: 'white',
          direction: 'rtl',
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-2xl -mt-12 -mr-12 pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl -mb-12 -ml-12 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

        {/* Top Header */}
        <div className="flex justify-between items-start p-4 relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={14} className="text-amber-300" />
              <h3 className="font-black text-base sm:text-lg drop-shadow-md text-white">بطاقة مشجع رقمية</h3>
            </div>
            <p className="text-[10px] font-bold text-white/90 drop-shadow-md">نادي الاتحاد السكندري - سيد البلد</p>
          </div>
          <div className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-black/25 text-white backdrop-blur-md tracking-wider border border-white/10 shadow-sm">
            EST. 1914
          </div>
        </div>

        {/* Middle Content */}
        <div className="flex items-center gap-3.5 px-4 relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-white shadow-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
            <img 
              src={avatarUrl || '/icon.png'} 
              alt={username} 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/icon.png';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-lg sm:text-xl truncate drop-shadow-md text-white leading-snug">{username}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <div className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg inline-block shadow-sm bg-white/90 text-slate-900">
                {displayId}
              </div>
              <div className="text-[10px] font-black px-2.5 py-0.5 rounded-lg inline-block shadow-sm bg-emerald-950/80 text-emerald-200 border border-emerald-400/30">
                {getBadgeLabel()}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="p-4 flex justify-between items-end relative z-10 border-t border-white/10 mt-2 bg-black/10">
          <div className="font-black text-xs sm:text-sm drop-shadow-md px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20">
            زعيم الثغر 🟢⚪
          </div>
          
          <div className="h-8 w-8 flex items-center justify-center opacity-90 drop-shadow">
            <img 
              src={getOptimizedImage(appSettings.appLogo, 100) || '/icon.png'} 
              onError={(e) => { e.currentTarget.src = '/icon.png'; }}
              alt="Logo" 
              className="w-full h-full object-contain"
              crossOrigin="anonymous" 
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 w-full max-w-[380px]">
        <button 
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black px-4 py-3 rounded-2xl shadow-lg shadow-primary/25 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed pressable text-xs sm:text-sm"
        >
          {downloading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          <span>تحميل البطاقة (PNG)</span>
        </button>

        <button
          onClick={handleCopyLink}
          title="نسخ الرابط"
          className="p-3 bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-2xl border border-border-light dark:border-border-dark transition-all duration-200 pressable"
        >
          {copied ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
        </button>
      </div>
    </div>
  );
}
