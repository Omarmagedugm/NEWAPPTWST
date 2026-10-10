import { MediaItem, MediaPlaylist } from '../store';

export const DEFAULT_MEDIA_PLAYLISTS: MediaPlaylist[] = [
  {
    id: 'pl_matches',
    title: 'ألبوم مباريات الفريق الأول',
    description: 'تغطيات مصورة حصرية لكافة مباريات زعيم الثغر في الدوري والكأس',
    coverUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1000&auto=format&fit=crop',
    type: 'photo',
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'pl_basket',
    title: 'ملوك كرة السلة والبطولات',
    description: 'صور تتويج عمالقة الشاطبي ببطولات دوري السوبر والبطولة العربية',
    coverUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1000&auto=format&fit=crop',
    type: 'photo',
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'pl_fans',
    title: 'جماهير سيد البلد والتيفو الأخضر',
    description: 'أجمل لقطات الحضور الجماهيري وهتافات المدرجات الخضراء',
    coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop',
    type: 'photo',
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'pl_history',
    title: 'أرشيف الصور التاريخية والنوادر',
    description: 'صور نادرة لرموز وأساطير النادي واستاد الشاطبي القديم',
    coverUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000&auto=format&fit=crop',
    type: 'photo',
    createdAt: new Date('2024-01-01').toISOString()
  },
  {
    id: 'pl_videos_highlights',
    title: 'ملخصات وأهداف المباريات',
    description: 'أجمل أهداف ومهارات لاعبي الاتحاد السكندري',
    coverUrl: 'https://images.unsplash.com/photo-1510563399035-7140409890a5?q=80&w=1000&auto=format&fit=crop',
    type: 'video',
    createdAt: new Date('2024-01-01').toISOString()
  }
];

export const DEFAULT_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'media_photo_1',
    title: 'احتفال جنوني لجماهير الاتحاد السكندري في مدرجات استاد الإسكندرية 💚',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_fans',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    views: 0,
    likes: [],
    isFeatured: true
  },
  {
    id: 'media_photo_2',
    title: 'تتويج عمالقة سلة الاتحاد السكندري بلقب دوري السوبر المصري 🏀🏆',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_basket',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    views: 0,
    likes: [],
    isFeatured: true
  },
  {
    id: 'media_photo_3',
    title: 'فرحة لاعبي الفريق الأول لكرة القدم بعد تسجيل هدف الفوز الحاسم ⚽✨',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_matches',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_4',
    title: 'مران الفريق الصباحي وتدريبات اللياقة البدنية في قلعة الشاطبي',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_matches',
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_5',
    title: 'تيفو تاريخي وشعلات خضراء تضيء سماء استاد برج العرب الدولي',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_fans',
    date: new Date(Date.now() - 9 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_6',
    title: 'لقطة نادرة لملعب الشاطبي التاريخي معقل زعيم الثغر منذ 1914',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_history',
    date: new Date(Date.now() - 12 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_7',
    title: 'كواليس استعدادات حراس المرمى وتألقهم قبل المواجهة المرتقبة',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_matches',
    date: new Date(Date.now() - 15 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_8',
    title: 'رموز وأساطير النادي في حفل تكريم أبطال الكأس الذهبية',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_history',
    date: new Date(Date.now() - 18 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_9',
    title: 'حماس وشغف براعم وأكاديميات كرة القدم بنادي الاتحاد السكندري',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1517649763962-0c6232662000?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c6232662000?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_matches',
    date: new Date(Date.now() - 20 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  {
    id: 'media_photo_10',
    title: 'مسيرة مشجعي سيد البلد تهز شوارع الإسكندرية قبل اللقاء الكبير',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
    playlistId: 'pl_fans',
    date: new Date(Date.now() - 22 * 86400000).toISOString(),
    views: 0,
    likes: []
  },
  // Videos
  {
    id: 'media_video_1',
    title: 'أجمل أهداف فريق الاتحاد السكندري ولمسات سحرية هذا الموسم ⚽🎥',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510563399035-7140409890a5?q=80&w=1000&auto=format&fit=crop',
    playlistId: 'pl_videos_highlights',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    duration: '06:45',
    views: 0,
    isFeatured: true
  },
  {
    id: 'media_video_2',
    title: 'ملخص نهائي دوري السوبر لكرة السلة واحتفالات اللقب الغالي 🏀🔥',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1000&auto=format&fit=crop',
    playlistId: 'pl_videos_highlights',
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    duration: '12:30',
    views: 0
  }
];
