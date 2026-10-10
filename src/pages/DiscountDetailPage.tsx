import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Percent, MapPin, Phone, ShieldAlert, 
  ExternalLink, Share2, CheckCircle2, Copy, Check, Star, Building2,
  Compass, AlertCircle, Info
} from 'lucide-react';
import { useAppStore } from '../store';
import { defaultMemberDiscounts } from '../data/defaultMemberDiscounts';
import { getCategoryBadge, getHighestDiscountPercentage } from './DiscountsPage';

export default function DiscountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { memberDiscounts } = useAppStore();

  const [copied, setCopied] = useState(false);

  // Find provider by ID
  const provider = useMemo(() => {
    const list = (memberDiscounts && memberDiscounts.length > 0) 
      ? memberDiscounts 
      : defaultMemberDiscounts;
    return list.find(d => d.id === id);
  }, [memberDiscounts, id]);

  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-right" dir="rtl">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 text-center max-w-sm border border-slate-200 dark:border-slate-800 shadow-md">
          <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-black text-slate-800 dark:text-slate-200 mb-2">لم يتم العثور على الخصم</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            قد يكون الخصم المكلوب غير موجود أو تم إزالته.
          </p>
          <button
            onClick={() => navigate('/club-members/discounts')}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-emerald-700 transition-all"
          >
            العودة لصفحة الخصومات
          </button>
        </div>
      </div>
    );
  }

  const badge = getCategoryBadge(provider.category);
  const maxPerc = getHighestDiscountPercentage(provider.discountDetails);

  // Parse phone numbers
  const parsedPhones = provider.phoneNumbers
    ? provider.phoneNumbers.split(/[-,\/]+/).map(p => p.trim()).filter(Boolean)
    : [];

  // Copy link
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  // Google Maps Search URL
  const mapsSearchUrl = provider.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.name + ' ' + provider.address)}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-right" dir="rtl">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white pt-5 pb-8 px-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/club-members/discounts')}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/15"
            aria-label="رجوع"
          >
            <ArrowRight size={20} />
          </button>

          <span className="text-sm font-black text-white">تفاصيل الخصم</span>

          <button
            onClick={handleCopyLink}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/15 relative"
            aria-label="مشاركة"
          >
            {copied ? <Check size={18} className="text-amber-300" /> : <Share2 size={18} />}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-4 space-y-4 relative z-10">
        {/* Main Provider Title Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.color}`}>
              <span>{badge.icon}</span>
              <span>{badge.label}</span>
            </span>

            {provider.featured && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-900 flex items-center gap-1 shadow-sm">
                <Star size={12} className="fill-slate-900" /> جهة مميزة
              </span>
            )}
          </div>

          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight mb-2">
            {provider.name}
          </h1>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Compass size={14} className="text-primary" /> {provider.location || 'الإسكندرية'}
            </span>
          </div>
        </div>

        {/* Medical / Service Disclaimer Banner */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-[11px] text-amber-700 dark:text-amber-300">تنويه هام للأعضاء:</span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
              هذه الخدمة استرشادية فقط لأعضاء نادي الاتحاد السكندري. لا تقدم المنصة أي توصيات طبية ولا تقيم جودة الخدمات الطبية.
            </p>
          </div>
        </div>

        {/* Discount Offers Box */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-white/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20">
                <Percent size={22} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">تفاصيل الخصم المتاح</h2>
                <p className="text-[10px] text-emerald-100/80">خاص بأعضاء نادي الاتحاد السكندري</p>
              </div>
            </div>

            {maxPerc > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-900 shadow-md">
                حتى {maxPerc}٪
              </span>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs font-bold leading-relaxed text-emerald-50">
            {provider.discountDetails}
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-100/90 font-medium bg-black/10 p-2.5 rounded-xl border border-white/10">
            <Info size={14} className="text-amber-300 shrink-0" />
            <span>يرجى إبراز كارنية عضوية نادي الاتحاد السكندري قبل طلب الخدمة للاستفادة من الخصم.</span>
          </div>
        </div>

        {/* Contact Phone Numbers */}
        {parsedPhones.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Phone size={16} className="text-primary" /> أرقام التواصل والتليفون
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {parsedPhones.map((phone, idx) => (
                <a
                  key={idx}
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 transition-all text-slate-800 dark:text-slate-200 text-xs font-bold group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                      <Phone size={14} />
                    </div>
                    <span className="dir-ltr text-right font-black">{phone}</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary group-hover:translate-x-[-2px] transition-transform">
                    اتصال 📞
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Address & Location Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin size={16} className="text-primary" /> العنوان والموقع
          </h3>

          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            {provider.address}
          </p>

          <a
            href={mapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>فتح خريطة Google Maps</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
