import { motion } from 'motion/react';
import { FileText, AlertCircle, Info, Radio, ShieldAlert, Mail } from 'lucide-react';

export default function TermsOfService() {
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
          <div className="inline-flex items-center justify-center p-3 bg-accent/10 rounded-2xl mb-2">
            <FileText className="text-accent w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">شروط الخدمة / Terms of Service</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
        </motion.div>

        {/* Arabic Terms */}
        <motion.section variants={itemVariants} className="glass-card p-6 sm:p-8 rounded-[32px] border border-border-light dark:border-border-dark space-y-6 text-right" dir="rtl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-primary rounded-full" />
            <h2 className="text-xl font-black text-slate-800 dark:text-white">أولاً: اللغة العربية</h2>
          </div>

          <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed font-bold text-sm">
            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <Info size={18} /> طبيعة الخدمة
              </h3>
              <p>تطبيق "قناة الاتحاد السكندري" هو منصة إعلامية غير رسمية (أو رسمية حسب الحالة) تهدف لتوفير أخبار، فيديوهات، وبث مباشر لمباريات نادي الاتحاد السكندري لمحبي النادي.</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
              <h3 className="text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-2">
                <Radio size={18} /> إخلاء مسؤولية البث المباشر
              </h3>
              <p>البث المباشر يتم توفيره من مصادر خارجية أو روابط عامة. نحن لا نضمن استمرارية البث أو جودته، كما أننا غير مسؤولين عن أي محتوى إعلاني يظهر داخل مشغل الفيديو الخارجي.</p>
            </div>

            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <ShieldAlert size={18} /> الملكية الفكرية
              </h3>
              <p>جميع الشعارات والعلامات التجارية الخاصة بنادي الاتحاد السكندري هي ملك للنادي. المحتوى الخبري والمرئي المعروض يهدف للنشر الإعلامي والتشجيع الرياضي.</p>
            </div>

            <div>
              <h3 className="text-primary flex items-center gap-2 mb-2">
                <AlertCircle size={18} /> سلوك المستخدم
              </h3>
              <p>يُمنع منعاً باتاً استخدام لغة غير لائقة أو مسيئة في التعليقات أو منطقة الجماهير. يحق لإدارة التطبيق حظر أي مستخدم يخالف هذه القواعد دون سابق إنذار.</p>
            </div>
          </div>
        </motion.section>

        {/* English Terms */}
        <motion.section variants={itemVariants} className="glass-card p-6 sm:p-8 rounded-[32px] border border-border-light dark:border-border-dark space-y-6 text-left" dir="ltr">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-8 bg-accent rounded-full" />
            <h2 className="text-xl font-black text-slate-800 dark:text-white">II. English Version</h2>
          </div>

          <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-sm">
            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <Info size={18} /> Description of Service
              </h3>
              <p>"Ittihad Fan App" provides news, video highlights, and live streaming links for Al Ittihad Alexandria Club matches and fans.</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <h3 className="text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-2 uppercase font-black italic">
                <Radio size={18} /> Streaming Disclaimer
              </h3>
              <p>Live streams are sourced from third-party providers. We do not host the streams directly on our servers and cannot guarantee uptime or quality. We are not responsible for any content or advertisements displayed within external players.</p>
            </div>

            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <ShieldAlert size={18} /> Intellectual Property
              </h3>
              <p>Club logos and trademarks belong to their respective owners. Media content is provided for informational and fan engagement purposes only.</p>
            </div>

            <div>
              <h3 className="text-accent flex items-center gap-2 mb-2 uppercase font-black italic">
                <AlertCircle size={18} /> User Conduct
              </h3>
              <p>Abusive, offensive, or inappropriate behavior in comments or community sections is strictly prohibited. We reserve the right to ban any user who violates these terms.</p>
            </div>
          </div>
        </motion.section>

         {/* Final Note */}
         <motion.div variants={itemVariants} className="text-center p-8 bg-slate-50 dark:bg-card-dark rounded-[32px] border border-dashed border-border-light dark:border-border-dark">
          <Mail className="mx-auto text-primary mb-3" size={24} />
          <h3 className="font-black text-slate-800 dark:text-white mb-2">البريد الإلكتروني / Official Support</h3>
          <p className="text-primary font-black text-lg">info@itthadalextv.com</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
