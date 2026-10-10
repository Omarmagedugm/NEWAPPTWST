import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { 
  Bookmark, 
  ChevronRight, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

export default function Bookmarks() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'bookmarks'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookmarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error('Bookmarks sync error:', error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bookmarks', id));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto bg-background-light dark:bg-background-dark min-h-screen pb-32 text-right">
      <div style={{ height: 'calc(env(safe-area-inset-top) + 68px)' }} className="w-full relative z-0"></div>
      <header style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }} className="fixed top-0 inset-x-0 w-full max-w-md mx-auto z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-border-light/40 dark:border-border-dark/40 px-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center rounded-2xl glass-card text-slate-600 dark:text-slate-300">
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div>
              <h1 className="text-lg font-black text-primary-dark dark:text-white uppercase leading-none">محفوظاتي</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 inline-block">Saved Posts</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Bookmark size={20} />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {!auth.currentUser ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                <Bookmark size={32} />
             </div>
             <p className="text-slate-500 font-bold text-sm">يجب تسجيل الدخول لرؤية المحفوظات</p>
          </div>
        ) : loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
             <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-surface-dark flex items-center justify-center text-slate-300">
                <Bookmark size={40} />
             </div>
             <div>
                <h3 className="text-lg font-black text-slate-400">لا توجد محفوظات</h3>
                <p className="text-sm text-slate-400/60 font-bold mt-1">ابدأ بحفظ المنشورات من قسم فان زون</p>
             </div>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={bookmark.id}
              className="bg-white dark:bg-card-dark p-4 rounded-3xl border border-border-light dark:border-border-dark flex flex-col gap-3 relative shadow-sm"
            >
              <div className="flex justify-between items-start">
                 <div className="text-right">
                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter">بواسطة: {bookmark.postAuthor}</span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-3">
                      {bookmark.postContent}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-slate-50 dark:border-border-dark">
                <button 
                  onClick={() => navigate('/fan-zone')}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black hover:bg-primary/20 transition-all"
                >
                  <ExternalLink size={14} />
                  عرض في فان زون
                </button>
                <button 
                  onClick={() => handleDelete(bookmark.id)}
                  className="h-10 w-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
}
