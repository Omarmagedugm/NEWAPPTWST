import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { 
  Trophy, 
  MessageCircle, 
  PieChart, 
  Target,
  Users,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Lock,
  Clock,
  Camera,
  Image as ImageIcon,
  X,
  MessageSquare,
  Menu,
  Bell,
  Search,
  MapPin,
  Share2,
  Bookmark,
  Heart,
  MoreVertical,
  ShieldCheck,
  Radio,
  Zap,
  Trash2,
  Edit2,
  Check,
  HelpCircle,
  Grid,
  Upload,
  Sparkles
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType, uploadImage } from '../lib/firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import ScoreSelector from '../components/ScoreSelector';
import ImageUploader from '../components/ImageUploader';
import { getOptimizedImage } from '../lib/cloudinary';
import { SafeImage } from '../components/SafeImage';
import { FansLeaderboard } from '../components/fanzone/FansLeaderboard';
import { 
  doc, 
  updateDoc, 
  increment, 
  addDoc, 
  collection, 
  serverTimestamp,
  query,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  deleteDoc,
  where,
  setDoc
} from 'firebase/firestore';

export default function FanZone() {
  const { polls, matches, clubs, profile, fanPosts, predictions, users } = useAppStore();
  
  // High-level admin check
  const isOmar = auth.currentUser?.email === 'omarmagedugm@ittihad.club';
  const isDev = auth.currentUser?.email === 'copyrightofficialco@gmail.com';
  const isAdmin = profile.role === 'admin' || isOmar || isDev;

  const isPastPredictionDeadline = (matchDate: string) => {
    const matchTime = new Date(matchDate).getTime();
    const now = new Date().getTime();
    return (matchTime - now) < (24 * 60 * 60 * 1000);
  };

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || (location.state as any)?.activeTab || 'all';
  const [activeTab, setActiveTab] = useState<'all' | 'matchday' | 'polls' | 'chat' | 'predictions' | 'leaderboard'>(
    ['all', 'matchday', 'polls', 'chat', 'predictions', 'leaderboard'].includes(initialTab) ? (initialTab as any) : 'all'
  );

  useEffect(() => {
    const tabFromUrl = new URLSearchParams(location.search).get('tab');
    const tabFromState = (location.state as any)?.activeTab;
    const targetTab = tabFromUrl || tabFromState;
    if (targetTab && ['all', 'matchday', 'polls', 'chat', 'predictions', 'leaderboard'].includes(targetTab)) {
      setActiveTab(targetTab as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.state, location.search]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<{ matchId: string; home: number; away: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', image: '', location: '', poll: null as { options: string[] } | null });
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<any[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [matchDayMoments, setMatchDayMoments] = useState<any[]>([]);
  const [attendancePoll, setAttendancePoll] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPostingMoment, setIsPostingMoment] = useState(false);
  const [momentPost, setMomentPost] = useState({ content: '', image: '' });
  const [showMomentForm, setShowMomentForm] = useState(false);
  const [aiConfig, setAiConfig] = useState<any>({ 
    enabled: true, 
    bannerTitle: 'استوديو المشجع الاتحادي', 
    bannerDescription: 'حول صورتك بالذكاء الاصطناعي وارتدي تيشيرت نادي الاتحاد في معقل زعيم الثغر',
    bannerImage: ''
  });

  useEffect(() => {
    const unsubAiConfig = onSnapshot(doc(db, 'settings', 'ai_config'), (snap) => {
      if (snap.exists()) setAiConfig(snap.data());
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.GET, 'settings/ai_config');
      }
    });
    return () => unsubAiConfig();
  }, []);

  const handleAddPoll = () => {
    setNewPost(prev => ({
      ...prev,
      poll: prev.poll ? null : { options: ['', ''] }
    }));
  };

  const handleAddLocation = () => {
    setShowLocationInput(!showLocationInput);
  };

  useEffect(() => {
    if (activeCommentPost) {
      const q = query(
        collection(db, 'fan_posts', activeCommentPost, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        setPostComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, `fan_posts/${activeCommentPost}/comments`);
        }
      });
      return unsub;
    } else {
      setPostComments([]);
    }
  }, [activeCommentPost]);
  const calculateCurrentMinute = (match: any) => {
    const isBasketball = match.sport === 'basketball';
    const defaultBase = isBasketball ? 10 : 0;
    const baseMin = (match.timerBaseMinute !== undefined && match.timerBaseMinute !== null && match.timerBaseMinute !== '')
      ? Number(match.timerBaseMinute)
      : defaultBase;
    if (!match.isTimerRunning || !match.timerStartTime) return baseMin;
    const start = new Date(match.timerStartTime).getTime();
    if (isNaN(start)) return baseMin;
    const elapsed = Math.max(0, Math.floor((new Date().getTime() - start) / 60000));
    if (isBasketball) {
      return Math.max(0, baseMin - elapsed);
    }
    return baseMin + elapsed;
  };

  const [chatMessage, setChatMessage] = useState('');
  const [chatRooms, setChatRooms] = useState<any[]>([]);

  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = new Date(a.date || 0).getTime();
    const timeB = new Date(b.date || 0).getTime();
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (a.status !== 'live' && b.status === 'live') return 1;
    if (a.status === 'upcoming' && b.status === 'finished') return -1;
    if (a.status === 'finished' && b.status === 'upcoming') return 1;
    if (a.status === 'upcoming') return timeA - timeB;
    return timeB - timeA;
  });
  const nextMatch = matches.find(m => m.isMatchDay) || 
                    sortedMatches.find(m => m.status === 'live') || 
                    sortedMatches.find(m => m.status === 'upcoming') || 
                    sortedMatches[0];

  // Listen to match day moments
  useEffect(() => {
    if (activeTab === 'matchday' && nextMatch) {
      const q = query(
        collection(db, 'match_day_moments'),
        where('matchId', '==', (nextMatch as any).id),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      return onSnapshot(q, (snapshot) => {
        setMatchDayMoments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'match_day_moments');
        }
      });
    }
  }, [activeTab, nextMatch]);

  // Listen to attendance poll
  useEffect(() => {
    if (activeTab === 'matchday' && nextMatch) {
      const pollId = `attendance_${(nextMatch as any).id}`;
      return onSnapshot(doc(db, 'match_day_attendance', pollId), (docSnap) => {
        if (docSnap.exists()) {
          setAttendancePoll(docSnap.data());
        } else {
          setAttendancePoll(null);
        }
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, `match_day_attendance/${pollId}`);
        }
      });
    }
  }, [activeTab, nextMatch]);

  const matchPredictions = predictions.filter(p => p.matchId === nextMatch?.id);
  const totalPreds = matchPredictions.length;
  const homeWins = matchPredictions.filter(p => Number(p.homeScore) > Number(p.awayScore)).length;
  const draws = matchPredictions.filter(p => Number(p.homeScore) === Number(p.awayScore)).length;
  const awayWins = matchPredictions.filter(p => Number(p.homeScore) < Number(p.awayScore)).length;

  const homePct = totalPreds > 0 ? (homeWins / totalPreds) * 100 : 33.3;
  const drawPct = totalPreds > 0 ? (draws / totalPreds) * 100 : 33.3;
  const awayPct = totalPreds > 0 ? (awayWins / totalPreds) * 100 : 33.4;

  // Load chat messages
  useEffect(() => {
    if (activeTab === 'chat') {
      const q = query(collection(db, 'live_comments'), orderBy('createdAt', 'desc'), limit(50));
      return onSnapshot(q, (snapshot) => {
        setChatRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'live_comments'));
    }
  }, [activeTab]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!auth.currentUser) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    const userId = auth.currentUser.uid;
    const previousChoice = poll.voterChoices?.[userId];
    
    // If already voted for this option, do nothing
    if (previousChoice === optionIndex) return;

    try {
      const pollRef = doc(db, 'polls', pollId);
      const updates: any = {
        [`votes.${optionIndex}`]: increment(1),
        [`voterChoices.${userId}`]: optionIndex,
        voters: arrayUnion(userId)
      };

      // If changing choice, decrement the old one
      if (previousChoice !== undefined) {
        updates[`votes.${previousChoice}`] = increment(-1);
      }

      await updateDoc(pollRef, updates);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleVotePost = async (postId: string, optionIndex: number) => {
    if (!auth.currentUser) return;
    const post = fanPosts.find(p => p.id === postId);
    if (!post || !post.poll) return;
    
    const userId = auth.currentUser.uid;
    const previousChoice = (post.poll as any).voterChoices?.[userId];
    
    if (previousChoice === optionIndex) return;

    try {
      const postRef = doc(db, 'fan_posts', postId);
      const updates: any = {
        [`poll.votes.${optionIndex}`]: increment(1),
        [`poll.voterChoices.${userId}`]: optionIndex,
        [`poll.voters`]: arrayUnion(userId)
      };

      if (previousChoice !== undefined) {
        updates[`poll.votes.${previousChoice}`] = increment(-1);
      }

      await updateDoc(postRef, updates);
    } catch (error) {
      console.error('Error voting on post poll:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا المنشور؟')) return;
    try {
      await deleteDoc(doc(db, 'fan_posts', postId));
      toast.success('تم حذف المنشور');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('فشل في حذف المنشور');
    }
  };

  const handleSaveEditPost = async (postId: string) => {
    if (!editingContent.trim()) return;
    try {
      await updateDoc(doc(db, 'fan_posts', postId), {
        content: editingContent
      });
      setEditingPostId(null);
      toast.success('تم تعديل المنشور');
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('فشل في تعديل المنشور');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    try {
      await deleteDoc(doc(db, 'fan_posts', postId, 'comments', commentId));
      await updateDoc(doc(db, 'fan_posts', postId), {
        commentsCount: increment(-1)
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleSaveEditComment = async (postId: string, commentId: string) => {
    if (!editingCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'fan_posts', postId, 'comments', commentId), {
        text: editingCommentText.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingCommentId(null);
      setEditingCommentText('');
      toast.success('تم تعديل التعليق');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('فشل في تعديل التعليق');
    }
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    if (!auth.currentUser) return;
    const comment = postComments.find(c => c.id === commentId);
    if (!comment) return;

    const userId = auth.currentUser.uid;
    const likedBy = comment.likedBy || [];
    const isLiked = likedBy.includes(userId);

    try {
      const commentRef = doc(db, 'fan_posts', postId, 'comments', commentId);
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: likedBy.filter((id: string) => id !== userId)
        });
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!auth.currentUser || !commentText.trim()) return;
    try {
      const postRef = doc(db, 'fan_posts', postId);
      const commentsRef = collection(db, 'fan_posts', postId, 'comments');
      
      await addDoc(commentsRef, {
        userId: auth.currentUser.uid,
        userName: profile.name || 'مشجع إتحادي',
        userAvatar: profile.avatar || '',
        text: commentText.trim(),
        createdAt: serverTimestamp()
      });

      await updateDoc(postRef, {
        commentsCount: increment(1)
      });
      
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteChatMessage = async (msgId: string) => {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    try {
      await deleteDoc(doc(db, 'live_comments', msgId));
    } catch (error) {
      console.error('Error deleting chat message:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser || !chatMessage.trim()) return;
    try {
      await addDoc(collection(db, 'live_comments'), {
        text: chatMessage,
        userName: profile.name || 'مشجع إتحادي',
        userAvatar: profile.avatar || '',
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setChatMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleShare = async (post: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'منشور مشجع إتحادي',
          text: post.content,
          url: window.location.href,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      handleCopyText(post.content);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ النص');
  };

  const handleBookmark = async (post: any) => {
    if (!auth.currentUser) {
      toast.error('يجب تسجيل الدخول لحفظ المنشور');
      return;
    }
    
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', auth.currentUser.uid),
        where('postId', '==', post.id)
      );
      // For simplicity, we just add it. In a real app we'd toggle.
      await addDoc(collection(db, 'bookmarks'), {
        userId: auth.currentUser.uid,
        postId: post.id,
        postContent: post.content,
        postAuthor: post.userName,
        createdAt: serverTimestamp()
      });
      toast.success('تم حفظ المنشور في المفضلة!');
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const handleCreatePost = async () => {
    if (!auth.currentUser || (!newPost.content.trim() && !newPost.image && !newPost.poll)) return;
    
    if (newPost.poll) {
      const validOptions = newPost.poll.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast.error('يرجى إضافة خيارين على الأقل للاستطلاع');
        return;
      }
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'fan_posts'), {
        userId: auth.currentUser.uid,
        userName: profile.name || 'مشجع إتحادي',
        userAvatar: profile.avatar || '',
        content: newPost.content,
        image: newPost.image || null,
        location: newPost.location || null,
        poll: newPost.poll ? {
          options: newPost.poll.options.filter(o => o.trim()),
          votes: Object.fromEntries(newPost.poll.options.filter(o => o.trim()).map((_, i) => [i, 0])),
          voters: []
        } : null,
        likes: 0,
        likedBy: [],
        commentsCount: 0,
        createdAt: serverTimestamp()
      });
      setNewPost({ content: '', image: '', location: '', poll: null });
      toast.success('تم النشر بنجاح!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('فشل في النشر، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!auth.currentUser) return;
    const post = fanPosts.find(p => p.id === postId);
    if (!post) return;
    
    const userId = auth.currentUser.uid;
    const likedBy = (post as any).likedBy || [];
    
    if (likedBy.includes(userId)) {
      // Unlike
      try {
        const postRef = doc(db, 'fan_posts', postId);
        await updateDoc(postRef, {
          likes: increment(-1),
          likedBy: likedBy.filter((id: string) => id !== userId)
        });
      } catch (error) {
        console.error('Error unliking post:', error);
      }
      return;
    }

    try {
      const postRef = doc(db, 'fan_posts', postId);
      await updateDoc(postRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  const activeUserIds = new Set([
     ...chatRooms.map(m => m.userId),
     ...fanPosts.map(p => p.userId)
  ]);
  const activeCount = activeUserIds.size;

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatRooms]);

  const handlePredict = async () => {
    if (!auth.currentUser || !selectedPrediction) return;

    const match = matches.find(m => m.id === selectedPrediction.matchId);
    if (!match) return;

    if (isPastPredictionDeadline(match.date)) {
      toast.error('عذراً، انتهت مهلة تغيير التوقع (قبل المباراة بـ 24 ساعة)');
      return;
    }

    const existingPrediction = predictions.find(p => p.matchId === selectedPrediction.matchId && p.userId === auth.currentUser?.uid);

    setIsSubmitting(true);
    try {
      const predData = {
        matchId: selectedPrediction.matchId,
        userId: auth.currentUser.uid,
        userName: profile.name || 'مشجع',
        userEmail: auth.currentUser.email || '',
        userAvatar: profile.avatar || '',
        homeScore: selectedPrediction.home,
        awayScore: selectedPrediction.away,
        createdAt: serverTimestamp()
      };

      if (existingPrediction) {
        await setDoc(doc(db, 'predictions', existingPrediction.id), predData);
        toast.success('تم تحديث توقعك بنجاح!');
      } else {
        await addDoc(collection(db, 'predictions'), predData);
        toast.success('تم تسجيل توقعك بنجاح!');
      }
      setSelectedPrediction(null);
    } catch (error) {
      console.error('Error predicting:', error);
      toast.error('حدث خطأ أثناء حفظ التوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteAttendance = async (choice: 'yes' | 'no' | 'maybe') => {
    if (!auth.currentUser || !nextMatch) return;
    const pollId = `attendance_${(nextMatch as any).id}`;
    const userId = auth.currentUser.uid;
    const previousChoice = attendancePoll?.voters?.[userId];
    
    if (previousChoice === choice) return;

    try {
      const pollRef = doc(db, 'match_day_attendance', pollId);
      const updates: any = {
        [`votes.${choice}`]: increment(1),
        [`voters.${userId}`]: choice,
        matchId: (nextMatch as any).id
      };

      if (previousChoice) {
        updates[`votes.${previousChoice}`] = increment(-1);
      }

      await updateDoc(pollRef, updates);
    } catch (error: any) {
      if (error.code === 'not-found') {
        const pollRef = doc(db, 'match_day_attendance', pollId);
        const initialVotes = { yes: 0, no: 0, maybe: 0 };
        initialVotes[choice] = 1;
        await setDoc(pollRef, {
          matchId: (nextMatch as any).id,
          votes: initialVotes,
          voters: { [userId]: choice }
        });
      } else {
        console.error('Error voting attendance:', error);
      }
    }
  };

  const handleCreateMoment = async () => {
    if (!auth.currentUser || !nextMatch || (!momentPost.content.trim() && !momentPost.image)) return;
    if (isPostingMoment) return;

    setIsPostingMoment(true);
    try {
      await addDoc(collection(db, 'match_day_moments'), {
        userId: auth.currentUser.uid,
        userName: profile.name || 'مشجع إتحادي',
        userAvatar: profile.avatar || '',
        content: momentPost.content,
        image: momentPost.image || null,
        matchId: nextMatch.id,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      setMomentPost({ content: '', image: '' });
      setShowMomentForm(false);
      toast.success('تم نشر صورتك في الماتش بنجاح! 📸');
    } catch (error) {
      console.error('Error creating moment:', error);
      toast.error('فشل في النشر');
    } finally {
      setIsPostingMoment(false);
    }
  };

  const handleLikeMoment = async (momentId: string) => {
    if (!auth.currentUser) return;
    const moment = matchDayMoments.find(m => m.id === momentId);
    if (!moment) return;
    
    const userId = auth.currentUser.uid;
    const likedBy = moment.likedBy || [];
    
    try {
      const momentRef = doc(db, 'match_day_moments', momentId);
      if (likedBy.includes(userId)) {
        await updateDoc(momentRef, {
          likes: increment(-1),
          likedBy: likedBy.filter((id: string) => id !== userId)
        });
      } else {
        await updateDoc(momentRef, {
          likes: increment(1),
          likedBy: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error('Error liking moment:', error);
    }
  };

  return (
    <div className="flex-1 pb-32 md:pb-16 flex flex-col bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-white">
      <main className="px-4 md:px-6 pt-2 pb-6 space-y-8 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        {/* AI Jersey Try-On Banner: Prominent call to action */}
        {aiConfig.enabled && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[32px] bg-[#072418] border border-primary/20 p-6 md:p-8 group shadow-xl"
          >
            {/* Background Image with custom opacity */}
            {aiConfig.bannerImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-300"
                style={{ 
                  backgroundImage: `url(${aiConfig.bannerImage})`,
                  opacity: (aiConfig.bannerOpacity !== undefined ? aiConfig.bannerOpacity : 70) / 100
                }}
              />
            )}
            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            {/* Fan & Stadium Watermark Icon on the Left Space */}
            <Users size={160} className="absolute -left-8 -bottom-10 text-white/10 pointer-events-none group-hover:scale-110 group-hover:text-amber-300/15 transition-all duration-700" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-3xl bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/40 flex-shrink-0 animate-pulse relative shadow-inner">
                <Users className="text-amber-300" size={52} />
                <span className="absolute top-2 right-2 p-1.5 rounded-xl bg-emerald-500/30 text-white border border-emerald-400/40">
                  <Sparkles size={16} />
                </span>
                <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20"></div>
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-2xl md:text-4xl font-black text-white italic drop-shadow-md">{aiConfig.bannerTitle || 'استوديو المشجع الاتحادي'}</h2>
                <p className="text-slate-200 text-sm md:text-base font-bold leading-relaxed drop-shadow-sm">
                  {aiConfig.bannerDescription || 'حول صورتك بالذكاء الاصطناعي وارتدي تيشيرت نادي الاتحاد في معقل زعيم الثغر'}
                </p>
              </div>
              <Link 
                to="/jersey-tryon" 
                className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all flex items-center gap-3 shrink-0 cursor-pointer"
              >
                <Users size={22} className="text-amber-300" />
                <span>جرب الآن</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Post Creation Box Upgrade */}
        {auth.currentUser && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-[40px] p-6 shadow-premium border border-primary/10 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-all"></div>
            
            <div className="flex gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl overflow-hidden glass-card ring-1 ring-primary/20 shrink-0">
                <img src={getOptimizedImage(profile.avatar, 80) || undefined} className="w-full h-full object-cover" alt="user" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1">
                <div className="bg-slate-100/50 dark:bg-slate-900/60 rounded-[28px] border border-border-light dark:border-white/5 p-4 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner backdrop-blur-sm">
                  <textarea 
                    placeholder="بماذا تفكر يا مشجع الاتحاد؟" 
                    className="w-full bg-transparent text-base font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none min-h-[100px] resize-none"
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  />
                </div>
                
                {newPost.poll && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 space-y-3 bg-slate-50/50 dark:bg-surface-dark/50 p-4 rounded-[28px] border border-border-light dark:border-border-dark"
                  >
                    <div className="flex justify-between items-center mb-1 px-1">
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Poll Options</span>
                       <button onClick={() => setNewPost(prev => ({ ...prev, poll: null }))} className="text-red-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                    {newPost.poll.options.map((opt, idx) => (
                      <input 
                        key={idx}
                        type="text"
                        placeholder={`Option ${idx + 1}...`}
                        className="w-full bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:border-primary/50 outline-none transition-all"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(newPost.poll?.options || [])];
                          newOpts[idx] = e.target.value;
                          setNewPost(prev => ({ ...prev, poll: { options: newOpts } }));
                        }}
                      />
                    ))}
                    {newPost.poll.options.length < 4 && (
                      <button 
                        onClick={() => setNewPost(prev => ({ ...prev, poll: { options: [...(prev.poll?.options || []), ''] } }))}
                        className="w-full py-2 border-2 border-dashed border-border-light dark:border-border-dark rounded-xl text-[10px] font-black text-primary hover:bg-primary/5 transition-all text-center"
                      >
                        + Add Option
                      </button>
                    )}
                  </motion.div>
                )}

                {newPost.location && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 flex items-center justify-between bg-primary/5 dark:bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 w-fit"
                  >
                    <span className="text-[10px] font-black text-primary flex items-center gap-1.5 uppercase tracking-tighter">
                      <MapPin size={12} /> {newPost.location}
                    </span>
                    <button onClick={() => setNewPost(prev => ({ ...prev, location: '' }))} className="mr-2 text-primary/50 hover:text-primary"><X size={12}/></button>
                  </motion.div>
                )}

                {showLocationInput && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4"
                  >
                    <div className="flex bg-slate-50/50 dark:bg-surface-dark/50 p-4 rounded-[28px] border border-border-light dark:border-border-dark flex-col gap-2">
                      <div className="flex justify-between items-center mb-1 px-1">
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Add Location</span>
                         <button onClick={() => setShowLocationInput(false)} className="text-red-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                      </div>
                      <input 
                        type="text"
                        placeholder="أدخل الموقع (مثال: استاد الإسكندرية)"
                        className="w-full bg-white dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:border-primary/50 outline-none transition-all shadow-sm"
                        value={newPost.location}
                        onChange={(e) => setNewPost(prev => ({ ...prev, location: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-light/40 dark:border-border-dark/40 relative z-10">
              <div className="flex items-center gap-4">
                <ImageUploader 
                  folderName="fan_posts"
                  iconOnly={true}
                  className="!gap-0" // override the gap-4 from the uploader container
                  buttonClassName="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/10 text-slate-400 hover:text-primary transition-all cursor-pointer"
                  onUploadSuccess={(url) => {
                    setNewPost(prev => ({ ...prev, image: url }));
                  }}
                  onError={(err) => toast.error(err)}
                />
                <button onClick={handleAddPoll} className={`flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/10 transition-all ${newPost.poll ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary'}`}>
                  <BarChart2 size={20} />
                </button>
                <button 
                  onClick={handleAddLocation} 
                  className={`flex h-10 w-10 items-center justify-center rounded-xl hover:bg-primary/10 transition-all ${newPost.location || showLocationInput ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary'}`}
                  title="إضافة موقع"
                >
                  <MapPin size={20} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {newPost.image && (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden glass-card ring-1 ring-primary/20 group">
                    <img src={getOptimizedImage(newPost.image, 150)} className="w-full h-full object-cover" alt="preview" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setNewPost({ ...newPost, image: '' })}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreatePost}
                  disabled={isSubmitting || (!newPost.content.trim() && !newPost.image && !newPost.poll)}
                  className="bg-primary text-white px-8 h-10 rounded-xl text-[11px] font-black shadow-premium shadow-primary/20 disabled:opacity-50 transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  {isSubmitting ? 'جاري...' : 'نشر'}
                  <ChevronRight size={14} className="rotate-180" strokeWidth={3} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Improved Tabs Navigation */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
          {[
            { id: 'all', label: 'الساحة', icon: Users },
            { id: 'leaderboard', label: 'صدارة المشجعين 🏆', icon: Trophy },
            { id: 'chat', label: 'الدردشة', icon: MessageCircle },
            { id: 'predictions', label: 'توقعات', icon: Target },
            { id: 'matchday', label: 'المباراة', icon: Clock },
            { id: 'polls', label: 'استطلاع', icon: BarChart2 },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-6 py-2.5 rounded-2xl text-[11px] font-black transition-all duration-300 snap-center border flex items-center gap-2 uppercase tracking-tighter ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-premium shadow-primary/30 border-primary' 
                  : 'bg-white dark:bg-surface-dark text-slate-500 dark:text-slate-400 border-border-light dark:border-border-dark hover:border-primary/50'
              }`}
            >
              <tab.icon size={14} strokeWidth={3} />
              {tab.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'all' && (
            <motion.div
              key="all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Featured Official Poll Upgrade */}
              {polls.filter(p => p.active).slice(0, 1).map((poll) => {
                const totalVotes = Object.values(poll.votes || {}).reduce((a, b) => a + Number(b), 0);
                return (
                  <motion.div 
                    key={poll.id} 
                    layout
                    className="stadium-gradient rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden cinematic-glow border border-white/5"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white/10 backdrop-blur-md text-[9px] font-black rounded-xl uppercase tracking-widest ring-1 ring-white/20">
                          استطلاع رسمي
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black text-white/50">
                           <Clock size={10} /> {format(new Date(), 'HH:mm')}
                        </div>
                      </div>
                      <button className="text-white/40 hover:text-white transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </div>

                    <h3 className="text-2xl font-black mb-8 leading-[1.3] relative z-10 drop-shadow-lg">{poll.question}</h3>
                    
                    <div className="space-y-3 mb-8 relative z-10">
                      {poll.options.map((opt, idx) => {
                        const votes = poll.votes?.[idx] || 0;
                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const hasVoted = poll.voters?.includes(auth.currentUser?.uid || '') || poll.voterChoices?.[auth.currentUser?.uid || ''] !== undefined;
                        const userChoice = poll.voterChoices?.[auth.currentUser?.uid || ''];
                        const isSelected = userChoice === idx;

                        return (
                          <motion.button 
                            key={idx}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleVote(poll.id, idx)}
                            className={`w-full relative h-[60px] rounded-2xl overflow-hidden transition-all flex items-center justify-between px-6 font-black text-xs group ${
                              isSelected ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-accent/50'
                            } bg-white/5 border border-white/10 shadow-premium`}
                          >
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1.5, ease: 'circOut' }}
                              className={`absolute inset-y-0 right-0 ${
                                isSelected 
                                  ? 'bg-gradient-to-l from-amber-500/80 via-amber-600/70 to-yellow-600/50 border-l-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                                  : 'bg-gradient-to-l from-amber-600/75 via-amber-700/65 to-yellow-800/40 border-l-2 border-amber-400/80'
                              }`} 
                            />
                            <span className="relative z-10 flex items-center gap-3">
                               <span className="text-[10px] opacity-40 font-bold tabular-nums">0{idx + 1}</span>
                               <span className="group-hover:text-accent transition-colors">{opt}</span>
                            </span>
                            <span className="relative z-10 text-[11px] font-black text-amber-200 dark:text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums px-2 py-0.5 bg-black/40 border border-amber-400/40 rounded-lg">%{percentage}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-black text-white/50 border-t border-white/5 pt-6 bg-transparent relative z-10 uppercase tracking-widest">
                      <span>{totalVotes.toLocaleString()} VOTES</span>
                      <span className="opacity-20 text-xs">/</span>
                      <span className="flex items-center gap-1 uppercase">LIVE FEED <Radio size={10} className="text-red-500 animate-pulse" /></span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Feed Posts Premium Upgrade */}
              <div className="flex flex-col gap-8">
              {fanPosts.map((post) => (
                <motion.div 
                  key={post.id} 
                  layout
                  className="glass-card rounded-[40px] p-6 shadow-premium border border-border-light/40 dark:border-border-dark/40 overflow-hidden relative group"
                >
                  <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      {(() => {
                        const postUser = users.find(u => u.uid === post.userId);
                        const displayAvatar = postUser?.avatar || post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`;
                        const displayName = postUser?.name || post.userName;
                        const tier = postUser?.tier || 'new';
                        const role = postUser?.role || 'user';
                        const isManagement = role === 'admin' || post.userId === 'omarmagedugm' || post.userId === 'copyrightofficialco';

                        return (
                          <>
                            <div className="w-12 h-12 rounded-2xl overflow-hidden glass-card ring-1 ring-primary/10 p-0.5 shrink-0">
                              <img 
                                src={getOptimizedImage(displayAvatar, 80)} 
                                className="w-full h-full object-cover rounded-2xl bg-slate-100" 
                                alt={displayName}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <h4 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{displayName}</h4>
                                {isManagement && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] font-black uppercase ring-1 ring-red-500/30">
                                    <ShieldCheck size={10} />
                                    مدير التطبيق
                                  </span>
                                )}
                                {(() => {
                                  const tierMap: any = {
                                     premium: { label: 'عضو ملكي 👑', color: 'bg-gradient-to-r from-amber-500 to-yellow-500' },
                                     diamond: { label: 'عضو ماسي 💎', color: 'bg-cyan-500' },
                                     gold: { label: 'عضو ذهبي 🥇', color: 'bg-yellow-500' },
                                     silver: { label: 'عضو فضي 🥈', color: 'bg-slate-400' },
                                     bronze: { label: 'عضو برونزي 🥉', color: 'bg-orange-700' },
                                     new: { label: 'مشجع جديد 🟢', color: 'bg-primary' }
                                  };
                                  const tData = tierMap[tier] || tierMap.new;
                                  return (
                                    <div className={`${tData.color} text-white text-[8px] font-black px-2 py-0.5 rounded-lg tracking-tighter shadow-sm flex items-center gap-1`}>
                                      {tData.label}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-normal">
                                 {(() => {
                                   if (!post.createdAt) return 'الآن';
                                   const createdAny = post.createdAt as any;
                                   const postDate = createdAny.seconds 
                                     ? new Date(createdAny.seconds * 1000) 
                                     : new Date(createdAny);
                                   return format(postDate, 'd MMMM yyyy - hh:mm a', { locale: ar });
                                 })()}
                                 {post.location && (
                                   <span className="flex items-center gap-1 text-primary">
                                     <MapPin size={10} /> {post.location}
                                   </span>
                                 )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    {(post.userId === auth.currentUser?.uid || isAdmin) && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditingContent(post.content);
                          }}
                          className="h-8 w-8 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center text-blue-500 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="h-8 w-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    <button className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-dark flex items-center justify-center text-slate-400 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="mb-6 relative z-10">
                    {editingPostId === post.id ? (
                      <div className="space-y-3">
                        <textarea 
                          className="w-full bg-slate-50 dark:bg-surface-dark border border-primary/20 rounded-2xl p-4 text-[14px] font-bold text-slate-800 dark:text-white focus:outline-none min-h-[100px]"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleSaveEditPost(post.id)}
                            className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingPostId(null)}
                            className="bg-slate-200 dark:bg-slate-800 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[14px] text-slate-800 dark:text-slate-200 font-bold leading-relaxed mb-4 whitespace-pre-wrap break-words">
                        {post.content}
                      </p>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-black text-primary px-2.5 py-1 bg-primary/5 rounded-lg flex items-center gap-1 transition-all hover:bg-primary/10 cursor-pointer">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {post.poll && (
                      <div className="mt-6 space-y-3">
                        {post.poll.options.map((option, idx) => {
                          const votesMap = post.poll?.votes || {};
                          const votes = Number(votesMap[idx] || 0);
                          const totalVotes = Object.values(votesMap).reduce((a, b) => a + Number(b), 0);
                          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                          const hasVoted = post.poll?.voters?.includes(auth.currentUser?.uid || '') || post.poll?.voterChoices?.[auth.currentUser?.uid || ''] !== undefined;
                          const userChoice = post.poll?.voterChoices?.[auth.currentUser?.uid || ''];
                          const isSelected = userChoice === idx;
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => handleVotePost(post.id, idx)}
                              className={`w-full relative h-[52px] rounded-2xl overflow-hidden glass-card border flex items-center justify-between px-5 group transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border-light dark:border-border-dark hover:border-primary/40 active:scale-95'}`}
                            >
                              <div 
                                className={`absolute inset-y-0 right-0 ${
                                  isSelected
                                    ? 'bg-gradient-to-l from-amber-500/80 via-amber-600/60 to-yellow-600/40 border-l-2 border-amber-400'
                                    : hasVoted
                                    ? 'bg-gradient-to-l from-amber-600/70 via-amber-700/50 to-yellow-800/30 border-l-2 border-amber-500'
                                    : 'bg-amber-500/15'
                                } transition-all duration-700`} 
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="relative z-10 text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">{option}</span>
                              <span className="relative z-10 text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">%{percentage}</span>
                            </button>
                          );
                        })}
                        <div className="flex items-center justify-between px-1 mt-2">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
                            {Object.values(post.poll?.votes || {}).reduce((a, b) => a + Number(b), 0)} TOTAL VOTES
                           </span>
                           {post.poll?.voters?.includes(auth.currentUser?.uid || '') && (
                             <span className="text-[9px] font-black text-primary flex items-center gap-1 uppercase tracking-widest"><ShieldCheck size={12}/> Verified Vote</span>
                           )}
                        </div>
                      </div>
                    )}
                  </div>

                  {post.image && (
                    <div 
                      onClick={() => setLightboxImage(post.image)}
                      className="relative w-full rounded-[24px] sm:rounded-[32px] overflow-hidden mb-6 border border-border-light/80 dark:border-border-dark/80 shadow-premium group/img bg-slate-100/50 dark:bg-slate-900/50 cursor-zoom-in flex items-center justify-center transition-all hover:border-primary/30"
                    >
                      <img 
                        src={getOptimizedImage(post.image, 1200)} 
                        className="w-full h-auto max-h-[700px] object-contain transition-transform duration-500 group-hover/img:scale-[1.01]" 
                        alt="post attachment" 
                        loading="lazy"
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors pointer-events-none flex items-end justify-end p-4">
                        <span className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/60 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
                          تكبير الصورة
                        </span>
                      </div>
                    </div>
                  )}

                      <div className="grid grid-cols-5 gap-3 items-center border-t border-border-light/40 dark:border-border-dark/40 pt-6 relative z-10">
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center justify-center gap-2 h-10 rounded-2xl glass-card transition-all ${post.likedBy?.includes(auth.currentUser?.uid) ? 'bg-red-500/10 text-red-500' : 'text-slate-500'}`}
                      >
                        <Heart size={18} fill={post.likedBy?.includes(auth.currentUser?.uid) ? 'currentColor' : 'none'} className="transition-transform group-active:scale-125" />
                        <span className="text-[11px] font-black tabular-nums">{post.likes || 0}</span>
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                        className={`flex items-center justify-center gap-2 h-10 rounded-2xl glass-card transition-all ${activeCommentPost === post.id ? 'bg-primary/10 text-primary' : 'text-slate-500'}`}
                      >
                        <MessageSquare size={18} />
                        <span className="text-[11px] font-black tabular-nums">{post.commentsCount || 0}</span>
                      </motion.button>

                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCopyText(post.content)}
                        className="flex items-center justify-center h-10 rounded-2xl glass-card text-slate-500 hover:text-primary transition-all"
                        title="نسخ النص"
                      >
                        <span className="material-symbols-outlined !text-[18px]">content_copy</span>
                      </motion.button>
                      
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleShare(post)}
                        className="flex items-center justify-center h-10 rounded-2xl glass-card text-slate-500 hover:text-primary transition-all"
                      >
                        <Share2 size={18} />
                      </motion.button>

                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleBookmark(post)}
                        className="flex items-center justify-center h-10 rounded-2xl glass-card text-slate-500 hover:text-primary transition-all"
                      >
                        <Bookmark size={18} />
                      </motion.button>
                  </div>

                  {activeCommentPost === post.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-6 pt-6 border-t border-border-light/40 dark:border-border-dark/40"
                    >
                      <div className="flex gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl overflow-hidden glass-card ring-1 ring-primary/20 shrink-0">
                          <img src={getOptimizedImage(profile.avatar, 80) || undefined} className="w-full h-full object-cover" alt="me" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 flex gap-2 relative">
                          <input 
                            type="text" 
                            placeholder="أكتب تعليقك..." 
                            className="w-full bg-slate-50 dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl px-5 h-11 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          />
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentText.trim()}
                            className="bg-primary text-white h-11 px-6 text-[10px] font-black rounded-2xl disabled:opacity-50 shadow-premium shadow-primary/20 uppercase tracking-widest"
                          >
                            Send
                          </motion.button>
                        </div>
                      </div>

                      <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar pb-2">
                        {postComments.map((comment) => {
                          const commentUser = users.find(u => u.uid === comment.userId);
                          const displayAvatar = commentUser?.avatar || comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`;
                          const displayName = commentUser?.name || comment.userName;

                          return (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={comment.id} 
                              className="flex gap-4 group/comment"
                            >
                              <img src={getOptimizedImage(displayAvatar, 80)} className="w-9 h-9 rounded-[14px] bg-slate-100 shrink-0 border border-border-light dark:border-border-dark shadow-sm" alt="avatar" referrerPolicy="no-referrer" />
                              <div className="flex-1 bg-slate-50 dark:bg-surface-dark p-4 rounded-[24px] border border-border-light dark:border-border-dark shadow-sm group-hover/comment:border-primary/20 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                  <h5 className="text-[11px] font-black text-primary uppercase tracking-tighter">{displayName}</h5>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleLikeComment(post.id, comment.id)}
                                    className={`flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-lg transition-all ${comment.likedBy?.includes(auth.currentUser?.uid) ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                  >
                                    <Heart size={10} fill={comment.likedBy?.includes(auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                                    {comment.likes || 0}
                                  </button>
                                  {(comment.userId === auth.currentUser?.uid || isAdmin) && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleCopyText(comment.text)}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-md"
                                        title="نسخ التعليق"
                                      >
                                        <span className="material-symbols-outlined !text-[12px]">content_copy</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingCommentText(comment.text);
                                        }}
                                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-500 rounded-md"
                                      >
                                        <Edit2 size={10} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 rounded-md"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tabular-nums">
                                    {comment.createdAt ? format(new Date(comment.createdAt.seconds * 1000), 'HH:mm', { locale: ar }) : 'الآن'}
                                  </span>
                                </div>
                              </div>
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                  <input 
                                    className="w-full bg-white dark:bg-card-dark border border-primary/20 rounded-xl px-3 py-1.5 text-[12px] font-bold text-slate-800 dark:text-white focus:outline-none"
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEditComment(post.id, comment.id)}
                                  />
                                  <div className="flex gap-1">
                                    <button onClick={() => handleSaveEditComment(post.id, comment.id)} className="text-[8px] font-black uppercase text-primary px-2 py-1 bg-primary/10 rounded-md">Save</button>
                                    <button onClick={() => setEditingCommentId(null)} className="text-[8px] font-black uppercase text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
                              )}
                            </div>
                          </motion.div>
                          );
                        })}
                        {postComments.length === 0 && (
                          <div className="py-8 text-center opacity-30">
                            <span className="material-symbols-outlined !text-3xl mb-2">comments_disabled</span>
                            <p className="text-[10px] font-black uppercase">No comments yet</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-[65vh] glass-card rounded-[40px] border border-primary/20 overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-border-light/40 dark:border-border-dark/40 flex items-center justify-between bg-white/5 dark:bg-surface-dark/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-accent rounded-full shadow-glow animate-pulse" />
                  <div className="flex flex-col">
                    <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase leading-none">الدردشة الفورية</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Fan Room</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-background-dark rounded-full shadow-inner ring-1 ring-border-light dark:ring-border-dark">
                  <Users size={12} className="text-primary" />
                  <span className="text-[10px] font-black tabular-nums text-slate-600 dark:text-slate-300 uppercase">
                    {Math.max(activeCount, users.length > 0 ? Math.floor(users.length / 2) : 12)} Online
                  </span>
                </div>
              </div>

              <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar stadium-gradient/10"
              >
                {chatRooms.length > 0 ? chatRooms.map((msg, i) => {
                  const isOwn = msg.userId === auth.currentUser?.uid;
                  return (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      {(() => {
                        const chatUser = users.find(u => u.uid === msg.userId);
                        const chatAvatar = chatUser?.avatar || msg.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userId}`;
                        const chatName = chatUser?.name || msg.userName;
                        return (
                          <>
                            <img src={getOptimizedImage(chatAvatar, 80)} className="w-10 h-10 rounded-[14px] bg-slate-100 shadow-sm border border-border-light dark:border-border-dark shrink-0" alt="avatar" referrerPolicy="no-referrer" />
                            <div className={`max-w-[80%] ${isOwn ? 'items-end text-left' : 'items-start text-right'} flex flex-col gap-1.5`}>
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{chatName}</span>
                                {(isOwn || isAdmin) && (
                                  <button 
                                    onClick={() => handleDeleteChatMessage(msg.id)}
                                    className="text-red-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                              <div className={`px-5 py-3 rounded-2xl text-[12px] font-bold leading-relaxed shadow-premium whitespace-pre-wrap break-words ${isOwn ? 'bg-primary text-white rounded-tl-[4px]' : 'glass-card text-slate-800 dark:text-white rounded-tr-[4px]'}`}>
                                {msg.text}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-20 gap-4">
                    <MessageCircle size={64} strokeWidth={1} />
                    <p className="text-sm font-black uppercase tracking-widest">No messages yet. Shine first!</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white/40 dark:bg-black/20 backdrop-blur-xl border-t border-border-light dark:border-white/5">
                <div className="flex gap-2 bg-white dark:bg-black/40 rounded-[24px] p-2 border border-border-light dark:border-white/10 focus-within:border-primary/50 transition-all shadow-premium backdrop-blur-md">
                  <input 
                    type="text" 
                    placeholder="أرسل رسالة..." 
                    className="flex-1 bg-transparent px-5 py-2 text-xs font-bold text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white disabled:opacity-50 transition-all shadow-premium shadow-primary/30"
                  >
                    <ChevronRight className="rotate-180" size={20} strokeWidth={3} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <FansLeaderboard />
            </motion.div>
          )}

          {activeTab === 'predictions' && (
            <motion.div
              key="predictions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <div className="flex flex-col px-1">
                <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none uppercase">توقعات الجمهور</h2>
                {/* Recent Winners Section */}
                {(() => {
                  const finishedMatches = matches?.filter(m => m.status === 'finished').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
                  const latestFinished = finishedMatches[0];
                  if (!latestFinished) return null;
                  
                  const winners = predictions?.filter(p => 
                    p.matchId === latestFinished.id && 
                    Number(p.homeScore) === Number(latestFinished.homeScore) && 
                    Number(p.awayScore) === Number(latestFinished.awayScore)
                  ) || [];

                  if (winners.length === 0) return null;

                  return (
                    <motion.div 
                      key="winners-banner"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 bg-gradient-to-br from-green-600/10 to-emerald-600/10 border border-green-500/20 rounded-[32px] p-6 shadow-sm overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-3xl rounded-full -mr-10 -mt-10 animate-pulse" />
                      <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-10 h-10 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                          <Trophy size={18} />
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-800 dark:text-white leading-tight">فائزو التوقعات</h3>
                          <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1">المتوقعون الصحيحون لمباراة {latestFinished.awayTeam}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 relative z-10">
                        {winners.slice(0, 6).map((winner, idx) => (
                          <motion.div 
                            key={winner.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white/90 dark:bg-card-dark/80 backdrop-blur-md border border-green-500/10 rounded-xl p-2.5 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-[10px] font-black text-green-600">
                              #{idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">{winner.userName}</p>
                              <div className="flex items-center gap-1">
                                <Check size={8} className="text-green-500" />
                                <span className="text-[8px] font-black text-green-600">{winner.homeScore}-{winner.awayScore}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Fan Predictions Wall</span>
              </div>

              {/* Prediction Input Form (if applicable) */}
              {(() => {
                const availableMatches = matches?.filter(m => 
                  (m.status === 'upcoming' || m.isMatchDay)
                ).sort((a, b) => {
                  // Prioritize matchday
                  if (a.isMatchDay && !b.isMatchDay) return -1;
                  if (!a.isMatchDay && b.isMatchDay) return 1;
                  return new Date(a.date).getTime() - new Date(b.date).getTime();
                }) || [];

                if (availableMatches.length === 0) return null;

                return (
                  <div className="space-y-4">
                    {availableMatches.map(match => {
                      const userPred = predictions.find(p => p.matchId === match.id && p.userId === auth.currentUser?.uid);
                      const isPastDeadline = isPastPredictionDeadline(match.date);
                      
                      return (
                      <div key={match.id} className={`glass-card rounded-[40px] p-8 border border-primary/20 shadow-premium relative overflow-hidden group ${isPastDeadline ? 'opacity-75 grayscale-[0.3]' : ''}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full"></div>
                        <div className="flex flex-col items-center gap-6 relative z-10">
                          <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-2 max-w-full overflow-hidden">
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
                                 {isPastDeadline ? 'انتهت المهلة' : userPred ? 'تعديل التوقع' : 'مباراة متاحة للتوقع'}
                               </span>
                             </div>
                             <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-surface-dark px-2.5 py-1 rounded-xl max-w-full w-fit flex flex-col items-end leading-tight shrink-0">
                               <span>{format(new Date(match.date), 'd MMMM yyyy', { locale: ar })}</span>
                               <div className="flex items-center gap-1">
                                 <span className="text-amber-500 dark:text-amber-400 font-black">{format(new Date(match.date), 'h:mm a', { locale: ar })}</span>
                                 <span>-</span>
                                 <span>{format(new Date(match.date), 'EEEE', { locale: ar })}</span>
                               </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-center gap-8 w-full">
                             {match.sport === 'basketball' ? (
                               <div className="flex items-center gap-4 w-full">
                                 <button 
                                   onClick={() => setSelectedPrediction({ matchId: match.id, home: 1, away: 0 })}
                                   className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-[32px] border-2 transition-all ${selectedPrediction?.matchId === match.id && selectedPrediction.home > selectedPrediction.away ? 'bg-orange-500 border-orange-400 text-white shadow-lg scale-105' : (userPred && userPred.homeScore > userPred.awayScore && selectedPrediction?.matchId !== match.id) ? 'bg-orange-500/50 border-orange-400/50 text-white' : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-slate-500 hover:border-orange-500/50'}`}
                                 >
                                   <div className="relative w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2 mb-1">
                                      <SafeImage teamName={match.homeTeam} src={match.homeLogo} width={200} className="w-full h-full object-contain" alt={match.homeTeam} />
                                      {predictions.filter(p => p.matchId === match.id).length > 0 && (
                                        <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                                          {Math.round((predictions.filter(p => p.matchId === match.id && Number(p.homeScore) > Number(p.awayScore)).length / predictions.filter(p => p.matchId === match.id).length) * 100)}%
                                        </div>
                                      )}
                                   </div>
                                   <span className={`font-black uppercase text-center whitespace-nowrap max-w-full w-full ${((match.homeTeam || "").trim().includes(" ") || (match.homeTeam || "").length > 7) ? "text-[9px] sm:text-[10px]" : "text-xs"}`}>{match.homeTeam}</span>
                                   <div className="px-4 py-1.5 rounded-full bg-black/10 text-[9px] font-black">توقع الفوز</div>
                                 </button>

                                 <div className="flex flex-col items-center gap-2">
                                   <div className="h-10 w-[1px] bg-border-light dark:bg-border-dark" />
                                   <span className="text-[10px] font-black text-slate-300">VS</span>
                                   <div className="h-10 w-[1px] bg-border-light dark:bg-border-dark" />
                                 </div>

                                 <button 
                                   onClick={() => setSelectedPrediction({ matchId: match.id, home: 0, away: 1 })}
                                   className={`flex-1 flex flex-col items-center gap-3 p-6 rounded-[32px] border-2 transition-all ${selectedPrediction?.matchId === match.id && selectedPrediction.away > selectedPrediction.home ? 'bg-orange-500 border-orange-400 text-white shadow-lg scale-105' : (userPred && userPred.awayScore > userPred.homeScore && selectedPrediction?.matchId !== match.id) ? 'bg-orange-500/50 border-orange-400/50 text-white' : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark text-slate-500 hover:border-orange-500/50'}`}
                                 >
                                   <div className="relative w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2 mb-1">
                                      <SafeImage teamName={match.awayTeam} src={match.awayLogo} width={200} className="w-full h-full object-contain" alt={match.awayTeam} />
                                      {predictions.filter(p => p.matchId === match.id).length > 0 && (
                                        <div className="absolute -top-2 -left-2 bg-orange-600 text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                                          {Math.round((predictions.filter(p => p.matchId === match.id && Number(p.awayScore) > Number(p.homeScore)).length / predictions.filter(p => p.matchId === match.id).length) * 100)}%
                                        </div>
                                      )}
                                   </div>
                                   <span className={`font-black uppercase text-center whitespace-nowrap max-w-full w-full ${((match.awayTeam || "").trim().includes(" ") || (match.awayTeam || "").length > 7) ? "text-[9px] sm:text-[10px]" : "text-xs"}`}>{match.awayTeam}</span>
                                   <div className="px-4 py-1.5 rounded-full bg-black/10 text-[9px] font-black">توقع الفوز</div>
                                 </button>
                               </div>
                             ) : (
                               <>
                                 <div className="flex flex-col items-center gap-2 w-24">
                                   <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 relative group-hover:border-primary/50 transition-colors">
                                     <SafeImage teamName={match.homeTeam} src={match.homeLogo} width={150} className="w-8 h-8 object-contain" alt={match.homeTeam} />
                                     {predictions.filter(p => p.matchId === match.id).length > 0 && (
                                       <div className="absolute -top-2 -right-2 bg-primary text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                                         {Math.round((predictions.filter(p => p.matchId === match.id && Number(p.homeScore) > Number(p.awayScore)).length / predictions.filter(p => p.matchId === match.id).length) * 100)}%
                                       </div>
                                     )}
                                   </div>
                                   <span className={`font-black uppercase text-center whitespace-nowrap max-w-full ${((match.homeTeam || "").trim().includes(" ") || (match.homeTeam || "").length > 7) ? "text-[8px] sm:text-[9px]" : "text-[10px]"}`}>{match.homeTeam}</span>
                                   <button 
                                     onClick={() => setSelectedPrediction({ matchId: match.id, home: 1, away: 0 })}
                                     className={`px-3 py-1 rounded-full text-[8px] font-black transition-all ${selectedPrediction?.matchId === match.id && selectedPrediction.home > selectedPrediction.away ? 'bg-primary text-white scale-110 shadow-lg' : (userPred && userPred.homeScore > userPred.awayScore && selectedPrediction?.matchId !== match.id) ? 'bg-primary/50 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-primary/20'}`}
                                   >
                                     توقع الفوز
                                   </button>
                                 </div>
                                 <div className="flex items-center gap-3">
                                   <ScoreSelector 
                                     value={selectedPrediction?.matchId === match.id ? selectedPrediction.home : (userPred ? userPred.homeScore : 0)}
                                     onChange={(val) => setSelectedPrediction({ 
                                       matchId: match.id, 
                                       home: val, 
                                       away: selectedPrediction?.matchId === match.id ? selectedPrediction.away : (userPred ? userPred.awayScore : 0) 
                                     })}
                                     min={0}
                                     max={10}
                                   />
                                   <div className="flex flex-col items-center gap-1 mt-10">
                                     <div className="relative">
                                        <span className="text-slate-300 font-black">VS</span>
                                        {predictions.filter(p => p.matchId === match.id).length > 0 && (
                                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-400 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">
                                            {Math.round((predictions.filter(p => p.matchId === match.id && Number(p.homeScore) === Number(p.awayScore)).length / predictions.filter(p => p.matchId === match.id).length) * 100)}%
                                          </div>
                                        )}
                                     </div>
                                     <button 
                                       onClick={() => setSelectedPrediction({ matchId: match.id, home: 1, away: 1 })}
                                       className={`px-2 py-0.5 rounded-full text-[7px] font-black transition-all ${selectedPrediction?.matchId === match.id && selectedPrediction.home === selectedPrediction.away && selectedPrediction.home > 0 ? 'bg-slate-400 text-white scale-110' : (userPred && userPred.homeScore === userPred.awayScore && selectedPrediction?.matchId !== match.id) ? 'bg-slate-400/50 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                     >
                                       تعادل
                                     </button>
                                   </div>
                                   <ScoreSelector 
                                     value={selectedPrediction?.matchId === match.id ? selectedPrediction.away : (userPred ? userPred.awayScore : 0)}
                                     onChange={(val) => setSelectedPrediction({ 
                                       matchId: match.id, 
                                       home: selectedPrediction?.matchId === match.id ? selectedPrediction.home : (userPred ? userPred.homeScore : 0), 
                                       away: val 
                                     })}
                                     min={0}
                                     max={10}
                                   />
                                 </div>
                                 <div className="flex flex-col items-center gap-2 w-24">
                                   <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 relative group-hover:border-accent/50 transition-colors">
                                     <SafeImage teamName={match.awayTeam} src={match.awayLogo} width={200} className="w-8 h-8 object-contain" alt={match.awayTeam} />
                                     {predictions.filter(p => p.matchId === match.id).length > 0 && (
                                       <div className="absolute -top-2 -left-2 bg-accent text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                                         {Math.round((predictions.filter(p => p.matchId === match.id && Number(p.awayScore) > Number(p.homeScore)).length / predictions.filter(p => p.matchId === match.id).length) * 100)}%
                                       </div>
                                     )}
                                   </div>
                                   <span className={`font-black uppercase text-center whitespace-nowrap max-w-full ${((match.awayTeam || "").trim().includes(" ") || (match.awayTeam || "").length > 7) ? "text-[8px] sm:text-[9px]" : "text-[10px]"}`}>{match.awayTeam}</span>
                                   <button 
                                     onClick={() => setSelectedPrediction({ matchId: match.id, home: 0, away: 1 })}
                                     className={`px-3 py-1 rounded-full text-[8px] font-black transition-all ${selectedPrediction?.matchId === match.id && selectedPrediction.away > selectedPrediction.home ? 'bg-accent text-white scale-110 shadow-lg' : (userPred && userPred.awayScore > userPred.homeScore && selectedPrediction?.matchId !== match.id) ? 'bg-accent/50 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-accent/20'}`}
                                   >
                                     توقع الفوز
                                   </button>
                                 </div>
                               </>
                             )}
                          </div>
                          <button 
                            onClick={handlePredict}
                            disabled={isSubmitting || selectedPrediction?.matchId !== match.id || isPastDeadline}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm shadow-premium flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isSubmitting && selectedPrediction?.matchId === match.id ? 'جاري الحفظ...' : isPastDeadline ? 'انتهت مهلة التوقع' : userPred ? 'تحديث التوقع' : 'تثبيت التوقع'}
                            <Target size={16} />
                          </button>

                          {/* Prediction Stats */}
                          {(() => {
                            const matchPredicts = predictions.filter(p => p.matchId === match.id);
                            if (matchPredicts.length === 0) return null;

                            const homeWins = matchPredicts.filter(p => Number(p.homeScore) > Number(p.awayScore)).length;
                            const draws = matchPredicts.filter(p => Number(p.homeScore) === Number(p.awayScore)).length;
                            const awayWins = matchPredicts.filter(p => Number(p.awayScore) > Number(p.homeScore)).length;
                            const total = matchPredicts.length;

                            const homePct = Math.round((homeWins / total) * 100);
                            const drawPct = Math.round((draws / total) * 100);
                            const awayPct = Math.round((awayWins / total) * 100);

                            return (
                              <div className="w-full space-y-3 mt-4">
                                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                  <span>توقعات المجتمع</span>
                                  <span>{total} توقع</span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${homePct}%` }}
                                    className="h-full bg-primary relative group flex items-center justify-center"
                                  >
                                    {homePct > 15 && <span className="text-[7px] text-white font-black">{homePct}%</span>}
                                  </motion.div>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${drawPct}%` }}
                                    className="h-full bg-slate-400 relative group flex items-center justify-center"
                                  >
                                    {drawPct > 15 && <span className="text-[7px] text-white font-black">{drawPct}%</span>}
                                  </motion.div>
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${awayPct}%` }}
                                    className="h-full bg-accent relative group flex items-center justify-center"
                                  >
                                    {awayPct > 15 && <span className="text-[7px] text-white font-black">{awayPct}%</span>}
                                  </motion.div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[8px] font-black px-1">
                                  <div className="flex flex-col items-center gap-1 p-1 rounded-lg bg-primary/5">
                                    <span className="text-primary uppercase">فوز {match.homeTeam}</span>
                                    <span className="text-slate-900 dark:text-white text-[10px]">{homeWins} مشجع ({homePct}%)</span>
                                  </div>
                                  {match.sport !== 'basketball' && (
                                    <div className="flex flex-col items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                                      <span className="text-slate-400 uppercase tracking-tighter">تعادل</span>
                                      <span className="text-slate-900 dark:text-white text-[10px]">{draws} مشجع ({drawPct}%)</span>
                                    </div>
                                  )}
                                  <div className="flex flex-col items-center gap-1 p-1 rounded-lg bg-accent/5">
                                    <span className="text-accent uppercase">فوز {match.awayTeam}</span>
                                    <span className="text-slate-900 dark:text-white text-[10px]">{awayWins} مشجع ({awayPct}%)</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                );
              })()}

              {/* Predictions List */}              {/* Predictions List - Leaderboard Style */}
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                      <Trophy size={18} className="text-primary" />
                      ترتيب المتوقعين
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">الجمهور وترتيبهم حسب النقاط (٣ للنتيجة - ١ للفائز)</p>
                  </div>
                  <div className="bg-primary/10 dark:bg-primary/20 px-3 py-1.5 rounded-xl flex items-center gap-2 text-primary">
                    <Users size={16} />
                    <span className="text-[10px] font-black">{predictions.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {predictions.length > 0 ? (
                    (() => {
                      // Calculate total points per user
                      const userPointsMap: Record<string, { userId: string; userName: string; userAvatar?: string; totalPoints: number; correctScores: number; totalPredictions: number }> = {};
                      
                      predictions.forEach(pred => {
                        const match = matches.find(m => m.id === pred.matchId);
                        let points = 0;
                        let isCorrectScore = false;
                        
                        if (match && match.status === 'finished') {
                          isCorrectScore = Number(match.homeScore) === Number(pred.homeScore) && Number(match.awayScore) === Number(pred.awayScore);
                          const actualOutcome = Number(match.homeScore) > Number(match.awayScore) ? 'home' : Number(match.homeScore) < Number(match.awayScore) ? 'away' : 'draw';
                          const predictedOutcome = Number(pred.homeScore) > Number(pred.awayScore) ? 'home' : Number(pred.homeScore) < Number(pred.awayScore) ? 'away' : 'draw';
                          
                          if (isCorrectScore) points = 3;
                          else if (actualOutcome === predictedOutcome) points = 1;
                        }

                        if (!userPointsMap[pred.userId]) {
                          userPointsMap[pred.userId] = { 
                            userId: pred.userId, 
                            userName: pred.userName, 
                            userAvatar: pred.userAvatar,
                            totalPoints: 0, 
                            correctScores: 0,
                            totalPredictions: 0 
                          };
                        }
                        
                        userPointsMap[pred.userId].totalPoints += points;
                        if (isCorrectScore) userPointsMap[pred.userId].correctScores += 1;
                        userPointsMap[pred.userId].totalPredictions += 1;
                      });

                      const leaderboard = Object.values(userPointsMap)
                        .sort((a, b) => b.totalPoints - a.totalPoints || b.correctScores - a.correctScores || b.totalPredictions - a.totalPredictions);

                      return leaderboard.slice(0, 10).map((user, idx) => (
                        <motion.div 
                          key={user.userId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`relative p-4 rounded-[28px] overflow-hidden border transition-all ${idx === 0 ? 'border-primary/30 bg-primary/5' : 'border-slate-100 dark:border-border-dark bg-white dark:bg-card-dark'}`}
                        >
                          <div className={`absolute top-0 right-0 w-12 h-10 flex flex-col items-center justify-center rounded-bl-2xl shadow-sm ${idx === 0 ? 'bg-primary text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-accent text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <span className="text-[10px] font-black">#{idx + 1}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={getOptimizedImage(user.userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName)}&background=random`} className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm" alt="user" />
                              {idx === 0 && (
                                <div className="absolute -top-1 -left-1 text-yellow-500 bg-white dark:bg-slate-800 rounded-full p-0.5">
                                  <Trophy size={14} fill="currentColor" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 dark:text-white leading-none">{user.userName}</span>
                                {idx < 3 && <span className="text-[7px] font-black px-1.5 py-0.5 bg-primary/10 text-primary rounded-full uppercase">نخبة</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex flex-col">
                                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">النقاط</span>
                                   <span className="text-xs font-black text-primary">{user.totalPoints}</span>
                                </div>
                                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                <div className="flex flex-col">
                                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">أصاب الهدف</span>
                                   <span className="text-xs font-black text-slate-800 dark:text-white">{user.correctScores}</span>
                                </div>
                                <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                <div className="flex flex-col">
                                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">التوقعات</span>
                                   <span className="text-xs font-black text-slate-800 dark:text-white">{user.totalPredictions}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ));
                    })()
                  ) : (
                    <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-surface-dark rounded-[40px] border-2 border-dashed border-slate-200 dark:border-border-dark">
                       <Target size={48} className="mx-auto mb-4 text-slate-300 opacity-20" />
                       <p className="font-black text-sm text-slate-400">لا توجد توقعات حالياً</p>
                    </div>
                  )}
                </div>

                {/* Individual Predictions Feed (Scrollable) */}
                <div className="mt-4 px-2">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">آخر التوقعات المسجلة</h4>
                   <div className="space-y-3">
                      {predictions.length > 0 ? (
                        [...predictions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((pred) => {
                          const match = matches.find(m => m.id === pred.matchId);
                          if (!match) return null;
                          return (
                            <div key={pred.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-surface-dark/30 border border-slate-100 dark:border-white/5">
                              <div className="flex items-center gap-3">
                                <img src={getOptimizedImage(pred.userAvatar, 80) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pred.userName)}&background=random`} className="w-8 h-8 rounded-xl object-cover" alt="user" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{pred.userName}</span>
                                  <span className="text-[8px] font-bold text-slate-400">
                                    {match.homeTeam} {match.sport === 'basketball' ? (pred.homeScore > pred.awayScore ? 'فوز' : 'خسارة') : `${pred.homeScore}-${pred.awayScore}`} {match.awayTeam}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black text-slate-300">
                                {pred.createdAt && (typeof pred.createdAt === 'string' ? format(new Date(pred.createdAt), 'HH:mm', { locale: ar }) : 'الآن')}
                              </span>
                            </div>
                          );
                        })
                      ) : null}
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'polls' && (
            <motion.div
              key="polls"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-accent/10 rounded-[28px] flex items-center justify-center text-accent shadow-premium mb-4">
                  <PieChart size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">الاستطلاعات الجماهيرية</h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Voice of the fans</span>
              </div>

              {polls.length > 0 ? polls.map((poll) => {
                const totalVotes = Object.values(poll.votes || {}).reduce((a, b) => a + Number(b), 0);
                const hasVoted = poll.voters?.includes(auth.currentUser?.uid || '') || poll.voterChoices?.[auth.currentUser?.uid || ''] !== undefined;
                const userChoice = poll.voterChoices?.[auth.currentUser?.uid || ''];
                return (
                  <motion.div 
                    key={poll.id} 
                    layout
                    className="glass-card rounded-[32px] p-6 border border-primary/10 shadow-premium"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                          <Users size={18} />
                        </div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-white leading-tight">{poll.question}</h3>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-border-light dark:border-border-dark">
                         <span className="text-[9px] font-black text-primary uppercase">يمكنك تغيير اختيارك دائماً</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {poll.options.map((option, idx) => {
                        const votes = poll.votes?.[idx] || 0;
                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isSelected = userChoice === idx;

                        return (
                          <button
                            key={idx}
                            onClick={() => handleVote(poll.id, idx)}
                            className={`w-full text-right relative group overflow-hidden rounded-2xl border bg-white dark:bg-background-dark p-4 transition-all ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border-light dark:border-border-dark active:scale-[0.98] hover:border-primary/30 shadow-sm'}`}
                          >
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`absolute inset-y-0 right-0 ${
                                isSelected
                                  ? 'bg-gradient-to-l from-amber-500/80 via-amber-600/60 to-yellow-600/40 border-l-2 border-amber-400'
                                  : hasVoted
                                  ? 'bg-gradient-to-l from-amber-600/70 via-amber-700/50 to-yellow-800/30 border-l-2 border-amber-500'
                                  : 'bg-amber-500/15'
                              }`} 
                            />
                            <div className="relative flex justify-between items-center z-10">
                              <span className={`font-bold text-xs ${hasVoted && votes === Math.max(...Object.values(poll.votes || {})) ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>
                                {option}
                              </span>
                              {hasVoted && (
                                <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg shadow-sm">%{percentage}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-border-light/40 dark:border-border-dark/40 flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <span>{totalVotes} Voice Recorded</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> Active</span>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="p-16 glass-card rounded-[40px] border border-dashed border-border-light dark:border-border-dark text-center opacity-40">
                  <PieChart size={64} strokeWidth={1} className="mx-auto mb-4" />
                  <p className="font-black">لا توجد استطلاعات حالياً</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'matchday' && (
            <motion.div
              key="matchday"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="glass-card rounded-[40px] p-8 border border-primary/20 shadow-premium">
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-accent/20 text-accent rounded-full mb-6 border border-accent/20">
                    <Zap size={14} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Match Day Experience</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase leading-none italic tracking-tighter">يوم المباراة</h2>
                </div>

                {nextMatch ? (
                  <div className="stadium-gradient rounded-[36px] p-8 text-white mb-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="flex justify-center items-center gap-6 sm:gap-12 relative z-10">
                      <div className="flex flex-col items-center w-20 sm:w-24">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-3 sm:mb-4 backdrop-blur-md border border-white/20 shadow-premium">
                          <SafeImage teamName={nextMatch.homeTeam} src={nextMatch.homeLogo} width={200} className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-lg" alt={nextMatch.homeTeam} />
                        </div>
                        <span className={`font-black text-center whitespace-nowrap max-w-full uppercase tracking-tight ${((nextMatch.homeTeam || "").trim().includes(" ") || (nextMatch.homeTeam || "").length > 7) ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-[11px]"}`}>{nextMatch.homeTeam}</span>
                      </div>

                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className={`font-black tracking-tighter tabular-nums drop-shadow-glow ${String(nextMatch.homeScore).length > 2 || String(nextMatch.awayScore).length > 2 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}`}>
                          {nextMatch.status === 'upcoming' ? '-- : --' : `${nextMatch.homeScore} - ${nextMatch.awayScore}`}
                        </div>
                        {nextMatch.status === 'live' && (
                          <div className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-red-500 rounded-full shadow-glow-red animate-pulse">
                             <div className="w-1.5 h-1.5 bg-white rounded-full" />
                             <span className="text-[10px] font-black tabular-nums tracking-widest">
                               LIVE {nextMatch.sport === 'basketball' ? `${calculateCurrentMinute(nextMatch)}:00` : `${calculateCurrentMinute(nextMatch)}'`}
                             </span>
                          </div>
                        )}
                        {nextMatch.status === 'upcoming' && (
                           <span className="text-[9px] font-black tracking-[0.3em] opacity-80 uppercase bg-white/10 px-3 py-1 rounded-full">{format(new Date(nextMatch.date), 'HH:mm', { locale: ar })}</span>
                        )}
                      </div>

                      <div className="flex flex-col items-center w-20 sm:w-24">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-3 sm:mb-4 backdrop-blur-md border border-white/20 shadow-premium">
                          <SafeImage teamName={nextMatch.awayTeam} src={nextMatch.awayLogo} width={200} className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-lg" alt={nextMatch.awayTeam} />
                        </div>
                        <span className={`font-black text-center whitespace-nowrap max-w-full uppercase tracking-tight ${((nextMatch.awayTeam || "").trim().includes(" ") || (nextMatch.awayTeam || "").length > 7) ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-[11px]"}`}>{nextMatch.awayTeam}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 bg-slate-50 dark:bg-surface-dark border-2 border-dashed border-border-light dark:border-border-dark rounded-[40px] text-center opacity-40 mb-8">
                     <Target size={48} className="mx-auto mb-4 text-slate-300" />
                     <p className="font-black text-sm uppercase tracking-widest">لا توجد مباريات نشطة اليوم</p>
                  </div>
                )}
                
                {/* Attendance Poll Section */}
                {nextMatch && (
                  <div className="bg-white/40 dark:bg-card-dark/40 border border-border-light dark:border-border-dark rounded-[36px] p-6 mb-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                        <Users size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase leading-none italic">هل ستحضر المباراة؟</h3>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance Poll</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(['yes', 'no', 'maybe'] as const).map((choice) => {
                        const labels = { yes: 'نعم', no: 'لا', maybe: 'ربما' };
                        const icons = { yes: <Check size={14} />, no: <X size={14} />, maybe: <HelpCircle size={14} /> };
                        const colors = { yes: 'bg-primary text-white shadow-primary/20', no: 'bg-red-500 text-white shadow-red-500/20', maybe: 'bg-slate-400 text-white shadow-slate-400/20' };
                        const isSelected = attendancePoll?.voters?.[auth.currentUser?.uid || ''] === choice;
                        const votes = attendancePoll?.votes?.[choice] || 0;
                        const totalVotesCount: any = Object.values(attendancePoll?.votes || {}).reduce((a: any, b: any) => Number(a) + Number(b), 0);
                        const pct = totalVotesCount > 0 ? Math.round((votes / (totalVotesCount as number)) * 100) : 0;

                        return (
                          <button
                            key={choice}
                            onClick={() => handleVoteAttendance(choice)}
                            className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all relative overflow-hidden ${isSelected ? 'border-transparent scale-105 ' + colors[choice] : 'border-border-light dark:border-border-dark hover:border-primary/30'}`}
                          >
                            <span className="relative z-10">{icons[choice]}</span>
                            <span className="text-xs font-black relative z-10 transition-colors">{labels[choice]}</span>
                            <span className="text-[11px] font-black text-amber-300 dark:text-amber-300 tabular-nums relative z-10 tracking-wider drop-shadow-sm px-2 py-0.5 bg-black/20 rounded-lg">%{pct}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="w-full">
                   <button 
                    onClick={() => setShowMomentForm(!showMomentForm)} 
                    className={`w-full p-6 glass-card rounded-[32px] border flex items-center justify-center gap-4 transition-all shadow-premium group ${showMomentForm ? 'bg-accent/10 border-accent/40 ring-2 ring-accent/30' : 'border-accent/20 hover:bg-accent/5'}`}
                   >
                      <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${showMomentForm ? 'bg-accent text-white' : 'bg-accent/10 text-accent'}`}>
                        <Camera size={28} />
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wide block italic mb-0.5">صورتك في الماتش</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">انقر لرفع صورة ومشاركتها مع الجماهير 📸</span>
                      </div>
                   </button>
                </div>
              </div>

              {/* Moment Creation Form */}
              <AnimatePresence>
                {showMomentForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="glass-card rounded-[40px] p-8 border border-accent/40 shadow-2xl relative z-20 overflow-hidden bg-white/80 dark:bg-card-dark/80 backdrop-blur-2xl"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                           <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase italic tracking-tighter flex items-center gap-2">
                             <Camera size={22} className="text-accent" />
                             صورتك في الماتش
                           </h3>
                           <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mt-1">ارفع صورتك من المدرج مع تعليق اختياري</span>
                         </div>
                         <button 
                           onClick={() => setShowMomentForm(false)}
                           className="w-10 h-10 rounded-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                         >
                           <X size={20} />
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image Upload Box - Primary */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                             <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                               <Camera size={13} className="text-accent" /> رفع صورة من قلب الحدث (موصى بها)
                             </span>
                             {momentPost.image && <span className="text-emerald-500 font-bold text-[9px]">تم اختيار الصورة ✓</span>}
                          </label>
                          <div className="h-[160px] relative">
                             <ImageUploader 
                              folderName="matchday_moments"
                              onUploadSuccess={(url) => setMomentPost({ ...momentPost, image: url })}
                              className="h-full bg-slate-50 dark:bg-surface-dark border-2 border-dashed border-accent/20 rounded-[24px] hover:border-accent/40 flex items-center justify-center transition-all overflow-hidden cursor-pointer"
                            />
                            {momentPost.image && (
                              <div className="absolute inset-0 rounded-[24px] overflow-hidden group">
                                <img src={getOptimizedImage(momentPost.image, 250)} className="w-full h-full object-cover" alt="preview" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={() => setMomentPost({...momentPost, image: ''})} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Text Content Box - Optional */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                             <span className="flex items-center gap-2">
                               <MessageSquare size={13} /> كتابة تعليق أو رسالة
                             </span>
                             <span className="text-[10px] font-bold text-amber-500/90 bg-amber-500/10 px-2 py-0.5 rounded-md">اختياري</span>
                          </label>
                          <div className="bg-slate-100/50 dark:bg-black/40 rounded-[24px] border border-border-light dark:border-white/10 focus-within:ring-2 focus-within:ring-accent/20 transition-all shadow-inner p-1">
                            <textarea
                              placeholder="أكتب تعليقك أو هتافك من المدرج (اختياري)..."
                              className="w-full bg-transparent rounded-[24px] p-5 text-[15px] font-bold text-slate-800 dark:text-white focus:outline-none min-h-[160px] resize-none"
                              value={momentPost.content}
                              onChange={(e) => setMomentPost({ ...momentPost, content: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreateMoment}
                        disabled={isPostingMoment || (!momentPost.content.trim() && !momentPost.image)}
                        className="w-full h-16 bg-accent text-white rounded-[24px] font-black text-lg shadow-premium flex items-center justify-center gap-3 hover:bg-black transition-all disabled:opacity-50 group overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        <span className="relative z-10">{isPostingMoment ? 'جاري المشاركة...' : 'نشر صورتك في الماتش الآن 📸'}</span>
                        <Upload size={22} className="relative z-10 group-hover:-translate-y-1 transition-transform" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Match Day Wall (Feed) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white leading-none italic flex items-center gap-2">
                      <Camera size={20} className="text-accent" />
                      صورتك في الماتش
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Match Day Fan Photos</span>
                  </div>
                  <div className="bg-accent/10 px-3 py-1.5 rounded-xl text-accent font-black text-[10px] uppercase">
                    {matchDayMoments.length} {matchDayMoments.length === 1 ? 'صورة' : 'صور'}
                  </div>
                </div>

                <div className="columns-1 sm:columns-2 gap-6 space-y-6">
                  {matchDayMoments.length > 0 ? matchDayMoments.map((moment) => (
                    <motion.div
                      key={moment.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="break-inside-avoid glass-card rounded-[32px] p-5 border border-border-light dark:border-border-dark shadow-premium relative group transition-all hover:border-accent/30"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img src={getOptimizedImage(moment.userAvatar, 80) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${moment.userId}`} className="w-10 h-10 rounded-2xl border border-border-light" alt="user" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none">{moment.userName}</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                              {moment.createdAt ? format(new Date(moment.createdAt.seconds * 1000), 'HH:mm', { locale: ar }) : 'الآن'}
                            </span>
                          </div>
                        </div>
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleLikeMoment(moment.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${moment.likedBy?.includes(auth.currentUser?.uid) ? 'bg-red-500/10 text-red-500 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                        >
                          <Heart size={14} fill={moment.likedBy?.includes(auth.currentUser?.uid) ? 'currentColor' : 'none'} />
                          <span className="text-[10px] font-black">{moment.likes || 0}</span>
                        </motion.button>
                      </div>

                      {moment.content && (
                        <div className="bg-slate-50 dark:bg-surface-dark/50 rounded-2xl p-4 mb-3 border border-border-light/20 dark:border-border-dark/20">
                          <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic whitespace-pre-wrap break-words">
                            "{moment.content}"
                          </p>
                        </div>
                      )}

                      {moment.image && (
                        <div 
                          onClick={() => setLightboxImage(moment.image)}
                          className="rounded-[28px] overflow-hidden border-2 border-white dark:border-border-dark relative group/img shadow-md cursor-zoom-in bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center"
                        >
                          <img 
                            src={getOptimizedImage(moment.image, 1000)} 
                            className="w-full h-auto max-h-[500px] object-contain transition-transform duration-700 group-hover/img:scale-105" 
                            alt="moment" 
                            loading="lazy"
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-4">
                             <div className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                               <Camera size={14} className="text-accent" /> عرض بالحجم الكامل
                             </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )) : (
                    <div className="col-span-full py-20 text-center glass-card rounded-[40px] opacity-40 border-2 border-dashed">
                       <Camera size={48} className="mx-auto mb-4 text-accent" />
                       <p className="font-black text-sm">كن أول من يشارك صورته في الماتش!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={22} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt="fullscreen preview"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
