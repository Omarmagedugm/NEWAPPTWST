import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Sparkles, RefreshCw, Check, Download, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store';

const JERSEYS = [
  { id: 'home', name: 'القميص الأساسي 2024', url: 'https://res.cloudinary.com/dv3f1rzbm/image/upload/v1741203000/jerseys/home_jersey.jpg' },
  { id: 'away', name: 'القميص الاحتياطي 2024', url: 'https://res.cloudinary.com/dv3f1rzbm/image/upload/v1741203000/jerseys/away_jersey.jpg' },
  { id: 'classic', name: 'القميص التاريخي', url: 'https://res.cloudinary.com/dv3f1rzbm/image/upload/v1741203000/jerseys/classic_jersey.jpg' },
];

const AIJerseyTryOn: React.FC = () => {
  const { profile } = useAppStore();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedJersey, setSelectedJersey] = useState(JERSEYS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const compressImage = async (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimension 1024px for faster/reliable processing
        const MAX_DIM = 1024;
        if (width > height && width > MAX_DIM) {
          height = (height * MAX_DIM) / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = (width * MAX_DIM) / height;
          height = MAX_DIM;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
      };
      img.src = dataUrl;
    });
  };

  const processWithAI = async () => {
    if (!userImage) {
      toast.error('يرجى رفع صورتك أولاً');
      return;
    }

    setIsProcessing(true);
    setResultImage(null);

    try {
      // Compress and convert user image
      const userImageBase64 = await compressImage(userImage);
      
      // Fetch jersey image and convert to base64
      const responseJersey = await fetch(selectedJersey.url);
      if (!responseJersey.ok) throw new Error('فشل تحميل صورة القميص');
      const jerseyBlob = await responseJersey.blob();
      const jerseyDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(jerseyBlob);
      });
      const jerseyImageBase64 = await compressImage(jerseyDataUrl);

      console.log('Sending request to server AI endpoint...');
      const response = await fetch('/api/ai/jersey-tryon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userImageBase64,
          jerseyImageBase64,
          userId: profile.uid,
          userEmail: profile.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل الاتصال بخادم الذكاء الاصطناعي');
      }

      const data = await response.json();
      if (data.image) {
        setResultImage(data.image);
        toast.success('تمت العملية بنجاح! نورت استوديو سيد البلد');
      } else {
        throw new Error('الذكاء الاصطناعي لم يتمكن من توليد الصورة، ربما بسبب قيود المحتوى أو جودة الصورة المرفوعة.');
      }

    } catch (error: any) {
      console.error('AI Processing error:', error);
      toast.error(`حدث خطأ: ${error.message || 'يرجى المحاولة مرة أخرى.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `itthad-fan-me-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20"
        >
          <Sparkles size={16} />
          <span className="text-sm font-bold">تجربة القميص بالذكاء الاصطناعي</span>
        </motion.div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          كن جزءاً من <span className="text-primary italic">غرفة سيد البلد</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          ارفع صورتك واختر قميصك المفضل، واترك الذكاء الاصطناعي يضعك في قلب مدرج زعيم الثغر
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Controls */}
        <div className="space-y-6">
          {/* Step 1: Upload */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-100 dark:border-border-dark shadow-xl shadow-slate-200/50 dark:shadow-none">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">1</span>
              ارفع صورتك الشخصية
            </h3>
            
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`h-48 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${userImage ? 'border-primary bg-primary/5' : 'border-slate-200 group-hover:border-primary group-hover:bg-slate-50 dark:border-border-dark'}`}>
                {userImage ? (
                  <div className="relative w-full h-full p-2">
                    <img src={userImage} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    <div className="absolute top-4 right-4 bg-primary text-white p-1 rounded-full">
                      <Check size={16} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">اختر صورة أو اسحبها هنا</p>
                  </>
                )}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">يرجى استخدام صورة واضحة للوجه للحصول على أفضل نتيجة</p>
          </div>

          {/* Step 2: Choose Jersey */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-100 dark:border-border-dark shadow-xl shadow-slate-200/50 dark:shadow-none">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">2</span>
              اختر القميص
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {JERSEYS.map((jersey) => (
                <button
                  key={jersey.id}
                  onClick={() => setSelectedJersey(jersey)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all p-1 ${selectedJersey.id === jersey.id ? 'border-primary ring-4 ring-primary/10' : 'border-transparent bg-slate-50 dark:bg-slate-800'}`}
                >
                  <img src={jersey.url} alt={jersey.name} className="w-full h-full object-contain" />
                  {selectedJersey.id === jersey.id && (
                    <div className="absolute top-1 right-1 bg-primary text-white scale-75 p-1 rounded-full">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-center mt-3 text-primary">{selectedJersey.name}</p>
          </div>

          {/* Action Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={processWithAI}
          disabled={!userImage || isProcessing}
          className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all relative overflow-hidden ${!userImage || isProcessing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] hover:scale-[1.02]'} ${isProcessing ? 'animate-shimmer' : ''}`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="animate-spin" size={24} />
              <span>جاري الدمج السحرى...</span>
            </>
          ) : (
            <>
              <Sparkles size={24} />
              <span>تحويل لصورة مشجع اتحاداوي</span>
            </>
          )}
        </motion.button>
        </div>

        {/* Right Column: Result */}
        <div className="sticky top-24">
          <div className="bg-slate-100 dark:bg-card-dark rounded-[40px] aspect-square relative overflow-hidden group border-4 border-white dark:border-border-dark shadow-2xl">
            <AnimatePresence mode="wait">
              {resultImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-6 px-6 flex gap-3">
                    <button 
                      onClick={downloadResult}
                      className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-all"
                    >
                      <Download size={20} />
                      تحميل الصورة
                    </button>
                    <button 
                      onClick={() => setResultImage(null)}
                      className="bg-white text-primary p-3 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full flex flex-col items-center justify-center space-y-6 p-8 text-center"
                >
                  <div className="relative">
                    <div className="h-24 w-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black italic">نجهزلك الصورة يا عريس</h4>
                    <p className="text-slate-500 text-sm">الذكاء الاصطناعي بيحضرلك الدخلة التاريخية في غرفة العصافيري</p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      animate={{ width: ["0%", "40%", "60%", "95%"] }}
                      transition={{ duration: 10, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-card-dark dark:to-slate-900">
                  <Camera size={64} strokeWidth={1} className="mb-6 opacity-20" />
                  <p className="font-bold text-lg">ارفع صورتك وهتظهر هنا بعد التحويل</p>
                  <p className="text-sm opacity-60">ملامح وجهك هتفضل هي هي بس بلبس الاتحاد وفي أجواء إسكندرانية</p>
                </div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Badge */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex-1 h-px bg-slate-100 dark:bg-border-dark"></span>
            <span>Powered by Gemini 2.0 Flash</span>
            <span className="flex-1 h-px bg-slate-100 dark:bg-border-dark"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIJerseyTryOn;
