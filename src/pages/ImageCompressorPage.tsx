import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  Sliders, 
  RefreshCw, 
  Copy, 
  Check, 
  Eye, 
  X, 
  ArrowLeft, 
  Zap, 
  Maximize2, 
  FileArchive,
  Info,
  ShieldCheck,
  Percent,
  Database,
  Search,
  Filter,
  ArrowRight,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { 
  compressImage, 
  CompressedResult, 
  formatBytes, 
  CompressOptions 
} from '../lib/imageCompressor';
import { Link } from 'react-router-dom';
import { uploadImage, db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAppStore } from '../store';

export interface DbImageItem {
  id: string;
  collection: string;
  docId: string;
  field: string;
  title: string;
  url: string;
  categoryLabel: string;
  isLogoOrTransparent: boolean;
  status: 'pending' | 'optimizing' | 'success' | 'error';
  oldSize?: number;
  newSize?: number;
  error?: string;
  compressedUrl?: string;
}

export default function ImageCompressorPage() {
  // Main Tab: 'upload' for new files, 'database' for existing cloud images
  const [activeTab, setActiveTab] = useState<'upload' | 'database'>('upload');

  // --- Upload Tab State ---
  const [items, setItems] = useState<CompressedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Compression options
  const [quality, setQuality] = useState<number>(0.88);
  const [maxDimension, setMaxDimension] = useState<number | 'original'>('original');
  const [format, setFormat] = useState<'auto' | 'webp' | 'png' | 'jpeg'>('auto');
  const [isDragging, setIsDragging] = useState(false);

  // Split-screen comparison modal
  const [comparisonItem, setComparisonItem] = useState<CompressedResult | null>(null);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profile = useAppStore(state => state.profile);

  // --- Database Images Tab State ---
  const [isScanningDb, setIsScanningDb] = useState(false);
  const [dbImages, setDbImages] = useState<DbImageItem[]>([]);
  const [dbFilter, setDbFilter] = useState<string>('all');
  const [isBatchOptimizingDb, setIsBatchOptimizingDb] = useState(false);
  const [dbProgress, setDbProgress] = useState({ current: 0, total: 0 });
  const [dbSearchQuery, setDbSearchQuery] = useState('');

  // Handle files selection
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      toast.error('يرجى اختيار ملفات صور صالحة (PNG, JPG, WebP, GIF)');
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: validFiles.length });

    const toastId = toast.loading(`جاري ضغط ${validFiles.length} صورة بأعلى جودة مع حفظ الشفافية...`);
    const newResults: CompressedResult[] = [];

    const options: CompressOptions = {
      quality,
      maxDimension,
      format,
      preserveTransparency: true
    };

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const result = await compressImage(file, options);
        newResults.push(result);
      } catch (err: any) {
        console.error('Error compressing file:', file.name, err);
        toast.error(`تعذر ضغط ${file.name}: ${err.message || ''}`);
      }
      setProgress({ current: i + 1, total: validFiles.length });
    }

    setItems(prev => [...newResults, ...prev]);
    setIsProcessing(false);

    if (newResults.length > 0) {
      const totalSaved = newResults.reduce((acc, curr) => acc + (curr.originalSize - curr.compressedSize), 0);
      toast.success(
        `تم ضغط ${newResults.length} صورة بنجاح! وفرت مساحة قدرها ${formatBytes(totalSaved)} 🚀`,
        { id: toastId }
      );
    } else {
      toast.dismiss(toastId);
    }
  }, [quality, maxDimension, format]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard Paste Support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          e.preventDefault();
          toast('تم استقبال الصورة من الحافظة (Clipboard) تلقائياً', { icon: '📋' });
          processFiles(imageFiles);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  // Download single image
  const handleDownloadSingle = (item: CompressedResult) => {
    const a = document.createElement('a');
    a.href = item.previewUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`تم تحميل "${item.name}"`);
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    if (items.length === 0) return;
    const toastId = toast.loading('جاري تجهيز وتحزيم الملفات المضغوطة في أرشيف ZIP...');

    try {
      const zip = new JSZip();
      const folder = zip.folder('compressed-images');

      for (const item of items) {
        folder?.file(item.name, item.blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `compressed_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('تم تحميل الأرشيف المضغوط بنجاح! 📦', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء إنشاء ملف ZIP', { id: toastId });
    }
  };

  // Copy Data URL
  const handleCopyDataUrl = (item: CompressedResult) => {
    navigator.clipboard.writeText(item.dataUrl);
    setCopiedId(item.id);
    toast.success('تم نسخ كود الصورة (Data URL) إلى الحافظة!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Upload to Cloud (Firebase/Cloudinary)
  const handleUploadToCloud = async (item: CompressedResult) => {
    setIsUploadingToCloud(item.id);
    const toastId = toast.loading('جاري رفع الصورة المضغوطة إلى التخزين السحابي...');
    try {
      const url = await uploadImage(item.file, 'compressed-uploads', item.name);
      if (url) {
        navigator.clipboard.writeText(url);
        toast.success('تم الرفع بنجاح ونسخ رابط الصورة السحابي!', { id: toastId });
      } else {
        throw new Error('لم يتم استلام رابط التحميل');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`فشل الرفع: ${err.message || 'خطأ في الشبكة'}`, { id: toastId });
    } finally {
      setIsUploadingToCloud(null);
    }
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Clear all
  const handleClearAll = () => {
    if (items.length === 0) return;
    setItems([]);
    toast.success('تم مسح جميع الصور من القائمة');
  };

  // Total statistics for uploaded files
  const totalOriginalSize = items.reduce((sum, item) => sum + item.originalSize, 0);
  const totalCompressedSize = items.reduce((sum, item) => sum + item.compressedSize, 0);
  const totalSavedBytes = Math.max(0, totalOriginalSize - totalCompressedSize);
  const overallSavingsPercent = totalOriginalSize > 0 
    ? Math.round((totalSavedBytes / totalOriginalSize) * 100) 
    : 0;

  // --- Database Existing Images Scanner Functions ---
  const scanDatabaseImages = async () => {
    setIsScanningDb(true);
    const toastId = toast.loading('جاري فحص جميع الصور والشعارات المخزنة في السحابة...');
    const found: DbImageItem[] = [];

    try {
      // 1. Clubs (Logos)
      try {
        const clubsSnap = await getDocs(collection(db, 'clubs'));
        clubsSnap.forEach(d => {
          const data = d.data();
          if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('http')) {
            found.push({
              id: `${d.id}_logo`,
              collection: 'clubs',
              docId: d.id,
              field: 'logo',
              title: data.name || 'نادي',
              url: data.logo,
              categoryLabel: 'شعارات الأندية 🛡️',
              isLogoOrTransparent: true,
              status: 'pending'
            });
          }
        });
      } catch (e) {
        console.warn('Error reading clubs:', e);
      }

      // 2. Jerseys (Transparent cutouts)
      try {
        const jerseysSnap = await getDocs(collection(db, 'jerseys'));
        jerseysSnap.forEach(d => {
          const data = d.data();
          if (data.image && typeof data.image === 'string' && data.image.startsWith('http')) {
            found.push({
              id: `${d.id}_image`,
              collection: 'jerseys',
              docId: d.id,
              field: 'image',
              title: data.name || 'قميص الاتحاد',
              url: data.image,
              categoryLabel: 'أطقم القمصان 👕',
              isLogoOrTransparent: true,
              status: 'pending'
            });
          }
        });
      } catch (e) {
        console.warn('Error reading jerseys:', e);
      }

      // 3. Member Discounts (Partner logos)
      try {
        const discSnap = await getDocs(collection(db, 'member_discounts'));
        discSnap.forEach(d => {
          const data = d.data();
          if (data.logo && typeof data.logo === 'string' && data.logo.startsWith('http')) {
            found.push({
              id: `${d.id}_logo`,
              collection: 'member_discounts',
              docId: d.id,
              field: 'logo',
              title: data.companyName || 'خصم شريك',
              url: data.logo,
              categoryLabel: 'شعارات الخصومات 🏷️',
              isLogoOrTransparent: true,
              status: 'pending'
            });
          }
        });
      } catch (e) {
        console.warn('Error reading discounts:', e);
      }

      // 4. News
      try {
        const newsSnap = await getDocs(collection(db, 'news'));
        newsSnap.forEach(d => {
          const data = d.data();
          if (data.image && typeof data.image === 'string' && data.image.startsWith('http')) {
            found.push({
              id: `${d.id}_image`,
              collection: 'news',
              docId: d.id,
              field: 'image',
              title: data.title || 'خبر نادي الاتحاد',
              url: data.image,
              categoryLabel: 'الأخبار والتغطيات 📰',
              isLogoOrTransparent: false,
              status: 'pending'
            });
          }
        });
      } catch (e) {
        console.warn('Error reading news:', e);
      }

      // 5. Media
      try {
        const mediaSnap = await getDocs(collection(db, 'media'));
        mediaSnap.forEach(d => {
          const data = d.data();
          const imgUrl = data.url || data.thumbnailUrl;
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http') && data.type !== 'video') {
            found.push({
              id: `${d.id}_url`,
              collection: 'media',
              docId: d.id,
              field: data.url ? 'url' : 'thumbnailUrl',
              title: data.title || 'صورة مالتيميديا',
              url: imgUrl,
              categoryLabel: 'المالتيميديا والمعرض 📷',
              isLogoOrTransparent: false,
              status: 'pending'
            });
          }
        });
      } catch (e) {
        console.warn('Error reading media:', e);
      }

      // 6. Products
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        prodSnap.forEach(d => {
          const data = d.data();
          if (data.image && typeof data.image === 'string' && data.image.startsWith('http')) {
            found.push({
              id: `${d.id}_image`,
              collection: 'products',
              docId: d.id,
              field: 'image',
              title: data.name || 'منتج المتجر',
              url: data.image,
              categoryLabel: 'متجر الجماهير 🛍️',
              isLogoOrTransparent: false,
              status: 'pending'
            });
          }
        });
      } catch (e) {
        console.warn('Error reading products:', e);
      }

      setDbImages(found);
      toast.success(`تم العثور على ${found.length} صورة مخزنة في قاعدة البيانات بنجاح!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء فحص الصور في السحابة', { id: toastId });
    } finally {
      setIsScanningDb(false);
    }
  };

  // Optimize a single database image
  const optimizeSingleDbImage = async (item: DbImageItem) => {
    setDbImages(prev => prev.map(img => img.id === item.id ? { ...img, status: 'optimizing' } : img));
    const toastId = toast.loading(`جاري ضغط وتحديث "${item.title}"...`);

    try {
      let blob: Blob;
      try {
        const res = await fetch(item.url);
        if (!res.ok) throw new Error('Direct fetch failed');
        blob = await res.blob();
      } catch (directErr) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(item.url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('فشل جلب الصورة من الرابط الأصلي');
        blob = await res.blob();
      }

      const file = new File([blob], `${item.docId}_${item.field}.png`, { type: blob.type || 'image/png' });
      const compressed = await compressImage(file, {
        quality: 0.88,
        maxDimension: 1920,
        format: 'auto',
        preserveTransparency: true
      });

      // Upload to Cloud
      const newUrl = await uploadImage(compressed.file, item.collection, compressed.name);
      if (!newUrl) throw new Error('فشل رفع النسخة المضغوطة للسحابة');

      // Update Firestore document
      await updateDoc(doc(db, item.collection, item.docId), {
        [item.field]: newUrl
      });

      setDbImages(prev => prev.map(img => img.id === item.id ? {
        ...img,
        status: 'success',
        compressedUrl: newUrl,
        oldSize: file.size,
        newSize: compressed.compressedSize
      } : img));

      toast.success(`تم ضغط وتحديث "${item.title}" في السحابة بنجاح!`, { id: toastId });
    } catch (err: any) {
      console.error('Failed to optimize db image:', err);
      setDbImages(prev => prev.map(img => img.id === item.id ? {
        ...img,
        status: 'error',
        error: err.message || 'فشل الضغط'
      } : img));
      toast.error(`فشل ضغط الصورة: ${err.message || ''}`, { id: toastId });
    }
  };

  // Batch optimize all pending database images
  const batchOptimizeDbImages = async () => {
    const pendingItems = filteredDbImages.filter(img => img.status !== 'success');
    if (pendingItems.length === 0) {
      toast('جميع الصور المختارة مضغوطة ومحدثة بالفعل في السحابة!', { icon: '✨' });
      return;
    }

    setIsBatchOptimizingDb(true);
    setDbProgress({ current: 0, total: pendingItems.length });
    const toastId = toast.loading(`جاري ضغط وتحديث ${pendingItems.length} صورة في السحابة مع حفظ الشفافية...`);

    let successCount = 0;
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      try {
        await optimizeSingleDbImage(item);
        successCount++;
      } catch (e) {
        console.warn(`Failed optimizing ${item.title}:`, e);
      }
      setDbProgress({ current: i + 1, total: pendingItems.length });
    }

    setIsBatchOptimizingDb(false);
    toast.success(`اكتملت العملية! تم ضغط وتحديث ${successCount} صورة في قاعدة البيانات السحابية بنجاح 🚀`, { id: toastId });
  };

  // Filtered DB images
  const filteredDbImages = dbImages.filter(item => {
    if (dbFilter !== 'all' && item.collection !== dbFilter) return false;
    if (dbSearchQuery.trim()) {
      const q = dbSearchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.categoryLabel.toLowerCase().includes(q);
    }
    return true;
  });

  const totalDbSavedBytes = dbImages
    .filter(item => item.status === 'success' && item.oldSize && item.newSize)
    .reduce((acc, curr) => acc + ((curr.oldSize || 0) - (curr.newSize || 0)), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link 
              to="/admin" 
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-sm font-bold"
            >
              <ArrowLeft size={18} />
              <span>لوحة التحكم</span>
            </Link>
            <div className="h-6 w-[1px] bg-white/10" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black">
              <Zap size={14} />
              معالجة فورية فائقة السرعة
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profile?.role === 'superadmin' || profile?.role === 'admin' ? (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-bold">
                حساب المشرف: {profile.name || 'Admin'}
              </span>
            ) : null}
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/10">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>حفظ شفافية الشعارات واللوجوهات 100% بدون أي خلفية بيضاء أو سوداء</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>الضغط التلقائي عند الرفع مفعّل وشغال في كل أجزاء التطبيق ⚡</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            أداة ضغط الصور والشعارات <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-primary bg-clip-text text-transparent">الذكية</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            اضغط صورك وشعاراتك بأعلى نقاء ممكن دون فقدان التفاصيل الدقيقة. يتم الآن ضغط كافة الصور المرفوعة في التطبيق تلقائياً، كما يمكنك استخدام هذه الأداة لضغط دفعات ملفات أو <strong>فحص وضغط صور المنصة المخزنة حالياً في السحابة بنقرة زر واحدة</strong>.
          </p>

          {/* Mode Tabs Switcher */}
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-white/10 shadow-xl max-w-md mx-auto w-full">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload size={16} />
              <span>ضغط ورفع صور جديدة</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('database');
                if (dbImages.length === 0) {
                  scanDatabaseImages();
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === 'database'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database size={16} />
              <span>صور المنصة الحالية في السحابة</span>
              {dbImages.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950/40 text-xs font-mono">
                  {dbImages.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: NEW UPLOADS & COMPRESSION                         */}
        {/* ======================================================== */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {/* Settings Bar */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Sliders size={20} className="text-emerald-400" />
                  <h2 className="text-base sm:text-lg font-black text-white">إعدادات الضغط وجودة الصورة</h2>
                </div>
                <span className="text-xs text-slate-400 font-medium">معاينة وتطبيق فوري على الصور الجديدة</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Format & Transparency */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                    <span>الصيغة وحفظ الشفافية</span>
                    <span className="text-[11px] text-emerald-400 font-bold">حفظ شفاف 100%</span>
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="auto">تلقائي ذكي (WebP الشفاف - موصى به للجميع)</option>
                    <option value="webp">WebP عالي الدقة (شفافية كاملة + أقصى تقليل للحجم)</option>
                    <option value="png">PNG نقي (شفافية كلاسيكية 100% دون تحويل)</option>
                    <option value="jpeg">JPEG قياسي (للصور الفوتوغرافية فقط)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {format === 'auto' || format === 'webp' 
                      ? '✓ مثالي للشعارات: يحتفظ بالشفافية الكاملة وبأعلى نقاء وبحجم أصغر بنسبة 80%.'
                      : format === 'png'
                      ? '✓ يحافظ على صيغة PNG مع ضغط نقي غير مؤثر على الشفافية.'
                      : '⚠️ تحذير: صيغة JPEG لا تدعم الشفافية وستستبدلها بخلفية تلقائية.'}
                  </p>
                </div>

                {/* Quality Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-300">مستوى حفظ التفاصيل والدقة</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
                      {Math.round(quality * 100)}% {quality >= 0.9 ? '(فائق النقاء)' : quality >= 0.8 ? '(متوازن وممتاز)' : '(ضغط قوي)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.02"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                    <span>ضغط قوي (حجم أصغر)</span>
                    <span>88% (الأمثل)</span>
                    <span>100% (أقصى دقة)</span>
                  </div>
                </div>

                {/* Max Dimensions */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                    <span>الحد الأقصى للأبعاد (العرض/الارتفاع)</span>
                    <span className="text-[11px] text-slate-400">
                      {maxDimension === 'original' ? 'الأبعاد الأصلية بالكامل' : `${maxDimension}px`}
                    </span>
                  </label>
                  <select
                    value={maxDimension}
                    onChange={(e) => setMaxDimension(e.target.value === 'original' ? 'original' : parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="original">الأبعاد الأصلية 100% (بدون أي تصغير للأبعاد)</option>
                    <option value="3840">Ultra HD 4K (حتى 3840 بكسل)</option>
                    <option value="2560">2K QHD (حتى 2560 بكسل)</option>
                    <option value="1920">Full HD (حتى 1920 بكسل - مثالي للشاشات)</option>
                    <option value="1280">HD (حتى 1280 بكسل - خفيف جداً للهواتف)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    اختر &quot;الأبعاد الأصلية&quot; للمحافظة على أبعاد الشعار والصورة كما هي تماماً.
                  </p>
                </div>

              </div>
            </div>

            {/* Upload Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 overflow-hidden ${
                isDragging 
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]' 
                  : 'border-white/15 bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files);
                }}
              />

              <div className="relative z-10 max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-xl shadow-emerald-500/10">
                  <Upload size={36} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    اسحب الصور والشعارات هنا أو انقر للاختيار
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    يدعم اختيار عدة صور معاً (PNG, WebP, JPG, GIF) • يمكنك أيضاً لصق الصورة مباشرة عبر <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-xs">Ctrl + V</kbd>
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>فحص فوري للشفافية + ضغط ذكي فائق النقاء</span>
                </div>
              </div>
            </div>

            {/* Progress Indicator */}
            {isProcessing && (
              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <RefreshCw size={20} className="animate-spin text-emerald-400" />
                  <div>
                    <div className="text-sm font-black text-white">جاري معالجة الصور...</div>
                    <div className="text-xs text-slate-400">
                      تم معالجة {progress.current} من أصل {progress.total}
                    </div>
                  </div>
                </div>
                <div className="w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Global Stats & Batch Actions Bar */}
            {items.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto text-center md:text-right">
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-[11px] text-slate-400 font-bold">العدد</div>
                    <div className="text-xl font-black text-white">{items.length} صور</div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-[11px] text-slate-400 font-bold">الحجم الأصلي</div>
                    <div className="text-xl font-black text-slate-300">{formatBytes(totalOriginalSize)}</div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <div className="text-[11px] text-slate-400 font-bold">الحجم بعد الضغط</div>
                    <div className="text-xl font-black text-emerald-400">{formatBytes(totalCompressedSize)}</div>
                  </div>

                  <div className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-500/20">
                    <div className="text-[11px] text-emerald-300 font-bold">المساحة الموفرة</div>
                    <div className="text-xl font-black text-emerald-400">
                      {overallSavingsPercent}%- <span className="text-xs font-normal text-emerald-200">({formatBytes(totalSavedBytes)})</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={handleDownloadAllZip}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FileArchive size={18} />
                    <span>تحميل الكل (ملف ZIP)</span>
                  </button>

                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-slate-300 hover:text-red-400 font-bold text-sm transition-all"
                  >
                    <Trash2 size={16} />
                    <span>مسح القائمة</span>
                  </button>
                </div>

              </div>
            )}

            {/* Compressed Items Grid */}
            {items.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <span>الصور المضغوطة جاهزة للتحميل ({items.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">انقر على &quot;مقارنة الجودة&quot; للتأكد من عدم فقدان أي تفاصيل</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-slate-900/70 border border-white/10 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl transition-all relative group"
                      >
                        
                        {/* Top row: Badges & Remove */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.hasAlpha ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Layers size={12} />
                                شعار شفاف محفوظ بنجاح ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                <ImageIcon size={12} />
                                صورة فوتوغرافية
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-400 text-[11px] font-mono">
                              {item.outputFormat.replace('image/', '').toUpperCase()}
                            </span>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                            title="حذف من القائمة"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Middle: Preview & Stats */}
                        <div className="flex items-center gap-4">
                          
                          {/* Image Preview with Transparency Checkerboard */}
                          <div 
                            onClick={() => setComparisonItem(item)}
                            className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-white/15 cursor-pointer group/img"
                            style={{
                              backgroundImage: `
                                linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                                linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                                linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                              `,
                              backgroundSize: '16px 16px',
                              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                              backgroundColor: '#0f172a'
                            }}
                          >
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-full h-full object-contain p-1 group-hover/img:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1 backdrop-blur-xs">
                              <Eye size={16} />
                              <span>مقارنة</span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="font-bold text-sm text-white truncate" title={item.name}>
                              {item.name}
                            </div>

                            {/* Size Before & After */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400 line-through">
                                {formatBytes(item.originalSize)}
                              </span>
                              <span className="text-slate-500">➔</span>
                              <span className="font-black text-emerald-400">
                                {formatBytes(item.compressedSize)}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px]">
                                {item.savingsPercent}%-
                              </span>
                            </div>

                            {/* Dimensions */}
                            <div className="text-[11px] text-slate-400">
                              الأبعاد: <span className="font-mono text-slate-300">{item.width} × {item.height}</span> بكسل
                              {item.width !== item.originalWidth && (
                                <span className="text-slate-500 text-[10px] mr-1">(كانت {item.originalWidth}×{item.originalHeight})</span>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Bottom Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={() => handleDownloadSingle(item)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/10 hover:scale-[1.02]"
                          >
                            <Download size={14} />
                            <span>تحميل الصورة</span>
                          </button>

                          <button
                            onClick={() => setComparisonItem(item)}
                            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all"
                            title="مقارنة الجودة مع الأصل"
                          >
                            <Eye size={14} className="text-emerald-400" />
                            <span className="hidden sm:inline">مقارنة التفاصيل</span>
                          </button>

                          <button
                            onClick={() => handleCopyDataUrl(item)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                            title="نسخ كود الصورة Data URL"
                          >
                            {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>

                          <button
                            onClick={() => handleUploadToCloud(item)}
                            disabled={isUploadingToCloud === item.id}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                            title="رفع إلى التخزين السحابي للتطبيق"
                          >
                            <Upload size={14} className={isUploadingToCloud === item.id ? 'animate-spin' : ''} />
                          </button>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: EXISTING DATABASE IMAGES SCANNER & OPTIMIZER      */}
        {/* ======================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            
            {/* Database Scanner Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black">
                  <Database size={14} />
                  فحص ومزامنة صور السحابة مباشرة
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  فحص وضغط صور المنصة المخزنة حالياً
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  يقوم هذا الفاحص بمسح جميع مجموعات Firestore (شعارات الأندية، القمصان، الأخبار، المالتيميديا، المتجر، والشركاء) وضغطها مع الاحتفاظ التام بشفافية اللوجوهات وتحديث روابطها في قاعدة البيانات تلقائياً.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={scanDatabaseImages}
                  disabled={isScanningDb}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-sm transition-all hover:scale-105 disabled:opacity-50"
                >
                  <RefreshCw size={18} className={isScanningDb ? 'animate-spin text-emerald-400' : ''} />
                  <span>{isScanningDb ? 'جاري الفحص...' : 'إعادة فحص السحابة 🔍'}</span>
                </button>

                {dbImages.length > 0 && (
                  <button
                    onClick={batchOptimizeDbImages}
                    disabled={isBatchOptimizingDb}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 disabled:opacity-50"
                  >
                    <Sparkles size={18} className={isBatchOptimizingDb ? 'animate-spin' : ''} />
                    <span>ضغط وتحديث جميع الصور الحالية 🚀</span>
                  </button>
                )}
              </div>
            </div>

            {/* Batch Progress Bar */}
            {isBatchOptimizingDb && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <RefreshCw size={20} className="animate-spin text-emerald-400" />
                  <div>
                    <div className="text-sm font-black text-white">جاري معالجة وتحديث صور قاعدة البيانات...</div>
                    <div className="text-xs text-slate-400">
                      تم تحديث {dbProgress.current} من أصل {dbProgress.total} صورة
                    </div>
                  </div>
                </div>
                <div className="w-40 bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${(dbProgress.current / (dbProgress.total || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats Bar */}
            {dbImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400 font-bold mb-1">إجمالي الصور المكتشفة</div>
                  <div className="text-2xl font-black text-white">{dbImages.length}</div>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400 font-bold mb-1">شعارات ولوجوهات شفافة</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {dbImages.filter(i => i.isLogoOrTransparent).length}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400 font-bold mb-1">تم ضغطها وتحديثها</div>
                  <div className="text-2xl font-black text-teal-300">
                    {dbImages.filter(i => i.status === 'success').length}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400 font-bold mb-1">وفر في التخزين</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {totalDbSavedBytes > 0 ? formatBytes(totalDbSavedBytes) : 'جاهز للبدء'}
                  </div>
                </div>
              </div>
            )}

            {/* Filters & Search */}
            {dbImages.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/10">
                
                {/* Category Chips */}
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'clubs', label: 'شعارات الأندية' },
                    { id: 'jerseys', label: 'القمصان' },
                    { id: 'member_discounts', label: 'الخصومات' },
                    { id: 'news', label: 'الأخبار' },
                    { id: 'media', label: 'المالتيميديا' },
                    { id: 'products', label: 'المتجر' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDbFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                        dbFilter === tab.id
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dbSearchQuery}
                    onChange={(e) => setDbSearchQuery(e.target.value)}
                    placeholder="بحث في الصور..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

              </div>
            )}

            {/* Database Images Grid */}
            {filteredDbImages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDbImages.map((img) => (
                  <div
                    key={img.id}
                    className="bg-slate-900/70 border border-white/10 hover:border-emerald-500/30 rounded-3xl p-4 flex flex-col justify-between gap-4 transition-all"
                  >
                    
                    {/* Top: Header badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                        {img.categoryLabel}
                      </span>

                      {img.isLogoOrTransparent && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          شعار شفاف ✓
                        </span>
                      )}
                    </div>

                    {/* Middle: Preview & Title */}
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/15 p-1 relative"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                            linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                            linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                          `,
                          backgroundSize: '14px 14px',
                          backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px',
                          backgroundColor: '#0f172a'
                        }}
                      >
                        <img
                          src={img.compressedUrl || img.url}
                          alt={img.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // If direct image fails due to CORS, use proxy
                            const target = e.currentTarget;
                            if (!target.src.includes('/api/image-proxy')) {
                              target.src = `/api/image-proxy?url=${encodeURIComponent(img.url)}`;
                            }
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-sm font-bold text-white truncate" title={img.title}>
                          {img.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate" title={img.url}>
                          {img.collection} / {img.field}
                        </div>

                        {img.status === 'success' && img.oldSize && img.newSize && (
                          <div className="text-[10px] font-black text-emerald-400">
                            تم الضغط: {formatBytes(img.oldSize)} ➔ {formatBytes(img.newSize)}
                          </div>
                        )}
                        {img.status === 'error' && (
                          <div className="text-[10px] font-black text-red-400 truncate">
                            {img.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Action */}
                    <div className="pt-2 border-t border-white/5">
                      {img.status === 'success' ? (
                        <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-black text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 size={14} />
                          <span>محدثة ومضغوطة في السحابة ✓</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => optimizeSingleDbImage(img)}
                          disabled={img.status === 'optimizing' || isBatchOptimizingDb}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-slate-950 border border-white/10 hover:border-emerald-500 text-slate-200 text-xs font-black transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                        >
                          <Zap size={14} className={img.status === 'optimizing' ? 'animate-spin' : ''} />
                          <span>{img.status === 'optimizing' ? 'جاري الضغط والتحديث...' : 'ضغط وتحديث في السحابة فوراً ⚡'}</span>
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            ) : isScanningDb ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw size={36} className="mx-auto animate-spin text-emerald-400" />
                <p className="text-sm font-bold text-slate-300">جاري قراءة وفحص صور المنصة في Firestore...</p>
              </div>
            ) : (
              <div className="py-16 text-center space-y-4 border border-dashed border-white/10 rounded-3xl bg-slate-900/30">
                <Database size={40} className="mx-auto text-slate-500" />
                <div className="space-y-1">
                  <h4 className="text-base font-black text-white">لم يتم بدء الفحص بعد</h4>
                  <p className="text-xs text-slate-400">انقر على الزر أدناه لبدء فحص جميع الصور المخزنة في قاعدة البيانات</p>
                </div>
                <button
                  onClick={scanDatabaseImages}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
                >
                  بدء فحص صور السحابة الآن 🔍
                </button>
              </div>
            )}

          </div>
        )}

        {/* Feature Highlights & Explanations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 border-t border-white/10">
          
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers size={24} />
            </div>
            <h4 className="text-base font-black text-white">حفظ شفافية الشعارات واللوجوهات</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              تكتشف الخوارزمية قناة الشفافية (Alpha Channel) في شعارات الأندية وأطقم القمصان وتحفظها نقية 100% دون أي خلفيات بيضاء أو سوداء مشوهة.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Sparkles size={24} />
            </div>
            <h4 className="text-base font-black text-white">تحسين حي تلقائي للصور الحالية</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              تُعرض الصور الحالية تلقائياً بصيغ WebP المحسنة مع تحديد أبعاد العرض وتفعيل التحميل الكسول (Lazy Loading) لتوفير الباقة وتسريع التصفح لجميع المستخدمين.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database size={24} />
            </div>
            <h4 className="text-base font-black text-white">تحديث دائم في قاعدة البيانات</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              من خلال تبويب &quot;صور المنصة الحالية&quot;، يمكنك بنقرة زر واحدة استبدال الصور الثقيلة الأصلية بنسخ مضغوطة فائقة النقاء داخل السحابة مباشرة.
            </p>
          </div>

        </div>

      </div>

      {/* Split-Screen Detail Comparison Modal */}
      <AnimatePresence>
        {comparisonItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/20 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Eye size={20} className="text-emerald-400" />
                    <span>مقارنة الدقة والتفاصيل (قبل وبعد الضغط)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    حرك شريط الانزلاق لمقارنة الصورة الأصلية بالصورة المضغوطة بالبيكسل
                  </p>
                </div>
                <button
                  onClick={() => setComparisonItem(null)}
                  className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: Interactive Slider */}
              <div className="flex-1 p-5 overflow-auto flex flex-col items-center justify-center">
                
                <div 
                  className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border border-white/20 select-none shadow-2xl"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                      linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                      linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px, 10px -10px, -10px 0px',
                    backgroundColor: '#0f172a'
                  }}
                >
                  {/* Before (Original) */}
                  <img
                    src={comparisonItem.originalPreviewUrl}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain p-2"
                  />

                  {/* After (Compressed) with clip path */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 0 0 ${100 - splitPos}%)` }}
                  >
                    <img
                      src={comparisonItem.previewUrl}
                      alt="Compressed"
                      className="absolute inset-0 w-full h-full object-contain p-2"
                    />
                  </div>

                  {/* Split Line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-emerald-400 shadow-[0_0_12px_#34d399] z-20 pointer-events-none"
                    style={{ left: `${splitPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-lg">
                      ⇔
                    </div>
                  </div>

                  {/* Badges on images */}
                  <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-slate-300 text-xs font-bold border border-white/10">
                    الأصلية ({formatBytes(comparisonItem.originalSize)})
                  </div>
                  <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-xl bg-emerald-500/80 backdrop-blur-md text-slate-950 text-xs font-black border border-emerald-400/30">
                    المضغوطة ({formatBytes(comparisonItem.compressedSize)}) • {comparisonItem.savingsPercent}%-
                  </div>
                </div>

                {/* Slider Control */}
                <div className="w-full max-w-md mt-6 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>الصورة الأصلية ⬅️</span>
                    <span className="text-emerald-400 font-black">اسحب للمقارنة</span>
                    <span>➡️ الصورة المضغوطة</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={splitPos}
                    onChange={(e) => setSplitPos(parseInt(e.target.value, 10))}
                    className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-ew-resize accent-emerald-500"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-white/10 flex items-center justify-between gap-4">
                <div className="text-xs text-slate-400">
                  {comparisonItem.hasAlpha && '✓ تم الحفاظ على شفافية الشعار بنسبة 100%'}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownloadSingle(comparisonItem)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Download size={14} />
                    <span>تحميل النسخة المضغوطة</span>
                  </button>
                  <button
                    onClick={() => setComparisonItem(null)}
                    className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs"
                  >
                    إغلاق
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
