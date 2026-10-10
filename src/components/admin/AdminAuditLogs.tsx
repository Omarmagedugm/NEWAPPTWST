import React, { useState, useMemo } from 'react';
import { 
  History, 
  Trash2, 
  RotateCcw, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  Trophy, 
  ShoppingBag, 
  Music, 
  BookOpen, 
  Layers, 
  ArrowUpRight,
  Shield,
  Clock,
  RefreshCw,
  X,
  Copy,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAppStore } from '../../store';
import { AuditLogItem, restoreDeletedItem } from '../../lib/auditLogger';

export default function AdminAuditLogs() {
  const { auditLogs, users } = useAppStore();
  const [activeTab, setActiveTab] = useState<'trash' | 'all_logs'>('trash');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedLogForPreview, setSelectedLogForPreview] = useState<AuditLogItem | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Tab filter: trash shows delete actions or items with status 'deleted'
      if (activeTab === 'trash') {
        if (log.action !== 'delete' && log.status !== 'deleted' && log.status !== 'restored') {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.itemTitle?.toLowerCase().includes(q);
        const matchUser = log.performedBy?.name?.toLowerCase().includes(q) || log.performedBy?.email?.toLowerCase().includes(q);
        const matchCollection = log.collectionLabel?.toLowerCase().includes(q) || log.collectionName?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        if (!matchTitle && !matchUser && !matchCollection && !matchDetails) return false;
      }

      // Collection filter
      if (selectedCollection !== 'all' && log.collectionName !== selectedCollection) {
        return false;
      }

      // User filter
      if (selectedUser !== 'all' && log.performedBy?.uid !== selectedUser && log.performedBy?.email !== selectedUser) {
        return false;
      }

      // Action filter (for all_logs tab)
      if (activeTab === 'all_logs' && selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }

      return true;
    });
  }, [auditLogs, activeTab, searchQuery, selectedCollection, selectedUser, selectedAction]);

  // Statistics
  const stats = useMemo(() => {
    const totalDeleted = auditLogs.filter(l => l.action === 'delete').length;
    const totalRestored = auditLogs.filter(l => l.action === 'restore' || l.status === 'restored').length;
    const uniqueModerators = new Set(auditLogs.map(l => l.performedBy?.email || l.performedBy?.uid)).size;
    const mediaDeleted = auditLogs.filter(l => l.collectionName === 'media' && l.action === 'delete').length;

    return {
      totalLogs: auditLogs.length,
      totalDeleted,
      totalRestored,
      uniqueModerators,
      mediaDeleted
    };
  }, [auditLogs]);

  // Unique collections present in logs
  const availableCollections = useMemo(() => {
    const map = new Map<string, string>();
    auditLogs.forEach(log => {
      if (log.collectionName && log.collectionLabel) {
        map.set(log.collectionName, log.collectionLabel);
      }
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [auditLogs]);

  // Unique users present in logs
  const availableUsers = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    auditLogs.forEach(log => {
      if (log.performedBy?.email || log.performedBy?.uid) {
        const id = log.performedBy.uid || log.performedBy.email;
        map.set(id, {
          name: log.performedBy.name || 'مشرف',
          email: log.performedBy.email || ''
        });
      }
    });
    return Array.from(map.entries()).map(([id, user]) => ({ id, ...user }));
  }, [auditLogs]);

  // Handle Restore
  const handleRestore = async (log: AuditLogItem) => {
    if (!log.itemData) {
      toast.error('لا يمكن استرجاع هذا العنصر لعدم توفر نسخة بيانات محفوظة له');
      return;
    }

    setRestoringId(log.id);
    const toastId = toast.loading(`جاري استرجاع "${log.itemTitle}"...`);

    try {
      await restoreDeletedItem(log);
      toast.success(`تم استرجاع "${log.itemTitle}" بنجاح إلى قسم ${log.collectionLabel}!`, { id: toastId });
    } catch (err: any) {
      console.error('Failed to restore:', err);
      toast.error(`حدث خطأ أثناء الاسترجاع: ${err.message || 'خطأ غير معروف'}`, { id: toastId });
    } finally {
      setRestoringId(null);
    }
  };

  const getActionBadge = (action: string, status?: string) => {
    if (status === 'restored' || action === 'restore') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <RotateCcw size={12} className="shrink-0" />
          تم الاسترجاع
        </span>
      );
    }
    if (action === 'delete') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <Trash2 size={12} className="shrink-0" />
          حذف عنصر
        </span>
      );
    }
    if (action === 'create') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Sparkles size={12} className="shrink-0" />
          إضافة جديدة
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <RefreshCw size={12} className="shrink-0" />
        تعديل
      </span>
    );
  };

  const getCollectionIcon = (coll: string) => {
    switch (coll) {
      case 'media':
      case 'media_playlists':
        return <ImageIcon size={16} className="text-emerald-500" />;
      case 'news':
        return <FileText size={16} className="text-blue-500" />;
      case 'matches':
      case 'clubs':
        return <Trophy size={16} className="text-amber-500" />;
      case 'products':
      case 'orders':
        return <ShoppingBag size={16} className="text-purple-500" />;
      case 'songs':
      case 'albums':
      case 'playlists':
        return <Music size={16} className="text-rose-500" />;
      case 'books':
        return <BookOpen size={16} className="text-teal-500" />;
      default:
        return <Layers size={16} className="text-slate-500" />;
    }
  };

  const copySnapshot = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setHasCopied(true);
    toast.success('تم نسخ بيانات العنصر إلى الحافظة');
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Top Banner / Stats Header */}
      <div className="bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-emerald-300 text-xs font-black">
              <Shield size={14} className="text-emerald-400" />
              نظام الرقابة والأمان وسلة الاسترجاع
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              سجل نشاط المشرفين وسلة المحذوفات
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              تتبع دقيق لكل ما يفعله المشرفون (من مسح ماذا، ومن قام بالتعديل أو الإضافة) مع إمكانية استرجاع أي عنصر أو صورة تم حذفها بنقرة زر واحدة فوراً.
            </p>
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
              <span>سلة المحذوفات</span>
              <Trash2 size={16} className="text-red-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{stats.totalDeleted}</div>
            <div className="text-[11px] text-red-300 mt-0.5">عنصر تم حذفه</div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
              <span>تم استرجاعها</span>
              <RotateCcw size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">{stats.totalRestored}</div>
            <div className="text-[11px] text-emerald-200 mt-0.5">عنصر مسترد بنجاح</div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
              <span>المشرفون المسجلون</span>
              <User size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{stats.uniqueModerators}</div>
            <div className="text-[11px] text-blue-200 mt-0.5">مشرفين نشطين</div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
              <span>إجمالي السجلات</span>
              <History size={16} className="text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-300">{stats.totalLogs}</div>
            <div className="text-[11px] text-slate-300 mt-0.5">عملية موثقة</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Controls */}
      <div className="bg-white dark:bg-card-dark rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 dark:border-border-dark space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Tab Buttons */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-surface-dark rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('trash')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
                activeTab === 'trash'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Trash2 size={16} />
              <span>سلة المحذوفات والقابلة للاسترجاع</span>
              {stats.totalDeleted > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'trash' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600 dark:bg-red-950/40'
                }`}>
                  {stats.totalDeleted}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all_logs')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
                activeTab === 'all_logs'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <History size={16} />
              <span>سجل كافة تحركات المشرفين (Live Log)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'all_logs' ? 'bg-white text-primary' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {stats.totalLogs}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان، اسم المشرف، البريد، أو القسم..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-border-dark text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold ml-2">
            <Filter size={14} />
            <span>تصفية:</span>
          </div>

          {/* Section / Collection Filter */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل الأقسام ({availableCollections.length})</option>
            <option value="media">المالتيميديا والوسائط والصور</option>
            <option value="news">الأخبار والمقالات</option>
            <option value="matches">المباريات</option>
            <option value="products">المتجر والمنتجات</option>
            <option value="songs">المكتبة الموسيقية</option>
            <option value="books">الكتب والمجلات</option>
            <option value="fan_posts">منشورات الجماهير</option>
            <option value="users">الأعضاء والمستخدمين</option>
            {availableCollections.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>

          {/* Supervisor Filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل المشرفين ({availableUsers.length})</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email || 'بدون بريد'})
              </option>
            ))}
          </select>

          {/* Action Filter (Only in all logs tab) */}
          {activeTab === 'all_logs' && (
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">كل الإجراءات</option>
              <option value="delete">عمليات الحذف فقط</option>
              <option value="restore">عمليات الاسترجاع</option>
              <option value="create">عمليات الإضافة</option>
              <option value="update">عمليات التعديل</option>
            </select>
          )}

          {/* Clear Filters Button */}
          {(selectedCollection !== 'all' || selectedUser !== 'all' || selectedAction !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCollection('all');
                setSelectedUser('all');
                setSelectedAction('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all mr-auto"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Logs / Items List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-card-dark rounded-3xl p-12 text-center border border-slate-100 dark:border-border-dark">
            <div className="w-16 h-16 bg-slate-100 dark:bg-surface-dark rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              {activeTab === 'trash' ? <Trash2 size={28} /> : <History size={28} />}
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-1">
              {activeTab === 'trash' ? 'سلة المحذوفات فارغة حالياً' : 'لا توجد سجلات تطابق البحث'}
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
              {activeTab === 'trash'
                ? 'أي عنصر يتم حذفه من قبل المشرفين سيتم حفظه تلقائياً هنا مع إمكانية استرجاعه ببياناته كاملة في أي وقت.'
                : 'حاول تغيير معايير البحث أو الفلاتر المختارة لعرض العمليات.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isRestored = log.status === 'restored' || log.action === 'restore';
            const canRestore = log.itemData && !isRestored;

            return (
              <div
                key={log.id}
                className={`bg-white dark:bg-card-dark rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md ${
                  isRestored
                    ? 'border-emerald-500/30 bg-emerald-500/[0.01]'
                    : log.action === 'delete'
                    ? 'border-red-500/20 hover:border-red-500/40'
                    : 'border-slate-100 dark:border-border-dark'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Item Info & Thumbnail */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Thumbnail or Collection Icon */}
                    <div className="relative shrink-0">
                      {log.itemThumbnail ? (
                        <img
                          src={log.itemThumbnail}
                          alt={log.itemTitle}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 dark:border-border-dark bg-slate-100 dark:bg-surface-dark"
                          onError={(e) => {
                            (e.currentTarget as any).src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=200';
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center border border-slate-200 dark:border-border-dark">
                          {getCollectionIcon(log.collectionName)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-card-dark rounded-full shadow-sm border border-slate-200 dark:border-border-dark">
                        {getCollectionIcon(log.collectionName)}
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getActionBadge(log.action, log.status)}
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                          {log.collectionLabel}
                        </span>
                        {log.itemId && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{log.itemId.slice(0, 10)}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                        {log.itemTitle}
                      </h4>

                      {log.details && (
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {log.details}
                        </p>
                      )}

                      {/* Moderator who performed the action & Timestamp */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-primary" />
                          <span>بواسطة:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {log.performedBy?.name || 'مشرف'}
                          </span>
                          {log.performedBy?.email && (
                            <span className="text-slate-400 text-[11px]">
                              ({log.performedBy.email})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={13} />
                          <span>
                            {log.timestamp ? format(new Date(log.timestamp), 'dd MMMM yyyy - hh:mm a', { locale: ar }) : 'غير محدد'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-border-dark">
                    {/* Preview JSON/Snapshot Button */}
                    <button
                      onClick={() => setSelectedLogForPreview(log)}
                      className="p-2.5 text-slate-500 hover:text-primary bg-slate-50 dark:bg-surface-dark hover:bg-primary/10 rounded-xl transition-all border border-slate-200 dark:border-border-dark"
                      title="معاينة بيانات العنصر"
                    >
                      <Eye size={16} />
                    </button>

                    {/* Restore Button */}
                    {isRestored ? (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/20">
                        <CheckCircle size={14} />
                        <span>تم استرجاعه</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRestore(log)}
                        disabled={restoringId === log.id || !log.itemData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        <RotateCcw size={15} className={restoringId === log.id ? 'animate-spin' : ''} />
                        <span>استرجاع العنصر 🔄</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {selectedLogForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-card-dark rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-border-dark animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-border-dark">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  {getCollectionIcon(selectedLogForPreview.collectionName)}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    معاينة بيانات العنصر المحذوف / المعدل
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedLogForPreview.collectionLabel} - {selectedLogForPreview.itemTitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLogForPreview(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-dark transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Summary Card */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-border-dark">
                {selectedLogForPreview.itemThumbnail && (
                  <img
                    src={selectedLogForPreview.itemThumbnail}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-400">
                    المشرف المنفذ: <span className="text-slate-700 dark:text-slate-200">{selectedLogForPreview.performedBy?.name}</span> ({selectedLogForPreview.performedBy?.email})
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    تاريخ العملية: <span className="text-slate-700 dark:text-slate-200">{format(new Date(selectedLogForPreview.timestamp), 'dd MMMM yyyy - hh:mm a', { locale: ar })}</span>
                  </div>
                </div>
              </div>

              {/* Raw JSON Snapshot */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-500">
                    البيانات الكاملة المحفوظة (JSON Snapshot):
                  </span>
                  <button
                    onClick={() => copySnapshot(selectedLogForPreview.itemData)}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    {hasCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{hasCopied ? 'تم النسخ' : 'نسخ البيانات'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto max-h-60 border border-slate-800" dir="ltr">
                  {JSON.stringify(selectedLogForPreview.itemData || { message: 'لا توجد بيانات محفوظة' }, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-border-dark flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedLogForPreview(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs transition-all"
              >
                إغلاق
              </button>

              {selectedLogForPreview.itemData && selectedLogForPreview.status !== 'restored' && (
                <button
                  onClick={() => {
                    handleRestore(selectedLogForPreview);
                    setSelectedLogForPreview(null);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md transition-all"
                >
                  <RotateCcw size={14} />
                  <span>استرجاع العنصر إلى قسمه الآن 🔄</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
