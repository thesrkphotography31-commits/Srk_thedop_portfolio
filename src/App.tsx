import React, { useState, useEffect, useMemo } from 'react';
import { InteractiveClientMarquee, ClientBrand } from './components/InteractiveClientMarquee';
import { PhotoCatalog } from './components/PhotoCatalog';
import { VideoCatalog } from './components/VideoCatalog';
import { 
  Play, 
  Film, 
  Camera, 
  Video,
  Image,
  Mail, 
  Phone, 
  Linkedin, 
  Instagram,
  MapPin, 
  ArrowUpRight, 
  ArrowRight,
  X, 
  Check, 
  Copy, 
  ChevronRight, 
  Maximize2, 
  Sparkles,
  ExternalLink,
  ChevronDown,
  Upload,
  RotateCcw
} from 'lucide-react';
import {
  saveProfilePhotoToStorage,
  loadProfilePhotoFromStorage,
  clearProfilePhotoFromStorage,
  processAndOptimizeImage,
  syncAllToCodebase,
  sanitizePhotos
} from './utils/photoStorage';
import defaultPortfolioContent from './data/portfolioContent.json';

export interface VideoProject {
  id: string;
  title: string;
  highlight?: string;
  tag: string;
  year?: string;
  category: 'tvc' | 'brand' | 'corporate' | 'event' | 'product';
  youtubeId?: string;
  youtubeUrl?: string;
  videoUrl?: string; // Canonical source of truth for external video playback/access
  videoSrc?: string; // Direct HTML5 video source URL / uploaded video file
  aspect: '16/9' | '21/8' | '4/3';
  description?: string;
  role: string;
  client: string;
  thumbnailPlaceholderColor?: string;
  thumbnail?: string;
  imageUrl?: string;
  allowsEmbed?: boolean;
}

const VIDEO_PROJECTS: VideoProject[] = [
  {
    id: 'aashirvaad',
    title: 'Aashirvaad',
    highlight: '',
    tag: 'Ad Film · Director of Photography',
    year: '2024',
    category: 'tvc',
    youtubeId: 'iWlh9rMgmPA',
    videoUrl: 'https://www.youtube.com/watch?v=iWlh9rMgmPA',
    aspect: '16/9',
    role: 'Director of Photography',
    client: 'Aashirvaad',
    description: 'Commercial ad film capturing warm culinary artistry, wholesome family moments, and cinematic tabletop lighting.',
    allowsEmbed: true
  },
  {
    id: 'gametheory',
    title: 'Game Theory',
    highlight: '',
    tag: 'Ad Film · Director of Photography',
    year: '2024',
    category: 'tvc',
    youtubeId: 'B4lshIGcCdA',
    videoUrl: 'https://www.youtube.com/watch?v=B4lshIGcCdA',
    aspect: '16/9',
    role: 'Director of Photography',
    client: 'Game Theory',
    description: 'High-energy commercial TVC shot with fast motion tracking, dynamic lighting shifts, and high frame-rate action sequences.',
    allowsEmbed: false
  },
  {
    id: 'godrej-cinthol',
    title: 'Godrej Cinthol',
    highlight: '',
    tag: 'Ad Film · Director of Photography',
    year: '2024',
    category: 'tvc',
    youtubeId: 'wk84fENEzQ8',
    videoUrl: 'https://www.youtube.com/watch?v=wk84fENEzQ8',
    aspect: '21/8',
    role: 'Director of Photography',
    client: 'Godrej Cinthol',
    description: 'Cinematic wide-aspect film capturing raw freshness, natural elements, and authentic performance lighting.',
    allowsEmbed: false
  },
  {
    id: 'que-sunglasses',
    title: 'QUE Sunglasses',
    highlight: 'Film',
    tag: 'Brand Film · Director of Photography',
    year: '2023',
    category: 'brand',
    youtubeId: '3mAWoks5UmE',
    videoUrl: 'https://www.youtube.com/watch?v=3mAWoks5UmE',
    aspect: '21/8',
    role: 'Director of Photography',
    client: 'QUE Sunglasses',
    description: 'Stylized anamorphic brand commercial exploring golden-hour optics, urban textures, and contemporary fashion.',
    allowsEmbed: false
  },
  {
    id: 'google-io-connect',
    title: 'Google I/O Connect',
    highlight: 'Event Aftermovie',
    tag: 'Event Aftermovie · Cinematographer / DOP',
    year: '2024',
    category: 'event',
    youtubeId: 'NgmeuPV99EU',
    videoUrl: 'https://www.youtube.com/watch?v=NgmeuPV99EU',
    aspect: '16/9',
    role: 'Cinematographer / DOP',
    client: 'Google',
    description: 'High-energy event recap and aftermovie capturing developer community, keynote stages, interactive tech showcases, and the electric atmosphere at Google I/O Connect Bengaluru.',
    allowsEmbed: false
  },
  {
    id: 'landmark-corporate',
    title: 'Landmark',
    highlight: 'Corporate Brand Film',
    tag: 'Corporate Brand Film · Director of Photography',
    year: '2024',
    category: 'corporate',
    youtubeId: 'fHtX3c6nSoU',
    videoUrl: 'https://www.youtube.com/watch?v=fHtX3c6nSoU',
    aspect: '21/8',
    role: 'Director of Photography',
    client: 'Landmark Group',
    description: 'Expansive multi-location brand film showcasing architectural spaces, team spirit, and brand heritage.',
    allowsEmbed: false
  },
  {
    id: 'salesforce-event',
    title: 'Salesforce',
    highlight: 'Event Coverage',
    tag: 'Event Coverage · Cinematographer',
    year: '2025',
    category: 'event',
    youtubeId: 'qMB7bFLIwUA',
    videoUrl: 'https://www.youtube.com/watch?v=qMB7bFLIwUA',
    aspect: '16/9',
    role: 'Cinematographer / DOP',
    client: 'Salesforce',
    description: 'Cinematic multi-camera event coverage capturing stage keynotes, dynamic attendees, and immersive arena energy.',
    allowsEmbed: true
  },
  {
    id: 'hdfc-ergo',
    title: 'HDFC ERGO',
    highlight: 'Testimonial',
    tag: 'Testimonial Film · Main Director of Photography',
    year: '2024',
    category: 'brand',
    youtubeId: 'n6ovVkJtR5o',
    videoUrl: 'https://www.youtube.com/watch?v=n6ovVkJtR5o',
    aspect: '16/9',
    role: 'Main Director of Photography',
    client: 'HDFC ERGO',
    description: 'Testimonial film crafted for HDFC ERGO featuring evocative portraiture, natural key lighting, and authentic brand storytelling.',
    allowsEmbed: false
  },
  {
    id: 'digiyatra-podcast',
    title: 'Digi Yatra',
    highlight: 'Airport Podcast',
    tag: 'Podcast & Interview · Cinematographer / DOP',
    year: '2024',
    category: 'corporate',
    youtubeId: 'C_KjUcNlxkI',
    videoUrl: 'https://www.youtube.com/watch?v=C_KjUcNlxkI',
    aspect: '16/9',
    role: 'Cinematographer / DOP',
    client: 'Digi Yatra',
    description: 'Special airport edition podcast captured inside the terminal featuring multi-camera dialogue setup, natural ambient acoustics, and high-fidelity cinematic lighting.',
    allowsEmbed: true
  },
  {
    id: 'virdas-tour',
    title: 'Vir Das',
    highlight: 'Mindfool Tour',
    tag: 'Event Coverage · Cinematographer',
    year: '2024',
    category: 'event',
    youtubeId: 'eLAbF6DWp8A',
    videoUrl: 'https://www.youtube.com/watch?v=eLAbF6DWp8A',
    thumbnail: '/Vir-8.JPEG',
    aspect: '16/9',
    role: 'Cinematographer',
    client: 'Vir Das',
    description: 'Multi-camera live concert and arena tour film capturing timing, crowd energy, and intimate stage moments.',
    allowsEmbed: true
  },
  {
    id: 'prestige-cookware',
    title: 'Prestige',
    highlight: 'Cookware',
    tag: 'Product Ad · Director of Photography',
    year: '2024',
    category: 'product',
    youtubeId: '10mYkHbF7QM',
    videoUrl: 'https://www.youtube.com/watch?v=10mYkHbF7QM',
    aspect: '4/3',
    role: 'Director of Photography',
    client: 'Prestige',
    description: 'Macro cinematography, high-speed steam captures, and precision tabletop lighting highlighting premium craft.',
    allowsEmbed: false
  },
  {
    id: 'fixderma-product',
    title: 'Fixderma',
    highlight: 'Product Film',
    tag: 'Product Film · Director of Photography',
    year: '2024',
    category: 'product',
    youtubeId: 'cLIFHGwiMxs',
    videoUrl: 'https://www.youtube.com/watch?v=cLIFHGwiMxs',
    aspect: '4/3',
    role: 'Director of Photography',
    client: 'Fixderma Skincare',
    description: 'Clean skincare aesthetic with soft diffusion, specular water reflections, and skin tone fidelity.',
    allowsEmbed: false
  },
  {
    id: 'xiaomi-event',
    title: 'Xiaomi',
    highlight: 'Event BTS',
    tag: 'Event Coverage · BTS',
    year: '2023',
    category: 'event',
    youtubeId: '_BfXEl9iBTs',
    videoUrl: 'https://www.youtube.com/watch?v=_BfXEl9iBTs',
    aspect: '4/3',
    role: 'Lead Cinematographer',
    client: 'Xiaomi India',
    description: 'Fast-paced documentary style BTS and launch stage highlights with vibrant ambient arena lighting.',
    allowsEmbed: false
  },
  {
    id: 'hyundai-ioniq-hi-tea',
    title: 'Hyundai Ioniq Hi-tea',
    highlight: '',
    tag: 'Brand Experience · Cinematographer',
    year: '2024',
    category: 'brand',
    youtubeId: 'PKHYOfKeQH8',
    videoUrl: 'https://www.youtube.com/watch?v=PKHYOfKeQH8',
    aspect: '16/9',
    role: 'Cinematographer',
    client: 'Hyundai',
    description: 'Exclusive experiential showcase film for the Hyundai Ioniq, capturing refined automotive design, VIP guest interactions, and premium atmosphere.',
    allowsEmbed: false
  },
  {
    id: 'featured-film-z0qm',
    title: 'Featured Film',
    highlight: '',
    tag: 'Commercial & Narrative · Cinematographer / DOP',
    year: '2025',
    category: 'brand',
    youtubeId: 'Z0qMvkytexc',
    videoUrl: 'https://www.youtube.com/watch?v=Z0qMvkytexc',
    aspect: '16/9',
    role: 'Cinematographer / DOP',
    client: 'Featured Showcase',
    description: 'Cinematic visual showcase captured by Sriram Karthick featuring dynamic camera movement, high-fidelity lighting, and evocative visual rhythm.',
    allowsEmbed: true
  }
];

