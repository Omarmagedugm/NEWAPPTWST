import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, UserProfile } from '../store';
import React, { useState, useEffect, useMemo } from 'react';
import { Camera, X, Check, Lock, ShieldCheck, Mail, Loader2, Save, Upload, Edit2, Newspaper, Trophy, Award, Flame, Target } from 'lucide-react';
import { db, auth, uploadImage, handleFirestoreError, OperationType } from '../lib/firebase';
import { requestNotificationPermission } from '../lib/onesignal';
import { calculateUserEngagement } from '../lib/fanEngagement';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { updatePassword, updateProfile as updateAuthProfile, updateEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import ImageUploader from '../components/ImageUploader';
import DigitalFanID from '../components/DigitalFanID';
import { getOptimizedImage } from '../lib/cloudinary';

export default function Profile() {
  const { profile, theme, toggleTheme, users, fanPosts, predictions, matches, polls, orders } = useAppStore();
  const updateProfile = useAppStore(state => state.updateProfile);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editData, setEditData] = useState<UserProfile>({ ...profile });
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });
  const navigate = useNavigate();

  // Calculate real fan loyalty and engagement points
  const engagementStats = useMemo(() => {
    return calculateUserEngagement(profile, {
      predictions,
      matches,
      fanPosts,
      polls,
      orders
    });
  }, [profile, predictions, matches, fanPosts, polls, orders]);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const result = await requestNotificationPermission();
      if (result.success || (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted')) {
        setNotificationsEnabled(true);
        toast.success('تم تفعيل إشعارات المباريات والأخبار بنجاح عبر OneSignal 🔔');
      } else if (result.reason === 'ios_not_standalone') {
        toast('يرجى تثبيت التطبيق أولاً (إضافة إلى الشاشة الرئيسية 📲) لتفعيل الإشعارات على هواتف آيفون', {
          duration: 6000
        });
      } else if (result.reason === 'permission_denied') {
        toast.error('تم حظر الإشعارات في المتصفح. اضغط على أيقونة القفل 🔒 بجانب الرابط وفعل الإشعارات.', {
          duration: 6000
        });
      } else {
        toast.error('يرجى السماح بالإشعارات في إعدادات المتصفح');
      }
    } else {
      setNotificationsEnabled(false);
      toast('يمكنك كتم الإشعارات أو إدارتها من إعدادات المتصفح');
    }
  };

  // Handle auth state check
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsAuthChecking(false);
      if (!user) navigate('/auth');
    });
    return unsub;
  }, [navigate]);

  // Sync editData when modal opens or profile changes
  useEffect(() => {
    if (showEditModal) {
      setEditData({ ...profile });
    }
  }, [showEditModal, profile]);

  const TIER_DATA = {
    new: { label: 'عضو جديد', color: 'bg-blue-500', icon: 'person_add' },
    bronze: { label: 'عضو برونزي', color: 'bg-orange-700', icon: 'workspace_premium' },
    silver: { label: 'عضو فضي', color: 'bg-slate-400', icon: 'stars' },
    gold: { label: 'عضو ذهبي', color: 'bg-yellow-500', icon: 'diamond' },
    diamond: { label: 'عضو ماسي', color: 'bg-cyan-400', icon: 'auto_awesome' },
    premium: { label: 'عضو ملكي', color: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600', icon: 'military_tech' },
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setMessage(null);
    try {
      // Create user data object for Firestore
      const docData = {
        name: editData.name || profile.name,
        username: editData.username || profile.username || '',
        bio: editData.bio || profile.bio || '',
        location: editData.location || profile.location || '',
        avatar: editData.avatar || profile.avatar,
        email: profile.email || auth.currentUser.email || '',
        role: profile.role || 'user',
        tier: profile.tier || 'new',
        uid: auth.currentUser.uid,
      };
      
      // Use setDoc with merge for robustness
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), docData, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }

      // Update Auth Profile
      await updateAuthProfile(auth.currentUser, {
        displayName: editData.name,
        photoURL: editData.avatar
      });

      updateProfile(editData);
      setShowEditModal(false);
      setMessage({ text: 'تم تحديث البيانات بنجاح', type: 'success' });
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setMessage({ text: 'فشل تحديث البيانات: ' + (err.message || 'حاول مرة أخرى'), type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || !newPassword) return;
    setPasswordLoading(true);
    setMessage(null);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setMessage({ text: 'تم تغيير كلمة المرور بنجاح', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message === 'Firebase: Error (auth/requires-recent-login).' || err.code === 'auth/requires-recent-login' ? 'يجب تسجيل الخروج والدخول مرة أخرى لتغيير كلمة المرور' : 'حدث خطأ في تغيير كلمة المرور', type: 'error' });
    } finally {
      setPasswordLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleChangeEmail = async () => {
    if (!auth.currentUser || !newEmail) return;
    setEmailLoading(true);
    setMessage(null);
    try {
      await updateEmail(auth.currentUser, newEmail);
      
      // Also update in Firestore
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { email: newEmail });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
      
      setShowEmailModal(false);
      setNewEmail('');
      setMessage({ text: 'تم تغيير البريد الإلكتروني بنجاح', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.code === 'auth/requires-recent-login' ? 'يجب تسجيل الخروج والدخول مرة أخرى لتغيير البريد الإلكتروني' : 'حدث خطأ في تغيير البريد الإلكتروني', type: 'error' });
    } finally {
      setEmailLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // High-level admin/editor check
  const isOmar = auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isDev = auth.currentUser?.email === 'copyrightofficialco@gmail.com';
  const hasCustomRoles = profile.roles && profile.roles.length > 0;
  const isAdmin = profile.role === 'admin' || isOmar || isDev;
  const isStaff = isAdmin || profile.role === 'writer' || profile.role === 'moderator' || hasCustomRoles;

  const handleLogout = async () => {
    try {
      await auth.signOut();
      try {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
      } catch (e) {}
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth', { replace: true });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  } as const;

  if (isAuthChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden pb-32 w-full max-w-lg mx-auto bg-background-light dark:bg-background-dark min-h-screen">
      <div className="flex flex-col flex-1">
        {/* Messages */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`mx-4 mt-4 p-3 rounded-2xl text-xs font-black text-center ${message.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card Section */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="flex flex-col items-center gap-5 p-6 pt-10"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-125"></div>
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-[2.5rem] h-36 w-36 border-4 border-white dark:border-surface-dark shadow-2xl relative z-10" 
              style={{ backgroundImage: `url('${getOptimizedImage(profile.avatar || auth.currentUser?.photoURL || 'https://ui-avatars.com/api/?name=User', 120)}')` }}
            >
            </div>
            {(profile.isVerified || profile.role === 'admin') && (
              <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-lg ring-4 ring-white dark:ring-surface-dark z-20">
                <span className="material-symbols-outlined !text-[20px]">verified</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center justify-center gap-1.5 text-center px-4">
            <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
              {profile.name || auth.currentUser?.displayName || 'مستخدم جديد'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold -mt-1">@{profile.username || 'user'}</p>
            
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
              {(profile.role === 'admin' || (profile.roles && profile.roles.includes('admin'))) && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black shadow-md ring-2 ring-red-500/20">
                  <span className="material-symbols-outlined !text-[14px]">shield_person</span>
                  <span>مدير التطبيق</span>
                </div>
              )}
              {(profile.role === 'moderator' || (profile.roles && profile.roles.includes('user_manager'))) && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-md">
                  <span className="material-symbols-outlined !text-[14px]">verified_user</span>
                  <span>مشرف النظام</span>
                </div>
              )}
              {(profile.role === 'writer' || (profile.roles && profile.roles.includes('news_editor'))) && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-md">
                  <span className="material-symbols-outlined !text-[14px]">edit_note</span>
                  <span>محرر الأخبار</span>
                </div>
              )}
              {profile.tier && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-black shadow-md ${TIER_DATA[profile.tier as keyof typeof TIER_DATA]?.color || 'bg-slate-500'}`}>
                  <span className="material-symbols-outlined !text-[14px]">{TIER_DATA[profile.tier as keyof typeof TIER_DATA]?.icon}</span>
                  <span>{TIER_DATA[profile.tier as keyof typeof TIER_DATA]?.label || 'عضو'}</span>
                </div>
              )}
            </div>

            {profile.bio && (
              <p className="mt-3 text-slate-600 dark:text-slate-300 text-xs font-medium max-w-[280px] leading-relaxed">
                {profile.bio}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-sm">
                <span className="material-symbols-outlined !text-[16px]">location_on</span>
                <span>{profile.location || 'الإسكندرية'}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-xs font-black text-primary px-3 py-1 rounded-full bg-primary/10">عضو منذ {profile.joinDate || '٢٠٢٤'}</span>
            </div>
            
            <button 
              onClick={() => setShowEditModal(true)}
              className="mt-4 bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-300 px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 pressable transition-colors hover:bg-slate-200 dark:hover:bg-border-dark"
            >
              <Edit2 size={14} />
              تعديل الملف الشخصي
            </button>
          </div>
        </motion.div>

        {/* Loyalty Points & Rank Hero Card */}
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="px-4 pb-4"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-primary-dark to-slate-900 p-5 text-white shadow-lg border border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Trophy size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">رصيد الولاء والتفاعل</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${engagementStats.rankBadge.bg} ${engagementStats.rankBadge.color}`}>
                    {engagementStats.rankBadge.label}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mt-0.5">
                  {engagementStats.totalPoints.toLocaleString('ar-EG')}{' '}
                  <span className="text-xs font-bold text-emerald-200">نقطة</span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => navigate('/fanzone?tab=leaderboard', { state: { activeTab: 'leaderboard' } })}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Award size={14} className="text-amber-300" />
              <span>لوحة الصدارة</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-4 pb-8"
        >
          <div 
            onClick={() => navigate('/fanzone', { state: { activeTab: 'predictions' } })}
            className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-white p-4 shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark pressable group cursor-pointer transition-colors hover:border-green-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined !text-[20px]">sports_soccer</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{engagementStats.totalPredictions}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">التوقعات ({engagementStats.correctScores} صائبة)</span>
          </div>

          <div 
            onClick={() => navigate('/fanzone', { state: { activeTab: 'all' } })}
            className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-white p-4 shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark pressable group cursor-pointer transition-colors hover:border-blue-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined !text-[20px]">article</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{engagementStats.totalPosts}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">المنشورات الحقيقية</span>
          </div>

          <div 
            onClick={() => navigate('/fanzone?tab=leaderboard', { state: { activeTab: 'leaderboard' } })}
            className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-white p-4 shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark pressable group cursor-pointer transition-colors hover:border-red-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined !text-[20px] font-variation-settings-fill">favorite</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{engagementStats.totalLikesReceived}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">إعجابات نلتها</span>
          </div>

          <div 
            onClick={() => navigate('/fanzone?tab=leaderboard', { state: { activeTab: 'leaderboard' } })}
            className="flex flex-col items-center justify-center gap-1.5 rounded-3xl bg-white p-4 shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark pressable group cursor-pointer transition-colors hover:border-amber-500/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined !text-[20px]">thumb_up</span>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{engagementStats.totalLikesGiven}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">إعجابات عملتها</span>
          </div>
        </motion.div>

        {/* Digital Fan ID Section */}
        <motion.div variants={itemVariants} className="flex flex-col px-4 mb-8">
          <h3 className="mb-3 px-2 text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-primary-light"></span>
            بطاقة المشجع الرقمية
          </h3>
          <div className="overflow-hidden rounded-3xl bg-white p-6 shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark flex justify-center">
            <DigitalFanID 
              username={profile.name || auth.currentUser?.displayName || 'مستخدم جديد'}
              avatarUrl={getOptimizedImage(profile.avatar || auth.currentUser?.photoURL || 'https://ui-avatars.com/api/?name=User', 120)}
              role={profile.role}
              tier={profile.tier}
            />
          </div>
        </motion.div>

        {/* Settings Section */}
        <motion.div variants={itemVariants} className="flex flex-col px-4">
          <h3 className="mb-3 px-2 text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-primary"></span>
            إعدادات الحساب
          </h3>
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark">
            {/* Notification Setting */}
            <button 
              onClick={handleToggleNotifications}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-dark pressable group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-300 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">notifications</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">الإشعارات</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">تنبيهات المباريات، التحديثات</span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${notificationsEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <motion.div 
                  animate={{ x: notificationsEnabled ? 20 : 2 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
            </button>
            <div className="h-px w-full bg-slate-100 dark:border-t dark:border-border-dark"></div>
            {/* Theme Setting */}
            <button 
              onClick={toggleTheme}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-dark pressable group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-300 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">palette</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">الوضع الليلي</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">تغيير مظهر التطبيق</span>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <motion.div 
                  animate={{ x: theme === 'dark' ? 20 : 2 }}
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
            </button>
            <div className="h-px w-full bg-slate-100 dark:border-t dark:border-border-dark"></div>
            {/* Staff / Admin Dashboard */}
            {isStaff && (
              <>
                <Link to="/admin" className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-dark pressable group">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">لوحة التحكم</span>
                      <span className="text-[10px] font-semibold text-primary/80 mt-0.5">إدارة محتوى المنصة والصلاحيات</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary !text-[20px]">chevron_left</span>
                </Link>
                <div className="h-px w-full bg-slate-100 dark:border-t dark:border-border-dark"></div>
              </>
            )}

            {/* Change Email */}
            <button 
              onClick={() => setShowEmailModal(true)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-dark pressable group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-300 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">mail</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">تغيير البريد الإلكتروني</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">تحديث بريدك الإلكتروني المسجل</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400 !text-[20px]">chevron_left</span>
            </button>

            <div className="h-px w-full bg-slate-100 dark:border-t dark:border-border-dark"></div>
            
            {/* Change Password */}
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-dark pressable group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-300 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">lock_reset</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">تغيير كلمة المرور</span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">تأمين حسابك بكلمة مرور جديدة</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400 !text-[20px]">chevron_left</span>
            </button>
            
          </div>

          <h3 className="mb-3 mt-8 px-2 text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-slate-400"></span>
            الدعم
          </h3>
          <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm border border-border-light/60 dark:border-border-dark dark:bg-card-dark">
            <button 
              onClick={() => { toast('يمكنك مراسلتنا عبر: info@itthadalextv.com أو عبر رسائل الصفحة الرسمية على فيسبوك', { icon: '✉️' }); }}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-surface-dark pressable group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-surface-dark dark:text-slate-300 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined !text-[20px]">mail</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">تواصل معنا</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400 !text-[20px]">chevron_left</span>
            </button>
            <div className="h-px w-full bg-slate-100 dark:border-t dark:border-border-dark"></div>
            <button 
              onClick={handleLogout}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-red-50/50 dark:hover:bg-red-900/10 pressable group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
                  <span className="material-symbols-outlined !text-[20px]">logout</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold text-red-500 dark:text-red-400">تسجيل الخروج</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-red-300 dark:text-red-400/50 !text-[20px]">chevron_left</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-card-dark rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black">تعديل الملف الشخصي</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 px-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer h-24 w-24">
                  <div 
                    className="w-24 h-24 rounded-full bg-cover bg-center border-2 border-primary shadow-md relative overflow-hidden"
                    style={{ backgroundImage: `url('${getOptimizedImage(editData.avatar, 120)}')` }}
                  />
                  <div className="absolute -bottom-1 -right-1">
                    <ImageUploader
                      folderName="profile_avatars"
                      iconOnly={true}
                      buttonClassName="bg-primary text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-card-dark cursor-pointer transition-transform hover:scale-110 flex items-center justify-center w-7 h-7"
                      onUploadSuccess={(url) => setEditData({...editData, avatar: url})}
                      onError={() => toast.error('فشل في رفع الصورة')}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 p-2 overflow-x-auto no-scrollbar max-w-full">
                  {[
                    'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff',
                    'https://ui-avatars.com/api/?name=ITTI&background=059669&color=fff',
                    'https://ui-avatars.com/api/?name=Alex&background=d97706&color=fff',
                    'https://ui-avatars.com/api/?name=Fan&background=dc2626&color=fff',
                    'https://ui-avatars.com/api/?name=Ittihad&background=1e293b&color=fff'
                  ].map((preset) => (
                    <button 
                      key={preset}
                      onClick={() => setEditData({...editData, avatar: preset})}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${editData.avatar === preset ? 'border-primary scale-110' : 'border-transparent'}`}
                    >
                      <img src={getOptimizedImage(preset, 80)} className="w-full h-full rounded-full" alt="preset" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">رابط الصورة الشخصية</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={editData.avatar}
                      onChange={(e) => setEditData({...editData, avatar: e.target.value})}
                      placeholder="https://..."
                      className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary transition-colors outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">الاسم</label>
                  <input 
                    type="text" 
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">اسم المستخدم (بالإنجليزي)</label>
                  <input 
                    type="text" 
                    dir="ltr"
                    value={editData.username}
                    onChange={(e) => setEditData({...editData, username: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary transition-colors outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">الموقع</label>
                  <input 
                    type="text" 
                    value={editData.location}
                    onChange={(e) => setEditData({...editData, location: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">السيرة الذاتية</label>
                  <textarea 
                    value={editData.bio}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-4 py-3 text-sm focus:border-primary transition-colors outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-3 rounded-2xl font-black text-sm shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  حفظ التعديلات
                </button>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-black text-sm"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-card-dark rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black">تغيير كلمة المرور</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-1 px-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl pr-12 pl-4 py-3 text-sm focus:border-primary transition-colors outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword}
                  className="flex-1 bg-primary text-white py-3 rounded-2xl font-black text-sm shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  تغيير الرقم السري
                </button>
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-black text-sm"
                >
                  إلغاء
                </button>
              </div>
              <p className="mt-4 text-[10px] text-center text-slate-400 font-bold">لأسباب أمنية قد يطلب منك النظام إعادة تسجيل الدخول</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmailModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-card-dark rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black">تغيير البريد الإلكتروني</h3>
                <button onClick={() => setShowEmailModal(false)} className="p-1 px-2 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">البريد الإلكتروني الجديد</label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      dir="ltr"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl pr-12 pl-4 py-3 text-sm focus:border-primary transition-colors outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={handleChangeEmail}
                  disabled={emailLoading || !newEmail}
                  className="flex-1 bg-primary text-white py-3 rounded-2xl font-black text-sm shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  تحديث البريد
                </button>
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-300 py-3 rounded-2xl font-black text-sm"
                >
                  إلغاء
                </button>
              </div>
              <p className="mt-4 text-[10px] text-center text-slate-400 font-bold">يجب تسجيل الدخول مرة أخرى بعد تغيير البريد</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
