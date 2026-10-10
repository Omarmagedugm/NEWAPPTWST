import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Globe, CheckCircle2, ShieldCheck, Send, MapPin, User, Mail, Phone, Users, Image as ImageIcon, Upload, X } from 'lucide-react';
import { WorldCountry, WorldApplication } from '../../types/worldFans';
import { useAppStore } from '../../store';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import ImageUploader from '../ImageUploader';

interface WorldFoundLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  countries: WorldCountry[];
}

export const WorldFoundLeagueModal: React.FC<WorldFoundLeagueModalProps> = ({
  isOpen,
  onClose,
  countries,
}) => {
  const { profile, worldApplications, setWorldApplications } = useAppStore();
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [applicantName, setApplicantName] = useState<string>(profile.name || '');
  const [applicantEmail, setApplicantEmail] = useState<string>(profile.email || '');
  const [applicantPhone, setApplicantPhone] = useState<string>((profile as any).phone || (profile as any).phoneNumber || '');
  const [applicantWhatsapp, setApplicantWhatsapp] = useState<string>((profile as any).phone || (profile as any).phoneNumber || '');
  const [countryId, setCountryId] = useState<string>(countries[0]?.id || 'sa');
  const [city, setCity] = useState<string>('');
  const [proposedGroupName, setProposedGroupName] = useState<string>('');
  const [estimatedFansCount, setEstimatedFansCount] = useState<number>(30);
  const [motivation, setMotivation] = useState<string>('');
  const [logo, setLogo] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !city || !motivation) return;

    setIsSubmitting(true);
    try {
      const selectedCountry = countries.find(c => c.id === countryId);
      const newApp: WorldApplication = {
        id: uuidv4(),
        userId: auth.currentUser?.uid || 'guest',
        applicantUid: auth.currentUser?.uid || 'guest',
        applicantName: applicantName.trim(),
        adminName: applicantName.trim(),
        applicantEmail: applicantEmail.trim() || 'fan@itthadalextv.com',
        adminEmail: applicantEmail.trim() || 'fan@itthadalextv.com',
        applicantPhone: applicantPhone.trim() || 'N/A',
        adminPhone: applicantPhone.trim() || 'N/A',
        applicantWhatsapp: applicantWhatsapp.trim() || applicantPhone.trim() || 'N/A',
        countryId,
        countryName: selectedCountry?.name || selectedCountry?.nameAr || 'بالخارج',
        countryFlag: selectedCountry?.flag || '🌍',
        city: city.trim(),
        groupName: proposedGroupName.trim() || `رابطة مشجعي الاتحاد في ${city.trim()}`,
        proposedGroupName: proposedGroupName.trim() || `رابطة مشجعي الاتحاد في ${city.trim()}`,
        logo: logo.trim() || '',
        estimatedFansCount: Number(estimatedFansCount) || 20,
        expectedMembers: Number(estimatedFansCount) || 20,
        motivation: motivation.trim(),
        notes: motivation.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const cleanedApp = cleanFirestoreData(newApp);

      setWorldApplications([cleanedApp, ...worldApplications]);

      try {
        await setDoc(doc(db, 'world_applications', cleanedApp.id), cleanedApp, { merge: true });
      } catch (err) {
        console.warn('Application stored locally:', err);
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting application:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {isSubmitted ? (
          <div className="p-6 text-center py-8 space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              تم استلام طلب تأسيس الرابطة بنجاح!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
              شكرًا لغيرتك وحرصك على تمثيل سيد البلد. سيقوم فريق إدارة التطبيق ورابطة المشجعين بمراجعة بياناتك والتواصل معك عبر الواتساب لاعتماد الرابطة رسميًا وتدشين صفحتها.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md active:scale-95 transition-all"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    طلب تأسيس رابطة رسمية
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    كن قائدًا لجمهور سيد البلد في مدينتك حول العالم
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 overscroll-contain">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <ShieldCheck size={18} className="shrink-0 text-emerald-600" />
                <span>
                  يحصل مؤسس الرابطة المعتمد على وسام "سفير سيد البلد" وصلاحية إدارة الفعاليات والتجمعات وقروب الواتساب بالمدينة.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="اسمك الثلاثي"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الدولة *</label>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المدينة ومكان الإقامة *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: الرياض، دبي، لندن، فرانكفورت"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الواتساب للتواصل *</label>
                  <input
                    type="tel"
                    required
                    value={applicantWhatsapp}
                    onChange={(e) => setApplicantWhatsapp(e.target.value)}
                    placeholder="+966xxxxxxxxx / +971xxxxxxxxx"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الاسم المقترح للرابطة</label>
                  <input
                    type="text"
                    value={proposedGroupName}
                    onChange={(e) => setProposedGroupName(e.target.value)}
                    placeholder="مثال: رابطة اتحاداوية الرياض"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">العدد التقديري للجماهير بالمدينة</label>
                  <input
                    type="number"
                    value={estimatedFansCount}
                    onChange={(e) => setEstimatedFansCount(Number(e.target.value))}
                    min={5}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              {/* League Logo Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                    شعار الرابطة (اختياري)
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                    رفع صورة الشعار
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <ImageUploader
                      folderName="world_groups"
                      onUploadSuccess={(url) => {
                        setLogo(url);
                      }}
                      buttonText="رفع شعار من جهازك"
                      buttonClassName="!bg-emerald-600 hover:!bg-emerald-700 !text-white !py-2 !px-3.5 !rounded-xl !text-xs !font-bold !shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      showPreview={false}
                    />
                  </div>

                  {logo ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                        <img
                          src={logo}
                          alt="شعار الرابطة"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex-1 whitespace-nowrap">
                        ✓ تم تحديد الشعار
                      </span>
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="text-slate-400 hover:text-red-500 p-1 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="حذف الشعار"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      لم يتم رفع شعار بعد
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">خطة العمل والتجمعات المقترحة *</label>
                <textarea
                  rows={3}
                  required
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="كيف تنوي تجميع الجماهير؟ هل هناك أماكن أو كافيهات محددة لمشاهدة المباريات؟..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold resize-none text-xs"
                />
              </div>
            </div>

            {/* Fixed Footer Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 active:scale-95 transition-all text-xs whitespace-nowrap shrink-0"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all text-xs whitespace-nowrap shrink-0"
              >
                <Send size={14} />
                <span className="whitespace-nowrap">{isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب التأسيس'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
      </motion.div>
    </div>
  );
};
