import { Song, Book, Album, Playlist } from '../store';

export const DEFAULT_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'النشيد الرسمي لزعيم الثغر - نادي الاتحاد السكندري',
    artist: 'جمهور وعشاق أسياد البلد',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=stadium-crowd-cheering-112191.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    duration: '03:45',
    category: 'anthem',
    lyrics: 'يا اتحاد يا سيد البلد... جمهورك معاك في كل مكان... الأخضر عالي فوق الهام',
    createdAt: new Date().toISOString()
  },
  {
    id: 'song-2',
    title: 'شط إسكندرية والقلب أخضر',
    artist: 'ألتراس جرين ماجيك',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=crowd-cheering-6287.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    duration: '02:50',
    category: 'chant',
    lyrics: 'شط إسكندرية يا شط الأمل... الأخضر في القلب ومفيش منه بديل',
    createdAt: new Date().toISOString()
  },
  {
    id: 'song-3',
    title: 'أنا إسكندراني اتحادي أصيل',
    artist: 'كورال الثغر',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a8c1f0.mp3?filename=stadium-cheer-20150.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&auto=format&fit=crop&q=80',
    duration: '04:10',
    category: 'song',
    lyrics: 'أنا إسكندراني اتحادي... من الشاطبي للأنبياء ولائي للنادي الأخضر',
    createdAt: new Date().toISOString()
  },
  {
    id: 'song-4',
    title: 'يا أخضر يا سيد البلد',
    artist: 'جمهور الاتحاد السكندري',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=stadium-crowd-cheering-112191.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    duration: '03:15',
    category: 'chant',
    lyrics: 'يا أخضر يا غالي... في الشاطبي نرفع رايتنا',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_BOOKS: Book[] = [
  {
    id: 'book-1',
    title: 'مئوية زعيم الثغر (1914 - 2014)',
    author: 'د. حسن رجب - مؤرخ الاتحاد',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    desc: 'التوثيق الشامل والرسمي لتاريخ نادي الاتحاد السكندري منذ التأسيس عام 1914، وبطولات الكأس والدوري ومآثر الرواد.',
    category: 'تاريخ وتوثيق'
  },
  {
    id: 'book-2',
    title: 'أساطير الكرة في الثغر - من شيل المتر إلى الجارم وشحتة',
    author: 'الكابتن أحمد شيرين',
    coverUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    desc: 'سير ذاتية لأعظم اللاعبين الذين ارتدوا القميص الأخضر وصنعوا تاريخ الاتحاد السكندري عبر الأجيال.',
    category: 'سير ومذكرات'
  },
  {
    id: 'book-3',
    title: 'ملحمة كرة السلة - ملوك اللعبة في مصر وإفريقيا',
    author: 'المركز الإعلامي لنادي الاتحاد',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    desc: 'كتاب خاص برحلة نادي الاتحاد السكندري في سيادته التاريخية للعبة كرة السلة المصرية والعربية.',
    category: 'رياضة وتوثيق'
  },
  {
    id: 'book-4',
    title: 'مجلة نادي الاتحاد السكندري - العدد التذكاري',
    author: 'لجنة التوثيق والإعلام',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&auto=format&fit=crop&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    desc: 'العدد التذكاري بمناسبة مئوية النادي وإنجازاته في مختلف اللعبات الرياضية.',
    category: 'مجلات ووثائق'
  }
];

export const DEFAULT_ALBUMS: Album[] = [
  {
    id: 'album-1',
    title: 'أهازيج زعيم الثغر الخالدة',
    artist: 'جمهور وعشاق أسياد البلد',
    year: '2024',
    coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80',
    songIds: ['song-1', 'song-2', 'song-3', 'song-4']
  }
];

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-1',
    title: 'هتافات وأناشيد المدرج الأخضر',
    coverUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    songIds: ['song-1', 'song-2', 'song-4']
  }
];
