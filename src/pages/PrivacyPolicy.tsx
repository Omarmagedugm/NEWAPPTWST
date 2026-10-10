import { motion } from 'motion/react';
import { Shield, Lock, Eye, Trash2, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 pb-24 bg-background-light dark:bg-background-dark min-h-screen">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
            <Shield className="text-primary w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">سياسة الخصوصية / Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
        </motion.div>

        {/* Content Section - Arabic */}
        <motion.section variants={itemVariants} className="glass-card p-6 sm:p-8 rounded-[32px] border border-border-light dark:border-border-dark space-y-6 text-right" dir="rtl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-primary rounded-full" />
            <h2 className="text-xl font-black text-slate-800 dark:text-white">أولاً: اللغة العربية</h2>
          </div>

          <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed font-bold text-sm">
            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <Eye size={18} /> نصدرك ما نجمع
              </h3>
              <p>عند استخدامك لتطبيق "قناة الاتحاد السكندري" وتسجيل الدخول عبر Google، نجمع المعلومات التالية:</p>
              <ul className="list-disc list-inside mr-4 mt-2 space-y-1">
                <li>الاسم الكامل.</li>
                <li>عنوان البريد الإلكتروني.</li>
                <li>صورة الملف الشخصي.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <Lock size={18} /> كيف نستخدم بياناتك
              </h3>
              <p>نستخدم هذه البيانات فقط لـ:</p>
              <ul className="list-disc list-inside mr-4 mt-2 space-y-1">
                <li>إنشاء حسابك وتخصيص تجربتك داخل التطبيق.</li>
                <li>إدارة التعليقات والمشاركة في "فان زون".</li>
                <li>إرسال تنبيهات هامة حول التطبيق (في حال تفعيلك للإشعارات).</li>
              </ul>
            </div>

            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <Shield size={18} /> خدمات الطرف الثالث
              </h3>
              <p>نستخدم خدمات Google و Firebase لإدارة الهوية وتخزين البيانات. جميع بياناتك مشفرة ومؤمنة وفقاً لمعايير الأمان العالمية لهذه المنصات.</p>
            </div>

            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <Trash2 size={18} /> حقوقك في حذف البيانات
              </h3>
              <p>لك الحق الكامل في حذف بياناتك في أي وقت. يمكنك القيام بذلك من خلال:</p>
              <ul className="list-disc list-inside mr-4 mt-2 space-y-1">
                <li>خيار "حذف الحساب" داخل إعدادات الملف الشخصي (إذا كان متاحاً).</li>
                <li>مراسلتنا عبر البريد الإلكتروني الموضح أدناه لطلب حذف حسابك يدوياً.</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Content Section - English */}
        <motion.section variants={itemVariants} className="glass-card p-6 sm:p-8 rounded-[32px] border border-border-light dark:border-border-dark space-y-6 text-left" dir="ltr">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-accent rounded-full" />
            <h2 className="text-xl font-black text-slate-800 dark:text-white">II. English Version</h2>
          </div>

          <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-sm">
            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <Eye size={18} /> Data Collection
              </h3>
              <p>When you use the "Ittihad Fan App" and log in via Google, we collect:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Your Full Name.</li>
                <li>Your Email Address.</li>
                <li>Profile Picture URL.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <Lock size={18} /> Usage of Data
              </h3>
              <p>We use this information strictly to:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Personalize your experience within the app.</li>
                <li>Manage comments and community interactions.</li>
                <li>Authentication and security purposes.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <Shield size={18} /> Third-Party Services
              </h3>
              <p>We utilize Google and Firebase for authentication and database services. Your data is handled in accordance with their industry-standard security protocols.</p>
            </div>

            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <Trash2 size={18} /> Data Deletion Rights
              </h3>
              <p>You have the right to request the deletion of your data at any time. You can:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Use the "Delete Account" button in your profile settings.</li>
                <li>Contact us via email to request manual deletion.</li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Contact Info */}
        <motion.div variants={itemVariants} className="text-center p-8 bg-slate-50 dark:bg-card-dark rounded-[32px] border border-dashed border-border-light dark:border-border-dark">
          <Mail className="mx-auto text-primary mb-3" size={24} />
          <h3 className="font-black text-slate-800 dark:text-white mb-2">للتواصل والاستفسارات / Contact Us</h3>
          <p className="text-primary font-black text-lg">info@itthadalextv.com</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
