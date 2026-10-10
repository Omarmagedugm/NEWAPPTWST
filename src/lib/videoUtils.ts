export interface LiveStreamFormat {
  originalUrl: string;
  embedUrl: string;
  directWatchUrl: string;
  type: 
    | 'youtube' 
    | 'hls' 
    | 'dash'
    | 'video' 
    | 'iframe' 
    | 'webview'
    | 'custom' 
    | 'audio' 
    | 'twitch' 
    | 'vimeo' 
    | 'dailymotion' 
    | 'facebook' 
    | 'streamable' 
    | 'rumble' 
    | 'okru'
    | 'tiktok'
    | 'archive'
    | 'gdrive';
  videoId?: string;
  rawIframe?: string;
  formatLabel?: string;
  isLive?: boolean;
  proxiedUrl?: string;
  useProxy?: boolean;
  isWebView?: boolean;
  webDomain?: string;
}

/**
 * Extracts src URL if the string is an HTML <iframe> tag or embed code
 */
export function extractEmbedSrc(input?: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed.includes('<iframe') || trimmed.includes('<video') || trimmed.includes('<embed')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1].replace(/&amp;/g, '&');
    }
  }
  return trimmed;
}

/**
 * Checks if input is an HTML embed code (contains <iframe>, <embed>, etc.)
 */
export function isEmbedCode(input?: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim().toLowerCase();
  return trimmed.includes('<iframe') || trimmed.includes('<embed') || trimmed.includes('<video') || trimmed.includes('<object');
}

/**
 * Extracts YouTube Video ID from any YouTube URL or Embed format
 */
export function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let trimmed = extractEmbedSrc(url).trim();

  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Match all YouTube patterns
  const match = trimmed.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match && match[1] ? match[1] : null;
}

/**
 * Checks if a URL / Embed code is YouTube
 */
export function isYouTubeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim();
  return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+/i.test(cleaned) || /^[a-zA-Z0-9_-]{11}$/.test(cleaned);
}

/**
 * Gets standard embed URL for YouTube
 */
export function getYouTubeEmbedUrl(url?: string, autoplay = true): string {
  if (!url) return '';
  const videoId = extractYouTubeId(url);
  if (videoId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
      enablejsapi: '1'
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }
  return extractEmbedSrc(url);
}

/**
 * Gets high quality YouTube thumbnail URL
 */
export function getYouTubeThumbnail(url?: string): string {
  const videoId = extractYouTubeId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return '';
}

/**
 * Checks if a URL / Embed code is a Facebook video
 */
export function isFacebookUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim();
  return /^(https?:\/\/)?(www\.|web\.|m\.)?(facebook\.com|fb\.watch)\/.+/i.test(cleaned);
}

/**
 * Gets Facebook video embed URL
 */
export function getFacebookEmbedUrl(url?: string, autoplay = true): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();

  // If already a facebook plugin iframe src
  if (cleaned.includes('facebook.com/plugins/video.php')) {
    return cleaned;
  }

  const encoded = encodeURIComponent(cleaned);
  return `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0&autoplay=${autoplay ? '1' : '0'}`;
}

/**
 * Checks if a URL is Twitch
 */
export function isTwitchUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('twitch.tv/') || cleaned.includes('player.twitch.tv/');
}

/**
 * Gets Twitch embed URL
 */
export function getTwitchEmbedUrl(url?: string, autoplay = true): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // If already player embed
  if (cleaned.includes('player.twitch.tv/')) {
    const hasParent = cleaned.includes('parent=');
    return hasParent ? cleaned : `${cleaned}&parent=${hostname}`;
  }

  // Channel: twitch.tv/channelname
  const channelMatch = cleaned.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  if (channelMatch && channelMatch[1] && !['videos', 'directory'].includes(channelMatch[1])) {
    return `https://player.twitch.tv/?channel=${channelMatch[1]}&parent=${hostname}&autoplay=${autoplay}`;
  }

  // VOD: twitch.tv/videos/123456
  const vodMatch = cleaned.match(/twitch\.tv\/videos\/([0-9]+)/i);
  if (vodMatch && vodMatch[1]) {
    return `https://player.twitch.tv/?video=${vodMatch[1]}&parent=${hostname}&autoplay=${autoplay}`;
  }

  return cleaned;
}

