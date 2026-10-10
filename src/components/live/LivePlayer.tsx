import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { parseLiveStreamUrl, getVideoMimeType, getProxiedStreamUrl, getProxiedIframeUrl } from '../../lib/videoUtils';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Radio as AudioIcon,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Globe
} from 'lucide-react';

interface LivePlayerProps {
  url?: string;
  title?: string;
  isActive?: boolean;
  sportName?: string;
  useProxy?: boolean;
  isWebView?: boolean;
}

const LivePlayer = React.memo(function LivePlayer({ 
  url, 
  title, 
  isActive = true, 
  sportName = 'كرة القدم',
  useProxy = false,
  isWebView = false
}: LivePlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Proxy mode state: if prop is true, or if auto-retried, or user toggled in player
  const [useProxyMode, setUseProxyMode] = useState<boolean>(() => {
    if (useProxy) return true;
    if (typeof url === 'string' && (url.includes('/api/m3u-proxy') || url.includes('/api/live-proxy') || url.includes('/api/iframe-proxy') || url.includes('/api/webview-proxy'))) return true;
    return false;
  });
  const [autoRetriedProxy, setAutoRetriedProxy] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<any>(null);

  const parsed = parseLiveStreamUrl(url, { forceProxy: useProxyMode, isWebView });
  const isAudio = parsed.type === 'audio';
  const isRawIframe = !!(parsed.rawIframe || (typeof url === 'string' && (url.trim().startsWith('<iframe') || url.includes('<iframe'))));
  const isWebViewMode = isWebView || parsed.type === 'webview';

  // Sync prop changes
  useEffect(() => {
    if (useProxy !== undefined) {
      setUseProxyMode(useProxy);
    }
  }, [useProxy]);

  // Reset states on URL or proxy change
  useEffect(() => {
    setHasError(false);
    setErrorDetails('');
    setIsLoading(!isRawIframe);
    setIsAudioPlaying(false);

    if (isRawIframe) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [url, reloadKey, sportName, isRawIframe, useProxyMode, isWebView]);

  // Clean up any existing player instances
  const destroyPlayers = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      try {
        dashRef.current.destroy();
      } catch (e) {
        // ignore
      }
      dashRef.current = null;
    }
  }, []);

  // Audio stream setup
  useEffect(() => {
    if (!isAudio || !url || !isActive || isWebViewMode) return;
    const audio = audioRef.current;
    if (!audio) return;

    const streamSrc = useProxyMode && parsed.proxiedUrl ? parsed.proxiedUrl : (parsed.embedUrl || url);
    audio.src = streamSrc;
    audio.play()
      .then(() => {
        setIsAudioPlaying(true);
        setIsLoading(false);
      })
      .catch(() => {
        setIsAudioPlaying(false);
        setIsLoading(false);
      });

    return () => {
      audio.pause();
    };
  }, [url, isAudio, isActive, reloadKey, useProxyMode, parsed.embedUrl, parsed.proxiedUrl, isWebViewMode]);

  // MPEG-DASH (.mpd) stream setup
  useEffect(() => {
    if (!url || parsed.type !== 'dash' || !isActive || isAudio || isWebViewMode) return;

    const video = videoRef.current;
    if (!video) return;

    destroyPlayers();

    const streamSrc = useProxyMode && parsed.proxiedUrl ? parsed.proxiedUrl : (parsed.embedUrl || url);

    try {
      const player = dashjs.MediaPlayer().create();
      dashRef.current = player;
      player.initialize(video, streamSrc, true);
      player.updateSettings({
        streaming: {
          abr: {
            autoSwitchBitrate: { video: true, audio: true }
          }
        }
      });

      player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        setIsLoading(false);
        setHasError(false);
      });

      player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
        console.warn('[LivePlayer] DASH error event:', e);
        if (!useProxyMode && !autoRetriedProxy) {
          console.log('[LivePlayer] Auto failover DASH stream to proxy...');
          setAutoRetriedProxy(true);
          setUseProxyMode(true);
          return;
        }
        setHasError(true);
        setErrorDetails('تعذر قراءة بث DASH من المصدر مباشرة');
        setIsLoading(false);
      });

      return () => {
        destroyPlayers();
      };
    } catch (err: any) {
      console.error('[LivePlayer] Failed to initialize DASH player:', err);
      if (!useProxyMode && !autoRetriedProxy) {
        setAutoRetriedProxy(true);
        setUseProxyMode(true);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    }
  }, [url, parsed.type, parsed.embedUrl, parsed.proxiedUrl, isActive, reloadKey, isAudio, useProxyMode, autoRetriedProxy, destroyPlayers, isWebViewMode]);

  // Direct Video Stream / Recorded File setup (MP4, WebM, MOV, MKV, AVI, FLV, WMV, OGV, TS, 3GP, Cloud)
  useEffect(() => {
    if (!url || parsed.type !== 'video' || !isActive || isAudio || isWebViewMode) return;

    const video = videoRef.current;
    if (!video) return;

    destroyPlayers();

    const videoSrc = useProxyMode && parsed.proxiedUrl ? parsed.proxiedUrl : (parsed.embedUrl || url);
    video.src = videoSrc;
    video.load();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsLoading(false);
          setHasError(false);
        })
        .catch(() => {
          // Autoplay with audio was blocked by browser policy - mute and retry
          video.muted = true;
          video.play()
            .then(() => {
              setIsLoading(false);
              setHasError(false);
            })
            .catch(() => {
              setIsLoading(false);
            });
        });
    }

    return () => {
      video.pause();
    };
  }, [url, parsed.type, parsed.embedUrl, parsed.proxiedUrl, isActive, reloadKey, isAudio, useProxyMode, destroyPlayers, isWebViewMode]);

  // HLS stream setup (.m3u8, .m3u, IPTV, manifests)
  useEffect(() => {
    if (!url || parsed.type !== 'hls' || !isActive || isAudio || isWebViewMode) return;

    const video = videoRef.current;
    if (!video) return;

    destroyPlayers();

    const streamSrc = useProxyMode && parsed.proxiedUrl ? parsed.proxiedUrl : (parsed.embedUrl || url);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        autoStartLoad: true,
        fragLoadingMaxRetry: 5,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
      });
      hlsRef.current = hls;

      hls.loadSource(streamSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setHasError(false);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay with audio was blocked by browser policy - mute and retry
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[LivePlayer] HLS Network Error:', data);
              // Auto-failover to proxy on network/CORS/hotlink failure!
              if (!useProxyMode && !autoRetriedProxy) {
                console.log('[LivePlayer] Auto failover HLS stream to proxy to bypass anti-embedding...');
                setAutoRetriedProxy(true);
                setUseProxyMode(true);
                hls.destroy();
                return;
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[LivePlayer] HLS Media Error, recovering...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('[LivePlayer] HLS Fatal unrecoverable error:', data);
              if (!useProxyMode && !autoRetriedProxy) {
                setAutoRetriedProxy(true);
                setUseProxyMode(true);
              } else {
                setHasError(true);
                setErrorDetails('تعذر الاتصال بسيرفر البث أو تم رفض التضمين من المصدر');
                setIsLoading(false);
              }
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        destroyPlayers();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari on iOS / macOS)
      video.src = streamSrc;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setHasError(false);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });
      video.addEventListener('error', () => {
        if (!useProxyMode && !autoRetriedProxy) {
          setAutoRetriedProxy(true);
          setUseProxyMode(true);
        } else {
          setHasError(true);
          setErrorDetails('تعذر تشغيل البث في مشغل المتصفح');
          setIsLoading(false);
        }
      });
    }
  }, [url, parsed.type, parsed.embedUrl, parsed.proxiedUrl, isActive, reloadKey, isAudio, useProxyMode, autoRetriedProxy, destroyPlayers, isWebViewMode]);

  const toggleAudioPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
    } else {
      audio.play().then(() => setIsAudioPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };


  if (!isActive) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500 shadow-inner">
          <span className="material-symbols-outlined text-3xl">videocam_off</span>
        </div>
        <h3 className="text-white font-black text-base mb-1.5">لا يوجد بث مباشر لـ {sportName} حالياً</h3>
        <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
          سيبدأ البث فور انطلاقه من قبل الإدارة. يمكنك متابعة الدردشة والتفاعل أدناه.
        </p>
      </div>
    );
  }

  if (!url || url.trim() === '') {
    return (
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary animate-pulse">
          <Play size={28} className="fill-primary ml-1" />
        </div>
        <h3 className="text-white font-black text-sm mb-1">في انتظار إشارة البث</h3>
        <p className="text-slate-400 text-xs">سيظهر البث هنا فور بدئه من قبل الإدارة</p>
      </div>
    );
  }

  // Audio Player View (if audio stream)
  if (isAudio) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <audio ref={audioRef} preload="auto" onError={() => setHasError(true)} />
        
        {/* Animated Sound Wave Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none gap-1 px-4">
          {[40, 65, 85, 30, 95, 50, 75, 90, 60, 45, 80, 100, 35, 70, 55, 85].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-indigo-400 rounded-full transition-all duration-300"
              style={{
                height: isAudioPlaying ? `${Math.max(15, (h * (i % 3 + 1)) % 100)}%` : '10%',
                animation: isAudioPlaying ? `pulse 1.${(i % 5) + 2}s infinite ease-in-out` : 'none'
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 max-w-xs">
          <div className="relative">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-primary flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 ${isAudioPlaying ? 'ring-4 ring-indigo-400/40 animate-pulse' : ''}`}>
              <AudioIcon size={36} className="text-white" />
            </div>
            {isAudioPlaying && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
              </span>
            )}
          </div>

          <div>
            <h3 className="text-white font-black text-base">{title || 'البث الصوتي المباشر'}</h3>
            <p className="text-indigo-400 text-xs font-bold mt-0.5">استوديو الصوت والراديو 🎙️</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={toggleAudioPlay}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all cursor-pointer"
            >
              {isAudioPlaying ? <Pause size={22} /> : <Play size={22} className="fill-white ml-0.5" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVideoTag = !isRawIframe && !isWebViewMode && (parsed.type === 'hls' || parsed.type === 'dash' || parsed.type === 'video');

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden group">
      

      {/* 1. Raw HTML IFrame Stream (preserved exactly as provided) */}
      {isRawIframe && !isWebViewMode && (
        <div
          key={`raw-iframe-${reloadKey}`}
          className="w-full h-full relative overflow-hidden bg-black [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:border-0 [&>iframe]:object-cover"
          dangerouslySetInnerHTML={{
            __html: parsed.rawIframe || (url as string)
          }}
        />
      )}

      {/* 2. YouTube Stream */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'youtube' && (
        <div className="relative w-full h-full">
          <iframe
            key={`yt-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "YouTube Stream"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="origin-when-cross-origin"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 3. Twitch Stream (Live & VOD) */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'twitch' && (
        <div className="relative w-full h-full">
          <iframe
            key={`twitch-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Twitch Stream"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 4. Facebook Video / Live */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'facebook' && (
        <div className="relative w-full h-full">
          <iframe
            key={`fb-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Facebook Video"}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 5. Vimeo Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'vimeo' && (
        <div className="relative w-full h-full">
          <iframe
            key={`vimeo-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Vimeo Video"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 6. Dailymotion Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'dailymotion' && (
        <div className="relative w-full h-full">
          <iframe
            key={`dm-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Dailymotion Video"}
            allow="autoplay; fullscreen; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 7. Streamable Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'streamable' && (
        <div className="relative w-full h-full">
          <iframe
            key={`streamable-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Streamable Video"}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 8. Rumble Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'rumble' && (
        <div className="relative w-full h-full">
          <iframe
            key={`rumble-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Rumble Video"}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 9. OK.ru Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'okru' && (
        <div className="relative w-full h-full">
          <iframe
            key={`okru-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "OK.ru Video"}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 10. TikTok Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'tiktok' && (
        <div className="relative w-full h-full">
          <iframe
            key={`tiktok-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "TikTok Video"}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 11. Archive.org Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'archive' && (
        <div className="relative w-full h-full">
          <iframe
            key={`archive-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Archive.org Video"}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 12. Google Drive Video */}
      {!isRawIframe && !isWebViewMode && parsed.type === 'gdrive' && (
        <div className="relative w-full h-full">
          <iframe
            key={`gdrive-${reloadKey}-${parsed.embedUrl}`}
            className="w-full h-full absolute inset-0 border-0"
            src={parsed.embedUrl}
            title={title || "Google Drive Video"}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 13. Direct Video Files (MP4, WebM, MOV, MKV, AVI, FLV, WMV, OGV, TS, 3GP, Cloud) & HLS Streams & DASH Streams */}
      {isVideoTag && (
        <video
          key={`video-${reloadKey}-${useProxyMode ? 'proxy' : 'direct'}`}
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          controls
          playsInline
          autoPlay
          preload="auto"
          crossOrigin="anonymous"
          onLoadedData={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={() => {
            if (!useProxyMode && !autoRetriedProxy) {
              console.log('[LivePlayer] Video tag error, auto failover to proxy...');
              setAutoRetriedProxy(true);
              setUseProxyMode(true);
              return;
            }
            setHasError(true);
            setIsLoading(false);
          }}
        >
          {parsed.type === 'video' && (
            <source 
              src={useProxyMode && parsed.proxiedUrl ? parsed.proxiedUrl : (parsed.embedUrl || url)} 
              type={getVideoMimeType(parsed.embedUrl || url)} 
            />
          )}
          متصفحك لا يدعم تشغيل هذا البث المباشر.
        </video>
      )}

      {/* 14. Dedicated In-Frame WebView Mode (Interactive Web Browser View) */}
      {isWebViewMode && (
        <div className="relative w-full h-full flex flex-col bg-slate-950">
          <iframe
            key={`webview-${reloadKey}-${useProxyMode ? 'proxy' : 'direct'}-${parsed.embedUrl}`}
            src={useProxyMode ? getProxiedIframeUrl(parsed.originalUrl || url) : (parsed.embedUrl || url)}
            className="w-full h-full border-0 flex-1 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; screen-wake-lock; display-capture"
            sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
            allowFullScreen
            onLoad={() => setIsLoading(false)}
            onError={() => {
              if (!useProxyMode && !autoRetriedProxy) {
                console.log('[LivePlayer] WebView load error, auto failover to iframe-proxy...');
                setAutoRetriedProxy(true);
                setUseProxyMode(true);
                return;
              }
              setHasError(true);
              setErrorDetails('تعذر تحميل الموقع داخل الإطار، قد يمنع الموقع التضمين عبر قيود X-Frame-Options.');
              setIsLoading(false);
            }}
          />
        </div>
      )}

      {/* 15. Embed / IFrame URL Stream (Custom websites & feeds) */}
      {!isRawIframe && !isWebViewMode && (parsed.type === 'iframe' || parsed.type === 'custom') && (
        <iframe
          key={`iframe-${reloadKey}-${useProxyMode ? 'proxy' : 'direct'}-${parsed.embedUrl}`}
          src={useProxyMode && parsed.proxiedUrl ? parsed.proxiedUrl : parsed.embedUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; screen-wake-lock; display-capture"
          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />
      )}

      {/* Error Fallback with Retry, Proxy Toggle, and External Open */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400">
            <AlertTriangle size={30} />
          </div>
          <h4 className="text-white font-black text-sm mb-1">
            {isWebViewMode ? 'تعذر فتح الموقع داخل الإطار' : 'تعذر تشغيل الفيديو أو البث'}
          </h4>
          <p className="text-slate-400 text-xs max-w-sm mb-4 leading-relaxed">
            {errorDetails || (isWebViewMode 
              ? 'يمنع هذا الموقع التضمين المباشر عبر جدار حماية X-Frame-Options. اضغط على تشغيل عبر البروكسي لتجاوز الحظر.' 
              : 'قد يكون رابط البث غير متاح، أو تمنع خوادم المصدر التضمين المباشر عبر قيود CORS أو حماية الـ Embedding.')}
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
            {/* Retry with Proxy Button */}
            {!useProxyMode && (
              <button
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                  setUseProxyMode(true);
                  setReloadKey(k => k + 1);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
              >
                <ShieldCheck size={14} />
                {isWebViewMode ? 'تخطي حظر الموقع عبر البروكسي 🛡️' : 'تشغيل عبر البروكسي (تخطي الحجب) 🛡️'}
              </button>
            )}

            {/* Standard Retry Button */}
            <button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setReloadKey(k => k + 1);
              }}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md hover:bg-primary-dark transition-all"
            >
              <RefreshCw size={13} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none z-20">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white font-bold text-[11px]">
              {isWebViewMode 
                ? (useProxyMode ? 'جاري تحميل الموقع عبر بروكسي تخطي الحجب...' : 'جاري تحميل الموقع داخل الإطار...') 
                : (useProxyMode ? 'جاري الاتصال بالبث عبر البروكسي الآمن...' : 'جاري الاتصال بالبث...')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default LivePlayer;
