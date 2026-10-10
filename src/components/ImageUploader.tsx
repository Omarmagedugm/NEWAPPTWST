import React, { useState, useRef } from 'react';
import { Loader2, Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { uploadImage } from '../lib/firebase';
import { compressImage } from '../lib/imageCompressor';

interface ImageUploaderProps {
  folderName: string;
  onUploadSuccess: (url: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  className?: string;
  previewImageUrl?: string;
  showPreview?: boolean;
  buttonClassName?: string;
  iconOnly?: boolean;
  skipResize?: boolean;
}

export default function ImageUploader({ 
  folderName, 
  onUploadSuccess, 
  onError, 
  buttonText = 'اختر صورة', 
  className = '',
  previewImageUrl = '',
  showPreview = true,
  buttonClassName = '',
  iconOnly = false,
  skipResize = false
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(previewImageUrl);
  const [compressionInfo, setCompressionInfo] = useState<{ savingsPercent?: number; hasAlpha?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (showPreview && !iconOnly) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }

    setIsUploading(true);

    try {
      // Smart high-detail compression preserving 100% transparency for logos
      let fileToUpload: File | Blob = file;
      if (!skipResize) {
        try {
          const compressed = await compressImage(file, {
            quality: 0.90,
            maxDimension: 1920,
            format: 'auto',
            preserveTransparency: true
          });
          fileToUpload = compressed.file;
          setCompressionInfo({
            savingsPercent: compressed.savingsPercent,
            hasAlpha: compressed.hasAlpha
          });
        } catch (compErr) {
          console.warn('Smart compression fallback to direct file:', compErr);
          fileToUpload = file;
        }
      }
      
      const downloadUrl = await uploadImage(fileToUpload, folderName, file.name);
      
      if (downloadUrl) {
        if (showPreview && !iconOnly) {
          setPreviewUrl(downloadUrl);
        }
        onUploadSuccess(downloadUrl);
      } else {
        throw new Error('فشل رفع الصورة إلى التخزين السحابي');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      if (onError) onError(error instanceof Error ? error.message : 'فشل الرفع');
    } finally {
      setIsUploading(false);
      // Reset the value via target to allow picking the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {showPreview && previewUrl && !iconOnly && (
        <div className="relative w-32 h-32 rounded-2xl overflow-hidden glass-card border border-slate-200 dark:border-white/20 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:10px_10px]">
          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-1" />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm gap-1">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
              <span className="text-[10px] text-white font-bold">جاري المعالجة والرفع...</span>
            </div>
          )}
        </div>
      )}

      {compressionInfo && !iconOnly && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-black">
          <Sparkles size={12} className="text-emerald-500 shrink-0" />
          <span>تم التحسين تلقائياً {compressionInfo.savingsPercent ? `(وفر ${compressionInfo.savingsPercent}%)` : ''}</span>
          {compressionInfo.hasAlpha && <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">شفافية 100%</span>}
        </div>
      )}
      
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef}
        onChange={handleFileChange} 
        className="hidden"
        disabled={isUploading}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`${buttonClassName || (iconOnly 
          ? `flex items-center justify-center transition-all ${isUploading ? 'text-primary opacity-50 cursor-not-allowed' : 'text-slate-400 hover:text-primary cursor-pointer'}` 
          : `flex items-center justify-center cursor-pointer gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all w-full max-w-xs ${
          isUploading 
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none' 
            : 'bg-primary text-white hover:bg-primary-dark shadow-xl hover:shadow-primary/30 active:scale-95'
        }`)}`}
      >
        {isUploading ? (
          iconOnly ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Loader2 className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري الضغط والرفع...</span>
            </>
          )
        ) : (
          iconOnly ? (
            <ImageIcon className="w-5 h-5" />
          ) : (
            <>
              <ImageIcon className="w-5 h-5" />
              <span>{buttonText}</span>
            </>
          )
        )}
      </button>
    </div>
  );
}
