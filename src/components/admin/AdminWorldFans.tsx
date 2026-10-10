import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Globe, 
  Users, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Sparkles, 
  MapPin, 
  MessageCircle, 
  Calendar, 
  Search,
  ExternalLink,
  Phone,
  Mail,
  Filter,
  Image as ImageIcon,
  Upload,
  X,
  RefreshCw
} from 'lucide-react';
import { useAppStore } from '../../store';
import { WorldGroup, WorldCountry, WorldApplication, WorldEvent, WorldHelpRequest, WorldGroupMember } from '../../types/worldFans';
import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../../lib/firebase';
import { defaultWorldCountries } from '../../data/defaultWorldFansData';
import { CountryFlag } from '../worldFans/CountryFlag';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import ImageUploader from '../ImageUploader';

// Quick Presets for Gulf and World Countries
const COUNTRY_PRESETS: Partial<WorldCountry>[] = [
  {
    id: 'bh',
    code: 'BH',
    name: 'مملكة البحرين',
    nameAr: 'مملكة البحرين',
    nameEn: 'Kingdom of Bahrain',
    flag: '🇧🇭',
    region: 'gulf',
    fanCount: 210,
    cities: ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى', 'سند'],
    description: 'رابطة مشجعي سيد البلد في مملكة البحرين، لقاءات وتجمعات دائمة لمؤازرة زعيم الثغر.',
    active: true,
  },
  {
    id: 'sa',
    code: 'SA',
    name: 'المملكة العربية السعودية',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    flag: '🇸🇦',
    region: 'gulf',
    fanCount: 980,
    cities: ['الرياض', 'جدة', 'الدمام', 'الخبر', 'مكة المكرمة', 'المدينة المنورة'],
    description: 'رابطة مشجعي الاتحاد السكندري بالمملكة العربية السعودية في الرياض والمنطقة الشرقية والغربية.',
    active: true,
  },
  {
    id: 'ae',
    code: 'AE',
    name: 'الإمارات العربية المتحدة',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    flag: '🇦🇪',
    region: 'gulf',
    fanCount: 1240,
    cities: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة'],
    description: 'تجمع جماهير زعيم الثغر في كافة إمارات الدولة، وحضور المباريات والمناسبات الرياضية.',
    active: true,
  },
  {
    id: 'kw',
    code: 'KW',
    name: 'الكويت',
    nameAr: 'الكويت',
    nameEn: 'Kuwait',
    flag: '🇰🇼',
    region: 'gulf',
    fanCount: 620,
    cities: ['الكويت العاصمة', 'حولي', 'السالمية', 'الفروانية', 'الأحمدي'],
    description: 'من أقدم روابط الاتحاداوية بالخليج العربي وأكثرها نشاطاً وتفاعلاً في التجمعات والبطولات.',
    active: true,
  },
  {
    id: 'qa',
    code: 'QA',
    name: 'قطر',
    nameAr: 'قطر',
    nameEn: 'Qatar',
    flag: '🇶🇦',
    region: 'gulf',
    fanCount: 295,
    cities: ['الدوحة', 'الريان', 'الوكرة', 'الخور'],
    description: 'رابطة مشجعي الاتحاد السكندري في الدوحة والملاعب القطرية.',
    active: true,
  },
  {
    id: 'om',
    code: 'OM',
    name: 'سلطنة عُمان',
    nameAr: 'سلطنة عُمان',
    nameEn: 'Oman',
    flag: '🇴🇲',
    region: 'gulf',
    fanCount: 190,
    cities: ['مسقط', 'صلالة', 'صحار', 'نزوى'],
    description: 'أبناء زعيم الثغر في مسقط وعمان المحبة والوفاء.',
    active: true,
  },
  {
    id: 'eg',
    code: 'EG',
    name: 'مصر',
    nameAr: 'جمهورية مصر العربية',
    nameEn: 'Egypt',
    flag: '🇪🇬',
    region: 'other',
    fanCount: 5000,
    cities: ['الإسكندرية', 'القاهرة', 'الجيزة'],
    description: 'المقر الرئيسي وقلب نادي الاتحاد السكندري النابض.',
    active: true,
  },
  {
    id: 'gb',
    code: 'GB',
    name: 'المملكة المتحدة',
    nameAr: 'المملكة المتحدة',
    nameEn: 'United Kingdom',
    flag: '🇬🇧',
    region: 'europe',
    fanCount: 410,
    cities: ['لندن', 'مانشستر', 'برمنجهام', 'ليفربول'],
    description: 'رابطة مشجعي سيد البلد في بريطانيا وعاصمة الضباب لندن.',
    active: true,
  },
  {
    id: 'us',
    code: 'US',
    name: 'الولايات المتحدة الأمريكية',
    nameAr: 'الولايات المتحدة الأمريكية',
    nameEn: 'United States',
    flag: '🇺🇸',
    region: 'north_america',
    fanCount: 350,
    cities: ['نيويورك', 'نيوجيرسي', 'كاليفورنيا', 'فلوريدا'],
    description: 'اتحاداوية أمريكا الشمالية تجمعهم المحبة الخضراء والشغف بالثغر السكندري.',
    active: true,
  },
  {
    id: 'eu',
    code: 'EU',
    name: 'الاتحاد الأوروبي',
    nameAr: 'الاتحاد الأوروبي',
    nameEn: 'European Union',
    flag: '🇪🇺',
    region: 'europe',
    fanCount: 480,
    cities: ['فرانكفورت', 'باريس', 'برلين', 'روما'],
    description: 'ملتقى جماهير الاتحاد السكندري وعشاق الأخضر في دول ومدن الاتحاد الأوروبي.',
    active: true,
  },
  {
    id: 'east_asia',
    code: 'EA',
    name: 'شرق آسيا',
    nameAr: 'شرق آسيا',
    nameEn: 'East Asia',
    flag: '🌏',
    region: 'asia',
    fanCount: 220,
    cities: ['طوكيو', 'بكين', 'سيول', 'كوالالمبور'],
    description: 'تجمع ورابطة محبي زعيم الثغر في دول وعواصم شرق وجنوب شرق آسيا.',
    active: true,
  },
];

