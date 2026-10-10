import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase';
import { useAppStore, SidebarMenuItem, DEFAULT_SIDEBAR_ITEMS } from '../store';
import toast from 'react-hot-toast';
import { 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  Menu, 
  ShieldCheck,
  Building2,
  Globe,
  Palette
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const HIGHLIGHT_COLORS = [
  { id: 'primary', label: 'أخضر أساسي (Club Green)', class: 'bg-primary text-white border-primary' },
  { id: 'amber', label: 'كهرماني / ذهبي (Amber)', class: 'bg-amber-500 text-white border-amber-500' },
  { id: 'blue', label: 'أزرق (Blue)', class: 'bg-blue-600 text-white border-blue-600' },
  { id: 'emerald', label: 'زمردي (Emerald)', class: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'purple', label: 'بنفسجي (Purple)', class: 'bg-purple-600 text-white border-purple-600' },
  { id: 'red', label: 'أحمر (Red)', class: 'bg-red-600 text-white border-red-600' },
];

export default function AdminSidebarManager() {
  const { sidebarMenuItems, setSidebarMenuItems } = useAppStore();
  
  const [items, setItems] = useState<SidebarMenuItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SidebarMenuItem>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SidebarMenuItem>>({
    title: '',
    path: '',
    icon: 'link',
    active: true,
    highlighted: false,
    highlightColor: 'primary',
    group: 'main'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sidebarMenuItems && sidebarMenuItems.length > 0) {
      let combined = [...sidebarMenuItems];
      DEFAULT_SIDEBAR_ITEMS.forEach(defaultItem => {
        if (!combined.some(item => item.id === defaultItem.id || item.path === defaultItem.path)) {
          combined.push(defaultItem);
        }
      });
      // Sort by order ascending
      const sorted = combined.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setItems(sorted);
    } else {
      setItems(DEFAULT_SIDEBAR_ITEMS);
    }
  }, [sidebarMenuItems]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update order property
    const reordered = newItems.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setItems(reordered);
  };

  const handleToggleActive = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, active: item.active === false ? true : false };
      }
      return item;
    });
    setItems(updated);
  };

  const handleToggleHighlight = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const nextState = !item.highlighted;
        return { 
          ...item, 
          highlighted: nextState,
          highlightColor: nextState ? (item.highlightColor || 'primary') : undefined
        };
      }
      return item;
    });
    setItems(updated);
    toast.success('تم تحديث حالة التمييز');
  };

  const handleRemoveBadge = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, badge: '', badgeColor: '' } : item));
    toast.success('تمت إزالة الشارة. احرص على الضغط على "حفظ التغييرات" لتأكيدها');
  };

  const handleStartEdit = (item: SidebarMenuItem) => {
    setEditingId(item.id);
    setEditForm({ 
      ...item,
      badge: item.badge || '',
      badgeColor: item.badgeColor || 'bg-primary text-white',
      highlighted: item.highlighted || false,
      highlightColor: item.highlightColor || 'primary'
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = items.map(item => {
      if (item.id === editingId) {
        return { 
          ...item, 
          ...editForm,
          badge: editForm.badge?.trim() ? editForm.badge.trim() : '',
          badgeColor: editForm.badge?.trim() ? (editForm.badgeColor || item.badgeColor || 'bg-primary text-white') : '',
          highlighted: editForm.highlighted || false,
          highlightColor: editForm.highlighted ? (editForm.highlightColor || 'primary') : undefined
        } as SidebarMenuItem;
      }
      return item;
    });
    setItems(updated);
    setEditingId(null);
    setEditForm({});
    toast.success('تم تحديث بيانات العنصر');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleAddNewItem = () => {
    if (!newItem.title?.trim() || !newItem.path?.trim()) {
      toast.error('يرجى إدخال اسم ورابط العنصر');
      return;
    }

    const itemToAdd: SidebarMenuItem = {
      id: uuidv4(),
      title: newItem.title.trim(),
      path: newItem.path.trim(),
      icon: newItem.icon || 'link',
      iconType: newItem.iconType || 'material',
      active: true,
      group: (newItem.group as any) || 'main',
      order: items.length,
      highlighted: Boolean(newItem.highlighted),
      ...(newItem.highlighted && newItem.highlightColor ? { highlightColor: newItem.highlightColor as any } : {}),
      ...(newItem.badge?.trim() ? { badge: newItem.badge.trim(), badgeColor: newItem.badgeColor?.trim() || 'bg-primary text-white' } : {})
    };

    setItems([...items, itemToAdd]);
    setIsAddingNew(false);
    setNewItem({ title: '', path: '', icon: 'link', active: true, highlighted: false, highlightColor: 'primary', group: 'main' });
    toast.success('تمت إضافة العنصر بنجاح');
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العنصر من القائمة؟')) return;
    const filtered = items.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx }));
    setItems(filtered);
    toast.success('تم حذف العنصر');
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('هل ترغب بإعادة تعيين القائمة الجانبية إلى الترتيب الافتراضي للنظام بدون تمييزات مسبقة؟')) return;
    setItems(DEFAULT_SIDEBAR_ITEMS);
    try {
      const cleanItems = cleanFirestoreData(DEFAULT_SIDEBAR_ITEMS);
      await setDoc(doc(db, 'settings', 'sidebar_layout'), { items: cleanItems });
      setSidebarMenuItems(DEFAULT_SIDEBAR_ITEMS);
      toast.success('تمت استعادة الترتيب الافتراضي بنجاح');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const normalizedItems: SidebarMenuItem[] = items.map((item, idx) => {
        const entry: Record<string, any> = {
          id: String(item.id),
          title: String(item.title || ''),
          path: String(item.path || ''),
          icon: String(item.icon || 'link'),
          iconType: item.iconType || 'material',
          active: item.active !== false,
          order: idx,
          group: item.group || 'main',
          highlighted: Boolean(item.highlighted)
        };

        if (item.highlighted && item.highlightColor) {
          entry.highlightColor = item.highlightColor;
        }

        if (item.badge && item.badge.trim() !== '') {
          entry.badge = item.badge.trim();
          entry.badgeColor = item.badgeColor?.trim() || 'bg-primary text-white';
        }

        if (item.isCustom) {
          entry.isCustom = true;
        }

        return entry as SidebarMenuItem;
      });

      const cleanedPayload = cleanFirestoreData({ items: normalizedItems });
      await setDoc(doc(db, 'settings', 'sidebar_layout'), cleanedPayload);
      setSidebarMenuItems(normalizedItems);
      toast.success('تم حفظ ترتيب وإعدادات القائمة الجانبية بنجاح ✨');
    } catch (error) {
      console.error('Error saving sidebar menu items:', error);
      toast.error('فشل في حفظ إعدادات القائمة الجانبية');
    } finally {
      setIsSaving(false);
    }
  };

  const getHighlightBadgeName = (color?: string) => {
    const found = HIGHLIGHT_COLORS.find(c => c.id === color);
    return found ? found.label.split(' ')[0] : 'مميز';
  };

  return (
    <div className="bg-white dark:bg-card-dark rounded-3xl border border-border-light dark:border-border-dark p-4 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Menu size={24} />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800 dark:text-white">إدارة وترتيب القائمة الجانبية</h2>
            <p className="text-xs font-bold text-slate-400">
              تحكم بترتيب العناصر، تفعيلها أو إخفائها، تمييزها (Highlight) أو إلغاء تمييزها، وتخصيص الشارات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-surface-dark text-xs font-bold transition-all active:scale-95"
            title="استعادة الترتيب الافتراضي"
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>

          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>عنصر مخصص</span>
          </button>

          <button
            onClick={handleSaveToCloud}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {/* Add New Item Modal / Form */}
      {isAddingNew && (
        <div className="my-5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-surface-dark border border-primary/30 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Plus size={16} className="text-primary" />
              إضافة عنصر جديد للقائمة الجانبية
            </h3>
            <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-red-500">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">عنوان العنصر *</label>
              <input
                type="text"
                placeholder="مثال: منتدى النادي"
                value={newItem.title || ''}
                onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-card-dark text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">الرابط أو المسار *</label>
              <input
                type="text"
                placeholder="/forum أو https://..."
                value={newItem.path || ''}
                onChange={e => setNewItem({ ...newItem, path: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-card-dark text-xs font-bold"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">نص الشارة (Badge)</label>
              <input
                type="text"
                placeholder="مثال: جديد"
                value={newItem.badge || ''}
                onChange={e => setNewItem({ ...newItem, badge: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-card-dark text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">أيقونة Material</label>
              <input
                type="text"
                placeholder="forum, star, link, etc."
                value={newItem.icon || ''}
                onChange={e => setNewItem({ ...newItem, icon: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-card-dark text-xs font-bold"
                dir="ltr"
              />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-border-dark flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newItem.highlighted || false}
                  onChange={e => setNewItem({ ...newItem, highlighted: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Sparkles size={14} className="text-amber-500" />
                  تمييز العنصر في القائمة (Highlight)
                </span>
              </label>

              {newItem.highlighted && (
                <select
                  value={newItem.highlightColor || 'primary'}
                  onChange={e => setNewItem({ ...newItem, highlightColor: e.target.value as any })}
                  className="p-1.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-card-dark text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  {HIGHLIGHT_COLORS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddNewItem}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-md hover:bg-primary-dark"
              >
                إضافة للقائمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span>الترتيب</span>
            <span>العنصر والمسار</span>
          </div>
          <span>الإجراءات والتخصيص</span>
        </div>

        {items.map((item, index) => {
          const isEditing = editingId === item.id;
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isActive = item.active !== false;
          const isHighlighted = item.highlighted === true;

          return (
            <div
              key={item.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                !isActive 
                  ? 'bg-slate-50/50 dark:bg-surface-dark/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                  : isHighlighted
                    ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : 'bg-white dark:bg-card-dark border-slate-200/80 dark:border-border-dark shadow-sm hover:border-primary/40'
              }`}
            >
              {/* Left Side: Order + Icon + Title + Path */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Position Index Badge */}
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                  {index + 1}
                </div>

                {/* Icon Preview */}
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {item.icon === 'ShieldCheck' || item.id === 'club-members' ? (
                    <ShieldCheck size={18} className="text-amber-500" />
                  ) : item.icon === 'Globe' || item.id === 'world-fans' ? (
                    <Globe size={18} className="text-emerald-600 dark:text-emerald-400" />
                  ) : item.icon === 'Building2' || item.id === 'business' ? (
                    <Building2 size={18} className="text-emerald-600" />
                  ) : (
                    <span className="material-symbols-outlined !text-[18px]">{item.icon || 'link'}</span>
                  )}
                </div>

                {/* Item Details or Inline Edit Form */}
                {isEditing ? (
                  <div className="flex-1 space-y-2 mr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">اسم العنصر</label>
                        <input
                          type="text"
                          value={editForm.title || ''}
                          onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="اسم العنصر"
                          className="w-full p-2 rounded-xl border border-primary text-xs font-bold bg-white dark:bg-surface-dark"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">المسار أو الرابط</label>
                        <input
                          type="text"
                          value={editForm.path || ''}
                          onChange={e => setEditForm({ ...editForm, path: e.target.value })}
                          placeholder="المسار"
                          className="w-full p-2 rounded-xl border border-border-light text-xs font-bold bg-white dark:bg-surface-dark"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-400 block">الشارة (Badge)</label>
                          {editForm.badge && editForm.badge.trim() !== '' && (
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, badge: '', badgeColor: '' })}
                              className="text-[10px] text-red-500 hover:text-red-600 font-black flex items-center gap-0.5 cursor-pointer"
                              title="إزالة الشارة"
                            >
                              <X size={11} />
                              <span>إزالة الشارة</span>
                            </button>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={editForm.badge || ''}
                            onChange={e => setEditForm({ ...editForm, badge: e.target.value })}
                            placeholder="اتركه فارغاً لإلغاء الشارة"
                            className="w-full p-2 pl-7 rounded-xl border border-border-light text-xs font-bold bg-white dark:bg-surface-dark"
                          />
                          {editForm.badge && (
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, badge: '', badgeColor: '' })}
                              className="absolute left-2 text-slate-400 hover:text-red-500"
                              title="مسح الشارة"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-100 dark:bg-surface-dark px-3 py-1.5 rounded-xl border border-slate-200 dark:border-border-dark">
                        <input
                          type="checkbox"
                          checked={editForm.highlighted || false}
                          onChange={e => setEditForm({ ...editForm, highlighted: e.target.checked })}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Sparkles size={14} className="text-amber-500" />
                          تمييز العنصر (إطار ولون خلفية مميز)
                        </span>
                      </label>

                      {editForm.highlighted && (
                        <div className="flex items-center gap-1.5">
                          <Palette size={14} className="text-slate-400" />
                          <select
                            value={editForm.highlightColor || 'primary'}
                            onChange={e => setEditForm({ ...editForm, highlightColor: e.target.value as any })}
                            className="p-1.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-xs font-bold"
                          >
                            {HIGHLIGHT_COLORS.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">
                        {item.title}
                      </h4>
                      {isHighlighted && (
                        <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                          <Sparkles size={10} />
                          مميز ({getHighlightBadgeName(item.highlightColor)})
                        </span>
                      )}
                      {item.badge && item.badge.trim() !== '' && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase ${item.badgeColor || 'bg-primary text-white'} shadow-xs`}>
                          <span>{item.badge}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveBadge(item.id); }}
                            className="hover:bg-black/25 rounded-full p-0.5 transition-all text-white/90 hover:text-white"
                            title="إزالة هذه الشارة فوراً"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      )}
                      {!isActive && (
                        <span className="px-2 py-0.5 text-[8px] font-bold rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
                          مخفي
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block truncate" dir="ltr">
                      {item.path}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Side: Reorder Arrows & Action Buttons */}
              <div className="flex items-center justify-end gap-1.5 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-border-dark shrink-0">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-sm active:scale-95"
                      title="حفظ التعديل"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-surface-dark text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-all active:scale-95"
                      title="إلغاء"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Toggle Highlight Quick Button */}
                    <button
                      onClick={() => handleToggleHighlight(item.id)}
                      className={`p-2 rounded-xl transition-all active:scale-95 flex items-center gap-1 ${
                        isHighlighted
                          ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
                          : 'bg-slate-100 dark:bg-surface-dark text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      }`}
                      title={isHighlighted ? 'إلغاء التمييز (إزالة الهايلايت)' : 'تمييز هذا العنصر (هايلايت)'}
                    >
                      <Sparkles size={16} />
                    </button>

                    {/* Move Up */}
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={isFirst}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-surface-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-95"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp size={16} />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={isLast}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-surface-dark hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-20 disabled:pointer-events-none active:scale-95"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown size={16} />
                    </button>

                    {/* Toggle Visibility */}
                    <button
                      onClick={() => handleToggleActive(item.id)}
                      className={`p-2 rounded-xl transition-all active:scale-95 ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-100 dark:bg-surface-dark text-slate-400 hover:bg-slate-200'
                      }`}
                      title={isActive ? 'إخفاء من القائمة' : 'إظهار في القائمة'}
                    >
                      {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-surface-dark hover:bg-blue-500/10 hover:text-blue-500 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                      title="تعديل"
                    >
                      <Edit3 size={16} />
                    </button>

                    {/* Delete Custom Items */}
                    {item.group === 'main' && !DEFAULT_SIDEBAR_ITEMS.some(def => def.id === item.id) && (
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-95"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Save Reminder at Bottom */}
      <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-primary shrink-0" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            تذكر الضغط على زر <strong className="text-primary">"حفظ التغييرات"</strong> في الأعلى لتطبيق الترتيب والتمييزات فوراً على كافة مستخدمي التطبيق.
          </p>
        </div>
        <button
          onClick={handleSaveToCloud}
          disabled={isSaving}
          className="w-full sm:w-auto px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-black transition-all shadow-md active:scale-95 shrink-0"
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات الآن'}
        </button>
      </div>
    </div>
  );
}
