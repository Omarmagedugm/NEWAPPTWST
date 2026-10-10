import React, { useState } from 'react';
import { 
  Play, 
  ExternalLink, 
  Tv, 
  AlertCircle,
  Code
} from 'lucide-react';
import { 
  isYouTubeUrl, 
  getYouTubeEmbedUrl, 
  isFacebookUrl, 
  getFacebookEmbedUrl,
  extractEmbedSrc,
  isEmbedCode
} from '../../lib/videoUtils';

interface VideoEmbedWidgetProps {
  id?: string;
  title?: string;
  subtitle?: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'facebook' | 'direct' | 'iframe' | 'auto';
  aspectRatio?: '16/9' | '4/3' | '1/1' | '9/16';
  autoplay?: boolean;
}

export default function VideoEmbedWidget({
  title,
  subtitle,
  videoUrl,
  videoType = 'auto',
  aspectRatio = '16/9',
  autoplay = false
}: VideoEmbedWidgetProps) {
  const [hasError, setHasError] = useState(false);

  if (!videoUrl || videoUrl.trim() === '') {
    return null;
  }

  const rawInput = videoUrl.trim();
  const isHtmlEmbed = isEmbedCode(rawInput);
  const src = extractEmbedSrc(rawInput);

  // Detect type
  const isYT = videoType === 'youtube' || (videoType === 'auto' && isYouTubeUrl(rawInput));
  const isFB = videoType === 'facebook' || (videoType === 'auto' && isFacebookUrl(rawInput));
  const isDirect = videoType === 'direct' || (!isYT && !isFB && !isHtmlEmbed && (src.endsWith('.mp4') || src.endsWith('.webm')));

  // Formulate embed URL
  let embedSrc = src;
  if (isYT) {
    embedSrc = getYouTubeEmbedUrl(rawInput, autoplay);
  } else if (isFB) {
    embedSrc = getFacebookEmbedUrl(rawInput, autoplay);
  }

  // Determine watch link
  const directLink = isHtmlEmbed ? src : rawInput;

  // Aspect ratio class calculation
  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '4/3':
        return 'aspect-[4/3]';
      case '1/1':
        return 'aspect-square max-w-[480px] mx-auto';
      case '9/16':
        return 'aspect-[9/16] max-w-[360px] mx-auto';
      case '16/9':
      default:
        return 'aspect-video';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm hover:shadow-md transition-all">
      
      {/* Header section (if title or platforms) */}
      {(title || subtitle || videoUrl) && (
        <div className="p-4 pb-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-border-dark/60">
          <div className="flex items-center gap-2.5 min-w-0">
            
            {/* Platform Badge Icon */}
            {isYT ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <Play size={15} className="fill-current ml-0.5" />
              </div>
            ) : isFB ? (
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 font-black text-sm shadow-sm">
                f
              </div>
            ) : isHtmlEmbed ? (
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm">
                <Code size={15} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                <Tv size={15} />
              </div>
            )}

            {/* Title & Subtitle */}
            <div className="truncate">
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {title || (isYT ? 'فيديو يوتيوب مميز' : isFB ? 'فيديو فيسبوك' : isHtmlEmbed ? 'فيديو مدمج' : 'فيديو نادي الاتحاد')}
              </h3>
              {subtitle ? (
                <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                  {subtitle}
                </p>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  <span>
                    {isYT ? 'YouTube Video HD' : isFB ? 'Facebook Watch' : isHtmlEmbed ? 'كود تضمين Embed Code' : 'مشغل الفيديو'}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* External Link Action if valid URL */}
          {directLink && directLink.startsWith('http') && (
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-dark dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-all text-xs font-bold flex items-center gap-1 shadow-sm"
                title="مشاهدة على المصدر الأصلي"
              >
                <span className="text-[10px] hidden sm:inline">فتح الفيديو</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Video Container */}
      <div className={`relative w-full bg-black ${getAspectRatioClass()} overflow-hidden`}>
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950">
            <AlertCircle size={32} className="text-amber-500 mb-2" />
            <p className="text-xs font-bold text-white mb-1">تعذر تحميل الفيديو داخل الصفحة</p>
            <p className="text-[10px] text-slate-400 mb-3">قد تكون إعدادات الخصوصية تمنع التضمين الخارجي.</p>
            {directLink && directLink.startsWith('http') && (
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>مشاهدة الفيديو على المصدر</span>
              </a>
            )}
          </div>
        ) : isYT ? (
          <iframe
            src={embedSrc}
            title={title || 'YouTube video player'}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            onError={() => setHasError(true)}
          />
        ) : isFB ? (
          <iframe
            src={embedSrc}
            title={title || 'Facebook video player'}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            scrolling="no"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        ) : isDirect ? (
          <video
            src={src}
            controls
            autoPlay={autoplay}
            playsInline
            className="w-full h-full object-contain"
            onError={() => setHasError(true)}
          />
        ) : (
          <iframe
            src={embedSrc}
            title={title || 'Video Player'}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>

    </div>
  );
}
