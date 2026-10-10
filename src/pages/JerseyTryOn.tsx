import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Download, 
  Camera, 
  ChevronRight, 
  Layers, 
  AlertCircle,
  ArrowRight,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAppStore } from '../store';

import Sidebar from '../components/Sidebar';

const JerseyTryOn: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAppStore();
  const [jerseys, setJerseys] = useState<any[]>([]);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedJersey, setSelectedJersey] = useState<any>(null);
  const [selectedBackground, setSelectedBackground] = useState<string>('room');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<any>({ enabled: true, clubLogo: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch AI config
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'settings', 'ai_config'));
        if (configDoc.exists()) {
          setAiConfig(configDoc.data());
        }
      } catch (err) {
        console.error("Error fetching AI config:", err);
      }
    };

    // Fetch Jerseys
    const jerseysQuery = query(collection(db, 'jerseys'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(jerseysQuery, (snapshot) => {
      const jerseysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJerseys(jerseysData);
      if (jerseysData.length > 0 && !selectedJersey) {
        setSelectedJersey(jerseysData[0]);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jerseys');
      setLoading(false);
    });

    fetchConfig();
    return () => unsubscribe();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserImage(event.target?.result as string);
      
      // Automatic progression: Scroll to jersey selection
      setTimeout(() => {
        const target = document.getElementById('step-jersey');
        if (target) {
          const offset = 100;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = target.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 300);
    };
    reader.readAsDataURL(file);
  };

  const handleJerseySelect = (jersey: any) => {
    setSelectedJersey(jersey);
    // Automatic progression: Scroll to background selection
    setTimeout(() => {
      const target = document.getElementById('step-background');
      if (target) {
        const offset = 100;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = target.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 300);
  };

  const handleBackgroundSelect = (bg: string) => {
    // Ensure it's called 'مود' or 'الخلفية' as per user request
    setSelectedBackground(bg);
    // Automatic progression: Scroll to process button
    setTimeout(() => {
      const target = document.getElementById('process-btn');
      if (target) {
        const offset = 100;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = target.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 300);
  };

  const compressImage = async (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Optimized for AI quota saving: 512px is perfect for face analysis but uses much less data
        const MAX_DIM = 512;
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
        // Lower quality (0.6) significantly reduces bandwidth and token usage
        resolve(canvas.toDataURL('image/jpeg', 0.6).split(',')[1]);
      };
      img.src = dataUrl;
    });
  };

  const processWithAI = async () => {
    if (!profile || !profile.uid) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return;
    }

    if (!userImage) {
      toast.error('يرجى رفع صورتك أولاً');
      return;
    }

    if (!selectedJersey) {
      toast.error('يرجى اختيار قميص');
      return;
    }

    if (profile.isBannedFromAI) {
      toast.error('عذراً، تم حظرك من استخدام الاستوديو. يرجى التواصل مع الإدارة.');
      return;
    }

    setIsProcessing(true);
    setResultImage(null);

    // 1. Quota Check
    const isAdmin = profile.role === 'admin' || (profile.roles && profile.roles.includes('admin'));
    const today = new Date().toISOString().split('T')[0];
    const usageId = `${profile.uid}_${today}`;
    
    try {
      console.log('Checking AI usage quota...');
      let currentUsage = 0;
      try {
        const usageDoc = await getDoc(doc(db, 'ai_usage', usageId));
        currentUsage = usageDoc.exists() ? (usageDoc.data().count || 0) : 0;
      } catch (err) {
        console.warn('Could not read AI usage, continuing with default 0:', err);
      }
      
      const USER_LIMIT = aiConfig.userDailyLimit !== undefined ? Number(aiConfig.userDailyLimit) : 20; 
      const ADMIN_LIMIT = 500;
      const limitCount = isAdmin ? ADMIN_LIMIT : USER_LIMIT;
      
      if (limitCount > 0 && currentUsage >= limitCount) {
        throw new Error(`لقد استنفدت حصتك لهذا اليوم (${limitCount} صور). يمكنك المحاولة مجدداً غداً.`);
      }

      // Scroll to preview area
      setTimeout(() => {
        document.getElementById('preview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      // Compress and convert user image
      console.log('Compressing user image...');
      const userImageBase64 = await compressImage(userImage);
      
      // Fetch jersey image and convert to base64
      console.log('Fetching jersey image:', selectedJersey.url);
      const responseJersey = await fetch(selectedJersey.url);
      if (!responseJersey.ok) {
        throw new Error('فشل تحميل صورة القميص المختار');
      }
      const jerseyBlob = await responseJersey.blob();
      const jerseyDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(jerseyBlob);
      });
      const jerseyImageBase64 = await compressImage(jerseyDataUrl);

      // Fetch club logo for reference
      let logoImageBase64 = '';
      if (aiConfig.clubLogo) {
        try {
          const responseLogo = await fetch(aiConfig.clubLogo);
          if (responseLogo.ok) {
            const logoBlob = await responseLogo.blob();
            const logoDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(logoBlob);
            });
            logoImageBase64 = await compressImage(logoDataUrl);
          }
        } catch (e) {
          console.warn("Could not fetch club logo for AI reference", e);
        }
      }

      // Call server API
      const apiResponse = await fetch('/api/jersey-try-on', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userImageBase64,
          jerseyImageBase64,
          logoImageBase64,
          selectedBackground,
          userId: profile.uid,
          userEmail: profile.email
        }),
      });

      if (!apiResponse.ok) {
        const errData = await apiResponse.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل الاتصال بخادم الذكاء الاصطناعي.');
      }

      const data = await apiResponse.json();
      const generatedImageBase64 = data.imageBase64 || (data.image ? data.image.replace(/^data:image\/\w+;base64,/, '') : '');

      if (generatedImageBase64) {
        // Update usage count
        try {
          await setDoc(doc(db, 'ai_usage', usageId), {
            count: currentUsage + 1,
            lastUsed: new Date().toISOString(),
            userId: profile.uid,
            date: today
          }, { merge: true });

          // Log generation
          await addDoc(collection(db, 'ai_generation_logs'), {
            userId: profile.uid,
            userEmail: profile.email,
            timestamp: serverTimestamp(),
            type: 'jersey_tryon',
            jerseyId: selectedJersey.id,
            mood: selectedBackground
          });
        } catch (err) {
          console.warn('Frontend quota update failed (logging only):', err);
        }

        setResultImage(`data:image/jpeg;base64,${generatedImageBase64}`);
        toast.success('تمت العملية بنجاح! نورت استوديو سيد البلد');
      } else {
        throw new Error('فشل الذكاء الاصطناعي في إنشاء الصورة. يرجى المحاولة مرة أخرى.');
      }

    } catch (error: any) {
      console.error('AI Processing error details:', error);
      
      let errorMessage = '';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Unknown error occurred during processing';
        }
      }

      const isUserQuotaExceeded = errorMessage.includes('حصتك المجانية') || errorMessage.includes('انتهت حصتك');

      const isQuotaError = !isUserQuotaExceeded && (
                          errorMessage.toLowerCase().includes('429') || 
                          errorMessage.toLowerCase().includes('resource_exhausted') || 
                          errorMessage.toLowerCase().includes('quota'));
      
      const isSpendCapError = errorMessage.toLowerCase().includes('monthly spending cap') || 
                             errorMessage.toLowerCase().includes('spend cap');

      const isSafetyError = errorMessage.toLowerCase().includes('safety') || 
                           errorMessage.toLowerCase().includes('blocked');

      if (isUserQuotaExceeded) {
        toast.error(errorMessage);
      } else if (isSpendCapError) {
        toast.error('تم تجاوز سقف الإنفاق الشهري الخاص بمفتاح الـ API. يرجى مراجعة إعدادات Google AI Studio لرفع السقف.');
      } else if (isQuotaError) {
        toast.error(errorMessage.includes('مفوتر') ? errorMessage : 'يتطلب توليد الصور تفعيل خطة الفوترة (Paid Plan) في Google AI Studio. يرجى إعداد الفوترة في الإعدادات.');
      } else if (isSafetyError) {
        toast.error('تم حظر الصورة بواسطة فلاتر الأمان. يرجى استخدام صورة شخصية لائقة وواضحة.');
      } else {
        toast.error(errorMessage || 'حدث خطأ غير متوقع أثناء معالجة الصورة.');
      }
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold">جاري تحميل الاستوديو...</p>
        </div>
      </div>
    );
  }

  if (!aiConfig.enabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background-light dark:bg-background-dark">
        <AlertCircle size={64} className="text-slate-300 mb-4" />
        <h2 className="text-2xl font-black mb-2">هذا القسم مغلق مؤقتاً</h2>
        <p className="text-slate-500 max-w-sm mb-6">يقوم المشرفون حالياً بتحديث هذا القسم، يرجى العودة لاحقاً.</p>
        <Link to="/fanzone" className="bg-primary text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
          <ArrowRight size={20} />
          العودة للفان زون
        </Link>
      </div>
    );
  }

  if (profile.isBannedFromAI) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background-light dark:bg-background-dark">
        <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-xl shadow-red-500/5">
          <Shield size={48} />
        </div>
        <h2 className="text-3xl font-black mb-3">حسابك مقيد من استخدام الاستوديو</h2>
        <p className="text-slate-500 max-w-md mb-8 text-lg font-bold leading-relaxed">
          عذراً يا سيد البلد، تم تقييد وصولك لاستوديو الذكاء الاصطناعي لمخالفة قوانين النشر أو تجاوز حدود الاستخدام. يرجى التواصل مع إدارة التطبيق للمراجعة.
        </p>
        <Link to="/" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 shadow-2xl hover:scale-105 transition-all">
          <ArrowRight size={20} />
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      
      <main className="flex-1 pb-32 overflow-y-auto">
        {/* Header Section */}
        <div className="p-4 md:p-8 space-y-6">
          <Link 
            to="/fanzone" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary font-bold transition-colors mb-4 group"
          >
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-card-dark flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <ChevronRight size={20} />
            </div>
            <span>العودة للفان زون</span>
          </Link>

          <div className="text-center space-y-4 max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              <Sparkles size={16} />
              <span className="text-sm font-bold tracking-wider">استوديو نادي الاتحاد بالذكاء الاصطناعي</span>
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white leading-tight">
              كن جزءاً من <span className="text-primary italic">عظمة سيد البلد</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              ارفع صورتك واختر قميص النادي، ودع الذكاء الاصطناعي يضعك في قلب معقل زعيم الثغر بأجواء إسكندرانية خالصة
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-12 max-w-6xl mx-auto">
            {/* Control Panel */}
            <div className="space-y-8">
              {/* Step 1: Upload */}
              <motion.div 
                id="step-upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-card-dark p-8 rounded-[32px] border border-slate-100 dark:border-border-dark shadow-2xl shadow-slate-200/50 dark:shadow-none scroll-mt-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-sm shadow-lg shadow-primary/30">1</span>
                    ارفع صورتك الشخصية
                  </h3>
                  {userImage && (
                    <button onClick={() => setUserImage(null)} className="text-xs font-bold text-red-500 hover:underline">إلغاء</button>
                  )}
                </div>
                
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`h-64 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${userImage ? 'border-primary bg-primary/5' : 'border-slate-200 group-hover:border-primary group-hover:bg-slate-50 dark:border-border-dark'}`}>
                    {userImage ? (
                      <div className="relative w-full h-full p-3">
                        <img src={userImage} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                          <p className="text-white font-bold text-sm">تغيير الصورة</p>
                        </div>
                        <div className="absolute -top-3 -right-3 bg-primary text-white p-2 rounded-full shadow-lg">
                          <Check size={20} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-all group-hover:rotate-12">
                          <Upload size={32} />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-slate-700 dark:text-slate-200">اختر صورة سيلفي واضحة</p>
                          <p className="text-xs text-slate-400 mt-1">يدعم JPG, PNG (حد أقصى 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Step 2: Jersey Selection */}
              <motion.div 
                id="step-jersey"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-card-dark p-8 rounded-[32px] border border-slate-100 dark:border-border-dark shadow-2xl shadow-slate-200/50 dark:shadow-none scroll-mt-6"
              >
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-sm shadow-lg shadow-primary/30">2</span>
                  اختر تيشيرت النادي
                </h3>
                {jerseys.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {jerseys.map((jersey) => (
                      <button
                        key={jersey.id}
                        onClick={() => handleJerseySelect(jersey)}
                        className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all p-2 group ${selectedJersey?.id === jersey.id ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.02]' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800'}`}
                      >
                        <img src={jersey.url} alt={jersey.name} className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity ${selectedJersey?.id === jersey.id ? 'opacity-100' : 'opacity-0'}`}></div>
                        {selectedJersey?.id === jersey.id && (
                          <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Layers className="mx-auto mb-2 opacity-20" size={48} />
                    <p className="font-bold">سيتم إضافة تيشيرتات قريباً</p>
                  </div>
                )}
                <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between border border-slate-100 dark:border-border-dark">
                  <span className="text-sm font-bold text-slate-500">التيشيرت المختار:</span>
                  <span className="text-sm font-black text-primary">{selectedJersey?.name || '---'}</span>
                </div>
              </motion.div>

              {/* Step 3: Background Selection */}
              <motion.div 
                id="step-background"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-card-dark p-8 rounded-[32px] border border-slate-100 dark:border-border-dark shadow-2xl shadow-slate-200/50 dark:shadow-none scroll-mt-6"
              >
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-sm shadow-lg shadow-primary/30">3</span>
                  اختر المود (بيئة الصورة)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'room', name: 'غرفة مشجع', icon: '🏠' },
                    { id: 'studio', name: 'ستوديو احترافي', icon: '📸' },
                    { id: 'stadium', name: 'داخل الاستاد', icon: '🏟️' },
                    { id: 'birthday', name: 'صورة عيد ميلاد', icon: '🎂' }
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => handleBackgroundSelect(bg.id)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group ${selectedBackground === bg.id ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-50 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:border-slate-200'}`}
                    >
                      <span className="text-3xl group-hover:scale-110 transition-transform">{bg.icon}</span>
                      <span className={`font-black text-sm ${selectedBackground === bg.id ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                        {bg.name}
                      </span>
                      {selectedBackground === bg.id && (
                        <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Action */}
              <motion.button
                id="process-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={processWithAI}
                disabled={!userImage || isProcessing}
                className={`w-full py-5 rounded-[24px] font-black text-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${!userImage || isProcessing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white shadow-[0_20px_40px_-10px_rgba(34,197,94,0.4)]'}`}
              >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin" size={24} />
                      <span>جاري معالجة الصورة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} className="animate-pulse" />
                      <span>إظهار في مظهر المشجع</span>
                    </>
                  )}
                </motion.button>
              </div>

            {/* Preview Section */}
            <div id="preview-section" className="lg:sticky lg:top-8 scroll-mt-6">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-br from-primary to-emerald-400 rounded-[52px] blur-2xl opacity-10 dark:opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="bg-slate-200 dark:bg-card-dark rounded-[48px] aspect-[4/5] relative overflow-hidden border-8 border-white dark:border-slate-800 shadow-2xl">
                  <AnimatePresence mode="wait">
                    {resultImage ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full relative"
                      >
                        <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <div className="flex gap-4">
                            <button 
                              onClick={downloadResult}
                              className="flex-1 bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-primary-hover transition-all shadow-xl shadow-primary/20"
                            >
                              <Download size={24} />
                              تحميل الصورة
                            </button>
                            <button 
                              onClick={() => setResultImage(null)}
                              className="h-14 w-14 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all"
                            >
                              <RefreshCw size={24} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : isProcessing ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full flex flex-col items-center justify-center space-y-8 p-12 text-center"
                      >
                        <div className="relative">
                          <div className="h-32 w-32 border-8 border-primary/10 border-t-primary rounded-full animate-spin"></div>
                          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={48} />
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-2xl font-black italic">لحظات من فضلك...</h4>
                          <p className="text-slate-500 font-bold leading-relaxed px-4">
                            يجري الآن دمج ملامحك مع قميص نادي الاتحاد السكندري باستخدام أحدث تقنيات الذكاء الاصطناعي، لخلق تجربة مشجع واقعية وفريدة.
                          </p>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden max-w-xs mx-auto">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-primary to-emerald-400"
                            animate={{ width: ["0%", "30%", "55%", "70%", "92%"] }}
                            transition={{ duration: 15, ease: "linear" }}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-card-dark dark:to-slate-900">
                        <div className="relative mb-8">
                          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                          <Camera size={96} strokeWidth={1} className="relative text-primary opacity-20" />
                        </div>
                        <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-3 italic">استوديو سيد البلد</h3>
                        <p className="text-lg font-bold opacity-60 max-w-sm">ارفع صورتك وهتظهر هنا بلبس الاتحاد ونورنا في أحسن استوديو مشجعين</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JerseyTryOn;
