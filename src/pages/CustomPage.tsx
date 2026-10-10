import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export default function CustomPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const customPages = useAppStore(state => state.customPages);
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customPages.length > 0) {
      const matchedPage = customPages.find(p => p.slug === slug && p.active !== false);
      if (matchedPage) {
        setPageData(matchedPage);
      } else {
        navigate('/');
      }
      setLoading(false);
    } else {
      // If store is empty, maybe wait a bit or try to head home after a timeout
      const timer = setTimeout(() => {
        if (loading) setLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [slug, customPages, navigate]);

  useEffect(() => {
    if (pageData && !loading) {
      const container = document.getElementById('custom-page-content');
      if (container) {
        const scripts = container.getElementsByTagName('script');
        Array.from(scripts).forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.text = oldScript.innerHTML;
          // If it's a src script (like elfsight), appending it to document.head often works better
          if (newScript.src) {
             // Avoid adding duplicates if possible, or force reload/re-exec
             const existing = document.querySelector(`script[src="${newScript.src}"]`);
             if (existing) {
               // Already exists, try to manually init if it's Elfsight
               if (newScript.src.includes('elfsight')) {
                 if (typeof window !== 'undefined' && 'eapps' in window) {
                   (window as any).eapps.init();
                 }
               }
             } else {
               document.head.appendChild(newScript);
             }
             oldScript.remove(); // Remove the original lifeless script
          } else {
             oldScript.parentNode?.replaceChild(newScript, oldScript);
          }
        });
      }
    }
  }, [pageData, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white pb-[80px]">
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!pageData) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white pb-[80px]">
      <div className="px-4 py-6" id="custom-page-content">
        <h1 className="text-2xl font-black mb-6 border-b-2 border-primary inline-block pb-1">{pageData.title}</h1>
        {/* Render HTML content safely or iframe based on content */}
        {pageData.content.includes('<iframe') ? (
           <div className="w-full relative w-full overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800"
                dangerouslySetInnerHTML={{ __html: pageData.content }} />
        ) : (
          <div 
            className="prose prose-slate dark:prose-invert max-w-none prose-img:rounded-xl prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: pageData.content }}
          />
        )}
      </div>
    </div>
  );
}
