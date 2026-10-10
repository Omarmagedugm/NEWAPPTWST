import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, BusinessItem } from '../store';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Building2, 
  Store, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Star, 
  X, 
  Send, 
  Edit3, 
  Eye, 
  Sparkles, 
  Info, 
  Utensils, 
  Shirt, 
  ShoppingBag, 
  Wrench, 
  Briefcase, 
  Car, 
  Home as HomeIcon, 
  HeartPulse, 
  Smartphone, 
  Dumbbell, 
  GraduationCap, 
  Plane, 
  Tag,
  Percent,
  PercentSquare,
  Gift,
  Grid,
  Loader2
} from 'lucide-react';
import ImageUploader from '../components/ImageUploader';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { name: 'الكل', icon: Grid },
  { name: 'مطاعم وكافيهات', icon: Utensils },
  { name: 'ملابس وأزياء', icon: Shirt },
  { name: 'منتجات', icon: ShoppingBag },
  { name: 'خدمات', icon: Wrench },
  { name: 'شركات', icon: Briefcase },
  { name: 'سيارات', icon: Car },
  { name: 'عقارات', icon: HomeIcon },
  { name: 'صحة وجمال', icon: HeartPulse },
  { name: 'إلكترونيات', icon: Smartphone },
  { name: 'رياضة', icon: Dumbbell },
  { name: 'تعليم', icon: GraduationCap },
  { name: 'سياحة وسفر', icon: Plane },
  { name: 'أخرى', icon: Store },
];