/**
 * Checks if a URL is Vimeo
 */
export function isVimeoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('vimeo.com/') || cleaned.includes('player.vimeo.com/');
}

/**
 * Gets Vimeo embed URL
 */
export function getVimeoEmbedUrl(url?: string, autoplay = true): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();

  if (cleaned.includes('player.vimeo.com/video/')) {
    return cleaned;
  }

  const match = cleaned.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+)/);
  if (match && match[1]) {
    return `https://player.vimeo.com/video/${match[1]}?autoplay=${autoplay ? '1' : '0'}&playsinline=1&title=0&byline=0&portrait=0`;
  }
  return cleaned;
}

/**
 * Checks if a URL is Dailymotion
 */
export function isDailymotionUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('dailymotion.com/') || cleaned.includes('dai.ly/');
}

/**
 * Gets Dailymotion embed URL
 */
export function getDailymotionEmbedUrl(url?: string, autoplay = true): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();

  const match = cleaned.match(/(?:dailymotion\.com\/(?:video|hub)\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return `https://www.dailymotion.com/embed/video/${match[1]}?autoplay=${autoplay ? '1' : '0'}&mute=0`;
  }
  return cleaned;
}

/**
 * Checks if a URL is Streamable
 */
export function isStreamableUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('streamable.com/');
}

/**
 * Gets Streamable embed URL
 */
export function getStreamableEmbedUrl(url?: string, autoplay = true): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  const match = cleaned.match(/streamable\.com\/(?:[a-zA-Z0-9_\-]+\/)?([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return `https://streamable.com/e/${match[1]}?autoplay=${autoplay ? '1' : '0'}`;
  }
  return cleaned;
}

/**
 * Checks if a URL is Rumble
 */
export function isRumbleUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('rumble.com/');
}

/**
 * Gets Rumble embed URL
 */
export function getRumbleEmbedUrl(url?: string): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  if (cleaned.includes('/embed/')) return cleaned;
  const match = cleaned.match(/rumble\.com\/(?:v[0-9a-zA-Z_\-]+-|embed\/|v)?([a-zA-Z0-9_\-]+)/);
  if (match && match[1]) {
    return `https://rumble.com/embed/${match[1]}/`;
  }
  return cleaned;
}

/**
 * Checks if a URL is OK.ru (Odnoklassniki)
 */
export function isOkRuUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('ok.ru/video/') || cleaned.includes('ok.ru/live/') || cleaned.includes('ok.ru/videoembed/');
}

/**
 * Gets OK.ru embed URL
 */
export function getOkRuEmbedUrl(url?: string): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  if (cleaned.includes('ok.ru/videoembed/')) return cleaned;
  const match = cleaned.match(/ok\.ru\/(?:video|live)\/(\d+)/i);
  if (match && match[1]) {
    return `https://ok.ru/videoembed/${match[1]}`;
  }
  return cleaned;
}

/**
 * Checks if a URL is TikTok
 */
export function isTikTokUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('tiktok.com/@') || cleaned.includes('tiktok.com/embed/v2/');
}

/**
 * Gets TikTok embed URL
 */
export function getTikTokEmbedUrl(url?: string): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  if (cleaned.includes('tiktok.com/embed/v2/')) return cleaned;
  const match = cleaned.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (match && match[1]) {
    return `https://www.tiktok.com/embed/v2/${match[1]}`;
  }
  return cleaned;
}

/**
 * Checks if a URL is Archive.org
 */
export function isArchiveOrgUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('archive.org/details/') || cleaned.includes('archive.org/embed/');
}

/**
 * Gets Archive.org embed URL
 */
