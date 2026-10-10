import React from 'react';
import { Eye } from 'lucide-react';
import { useLiveViewers, LiveSportChannel } from '../../hooks/useLiveViewers';

interface LiveViewersBadgeProps {
  channel: LiveSportChannel;
  userName?: string;
}

/**
 * Isolated badge component so only this badge re-renders when viewers count changes,
 * preventing any page refresh, re-render of the video player, or interruption to the live stream.
 */
export const LiveViewersBadge = React.memo(function LiveViewersBadge({
  channel,
  userName,
}: LiveViewersBadgeProps) {
  const { realActiveViewers } = useLiveViewers(channel, userName);

  return (
    <div 
      className="flex items-center gap-1.5 bg-white dark:bg-card-dark px-3 py-1.5 rounded-full border border-border-light dark:border-border-dark text-slate-800 dark:text-white text-xs font-black shadow-xs select-none"
      title={`${realActiveViewers.toLocaleString('ar-EG')} شخص في الصفحة حالياً`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Eye size={14} className="text-red-500 shrink-0" />
      <span className="tabular-nums font-black text-slate-900 dark:text-white">
        {realActiveViewers.toLocaleString('ar-EG')}
      </span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold hidden xs:inline sm:inline">
        في الصفحة حالياً
      </span>
    </div>
  );
});

export default LiveViewersBadge;
