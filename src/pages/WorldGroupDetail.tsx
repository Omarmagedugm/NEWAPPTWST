import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { 
  ArrowRight, 
  Users, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Share2, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  Image as ImageIcon, 
  Info,
  Heart,
  Settings,
  Edit3,
  Trash2,
  Star,
  Save,
  X,
  Phone,
  Mail,
  Globe,
  UserCheck,
  UserPlus,
  Clock
} from 'lucide-react';
import { useAppStore } from '../store';
import { WorldFeedTab } from '../components/worldFans/WorldFeedTab';
import { WorldEventsTab } from '../components/worldFans/WorldEventsTab';
import { WorldGroup, WorldGroupMember } from '../types/worldFans';
import { CountryFlag } from '../components/worldFans/CountryFlag';
import { doc, updateDoc, deleteDoc, setDoc, collection, query, where, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from '../lib/firebase';
import ImageUploader from '../components/ImageUploader';

export const WorldGroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    worldGroups, 
    setWorldGroups, 
    worldPosts, 
    worldEvents, 
    profile,
    worldCountries 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'about'>('feed');
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinedMembers, setJoinedMembers] = useState<WorldGroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);

  // Admin edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<Partial<WorldGroup>>({});

  const group = worldGroups.find((g) => g.id === id);
  const currentUser = auth.currentUser;

  // Fallback load group from Firestore if not in store
  useEffect(() => {
    if (!group && id) {
      getDoc(doc(db, 'world_groups', id))
        .then((snap) => {
          if (snap.exists()) {
            const fetchedGroup = { id: snap.id, ...(snap.data() as any) } as WorldGroup;
            setWorldGroups([...worldGroups.filter((g) => g.id !== id), fetchedGroup]);
          }
        })
        .catch((err) => console.warn('Failed to load group detail fallback:', err));
    }
  }, [group, id, setWorldGroups, worldGroups]);

  // Admin permission check
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isGroupAdmin = isAdmin || (currentUser?.uid && group?.adminUid === currentUser.uid);

  // Realtime subscription to actual group members in Firestore
  useEffect(() => {
    if (!group?.id) return;

    setLoadingMembers(true);
    const membersQuery = query(
      collection(db, 'world_group_members'),
      where('groupId', '==', group.id)
    );

    const unsubscribe = onSnapshot(
      membersQuery,
      (snapshot) => {
        const members = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<WorldGroupMember, 'id'>)
        }));
        setJoinedMembers(members);
        
        if (currentUser?.uid) {
          const isMember = members.some((m) => m.userId === currentUser.uid);
          setHasJoined(isMember);
        } else {
          setHasJoined(false);
        }
        setLoadingMembers(false);
      },
      (error) => {
        console.warn('Could not listen to group members:', error);
        setLoadingMembers(false);
      }
    );

    return () => unsubscribe();
  }, [group?.id, currentUser?.uid]);

  if (!group) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
          <Users size={32} />
        </div>
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-2">
          الرابطة غير موجودة أو تم نقلها
        </h2>
        <button
          onClick={() => navigate('/world-fans')}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md"
        >
          العودة لدليل الروابط
        </button>
      </div>
    );
  }

  const groupEvents = worldEvents.filter((e) => e.groupId === group.id);
  const groupPosts = worldPosts.filter((p) => p.groupId === group.id);
  
  // Calculate true actual members count
  const actualMemberCount = Math.max(Number(group.memberCount) || 0, joinedMembers.length);

  // Handle Join League Toggle
  const handleToggleJoin = async () => {
    if (!currentUser) {
      toast.error('يرجى تسجيل الدخول أولاً للانضمام للرابطة');
      navigate('/auth');
      return;
    }

    setIsJoining(true);
    try {
      const nextJoined = !hasJoined;
      const memberDocId = `${group.id}_${currentUser.uid}`;

      if (nextJoined) {
        // Add member record to Firestore
        const newMemberRecord: WorldGroupMember = {
          id: memberDocId,
          groupId: group.id,
          groupName: group.name,
          countryId: group.countryId,
          userId: currentUser.uid,
          userName: profile.name || currentUser.displayName || 'مشجع اتحادي',
          userAvatar: profile.avatar || currentUser.photoURL || '',
          userEmail: profile.email || currentUser.email || '',
          userRole: profile.role || 'member',
          joinedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'world_group_members', memberDocId), newMemberRecord);
        setJoinedMembers((prev) => [newMemberRecord, ...prev.filter(m => m.userId !== currentUser.uid)]);
        setHasJoined(true);

        const newCount = (Number(group.memberCount) || 0) + 1;
        const updated = worldGroups.map(g => g.id === group.id ? { ...g, memberCount: newCount } : g);
        setWorldGroups(updated);

        try {
          await updateDoc(doc(db, 'world_groups', group.id), {
            memberCount: newCount
          });
        } catch (err) {
          console.warn('Group member count updated:', err);
        }

        toast.success(`أهلاً بك! تم انضمامك بنجاح لرابطة ${group.name} 💚`);
      } else {
        // Remove member record from Firestore
        await deleteDoc(doc(db, 'world_group_members', memberDocId));
        setJoinedMembers((prev) => prev.filter(m => m.userId !== currentUser.uid));
        setHasJoined(false);

        const newCount = Math.max(0, (Number(group.memberCount) || 1) - 1);
        const updated = worldGroups.map(g => g.id === group.id ? { ...g, memberCount: newCount } : g);
        setWorldGroups(updated);

        try {
          await updateDoc(doc(db, 'world_groups', group.id), {
            memberCount: newCount
          });
        } catch (err) {
          console.warn('Group member count updated:', err);
        }

        toast.success('تم إلغاء الانضمام للرابطة');
      }
    } catch (error) {
      console.error('Error toggling group membership:', error);
      toast.error('حدث خطأ أثناء تحديث الانضمام، حاول مرة أخرى');
    } finally {
      setIsJoining(false);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    setEditFormData({
      name: group.name,
      countryId: group.countryId,
      countryName: group.countryName,
      countryFlag: group.countryFlag,
      city: group.city,
      description: group.description,
      logo: group.logo || '',
      coverImage: group.coverImage || '',
      status: group.status,
      verified: group.verified,
      featured: group.featured,
      adminName: group.adminName,
      adminPhone: group.adminPhone || '',
      adminEmail: group.adminEmail || '',
      whatsappGroupUrl: group.whatsappGroupUrl || group.socialLinks?.whatsapp || '',
      facebookPageUrl: group.facebookPageUrl || group.socialLinks?.facebook || '',
      memberCount: group.memberCount || 10,
      foundedYear: group.foundedYear || '2023',
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Changes
  const handleSaveGroupChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedGroup: WorldGroup = {
        ...group,
        ...editFormData,
        name: (editFormData.name || group.name).trim(),
        city: (editFormData.city || group.city).trim(),
        description: editFormData.description || group.description || '',
        logo: editFormData.logo || group.logo || '',
        coverImage: editFormData.coverImage || group.coverImage || '',
        adminName: (editFormData.adminName || group.adminName || '').trim(),
        adminPhone: (editFormData.adminPhone || group.adminPhone || '').trim(),
        adminEmail: (editFormData.adminEmail || group.adminEmail || '').trim(),
        adminWhatsapp: (editFormData.adminWhatsapp || group.adminWhatsapp || '').trim(),
        whatsappGroupUrl: (editFormData.whatsappGroupUrl || '').trim(),
        facebookPageUrl: (editFormData.facebookPageUrl || '').trim(),
        socialLinks: {
          whatsapp: (editFormData.whatsappGroupUrl || editFormData.socialLinks?.whatsapp || group.socialLinks?.whatsapp || '').trim(),
          facebook: (editFormData.facebookPageUrl || editFormData.socialLinks?.facebook || group.socialLinks?.facebook || '').trim(),
          instagram: editFormData.socialLinks?.instagram || group.socialLinks?.instagram || '',
          twitter: editFormData.socialLinks?.twitter || group.socialLinks?.twitter || '',
        },
        memberCount: Number(editFormData.memberCount) || group.memberCount || 10,
        foundedYear: editFormData.foundedYear || group.foundedYear || 2024,
        status: editFormData.status || group.status || 'official',
        verified: editFormData.verified !== undefined ? editFormData.verified : (group.verified || group.status === 'official'),
        featured: editFormData.featured !== undefined ? editFormData.featured : (group.featured || false),
        updatedAt: new Date().toISOString(),
      };

      const cleaned = cleanFirestoreData(updatedGroup);

      // Update in global state
      const updatedList = worldGroups.map(g => g.id === group.id ? cleaned : g);
      setWorldGroups(updatedList);

      // Update in Firestore
      await setDoc(doc(db, 'world_groups', group.id), cleaned, { merge: true });
      toast.success('تم حفظ تعديلات الرابطة بنجاح في قاعدة البيانات ✨');

      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error('Error saving group:', err);
      toast.error('تعذر حفظ البيانات: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Toggle Verification
  const handleToggleVerified = async () => {
    const nextVerified = !group.verified;
    const nextStatus = nextVerified ? 'official' : 'community';
    const updated = worldGroups.map(g => g.id === group.id ? { ...g, verified: nextVerified, status: nextStatus as any } : g);
    setWorldGroups(updated);

    try {
      await setDoc(doc(db, 'world_groups', group.id), {
        verified: nextVerified,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success(nextVerified ? 'تم اعتماد الرابطة كرابطة رسمية ✓' : 'تم تحويل الرابطة لرابطة جماهيرية');
    } catch (err: any) {
      console.warn('Verified sync:', err);
      toast.error('تعذر تحديث الاعتماد: ' + (err.message || ''));
    }
  };

  // Quick Toggle Featured
  const handleToggleFeatured = async () => {
    const nextFeatured = !group.featured;
    const updated = worldGroups.map(g => g.id === group.id ? { ...g, featured: nextFeatured } : g);
    setWorldGroups(updated);

    try {
      await setDoc(doc(db, 'world_groups', group.id), {
        featured: nextFeatured,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success(nextFeatured ? 'تم تمييز الرابطة في الواجهة ★' : 'تم إزالة التمييز');
    } catch (err: any) {
      console.warn('Featured sync:', err);
      toast.error('تعذر تحديث التمييز: ' + (err.message || ''));
    }
  };

  // General Admin can appoint a member as group leader
  const handleAppointLeader = async (member: WorldGroupMember) => {
    if (!isAdmin || !group) return;
    if (!window.confirm(`هل أنت متأكد من تعيين "${member.userName}" ليكون المشرف الرسمي على رابطة "${group.name}"؟`)) return;

    try {
      const updatedData = {
        adminUid: member.userId,
        adminName: member.userName,
        adminEmail: member.userEmail || group.adminEmail || '',
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'world_groups', group.id), cleanFirestoreData(updatedData));
      
      // Update role in members collection
      await updateDoc(doc(db, 'world_group_members', member.id), {
        role: 'group_admin',
        userRole: 'مشرف الرابطة'
      });

      const updatedGroup = { ...group, ...updatedData };
      setWorldGroups(worldGroups.map(g => g.id === group.id ? updatedGroup : g));
      
      // Update local joined members
      setJoinedMembers(joinedMembers.map(m => {
        if (m.id === member.id) return { ...m, role: 'group_admin', userRole: 'مشرف الرابطة' };
        if (m.userId === group.adminUid || m.userName === group.adminName) return { ...m, role: 'member', userRole: 'عضو' };
        return m;
      }));

      toast.success(`تم تعيين "${member.userName}" مشرفاً رسمياً على رابطة "${group.name}" بنجاح 👑`);
    } catch (err: any) {
      console.error('Error appointing admin:', err);
      toast.error('حدث خطأ أثناء تعيين المشرف: ' + (err.message || ''));
    }
  };

  // Delete Group (Admin only)
  const handleDeleteGroup = async () => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف "${group.name}" نهائياً من قاعدة البيانات؟`)) return;

    try {
      const updatedList = worldGroups.filter(g => g.id !== group.id);
      setWorldGroups(updatedList);

      try {
        await deleteDoc(doc(db, 'world_groups', group.id));
      } catch (err) {
        console.warn('Firestore delete sync:', err);
      }

      navigate('/world-fans');
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  const isOfficial = group.verified || group.status === 'approved' || group.status === 'official';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-28 pt-2">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back navigation & share */}
        <div className="flex items-center justify-between py-3 mb-2">
          <button
            onClick={() => navigate('/world-fans')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all"
          >
            <ArrowRight size={18} />
            <span>العودة لكل الروابط</span>
          </button>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin?tab=world_fans')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-black flex items-center gap-1.5 hover:bg-amber-500/20 active:scale-95 transition-all"
              >
                <Settings size={14} />
                <span>لوحة الإدارة</span>
              </button>
            )}

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: group.name,
                    text: `انضم إلى ${group.name} - رابطة اتحاداوية العالم`,
                    url: window.location.href,
                  });
                }
              }}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-emerald-600 active:scale-95 transition-all"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Global Admin & Group Admin Control Bar */}
        {isGroupAdmin && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-500/30 dark:border-amber-500/20 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Settings size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span>تحكم الإدارة الكامل في الرابطة</span>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    {isAdmin ? 'المشرف العام 👑' : 'مسؤول الرابطة 🛡️'}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  يمكنك تعديل كافة البيانات والشعارات، توثيق الرابطة، وحذفها.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={openEditModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow flex items-center gap-1 active:scale-95 transition-all"
              >
                <Edit3 size={13} />
                <span>تعديل الرابطة</span>
              </button>

              <button
                onClick={handleToggleVerified}
                className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 active:scale-95 transition-all ${
                  group.verified
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-400/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
                title="تبديل شارة التوثيق والاعتماد الرسمي"
              >
                <ShieldCheck size={13} className={group.verified ? 'text-amber-500' : 'text-slate-400'} />
                <span>{group.verified ? 'معتمدة رسمياً ✓' : 'توثيق رسمي'}</span>
              </button>

              <button
                onClick={handleToggleFeatured}
                className={`p-1.5 rounded-xl border active:scale-95 transition-all ${
                  group.featured
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title="تثبيت الرابطة في القائمة المميزة"
              >
                <Star size={15} fill={group.featured ? 'currentColor' : 'none'} />
              </button>

              {isAdmin && (
                <button
                  onClick={handleDeleteGroup}
                  className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 active:scale-95 transition-all"
                  title="حذف الرابطة نهائياً"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Group Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#063323] via-[#094731] to-[#042116] p-6 text-white shadow-2xl border border-emerald-500/30 mb-6">
          {/* Cover background */}
          {group.coverImage && (
            <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
              <img
                src={group.coverImage}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#042116] via-[#063323]/60 to-transparent" />
            </div>
          )}

          <div className="relative z-10">
            {/* Top row: Logo, Badges, Name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={group.logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80'}
                    alt={group.name}
                    className="w-20 h-20 rounded-3xl object-cover border-3 border-emerald-400/60 shadow-xl bg-slate-900"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center">
                    <CountryFlag
                      countryCode={group.countryId}
                      flag={group.countryFlag}
                      countryName={group.countryName}
                      size="sm"
                      shape="circle"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {group.name}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-emerald-200/90 font-semibold mt-1">
                    <MapPin size={14} className="text-amber-400" />
                    <span>{group.city}، {group.countryName}</span>
                    {group.foundedYear && (
                      <>
                        <span>•</span>
                        <span>تأسست {group.foundedYear}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {isOfficial ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shrink-0 whitespace-nowrap">
                        <ShieldCheck size={13} />
                        <span>رابطة رسمية</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-200 border border-white/10 shrink-0 whitespace-nowrap">
                        مجتمع جماهيري
                      </span>
                    )}

                    {group.adminName && (
                      <span className="text-[10px] text-emerald-200/90 font-medium whitespace-nowrap truncate max-w-[200px] sm:max-w-xs">
                        المشرف: {group.adminName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Join Group */}
              <div className="w-full sm:w-auto">
                <button
                  onClick={handleToggleJoin}
                  disabled={isJoining}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${
                    hasJoined
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>{hasJoined ? 'أنت عضو في الرابطة ✓' : 'انضم للرابطة'}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 text-center">
              <div>
                <div className="text-base font-black text-white">{actualMemberCount}</div>
                <div className="text-[10px] text-emerald-200/70 font-semibold">عضو منضم</div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-base font-black text-amber-300">{groupEvents.length}</div>
                <div className="text-[10px] text-emerald-200/70 font-semibold">تجمع وفعالية</div>
              </div>
              <div>
                <div className="text-base font-black text-emerald-300">{groupPosts.length}</div>
                <div className="text-[10px] text-emerald-200/70 font-semibold">منشور وتفاعل</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar shadow-sm">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
              activeTab === 'feed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            💬 المنتدى ({groupPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
              activeTab === 'events'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ☕ تجمعاتنا ({groupEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
              activeTab === 'members'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            👥 الأعضاء ({actualMemberCount})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl font-bold text-xs transition-all active:scale-95 ${
              activeTab === 'about'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ℹ️ عن الرابطة
          </button>
        </div>

        {/* Sub-tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WorldFeedTab
                posts={groupPosts}
                groups={worldGroups}
                selectedGroupId={group.id}
              />
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WorldEventsTab
                events={groupEvents}
                groups={worldGroups}
                selectedGroupId={group.id}
              />
            </motion.div>
          )}

          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Header and Stats */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Users size={20} className="text-emerald-600" />
                    <span>أعضاء رابطة {group.name}</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-xl border border-emerald-500/20">
                      {actualMemberCount} عضو
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    قائمة الأعضاء المنضمين والمشتركين رسمياً في هذه الرابطة
                  </p>
                </div>

                <button
                  onClick={handleToggleJoin}
                  disabled={isJoining}
                  className={`px-4 py-2 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto ${
                    hasJoined
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-100'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {hasJoined ? (
                    <>
                      <X size={14} />
                      <span>إلغاء الانضمام للرابطة</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>انضم الآن للرابطة</span>
                    </>
                  )}
                </button>
              </div>

              {/* Members Grid / List */}
              {loadingMembers ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-400">جاري تحميل قائمة الأعضاء...</span>
                </div>
              ) : joinedMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {joinedMembers.map((member) => {
                    const isSelf = member.userId === currentUser?.uid;
                    const isLeader = group.adminUid === member.userId || member.userName === group.adminName;

                    return (
                      <div
                        key={member.id}
                        className={`p-3 rounded-2xl bg-white dark:bg-slate-800 border transition-all flex items-center justify-between gap-3 shadow-sm ${
                          isSelf
                            ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                            : 'border-slate-200/80 dark:border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {member.userAvatar ? (
                              <img
                                src={member.userAvatar}
                                alt={member.userName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/40 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                                {member.userName?.charAt(0) || 'U'}
                              </div>
                            )}
                            {isLeader && (
                              <span className="absolute -top-1 -right-1 text-xs" title="مسؤول الرابطة">
                                👑
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                                {member.userName}
                              </h4>
                              {isSelf && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white shrink-0">
                                  أنت
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Clock size={10} />
                              <span>انضم {new Date(member.joinedAt).toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isLeader ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-sm shrink-0 flex items-center gap-1">
                              <span>👑</span>
                              <span>المشرف الرسمي</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 shrink-0">
                              عضو
                            </span>
                          )}

                          {isAdmin && !isLeader && (
                            <button
                              type="button"
                              onClick={() => handleAppointLeader(member)}
                              className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-sm flex items-center gap-1 active:scale-95 transition-all shrink-0"
                              title="تعيين هذا العضو مشرفاً رسمياً على الرابطة"
                            >
                              <span>👑</span>
                              <span>تعيين كمشرف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <Users size={24} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white">
                    تضم الرابطة {actualMemberCount} مشجعاً مسجلاً
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                    كن أول المنضمين في التطبيق للظهور في قائمة الأعضاء الرسمية لرابطة {group.name}!
                  </p>
                  {!hasJoined && (
                    <button
                      onClick={handleToggleJoin}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md inline-flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <UserPlus size={15} />
                      <span>انضم الآن للرابطة</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Info size={18} className="text-emerald-600" />
                    <span>نبذة عن الرابطة وتاريخ تأسيسها</span>
                  </h3>
                  {isGroupAdmin && (
                    <button
                      onClick={openEditModal}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Edit3 size={12} />
                      <span>تعديل النبذة</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                  {group.description || 'رابطة رسمية تجمع مشجعي نادي الاتحاد السكندري المغتربين في الخارج لتشجيع ومساندة النادي وتنظيم التجمعات لمشاهدة المباريات وتقديم المساعدة لأبناء الإسكندرية الجدد.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">المدينة والدولة</span>
                    <div className="flex items-center gap-1.5">
                      <CountryFlag
                        countryCode={group.countryId}
                        flag={group.countryFlag}
                        countryName={group.countryName}
                        size="xs"
                      />
                      <span className="text-xs font-black text-slate-800 dark:text-white">{group.city}، {group.countryName}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">سنة التأسيس</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white">{group.foundedYear || 2023}</span>
                  </div>

                  {group.adminName && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">مسؤول وممثل الرابطة</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">{group.adminName}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Group Modal for Admin */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    تعديل بيانات الرابطة
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    تحكم كامل في مسمى الرابطة، الشعارات، والحالة الرسمية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGroupChanges} className="flex flex-col flex-1 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الرابطة *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المدينة *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.city || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">سنة التأسيس</label>
                    <input
                      type="text"
                      value={editFormData.foundedYear || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, foundedYear: e.target.value })}
                      placeholder="2023"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>

                {/* Logo Section */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                      شعار الرابطة (Logo)
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
                          setEditFormData({ ...editFormData, logo: url });
                        }}
                        buttonText="رفع شعار"
                        buttonClassName="!bg-emerald-600 hover:!bg-emerald-700 !text-white !py-2 !px-3.5 !rounded-xl !text-xs !font-bold !shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                        showPreview={false}
                      />
                    </div>

                    {editFormData.logo ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                          <img
                            src={editFormData.logo}
                            alt="شعار الرابطة"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex-1 whitespace-nowrap">
                          ✓ تم تعيين الشعار
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, logo: '' })}
                          className="text-slate-400 hover:text-red-500 p-1 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="حذف الشعار"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        لم يتم رفع شعار
                      </span>
                    )}
                  </div>
                </div>

                {/* Cover Section */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
                      صورة الغلاف (اختياري)
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                      رفع صورة الغلاف
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <ImageUploader
                        folderName="world_groups"
                        onUploadSuccess={(url) => {
                          setEditFormData({ ...editFormData, coverImage: url });
                        }}
                        buttonText="رفع غلاف"
                        buttonClassName="!bg-slate-200 dark:!bg-slate-700 hover:!bg-slate-300 !text-slate-800 dark:!text-white !py-2 !px-3.5 !rounded-xl !text-xs !font-bold whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
                        showPreview={false}
                      />
                    </div>

                    {editFormData.coverImage ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="w-12 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img
                            src={editFormData.coverImage}
                            alt="غلاف الرابطة"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex-1 whitespace-nowrap">
                          ✓ تم تعيين الغلاف
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, coverImage: '' })}
                          className="text-slate-400 hover:text-red-500 p-1 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="حذف الغلاف"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        لم يتم رفع غلاف
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact & Socials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">رابط جروب الواتساب</label>
                    <input
                      type="url"
                      value={editFormData.whatsappGroupUrl || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, whatsappGroupUrl: e.target.value })}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">اسم المشرف / المنسق</label>
                    <input
                      type="text"
                      value={editFormData.adminName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, adminName: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">نبذة عن الرابطة</label>
                  <textarea
                    rows={3}
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs resize-none"
                  />
                </div>

                {/* Status & Badges */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={editFormData.verified || false}
                      onChange={(e) => setEditFormData({ 
                        ...editFormData, 
                        verified: e.target.checked,
                        status: e.target.checked ? 'official' : 'community'
                      })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="font-bold text-slate-800 dark:text-white text-xs whitespace-nowrap">
                      🟢 رابطة رسمية
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={editFormData.featured || false}
                      onChange={(e) => setEditFormData({ ...editFormData, featured: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400 h-4 w-4"
                    />
                    <span className="font-bold text-slate-800 dark:text-white text-xs whitespace-nowrap">
                      ⭐ مميزة في الواجهة
                    </span>
                  </label>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 active:scale-95 transition-all text-xs whitespace-nowrap shrink-0"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 text-xs whitespace-nowrap shrink-0"
                >
                  <Save size={15} />
                  <span className="whitespace-nowrap">{isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorldGroupDetail;