export const AdminWorldFans: React.FC = () => {
  const { 
    worldGroups, 
    setWorldGroups, 
    worldCountries, 
    setWorldCountries, 
    worldApplications, 
    setWorldApplications, 
    worldEvents, 
    setWorldEvents 
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'applications' | 'countries' | 'events'>('groups');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Real-time synchronization for applications
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'world_applications'), (snapshot) => {
        const apps = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as WorldApplication[];
        apps.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        setWorldApplications(apps);
      }, (err) => {
        console.warn('Applications snapshot listener warning:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, [setWorldApplications]);

  // Real-time synchronization for world groups
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'world_groups'), (snapshot) => {
        if (!snapshot.empty) {
          const groups = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as WorldGroup[];
          setWorldGroups(groups);
        }
      }, (err) => {
        console.warn('Groups snapshot listener warning:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn(e);
    }
  }, [setWorldGroups]);

  // Group Modal State
  const [editingGroup, setEditingGroup] = useState<WorldGroup | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [groupForm, setGroupForm] = useState<Partial<WorldGroup>>({});

  // Country Modal State
  const [editingCountry, setEditingCountry] = useState<WorldCountry | null>(null);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState<boolean>(false);
  const [countryForm, setCountryForm] = useState<Partial<WorldCountry>>({});

  // Event Modal State
  const [editingEvent, setEditingEvent] = useState<WorldEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [eventForm, setEventForm] = useState<Partial<WorldEvent>>({});

  // Members Management Modal State
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<WorldGroup | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState<boolean>(false);
  const [groupMembersList, setGroupMembersList] = useState<WorldGroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [editingGroupMembers, setEditingGroupMembers] = useState<WorldGroupMember[]>([]);
  const [loadingGroupEditMembers, setLoadingGroupEditMembers] = useState<boolean>(false);

  // Open Members Modal & fetch from Firestore
  const handleOpenMembersModal = async (group: WorldGroup) => {
    setSelectedGroupForMembers(group);
    setIsMembersModalOpen(true);
    setLoadingMembers(true);
    setMemberSearchQuery('');

    try {
      const q = query(
        collection(db, 'world_group_members'),
        where('groupId', '==', group.id)
      );
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<WorldGroupMember, 'id'>)
      }));
      setGroupMembersList(members);
    } catch (err) {
      console.warn('Error fetching group members:', err);
      toast.error('تعذر جلب قائمة الأعضاء');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Start editing group and load its members for moderator selector
  const handleStartEditGroup = async (group: WorldGroup) => {
    setEditingGroup(group);
    setGroupForm({
      ...group,
      adminUid: group.adminUid || '',
      whatsappGroupUrl: group.whatsappGroupUrl || group.socialLinks?.whatsapp || '',
      facebookPageUrl: group.facebookPageUrl || group.socialLinks?.facebook || '',
      adminPhone: group.adminPhone || '',
      adminWhatsapp: group.adminWhatsapp || '',
      adminEmail: group.adminEmail || '',
      coverImage: group.coverImage || '',
      logo: group.logo || '',
      description: group.description || '',
      adminName: group.adminName || '',
      foundedYear: Number(group.foundedYear) || 2024,
      memberCount: Number(group.memberCount) || 10,
    });
    setIsGroupModalOpen(true);

    setLoadingGroupEditMembers(true);
    try {
      const q = query(
        collection(db, 'world_group_members'),
        where('groupId', '==', group.id)
      );
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<WorldGroupMember, 'id'>)
      }));
      setEditingGroupMembers(members);
    } catch (e) {
      console.warn('Error fetching group members for edit modal:', e);
      setEditingGroupMembers([]);
    } finally {
      setLoadingGroupEditMembers(false);
    }
  };
  const handleAppointGroupAdmin = async (member: WorldGroupMember) => {
    if (!selectedGroupForMembers) return;
    const isAlreadyAdmin = (selectedGroupForMembers.adminUid === member.userId || selectedGroupForMembers.adminName === member.userName);
    
    if (isAlreadyAdmin) {
      toast('هذا العضو هو المشرف الحالي للرابطة بالفعل 👑', { icon: '👑' });
      return;
    }

    const confirmMsg = `هل تود تعيين العضو "${member.userName}" ليكون المشرف والمسؤول المعتمد على رابطة "${selectedGroupForMembers.name}"؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const groupId = selectedGroupForMembers.id;
      // 1. Update world_groups in Firestore
      const updatedGroupData = {
        adminUid: member.userId,
        adminName: member.userName,
        adminEmail: member.userEmail || selectedGroupForMembers.adminEmail || '',
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'world_groups', groupId), cleanFirestoreData(updatedGroupData));

      // 2. Update member role in world_group_members collection
      await updateDoc(doc(db, 'world_group_members', member.id), {
        role: 'group_admin',
        userRole: 'مشرف الرابطة'
      });

      // 3. Update local members state
      const updatedMembersList = groupMembersList.map((m) => {
        if (m.id === member.id) {
          return { ...m, role: 'group_admin', userRole: 'مشرف الرابطة' };
        }
        if (m.userId === selectedGroupForMembers.adminUid || m.userName === selectedGroupForMembers.adminName) {
          return { ...m, role: 'member', userRole: 'عضو' };
        }
        return m;
      });
      setGroupMembersList(updatedMembersList);

      // 4. Update group state in store
      const newGroupState: WorldGroup = {
        ...selectedGroupForMembers,
        adminUid: member.userId,
        adminName: member.userName,
        adminEmail: member.userEmail || selectedGroupForMembers.adminEmail || '',
      };
      setSelectedGroupForMembers(newGroupState);

      const updatedGroups = worldGroups.map(g => g.id === groupId ? { ...g, ...newGroupState } : g);
      setWorldGroups(updatedGroups);

      toast.success(`تم تعيين "${member.userName}" مشرفاً رسمياً على رابطة "${selectedGroupForMembers.name}" بنجاح! 👑`);
    } catch (err: any) {
      console.error('Error appointing group admin:', err);
      toast.error('حدث خطأ أثناء تعيين المشرف: ' + (err.message || ''));
    }
  };

  // Remove Group Admin role
  const handleRemoveGroupAdmin = async (member: WorldGroupMember) => {
    if (!selectedGroupForMembers) return;
    if (!window.confirm(`هل أنت متأكد من إلغاء تكليف الإشراف عن "${member.userName}"؟`)) return;

    try {
      const groupId = selectedGroupForMembers.id;
      await updateDoc(doc(db, 'world_groups', groupId), {
        adminUid: '',
        adminName: '',
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'world_group_members', member.id), {
        role: 'member',
        userRole: 'عضو'
      });

      const updatedMembersList = groupMembersList.map(m => m.id === member.id ? { ...m, role: 'member', userRole: 'عضو' } : m);
      setGroupMembersList(updatedMembersList);

      const newGroupState = {
        ...selectedGroupForMembers,
        adminUid: '',
        adminName: '',
      };
      setSelectedGroupForMembers(newGroupState);
      const updatedGroups = worldGroups.map(g => g.id === groupId ? { ...g, adminUid: '', adminName: '' } : g);
      setWorldGroups(updatedGroups);

      toast.success(`تم إلغاء الإشراف عن "${member.userName}"`);
    } catch (err: any) {
      console.error('Error removing group admin:', err);
      toast.error('تعذر إلغاء الإشراف: ' + (err.message || ''));
    }
  };

  // Remove member from group
  const handleRemoveGroupMember = async (memberId: string) => {
    if (!selectedGroupForMembers) return;
    if (!window.confirm('هل أنت متأكد من إزالة هذا العضو من الرابطة؟')) return;

    try {
      await deleteDoc(doc(db, 'world_group_members', memberId));
      const updatedList = groupMembersList.filter(m => m.id !== memberId);
      setGroupMembersList(updatedList);

      const newCount = Math.max(0, (Number(selectedGroupForMembers.memberCount) || 1) - 1);
      const updatedGroups = worldGroups.map(g => g.id === selectedGroupForMembers.id ? { ...g, memberCount: newCount } : g);
      setWorldGroups(updatedGroups);

      await updateDoc(doc(db, 'world_groups', selectedGroupForMembers.id), {
        memberCount: newCount
      });

      setSelectedGroupForMembers(prev => prev ? { ...prev, memberCount: newCount } : null);
      toast.success('تمت إزالة العضو بنجاح');
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('حدث خطأ أثناء إزالة العضو');
    }
  };

  // Save Group
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingGroup ? editingGroup.id : uuidv4();
    const selectedCountry = worldCountries.find(c => c.id === groupForm.countryId);

    const groupData: WorldGroup = {
      id,
      name: (groupForm.name || 'رابطة جديدة').trim(),
      countryId: groupForm.countryId || 'sa',
      countryName: selectedCountry?.nameAr || selectedCountry?.name || groupForm.countryName || 'بالخارج',
      countryFlag: selectedCountry?.flag || groupForm.countryFlag || '🌍',
      city: (groupForm.city || 'المدينة').trim(),
      region: selectedCountry?.region || groupForm.region || 'gulf',
      logo: groupForm.logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80',
      coverImage: groupForm.coverImage || '',
      description: groupForm.description || '',
      status: groupForm.status || 'official',
      verified: groupForm.status === 'official' || Boolean(groupForm.verified),
      featured: Boolean(groupForm.featured),
      memberCount: Number(groupForm.memberCount) || 1,
      adminUid: (groupForm.adminUid || editingGroup?.adminUid || '').trim(),
      adminName: (groupForm.adminName || '').trim(),
      adminPhone: (groupForm.adminPhone || '').trim(),
      adminEmail: (groupForm.adminEmail || '').trim(),
      adminWhatsapp: (groupForm.adminWhatsapp || '').trim(),
      whatsappGroupUrl: (groupForm.whatsappGroupUrl || '').trim(),
      facebookPageUrl: (groupForm.facebookPageUrl || '').trim(),
      socialLinks: {
        whatsapp: (groupForm.whatsappGroupUrl || groupForm.socialLinks?.whatsapp || '').trim(),
        facebook: (groupForm.facebookPageUrl || groupForm.socialLinks?.facebook || '').trim(),
        instagram: groupForm.socialLinks?.instagram || '',
        twitter: groupForm.socialLinks?.twitter || '',
        telegram: groupForm.socialLinks?.telegram || ''
      },
      foundedYear: Number(groupForm.foundedYear) || 2024,
      active: groupForm.active !== undefined ? groupForm.active : true,
      createdAt: editingGroup?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cleanedData = cleanFirestoreData(groupData);

    const updated = editingGroup
      ? worldGroups.map(g => g.id === id ? cleanedData : g)
      : [cleanedData, ...worldGroups];

    setWorldGroups(updated);

    try {
      await setDoc(doc(db, 'world_groups', id), cleanedData, { merge: true });
      toast.success(editingGroup ? 'تم تحديث بيانات الرابطة وحفظها بنجاح في قاعدة البيانات ✓' : 'تمت إضافة الرابطة الجديدة بنجاح ✓');
    } catch (err: any) {
      console.error('Group saved error:', err);
      toast.error('حدث خطأ أثناء الحفظ في قاعدة البيانات: ' + (err.message || ''));
    }

    setIsGroupModalOpen(false);
    setEditingGroup(null);
    setGroupForm({});
  };

  // Delete Group
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرابطة نهائياً؟')) return;

    const updated = worldGroups.filter(g => g.id !== groupId);
    setWorldGroups(updated);

    try {
      await deleteDoc(doc(db, 'world_groups', groupId));
      toast.success('تم حذف الرابطة بنجاح');
    } catch (err: any) {
      console.warn('Group deleted locally:', err);
      toast.success('تم حذف الرابطة');
    }
  };

  // Approve Application
  const handleApproveApplication = async (app: WorldApplication) => {
    if (!window.confirm(`هل تريد اعتماد طلب تأسيس (${app.proposedGroupName}) وتدشين الرابطة فوراً؟`)) return;

    const selectedCountry = worldCountries.find(c => c.id === app.countryId);
    const newGroup: WorldGroup = {
      id: uuidv4(),
      name: app.proposedGroupName,
      countryId: app.countryId,
      countryName: app.countryName,
      countryFlag: selectedCountry?.flag || '🌍',
      city: app.city,
      region: selectedCountry?.region || 'other',
      logo: app.logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80',
      coverImage: '',
      description: app.motivation || `الرابطة الرسمية لجماهير الاتحاد السكندري في ${app.city}`,
      status: 'official',
      verified: true,
      featured: true,
      memberCount: app.estimatedFansCount || 20,
      adminName: app.applicantName,
      adminPhone: app.applicantPhone || '',
      adminEmail: app.applicantEmail || '',
      adminWhatsapp: app.applicantWhatsapp || '',
      whatsappGroupUrl: '',
      facebookPageUrl: '',
      socialLinks: {
        whatsapp: app.applicantWhatsapp || '',
        facebook: '',
      },
      foundedYear: new Date().getFullYear(),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cleanedGroup = cleanFirestoreData(newGroup);

    // Update group state
    const nextGroups = [cleanedGroup, ...worldGroups];
    setWorldGroups(nextGroups);

    // Update application state
    const nextApps = worldApplications.map(a => a.id === app.id ? { ...a, status: 'approved' as const, approvedGroupId: cleanedGroup.id } : a);
    setWorldApplications(nextApps);

    try {
      await setDoc(doc(db, 'world_groups', cleanedGroup.id), cleanedGroup, { merge: true });
      await updateDoc(doc(db, 'world_applications', app.id), {
        status: 'approved',
        approvedGroupId: cleanedGroup.id
      });
      toast.success('تم اعتماد الرابطة وتدشينها بنجاح!');
    } catch (err: any) {
      console.error('Application approval error:', err);
      toast.error('حدث خطأ أثناء اعتماد الطلب: ' + (err.message || ''));
    }
  };

  // Reject Application
  const handleRejectApplication = async (appId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟')) return;

    const nextApps = worldApplications.map(a => a.id === appId ? { ...a, status: 'rejected' as const } : a);
    setWorldApplications(nextApps);

    try {
      await updateDoc(doc(db, 'world_applications', appId), { status: 'rejected' });
      toast.success('تم رفض الطلب');
    } catch (err: any) {
      console.warn('App rejection local:', err);
    }
  };

  // Save Country
  const handleSaveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingCountry ? editingCountry.id : (countryForm.code ? countryForm.code.toLowerCase() : uuidv4());

    const countryData: WorldCountry = {
      id,
      code: (countryForm.code || id).toUpperCase(),
      name: (countryForm.name || countryForm.nameAr || 'دولة جديدة').trim(),
      nameAr: (countryForm.nameAr || countryForm.name || 'دولة جديدة').trim(),
      nameEn: (countryForm.nameEn || '').trim(),
      flag: countryForm.flag || '🌍',
      region: countryForm.region || 'gulf',
      fanCount: Number(countryForm.fanCount) || 100,
      groupsCount: editingCountry?.groupsCount || 0,
      active: countryForm.active !== undefined ? countryForm.active : true,
      order: countryForm.order !== undefined ? Number(countryForm.order) : 10,
      coverImage: countryForm.coverImage || '',
      description: countryForm.description || '',
    };

    const cleanedCountry = cleanFirestoreData(countryData);

    const nextCountries = editingCountry
      ? worldCountries.map(c => c.id === id ? cleanedCountry : c)
      : [...worldCountries, cleanedCountry];

    setWorldCountries(nextCountries);
    setIsCountryModalOpen(false);

    try {
      await setDoc(doc(db, 'world_countries', id), cleanedCountry, { merge: true });
      toast.success('تم حفظ بيانات الدولة بنجاح في قاعدة البيانات');
    } catch (err: any) {
      console.error('Country saved error:', err);
      toast.error('حدث خطأ أثناء حفظ الدولة: ' + (err.message || ''));
    }
  };

  // Sync / Seed All GCC and Default World Countries
  const handleSyncAllDefaultCountries = async () => {
    try {
      for (const country of defaultWorldCountries) {
        const cleaned = cleanFirestoreData(country);
        await setDoc(doc(db, 'world_countries', country.id), cleaned, { merge: true });
      }

      const merged = [...worldCountries];
      defaultWorldCountries.forEach(dc => {
        const idx = merged.findIndex(m => m.id === dc.id);
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...dc };
        } else {
          merged.push(dc);
        }
      });
      merged.sort((a, b) => (a.order || 99) - (b.order || 99));
      setWorldCountries(merged);
      toast.success('تمت إضافة ومزامنة جميع دول الخليج (البحرين، السعودية، الإمارات، الكويت، قطر، عمان) وباقي الدول بنجاح! 🇧🇭 🇸🇦 🇦🇪 🇰🇼 🇶🇦 🇴🇲');
    } catch (e: any) {
      console.warn('Sync error:', e);
      toast.error('حدث خطأ أثناء مزامنة الدول');
    }
  };

  // Delete Country
  const handleDeleteCountry = async (countryId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدولة؟')) return;

    const nextCountries = worldCountries.filter(c => c.id !== countryId);
    setWorldCountries(nextCountries);

    try {
      await deleteDoc(doc(db, 'world_countries', countryId));
      toast.success('تم حذف الدولة بنجاح');
    } catch (err: any) {
      console.warn('Country deleted locally:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Globe size={22} className="text-emerald-600 dark:text-emerald-400" />
            <span>إدارة رابطة اتحاداوية العالم 🌍</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            إدارة روابط الجماهير بالخارج، اعتماد طلبات التأسيس، وتنسيق الفعاليات الدولية
          </p>
        </div>

        {/* Sub-tabs switch */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('groups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'groups'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            الروابط ({worldGroups.length})
          </button>

          <button
            onClick={() => setActiveSubTab('applications')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'applications'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            طلبات التأسيس ({worldApplications.filter(a => a.status === 'pending').length})
            {worldApplications.some(a => a.status === 'pending') && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('countries')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'countries'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            الدول ({worldCountries.length})
          </button>

          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'events'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            الفعاليات ({worldEvents.length})
          </button>
        </div>
      </div>

      {/* 1. GROUPS TAB */}
      {activeSubTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الروابط والمدن..."
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-slate-800 dark:text-white"
              />
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({
                    status: 'official',
                    featured: false,
                    memberCount: 10,
                    active: true,
                  });
                  setIsGroupModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Plus size={16} />
                <span>إضافة رابطة جديدة</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worldGroups
              .filter(g => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return g.name.toLowerCase().includes(q) || g.city.toLowerCase().includes(q) || g.countryName.toLowerCase().includes(q);
              })
              .map((group) => (
                <div
                  key={group.id}
                  className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={group.logo || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/30 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{group.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                            <CountryFlag
                              countryCode={group.countryId}
                              flag={group.countryFlag}
                              countryName={group.countryName}
                              size="xs"
                            />
                            <span>{group.city}، {group.countryName}</span>
                          </span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        group.status === 'official'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {group.status === 'official' ? 'رسمية ✓' : 'مجتمع'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mb-3 font-medium">
                      {group.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-2xl mb-3">
                      <div>الأعضاء: <span className="text-slate-800 dark:text-white font-black">{group.memberCount || 0} عضو</span></div>
                      <div>المسؤول: <span className="text-slate-800 dark:text-white font-black">{group.adminName || 'غير محدد'}</span></div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => handleOpenMembersModal(group)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold flex items-center justify-center gap-1.5 border border-emerald-500/20 active:scale-95 transition-all"
                      >
                        <Users size={13} />
                        <span>إدارة الأعضاء ({group.memberCount || 0})</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <a
                        href={`/world-fans/group/${group.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:scale-105"
                        title="معاينة الرابطة في التطبيق"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEditGroup(group)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold"
                        title="تعديل بيانات الرابطة والمشرف"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold"
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. APPLICATIONS TAB */}
      {activeSubTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-white">طلبات تأسيس الروابط الواردة</h3>
            <span className="text-xs font-bold text-slate-400">إجمالي الطلبات: {worldApplications.length}</span>
          </div>

          {worldApplications.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-400">لا توجد طلبات تأسيس واردة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {worldApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        app.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {app.status === 'approved' ? 'معتمد ✓' : app.status === 'rejected' ? 'مرفوض ✕' : 'قيد المراجعة ⏳'}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">{app.proposedGroupName}</h4>
                      <span className="text-xs text-slate-400 font-bold">({app.city}، {app.countryName})</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {app.motivation}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1"><Users size={12} /> صاحب الطلب: {app.applicantName}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> واتساب: {app.applicantWhatsapp}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> الجمهور التقديري: {app.estimatedFansCount}</span>
                    </div>
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveApplication(app)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <CheckCircle size={14} />
                        <span>اعتماد وتدشين الرابطة</span>
                      </button>

                      <button
                        onClick={() => handleRejectApplication(app.id)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-bold active:scale-95 transition-all"
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. COUNTRIES TAB */}
      {activeSubTab === 'countries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">قائمة الدول والمناطق المسجلة</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                دول الخليج العربي (البحرين، السعودية، الإمارات، الكويت، قطر، عمان) والروابط الدولية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncAllDefaultCountries}
                className="px-3 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                title="إضافة وتحديث جميع دول الخليج (البحرين، السعودية، الإمارات، الكويت، قطر، عمان) وباقي الدول"
              >
                <RefreshCw size={13} />
                <span>مزامنة دول الخليج 🇧🇭 🇸🇦 🇦🇪</span>
              </button>

              <button
                onClick={() => {
                  setEditingCountry(null);
                  setCountryForm({ region: 'gulf', fanCount: 100, active: true });
                  setIsCountryModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <Plus size={15} />
                <span>إضافة دولة</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {worldCountries.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-3 shadow-sm hover:border-emerald-500/40 transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CountryFlag
                      countryCode={c.id}
                      flag={c.flag}
                      countryName={c.nameAr || c.name}
                      size="lg"
                    />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">{c.nameAr || c.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold">{c.nameEn || c.code}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">{c.fanCount || 0}+</span>
                    <span className="text-[9px] text-slate-400 font-medium">مشجع</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    {c.region === 'europe' ? '🇪🇺 أوروبا' : c.region === 'asia' ? '🌏 آسيا' : c.region === 'north_america' ? '🇺🇸 أمريكا' : '🇸🇦 الخليج'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCountry(c);
                        setCountryForm(c);
                        setIsCountryModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300"
                      title="تعديل الدولة"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCountry(c.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 text-slate-600 dark:text-slate-300"
                      title="حذف الدولة"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. EVENTS TAB */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-white">إدارة فعاليات وتجمعات المباريات</h3>
            <span className="text-xs font-bold text-slate-400">إجمالي الفعاليات: {worldEvents.length}</span>
          </div>

          <div className="space-y-3">
            {worldEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      {evt.type}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">{evt.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {evt.groupName} • {evt.city} • {evt.date} ({evt.time}) • {evt.location}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl">
                    {evt.participantsCount || 1} مسجلين
                  </span>

                  <button
                    onClick={async () => {
                      if (!window.confirm('هل تريد حذف هذه الفعالية؟')) return;
                      const nextEvts = worldEvents.filter(e => e.id !== evt.id);
                      setWorldEvents(nextEvts);
                      try { await deleteDoc(doc(db, 'world_events', evt.id)); } catch (e) {}
                    }}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Add Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                {editingGroup ? 'تعديل بيانات الرابطة' : 'إضافة رابطة جديدة'}
              </h3>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="flex flex-col flex-1 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 overscroll-contain">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الرابطة *</label>
                    <input
                      type="text"
                      required
                      value={groupForm.name || ''}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      placeholder="مثال: رابطة اتحاداوية الرياض"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الدولة *</label>
                    <select
                      value={groupForm.countryId || 'sa'}
                      onChange={(e) => setGroupForm({ ...groupForm, countryId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    >
                      {worldCountries.map(c => (
                        <option key={c.id} value={c.id}>{c.flag} {c.nameAr || c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المدينة *</label>
                    <input
                      type="text"
                      required
                      value={groupForm.city || ''}
                      onChange={(e) => setGroupForm({ ...groupForm, city: e.target.value })}
                      placeholder="مثال: الرياض"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عدد الأعضاء التقديري</label>
                    <input
                      type="number"
                      value={groupForm.memberCount || 10}
                      onChange={(e) => setGroupForm({ ...groupForm, memberCount: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>

                {/* Group Supervisor Selection */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                      مشرف ومسؤول الرابطة 👑
                    </label>
                    {editingGroupMembers.length > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
                        {editingGroupMembers.length} عضو منضم
                      </span>
                    )}
                  </div>

                  {editingGroupMembers.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={groupForm.adminUid || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val || val === 'custom') {
                            setGroupForm({ ...groupForm, adminUid: '' });
                          } else {
                            const selectedMember = editingGroupMembers.find(m => m.userId === val);
                            if (selectedMember) {
                              setGroupForm({
                                ...groupForm,
                                adminUid: selectedMember.userId,
                                adminName: selectedMember.userName,
                                adminEmail: selectedMember.userEmail || groupForm.adminEmail || '',
                              });
                            }
                          }
                        }}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white"
                      >
                        <option value="">— اختر عضواً من المنضمين لتعيينه مشرفاً —</option>
                        {editingGroupMembers.map((m) => (
                          <option key={m.id} value={m.userId}>
                            👑 {m.userName} {m.userEmail ? `(${m.userEmail})` : ''} {m.userId === groupForm.adminUid ? '✓ [المشرف الحالي]' : ''}
                          </option>
                        ))}
                        <option value="custom">✏️ إدخال اسم مشرف يدوي آخر...</option>
                      </select>

                      <input
                        type="text"
                        value={groupForm.adminName || ''}
                        onChange={(e) => setGroupForm({ ...groupForm, adminName: e.target.value })}
                        placeholder="اسم المسؤول أو المشرف"
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={groupForm.adminName || ''}
                        onChange={(e) => setGroupForm({ ...groupForm, adminName: e.target.value })}
                        placeholder="اسم المسؤول أو المشرف"
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                      />
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">
                        يمكنك أيضاً تعيين أي عضو ينضم لاحقاً عبر زر &quot;إدارة الأعضاء&quot;
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">سنة التأسيس</label>
                    <input
                      type="number"
                      value={groupForm.foundedYear || 2024}
                      onChange={(e) => setGroupForm({ ...groupForm, foundedYear: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">بريد أو هاتف المسؤول</label>
                    <input
                      type="text"
                      value={groupForm.adminEmail || groupForm.adminPhone || ''}
                      onChange={(e) => setGroupForm({ ...groupForm, adminEmail: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رابط جروب الواتساب</label>
                  <input
                    type="url"
                    value={groupForm.whatsappGroupUrl || ''}
                    onChange={(e) => setGroupForm({ ...groupForm, whatsappGroupUrl: e.target.value })}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                </div>

                {/* League Logo Upload */}
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
                          setGroupForm({ ...groupForm, logo: url });
                        }}
                        buttonText="رفع شعار"
                        buttonClassName="!bg-emerald-600 hover:!bg-emerald-700 !text-white !py-2 !px-3.5 !rounded-xl !text-xs !font-bold !shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                        showPreview={false}
                      />
                    </div>

                    {groupForm.logo ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                          <img
                            src={groupForm.logo}
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
                          onClick={() => setGroupForm({ ...groupForm, logo: '' })}
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

                {/* League Cover Image Upload */}
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
                          setGroupForm({ ...groupForm, coverImage: url });
                        }}
                        buttonText="رفع غلاف"
                        buttonClassName="!bg-slate-200 dark:!bg-slate-700 hover:!bg-slate-300 !text-slate-800 dark:!text-white !py-2 !px-3.5 !rounded-xl !text-xs !font-bold whitespace-nowrap flex items-center justify-center gap-1.5"
                        showPreview={false}
                      />
                    </div>

                    {groupForm.coverImage ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="w-12 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img
                            src={groupForm.coverImage}
                            alt="غلاف الرابطة"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate flex-1 whitespace-nowrap">
                          ✓ تم تحديد الغلاف
                        </span>
                        <button
                          type="button"
                          onClick={() => setGroupForm({ ...groupForm, coverImage: '' })}
                          className="text-slate-400 hover:text-red-500 p-1 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="حذف الغلاف"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                        لم يتم رفع غلاف بعد
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">الوصف والنبذة</label>
                  <textarea
                    rows={2}
                    value={groupForm.description || ''}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    placeholder="نبذة عن الرابطة وأنشطتها..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold resize-none text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={groupForm.status === 'official'}
                      onChange={(e) => setGroupForm({ ...groupForm, status: e.target.checked ? 'official' : 'community' })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="whitespace-nowrap">رابطة رسمية 👑</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={groupForm.featured || false}
                      onChange={(e) => setGroupForm({ ...groupForm, featured: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="whitespace-nowrap">مميزة في الواجهة ⭐</span>
                  </label>
                </div>
              </div>

              {/* Fixed Footer Buttons */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 active:scale-95 transition-all text-xs whitespace-nowrap shrink-0"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-xs whitespace-nowrap shrink-0"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 5. MEMBERS MANAGEMENT MODAL */}
      {isMembersModalOpen && selectedGroupForMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <span>أعضاء رابطة: {selectedGroupForMembers.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {selectedGroupForMembers.memberCount || 0} عضو
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {selectedGroupForMembers.city}، {selectedGroupForMembers.countryName} {selectedGroupForMembers.countryFlag}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="بحث في أسماء الأعضاء..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pr-9 pl-3 text-slate-800 dark:text-white"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto min-h-[250px] space-y-2">
              {loadingMembers ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-400">جاري تحميل الأعضاء من قاعدة البيانات...</span>
                </div>
              ) : groupMembersList.length > 0 ? (
                <div className="space-y-2">
                  {groupMembersList
                    .filter(m => {
                      if (!memberSearchQuery.trim()) return true;
                      const q = memberSearchQuery.toLowerCase();
                      return m.userName.toLowerCase().includes(q) || (m.userEmail && m.userEmail.toLowerCase().includes(q));
                    })
                    .map((member) => {
                      const isCurrentAdmin = (selectedGroupForMembers.adminUid === member.userId || selectedGroupForMembers.adminName === member.userName || member.role === 'group_admin');

                      return (
                        <div
                          key={member.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCurrentAdmin
                              ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-400/40 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              {member.userAvatar ? (
                                <img
                                  src={member.userAvatar}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                                  {member.userName?.charAt(0) || 'U'}
                                </div>
                              )}
                              {isCurrentAdmin && (
                                <span className="absolute -top-1 -right-1 text-xs" title="مشرف الرابطة">
                                  👑
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-black text-slate-800 dark:text-white truncate">
                                  {member.userName}
                                </h5>
                                {isCurrentAdmin ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1">
                                    <span>👑</span>
                                    <span>مشرف الرابطة الرسمي</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    {member.userRole || 'عضو منضم'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-0.5 flex-wrap">
                                {member.userEmail && <span className="truncate max-w-[170px]">{member.userEmail}</span>}
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>انضم {new Date(member.joinedAt).toLocaleDateString('ar-EG')}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {isCurrentAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveGroupAdmin(member)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 active:scale-95 transition-all"
                                title="إلغاء تكليف الإشراف عن هذا العضو"
                              >
                                <span>إلغاء الإشراف</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAppointGroupAdmin(member)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                                title="تعيين هذا العضو ليكون المشرف الرسمي على الرابطة"
                              >
                                <ShieldCheck size={13} />
                                <span>تعيين كمشرف 👑</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveGroupMember(member.id)}
                              className="p-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold transition-all"
                              title="إزالة العضو من الرابطة"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center mx-auto">
                    <Users size={24} />
                  </div>
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                    لا يوجد أعضاء منضمين عبر التطبيق حتى الآن
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    العدد المسجل للرابطة: {selectedGroupForMembers.memberCount || 0} عضو
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">
                إجمالي الأعضاء المنضمين بالتطبيق: {groupMembersList.length}
              </span>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* 6. COUNTRY MANAGEMENT MODAL */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                  {editingCountry ? 'تعديل بيانات الدولة / المنطقة' : 'إضافة دولة أو منطقة جديدة'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCountry} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* Quick Presets for Gulf and World Countries */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <label className="block font-black text-slate-700 dark:text-slate-300 text-xs">
                    💡 اختيار سريع من دول الخليج والنماذج الجاهزة:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {COUNTRY_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setCountryForm({
                            ...countryForm,
                            code: preset.code,
                            name: preset.name,
                            nameAr: preset.nameAr,
                            nameEn: preset.nameEn,
                            flag: preset.flag,
                            region: preset.region,
                            fanCount: preset.fanCount,
                            description: preset.description,
                          });
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-all shadow-2xs"
                      >
                        <span>{preset.flag}</span>
                        <span>{preset.nameAr}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">اسم الدولة (بالعربية) *</label>
                    <input
                      type="text"
                      required
                      value={countryForm.nameAr || countryForm.name || ''}
                      onChange={(e) => setCountryForm({ ...countryForm, nameAr: e.target.value, name: e.target.value })}
                      placeholder="مثال: الاتحاد الأوروبي"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">الاسم بالإنجليزية</label>
                    <input
                      type="text"
                      value={countryForm.nameEn || ''}
                      onChange={(e) => setCountryForm({ ...countryForm, nameEn: e.target.value })}
                      placeholder="مثال: European Union"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">رمز الدولة (Code) *</label>
                    <input
                      type="text"
                      required
                      value={countryForm.code || ''}
                      onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value.toUpperCase() })}
                      placeholder="مثال: EU أو EA"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">العلم (إيموجي) *</label>
                    <input
                      type="text"
                      required
                      value={countryForm.flag || '🌍'}
                      onChange={(e) => setCountryForm({ ...countryForm, flag: e.target.value })}
                      placeholder="مثال: 🇪🇺"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs text-center text-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">القارة / النطاق *</label>
                    <select
                      value={countryForm.region || 'gulf'}
                      onChange={(e) => setCountryForm({ ...countryForm, region: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    >
                      <option value="gulf">الخليج العربي 🇸🇦</option>
                      <option value="europe">أوروبا 🇪🇺</option>
                      <option value="asia">آسيا / شرق آسيا 🌏</option>
                      <option value="north_america">أمريكا الشمالية 🇺🇸</option>
                      <option value="africa">إفريقيا 🌍</option>
                      <option value="other">أخرى 🌐</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">العدد التقديري للجماهير</label>
                    <input
                      type="number"
                      value={countryForm.fanCount || 100}
                      onChange={(e) => setCountryForm({ ...countryForm, fanCount: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">الترتيب في القائمة</label>
                    <input
                      type="number"
                      value={countryForm.order || 1}
                      onChange={(e) => setCountryForm({ ...countryForm, order: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">نبذة عن الجالية والنشاط</label>
                  <textarea
                    rows={2}
                    value={countryForm.description || ''}
                    onChange={(e) => setCountryForm({ ...countryForm, description: e.target.value })}
                    placeholder="مثال: ملتقى مشجعي الاتحاد السكندري في دول الاتحاد الأوروبي..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-xs resize-none"
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCountryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs whitespace-nowrap shrink-0"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md text-xs whitespace-nowrap shrink-0"
                >
                  حفظ الدولة
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminWorldFans;
