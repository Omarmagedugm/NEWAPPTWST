import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Loader2, 
  Play, 
  ExternalLink,
  Sparkles,
  Info,
  Layers,
  GraduationCap,
  Video
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, doc, writeBatch, setDoc } from 'firebase/firestore';
import { useAppStore, MediaItem, EducationVideo } from '../../store';
import { extractYouTubeId, getYouTubeThumbnail } from '../../lib/videoUtils';
import { logAdminActivity } from '../../lib/auditLogger';

export interface ParsedVideoRow {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  duration: string;
  isFeatured: boolean;
  description: string;
  instructor: string;
  youtubeId?: string | null;
  isValid: boolean;
  validationError?: string;
}

interface CsvVideosImporterProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDestination?: 'media' | 'education';
  onSuccess?: () => void;
}

// Robust CSV Line Parser handling quotes, escaped quotes, and various delimiters
function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export default function CsvVideosImporter({ 
  isOpen, 
  onClose, 
  defaultDestination = 'media',
  onSuccess 
}: CsvVideosImporterProps) {
  const { mediaPlaylists, addMedia, addEducationVideo } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [destination, setDestination] = useState<'media' | 'education'>(defaultDestination);
  const [parsedRows, setParsedRows] = useState<ParsedVideoRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  // Download Sample CSV Template
  const downloadSampleCsv = () => {
    let sampleHeaders = '';
    let sampleData = '';

    if (destination === 'media') {
      sampleHeaders = 'عنوان الفيديو,رابط الفيديو,الصورة المصغرة,القسم,المدة,مميز,الوصف\n';
      sampleData = [
        'ملخص مباراة الاتحاد والأهلي - صالة الشاطبي,https://www.youtube.com/watch?v=dQw4w9WgXcQ,,مباريات السلة,12:45,نعم,ملخص أحداث قمة دوري السوبر لكرة السلة بين زعيم الثغر والأهلي',
        'أهداف الاتحاد السكندري وبلدية المحلة في الدوري,https://www.youtube.com/watch?v=dQw4w9WgXcQ,,أهداف ومباريات,04:20,نعم,جميع أهداف اللقاء المثير لنادي الاتحاد السكندري',
        'كواليس تدريبات سيد البلد بملعب الشاطبي,https://www.youtube.com/watch?v=dQw4w9WgXcQ,,تدريبات الفريق,08:15,لا,استعدادات الفريق الأول للمباراة القادمة',
        'هتافات جمهور الاتحاد السكندري في المدرجات,https://www.youtube.com/watch?v=dQw4w9WgXcQ,,أهازيج جماهيرية,05:10,لا,أجمل هتافات وأناشيد جماهير الاتحاد الخضراء'
      ].join('\n');
    } else {
      sampleHeaders = 'عنوان الفيديو,رابط الفيديو,المحاضر,التصنيف,المدة,مميز,الوصف\n';
      sampleData = [
        'مقدمة في البرمجة وتطوير الويب (HTML & CSS),https://www.youtube.com/watch?v=dQw4w9WgXcQ,م. كريم عادل,برمجة وتكنولوجيا,25:30,نعم,دورة تمهيدية لشباب الإسكندرية لتعلم أساسيات تصميم المواقع',
        'أساسيات اللغة الإنجليزية للمبتدئين من الصفر,https://www.youtube.com/watch?v=dQw4w9WgXcQ,أ. سارة فهمي,لغات وترجمة,18:40,نعم,أهم المحادثات والكلمات الشائعة للتحدث بثقة',
        'دورة التسويق الرقمي وإدارة الحملات الإعلانية,https://www.youtube.com/watch?v=dQw4w9WgXcQ,م. تامر ممدوح,تسويق ومبيعات,30:15,لا,كيف تبدأ أول حملة إعلانية ناجحة عبر السوشيال ميديا',
        'كتابة السيرة الذاتية واجتياز مقابلات العمل,https://www.youtube.com/watch?v=dQw4w9WgXcQ,د. منى سليم,تطوير ذات ومهارات,15:00,لا,نصائح عملية للقبول في الشركات الكبرى'
      ].join('\n');
    }

    const csvContent = '\uFEFF' + sampleHeaders + sampleData; // UTF-8 BOM for Excel Arabic support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = destination === 'media' ? 'Ittihad_Videos_Template.csv' : 'Ittihad_Education_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('تم تنزيل نموذج CSV بنجاح!');
  };

  // Helper to detect CSV delimiter
  const detectDelimiter = (firstLine: string): string => {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
  };

  // Process File
  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('يرجى اختيار ملف بصيغة CSV فقط.');
      return;
    }

    setIsProcessingFile(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');

      if (lines.length < 2) {
        toast.error('الملف فارغ أو لا يحتوي على صفوف بيانات.');
        setIsProcessingFile(false);
        return;
      }

      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase().replace(/^\uFEFF/, ''));

      // Normalize Header Indices
      const getIndex = (possibleNames: string[]): number => {
        return headers.findIndex(h => possibleNames.some(name => h.includes(name.toLowerCase())));
      };

      const titleIdx = getIndex(['عنوان الفيديو', 'العنوان', 'title', 'name', 'اسم الفيديو', 'اسم']);
      const urlIdx = getIndex(['رابط الفيديو', 'الرابط', 'url', 'video_url', 'link', 'youtube', 'فيديو']);
      const thumbIdx = getIndex(['الصورة المصغرة', 'صورة', 'thumbnail', 'thumb', 'image']);
      const categoryIdx = getIndex(['القسم', 'التصنيف', 'قائمة', 'category', 'playlist', 'مجال']);
      const durationIdx = getIndex(['المدة', 'وقت', 'duration', 'time']);
      const featuredIdx = getIndex(['مميز', 'featured', 'isfeatured', 'تمييز']);
      const descIdx = getIndex(['الوصف', 'تفاصيل', 'description', 'desc']);
      const instructorIdx = getIndex(['المحاضر', 'المعلق', 'المدرب', 'instructor', 'author', 'speaker']);

      if (titleIdx === -1 && urlIdx === -1) {
        toast.error('لم يتم العثور على أعمدة عنوان الفيديو أو الرابط في الملف.');
        setIsProcessingFile(false);
        return;
      }

      const rows: ParsedVideoRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCsvLine(line, delimiter);
        const title = (values[titleIdx] || '').trim();
        const rawUrl = (values[urlIdx] || '').trim();
        let thumb = thumbIdx !== -1 ? (values[thumbIdx] || '').trim() : '';
        const category = categoryIdx !== -1 ? (values[categoryIdx] || '').trim() : '';
        const duration = durationIdx !== -1 ? (values[durationIdx] || '').trim() : '';
        const featuredVal = featuredIdx !== -1 ? (values[featuredIdx] || '').trim().toLowerCase() : '';
        const desc = descIdx !== -1 ? (values[descIdx] || '').trim() : '';
        const instructor = instructorIdx !== -1 ? (values[instructorIdx] || '').trim() : '';

        const isFeatured = ['نعم', 'true', '1', 'yes', 'نعم مميز'].includes(featuredVal);

        // YouTube ID extraction
        const ytId = extractYouTubeId(rawUrl);
        if (!thumb && ytId) {
          thumb = getYouTubeThumbnail(rawUrl) || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        } else if (!thumb) {
          thumb = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80';
        }

        // Validation
        let isValid = true;
        let validationError = '';

        if (!title) {
          isValid = false;
          validationError = 'العنوان مفقود';
        } else if (!rawUrl) {
          isValid = false;
          validationError = 'رابط الفيديو مفقود';
        } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !ytId) {
          isValid = false;
          validationError = 'الرابط غير صالح';
        }

        rows.push({
          id: `csv_vid_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          title,
          url: rawUrl,
          thumbnailUrl: thumb,
          category: category || (destination === 'media' ? 'فيديوهات عامة' : 'عام'),
          duration: duration || '05:00',
          isFeatured,
          description: desc,
          instructor: instructor || (destination === 'education' ? 'نادي الاتحاد السكندري' : ''),
          youtubeId: ytId,
          isValid,
          validationError
        });
      }

      setParsedRows(rows);
      if (rows.length === 0) {
        toast.error('لم يتم استخراج أي بيانات صالحة من الملف.');
      } else {
        const validCount = rows.filter(r => r.isValid).length;
        toast.success(`تمت معالجة ${rows.length} فيديو (${validCount} صالح)`);
      }
    } catch (err: any) {
      toast.error(`حدث خطأ أثناء قراءة الملف: ${err.message}`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeRow = (id: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== id));
  };

  // Perform Bulk Upload to Firestore
  const handleBulkUpload = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('لا توجد فيديوهات صالحة للرفع.');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validRows.length });

    try {
      const nowIso = new Date().toISOString();
      const BATCH_SIZE = 400; // Safe Firestore limit (max 500)

      const createdMediaList: MediaItem[] = [];
      const createdEduList: EducationVideo[] = [];

      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = validRows.slice(i, i + BATCH_SIZE);

        for (const row of chunk) {
          if (destination === 'media') {
            const mediaRef = doc(collection(db, 'media'));
            
            // Match playlist if found
            const matchedPlaylist = mediaPlaylists.find(p => 
              p.title.trim().toLowerCase() === row.category.trim().toLowerCase()
            );

            const mediaData: MediaItem = {
              id: mediaRef.id,
              title: row.title,
              type: 'video',
              source: row.youtubeId ? 'youtube' : 'upload',
              url: row.url,
              videoUrl: row.url,
              thumbnailUrl: row.thumbnailUrl,
              date: nowIso.split('T')[0],
              duration: row.duration,
              isFeatured: row.isFeatured,
              playlistId: matchedPlaylist?.id || undefined,
              createdAt: nowIso
            };
            batch.set(mediaRef, mediaData);
            createdMediaList.push(mediaData);
          } else {
            // Education Video
            const eduRef = doc(collection(db, 'education_videos'));
            const eduData: EducationVideo = {
              id: eduRef.id,
              title: row.title,
              description: row.description || `فيديو تعليمي مقدم لجمهور الاتحاد السكندري في قسم ${row.category}`,
              instructor: row.instructor || 'نادي الاتحاد السكندري',
              category: row.category,
              youtubeUrl: row.url,
              youtubeId: row.youtubeId || '',
              thumbnailUrl: row.thumbnailUrl,
              duration: row.duration,
              views: 0,
              likes: 0,
              order: 1,
              isFeatured: row.isFeatured,
              createdAt: nowIso
            };
            batch.set(eduRef, eduData);
            createdEduList.push(eduData);
          }
        }

        await batch.commit();
        setUploadProgress({ current: Math.min(i + BATCH_SIZE, validRows.length), total: validRows.length });
      }

      // Update local Zustand store safely without duplicates
      if (destination === 'media') {
        const existingIds = new Set(useAppStore.getState().media.map(m => m.id));
        const newItems = createdMediaList.filter(m => !existingIds.has(m.id));
        if (newItems.length > 0) {
          useAppStore.setState(state => ({ media: [...newItems, ...state.media] }));
        }
      } else {
        const existingIds = new Set(useAppStore.getState().educationVideos.map(v => v.id));
        const newItems = createdEduList.filter(v => !existingIds.has(v.id));
        if (newItems.length > 0) {
          useAppStore.setState(state => ({ educationVideos: [...newItems, ...state.educationVideos] }));
        }
      }

      // Log activity
      await logAdminActivity({
        action: 'create',
        collectionName: destination === 'media' ? 'media' : 'education_videos',
        collectionLabel: destination === 'media' ? 'ميديا وفيديوهات النادي' : 'فيديوهات التعليم المجاني',
        itemId: `bulk_csv_${Date.now()}`,
        itemTitle: `رفع ${validRows.length} فيديو بالجملة عبر CSV`,
        details: `تم استيراد ${validRows.length} فيديو بنجاح إلى قسم ${destination === 'media' ? 'الميديا' : 'التعليم المجاني'}`
      });

      toast.success(`تم استيراد ${validRows.length} فيديو بنجاح إلى ${destination === 'media' ? 'ميديا النادي' : 'فيديوهات التعليم'}! 🟢`);
      setParsedRows([]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, destination === 'media' ? 'media' : 'education_videos');
      toast.error(`حدث خطأ أثناء الرفع: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-surface-dark/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>استيراد فيديوهات متعددة عبر CSV</span>
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Bulk Importer
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                أضف عشرات الفيديوهات دفعة واحدة من ملف إكسل أو Google Sheets مع استخراج الصور التلقائي
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-dark transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-6">
          {/* Destination Selector */}
          <div>
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 block">
              اختر وجهة حفظ الفيديوهات:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDestination('media')}
                disabled={isUploading || parsedRows.length > 0}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-right ${
                  destination === 'media'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20'
                    : 'border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-surface-dark text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${destination === 'media' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-surface-dark text-slate-500'}`}>
                  <Video size={18} />
                </div>
                <div>
                  <div className="text-xs font-black">ميديا وفيديوهات النادي</div>
                  <div className="text-[10px] text-slate-400 font-bold">ملخصات المباريات، الأهداف، التدريبات والكواليس</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDestination('education')}
                disabled={isUploading || parsedRows.length > 0}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-right ${
                  destination === 'education'
                    ? 'border-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-surface-dark text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${destination === 'education' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-surface-dark text-slate-500'}`}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <div className="text-xs font-black">فيديوهات التعليم المجاني</div>
                  <div className="text-[10px] text-slate-400 font-bold">كورسات الجمهور، لغات، برمجة، تسويق، وتطوير الذات</div>
                </div>
              </button>
            </div>
          </div>

          {/* Action Bar: Download Sample Template */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Download size={16} />
              </div>
              <div>
                <div className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                  هل تحتاج لملف CSV نموذجي جاهز للملء؟
                </div>
                <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-bold">
                  حمل الملف وافتحه ببرنامج Excel أو Google Sheets وأضف روابط يوتيوب الخاصة بك مباشرة.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadSampleCsv}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all shrink-0"
            >
              <Download size={14} />
              <span>تحميل النموذج ({destination === 'media' ? 'الميديا' : 'التعليم'})</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 scale-[0.99]' 
                  : 'border-slate-200 dark:border-border-dark hover:border-emerald-500/50 bg-slate-50/50 dark:bg-surface-dark/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />

              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
                {isProcessingFile ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <Upload size={32} />
                )}
              </div>

              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white mb-1">
                {isProcessingFile ? 'جاري قراءة ومعالجة ملف CSV...' : 'اسحب وأفلت ملف CSV هنا، أو انقر للاختيار'}
              </h3>
              <p className="text-xs text-slate-400 font-bold mb-5 max-w-md mx-auto">
                يدعم الملف أعمدة (عنوان الفيديو، رابط الفيديو، الصورة المصغرة، التصنيف، المدة، مميز، الوصف).
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <FileSpreadsheet size={16} />
                <span>اختر ملف من جهازك</span>
              </button>
            </div>
          ) : (
            /* Parsed Rows Preview */
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    تمت قراءة <strong className="text-primary">{parsedRows.length}</strong> فيديو
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                    {validCount} صالح للرفع
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-[10px] font-black px-2.5 py-1 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
                      {invalidCount} يحتاج لتعديل
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isUploading}
                    className="text-xs font-bold text-slate-500 hover:text-red-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>إلغاء واختيار ملف آخر</span>
                  </button>
                </div>
              </div>

              {/* Table / List */}
              <div className="border border-border-light dark:border-border-dark rounded-2xl overflow-hidden divide-y divide-border-light dark:divide-border-dark max-h-80 overflow-y-auto">
                {parsedRows.map((row, idx) => (
                  <div 
                    key={row.id}
                    className={`p-3.5 flex items-center gap-3.5 transition-all ${
                      row.isValid 
                        ? 'bg-white dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-surface-dark/40' 
                        : 'bg-red-50/50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold text-slate-400 w-6 text-center shrink-0">
                      #{idx + 1}
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="w-16 h-11 rounded-xl overflow-hidden bg-slate-100 dark:bg-surface-dark relative shrink-0 border border-slate-200 dark:border-border-dark">
                      <img 
                        src={row.thumbnailUrl} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }} 
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play size={12} className="text-white fill-white" />
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                          {row.title || <span className="text-red-500 italic">بدون عنوان</span>}
                        </h4>
                        {row.isFeatured && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded flex items-center gap-0.5 shrink-0">
                            <Sparkles size={9} />
                            مميز
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className="bg-slate-100 dark:bg-surface-dark px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300">
                          {row.category}
                        </span>
                        {row.duration && (
                          <span className="font-mono">{row.duration}</span>
                        )}
                        {row.instructor && (
                          <span className="truncate max-w-[120px]">بواسطة: {row.instructor}</span>
                        )}
                        <a 
                          href={row.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                        >
                          <ExternalLink size={10} />
                          <span>فتح الرابط</span>
                        </a>
                      </div>
                    </div>

                    {/* Status & Delete Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {row.isValid ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-500/20">
                          <CheckCircle2 size={12} />
                          <span>جاهز</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-lg flex items-center gap-1 border border-red-500/20" title={row.validationError}>
                          <AlertCircle size={12} />
                          <span>{row.validationError}</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-surface-dark rounded-lg transition-all"
                        title="حذف هذا الصف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-black text-emerald-700 dark:text-emerald-300">
                <span>جاري حفظ الفيديوهات في قاعدة البيانات...</span>
                <span>{uploadProgress.current} من {uploadProgress.total}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-emerald-200 dark:bg-emerald-950 overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / Math.max(1, uploadProgress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-surface-dark/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-xl border border-border-light dark:border-border-dark text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-surface-dark transition-all"
          >
            إغلاق
          </button>

          {parsedRows.length > 0 && (
            <button
              type="button"
              onClick={handleBulkUpload}
              disabled={isUploading || validCount === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري الرفع ({uploadProgress.current}/{uploadProgress.total})...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>حفظ وإضافة {validCount} فيديو الآن 🟢</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
