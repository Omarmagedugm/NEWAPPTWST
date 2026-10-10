import React from 'react';

export default function HomeSkeleton() {
  return (
    <div className="flex-1 w-full max-w-md md:max-w-6xl lg:max-w-7xl mx-auto flex flex-col pb-32 md:pb-16 px-4 md:px-6 bg-background-light dark:bg-background-dark min-h-screen animate-pulse">
      {/* Top Banner / Match Carousel Skeleton */}
      <div className="w-full h-48 md:h-64 rounded-3xl bg-slate-200 dark:bg-slate-800/80 mb-6 mt-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        <div className="p-6 flex flex-col justify-between h-full">
          <div className="flex justify-between items-center">
            <div className="w-24 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="w-16 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="flex justify-around items-center my-auto">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="w-16 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="w-16 h-8 rounded-xl bg-slate-300 dark:bg-slate-700" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="w-16 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
          </div>
          <div className="w-32 h-4 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
        </div>
      </div>

      {/* Quick Access Badges Skeleton */}
      <div className="flex items-center gap-3 overflow-x-hidden mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-24 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        ))}
      </div>

      {/* News Section Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="w-28 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="w-16 h-4 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>

        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800/80 flex gap-4 items-center shadow-xs">
            <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="w-3/4 h-4 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="w-1/2 h-3 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="w-1/4 h-3 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