export function getArchiveOrgEmbedUrl(url?: string): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  if (cleaned.includes('archive.org/embed/')) return cleaned;
  const match = cleaned.match(/archive\.org\/details\/([a-zA-Z0-9_\-]+)/i);
  if (match && match[1]) {
    return `https://archive.org/embed/${match[1]}`;
  }
  return cleaned;
}

/**
 * Checks if a URL is Google Drive video
 */
export function isGoogleDriveUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  return cleaned.includes('drive.google.com/file/d/');
}

/**
 * Gets Google Drive preview URL
 */
export function getGoogleDriveEmbedUrl(url?: string): string {
  if (!url) return '';
  const cleaned = extractEmbedSrc(url).trim();
  const match = cleaned.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return cleaned;
}

/**
 * Checks if a URL is an MPEG-DASH (.mpd) stream
 */
export function isDashUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = extractEmbedSrc(url).trim().toLowerCase();
  return lower.includes('.mpd') || 
         lower.includes('/dash/') || 
         lower.includes('manifest.mpd') || 
         lower.includes('format=mpd') ||
         lower.includes('.mpd?');
}

/**
 * Checks if a URL is an HLS (.m3u8, .m3u) live stream
 */
export function isHlsUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = extractEmbedSrc(url).trim().toLowerCase();
  return lower.includes('.m3u8') || 
         lower.includes('/hls/') || 
         lower.includes('playlist-hls') ||
         lower.includes('manifest.m3u8') || 
         lower.includes('.m3u') ||
         lower.includes('/live/m3u8') ||
         lower.includes('format=m3u8') ||
         lower.includes('.m3u8?') ||
         lower.includes('/api/m3u-proxy');
}

/**
 * Checks if a URL is an audio stream / radio
 */
export function isAudioUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = extractEmbedSrc(url).trim().toLowerCase();
  return lower.endsWith('.mp3') || 
         lower.endsWith('.aac') || 
         lower.endsWith('.ogg') || 
         lower.endsWith('.wav') ||
         lower.endsWith('.m4a') ||
         lower.endsWith('.flac') ||
         lower.includes('.mp3?') ||
         lower.includes('.aac?') ||
         lower.includes('.ogg?') ||
         lower.includes('.wav?') ||
         lower.includes('.flac?') ||
         lower.includes('icecast') ||
         lower.includes('shoutcast') ||
         lower.includes('radio') ||
         lower.includes('webradio') ||
         lower.includes('/audio/');
}

/**
 * Checks if a URL is a direct video file (MP4, WebM, MOV, MKV, AVI, FLV, WMV, OGV, M4V, TS, 3GP, Cloudinary, Firebase, etc.)
 */
export function isDirectVideoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = extractEmbedSrc(url).trim().toLowerCase();

  // Extension check (including query string)
  if (
    lower.endsWith('.mp4') || lower.includes('.mp4?') ||
    lower.endsWith('.webm') || lower.includes('.webm?') ||
    lower.endsWith('.mov') || lower.includes('.mov?') ||
    lower.endsWith('.m4v') || lower.includes('.m4v?') ||
    lower.endsWith('.mkv') || lower.includes('.mkv?') ||
    lower.endsWith('.ogv') || lower.includes('.ogv?') ||
    lower.endsWith('.avi') || lower.includes('.avi?') ||
    lower.endsWith('.flv') || lower.includes('.flv?') ||
    lower.endsWith('.wmv') || lower.includes('.wmv?') ||
    (lower.endsWith('.ogg') && lower.includes('video')) ||
    lower.endsWith('.3gp') || lower.includes('.3gp?') ||
    lower.endsWith('.ts') || lower.includes('.ts?')
  ) {
    return true;
  }

  // Cloudinary direct video
  if (lower.includes('cloudinary.com') && lower.includes('/video/upload/')) {
    return true;
  }

  // Firebase Storage video token
  if (lower.includes('firebasestorage.googleapis.com') && (lower.includes('video') || lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov'))) {
    return true;
  }

  // Blob and Data URL videos
  if (lower.startsWith('blob:') || lower.startsWith('data:video/')) {
    return true;
  }

  return false;
}

