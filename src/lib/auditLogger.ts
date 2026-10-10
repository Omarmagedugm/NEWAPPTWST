import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth, cleanFirestoreData } from './firebase';
import { useAppStore } from '../store';

export interface AuditLogItem {
  id: string;
  action: 'delete' | 'create' | 'update' | 'restore';
  collectionName: string;
  collectionLabel: string;
  itemId: string;
  itemTitle: string;
  itemThumbnail?: string;
  itemData?: any; // Full snapshot of deleted/updated data for restoration
  performedBy: {
    uid: string;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
  };
  timestamp: string; // ISO string
  status?: 'deleted' | 'restored' | 'active';
  details?: string;
}

export const COLLECTION_LABELS: Record<string, string> = {
  'media': 'المالتيميديا والوسائط',
  'media_playlists': 'قوائم تشغيل الوسائط',
  'news': 'الأخبار والمقالات',
  'matches': 'المباريات والنتائج',
  'clubs': 'الأندية والشعارات',
  'products': 'متجر النادي والمنتجات',
  'orders': 'طلبات المتجر',
  'songs': 'المكتبة الموسيقية (أغاني)',
  'albums': 'ألبومات الأغاني',
  'playlists': 'قوائم تشغيل الأغاني',
  'books': 'المكتبة الرقمية (كتب ومجلات)',
  'fan_posts': 'منشورات الجماهير (الفان زون)',
  'fan_comments': 'تعليقات الجماهير',
  'live_comments': 'تعليقات البث المباشر',
  'polls': 'استطلاعات الرأي',
  'predictions': 'التوقعات',
  'users': 'أعضاء التطبيق',
  'club_committees': 'لجان النادي',
  'club_announcements': 'إعلانات النادي',
  'club_services': 'خدمات الأعضاء',
  'club_trips': 'رحلات النادي',
  'club_stats': 'أرقام وإحصائيات النادي',
  'club_titles': 'بطولات وتاريخ النادي',
  'club_timeline': 'الخط الزمني للتاريخ',
  'club_stadiums': 'ملاعب النادي التاريخية',
  'world_groups': 'روابط اتحاداوية العالم',
  'world_events': 'فعاليات اتحاداوية العالم',
  'world_posts': 'منشورات اتحاداوية العالم',
  'world_help_requests': 'طلبات مساعدة المغتربين',
  'custom_pages': 'الصفحات المخصصة',
  'jerseys': 'قمصان النادي',
  'ads': 'الإعلانات والبنرات'
};

export const getCollectionLabel = (coll: string): string => {
  return COLLECTION_LABELS[coll] || coll;
};

export const logAdminActivity = async ({
  action,
  collectionName,
  collectionLabel,
  itemId,
  itemTitle,
  itemThumbnail,
  itemData,
  details
}: {
  action: 'delete' | 'create' | 'update' | 'restore';
  collectionName: string;
  collectionLabel?: string;
  itemId: string;
  itemTitle: string;
  itemThumbnail?: string;
  itemData?: any;
  details?: string;
}) => {
  try {
    const user = auth.currentUser;
    const profile = useAppStore.getState().profile;
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const label = collectionLabel || getCollectionLabel(collectionName);
    const thumb = itemThumbnail || (itemData?.thumbnailUrl || itemData?.url || itemData?.image || itemData?.coverImage || itemData?.coverUrl || itemData?.imageUrl || itemData?.logo || '');

    const logEntry: AuditLogItem = {
      id: logId,
      action,
      collectionName,
      collectionLabel: label,
      itemId: String(itemId),
      itemTitle: itemTitle || 'عنصر بدون عنوان',
      itemThumbnail: thumb || '',
      itemData: itemData ? cleanFirestoreData(itemData) : null,
      performedBy: {
        uid: user?.uid || profile?.uid || 'system_or_admin',
        name: profile?.name || user?.displayName || user?.email?.split('@')[0] || 'مشرف النظام',
        email: user?.email || profile?.email || '',
        role: profile?.role || 'admin',
        avatar: profile?.avatar || user?.photoURL || ''
      },
      timestamp: new Date().toISOString(),
      status: action === 'delete' ? 'deleted' : 'active',
      details: details || ''
    };

    await setDoc(doc(db, 'audit_logs', logId), cleanFirestoreData(logEntry));
    return logId;
  } catch (err) {
    console.error('Failed to log admin activity:', err);
    return null;
  }
};

export const restoreDeletedItem = async (log: AuditLogItem): Promise<boolean> => {
  if (!log.collectionName || !log.itemId || !log.itemData) {
    throw new Error('لا توجد بيانات محفوظة كافية لاسترجاع هذا العنصر');
  }

  try {
    // 1. Write the snapshot data back to the original collection
    const targetDocRef = doc(db, log.collectionName, log.itemId);
    await setDoc(targetDocRef, cleanFirestoreData(log.itemData), { merge: true });

    // 2. Mark this log item as restored
    const logDocRef = doc(db, 'audit_logs', log.id);
    await updateDoc(logDocRef, {
      status: 'restored',
      restoredAt: new Date().toISOString(),
      restoredBy: {
        uid: auth.currentUser?.uid || 'admin',
        name: useAppStore.getState().profile?.name || auth.currentUser?.displayName || 'المدير',
        email: auth.currentUser?.email || ''
      }
    });

    // 3. Add an audit log for the restoration action
    await logAdminActivity({
      action: 'restore',
      collectionName: log.collectionName,
      collectionLabel: log.collectionLabel,
      itemId: log.itemId,
      itemTitle: log.itemTitle,
      itemThumbnail: log.itemThumbnail,
      itemData: log.itemData,
      details: `تم استرجاع العنصر بنجاح من سلة المحذوفات`
    });

    return true;
  } catch (err) {
    console.error('Error restoring deleted item:', err);
    throw err;
  }
};
