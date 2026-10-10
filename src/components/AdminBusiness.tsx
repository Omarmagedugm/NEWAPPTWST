import React, { useState, useMemo } from 'react';
import { useAppStore, BusinessItem, BusinessUpdate, BusinessReport } from '../store';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Star, 
  Trash2, 
  Edit3, 
  Eye, 
  ShieldAlert, 
  MapPin, 
  Phone, 
  Search, 
  X, 
  Filter, 
  Send, 
  ExternalLink,
  Ban,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import ImageUploader from './ImageUploader';

export default function AdminBusiness() {
  const { 
    businesses, 
    businessUpdates, 
    businessReports, 
    profile,
    setBusinesses,
    setBusinessUpdates,
    setBusinessReports
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'updates' | 'reports'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [rejectingBusiness, setRejectingBusiness] = useState<BusinessItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [editingBusiness, setEditingBusiness] = useState<BusinessItem | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BusinessItem>>({});

  const [inspectingUpdate, setInspectingUpdate] = useState<BusinessUpdate | null>(null);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: businesses.length,
      pending: businesses.filter(b => b.status === 'pending').length,
      approved: businesses.filter(b => b.status === 'approved').length,
      rejected: businesses.filter(b => b.status === 'rejected').length,
      suspended: businesses.filter(b => b.status === 'suspended').length,
      pendingUpdates: businessUpdates.filter(u => u.status === 'pending').length,
      pendingReports: businessReports.filter(r => r.status === 'pending').length,
    };
  }, [businesses, businessUpdates, businessReports]);

  // Filtered List
  const filteredList = useMemo(() => {
    return businesses.filter(b => {
      let matchTab = true;
      if (activeSubTab === 'pending') matchTab = b.status === 'pending';
      else if (activeSubTab === 'approved') matchTab = b.status === 'approved';
      else if (activeSubTab === 'rejected') matchTab = b.status === 'rejected';
      else if (activeSubTab === 'suspended') matchTab = b.status === 'suspended';

      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q || (
        b.businessName.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.ownerName && b.ownerName.toLowerCase().includes(q))
      );

      return matchTab && matchSearch;
    });
  }, [businesses, activeSubTab, searchQuery]);

  // Actions
  const handleApprove = async (bus: BusinessItem) => {
    try {
      const updatedItem: BusinessItem = {
        ...bus,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: profile?.name || 'مدير المنصة',
        rejectionReason: ''
      };
      setBusinesses(businesses.map(b => b.id === bus.id ? updatedItem : b));

      const busRef = doc(db, 'businesses', bus.id);
      await updateDoc(busRef, {
        status: 'approved',
        approvedAt: updatedItem.approvedAt,
        approvedBy: updatedItem.approvedBy,
        rejectionReason: ''
      });

      // Send notification if user notification system exists
      try {
        await addDoc(collection(db, 'notifications'), {
          target: bus.ownerId,
          title: 'تم قبول مشروعك في اتحاداوي بيزنس 💚',
          body: `مبروك! تم قبول مشروعك (${bus.businessName}) وهو الآن منشور ومتاح لجمهور النادي.`,
          createdAt: new Date().toISOString(),
          readBy: []
        });
      } catch (e) {}

      toast.success(`تم قبول ونشر مشروع (${bus.businessName}) بنجاح! 💚`);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء القبول');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingBusiness) return;
    if (!rejectionReason.trim()) {
      toast.error('يرجى تحديد سبب الرفض');
      return;
    }

    try {
      const updatedItem: BusinessItem = {
        ...rejectingBusiness,
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        updatedAt: new Date().toISOString()
      };
      setBusinesses(businesses.map(b => b.id === rejectingBusiness.id ? updatedItem : b));

      const busRef = doc(db, 'businesses', rejectingBusiness.id);
      await updateDoc(busRef, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        updatedAt: updatedItem.updatedAt
      });

      // Send notification
      try {
        await addDoc(collection(db, 'notifications'), {
          target: rejectingBusiness.ownerId,
          title: 'تنبيه بخصوص مشروعك في اتحاداوي بيزنس',
          body: `تم رفض مشروعك (${rejectingBusiness.businessName}). السبب: ${rejectionReason.trim()}`,
          createdAt: new Date().toISOString(),
          readBy: []
        });
      } catch (e) {}

      toast.success('تم تسجيل رفض المشروع مع إرسال السبب لصاحبه');
      setRejectingBusiness(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تسجيل الرفض');
    }
  };

  const handleToggleSuspend = async (bus: BusinessItem) => {
    try {
      const newStatus = bus.status === 'suspended' ? 'approved' : 'suspended';
      const updatedItem: BusinessItem = {
        ...bus,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      setBusinesses(businesses.map(b => b.id === bus.id ? updatedItem : b));

      const busRef = doc(db, 'businesses', bus.id);
      await updateDoc(busRef, {
        status: newStatus,
        updatedAt: updatedItem.updatedAt
      });
      toast.success(newStatus === 'suspended' ? 'تم إيقاف المشروع' : 'تم إعادة تفعيل المشروع');
    } catch (err) {
      console.error(err);
      toast.error('فشلت العملية');
    }
  };

  const handleToggleFeatured = async (bus: BusinessItem) => {
    try {
      const updatedItem: BusinessItem = {
        ...bus,
        featured: !bus.featured,
        updatedAt: new Date().toISOString()
      };
      setBusinesses(businesses.map(b => b.id === bus.id ? updatedItem : b));

      const busRef = doc(db, 'businesses', bus.id);
      await updateDoc(busRef, {
        featured: !bus.featured,
        updatedAt: updatedItem.updatedAt
      });
      toast.success(!bus.featured ? 'تم تمييز المشروع ⭐' : 'تم إزالة التمييز عن المشروع');
    } catch (err) {
      console.error(err);
      toast.error('فشلت العملية');
    }
  };

  const handleDelete = async (bus: BusinessItem) => {
    if (!window.confirm(`هل أنت تأكد من إزالة مشروع (${bus.businessName}) نهائياً؟`)) return;

    try {
      setBusinesses(businesses.filter(b => b.id !== bus.id));
      await deleteDoc(doc(db, 'businesses', bus.id));
      toast.success('تم حذف المشروع بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleSaveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;

    try {
      const updatedItem: BusinessItem = {
        ...editingBusiness,
        ...editFormData,
        updatedAt: new Date().toISOString()
      };
      setBusinesses(businesses.map(b => b.id === editingBusiness.id ? updatedItem : b));

      const busRef = doc(db, 'businesses', editingBusiness.id);
      await updateDoc(busRef, {
        ...editFormData,
        updatedAt: updatedItem.updatedAt
      });
      toast.success('تم تحديث بيانات المشروع مباشرة 💚');
      setEditingBusiness(null);
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ التعديلات');
    }
  };

  // Approve Pending Update Request
  const handleApproveUpdate = async (upd: BusinessUpdate) => {
    try {
      // Apply changes to target business
      const targetBus = businesses.find(b => b.id === upd.businessId);
      if (targetBus) {
        setBusinesses(businesses.map(b => b.id === upd.businessId ? { ...b, ...upd.requestedData, updatedAt: new Date().toISOString() } : b));
      }
      setBusinessUpdates(businessUpdates.map(u => u.id === upd.id ? { ...u, status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: profile?.name || 'مدير المنصة' } : u));

      const busRef = doc(db, 'businesses', upd.businessId);
      await updateDoc(busRef, {
        ...upd.requestedData,
        updatedAt: new Date().toISOString()
      });

      // Update the update document status
      const updRef = doc(db, 'business_updates', upd.id);
      await updateDoc(updRef, {
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: profile?.name || 'مدير المنصة'
      });

      toast.success('تم تفعيل التعديلات المطلوبة للمشروع بنجاح! 💚');
      setInspectingUpdate(null);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء اعتماد التعديل');
    }
  };

  const handleRejectUpdate = async (upd: BusinessUpdate) => {
    try {
      setBusinessUpdates(businessUpdates.map(u => u.id === upd.id ? { ...u, status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: profile?.name || 'مدير المنصة' } : u));

      const updRef = doc(db, 'business_updates', upd.id);
      await updateDoc(updRef, {
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: profile?.name || 'مدير المنصة'
      });

      toast.success('تم رفض طلب التعديل');
      setInspectingUpdate(null);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الرفض');
    }
  };

  // Handle Report Actions
  const handleResolveReport = async (reportId: string, businessId: string, action: 'suspend' | 'dismiss') => {
    try {
      if (action === 'suspend') {
        setBusinesses(businesses.map(b => b.id === businessId ? { ...b, status: 'suspended', updatedAt: new Date().toISOString() } : b));
        const busRef = doc(db, 'businesses', businessId);
        await updateDoc(busRef, {
          status: 'suspended',
          updatedAt: new Date().toISOString()
        });
      }

      setBusinessReports(businessReports.map(r => r.id === reportId ? { ...r, status: action === 'suspend' ? 'resolved' : 'dismissed' } : r));

      const repRef = doc(db, 'business_reports', reportId);
      await updateDoc(repRef, {
        status: action === 'suspend' ? 'resolved' : 'dismissed'
      });

      toast.success(action === 'suspend' ? 'تم إيقاف المشروع وحل البلاغ' : 'تم تجاهل البلاغ');
    } catch (err) {
      console.error(err);
      toast.error('فشلت الإجراءات');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card-dark p-6 rounded-3xl border border-slate-200 dark:border-border-dark shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            <span>إدارة "اتحاداوي بيزنس"</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            مراجعة طلبات إضافة وتعديل مشروعات الجمهور، وإدارة الدليل والبلاغات
          </p>
        </div>

        {/* Pending Badges */}
        {stats.pending > 0 && (
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs rounded-2xl flex items-center gap-2 self-start sm:self-auto">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>يوجد {stats.pending} مشروع تنتظر المراجعة!</span>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          onClick={() => setActiveSubTab('all')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-slate-800 dark:text-slate-200'
          }`}
        >
          <span className="block text-xl font-black">{stats.total}</span>
          <span className="text-[11px] font-bold opacity-80">الكل</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pending')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-amber-600'
          }`}
        >
          <span className="block text-xl font-black">{stats.pending}</span>
          <span className="text-[11px] font-bold">قيد المراجعة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('approved')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'approved'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-emerald-600'
          }`}
        >
          <span className="block text-xl font-black">{stats.approved}</span>
          <span className="text-[11px] font-bold">المقبولة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rejected')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'rejected'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-red-600'
          }`}
        >
          <span className="block text-xl font-black">{stats.rejected}</span>
          <span className="text-[11px] font-bold">المرفوضة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('suspended')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'suspended'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-slate-500'
          }`}
        >
          <span className="block text-xl font-black">{stats.suspended}</span>
          <span className="text-[11px] font-bold">المتوقفة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('updates')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'updates'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-blue-600'
          }`}
        >
          <span className="block text-xl font-black">{stats.pendingUpdates}</span>
          <span className="text-[11px] font-bold">تحديثات معلقة</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            activeSubTab === 'reports'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white dark:bg-card-dark border-slate-200 dark:border-border-dark text-rose-600'
          }`}
        >
          <span className="block text-xl font-black">{stats.pendingReports}</span>
          <span className="text-[11px] font-bold">البلاغات</span>
        </button>
      </div>

      {/* Search Input for Main Lists */}
      {(activeSubTab !== 'updates' && activeSubTab !== 'reports') && (
        <div className="relative">
          <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الهاتف، الاسم، العنوان..."
            className="w-full pr-12 pl-4 py-3 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
          />
        </div>
      )}

      {/* Main List Section */}
      {(activeSubTab !== 'updates' && activeSubTab !== 'reports') && (
        <div className="space-y-4">
          {filteredList.length > 0 ? (
            filteredList.map((bus) => (
              <div
                key={bus.id}
                className="bg-white dark:bg-card-dark rounded-3xl p-5 border border-slate-200 dark:border-border-dark shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
              >
                {/* Details */}
                <div className="flex gap-4 items-start min-w-0">
                  <img
                    src={bus.coverImage}
                    alt={bus.businessName}
                    className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-border-dark"
                  />
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black text-xs">
                        {bus.category}
                      </span>
                      
                      <h3 className="font-black text-lg text-slate-900 dark:text-white truncate">
                        {bus.businessName}
                      </h3>

                      {bus.featured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                          ⭐ مميز
                        </span>
                      )}

                      {/* Status badge */}
                      {bus.status === 'approved' && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">مقبول</span>}
                      {bus.status === 'pending' && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">قيد المراجعة</span>}
                      {bus.status === 'rejected' && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">مرفوض</span>}
                      {bus.status === 'suspended' && <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">متوقف</span>}
                    </div>

                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 line-clamp-2">
                      {bus.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {bus.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        {bus.phone}
                      </span>
                      <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md font-black">
                        <Eye className="w-3.5 h-3.5" />
                        {bus.stats?.views ?? 0} مشاهدة
                      </span>
                      {bus.ownerName && <span>صاحب المشروع: {bus.ownerName}</span>}
                      <span>تاريخ الإرسال: {new Date(bus.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>

                    {bus.rejectionReason && (
                      <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-xl">
                        سبب الرفض المسجل: {bus.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-border-dark justify-end">
                  
                  {bus.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(bus)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>قبول ونشر</span>
                      </button>

                      <button
                        onClick={() => setRejectingBusiness(bus)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleToggleFeatured(bus)}
                    className={`px-3 py-2 font-black text-xs rounded-xl border flex items-center gap-1 ${
                      bus.featured
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 border-slate-200'
                    }`}
                    title="تمييز في أعلى الدليل"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>{bus.featured ? 'مميز' : 'تمييز'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingBusiness(bus);
                      setEditFormData(bus);
                    }}
                    className="p-2 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:text-primary rounded-xl"
                    title="تعديل مباشر"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleToggleSuspend(bus)}
                    className="p-2 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:text-amber-600 rounded-xl"
                    title={bus.status === 'suspended' ? 'إعادة تفعيل' : 'إيقاف مؤقت'}
                  >
                    {bus.status === 'suspended' ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDelete(bus)}
                    className="p-2 bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 rounded-xl"
                    title="حذف نهائي"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-card-dark rounded-3xl p-8 text-center border border-slate-200 dark:border-border-dark space-y-2">
              <p className="font-bold text-slate-400 text-sm">لا توجد عناصر في هذا القسم حالياً.</p>
            </div>
          )}
        </div>
      )}

      {/* Pending Updates Sub-Tab */}
      {activeSubTab === 'updates' && (
        <div className="space-y-4">
          {businessUpdates.length > 0 ? (
            businessUpdates.map((upd) => (
              <div
                key={upd.id}
                className="bg-white dark:bg-card-dark rounded-3xl p-5 border border-slate-200 dark:border-border-dark shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      طلب تعديل بيانات للمشروع ({upd.requestedData.businessName || 'مشروع'})
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      upd.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      upd.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {upd.status === 'pending' ? 'معلق' : upd.status === 'approved' ? 'تم الاعتماد' : 'مرفوض'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {new Date(upd.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  {/* Previous Data */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-slate-200/60 dark:border-border-dark space-y-1">
                    <span className="block font-black text-slate-400 mb-1">البيانات الحالية المنشورة:</span>
                    <p className="text-slate-800 dark:text-slate-200">الاسم: {upd.previousData?.businessName}</p>
                    <p className="text-slate-800 dark:text-slate-200">التصنيف: {upd.previousData?.category}</p>
                    <p className="text-slate-800 dark:text-slate-200">الهاتف: {upd.previousData?.phone}</p>
                    <p className="text-slate-800 dark:text-slate-200">العنوان: {upd.previousData?.address}</p>
                  </div>

                  {/* Requested Data */}
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <span className="block font-black text-emerald-600 dark:text-emerald-400 mb-1">التعديلات المطلوبة:</span>
                    <p className="text-slate-800 dark:text-slate-200">الاسم: {upd.requestedData?.businessName}</p>
                    <p className="text-slate-800 dark:text-slate-200">التصنيف: {upd.requestedData?.category}</p>
                    <p className="text-slate-800 dark:text-slate-200">الوصف: {upd.requestedData?.description}</p>
                    <p className="text-slate-800 dark:text-slate-200">الهاتف: {upd.requestedData?.phone}</p>
                    <p className="text-slate-800 dark:text-slate-200">العنوان: {upd.requestedData?.address}</p>
                  </div>
                </div>

                {upd.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 justify-end">
                    <button
                      onClick={() => handleApproveUpdate(upd)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اعتماد التعديلات</span>
                    </button>

                    <button
                      onClick={() => handleRejectUpdate(upd)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>رفض الطلب</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-card-dark rounded-3xl p-8 text-center border border-slate-200 dark:border-border-dark">
              <p className="font-bold text-slate-400 text-sm">لا توجد طلبات تعديل معلقة حالياً.</p>
            </div>
          )}
        </div>
      )}

      {/* Reports Sub-Tab */}
      {activeSubTab === 'reports' && (
        <div className="space-y-4">
          {businessReports.length > 0 ? (
            businessReports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white dark:bg-card-dark rounded-3xl p-5 border border-slate-200 dark:border-border-dark shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      بلاغ ضد مشروع: ({rep.businessName})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {new Date(rep.createdAt).toLocaleDateString('ar-EG')}
                  </span>
                </div>

                <div className="text-xs font-bold space-y-1">
                  <p className="text-red-600 dark:text-red-400 font-black">السبب: {rep.reason}</p>
                  {rep.details && <p className="text-slate-600 dark:text-slate-300">التفاصيل: {rep.details}</p>}
                  <p className="text-slate-400">المبلغ: {rep.userName || 'زائر'}</p>
                </div>

                {rep.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 justify-end">
                    <button
                      onClick={() => handleResolveReport(rep.id, rep.businessId, 'suspend')}
                      className="px-4 py-2 bg-red-600 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                    >
                      <Ban className="w-4 h-4" />
                      <span>إيقاف المشروع وحل البلاغ</span>
                    </button>

                    <button
                      onClick={() => handleResolveReport(rep.id, rep.businessId, 'dismiss')}
                      className="px-4 py-2 bg-slate-200 dark:bg-surface-dark text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                    >
                      تجاهل البلاغ
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-card-dark rounded-3xl p-8 text-center border border-slate-200 dark:border-border-dark">
              <p className="font-bold text-slate-400 text-sm">لا توجد بلاغات مسجلة.</p>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card-dark rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-border-dark shadow-2xl space-y-4">
            <h3 className="font-black text-base text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span>سبب رفض مشروع ({rejectingBusiness.businessName})</span>
            </h3>

            <div>
              <label className="block text-xs font-black text-slate-500 mb-1">حدد سبب الرفض لصاحب المشروع *</label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: الصورة غير واضحة، تفاصيل العنوان غير مكتملة..."
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-sm font-bold"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-3 bg-red-600 text-white font-black text-xs rounded-xl shadow-lg"
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => setRejectingBusiness(null)}
                className="px-5 py-3 bg-slate-100 dark:bg-surface-dark text-slate-600 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Direct Edit Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-card-dark rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-border-dark shadow-2xl my-8 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-border-dark pb-3">
              <h3 className="font-black text-base">تعديل بيانات المشروع (Direct Admin Edit)</h3>
              <button onClick={() => setEditingBusiness(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminEdit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block mb-1 font-black">اسم المشروع</label>
                <input
                  type="text"
                  value={editFormData.businessName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block mb-1 font-black">التصنيف</label>
                <input
                  type="text"
                  value={editFormData.category || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block mb-1 font-black">الوصف</label>
                <textarea
                  rows={3}
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 font-black">الهاتف</label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-black">الواتساب</label>
                  <input
                    type="text"
                    value={editFormData.whatsapp || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-black">العنوان</label>
                <input
                  type="text"
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30">
                <div>
                  <label className="block mb-1 font-black text-xs text-emerald-700 dark:text-emerald-300">نسبة الخصم للاتحادوية</label>
                  <select
                    value={editFormData.discountPercentage || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, discountPercentage: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 text-sm font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    <option value="">بدون خصم</option>
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
                  <label className="block mb-1 font-black text-xs text-emerald-700 dark:text-emerald-300">تفاصيل الخصم</label>
                  <input
                    type="text"
                    value={editFormData.discountNote || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, discountNote: e.target.value })}
                    placeholder="مثال: خصم خاص للاتحادوية"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-black">صورة الغلاف</label>
                <ImageUploader
                  folderName="business_admin_edit"
                  buttonText="تحديث صورة الغلاف"
                  onUploadSuccess={(url) => setEditFormData({ ...editFormData, coverImage: url })}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white font-black rounded-xl shadow-lg"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="px-5 py-3 bg-slate-100 dark:bg-surface-dark font-bold rounded-xl"
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
