import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  Plus, 
  Sparkles, 
  Share2, 
  Coffee, 
  Tv, 
  Trophy,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { WorldEvent, WorldGroup } from '../../types/worldFans';
import { CountryFlag } from './CountryFlag';
import { useAppStore } from '../../store';
import { doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import ImageUploader from '../ImageUploader';

interface WorldEventsTabProps {
  events: WorldEvent[];
  groups: WorldGroup[];
  selectedGroupId?: string;
}

export const WorldEventsTab: React.FC<WorldEventsTabProps> = ({
  events,
  groups,
  selectedGroupId,
}) => {
  const { profile, worldEvents, setWorldEvents } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New Event Form State
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [groupId, setGroupId] = useState<string>(selectedGroupId || (groups[0]?.id || ''));
  const [eventType, setEventType] = useState<'match_viewing' | 'gathering' | 'sports_activity' | 'celebration'>('match_viewing');
  const [eventDate, setEventDate] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [mapsUrl, setMapsUrl] = useState<string>('');
  const [image, setImage] = useState<string>('');

  const currentUser = auth.currentUser;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  const filteredEvents = events.filter(e => {
    if (selectedGroupId && e.groupId !== selectedGroupId) return false;
    return true;
  });

  // Handle RSVP
  const handleToggleRSVP = async (eventId: string) => {
    const userId = currentUser?.uid || 'guest_' + Math.random().toString(36).substring(7);
    const updated = worldEvents.map(e => {
      if (e.id !== eventId) return e;
      const isAttending = e.participantUids?.includes(userId);
      const newUids = isAttending
        ? e.participantUids?.filter(id => id !== userId) || []
        : [...(e.participantUids || []), userId];
      return {
        ...e,
        participantsCount: newUids.length,
        participantUids: newUids,
      };
    });

    setWorldEvents(updated);

    try {
      const target = worldEvents.find(e => e.id === eventId);
      const isAttending = target?.participantUids?.includes(userId);
      await updateDoc(doc(db, 'world_events', eventId), {
        participantsCount: isAttending ? (target?.participantsCount || 1) - 1 : (target?.participantsCount || 0) + 1,
        participantUids: isAttending ? arrayRemove(userId) : arrayUnion(userId),
      });
    } catch (err) {
      console.warn('RSVP updated locally:', err);
    }
  };

  // Handle Delete Event (Admin or Organizer)
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا التجمع؟')) return;

    const updated = worldEvents.filter(e => e.id !== eventId);
    setWorldEvents(updated);

    try {
      await deleteDoc(doc(db, 'world_events', eventId));
    } catch (err) {
      console.warn('Firestore delete event sync:', err);
    }
  };

  // Handle Status Change (Admin)
  const handleStatusChange = async (eventId: string, newStatus: 'upcoming' | 'ongoing' | 'completed' | 'cancelled') => {
    const updated = worldEvents.map(e => e.id === eventId ? { ...e, status: newStatus } : e);
    setWorldEvents(updated);

    try {
      await updateDoc(doc(db, 'world_events', eventId), {
        status: newStatus
      });
    } catch (err) {
      console.warn('Status change sync:', err);
    }
  };

  // Handle Create Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate || !location) return;

    setIsSubmitting(true);
    try {
      const targetGroup = groups.find(g => g.id === groupId);
      const newEvent: WorldEvent = {
        id: uuidv4(),
        groupId,
        groupName: targetGroup ? targetGroup.name : 'رابطة المشجعين',
        groupFlag: targetGroup?.countryFlag || '🌍',
        countryName: targetGroup ? targetGroup.countryName : 'بالخارج',
        city: city || targetGroup?.city || 'المدينة',
        title: title.trim(),
        description: description.trim(),
        type: eventType,
        date: eventDate,
        time: eventTime || '07:00 م بتوقيت القاهرة',
        location: location.trim(),
        mapsUrl: mapsUrl.trim() || '',
        image: image.trim() || '',
        participantsCount: 1,
        participantUids: [currentUser?.uid || 'host'],
        status: 'upcoming',
        createdAt: new Date().toISOString(),
      };

      const cleanedEvent = cleanFirestoreData(newEvent);

      setWorldEvents([cleanedEvent, ...worldEvents]);

      try {
        await setDoc(doc(db, 'world_events', cleanedEvent.id), cleanedEvent, { merge: true });
      } catch (err) {
        console.warn('Firestore event write note:', err);
      }

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setLocation('');
      setCity('');
      setMapsUrl('');
      setImage('');
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Coffee size={20} className="text-amber-500" />
            <span>تجمعات المباريات والفعاليات بالخارج</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            شاهد مباريات الاتحاد مع أبناء الإسكندرية في كافيهات وقاعات مدينتك
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span>تنظيم تجمع</span>
        </button>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
            <Tv size={24} />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-white mb-1">
            لا توجد تجمعات مجدولة حالياً
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4 font-medium">
            كن المبادر ونظم تجمعاً لمشاهدة مباراة سيد البلد القادمة مع أصدقائك في مدينتك!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow active:scale-95"
          >
            إضافة تجمع مشاهدة مباراة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((evt) => {
            const isAttending = evt.participantUids?.includes(currentUser?.uid || '');
            const canManage = isAdmin || (currentUser?.uid && evt.participantUids?.[0] === currentUser.uid);

            return (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm flex flex-col justify-between overflow-hidden relative"
              >
                {/* Event Cover if available */}
                {evt.image && (
                  <div className="h-32 -mx-5 -mt-5 mb-4 overflow-hidden relative">
                    <img
                      src={evt.image}
                      alt={evt.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                  </div>
                )}

                <div>
                  {/* Badge & League */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <CountryFlag
                        countryCode={evt.groupId}
                        flag={evt.groupFlag}
                        countryName={evt.groupName}
                        size="xs"
                      />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {evt.groupName}
                      </span>
                    </div>

                    {/* Status & Admin delete */}
                    <div className="flex items-center gap-1.5">
                      {isAdmin ? (
                        <select
                          value={evt.status || 'upcoming'}
                          onChange={(e) => handleStatusChange(evt.id, e.target.value as any)}
                          className="text-[10px] font-bold rounded-lg px-2 py-0.5 bg-slate-100 dark:bg-slate-700 border-none text-slate-700 dark:text-slate-300"
                        >
                          <option value="upcoming">قادم ⏳</option>
                          <option value="ongoing">جارٍ الآن 🟢</option>
                          <option value="completed">انتهى ✓</option>
                          <option value="cancelled">ملغي ✕</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          evt.status === 'ongoing'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-pulse'
                            : evt.status === 'completed'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}>
                          {evt.status === 'ongoing' ? 'جارٍ الآن' : evt.status === 'completed' ? 'انتهى' : 'قادم'}
                        </span>
                      )}

                      {canManage && (
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="حذف التجمع"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2 leading-snug">
                    {evt.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 mb-4 leading-relaxed">
                    {evt.description || 'تجمع جماهيري حاشد لتشجيع ومساندة سيد البلد وسط أجواء سكندرية أصيلة.'}
                  </p>

                  {/* Details Grid */}
                  <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs mb-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Calendar size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>التاريخ: {evt.date}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <Clock size={14} className="text-amber-500 shrink-0" />
                      <span>الموعد: {evt.time}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                      <MapPin size={14} className="text-red-500 shrink-0" />
                      <span className="line-clamp-1">المكان: {evt.location} ({evt.city})</span>
                    </div>
                  </div>
                </div>

                {/* RSVP & Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Users size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{evt.participantsCount || 1} مسجلين بالحضور</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {evt.mapsUrl && (
                      <a
                        href={evt.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
                        title="الموقع على خرائط جوجل"
                      >
                        <MapPin size={15} />
                      </a>
                    )}

                    <button
                      onClick={() => handleToggleRSVP(evt.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 active:scale-95 transition-all ${
                        isAttending
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white'
                      }`}
                    >
                      <CheckCircle size={14} />
                      <span>{isAttending ? 'أنا حاضر ✓' : 'سأحضر التجمع'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>تنظيم تجمع أو مشاهدة مباراة</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                إغلاق ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الرابطة / الدولة</label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.countryFlag} {g.name} ({g.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان الفعالية / التجمع *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مشاهدة مباراة الاتحاد والزمالك في كافيه الأندلس"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نوع التجمع</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  >
                    <option value="match_viewing">مشاهدة مباراة ⚽</option>
                    <option value="gathering">لقاء وتعارف ☕</option>
                    <option value="sports_activity">نشاط رياضي 🏃</option>
                    <option value="celebration">احتفالية 🏆</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المدينة *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: الرياض، دبي"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الموعد والتوقيت</label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="مثال: 07:00 م بتوقيت القاهرة"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">العنوان / اسم المكان أو الكافيه *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مثال: كافيه الأندلس، شارع التحلية"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رابط المكان على خرائط جوجل (اختياري)</label>
                <input
                  type="url"
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  dir="ltr"
                />
              </div>

              {/* Event Image Upload */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                    صورة الفعالية / المكان (اختياري)
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                    رفع صورة
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <ImageUploader
                      folderName="world_events"
                      onUploadSuccess={(url) => {
                        setImage(url);
                      }}
                      buttonText="رفع صورة"
                      buttonClassName="!bg-emerald-600 hover:!bg-emerald-700 !text-white !py-2 !px-3.5 !rounded-xl !text-xs !font-bold !shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      showPreview={false}
                    />
                  </div>

                  {image ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-12 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                        <img
                          src={image}
                          alt="صورة الفعالية"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex-1 whitespace-nowrap">
                        ✓ تم اختيار الصورة
                      </span>
                      <button
                        type="button"
                        onClick={() => setImage('')}
                        className="text-slate-400 hover:text-red-500 p-1 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="حذف الصورة"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      لم يتم رفع صورة
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">تفاصيل إضافية أو تعليمات</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: يرجى ارتداء تيشرت الاتحاد الأخضر والحضور قبل المباراة بنصف ساعة..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs whitespace-nowrap shrink-0"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Plus size={15} />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'نشر التجمع'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
