export interface PublicService {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconType?: 'lucide' | 'material' | 'emoji';
  image?: string;
  status: 'active' | 'under_construction' | 'hidden';
  badge?: string;
  badgeColor?: string;
  targetType: 'education' | 'internal' | 'link' | 'modal';
  targetUrl?: string;
  order: number;
  features?: string[];
  contactInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EducationVideo {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnailUrl: string;
  category: string;
  instructor?: string;
  duration?: string;
  isFeatured?: boolean;
  views?: number;
  likes?: number;
  order?: number;
  createdAt: string;
}

export const defaultPublicServices: PublicService[] = [
  {
    id: 'service-education',
    title: 'التعليم المجاني',
    description: 'دورات وكورسات مجانية ومحتوى تعليمي تفاعلي مفيد لجمهور الاتحاد السكندري لرفع المهارات الرقمية والمهنية 💚',
    icon: 'GraduationCap',
    iconType: 'lucide',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    badge: 'متاح الآن',
    badgeColor: '#10b981',
    targetType: 'education',
    targetUrl: '/services/education',
    order: 1,
    features: ['فيديوهات يوتيوب مختارة', 'تصنيفات متعددة', 'شروحات مجانية 100%'],
  },
  {
    id: 'service-jobs',
    title: 'فرص العمل والتوظيف',
    description: 'ملتقى توظيف وفرص عمل وتدريب لشباب الإسكندرية وجمهور زعيم الثغر بالتعاون مع كبرى الشركات والمؤسسات.',
    icon: 'Briefcase',
    iconType: 'lucide',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    badge: 'متاح الآن',
    badgeColor: '#10b981',
    targetType: 'modal',
    order: 2,
    features: ['وظائف لشباب الإسكندرية', 'فرص تدريب مهني', 'تواصل مباشر'],
    contactInfo: 'jobs@ittihad-services.club'
  },
  {
    id: 'service-scholarships',
    title: 'المنح والكورسات المعتمدة',
    description: 'دليل شامل لأحدث المنح الدراسية والشهادات التدريبية المجانية والمدعومة المقدمة لطلاب وخريجي زعيم الثغر.',
    icon: 'Award',
    iconType: 'lucide',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    badge: 'متاح الآن',
    badgeColor: '#10b981',
    targetType: 'modal',
    order: 3,
    features: ['منح جامعية ودولية', 'شهادات معتمدة', 'تأهيل للمقابلات'],
  },
  {
    id: 'service-library',
    title: 'المكتبة والمعرفة',
    description: 'كتب ومراجع رقمية، ملخصات ثقافية، ومصادر معرفية مفتوحة لتغذية الفكر والتطوير المستمر لجمهورنا العظيم.',
    icon: 'BookOpen',
    iconType: 'lucide',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    badge: 'متاح الآن',
    badgeColor: '#10b981',
    targetType: 'internal',
    targetUrl: '/library',
    order: 4,
    features: ['كتب إلكترونية', 'مجلات نادي الاتحاد', 'أبحاث ومقالات'],
  },
  {
    id: 'service-talents',
    title: 'اكتشاف المواهب وتطويرها',
    description: 'برنامج مخصص لاكتشاف ورعاية المواهب الشابة في مختلف المجالات الرياضية، الفنية، والتقنية وإبراز إبداعاتهم.',
    icon: 'Sparkles',
    iconType: 'lucide',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    status: 'under_construction',
    badge: 'قيد التجهيز',
    badgeColor: '#f59e0b',
    targetType: 'modal',
    order: 5,
    features: ['مسابقات إبداعية', 'دعم المواهب السكندرية', 'تسليط الضوء الإعلامي'],
  },
  {
    id: 'service-skills',
    title: 'المهارات والتدريب العملي',
    description: 'ورش عمل دورية في تطوير الذات، اللغات الأجنبية، البرمجة والذكاء الاصطناعي، وريادة الأعمال الإلكترونية.',
    icon: 'Lightbulb',
    iconType: 'lucide',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
    status: 'active',
    badge: 'متاح الآن',
    badgeColor: '#10b981',
    targetType: 'modal',
    order: 6,
    features: ['ورش عمل تفاعلية', 'تطوير الذات', 'مهارات سوق العمل'],
  }
];

export const defaultEducationCategories = [
  'الكل',
  'برمجة وتكنولوجيا',
  'لغات وترجمة',
  'ريادة أعمال وتجارة إلكترونية',
  'تسويق رقمي',
  'تصميم وجرافيك',
  'مهارات شخصية وتطوير ذات',
  'ثقافة عامة ورياضة'
];

export const defaultEducationVideos: EducationVideo[] = [
  {
    id: 'edu-vid-1',
    title: 'كورس البرمجة للمبتدئين من الصفر - كيف تبدأ رحلتك في عالم التقنية',
    description: 'شرح مبسط لمفاهيم البرمجة الأساسية وكيف تختار مجالك المناسب في سوق العمل الرقمي والبدء في تعلم لغات البرمجة الحديثة.',
    youtubeUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
    youtubeId: 'kqtD5dpn9C8',
    thumbnailUrl: 'https://img.youtube.com/vi/kqtD5dpn9C8/hqdefault.jpg',
    category: 'برمجة وتكنولوجيا',
    instructor: 'أكاديمية البرمجة',
    duration: '24:15',
    isFeatured: true,
    views: 1420,
    likes: 185,
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'edu-vid-2',
    title: 'أسرار إتقان اللغة الإنجليزية والتحدث بطلاقة - خطة عملية وسهلة',
    description: 'أفضل الطرق والتمارين اليومية لتطوير الاستماع والمحادثة باللغة الإنجليزية بدون تعقيد وبأدوات مجانية بالكامل.',
    youtubeUrl: 'https://www.youtube.com/watch?v=V74l_nS1T9A',
    youtubeId: 'V74l_nS1T9A',
    thumbnailUrl: 'https://img.youtube.com/vi/V74l_nS1T9A/hqdefault.jpg',
    category: 'لغات وترجمة',
    instructor: 'English Club',
    duration: '18:40',
    isFeatured: true,
    views: 980,
    likes: 142,
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'edu-vid-3',
    title: 'دليل العمل الحر (Freelancing) - كيف تبدأ وتحقق دخلاً من مهاراتك',
    description: 'خطوات عملية لدخول منصات الفريلانس العالمية والمحلية، كتابة العروض الاحترافية، وبناء معرض أعمال يجذب العملاء.',
    youtubeUrl: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
    youtubeId: 'SqcY0GlETPk',
    thumbnailUrl: 'https://img.youtube.com/vi/SqcY0GlETPk/hqdefault.jpg',
    category: 'ريادة أعمال وتجارة إلكترونية',
    instructor: 'رواد الأعمال',
    duration: '32:10',
    isFeatured: false,
    views: 750,
    likes: 98,
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'edu-vid-4',
    title: 'أساسيات التسويق الرقمي وإعلانات السوشيال ميديا 2025',
    description: 'تعلم كيف تبني استراتيجية تسويقية لمشروعك، استهداف الجماهير بدقة، وإدارة الحملات الإعلانية على فيسبوك وإنستغرام.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    category: 'تسويق رقمي',
    instructor: 'التسويق الرقمي الحديث',
    duration: '21:05',
    isFeatured: false,
    views: 630,
    likes: 87,
    order: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'edu-vid-5',
    title: 'مبادئ التصميم الجرافيكي واستخدام أدوات التصميم الحديثة مجاناً',
    description: 'تعرف على نظريات الألوان، الخطوط، وتنسيق العناصر البصرية لإنشاء تصميمات سوشيال ميديا جذابة ومبتكرة.',
    youtubeUrl: 'https://www.youtube.com/watch?v=YfO28Ihehbk',
    youtubeId: 'YfO28Ihehbk',
    thumbnailUrl: 'https://img.youtube.com/vi/YfO28Ihehbk/hqdefault.jpg',
    category: 'تصميم وجرافيك',
    instructor: 'تصميم وإبداع',
    duration: '16:50',
    isFeatured: false,
    views: 540,
    likes: 76,
    order: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'edu-vid-6',
    title: 'إدارة الوقت والإنتاجية العالية - كيف ترتب أولوياتك اليومية',
    description: 'أساليب واستراتيجيات عملية مجربة لمضاعفة إنتاجيتك والتخلص من التسويف وتنظيم وقت العمل والدراسة.',
    youtubeUrl: 'https://www.youtube.com/watch?v=iONDebHX9qk',
    youtubeId: 'iONDebHX9qk',
    thumbnailUrl: 'https://img.youtube.com/vi/iONDebHX9qk/hqdefault.jpg',
    category: 'مهارات شخصية وتطوير ذات',
    instructor: 'تطوير الذات',
    duration: '14:20',
    isFeatured: false,
    views: 810,
    likes: 110,
    order: 6,
    createdAt: new Date().toISOString(),
  }
];