/**
 * Returns the proper video MIME type for direct video files
 */
export function getVideoMimeType(url?: string): string {
  if (!url) return 'video/mp4';
  const lower = url.toLowerCase();
  if (lower.includes('.webm')) return 'video/webm';
  if (lower.includes('.ogv') || lower.includes('.ogg')) return 'video/ogg';
  if (lower.includes('.mov')) return 'video/quicktime';
  if (lower.includes('.m4v')) return 'video/x-m4v';
  if (lower.includes('.mkv')) return 'video/x-matroska';
  if (lower.includes('.ts')) return 'video/mp2t';
  if (lower.includes('.3gp')) return 'video/3gpp';
  if (lower.includes('.flv')) return 'video/x-flv';
  if (lower.includes('.avi')) return 'video/x-msvideo';
  if (lower.includes('.wmv')) return 'video/x-ms-wmv';
  if (lower.includes('.mpd')) return 'application/dash+xml';
  if (lower.includes('.m3u8') || lower.includes('.m3u')) return 'application/vnd.apple.mpegurl';
  return 'video/mp4';
}

/**
 * Builds proxied stream URL to bypass anti-embedding, CORS, and hide origin domain
 */
export function getProxiedStreamUrl(url?: string, referer?: string): string {
  if (!url) return '';
  const trimmed = extractEmbedSrc(url).trim();
  if (trimmed.startsWith('/api/m3u-proxy') || trimmed.startsWith('/api/live-proxy') || trimmed.startsWith('/api/stream-proxy')) {
    return trimmed;
  }
  const params = new URLSearchParams({ url: trimmed });
  if (referer) {
    params.set('referer', referer);
  }
  return `/api/m3u-proxy?${params.toString()}`;
}

/**
 * Builds proxied iframe URL to bypass X-Frame-Options and frame-ancestors restrictions
 */