const CLIENT_BRANDS: ClientBrand[] = [
  {
    name: 'IBM',
    src: '/assets/logos/ibm.svg',
    fallbackSrc: '/assets/logos/ibm.webp',
    alt: 'IBM',
    url: 'https://www.ibm.com',
    title: 'IBM',
    className: 'h-[30px] sm:h-[36px] md:h-[40px]'
  },
  {
    name: 'Google',
    src: '/assets/logos/google.svg',
    fallbackSrc: '/assets/logos/Google.webp',
    alt: 'Google',
    url: 'https://about.google',
    title: 'Google',
    className: 'h-[28px] sm:h-[34px] md:h-[38px]'
  },
  {
    name: 'Krafton',
    src: '/assets/logos/krafton.svg',
    fallbackSrc: '/assets/logos/krafton.webp',
    alt: 'Krafton',
    url: 'https://www.krafton.com',
    title: 'Krafton',
    className: 'h-[26px] sm:h-[32px] md:h-[36px]'
  },
  {
    name: 'Cult.fit',
    src: '/assets/logos/cultfit.svg',
    alt: 'Cult.fit',
    url: 'https://www.cult.fit',
    title: 'Cult.fit',
    className: 'h-[28px] sm:h-[34px] md:h-[40px]'
  },
  {
    name: 'LinkedIn',
    src: '/assets/logos/linkedin.svg',
    alt: 'LinkedIn',
    url: 'https://www.linkedin.com',
    title: 'LinkedIn',
    className: 'h-[24px] sm:h-[28px] md:h-[32px]'
  },
  {
    name: 'Meta',
    src: '/assets/logos/meta.svg',
    fallbackSrc: '/assets/logos/Meta.webp',
    alt: 'Meta',
    url: 'https://about.meta.com',
    title: 'Meta',
    className: 'h-[22px] sm:h-[26px] md:h-[30px]'
  },
  {
    name: 'Coca-Cola',
    src: '/assets/logos/coca-cola.svg',
    fallbackSrc: '/assets/logos/coca-cola.webp',
    alt: 'Coca-Cola',
    url: 'https://www.coca-cola.com',
    title: 'Coca-Cola',
    className: 'h-[32px] sm:h-[38px] md:h-[44px]'
  },
  {
    name: 'JioHotstar',
    src: '/assets/logos/jiohotstar.svg',
    alt: 'JioHotstar',
    url: 'https://www.hotstar.com',
    title: 'JioHotstar',
    className: 'h-[28px] sm:h-[34px] md:h-[38px]'
  },
  {
    name: 'Godrej',
    src: '/assets/logos/godrej.svg',
    alt: 'Godrej',
    url: 'https://www.godrej.com',
    title: 'Godrej',
    className: 'h-[28px] sm:h-[34px] md:h-[40px]'
  },
  {
    name: 'TWC',
    src: '/assets/logos/twc.svg',
    alt: 'TWC',
    url: 'https://www.twc.in',
    title: 'TWC',
    className: 'h-[26px] sm:h-[32px] md:h-[38px]'
  },
  {
    name: 'Xiaomi',
    src: '/assets/logos/xiaomi.svg',
    alt: 'Xiaomi',
    url: 'https://www.mi.com',
    title: 'Xiaomi',
    className: 'h-[26px] sm:h-[32px] md:h-[36px]'
  },
  {
    name: 'Kingfisher',
    src: '/assets/logos/kingfisher.svg',
    alt: 'Kingfisher',
    url: 'https://www.kingfisherworld.com',
    title: 'Kingfisher',
    className: 'h-[30px] sm:h-[36px] md:h-[42px]'
  },
  {
    name: 'GitHub',
    src: '/assets/logos/github.svg',
    alt: 'GitHub',
    url: 'https://github.com',
    title: 'GitHub',
    className: 'h-[26px] sm:h-[32px] md:h-[36px]'
  },
  {
    name: 'Landmark Group',
    src: '/assets/logos/landmark.webp',
    fallbackSrc: '/assets/logos/landmark.png',
    alt: 'Landmark Group',
    url: 'https://www.landmarkgroup.com',
    title: 'Landmark Group',
    className: 'h-[28px] sm:h-[34px] md:h-[40px]'
  },
  {
    name: 'Brigade Properties',
    src: '/assets/logos/brigade.svg',
    fallbackSrc: '/assets/logos/brigade.png',
    alt: 'Brigade Properties',
    url: 'https://www.brigadegroup.com',
    title: 'Brigade Properties',
    className: 'h-[26px] sm:h-[32px] md:h-[38px]'
  }
];

const CANDIDATE_HERO_IMAGES = [
  "/sriram-hero.jpg",
  defaultPortfolioContent.hero || "/sriram-hero.jpg"
];

