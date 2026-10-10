import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedImage } from '../lib/cloudinary';
import { isImageInMemory, markImageLoaded } from '../lib/imageCache';

const ITTIHAD_DEFAULT_LOGO = '/icon.png';

export const getTeamLogoWithFallback = (teamName?: string, logoUrl?: string): string => {
  if (logoUrl && logoUrl.trim().length > 5) {
    return logoUrl.trim();
  }
  if (!teamName) return ITTIHAD_DEFAULT_LOGO;
  
  const name = teamName.trim().toLowerCase();

  if (name.includes('اتحاد') || name.includes('ittihad')) return ITTIHAD_DEFAULT_LOGO;
  if (name.includes('أهلي') || name.includes('اهلي') || name.includes('ahly')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777841244/admin_logo/fpjoepth9okjaedlcj97.png';
  }
  if (name.includes('زمالك') || name.includes('zamalek')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1786266811/admin_logo/nuzc32cczrp3mczzwbj4.png';
  }
  if (name.includes('بيراميدز') || name.includes('pyramids')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777841848/admin_logo/saklqh4e0k3h9spgefkb.png';
  }
  if (name.includes('سيراميكا') || name.includes('ceramica')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777841906/admin_logo/zryf71bhu9l6fnkxlh0b.png';
  }
  if (name.includes('سموحة') || name.includes('smouha')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1786267585/admin_logo/qcltagjjapw38osu8ll5.png';
  }
  if (name.includes('إسماعيلي') || name.includes('اسماعيلي') || name.includes('ismaily')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777895332/admin_logo/rqc1364kz89hvftt6jfd.png';
  }
  if (name.includes('مصري') || name.includes('masry')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1786267402/admin_logo/jkgjstjav4s8jkrg9qsh.png';
  }
  if (name.includes('إنبي') || name.includes('انبي') || name.includes('enppi')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777841874/admin_logo/kg4dhc7rmrqjzepuin4c.png';
  }
  if (name.includes('محلة') || name.includes('mahalla')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1786267311/admin_logo/xigvomra3suzlh5u86jx.png';
  }
  if (name.includes('مقاولون') || name.includes('mokawloon')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1786267791/admin_logo/ge8nukel9zfplx3tsqbh.png';
  }
  if (name.includes('سبورتنج') || name.includes('sporting')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777895410/admin_logo/gwrbaohb9gnyky6ywoyu.png';
  }
  if (name.includes('أوليمبي') || name.includes('اوليمبي') || name.includes('olympi')) {
    return 'https://res.cloudinary.com/dqj6gzwfg/image/upload/v1777895292/admin_logo/rfbyqjogilkatgvuubbn.png';
  }

  return ITTIHAD_DEFAULT_LOGO;
};

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  width?: number;
  fallback?: string;
  teamName?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  showIconPlaceholder?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  width, 
  fallback,
  teamName,
  fetchPriority,
  loading = 'lazy',
  showIconPlaceholder = true,
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const effectiveSrc = teamName ? getTeamLogoWithFallback(teamName, src as string) : (src || fallback || ITTIHAD_DEFAULT_LOGO);
  const fallbackSrc = fallback || (teamName ? getTeamLogoWithFallback(teamName) : ITTIHAD_DEFAULT_LOGO);
  const optimizedSrc = getOptimizedImage(hasError ? fallbackSrc : effectiveSrc, width);

  // Check if image was already cached/loaded in memory to prevent layout shift or loading flicker
  const [isLoaded, setIsLoaded] = useState(() => isImageInMemory(optimizedSrc));
  const imgRef = useRef<HTMLImageElement>(null);

  // Only reset error if the actual prop sources change, preventing render loops
  useEffect(() => {
    setHasError(false);
  }, [src, teamName, fallback]);

  useEffect(() => {
    if (isImageInMemory(optimizedSrc)) {
      setIsLoaded(true);
      return;
    }

    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      markImageLoaded(optimizedSrc);
      setIsLoaded(true);
    }
  }, [optimizedSrc]);

  const handleLoad = () => {
    markImageLoaded(optimizedSrc);
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
    }
    setIsLoaded(true);
  };

  const isContain = className.includes('object-contain');
  const fitClass = isContain ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative overflow-hidden ${className} flex items-center justify-center shrink-0`}>
      {/* Lightweight placeholder during initial download */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/40 dark:bg-surface-dark/40 z-0 animate-pulse pointer-events-none">
          {showIconPlaceholder ? (
            <span className="material-symbols-outlined text-emerald-500/40 text-[1.3em] select-none">
              sports_soccer
            </span>
          ) : (
            <div className="w-full h-full bg-slate-200/50 dark:bg-slate-700/50" />
          )}
        </div>
      )}

      <img
        {...props}
        ref={imgRef}
        src={optimizedSrc}
        alt={alt || teamName || ''}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onLoad={handleLoad}
        onError={handleError}
        className={`relative z-10 w-full h-full ${fitClass} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-90'}`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
