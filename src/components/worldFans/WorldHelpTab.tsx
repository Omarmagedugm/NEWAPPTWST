import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  HelpCircle, 
  MessageSquare, 
  Send, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Compass, 
  Sparkles, 
  MapPin, 
  FileText, 
  Home, 
  Tv,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { WorldHelpRequest, WorldCountry } from '../../types/worldFans';
import { CountryFlag } from './CountryFlag';
import { useAppStore } from '../../store';
import { doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

interface WorldHelpTabProps {
  helpRequests: WorldHelpRequest[];
  countries: WorldCountry[];
}

const CATEGORIES = [
  { id: 'all', label: 'جميع الاستفسارات 🌐' },
  { id: 'housing_jobs', label: 'سكن وعمل 🏢' },
  { id: 'match_streaming', label: 'مشاهدة المباريات 📺' },
  { id: 'legal_visas', label: 'إقامات وأوراق 📄' },
  { id: 'general', label: 'نصائح عامة 💡' },
];

export const WorldHelpTab: React.FC<WorldHelpTabProps> = ({
  helpRequests,
  countries,
}) => {
  const { profile, worldHelpRequests, setWorldHelpRequests } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAskModal, setShowAskModal] = useState<boolean>(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Form State
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('general');
  const [countryId, setCountryId] = useState<string>(countries[0]?.id || '');
  const [city, setCity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentUser = auth.currentUser;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const filteredRequests = helpRequests.filter(r => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  });

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedCountry = countries.find(c => c.id === countryId);
      const newReq: WorldHelpRequest = {
        id: uuidv4(),
        userId: currentUser?.uid || 'guest',
        userName: profile.name || currentUser?.displayName || 'مشجع مغترب',
        userAvatar: profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80',
        countryId,
        countryName: selectedCountry?.name || selectedCountry?.nameAr || 'بالخارج',
        countryFlag: selectedCountry?.flag || '🌍',
        city: city.trim() || '',
        title: title.trim(),
        content: content.trim(),
        category,
        status: 'open',
        repliesCount: 0,
        replies: [],
        createdAt: new Date().toISOString(),
      };

      const cleanedReq = cleanFirestoreData(newReq);

      setWorldHelpRequests([cleanedReq, ...worldHelpRequests]);

      try {
        await setDoc(doc(db, 'world_help_requests', cleanedReq.id), cleanedReq, { merge: true });
      } catch (err) {
        console.warn('Firestore write note:', err);
      }

      setShowAskModal(false);
      setTitle('');
      setContent('');
      setCity('');
    } catch (err) {
      console.error('Error creating help request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (requestId: string) => {
    if (!replyText.trim()) return;

    const newReply = {
      id: uuidv4(),
      userId: currentUser?.uid || 'guest',
      userName: profile.name || currentUser?.displayName || 'عضو الرابطة',
      userAvatar: profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80',
      content: replyText.trim(),
      text: replyText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = worldHelpRequests.map(r => {
      if (r.id !== requestId) return r;
      const currentReplies = r.replies || [];
      return {
        ...r,
        repliesCount: (r.repliesCount || 0) + 1,
        replies: [...currentReplies, newReply],
      };
    });

    setWorldHelpRequests(updated);
    setReplyText('');

    try {
      await updateDoc(doc(db, 'world_help_requests', requestId), {
        repliesCount: (worldHelpRequests.find(r => r.id === requestId)?.repliesCount || 0) + 1,
        replies: arrayUnion(newReply)
      });
    } catch (e) {
      console.warn('Reply added locally:', e);
    }
  };

  // Handle Delete Help Request (Admin or Author)
  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاستفسار؟')) return;

    const updated = worldHelpRequests.filter(r => r.id !== requestId);
    setWorldHelpRequests(updated);

    try {
      await deleteDoc(doc(db, 'world_help_requests', requestId));
    } catch (e) {
      console.warn('Delete request sync:', e);
    }
  };

  // Handle Status Change (Admin)
  const handleStatusChange = async (requestId: string, nextStatus: 'open' | 'resolved' | 'closed') => {
    const updated = worldHelpRequests.map(r => r.id === requestId ? { ...r, status: nextStatus } : r);
    setWorldHelpRequests(updated);

    try {
      await updateDoc(doc(db, 'world_help_requests', requestId), {
        status: nextStatus
      });
    } catch (e) {
      console.warn('Status update sync:', e);
    }
  };

  // Handle Delete Reply (Admin or Reply Author)
  const handleDeleteReply = async (requestId: string, replyId: string) => {
    const req = worldHelpRequests.find(r => r.id === requestId);
    if (!req || !req.replies) return;

    const targetReply = req.replies.find(rep => rep.id === replyId);
    const updatedReplies = req.replies.filter(rep => rep.id !== replyId);

    const updated = worldHelpRequests.map(r => {
      if (r.id !== requestId) return r;
      return {
        ...r,
        repliesCount: Math.max(0, (r.repliesCount || 1) - 1),
        replies: updatedReplies,
      };
    });

    setWorldHelpRequests(updated);

    if (targetReply) {
      try {
        await updateDoc(doc(db, 'world_help_requests', requestId), {
          repliesCount: Math.max(0, (req.repliesCount || 1) - 1),
          replies: arrayRemove(targetReply)
        });
      } catch (e) {
        console.warn('Reply remove sync:', e);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Intro Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900/40 via-slate-900 to-emerald-950/60 border border-emerald-500/20 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-black flex items-center gap-2 mb-1">
            <Compass size={20} className="text-emerald-400" />
            <span>دليل المغترب وتبادل الخبرات</span>
          </h3>
          <p className="text-xs text-slate-300 font-medium leading-relaxed max-w-lg">
            هل وصلت لبلد جديد؟ اسأل إخوانك الاتحاداوية عن السكن، القنوات الناقلة للمباريات، والخدمات المتاحة للمغتربين.
          </p>
        </div>

        <button
          onClick={() => setShowAskModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
        >
          <Plus size={16} />
          <span>طرح استفسار</span>
        </button>
      </div>

      {/* Categories Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-400">لا توجد استفسارات في هذا القسم حالياً. كن أول من يطرح سؤالاً!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = activeRequestId === req.id;
            const canManage = isAdmin || (currentUser?.uid && req.userId === currentUser.uid);

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm overflow-hidden"
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <CountryFlag
                      countryCode={req.countryId}
                      flag={req.countryFlag}
                      countryName={req.countryName}
                      size="sm"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {req.countryName} {req.city && `(${req.city})`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      بواسطة {req.userName} • {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAdmin ? (
                      <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value as any)}
                        className="text-[10px] font-bold rounded-lg px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-none"
                      >
                        <option value="open">مفتوح ⏳</option>
                        <option value="resolved">تم الحل ✓</option>
                        <option value="closed">مغلق ✕</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'resolved'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}>
                        {req.status === 'resolved' ? 'تم الحل ✓' : 'مفتوح للنقاش'}
                      </span>
                    )}

                    {canManage && (
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="حذف الاستفسار"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Question */}
                <h4 className="text-sm font-black text-slate-800 dark:text-white mb-1.5 leading-snug">
                  {req.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-3 whitespace-pre-line">
                  {req.content}
                </p>

                {/* Footer and replies toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setActiveRequestId(isExpanded ? null : req.id)}
                    className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <MessageSquare size={15} />
                    <span>{req.repliesCount || req.replies?.length || 0} إجابات ونصائح</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-bold">
                    {req.category === 'housing_jobs' ? 'سكن وعمل' : req.category === 'match_streaming' ? 'مشاهدة المباريات' : req.category === 'legal_visas' ? 'إقامات' : 'عام'}
                  </span>
                </div>

                {/* Expanded Replies Section */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                    {/* Add Reply Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddReply(req.id)}
                        placeholder="أضف نصيحتك أو إجابتك..."
                        className="flex-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                      />
                      <button
                        onClick={() => handleAddReply(req.id)}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                      >
                        <Send size={14} />
                      </button>
                    </div>

                    {/* Replies list */}
                    {req.replies && req.replies.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {req.replies.map((reply) => {
                          const canDeleteReply = isAdmin || (currentUser?.uid && reply.userId === currentUser.uid);

                          return (
                            <div key={reply.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-xs flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800 dark:text-white">{reply.userName}</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">اتحداوي</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400">{new Date(reply.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{reply.content || reply.text}</p>
                              </div>

                              {canDeleteReply && (
                                <button
                                  onClick={() => handleDeleteReply(req.id, reply.id)}
                                  className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                                  title="حذف الرد"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 text-center py-2">لا توجد إجابات بعد. كن أول من يساعده!</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Ask Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-500" />
                <span>طرح استفسار في دليل المغترب</span>
              </h3>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الدولة المعنية *</label>
                <select
                  value={countryId}
                  onChange={(e) => setCountryId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.flag} {c.name || c.nameAr || c.code}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المدينة (اختياري)</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: الرياض، دبي، لندن"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">القسم</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    <option value="general">نصائح عامة 💡</option>
                    <option value="housing_jobs">سكن وعمل 🏢</option>
                    <option value="match_streaming">مشاهدة المباريات 📺</option>
                    <option value="legal_visas">إقامات وأوراق 📄</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان الاستفسار *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: كيف أشاهد مباراة الاتحاد في الاتحاد الأوروبي؟"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تفاصيل السؤال أو المشكلة *</label>
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اشرح استفسارك بالتفصيل لمساعدة الأعضاء على إجابتك..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'جاري الإرسال...' : 'نشر الاستفسار'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