const CANDIDATE_PORTRAITS = [
  "/sriram-portrait.jpg",
  defaultPortfolioContent.portrait || "/sriram-portrait.jpg"
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState<'video' | 'photo'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#photography' || hash === '#photo') return 'photo';
      if (hash === '#videography' || hash === '#video') return 'video';
      try {
        const saved = localStorage.getItem('srk_portfolio_active_category');
        if (saved === 'photo' || saved === 'video') return saved;
      } catch {}
    }
    return 'video';
  });

  const handleSelectCategory = (cat: 'video' | 'photo') => {
    setActiveCategory(cat);
    try {
      localStorage.setItem('srk_portfolio_active_category', cat);
      if (typeof window !== 'undefined') {
        const newHash = cat === 'photo' ? '#photography' : '#videography';
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      }
    } catch {}
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#photography' || hash === '#photo') {
        setActiveCategory('photo');
      } else if (hash === '#videography' || hash === '#video') {
        setActiveCategory('video');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const [selectedVideoModal, setSelectedVideoModal] = useState<VideoProject | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    name: '',
    email: '',
    projectType: 'TVC / Commercial Ad Film',
    timeline: 'Within next 1-2 months',
    budget: '',
    message: ''
  });

  const [customPortrait, setCustomPortrait] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('srk_portfolio_portrait');
      if (saved) return saved;
    } catch {}
    return defaultPortfolioContent.portrait || null;
  });
  const [portraitCandidateIndex, setPortraitCandidateIndex] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Restore persistent profile photo across Server API, IndexedDB, and LocalStorage
  useEffect(() => {
    let active = true;
    loadProfilePhotoFromStorage().then((saved) => {
      if (!active) return;
      if (saved) {
        setCustomPortrait(saved);
        setPortraitCandidateIndex(0);
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const [customHero, setCustomHero] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('srk_portfolio_hero');
      if (saved) return saved;
    } catch {}
    return defaultPortfolioContent.hero || null;
  });
  const [heroCandidateIndex, setHeroCandidateIndex] = useState(0);
  const [isHeroDraggingOver, setIsHeroDraggingOver] = useState(false);
  const [heroUploadSuccess, setHeroUploadSuccess] = useState(false);
  const heroFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [heroMobileFocus, setHeroMobileFocus] = useState<'face' | 'cinematic' | 'center'>(() => {
    try {
      const saved = localStorage.getItem('srk_portfolio_hero_focus');
      if (saved === 'face' || saved === 'cinematic' || saved === 'center') return saved;
    } catch {}
    return (defaultPortfolioContent.heroFocus as any) || 'face';
  });

  const handleSetHeroMobileFocus = (focus: 'face' | 'cinematic' | 'center') => {
    setHeroMobileFocus(focus);
    try {
      localStorage.setItem('srk_portfolio_hero_focus', focus);
    } catch {}
    syncAllToCodebase({ heroFocus: focus }).catch(() => {});
  };

  // About Me Editable State
  const [aboutData, setAboutData] = useState(() => {
    try {
      const saved = localStorage.getItem('srk_portfolio_about');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If saved state is from the old copy, prefer updated defaultPortfolioContent.about
        if (parsed.headline && parsed.headline !== "I tell stories through light, movement and real moments.") {
          return parsed;
        }
      }
    } catch {}
    return defaultPortfolioContent.about;
  });
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(() => defaultPortfolioContent.about);

  // Sync to Codebase & Published Build
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAllToCodebase = async () => {
    setIsSyncing(true);
    setSyncNotice('Syncing all images, banner, portrait and about section to codebase...');
    try {
      const localPhotosRaw = localStorage.getItem('srk_portfolio_catalog_photos');
      let photos = undefined;
      if (localPhotosRaw) {
        try { 
          const parsed = JSON.parse(localPhotosRaw);
          if (Array.isArray(parsed)) {
            photos = sanitizePhotos(parsed);
          }
        } catch {}
      }

      const result = await syncAllToCodebase({
        photos,
        portrait: customPortrait,
        hero: customHero,
        heroFocus: heroMobileFocus,
        about: aboutData
      });

      if (result.success) {
        setSyncNotice('✓ Synced to codebase! Clicking Republish will now deploy your exact version.');
      } else {
        setSyncNotice(`Sync notice: ${result.message}`);
      }
    } catch (err: any) {
      setSyncNotice(`Sync issue: ${err?.message || 'Failed to sync'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 6000);
    }
  };

  // Auto-sync on startup for custom hero/about if present in browser
  useEffect(() => {
    const runAutoSync = async () => {
      try {
        const localPortrait = localStorage.getItem('srk_portfolio_portrait');
        const localHero = localStorage.getItem('srk_portfolio_hero');
        const localHeroFocus = localStorage.getItem('srk_portfolio_hero_focus') || undefined;
        const localAboutRaw = localStorage.getItem('srk_portfolio_about');

        let about = undefined;
        if (localAboutRaw) {
          try { about = JSON.parse(localAboutRaw); } catch {}
        }

        if (localPortrait || localHero || localAboutRaw) {
          await syncAllToCodebase({
            portrait: localPortrait,
            hero: localHero,
            heroFocus: localHeroFocus,
            about
          });
          console.debug('Auto-synced profile state to server codebase');
        }
      } catch (err) {
        console.debug('Auto-sync check completed:', err);
      }
    };
    runAutoSync();
  }, []);

  const heroObjectPositionClass = useMemo(() => {
    switch (heroMobileFocus) {
      case 'center':
        return 'object-[50%_center] sm:object-[64%_center] md:object-center';
      case 'cinematic':
        return 'object-[65%_22%] sm:object-[64%_center] md:object-center';
      case 'face':
      default:
        return 'object-[58%_18%] sm:object-[64%_center] md:object-center';
    }
  }, [heroMobileFocus]);

  const processHeroFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCustomHero(dataUrl);
        setHeroCandidateIndex(0);
        try {
          localStorage.setItem('srk_portfolio_hero', dataUrl);
        } catch (err) {
          console.warn('Could not cache hero in localStorage', err);
        }
        syncAllToCodebase({ hero: dataUrl, heroFocus: heroMobileFocus }).catch(() => {});
        setHeroUploadSuccess(true);
        setTimeout(() => setHeroUploadSuccess(false), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const processPhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const optimized = await processAndOptimizeImage(file);
      const dataUrl = optimized.dataUrl;
      setCustomPortrait(dataUrl);
      setPortraitCandidateIndex(0);
      await saveProfilePhotoToStorage(dataUrl);
      syncAllToCodebase({ portrait: dataUrl }).catch(() => {});
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3500);
    } catch {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setCustomPortrait(dataUrl);
          setPortraitCandidateIndex(0);
          await saveProfilePhotoToStorage(dataUrl);
          syncAllToCodebase({ portrait: dataUrl }).catch(() => {});
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyEmail = (e?: React.MouseEvent) => {
    e?.preventDefault();
    navigator.clipboard.writeText('thesrkphotography31@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2400);
  };

  const handleCopyPhone = (e?: React.MouseEvent) => {
    e?.preventDefault();
    navigator.clipboard.writeText('+91 72008 45915');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2400);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => {
      const subject = encodeURIComponent(`Project Inquiry: ${inquiryForm.projectType} — ${inquiryForm.name}`);
      const body = encodeURIComponent(
        `Hi Sriram,\n\nName: ${inquiryForm.name}\nEmail: ${inquiryForm.email}\nProject Type: ${inquiryForm.projectType}\nTimeline: ${inquiryForm.timeline}\nEstimated Budget: ${inquiryForm.budget || 'To discuss'}\n\nProject Brief:\n${inquiryForm.message}\n\nLooking forward to collaborating!`
      );
      window.open(`mailto:thesrkphotography31@gmail.com?subject=${subject}&body=${body}`, '_blank');
    }, 600);
  };

  const handleInquiryWhatsApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const message = encodeURIComponent(
      `Hello Sriram,\n\nI would like to book a project inquiry:\n• Name: ${inquiryForm.name || 'Client'}\n• Email: ${inquiryForm.email || 'N/A'}\n• Scope: ${inquiryForm.projectType}\n• Timeline: ${inquiryForm.timeline}\n\nProject Brief:\n${inquiryForm.message || 'Looking forward to collaborating on an upcoming shoot.'}`
    );
    window.open(`https://wa.me/917200845915?text=${message}`, '_blank');
    setShowInquiryModal(false);
  };

  // Matte Gold Accent Trial State
  const [accentTheme, setAccentTheme] = useState<'gold' | 'monochrome'>(() => {
    try {
      const saved = localStorage.getItem('srk_accent_theme');
      if (saved === 'monochrome') return 'monochrome';
    } catch {}
    return 'gold'; // default to gold trial as requested
  });

  const toggleAccentTheme = (theme?: 'gold' | 'monochrome') => {
    const next = theme || (accentTheme === 'gold' ? 'monochrome' : 'gold');
    setAccentTheme(next);
    try {
      localStorage.setItem('srk_accent_theme', next);
    } catch {}
  };

  // Creator Mode State: Controls visibility of creator-only tools (adjustment buttons, sort modes, upload dropzone, delete tools)
  // Strictly hidden by default for public visitors.
  const [isCreator, setIsCreator] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('creator') === 'true' || params.get('creator') === '1' || params.get('admin') === 'true') {
        return true;
      }
      if (params.get('visitor') === 'true' || params.get('client') === 'true' || params.get('public') === 'true') {
        return false;
      }
      try {
        const stored = localStorage.getItem('srk_creator_active');
        if (stored === 'true') return true;
        if (stored === 'false') return false;
      } catch {}
    }
    return false;
  });

  const toggleCreatorMode = (forcedValue?: boolean) => {
    const nextVal = typeof forcedValue === 'boolean' ? forcedValue : !isCreator;
    setIsCreator(nextVal);
    try {
      localStorage.setItem('srk_creator_active', String(nextVal));
    } catch {}
  };

  // Handle escape key to close modals, and Shift+C / Alt+C shortcut to toggle creator mode for Sriram
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedVideoModal(null);
        setShowInquiryModal(false);
      }
      // Secret creator toggle shortcut: Shift+C or Alt+C (when not typing in an input/textarea)
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (!isInput && ((e.shiftKey && (e.key === 'C' || e.key === 'c')) || (e.altKey && (e.key === 'c' || e.key === 'C')))) {
        e.preventDefault();
        toggleCreatorMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreator]);

  // Track scroll position for dynamic navigation bar styling
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`min-h-screen bg-[#0e0e0e] text-[#f0ede8] font-sans font-light selection:bg-[#f0ede8]/20 selection:text-[#f0ede8] ${accentTheme === 'gold' ? 'theme-matte-gold' : ''}`}>
      
      {/* ── TOP NAVIGATION ───────────────────────────── */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 sm:px-8 md:px-12 transition-all duration-500 ${
          isScrolled 
            ? 'py-3.5 bg-[#090909]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)]' 
            : 'py-5 sm:py-6 bg-gradient-to-b from-black/85 via-black/45 to-transparent backdrop-blur-[3px]'
        }`}
      >
        {/* Left: Pure Name without sub-labels or monograms - 2-line stacked, light optical weight, elegant spacing */}
        <a 
          href="#" 
          className="flex flex-col text-left group py-1"
          id="nav-brand"
        >
          <span className="font-serif-cinzel font-light text-[13px] sm:text-[15px] tracking-[0.22em] uppercase text-[#f0ede8] group-hover:text-white transition-colors duration-300 leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            SRIRAM
          </span>
          <span className="font-serif-cinzel font-light text-[11px] sm:text-[13px] tracking-[0.28em] uppercase text-[#f0ede8]/85 group-hover:text-white transition-colors duration-300 leading-tight mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            KARTHICK
          </span>
        </a>

        {/* Right: Work, About, Contact & Inquire Capsule Dock */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center bg-[#141414]/80 hover:bg-[#181818]/90 backdrop-blur-xl border border-white/15 px-3 sm:px-4 py-1.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-all duration-300">
            <ul className="flex items-center gap-1 sm:gap-2 list-none m-0 p-0">
              <li>
                <a 
                  href="#work" 
                  className="text-[11px] sm:text-[12px] font-medium tracking-[0.18em] uppercase text-[#edeae3] hover:text-white px-2.5 sm:px-3 py-1 rounded-full hover:bg-white/10 transition-all duration-200 inline-block drop-shadow-sm"
                >
                  Work
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  className="text-[11px] sm:text-[12px] font-medium tracking-[0.18em] uppercase text-[#edeae3] hover:text-white px-2.5 sm:px-3 py-1 rounded-full hover:bg-white/10 transition-all duration-200 inline-block drop-shadow-sm"
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-[11px] sm:text-[12px] font-medium tracking-[0.18em] uppercase text-[#edeae3] hover:text-white px-2.5 sm:px-3 py-1 rounded-full hover:bg-white/10 transition-all duration-200 inline-block drop-shadow-sm"
                >
                  Contact
                </a>
              </li>
            </ul>

            <div className="hidden sm:block w-[1px] h-3.5 bg-white/20 mx-1.5 sm:mx-2" />

            <button
              onClick={() => setShowInquiryModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase px-3.5 py-1 rounded-full border border-white/20 hover:border-white/50 text-[#f0ede8] hover:text-white bg-white/[0.04] hover:bg-white/10 font-medium transition-all duration-300 cursor-pointer"
              id="nav-inquire-btn"
            >
              <span>Inquire</span>
              <ArrowUpRight className="w-3 h-3 text-[#f0ede8]/70" />
            </button>
          </div>

          {/* Mobile Inquire Button (visible on small mobile when hidden inside capsule) */}
          <button
            onClick={() => setShowInquiryModal(true)}
            className="sm:hidden flex items-center justify-center p-2 rounded-full bg-white/10 border border-white/20 text-[#f0ede8] hover:bg-white/20 transition-all cursor-pointer shadow-lg"
            title="Project Inquiry"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ── HERO BANNER SECTION ─────────────────────────────── */}
      <section 
        id="hero" 
        className={`relative w-full h-[68vh] sm:h-[68vh] md:h-[72vh] lg:h-[75vh] min-h-[540px] sm:min-h-[520px] max-h-[850px] overflow-hidden bg-black flex flex-col justify-end ${
          isCreator && isHeroDraggingOver ? 'ring-2 ring-[#f0ede8]/60 shadow-2xl' : ''
        }`}
        onDragOver={(e) => {
          if (!isCreator) return;
          e.preventDefault();
          setIsHeroDraggingOver(true);
        }}
        onDragLeave={(e) => {
          if (!isCreator) return;
          e.preventDefault();
          setIsHeroDraggingOver(false);
        }}
        onDrop={(e) => {
          if (!isCreator) return;
          e.preventDefault();
          setIsHeroDraggingOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            processHeroFile(file);
          }
        }}
      >
        {/* Hidden Native File Input for Hero (Creator Only) */}
        {isCreator && (
          <input
            type="file"
            ref={heroFileInputRef}
            accept="image/*"
            className="hidden"
            aria-label="Upload hero banner photograph"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processHeroFile(file);
              }
            }}
          />
        )}

        {/* Main Hero Cinematic Film Still — Preserved and optimized for mobile framing */}
        <img
          src={customHero || CANDIDATE_HERO_IMAGES[heroCandidateIndex]}
          onError={() => {
            if (!customHero && heroCandidateIndex < CANDIDATE_HERO_IMAGES.length - 1) {
              setHeroCandidateIndex(prev => prev + 1);
            }
          }}
          alt="Sriram Karthick — Director of Photography with RED Cinema Camera"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full object-cover select-none transition-all duration-500 ${heroObjectPositionClass}`}
        />

        {/* Subtle, restrained dark gradient in negative space to ensure typographic legibility while keeping the face crisp and illuminated */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 via-50% to-transparent sm:via-black/40 sm:via-40% pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-[56%] sm:h-full bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none sm:hidden" />

        {/* Creator Overlay / Banner Quick Bar (Visible only when Creator Mode is active) */}
        {isCreator && (
          <div className="absolute top-20 right-4 sm:right-6 z-20 flex items-center gap-2 bg-[#0d0d0d]/90 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full text-[10px] font-mono shadow-xl">
            <button
              onClick={() => heroFileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-[#f0ede8] hover:text-white transition-colors cursor-pointer"
              title="Upload new banner photo"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Change Banner</span>
            </button>
            <div className="w-[1px] h-3 bg-white/20" />
            <div className="flex items-center gap-1 text-white/50">
              <span className="hidden xs:inline">Mobile:</span>
              <button
                onClick={() => handleSetHeroMobileFocus(heroMobileFocus === 'face' ? 'cinematic' : heroMobileFocus === 'cinematic' ? 'center' : 'face')}
                className="px-2 py-0.5 rounded text-[9px] bg-white/10 hover:bg-white/20 text-[#f0ede8] uppercase tracking-wider transition-colors cursor-pointer"
                title="Cycle mobile framing focus"
              >
                {heroMobileFocus === 'face' ? 'Focus: Face' : heroMobileFocus === 'cinematic' ? 'Focus: Cinema' : 'Focus: Center'}
              </button>
            </div>
            {customHero && (
              <>
                <div className="w-[1px] h-3 bg-white/20" />
                <button
                  onClick={() => {
                    setCustomHero(null);
                    try {
                      localStorage.removeItem('srk_portfolio_hero');
                    } catch {}
                  }}
                  className="text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider text-[9px] cursor-pointer"
                  title="Reset to default banner photo"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        )}

        {/* Upload feedback pill */}
        {heroUploadSuccess && (
          <div className="absolute top-20 left-6 z-20 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Banner updated &amp; cached</span>
          </div>
        )}

        {/* Editorial Typography in Left Negative Space (Framed so the upper-right subject and face remain open) */}
        <div className="relative z-10 px-5 sm:px-6 md:px-12 pb-7 sm:pb-12 md:pb-14 max-w-[84%] xs:max-w-[76%] sm:max-w-xl lg:max-w-2xl">
          <h1 className="font-serif-garamond text-[38px] xs:text-[42px] sm:text-[58px] md:text-[72px] lg:text-[84px] font-normal leading-[0.92] tracking-[-0.015em] mb-3 sm:mb-4 text-[#f0ede8]">
            Sriram<br />
            <span className="italic font-normal opacity-90">Karthick</span>
          </h1>

          {/* Professional Positioning: Primary and Secondary */}
          <div className="mb-6 sm:mb-8 space-y-1.5 sm:space-y-2">
            <span className="block font-serif-garamond text-[18px] sm:text-[23px] md:text-[27px] tracking-[0.02em] text-[#f0ede8]/90 leading-tight">
              Cinematographer &nbsp;·&nbsp; Photographer
            </span>
            <span className="block text-[10px] sm:text-[12px] font-light tracking-[0.22em] uppercase text-[#f0ede8]/60">
              Creative Director &nbsp;·&nbsp; Creative Producer
            </span>
          </div>

          {/* Primary CTA & Secondary Conversion Action */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="#work"
              className="inline-flex items-center gap-2 sm:gap-2.5 px-4.5 sm:px-6 py-2.5 sm:py-3 bg-[#f0ede8] text-[#0e0e0e] text-[9.5px] sm:text-[11px] tracking-[0.18em] uppercase font-medium rounded-full hover:bg-white transition-all duration-300 cursor-pointer group shadow-lg"
              id="hero-explore-work-btn"
            >
              <span>Explore My Work</span>
              <ArrowRight className="w-3 sm:w-3.5 h-3 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <button
              onClick={() => setShowInquiryModal(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 border border-white/20 hover:border-white/50 text-[#f0ede8] text-[9.5px] sm:text-[11px] tracking-[0.18em] uppercase rounded-full hover:bg-white/10 transition-all duration-300 cursor-pointer backdrop-blur-sm group"
              id="hero-inquire-btn"
            >
              <span>Inquire</span>
              <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── CLIENTS & COLLABORATION SECTION ───────────────── */}
      <section id="clients" className="relative w-full max-w-full overflow-hidden py-6 sm:py-8 border-t border-b border-white/[0.06] bg-[#0c0c0c] select-none">
        {/* Section Title & Interaction Hint */}
        <div className="px-6 md:px-12 mb-3 sm:mb-4 flex items-center justify-between">
          <span className="text-[10px] font-light tracking-[0.26em] uppercase text-white/40">
            SELECTED CLIENTS &amp; COLLABORATIONS
          </span>
          <span className="hidden sm:inline-block text-[9px] font-light tracking-[0.2em] uppercase text-white/25">
            Drag or scroll to browse
          </span>
        </div>
        
        {/* Interactive Client Marquee */}
        <InteractiveClientMarquee brands={CLIENT_BRANDS} />
      </section>

      {/* ── WORK SHOWCASE SECTION ────────────────────── */}
      <section id="work" className="pt-6 sm:pt-8 md:pt-10">
        
        {/* Section Header */}
        <div className="px-6 md:px-12 py-3.5 sm:py-4 flex items-center justify-between border-b border-white/[0.06]">
          <h2 className="font-serif-garamond text-2xl sm:text-3xl md:text-4xl text-[#f0ede8] font-normal">
            Archive &amp; Motion Stills
          </h2>
          <span className="font-serif-garamond text-[14px] sm:text-[16px] text-[#f0ede8]/40 tracking-wider">
            2019 &ndash; 2026
          </span>
        </div>

        {/* Discipline Switcher: Compact Centered Segmented Toggle */}
        <div className="px-4 sm:px-8 py-5 sm:py-6 border-b border-white/[0.06] bg-[#0b0b0b]/60 flex items-center justify-center">
          {/* Segmented Switch Container */}
          <div 
            id="work-discipline-toggle"
            role="tablist"
            aria-label="Select Work Category: Videography or Photography"
            className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-[#0e0e0e] border border-white/[0.1] rounded-xl p-1 shadow-md"
          >
            <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
              {/* Videography Option Button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('video')}
                id="cat-btn-videography"
                role="tab"
                aria-selected={activeCategory === 'video'}
                className={`w-full py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors duration-200 cursor-pointer select-none text-center ${
                  activeCategory === 'video'
                    ? 'bg-[#D8C7A5] text-[#141414] border border-[#c2b18f]/40 font-medium'
                    : 'bg-[#141414] text-[#8e8a82] border border-white/[0.08] hover:bg-[#1a1a1a] hover:text-[#d6d3cc] hover:border-white/[0.14] font-normal'
                }`}
              >
                <Video className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeCategory === 'video' ? 'text-[#141414]' : 'text-[#8e8a82]'}`} />
                <span className="text-[11px] sm:text-[12px] tracking-[0.16em] uppercase font-sans">
                  Videography
                </span>
              </button>

              {/* Photography Option Button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('photo')}
                id="cat-btn-photography"
                role="tab"
                aria-selected={activeCategory === 'photo'}
                className={`w-full py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-colors duration-200 cursor-pointer select-none text-center ${
                  activeCategory === 'photo'
                    ? 'bg-[#D8C7A5] text-[#141414] border border-[#c2b18f]/40 font-medium'
                    : 'bg-[#141414] text-[#8e8a82] border border-white/[0.08] hover:bg-[#1a1a1a] hover:text-[#d6d3cc] hover:border-white/[0.14] font-normal'
                }`}
              >
                <Image className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeCategory === 'photo' ? 'text-[#141414]' : 'text-[#8e8a82]'}`} />
                <span className="text-[11px] sm:text-[12px] tracking-[0.16em] uppercase font-sans">
                  Photography
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── VIDEOGRAPHY PANEL (Continuous Portfolio with Jumble & Preview Options) ─── */}
        {activeCategory === 'video' && (
          <div className="transition-opacity duration-700">
            <VideoCatalog
              videos={VIDEO_PROJECTS}
              onSelectVideo={(v) => setSelectedVideoModal(v)}
              isCreator={isCreator}
            />
          </div>
        )}

        {/* ─── PHOTOGRAPHY PANEL (Catalog Scroll & Escalating Interactivity) ─── */}
        {activeCategory === 'photo' && (
          <div className="transition-opacity duration-700">
            <PhotoCatalog 
              isCreator={isCreator} 
              onToggleCreator={() => toggleCreatorMode()} 
            />
          </div>
        )}

      </section>

      {/* ── ABOUT SECTION ────────────────────────────── */}
      <section id="about" className="py-20 md:py-32 px-6 md:px-12 border-t border-white/[0.06] bg-[#0c0c0c]/80">
        <div className="max-w-7xl mx-auto space-y-14 md:space-y-18">
          
          {/* ── TOP ROW: Filmmaker Portrait, Headline & Industry Credentials ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center pb-12 sm:pb-16 border-b border-white/[0.08]">
            
            {/* Portrait Column */}
            <div className="lg:col-span-5 max-w-sm sm:max-w-md mx-auto lg:mx-0 w-full">
              {/* Hidden Native File Input for Portrait (Creator Only) */}
              {isCreator && (
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  aria-label="Upload profile photograph"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      processPhotoFile(file);
                    }
                  }}
                />
              )}

              <div 
                className={`relative overflow-hidden bg-[#0d0d0d] rounded-2xl border ${
                  isCreator && isDraggingOver 
                    ? 'border-[#f0ede8] ring-2 ring-[#f0ede8]/40 shadow-2xl scale-[1.01]' 
                    : 'border-white/10 shadow-2xl'
                } group transition-all duration-300 ${isCreator ? 'cursor-pointer' : 'cursor-default'}`}
                onDragOver={(e) => {
                  if (!isCreator) return;
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                  if (!isCreator) return;
                  e.preventDefault();
                  setIsDraggingOver(false);
                }}
                onDrop={(e) => {
                  if (!isCreator) return;
                  e.preventDefault();
                  setIsDraggingOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    processPhotoFile(file);
                  }
                }}
                onClick={() => {
                  if (isCreator) {
                    fileInputRef.current?.click();
                  }
                }}
                title={isCreator ? "Click or drag & drop to update portrait photo" : undefined}
              >
                {/* Editorial Profile Photograph — 4:5 vertical portrait */}
                <img
                  src={customPortrait || CANDIDATE_PORTRAITS[portraitCandidateIndex]}
                  onError={() => {
                    if (!customPortrait && portraitCandidateIndex < CANDIDATE_PORTRAITS.length - 1) {
                      setPortraitCandidateIndex(prev => prev + 1);
                    }
                  }}
                  alt="Sriram Karthick — Filmmaker, Cinematographer &amp; Creative Producer"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[4/5] object-cover object-center transition-all duration-700 ease-out group-hover:scale-[1.02] group-hover:brightness-[1.03]"
                />

                {/* Creator Interactive Hover & Drag Overlay */}
                {isCreator && (
                  <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-opacity duration-300 ${
                    isDraggingOver ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[#f0ede8] shadow-lg">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] font-medium text-[#f0ede8]">
                      {isDraggingOver ? 'Drop Portrait Photo Here' : 'Update Portrait Photo'}
                    </p>
                    <p className="text-[10px] text-white/50 tracking-wider">
                      Click or drag &amp; drop your image
                    </p>
                  </div>
                )}

                {/* Quick Status Pill in Corner */}
                {uploadSuccess && (
                  <div className="absolute top-4 right-4 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md animate-in fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Photo Updated &amp; Saved</span>
                  </div>
                )}
              </div>

              {/* Portrait Management Toolbar (Creator Only) */}
              {isCreator && (
                <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-white/60 hover:text-white transition-colors py-1 px-2.5 rounded-md hover:bg-white/[0.04] border border-white/[0.08]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace Photo</span>
                  </button>

                  {customPortrait && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setCustomPortrait(null);
                        setPortraitCandidateIndex(0);
                        await clearProfilePhotoFromStorage();
                      }}
                      className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-white/40 hover:text-rose-300 transition-colors py-1 px-2 rounded-md hover:bg-rose-500/10 cursor-pointer"
                      title="Revert to original default portrait"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* Editorial Name & Title Below Portrait */}
              <div className="mt-5">
                <a 
                  href="https://www.linkedin.com/in/sriram-karthick-2250551ab/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-serif-garamond text-3xl sm:text-4xl text-[#f0ede8] hover:text-white block leading-tight hover:underline decoration-white/30 underline-offset-4 transition-colors"
                  title="Sriram Karthick on LinkedIn"
                >
                  Sriram Karthick
                </a>
                <p className="text-[10px] sm:text-[11px] font-light tracking-[0.24em] uppercase text-white/50 mt-2">
                  FILMMAKER &nbsp;/&nbsp; CINEMATOGRAPHER &nbsp;/&nbsp; CREATIVE PRODUCER
                </p>
              </div>
            </div>

            {/* Headline & Key Credentials Column */}
            <div className="lg:col-span-7 flex flex-col justify-center lg:pl-2">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] font-light tracking-[0.24em] uppercase text-[#f0ede8]/40 block">
                  About
                </span>
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => {
                      setAboutDraft(aboutData || defaultPortfolioContent.about);
                      setIsEditingAbout(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-amber-300 hover:text-white transition-colors py-1 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-amber-400/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Edit Bio / Text</span>
                  </button>
                )}
              </div>
              
              <h2 className="font-serif-garamond text-[32px] sm:text-[42px] md:text-[48px] lg:text-[52px] font-normal leading-[1.14] tracking-[-0.015em] text-[#f0ede8] mb-8">
                {aboutData?.headline || "I build visual stories from the first idea to the final frame."}
              </h2>

              {/* Quick Stats Grid: Dynamic from aboutData */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                {(aboutData?.stats || [
                  { value: "7+", label: "Years of Experience" },
                  { value: "40+", label: "Brands Worked With" },
                  { value: "100+", label: "Clients Worldwide" }
                ]).map((stat: any, idx: number) => (
                  <div key={idx} className="py-5 px-3 bg-white/[0.02] border border-white/[0.08] text-center flex flex-col items-center justify-center rounded-xl">
                    <span className="font-serif-garamond text-2xl sm:text-3xl lg:text-4xl text-[#f0ede8] block mb-1.5 font-normal">
                      {stat.value}
                    </span>
                    <span className="text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-white/45 leading-[1.35] block">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── LOWER ROW: Main About Description & Production Capabilities ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            
            {/* Primary Column: Main About Description */}
            <div className="lg:col-span-7 space-y-5">
              <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-white/40 block mb-3">
                Background &amp; Storytelling Approach
              </span>
              <div className="space-y-6 text-[#f0ede8]/70 text-[14px] sm:text-[15px] md:text-[16px] leading-[1.85] font-light">
                {aboutData?.paragraphs && aboutData.paragraphs.length > 0 ? (
                  aboutData.paragraphs.map((p: string, idx: number) => (
                    <p key={idx}>{p}</p>
                  ))
                ) : (
                  <>
                    <p>
                      I'm a filmmaker, cinematographer and creative producer with over 7 years of experience developing and producing visual stories for brands, businesses and people.
                    </p>
                    <p>
                      My work spans commercials, brand films, documentaries, product films, events and photography. I approach every project through the lens of storytelling, combining creative direction, visual craft and practical production thinking.
                    </p>
                    <p>
                      From shaping an initial concept and planning the shoot to working with teams on set and refining the final edit, I enjoy being involved in the complete creative process.
                    </p>
                    <p>
                      Whether it's a large-scale production or a focused visual project, my goal is to create work that is purposeful, cinematic and connected to the audience.
                    </p>
                    <p>
                      I collaborate with brands, agencies and creative teams to develop ideas into meaningful visual experiences.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Secondary Column: Production & Creative Capabilities Box */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 bg-[#0e0e0e] border border-white/[0.08] rounded-xl space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.22em] uppercase text-white/50 block">
                    Production &amp; Creative Capabilities
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8C7A5]/70" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 pt-1">
                  {(aboutData?.capabilityGroups || defaultPortfolioContent.about?.capabilityGroups || [
                    {
                      category: "Creative & Direction",
                      items: [
                        "Concept Development",
                        "Creative Direction",
                        "Pre-Production",
                        "Shoot Planning"
                      ]
                    },
                    {
                      category: "Production",
                      items: [
                        "Cinematography & Camera Operation",
                        "ARRI Alexa Mini LF",
                        "Sony FX3 / FX6 / FX9",
                        "Gimbal Operator",
                        "On-Set Production & Crew Direction"
                      ]
                    },
                    {
                      category: "Post-Production",
                      items: [
                        "DaVinci Resolve Grading",
                        "Post-Production Supervision",
                        "Final Edit Refinement"
                      ]
                    },
                    {
                      category: "Photography",
                      items: [
                        "Commercial & Brand Stills",
                        "Editorial & Portrait Photography",
                        "Event Coverage"
                      ]
                    }
                  ]).map((group: any, gIdx: number) => (
                    <div key={gIdx} className="space-y-2.5">
                      <h4 className="text-[10.5px] sm:text-[11px] font-mono font-medium tracking-[0.18em] uppercase text-white/60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        {group.category}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((item: string, iIdx: number) => (
                          <span 
                            key={iIdx} 
                            className="px-3 py-1.5 bg-[#161616] border border-white/[0.07] text-white/75 text-[11px] sm:text-[12px] rounded-lg tracking-wide hover:border-white/20 transition-colors"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── CONTACT & BOOKING SECTION ────────────────── */}
      <section id="contact" className="py-24 md:py-36 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start max-w-7xl mx-auto">
          
          <div className="lg:col-span-6">
            <span className="text-[10px] font-light tracking-[0.24em] uppercase text-[#f0ede8]/35 block mb-4">
              Get in Touch
            </span>
            <h2 className="font-serif-garamond text-[52px] sm:text-[68px] md:text-[88px] font-normal leading-[0.96] tracking-[-0.015em] text-[#f0ede8] mb-8">
              Let&apos;s<br />
              <span className="italic font-normal">make</span><br />
              something.
            </h2>
            <p className="font-serif-garamond italic text-lg sm:text-xl text-[#f0ede8]/70 max-w-md mb-8 leading-relaxed">
              Available worldwide for cinematography, commercial photography, brand films, and select creative projects. Let&apos;s discuss your upcoming shoot.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 mb-8">
              <a
                href="https://wa.me/917200845915?text=Hello%20Sriram%2C%20I%20would%20like%20to%20discuss%20a%20project%20collaboration."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#25D366] text-black text-[12px] tracking-[0.16em] uppercase font-semibold rounded-full hover:bg-[#20ba59] transition-all duration-300 cursor-pointer shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98]"
                id="book-inquiry-whatsapp-btn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Chat on WhatsApp</span>
              </a>

              <button
                onClick={() => setShowInquiryModal(true)}
                className="inline-flex items-center gap-2 px-5 py-3.5 border border-white/20 text-[#f0ede8] text-[11px] tracking-[0.16em] uppercase font-light rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 cursor-pointer"
                id="open-custom-brief-btn"
              >
                <Sparkles className="w-3.5 h-3.5 opacity-60" />
                <span>Project Inquiry Form</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              
              {/* Email Row */}
              <div className="py-4 sm:py-5 flex items-center justify-between group">
                <div>
                  <span className="text-[10px] font-light tracking-[0.2em] uppercase text-[#f0ede8]/35 block mb-1">
                    Direct Email
                  </span>
                  <a 
                    href="mailto:thesrkphotography31@gmail.com" 
                    className="text-[15px] sm:text-[16px] font-light text-[#f0ede8]/85 group-hover:text-white transition-colors"
                  >
                    thesrkphotography31@gmail.com
                  </a>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="p-2.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                  title="Copy email address"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Phone Row */}
              <div className="py-4 sm:py-5 flex items-center justify-between group">
                <div>
                  <span className="text-[10px] font-light tracking-[0.2em] uppercase text-[#f0ede8]/35 block mb-1">
                    Phone &amp; WhatsApp
                  </span>
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    <a 
                      href="tel:+917200845915" 
                      className="text-[15px] sm:text-[16px] font-light text-[#f0ede8]/85 group-hover:text-white transition-colors"
                    >
                      +91 72008 45915
                    </a>
                    <a
                      href="https://wa.me/917200845915"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/35 text-[#25D366] text-[10.5px] font-medium tracking-wide transition-all shadow-sm"
                      title="Chat on WhatsApp (+91 72008 45915)"
                      id="phone-whatsapp-direct"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyPhone}
                    className="p-2.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                    title="Copy phone number"
                  >
                    {copiedPhone ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Instagram Row */}
              <div className="py-4 sm:py-5 flex items-center justify-between group">
                <div>
                  <span className="text-[10px] font-light tracking-[0.2em] uppercase text-[#f0ede8]/35 block mb-1">
                    Instagram
                  </span>
                  <a 
                    href="https://www.instagram.com/srk.dop/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[15px] sm:text-[16px] font-light text-[#f0ede8]/85 group-hover:text-white transition-colors inline-flex items-center gap-2"
                  >
                    <span>@srk.dop</span>
                    <span className="text-white/40 text-xs hidden sm:inline">(Sriram Karthick)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                </div>
                <a
                  href="https://www.instagram.com/srk.dop/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  aria-label="Instagram profile @srk.dop"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>

              {/* LinkedIn Row */}
              <div className="py-4 sm:py-5 flex items-center justify-between group">
                <div>
                  <span className="text-[10px] font-light tracking-[0.2em] uppercase text-[#f0ede8]/35 block mb-1">
                    LinkedIn
                  </span>
                  <a 
                    href="https://www.linkedin.com/in/sriram-karthick-2250551ab/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[15px] sm:text-[16px] font-light text-[#f0ede8]/85 group-hover:text-white transition-colors inline-flex items-center gap-2"
                  >
                    <span>Sriram Karthick</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                </div>
                <a
                  href="https://www.linkedin.com/in/sriram-karthick-2250551ab/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  aria-label="LinkedIn profile"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>

              {/* Location Row */}
              <div className="py-4 sm:py-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-light tracking-[0.2em] uppercase text-[#f0ede8]/35 block mb-1">
                    Location
                  </span>
                  <span className="text-[15px] sm:text-[16px] font-light text-[#f0ede8]/85">
                    Bengaluru, India · Available Worldwide
                  </span>
                </div>
                <MapPin className="w-4 h-4 text-white/30" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/[0.06] text-[#f0ede8]/40 text-[10px] sm:text-[11px] font-light tracking-[0.18em] uppercase">
        <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
          <span className="text-white/80 font-normal">Sriram Karthick</span>
          <span>·</span>
          <span>Cinematographer &amp; Photographer</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {/* 1-Click Matte Gold Trial Toggle / Undo */}
          <button
            onClick={() => toggleAccentTheme()}
            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[#f0ede8]/40 hover:text-[#f0ede8]/80 py-1"
            title="Toggle between Matte Gold Yellow trial and Classic Monochrome"
            id="toggle-accent-trial-btn"
          >
            <span className={`w-2 h-2 rounded-full transition-all ${accentTheme === 'gold' ? 'bg-[#e6ca85] shadow-[0_0_8px_rgba(230,202,133,0.5)]' : 'bg-white/30'}`} />
            <span className={accentTheme === 'gold' ? 'text-[#f3dfaa]' : ''}>
              {accentTheme === 'gold' ? 'Accent: Matte Gold (Trial)' : 'Accent: Monochrome'}
            </span>
          </button>
          <span>·</span>
          <a href="#hero" className="hover:text-white transition-colors">Back to top ↑</a>
          <span>&copy; 2026</span>
          {/* Subtle Creator Tools Access Toggle */}
          <button
            onClick={() => toggleCreatorMode()}
            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[#f0ede8]/30 hover:text-[#f0ede8]/60"
            title={isCreator ? "Switch to Public Visitor View" : "Enter Creator Mode (or press Shift+C)"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isCreator ? (accentTheme === 'gold' ? 'bg-[#e6ca85]' : 'bg-amber-400') : 'bg-white/20'}`} />
            <span>{isCreator ? 'Creator Tools (Active)' : 'Creator Access'}</span>
          </button>
        </div>
      </footer>

      {/* ── CREATOR MODE FLOATING STATUS BAR (Visible only when Creator Mode is ON) ── */}
      {isCreator && (
        <div className={`fixed bottom-5 left-5 z-40 flex items-center gap-2.5 px-3.5 py-2 bg-black/85 backdrop-blur-xl border ${accentTheme === 'gold' ? 'border-[#e6ca85]/40 shadow-[0_4px_24px_rgba(230,202,133,0.15)]' : 'border-amber-400/30'} rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.8)] text-xs animate-in fade-in duration-300`}>
          <span className={`w-2 h-2 rounded-full ${accentTheme === 'gold' ? 'bg-[#e6ca85]' : 'bg-amber-400'} animate-pulse`} />
          <span className={`font-mono text-[10px] uppercase tracking-wider ${accentTheme === 'gold' ? 'text-[#f3dfaa]' : 'text-amber-300'} font-medium`}>
            Creator Mode
          </span>
          <span className="text-white/20">|</span>
          <button
            onClick={handleSyncAllToCodebase}
            disabled={isSyncing}
            className="inline-flex items-center gap-1 text-[10px] font-sans text-amber-300 hover:text-white bg-amber-400/15 hover:bg-amber-400/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            title="Sync all uploaded photos, hero banner, portrait and about bio directly to project files so clicking Republish updates live site"
          >
            <Sparkles className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Codebase'}</span>
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={() => toggleAccentTheme()}
            className="text-[10px] font-sans text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Switch accent color"
          >
            {accentTheme === 'gold' ? 'Gold: ON' : 'Gold: OFF'}
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={() => toggleCreatorMode(false)}
            className="text-[10px] font-sans text-white/70 hover:text-white transition-colors underline underline-offset-2 cursor-pointer"
            title="Preview site exactly as public visitors see it"
          >
            Preview as Visitor
          </button>
        </div>
      )}

      {/* ── SYNC STATUS TOAST ── */}
      {syncNotice && (
        <div className="fixed bottom-16 left-5 z-50 max-w-md p-3.5 rounded-xl bg-neutral-900/95 border border-amber-400/50 text-amber-200 text-xs shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="flex-1 leading-relaxed">{syncNotice}</p>
          <button 
            onClick={() => setSyncNotice(null)}
            className="p-1 text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── VIDEO DETAIL MODAL ───────────────────────── */}
      {selectedVideoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedVideoModal(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-[#111] border border-white/15 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/10">
              <div>
                <h3 className="font-serif-garamond text-2xl text-[#f0ede8]">
                  {selectedVideoModal.title} {selectedVideoModal.highlight && <span className="italic">{selectedVideoModal.highlight}</span>}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedVideoModal.allowsEmbed === false && selectedVideoModal.videoUrl && (
                  <a
                    href={selectedVideoModal.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-black font-semibold text-[10px] uppercase font-mono tracking-wider transition-colors border border-amber-400/30"
                    title="Open external film link in a new tab"
                  >
                    <span>Watch External</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => setSelectedVideoModal(null)}
                  className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedVideoModal.videoSrc ? (
              <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                  src={selectedVideoModal.videoSrc}
                  controls
                  autoPlay
                  playsInline
                  poster={
                    selectedVideoModal.thumbnail ||
                    selectedVideoModal.imageUrl ||
                    (selectedVideoModal.youtubeId ? `https://img.youtube.com/vi/${selectedVideoModal.youtubeId}/hqdefault.jpg` : '')
                  }
                  className="w-full h-full object-contain bg-black"
                />
              </div>
            ) : selectedVideoModal.allowsEmbed !== false && selectedVideoModal.youtubeId ? (
              <div className="relative w-full aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideoModal.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  className="absolute inset-0 w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedVideoModal.title}
                />
              </div>
            ) : (
              <div className="relative w-full aspect-video bg-black flex flex-col items-center justify-center p-6 sm:p-12 text-center overflow-hidden group">
                <img 
                  src={
                    selectedVideoModal.imageUrl ||
                    selectedVideoModal.thumbnail ||
                    (selectedVideoModal.youtubeId ? `https://img.youtube.com/vi/${selectedVideoModal.youtubeId}/hqdefault.jpg` : '')
                  }
                  alt={selectedVideoModal.title}
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.3] contrast-[1.08]"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80';
                  }}
                />
                <div className="relative z-10 max-w-md space-y-3 px-4">
                  <div className="w-14 h-14 rounded-full bg-black/60 border border-white/20 mx-auto flex items-center justify-center text-amber-400">
                    <Film className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif-garamond text-2xl text-white">
                    {selectedVideoModal.title}
                  </h4>
                  <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto">
                    Screening hosted on external video platform. Click below to open and watch the film in a new tab.
                  </p>
                  {selectedVideoModal.videoUrl && (
                    <a
                      href={selectedVideoModal.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 text-black font-semibold text-xs uppercase tracking-wider hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 mt-1 cursor-pointer"
                    >
                      <span>Watch Film on External Platform</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PROJECT INQUIRY MODAL ────────────────────── */}
      {showInquiryModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
          onClick={() => setShowInquiryModal(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-[#111] border border-white/15 p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 mb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] font-light tracking-[0.2em] uppercase text-white/40 block mb-1">
                  Commission Inquiry
                </span>
                <h3 className="font-serif-garamond text-2xl md:text-3xl text-[#f0ede8]">
                  Start a Project with Sriram
                </h3>
              </div>
              <button
                onClick={() => setShowInquiryModal(false)}
                className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inquirySent ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-serif-garamond text-2xl text-white">Inquiry Formatted!</h4>
                <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
                  Your email client has been prepared with your inquiry details. Sriram will reply directly to <span className="text-white">{inquiryForm.email}</span>.
                </p>
                <button
                  onClick={() => {
                    setInquirySent(false);
                    setShowInquiryModal(false);
                  }}
                  className="px-6 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium rounded-full mt-4"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-white/50 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={inquiryForm.name}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                    placeholder="e.g. Aditi Sharma / Creative Director"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-white/50 mb-1">Your Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inquiryForm.email}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                    placeholder="name@brand.com"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-wider uppercase text-white/50 mb-1">Project Scope</label>
                    <select
                      value={inquiryForm.projectType}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, projectType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded text-white focus:outline-none focus:border-white/40 transition-colors"
                    >
                      <option value="TVC / Commercial Ad Film">TVC / Commercial Ad Film</option>
                      <option value="Brand Film / Documentary">Brand Film / Documentary</option>
                      <option value="Product Video / Tabletop">Product Video / Tabletop</option>
                      <option value="Commercial Photography">Commercial Photography</option>
                      <option value="Live Event / Arena Tour">Live Event / Arena Tour</option>
                      <option value="Creative Direction &amp; Producing">Creative Direction &amp; Producing</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-wider uppercase text-white/50 mb-1">Estimated Timeline</label>
                    <select
                      value={inquiryForm.timeline}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, timeline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/10 rounded text-white focus:outline-none focus:border-white/40 transition-colors"
                    >
                      <option value="Immediate (1-2 weeks)">Immediate (1-2 weeks)</option>
                      <option value="Within next 1-2 months">Within next 1-2 months</option>
                      <option value="Q3 / Q4 Planning">Q3 / Q4 Planning</option>
                      <option value="General Exploration">General Exploration</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] tracking-wider uppercase text-white/50 mb-1">Project Brief / Details</label>
                  <textarea
                    rows={4}
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                    placeholder="Tell Sriram about the concept, location, deliverables, or brand vision..."
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[10px] text-white/40 self-start sm:self-center">
                    Direct: +91 72008 45915
                  </span>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleInquiryWhatsApp}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] text-black text-[11px] tracking-[0.14em] uppercase font-semibold rounded-full hover:bg-[#20ba59] transition-all cursor-pointer shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>Send to WhatsApp</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-4 py-2.5 border border-white/20 text-white/80 hover:text-white hover:border-white/50 text-[11px] tracking-[0.14em] uppercase font-light rounded-full transition-all cursor-pointer"
                    >
                      Email
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT ABOUT ME MODAL (Creator Only) ── */}
      {isEditingAbout && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
          onClick={() => setIsEditingAbout(false)}
        >
          <div 
            className="relative w-full max-w-2xl bg-[#111] border border-white/20 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif-garamond text-2xl text-[#f0ede8]">Edit About Me &amp; Bio</h3>
              </div>
              <button 
                onClick={() => setIsEditingAbout(false)}
                className="p-1.5 text-white/50 hover:text-white rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">Headline</label>
                <input 
                  type="text"
                  value={aboutDraft?.headline || ''}
                  onChange={(e) => setAboutDraft({ ...aboutDraft, headline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">
                  Bio Paragraphs (separated by double newlines)
                </label>
                <textarea 
                  rows={6}
                  value={Array.isArray(aboutDraft?.paragraphs) ? aboutDraft.paragraphs.join('\n\n') : ''}
                  onChange={(e) => {
                    const paras = e.target.value.split('\n\n').map(p => p.trim()).filter(Boolean);
                    setAboutDraft({ ...aboutDraft, paragraphs: paras });
                  }}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">
                  Production &amp; Creative Capabilities (comma separated)
                </label>
                <input 
                  type="text"
                  value={Array.isArray(aboutDraft?.tools) ? aboutDraft.tools.join(', ') : ''}
                  onChange={(e) => {
                    const tools = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    setAboutDraft({ ...aboutDraft, tools });
                  }}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditingAbout(false)}
                className="px-4 py-2 text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAboutData(aboutDraft);
                  try {
                    localStorage.setItem('srk_portfolio_about', JSON.stringify(aboutDraft));
                  } catch {}
                  setIsEditingAbout(false);
                  await syncAllToCodebase({ about: aboutDraft });
                  setSyncNotice('✓ Bio updated and synced to codebase!');
                  setTimeout(() => setSyncNotice(null), 5000);
                }}
                className="px-5 py-2.5 bg-amber-400 text-black text-xs font-medium rounded-full uppercase tracking-wider hover:bg-amber-300 transition-colors cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Sync to Codebase</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