export default function BusinessDirectory() {
  const navigate = useNavigate();
  const { businesses, profile } = useAppStore();

  const [activeTab, setActiveTab] = useState<'directory' | 'my_businesses'>('directory');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessItem | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    category: 'مطاعم وكافيهات',
    description: '',
    phone: '',
    whatsapp: '',
    address: 'الإسكندرية',
    mapsUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    websiteUrl: '',
    ownerName: '',
    coverImage: '',
    gallery: [] as string[],
    discountPercentage: '',
    discountNote: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter approved businesses for directory
  const approvedBusinesses = useMemo(() => {
    return businesses.filter(b => b.status === 'approved');
  }, [businesses]);

  const featuredBusinesses = useMemo(() => {
    return approvedBusinesses.filter(b => b.featured);
  }, [approvedBusinesses]);

  const filteredBusinesses = useMemo(() => {
    return approvedBusinesses.filter(b => {
      const matchCategory = selectedCategory === 'الكل' || b.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || (
        b.businessName.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.ownerName && b.ownerName.toLowerCase().includes(q))
      );
      return matchCategory && matchSearch;
    });
  }, [approvedBusinesses, selectedCategory, searchQuery]);

  // User's own submissions
  const myBusinesses = useMemo(() => {
    const currentUid = auth.currentUser?.uid || profile?.uid;
    if (!currentUid) return [];
    return businesses.filter(b => b.ownerId === currentUid || (profile?.uid && b.ownerId === profile.uid));
  }, [businesses, profile?.uid, auth.currentUser?.uid]);

  const resetForm = () => {
    setFormData({
      businessName: '',
      category: 'مطاعم وكافيهات',
      description: '',
      phone: '',
      whatsapp: '',
      address: 'الإسكندرية',
      mapsUrl: '',
      instagramUrl: '',
      facebookUrl: '',
      websiteUrl: '',
      ownerName: profile?.name || '',
      coverImage: '',
      gallery: [],
      discountPercentage: '',
      discountNote: ''
    });
    setEditingBusiness(null);
  };

  const handleOpenAddModal = () => {
    const currentUid = auth.currentUser?.uid || profile?.uid;
    if (!currentUid) {
      toast.error('يرجى تسجيل الدخول أولاً لإضافة مشروعك 💚');
      navigate('/auth');
      return;
    }
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (bus: BusinessItem) => {
    setEditingBusiness(bus);
    setFormData({
      businessName: bus.businessName || '',
      category: bus.category || 'مطاعم وكافيهات',
      description: bus.description || '',
      phone: bus.phone || '',
      whatsapp: bus.whatsapp || '',
      address: bus.address || 'الإسكندرية',
      mapsUrl: bus.mapsUrl || '',
      instagramUrl: bus.instagramUrl || '',
      facebookUrl: bus.facebookUrl || '',
      websiteUrl: bus.websiteUrl || '',
      ownerName: bus.ownerName || '',
      coverImage: bus.coverImage || '',
      gallery: bus.gallery || [],
      discountPercentage: bus.discountPercentage !== undefined && bus.discountPercentage !== null ? String(bus.discountPercentage) : '',
      discountNote: bus.discountNote || ''
    });
    setShowAddModal(true);
  };

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUid = auth.currentUser?.uid || profile?.uid;

    if (!currentUid) {
      toast.error('يرجى تسجيل الدخول أولاً لإضافة مشروعك 💚');
      navigate('/auth');
      return;
    }

    if (!formData.businessName.trim()) {
      toast.error('يرجى كتابة اسم المشروع *');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('يرجى كتابة رقم الهاتف للاتصال *');
      return;
    }

    // Require at least one image (cover image or gallery image)
    const effectiveCoverImage = formData.coverImage.trim() || (formData.gallery.length > 0 ? formData.gallery[0] : '');

    if (!effectiveCoverImage) {
      toast.error('يرجى إضافة صورة واحدة على الأقل للمشروع (صورة الغلاف أو صور المعرض) 📸');
      return;
    }

    const finalCoverImage = effectiveCoverImage;

    // Normalize URLs
    const cleanedMapsUrl = normalizeUrl(formData.mapsUrl);
    const cleanedInstagramUrl = normalizeUrl(formData.instagramUrl);
    const cleanedFacebookUrl = normalizeUrl(formData.facebookUrl);
    const cleanedWebsiteUrl = normalizeUrl(formData.websiteUrl);

    setIsSubmitting(true);

    try {
      if (editingBusiness) {
        // Submit Edit Request to business_updates
        const updatePayload = {
          businessId: editingBusiness.id,
          ownerId: currentUid,
          previousData: editingBusiness,
          requestedData: {
            ...formData,
            discountPercentage: formData.discountPercentage ? Number(formData.discountPercentage) : '',
            discountNote: formData.discountNote.trim(),
            description: formData.description.trim() || 'لا يوجد وصف مضاف حالياً.',
            address: formData.address.trim() || 'الإسكندرية',
            mapsUrl: cleanedMapsUrl,
            instagramUrl: cleanedInstagramUrl,
            facebookUrl: cleanedFacebookUrl,
            websiteUrl: cleanedWebsiteUrl,
            coverImage: finalCoverImage,
            updatedAt: new Date().toISOString()
          },
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'business_updates'), updatePayload);

        toast.success('تم إرسال طلب التعديل للإدارة للمراجعة 💚');
        setShowAddModal(false);
        resetForm();
      } else {
        // Create new business submission (pending status)
        const newDoc: any = {
          ownerId: currentUid,
          ownerName: formData.ownerName.trim() || profile?.name || 'عضو مجتمع الاتحاد',
          businessName: formData.businessName.trim(),
          category: formData.category || 'خدمات أُخرى',
          description: formData.description.trim() || 'لا يوجد وصف مضاف حالياً.',
          phone: formData.phone.trim(),
          whatsapp: formData.whatsapp.trim(),
          address: formData.address.trim() || 'الإسكندرية',
          mapsUrl: cleanedMapsUrl,
          instagramUrl: cleanedInstagramUrl,
          facebookUrl: cleanedFacebookUrl,
          websiteUrl: cleanedWebsiteUrl,
          coverImage: finalCoverImage,
          gallery: formData.gallery,
          discountPercentage: formData.discountPercentage ? Number(formData.discountPercentage) : null,
          discountNote: formData.discountNote.trim() || null,
          status: 'pending',
          featured: false,
          createdAt: new Date().toISOString(),
          stats: {
            views: 0,
            phoneClicks: 0,
            whatsappClicks: 0,
            mapClicks: 0,
            websiteClicks: 0,
            socialClicks: 0
          }
        };

        await addDoc(collection(db, 'businesses'), newDoc);
        
        setShowAddModal(false);
        resetForm();
        setShowSuccessCard(true);
        setActiveTab('my_businesses');
      }
    } catch (err: any) {
      console.error('Business submission error:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'businesses');
      } catch (e) {}
      toast.error('حدث خطأ أثناء إرسال بيانات المشروع. يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark pb-24">
      
      {/* Banner / Header */}
      <div className="relative bg-gradient-to-b from-primary-dark via-primary to-emerald-900 text-white pt-8 pb-12 px-4 shadow-xl overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-5xl mx-auto text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black text-amber-300">
            <Building2 className="w-4 h-4 text-amber-300" />
            <span>خدمة دليل مشروعات الجمهور</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            اتحاداوي بيزنس 💚
          </h1>

          <p className="text-xs sm:text-sm font-bold text-slate-100 max-w-xl mx-auto leading-relaxed">
            دليل أعمال ومشروعات جمهور نادي الاتحاد السكندري. يدعم أعضاء ومحبي القلعة الخضراء في التسويق والتواصل المجتمعي.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>أضف مشروعك في الدليل</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 -mt-6 relative z-20 space-y-6">

        {/* Tab Selector & Search Box */}
        <div className="bg-white dark:bg-card-dark rounded-3xl p-4 shadow-xl border border-slate-200/80 dark:border-border-dark space-y-4">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-surface-dark rounded-2xl">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex-1 py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'directory'
                  ? 'bg-white dark:bg-card-dark text-primary shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>دليل المشروعات ({approvedBusinesses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('my_businesses')}
              className={`flex-1 py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'my_businesses'
                  ? 'bg-white dark:bg-card-dark text-primary shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>مشروعاتي ({myBusinesses.length})</span>
            </button>
          </div>

          {/* Search Box (only in directory tab) */}
          {activeTab === 'directory' && (
            <div className="relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم مشروع، تصنيف، أو منطقة..."
                className="w-full pr-12 pl-4 py-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Categories Horizontal Scroll */}
          {activeTab === 'directory' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 ${
                      isSelected
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* Directory Tab View */}
        {activeTab === 'directory' && (
          <div className="space-y-6">

            {/* Featured Businesses Section */}
            {featuredBusinesses.length > 0 && selectedCategory === 'الكل' && !searchQuery && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>مشروعات مميزة ⭐</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredBusinesses.map((bus) => (
                    <div
                      key={bus.id}
                      onClick={() => navigate(`/business/${bus.id}`)}
                      className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-primary/10 dark:from-amber-950/20 dark:to-primary/20 rounded-3xl p-4 border border-amber-500/30 shadow-lg hover:shadow-xl transition-all cursor-pointer group flex gap-4 items-center relative overflow-hidden"
                    >
                      <img
                        src={bus.coverImage}
                        alt={bus.businessName}
                        className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-white/20 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                            مميز
                          </span>
                          {bus.discountPercentage && (
                            <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                              <Percent className="w-3 h-3" />
                              <span>خصم {bus.discountPercentage}% للاتحادوية</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-base truncate text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {bus.businessName}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 line-clamp-1">
                          {bus.description}
                        </p>
                        <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span>{bus.address}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Business Grid */}
            {filteredBusinesses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBusinesses.map((bus) => (
                  <div
                    key={bus.id}
                    onClick={() => navigate(`/business/${bus.id}`)}
                    className="bg-white dark:bg-card-dark rounded-3xl overflow-hidden border border-slate-200/80 dark:border-border-dark shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Container */}
                      <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                        <img
                          src={bus.coverImage}
                          alt={bus.businessName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                        
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap">
                          <span className="bg-primary/90 text-white text-[11px] font-black px-2.5 py-1 rounded-lg backdrop-blur-md">
                            {bus.category}
                          </span>
                        </div>

                        {/* Top Left Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                          {bus.featured && (
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                              ⭐ مميز
                            </span>
                          )}
                          {bus.discountPercentage && (
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              <span>خصم {bus.discountPercentage}% للاتحادوية</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <h3 className="font-black text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                          {bus.businessName}
                        </h3>

                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {bus.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-border-dark/60 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{bus.address}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-surface-dark px-2 py-0.5 rounded-lg">
                          <Eye className="w-3 h-3 text-primary" />
                          <span>{bus.stats?.views ?? 0}</span>
                        </span>
                        
                        <span className="text-primary font-black flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                          التفاصيل ⬅️
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-card-dark rounded-3xl p-12 text-center border border-slate-200 dark:border-border-dark space-y-4">
                <Store className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  لم يتم العثور على مشروعات متطابقة
                </h3>
                <p className="text-xs font-bold text-slate-400 max-w-sm mx-auto">
                  جرب تغيير التصنيف أو البحث بكلمات أخرى، أو كن أول من يضيف مشروعه في هذا القسم!
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md hover:bg-primary-dark transition-all"
                >
                  + أضف مشروعك الآن
                </button>
              </div>
            )}

            {/* Disclaimer Footer Note */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-500 dark:text-slate-400 text-[11px] font-bold leading-relaxed space-y-1">
              <span className="block font-black text-slate-700 dark:text-slate-200">ℹ️ إخلاء مسؤولية مجتمعية:</span>
              <p>
                هذا الدليل أعده جمهور قناة الاتحاد السكندري لربط الأعضاء والمشجعين ببعضهم البعض، ولا يمثل جهة رسمية أو نفعية لنادي الاتحاد السكندري.
              </p>
            </div>

          </div>
        )}

        {/* My Businesses Tab View */}
        {activeTab === 'my_businesses' && (
          <div className="space-y-4">
            {!profile?.uid ? (
              <div className="bg-white dark:bg-card-dark rounded-3xl p-8 text-center border border-slate-200 dark:border-border-dark space-y-4">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="text-base font-black">يلزم تسجيل الدخول لعرض مشروعاتك</h3>
                <button
                  onClick={() => navigate('/auth')}
                  className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl"
                >
                  تسجيل الدخول
                </button>
              </div>
            ) : myBusinesses.length > 0 ? (
              <div className="space-y-4">
                {myBusinesses.map((bus) => (
                  <div
                    key={bus.id}
                    className="bg-white dark:bg-card-dark rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-border-dark shadow-md flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-center min-w-0">
                      <img
                        src={bus.coverImage}
                        alt={bus.businessName}
                        className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-border-dark"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-lg text-slate-900 dark:text-white truncate">
                            {bus.businessName}
                          </h3>
                          
                          {/* Status Badge */}
                          {bus.status === 'approved' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> تم القبول والموافقة
                            </span>
                          )}
                          {bus.status === 'pending' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-[10px] border border-amber-500/20 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> قيد المراجعة
                            </span>
                          )}
                          {bus.status === 'rejected' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-black text-[10px] border border-red-500/20 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> تم الرفض
                            </span>
                          )}
                          {bus.status === 'suspended' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 font-black text-[10px] border border-slate-500/20">
                              متوقف
                            </span>
                          )}
                          {bus.discountPercentage && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] border border-emerald-500/20 flex items-center gap-1">
                              <Percent className="w-3 h-3" /> خصم {bus.discountPercentage}% للاتحادوية
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-500 line-clamp-1">
                          {bus.description}
                        </p>

                        {bus.rejectionReason && (
                          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 text-red-600 dark:text-red-400 text-[11px] font-bold">
                            سبب الرفض: {bus.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-border-dark">
                      <button
                        onClick={() => navigate(`/business/${bus.id}`)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-slate-100 dark:bg-surface-dark hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        <span>عرض الصفحة</span>
                      </button>

                      {bus.status === 'approved' && (
                        <button
                          onClick={() => handleOpenEditModal(bus)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>تعديل البيانات</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-card-dark rounded-3xl p-12 text-center border border-slate-200 dark:border-border-dark space-y-4">
                <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  لم تقم بإضافة أي مشروع بعد
                </h3>
                <p className="text-xs font-bold text-slate-400 max-w-sm mx-auto">
                  إذا كنت تمتلك محلاً، شركة، كافيه، منتجاً أو خدمة مهنية، أضف بيانات مشروعك ليظهر لجمهور نادي الاتحاد.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-6 py-3 bg-primary text-white font-bold text-xs rounded-xl shadow-lg hover:bg-primary-dark transition-all"
                >
                  + أضف مشروعك الآن
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Success Modal Card after Submission */}
      {showSuccessCard && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card-dark rounded-3xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-border-dark shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              تم إرسال مشروعك بنجاح 💚
            </h3>

            <p className="text-xs font-bold text-slate-500 dark:text-slate-300 leading-relaxed">
              سيتم مراجعة البيانات من إدارة قناة الاتحاد السكندري قبل نشر المشروع في الدليل للعموم. يمكنك متابعة حالة طلبك عبر تبويب "مشروعاتي".
            </p>

            <button
              onClick={() => {
                setShowSuccessCard(false);
                setActiveTab('my_businesses');
              }}
              className="w-full py-3 bg-primary text-white font-black text-sm rounded-2xl shadow-lg hover:bg-primary-dark transition-all"
            >
              متابعة طلباتي ⬅️
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-card-dark rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-border-dark shadow-2xl my-auto space-y-0 max-h-[90vh] flex flex-col relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark p-5 bg-white dark:bg-card-dark sticky top-0 z-20">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-primary" />
                  <span>{editingBusiness ? 'تعديل بيانات المشروع' : 'إضافة مشروع جديد إلى الدليل'}</span>
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  أدخل بيانات مشروعك بدقة ليتمكن الجمهور من التواصل معك بسهولة
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Form Scrollable Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 no-scrollbar">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">اسم المشروع / المحل / النشاط *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="مثال: كافيه الاتحاد، مطعم الإسكندراني..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">التصنيف (اختياري)</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  >
                    {CATEGORIES.filter(c => c.name !== 'الكل').map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Discount Percentage Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-primary/10 border border-emerald-500/30 dark:border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-sm">
                      <Percent className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>خصم خاص للاتحادوية 💚</span>
                        <span className="text-[10px] bg-amber-400/90 text-slate-950 px-2 py-0.5 rounded-full font-black">ميزة مميزة</span>
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        قدم خصماً حصرياً لجمهور وأعضاء الاتحاد السكندري لتمييز مشروعك وزيادة الإقبال
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">نسبة الخصم</label>
                    <select
                      value={formData.discountPercentage}
                      onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-card-dark border border-emerald-500/40 dark:border-border-dark text-sm font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="">بدون خصم حالياً</option>
                      <option value="5">خصم 5%</option>
                      <option value="10">خصم 10%</option>
                      <option value="15">خصم 15%</option>
                      <option value="20">خصم 20%</option>
                      <option value="25">خصم 25%</option>
                      <option value="30">خصم 30%</option>
                      <option value="35">خصم 35%</option>
                      <option value="40">خصم 40%</option>
                      <option value="45">خصم 45%</option>
                      <option value="50">خصم 50% 🔥</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">تفاصيل أو شرط الخصم (اختياري)</label>
                    <input
                      type="text"
                      value={formData.discountNote}
                      onChange={(e) => setFormData({ ...formData, discountNote: e.target.value })}
                      placeholder="مثال: عند إظهار تطبيق قناة الاتحاد أو كارنيه العضوية"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">وصف للمشروع والخدمات (اختياري)</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اكتب نبذة عن مشروعك، والخدمات والمنتجات والعروض المتاحة..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">رقم الهاتف للاتصال *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="012XXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">رقم واتساب (اختياري)</label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="012XXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>
              </div>

              {/* Address and Map Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">العنوان بالتفصيل (اختياري)</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="مثال: سموحة، شارع النصر، الإسكندرية"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">رابط خرائط جوجل (Google Maps) (اختياري)</label>
                  <input
                    type="text"
                    value={formData.mapsUrl}
                    onChange={(e) => setFormData({ ...formData, mapsUrl: e.target.value })}
                    placeholder="maps.app.goo.gl/... أو https://maps.app.goo.gl/..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>
              </div>

              {/* Owner Name and Social */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">اسم صاحب المشروع (اختياري)</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="اسمك كمالك للمشروع"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">رابط إنستغرام (اختياري)</label>
                  <input
                    type="text"
                    value={formData.instagramUrl}
                    onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                    placeholder="instagram.com/... أو https://instagram.com/..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>
              </div>

              {/* Facebook & Website Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">رابط صفحة الفيسبوك (اختياري)</label>
                  <input
                    type="text"
                    value={formData.facebookUrl}
                    onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                    placeholder="facebook.com/... أو https://facebook.com/..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">رابط الموقع الإلكتروني (اختياري)</label>
                  <input
                    type="text"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="mybusiness.com أو https://mybusiness.com"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
                  />
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-2">صورة الغلاف / الشعار الرئيسية * (أو إضافة صورة في المعرض أدناه)</label>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark flex flex-col items-center justify-center text-center">
                  {formData.coverImage ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden mb-3">
                      <img src={formData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, coverImage: '' })}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}

                  <ImageUploader
                    folderName="business_covers"
                    buttonText="رفع صورة الغلاف"
                    onUploadSuccess={(url) => setFormData({ ...formData, coverImage: url })}
                  />
                </div>
              </div>

              {/* Optional Gallery Upload */}
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-2">صور إضافية للمشروع (اختياري)</label>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark space-y-3">
                  {formData.gallery.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.gallery.map((imgUrl, i) => (
                        <div key={i} className="relative h-20 rounded-xl overflow-hidden border border-slate-200">
                          <img src={imgUrl} alt="Gallery item" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              gallery: formData.gallery.filter((_, idx) => idx !== i)
                            })}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <ImageUploader
                    folderName="business_gallery"
                    buttonText="إضافة صورة للمعرض"
                    onUploadSuccess={(url) => setFormData({
                      ...formData,
                      gallery: [...formData.gallery, url]
                    })}
                  />
                </div>
              </div>

              {/* Sticky Modal Action Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-card-dark pt-3 pb-2 border-t border-slate-100 dark:border-border-dark z-30 flex items-center gap-3 mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-primary text-white font-black text-sm rounded-2xl shadow-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري الإرسال للمراجعة...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{editingBusiness ? 'إرسال طلب التعديل 💚' : 'إرسال المشروع للمراجعة 💚'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3.5 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 font-bold text-sm rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