export function getProxiedIframeUrl(url?: string): string {
  if (!url) return '';
  const trimmed = extractEmbedSrc(url).trim();
  if (trimmed.startsWith('/api/iframe-proxy') || trimmed.startsWith('/api/webview-proxy')) {
    return trimmed;
  }
  return `/api/iframe-proxy?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Checks if a URL is a regular web page / site URL (ideal for in-frame WebView)
 */
export function isWebPageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleaned = extractEmbedSrc(url).trim().toLowerCase();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) return false;

  // If it's a direct video file, stream manifest, or audio stream, it's not a generic web page
  if (isDirectVideoUrl(cleaned) || isHlsUrl(cleaned) || isDashUrl(cleaned) || isAudioUrl(cleaned)) {
    return false;
  }
  
  // Known video platforms have their own optimized players
  if (
    isYouTubeUrl(cleaned) || 
    isFacebookUrl(cleaned) || 
    isTwitchUrl(cleaned) || 
    isVimeoUrl(cleaned) || 
    isDailymotionUrl(cleaned) || 
    isStreamableUrl(cleaned) || 
    isRumbleUrl(cleaned) || 
    isOkRuUrl(cleaned) || 
    isGoogleDriveUrl(cleaned) || 
    isArchiveOrgUrl(cleaned) ||
    isTikTokUrl(cleaned)
  ) {
    return false;
  }

  return true;
}

/**
 * Extracts clean domain name from a URL for display in WebView toolbar
 */
export function extractDomain(url?: string): string {
  if (!url) return '';
  try {
    const raw = extractEmbedSrc(url).trim();
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) return '';
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

/**
 * Detects media stream / video type for stations & media players
 */
export function detectMediaType(url?: string): 'audio' | 'youtube' | 'facebook' | 'twitch' | 'vimeo' | 'dailymotion' | 'hls' | 'dash' | 'video' | 'webview' | 'custom_stream' {
  if (!url || typeof url !== 'string') return 'custom_stream';
  const trimmed = extractEmbedSrc(url).trim().toLowerCase();

  if (isYouTubeUrl(trimmed)) return 'youtube';
  if (isTwitchUrl(trimmed)) return 'twitch';
  if (isFacebookUrl(trimmed)) return 'facebook';
  if (isVimeoUrl(trimmed)) return 'vimeo';
  if (isDailymotionUrl(trimmed)) return 'dailymotion';
  if (isDashUrl(trimmed)) return 'dash';
  if (isHlsUrl(trimmed)) return 'hls';
  if (isDirectVideoUrl(trimmed)) return 'video';
  if (isAudioUrl(trimmed)) return 'audio';
  if (isWebPageUrl(trimmed)) return 'webview';

  return 'custom_stream';
}

/**
 * Universal Live & Recorded Stream Parser supporting ALL video/audio formats:
 * - HLS Live (.m3u8, .m3u, IPTV, manifests)
 * - MPEG-DASH (.mpd streams)
 * - YouTube (Live, Watch, Shorts, Embed)
 * - Twitch (Live channels & VODs)
 * - Facebook (Live & Watch)
 * - Vimeo
 * - Dailymotion
 * - Streamable
 * - Rumble
 * - OK.ru
 * - TikTok
 * - Archive.org
 * - Google Drive
 * - Direct Video (MP4, WebM, MOV, MKV, AVI, FLV, WMV, M4V, OGV, TS, 3GP, Cloudinary, Firebase Storage)
 * - Direct Audio (MP3, AAC, OGG, WAV, FLAC, Icecast Radio)
 * - Raw HTML Iframes & Embed code
 */
export function parseLiveStreamUrl(rawUrl?: string, options?: { forceProxy?: boolean; referer?: string; isWebView?: boolean }): LiveStreamFormat {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { originalUrl: '', embedUrl: '', directWatchUrl: '', type: 'custom', formatLabel: 'غير محدد' };
  }

  let trimmed = rawUrl.trim();

  // If explicit WebView requested for any HTTP/HTTPS URL
  if (options?.isWebView && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    const webDomain = extractDomain(trimmed);
    const iframeProxiedUrl = getProxiedIframeUrl(trimmed);
    return {
      originalUrl: trimmed,
      embedUrl: options?.forceProxy ? iframeProxiedUrl : trimmed,
      directWatchUrl: trimmed,
      type: 'webview',
      formatLabel: `متصفح ويب مدمج (WebView: ${webDomain || 'موقع خارجي'})`,
      isLive: true,
      proxiedUrl: iframeProxiedUrl,
      useProxy: !!options?.forceProxy,
      isWebView: true,
      webDomain
    };
  }

  // If Dropbox link, transform dl=0 to raw=1 for direct streaming
  if (trimmed.includes('dropbox.com/') && trimmed.includes('dl=0')) {
    trimmed = trimmed.replace('dl=0', 'raw=1');
  }

  const proxiedUrl = getProxiedStreamUrl(trimmed, options?.referer);

  // 1. Raw HTML Iframe & Embed Code (preserve exactly as provided)
  if (trimmed.startsWith('<iframe') || trimmed.includes('<iframe')) {
    const src = extractEmbedSrc(trimmed);
    
    // Check if the iframe src is actually YouTube
    const ytId = extractYouTubeId(src);
    if (ytId) {
      return {
        originalUrl: trimmed,
        embedUrl: getYouTubeEmbedUrl(src, true),
        directWatchUrl: `https://www.youtube.com/watch?v=${ytId}`,
        type: 'iframe',
        videoId: ytId,
        rawIframe: trimmed,
        formatLabel: 'YouTube Embed',
        isLive: true,
        proxiedUrl
      };
    }

    if (isFacebookUrl(src)) {
      return {
        originalUrl: trimmed,
        embedUrl: getFacebookEmbedUrl(src, true),
        directWatchUrl: src,
        type: 'iframe',
        rawIframe: trimmed,
        formatLabel: 'Facebook Embed',
        isLive: true,
        proxiedUrl
      };
    }

    if (isTwitchUrl(src)) {
      return {
        originalUrl: trimmed,
        embedUrl: getTwitchEmbedUrl(src, true),
        directWatchUrl: src,
        type: 'iframe',
        rawIframe: trimmed,
        formatLabel: 'Twitch Embed',
        isLive: true,
        proxiedUrl
      };
    }

    return {
      originalUrl: trimmed,
      embedUrl: src,
      directWatchUrl: src,
      type: 'iframe',
      rawIframe: trimmed,
      formatLabel: 'كود تضمين HTML',
      isLive: true,
      proxiedUrl
    };
  }

  // 2. YouTube URLs (including live, watch, youtu.be, embed, shorts)
  const videoId = extractYouTubeId(trimmed);
  if (videoId) {
    return {
      originalUrl: trimmed,
      embedUrl: getYouTubeEmbedUrl(trimmed, true),
      directWatchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      type: 'youtube',
      videoId,
      formatLabel: 'يوتيوب مباشر / فيديو',
      isLive: trimmed.includes('/live') || !trimmed.includes('/watch'),
      proxiedUrl
    };
  }

  // Direct YouTube Live channel URL
  if (trimmed.includes('youtube.com/') && trimmed.includes('/live')) {
    return {
      originalUrl: trimmed,
      embedUrl: trimmed,
      directWatchUrl: trimmed,
      type: 'youtube',
      formatLabel: 'بث يوتيوب مباشر',
      isLive: true,
      proxiedUrl
    };
  }

  // 3. Twitch (Live Stream & Videos)
  if (isTwitchUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getTwitchEmbedUrl(trimmed, true),
      directWatchUrl: trimmed,
      type: 'twitch',
      formatLabel: 'Twitch Live',
      isLive: !trimmed.includes('/videos/'),
      proxiedUrl
    };
  }

  // 4. Facebook video URL
  if (isFacebookUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getFacebookEmbedUrl(trimmed, true),
      directWatchUrl: trimmed,
      type: 'facebook',
      formatLabel: 'فيسبوك مباشر / فيديو',
      isLive: trimmed.includes('live'),
      proxiedUrl
    };
  }

  // 5. Vimeo
  if (isVimeoUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getVimeoEmbedUrl(trimmed, true),
      directWatchUrl: trimmed,
      type: 'vimeo',
      formatLabel: 'Vimeo Video',
      isLive: false,
      proxiedUrl
    };
  }

  // 6. Dailymotion
  if (isDailymotionUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getDailymotionEmbedUrl(trimmed, true),
      directWatchUrl: trimmed,
      type: 'dailymotion',
      formatLabel: 'Dailymotion',
      isLive: false,
      proxiedUrl
    };
  }

  // 7. Streamable
  if (isStreamableUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getStreamableEmbedUrl(trimmed, true),
      directWatchUrl: trimmed,
      type: 'streamable',
      formatLabel: 'Streamable',
      isLive: false,
      proxiedUrl
    };
  }

  // 8. Rumble
  if (isRumbleUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getRumbleEmbedUrl(trimmed),
      directWatchUrl: trimmed,
      type: 'rumble',
      formatLabel: 'Rumble Video',
      isLive: false,
      proxiedUrl
    };
  }

  // 9. OK.ru
  if (isOkRuUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getOkRuEmbedUrl(trimmed),
      directWatchUrl: trimmed,
      type: 'okru',
      formatLabel: 'OK.ru Video',
      isLive: trimmed.includes('/live/'),
      proxiedUrl
    };
  }

  // 10. TikTok
  if (isTikTokUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getTikTokEmbedUrl(trimmed),
      directWatchUrl: trimmed,
      type: 'tiktok',
      formatLabel: 'TikTok Video',
      isLive: false,
      proxiedUrl
    };
  }

  // 11. Archive.org
  if (isArchiveOrgUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getArchiveOrgEmbedUrl(trimmed),
      directWatchUrl: trimmed,
      type: 'archive',
      formatLabel: 'Archive.org Video',
      isLive: false,
      proxiedUrl
    };
  }

  // 12. Google Drive Video
  if (isGoogleDriveUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: getGoogleDriveEmbedUrl(trimmed),
      directWatchUrl: trimmed,
      type: 'gdrive',
      formatLabel: 'Google Drive Video',
      isLive: false,
      proxiedUrl
    };
  }

  // 13. MPEG-DASH (.mpd) stream
  if (isDashUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: options?.forceProxy ? proxiedUrl : trimmed,
      directWatchUrl: trimmed,
      type: 'dash',
      formatLabel: 'بث MPEG-DASH مباشر (.mpd)',
      isLive: true,
      proxiedUrl,
      useProxy: !!options?.forceProxy
    };
  }

  // 14. HLS .m3u8 and .m3u stream (IPTV, CDNs, manifest files)
  if (isHlsUrl(trimmed)) {
    const finalStreamUrl = (options?.forceProxy || trimmed.startsWith('/api/m3u-proxy')) ? proxiedUrl : trimmed;
    return {
      originalUrl: trimmed,
      embedUrl: finalStreamUrl,
      directWatchUrl: trimmed,
      type: 'hls',
      formatLabel: trimmed.includes('.m3u') ? 'بث HLS مباشر (.m3u / .m3u8 IPTV)' : 'بث HLS مباشر (.m3u8)',
      isLive: true,
      proxiedUrl,
      useProxy: !!options?.forceProxy || trimmed.startsWith('/api/m3u-proxy')
    };
  }

  // 15. Direct Video streams (MP4, WebM, MOV, MKV, AVI, FLV, WMV, OGV, M4V, TS, 3GP, Cloudinary, Firebase)
  if (isDirectVideoUrl(trimmed)) {
    const ext = trimmed.split('?')[0].split('.').pop()?.toUpperCase() || 'VIDEO';
    const finalStreamUrl = options?.forceProxy ? proxiedUrl : trimmed;
    return {
      originalUrl: trimmed,
      embedUrl: finalStreamUrl,
      directWatchUrl: trimmed,
      type: 'video',
      formatLabel: `فيديو مسجل / مباشر (${ext})`,
      isLive: ext === 'TS' || trimmed.includes('live'),
      proxiedUrl,
      useProxy: !!options?.forceProxy
    };
  }

  // 16. Audio Streams & Webradio (MP3, AAC, OGG, WAV, FLAC, Icecast, Shoutcast)
  if (isAudioUrl(trimmed)) {
    return {
      originalUrl: trimmed,
      embedUrl: options?.forceProxy ? proxiedUrl : trimmed,
      directWatchUrl: trimmed,
      type: 'audio',
      formatLabel: 'بث صوتي / راديو مباشر',
      isLive: true,
      proxiedUrl,
      useProxy: !!options?.forceProxy
    };
  }

  // 17. Web Page URL -> WebView mode
  if (isWebPageUrl(trimmed)) {
    const webDomain = extractDomain(trimmed);
    const iframeProxiedUrl = getProxiedIframeUrl(trimmed);
    return {
      originalUrl: trimmed,
      embedUrl: options?.forceProxy ? iframeProxiedUrl : trimmed,
      directWatchUrl: trimmed,
      type: 'webview',
      formatLabel: `متصفح ويب مدمج (WebView: ${webDomain || 'موقع خارجي'})`,
      isLive: true,
      proxiedUrl: iframeProxiedUrl,
      useProxy: !!options?.forceProxy,
      isWebView: true,
      webDomain
    };
  }

  // 18. Generic HTTPS embed / stream
  const webDomain = extractDomain(trimmed);
  return {
    originalUrl: trimmed,
    embedUrl: options?.forceProxy ? getProxiedIframeUrl(trimmed) : trimmed,
    directWatchUrl: trimmed,
    type: 'custom',
    formatLabel: 'رابط بث مخصص (Embed)',
    isLive: true,
    proxiedUrl: getProxiedIframeUrl(trimmed),
    useProxy: !!options?.forceProxy,
    webDomain
  };
}
