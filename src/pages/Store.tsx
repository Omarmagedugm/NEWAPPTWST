import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  ChevronRight, 
  ShoppingCart, 
  CheckCircle2, 
  X, 
  Phone, 
  MapPin, 
  User, 
  ExternalLink,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Filter,
  PackageCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, Product } from '../store';
import { useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot } from 'firebase/firestore';
import { getOptimizedImage } from '../lib/cloudinary';

export default function Store() {
  const navigate = useNavigate();
  const { products, setProducts, profile, appSettings } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>('');
  const [lastOrderRef, setLastOrderRef] = useState<string>('');
  
  // Order Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    quantity: 1,
    notes: ''
  });

  // Pre-fill user profile info when opening form
  useEffect(() => {
    if (showOrderForm && profile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.displayName || profile.name || '',
        phone: prev.phone || profile.phoneNumber || profile.phone || '',
      }));
    }
  }, [showOrderForm, profile]);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));
    return () => unsubscribe();
  }, [setProducts]);

  const categories = [
    { id: 'all', label: 'الكل', icon: <ShoppingBag size={14} /> },
    { id: 'tshirt', label: 'تيشيرتات', icon: <User size={14} /> },
    { id: 'mug', label: 'مجات', icon: <Filter size={14} /> },
    { id: 'scarf', label: 'سكارفات', icon: <Filter size={14} /> },
    { id: 'bracelet', label: 'حظاظات', icon: <Filter size={14} /> },
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getWhatsAppTargetUrl = (orderRef: string, product: Product, quantity: number, customer: { name: string; phone: string; address: string; notes?: string }) => {
    const totalPrice = product.price * quantity;
    const message = `👋 مرحباً @itthadalexchannel، أرغب في تأكيد طلب شراء من متجر تطبيق قناة الاتحاد 🟢⚪

🛍️ المنتج: ${product.name}
🔢 الكمية: ${quantity}
💰 إجمالي المبلغ: ${totalPrice.toLocaleString()} ج.م
🔖 كود الطلب: ${orderRef}

👤 بيانات المشتري:
- الاسم: ${customer.name}
- رقم الهاتف: ${customer.phone}
- عنوان التوصيل: ${customer.address}${customer.notes ? `\n- ملاحظات: ${customer.notes}` : ''}

يرجى تأكيد استلام الطلب وموعد التوصيل. شكراً لكم 💚`;

    // WhatsApp target configuration
    const rawWhatsapp = appSettings.socialLinks?.whatsapp || 'itthadalexchannel';
    let target = 'https://wa.me/itthadalexchannel';

    if (rawWhatsapp) {
      if (rawWhatsapp.startsWith('https://wa.me/') || rawWhatsapp.startsWith('https://api.whatsapp.com/')) {
        target = rawWhatsapp;
      } else if (/^\+?\d+$/.test(rawWhatsapp.replace(/\s+/g, ''))) {
        const cleanPhone = rawWhatsapp.replace(/[^\d]/g, '');
        target = `https://wa.me/${cleanPhone}`;
      } else {
        const cleanHandle = rawWhatsapp.replace(/^@/, '').replace(/^https?:\/\/(www\.)?wa\.me\//, '');
        target = `https://wa.me/${cleanHandle || 'itthadalexchannel'}`;
      }
    }

    const separator = target.includes('?') ? '&' : '?';
    return `${target}${separator}text=${encodeURIComponent(message)}`;
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    const orderRef = `#ORD-${Date.now().toString().slice(-6)}`;
    const totalPrice = selectedProduct.price * formData.quantity;

    try {
      // 1. Save order to Firestore so it immediately appears in Admin Dashboard
      await addDoc(collection(db, 'orders'), {
        orderRef,
        userId: auth.currentUser?.uid || `guest_${Date.now()}`,
        userEmail: auth.currentUser?.email || `${formData.phone}@guest.store`,
        userName: formData.name.trim(),
        userPhone: formData.phone.trim(),
        userAddress: formData.address.trim(),
        userNotes: formData.notes?.trim() || '',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productImage: selectedProduct.imageUrl || '',
        quantity: formData.quantity,
        totalPrice,
        status: 'pending',
        channel: 'whatsapp',
        whatsappTarget: '@itthadalexchannel',
        createdAt: new Date().toISOString()
      });

      // 2. Generate WhatsApp link with order details
      const waUrl = getWhatsAppTargetUrl(orderRef, selectedProduct, formData.quantity, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        notes: formData.notes?.trim()
      });

      setLastWhatsAppUrl(waUrl);
      setLastOrderRef(orderRef);
      setOrderSuccess(true);
      toast.success('تم تسجيل الطلب في لوحة التحكم وتجهيز رسالة واتساب');

      // 3. Open WhatsApp link
      window.open(waUrl, '_blank', 'noopener,noreferrer');

    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة ثانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowOrderForm(false);
    setOrderSuccess(false);
    setSelectedProduct(null);
    setFormData({ name: '', phone: '', address: '', quantity: 1, notes: '' });
  };

  return (
    <div className="flex-1 w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto bg-background-light dark:bg-background-dark min-h-screen pb-32 md:pb-16 text-right">
      {/* Header */}
      <div style={{ height: 'calc(env(safe-area-inset-top) + 68px)' }} className="w-full relative z-0"></div>
      <header style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }} className="fixed top-0 inset-x-0 w-full z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-border-light/40 dark:border-border-dark/40 px-4 md:px-8 pb-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center rounded-2xl glass-card text-slate-600 dark:text-slate-300">
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <h1 className="text-lg font-black text-primary-dark dark:text-white uppercase leading-none">متجر الجماهير</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-slate-400">الشراء المباشر عبر واتساب @itthadalexchannel</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[11px] font-black">
              <MessageCircle size={14} className="fill-emerald-500/20" />
              <span>طلب عبر WhatsApp</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black backdrop-blur-md">خدمة العملاء السريعة</span>
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
            </div>
            <h2 className="text-base font-black">اطلب الآن واستلم في منزلك</h2>
            <p className="text-xs text-emerald-100 font-bold max-w-xs">
              يتم تسجيل طلبك مباشرة في لوحة التحكم وتأكيد تفاصيل الشحن والتوصيل عبر واتساب @itthadalexchannel
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200 shrink-0">
            <MessageCircle size={28} />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="ابحث عن منتج بالاسم أو الفئة..." 
            className="w-full h-12 pr-12 pl-4 rounded-2xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-black text-[11px] transition-all cursor-pointer ${
                activeCategory === cat.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white dark:bg-surface-dark text-slate-500 border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-surface-dark/80'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={product.id}
              className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col group"
            >
              <div 
                className="h-44 relative bg-slate-100 dark:bg-surface-dark overflow-hidden cursor-pointer"
                onClick={() => {
                  setSelectedProduct(product);
                  setShowOrderForm(true);
                }}
              >
                <img 
                  src={getOptimizedImage(product.imageUrl, 400) || undefined} 
                  referrerPolicy="no-referrer" 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  alt={product.name} 
                />
                <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md border border-border-light/60 dark:border-border-dark/60">
                   <span className="text-[11px] font-black text-primary tabular-nums">{product.price} ج.م</span>
                </div>
              </div>

              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{product.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold line-clamp-2 min-h-[30px] mt-1 leading-relaxed">{product.description}</p>
                </div>

                <button 
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowOrderForm(true);
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>الشراء عبر واتساب</span>
                </button>
              </div>
            </motion.div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-2 md:col-span-3 lg:col-span-4 py-20 text-center flex flex-col items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                  <Search size={32} />
               </div>
               <p className="text-slate-400 font-bold text-sm">لا توجد منتجات مطابقة للبحث</p>
            </div>
          )}
        </div>
      </main>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderForm && selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-background-dark rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {orderSuccess ? (
                <div className="py-8 flex flex-col items-center text-center gap-5">
                   <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 animate-bounce">
                      <PackageCheck size={40} />
                   </div>

                   <div className="space-y-1">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        كود الطلب: {lastOrderRef}
                      </span>
                      <h2 className="text-xl font-black text-slate-800 dark:text-white pt-2">تم تسجيل طلبك بنجاح!</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold max-w-xs leading-relaxed">
                        تم إرسال بيانات الطلب إلى لوحة تحكم الإدارة وتجهيز المحادثة عبر WhatsApp (@itthadalexchannel) لتأكيد التوصيل.
                      </p>
                   </div>

                   {lastWhatsAppUrl && (
                     <div className="w-full space-y-2 pt-2">
                       <a
                         href={lastWhatsAppUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="w-full h-13 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                       >
                         <MessageCircle size={18} />
                         <span>فتح محادثة WhatsApp (@itthadalexchannel)</span>
                         <ExternalLink size={14} />
                       </a>
                       <button
                         onClick={handleCloseModal}
                         className="w-full py-3 bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs transition-all cursor-pointer"
                       >
                         إغلاق
                       </button>
                     </div>
                   )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
                     <button onClick={handleCloseModal} className="h-9 w-9 bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 transition-all cursor-pointer">
                        <X size={18} />
                     </button>
                     <div className="text-right">
                       <h2 className="text-base font-black text-slate-800 dark:text-white">إتمام الطلب عبر WhatsApp</h2>
                       <p className="text-[10px] text-slate-400 font-bold">@itthadalexchannel</p>
                     </div>
                  </div>

                  {/* Selected Product Card */}
                  <div className="flex gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark items-center">
                    <img 
                      src={getOptimizedImage(selectedProduct.imageUrl, 200) || undefined} 
                      referrerPolicy="no-referrer" 
                      className="w-16 h-16 rounded-xl object-cover shadow-sm shrink-0" 
                      alt="" 
                    />
                    <div className="flex-1 min-w-0">
                       <h3 className="font-black text-xs text-slate-800 dark:text-white truncate">{selectedProduct.name}</h3>
                       <div className="flex items-center justify-between mt-1">
                         <span className="text-[10px] text-slate-400 font-bold">سعر القطعة: {selectedProduct.price} ج.م</span>
                         <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs tabular-nums">
                           الإجمالي: {(selectedProduct.price * formData.quantity).toLocaleString()} ج.م
                         </span>
                       </div>
                    </div>
                  </div>

                  {/* Order Form */}
                  <form onSubmit={handleOrderSubmit} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 pr-1 flex items-center gap-1.5">
                        <User size={12} className="text-primary" />
                        الاسم بالكامل <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required
                        type="text"
                        placeholder="أدخل اسمك الكريم..."
                        className="w-full h-11 px-3.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 pr-1 flex items-center gap-1.5">
                          <Phone size={12} className="text-primary" />
                          رقم الهاتف (واتساب) <span className="text-red-500">*</span>
                        </label>
                        <input 
                          required
                          type="tel"
                          dir="ltr"
                          placeholder="010XXXXXXXX"
                          className="w-full h-11 px-3.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 text-right"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 pr-1 flex items-center gap-1">
                          الكمية
                        </label>
                        <select 
                          className="w-full h-11 px-3 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark font-black text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={formData.quantity}
                          onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                            <option key={v} value={v}>{v} قطع</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 pr-1 flex items-center gap-1.5">
                        <MapPin size={12} className="text-primary" />
                        عنوان التوصيل بالتفصيل <span className="text-red-500">*</span>
                      </label>
                      <textarea 
                        required
                        rows={2}
                        placeholder="المحافظة، المنطقة، اسم الشارع، رقم العقار والشقة..."
                        className="w-full p-3 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-relaxed"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 pr-1">
                        ملاحظات إضافية أو المقاس (اختياري)
                      </label>
                      <input 
                        type="text"
                        placeholder="مثال: المقاس L أو اللون المفضل..."
                        className="w-full h-10 px-3.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>

                    {/* Notice */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2 text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">
                      <MessageCircle size={16} className="shrink-0 text-emerald-600" />
                      <span>سيتم حفظ بيانات طلبك في لوحة التحكم وتوجيهك فوراً إلى محادثة واتساب (@itthadalexchannel) لتأكيد الشحن.</span>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-13 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <MessageCircle size={18} className="fill-white" />
                          <span>إرسال الطلب وإتمام الشراء عبر WhatsApp</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
