import React, { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface HtmlWidgetProps {
  htmlCode: string;
  id: string;
}

/**
 * A robust component to render HTML widgets with script support and stability.
 * Optimized for mobile devices to prevent content disappearance and flickering.
 */
const HtmlWidget: React.FC<HtmlWidgetProps> = ({ htmlCode, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !htmlCode) return;

    try {
      // 1. Clear previous content
      containerRef.current.innerHTML = '';
      
      // 2. Create a temporary container to parse scripts
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlCode, 'text/html');
      const elements = Array.from(doc.body.childNodes);

      // 3. Append elements and handle scripts
      elements.forEach((node) => {
        if (node.nodeName === 'SCRIPT') {
          const script = document.createElement('script');
          const originalScript = node as HTMLScriptElement;
          
          // Copy all attributes
          Array.from(originalScript.attributes).forEach((attr) => {
            script.setAttribute(attr.name, attr.value);
          });
          
          // Copy content
          script.textContent = originalScript.textContent;
          
          // Use async/defer to prevent blocking on mobile
          if (!script.hasAttribute('async')) script.async = true;
          
          document.head.appendChild(script);
        } else {
          // Clone and append non-script nodes
          containerRef.current?.appendChild(node.cloneNode(true));
        }
      });

      // 4. Mark as loaded
      setIsLoaded(true);
    } catch (err) {
      console.error('HtmlWidget Error:', err);
      setError('فشل تحميل الـ Widget');
      setIsLoaded(true);
    }

    // Cleanup logic if needed (usually handled by browser script unloading or explicit removal)
    return () => {
      // We don't necessarily remove scripts from head as they might be needed globally,
      // but we could track them if memory usage becomes an issue on mobile.
    };
  }, [htmlCode, id]);

  return (
    <div className="relative w-full overflow-hidden min-h-[100px] transition-all duration-500">
      <AnimatePresence>
        {!isLoaded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-card-dark rounded-2xl gap-3"
          >
            <div className="relative">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="absolute inset-0 bg-primary/10 blur-xl"></div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تحميل المحتوى...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        ref={containerRef}
        className={`w-full h-full transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ contentVisibility: 'auto' }} // Performance boost for mobile
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          <p className="text-xs font-bold text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
};

export default memo(HtmlWidget);
