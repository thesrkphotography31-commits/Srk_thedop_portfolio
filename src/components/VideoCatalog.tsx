import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Shuffle, 
  Sparkles, 
  ArrowUpDown, 
  Maximize2, 
  Columns2, 
  Columns3, 
  Play, 
  Film, 
  Sun, 
  Tv, 
  Check,
  ExternalLink,
  Layers,
  Filter,
  Upload,
  X,
  Square,
  AlertCircle
} from 'lucide-react';
import { getProjectVideoUrl, saveProjectVideoFile } from '../utils/videoStorage';

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

export type VideoSortMode = 'stylized-jumble' | 'curated' | 'newest' | 'genre';
export type VideoLayoutMode = 'cinema' | 'diptych' | 'grid';
export type VideoPreviewMode = 'direct' | 'poster' | 'ambient-sheen';
export type VideoCategoryFilter = 'all' | 'tvc' | 'brand' | 'event' | 'corporate' | 'product';

interface VideoCatalogProps {
  videos: VideoProject[];
  onSelectVideo: (video: VideoProject) => void;
  isCreator?: boolean;
}

const CATEGORY_META: Record<VideoProject['category'], { label: string; glow: string; badge: string }> = {
  tvc: { label: 'Commercial TVC', glow: 'rgba(245, 158, 11, 0.18)', badge: 'TVC Ad' },
  brand: { label: 'Brand Film', glow: 'rgba(6, 182, 212, 0.18)', badge: 'Brand' },
  event: { label: 'Concert & Events', glow: 'rgba(236, 72, 153, 0.18)', badge: 'Event' },
  corporate: { label: 'Corporate & Narrative', glow: 'rgba(132, 204, 22, 0.18)', badge: 'Corporate' },
  product: { label: 'Product Films', glow: 'rgba(168, 85, 247, 0.18)', badge: 'Product' }
};

// Fallback images for non-YouTube projects or restricted/unavailable thumbnails
const FALLBACK_POSTERS: Record<string, string> = {
  'aashirvaad': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
  'gametheory': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
  'godrej-cinthol': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'que-sunglasses': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
  'google-io-connect': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  'landmark-corporate': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  'salesforce-event': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  'hdfc-ergo': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
  'digiyatra-podcast': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
  'virdas-tour': 'https://img.youtube.com/vi/eLAbF6DWp8A/hqdefault.jpg',
  'alan-walker-kingfisher': '/alan-walker-kingfisher.jpg',
  'prestige-cookware': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
  'fixderma-product': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  'xiaomi-event': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
  'hyundai-ioniq-hi-tea': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
  'featured-film-z0qm': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
  'hyundai-commercial': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'
};

export const VideoCatalog: React.FC<VideoCatalogProps> = ({
  videos,
  onSelectVideo,
  isCreator = false
}) => {
  const [sortMode, setSortMode] = useState<VideoSortMode>('curated');
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);
  const [layoutMode, setLayoutMode] = useState<VideoLayoutMode>('diptych');
  const [previewMode, setPreviewMode] = useState<VideoPreviewMode>('poster');
  const [categoryFilter, setCategoryFilter] = useState<VideoCategoryFilter>('all');
  const [inlinePlayingId, setInlinePlayingId] = useState<string | null>(null);
  const [embedFailedIds, setEmbedFailedIds] = useState<Set<string>>(new Set());

  const [customVideoUrls, setCustomVideoUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);

  // Listen for YouTube player error events (e.g. error 101/150 for embedding disabled)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (data && (data.event === 'onError' || (data.info && [100, 101, 150].includes(Number(data.info))))) {
          if (inlinePlayingId) {
            setEmbedFailedIds(prev => new Set(prev).add(inlinePlayingId));
          }
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [inlinePlayingId]);

  useEffect(() => {
    let isMounted = true;
    const loadStoredVideos = async () => {
      const urls: Record<string, string> = {};
      for (const v of videos) {
        const url = await getProjectVideoUrl(v.id);
        if (url) {
          urls[v.id] = url;
        }
      }
      if (isMounted) {
        setCustomVideoUrls(urls);
      }
    };
    loadStoredVideos();
    return () => { isMounted = false; };
  }, [videos]);

  const handleAttachVideoFile = async (projectId: string, file: File) => {
    if (!file.type.startsWith('video/')) return;
    try {
      const url = await saveProjectVideoFile(projectId, file);
      setCustomVideoUrls(prev => ({ ...prev, [projectId]: url }));
    } catch (err) {
      console.error('Failed to attach video file:', err);
    }
  };

  // Trigger Jumble with animation
  const handleTriggerShuffle = () => {
    setSortMode('stylized-jumble');
    setShuffleSeed(prev => prev + 1);
  };

  // Filter & Sort Engine
  const processedVideos = useMemo(() => {
    // 1. Filter by category
    let list = categoryFilter === 'all' 
      ? [...videos] 
      : videos.filter(v => v.category === categoryFilter);

    // 2. Sorting
    if (sortMode === 'stylized-jumble') {
      // Seeded smart shuffle that alternates categories so consecutive videos are never identical genre
      const buckets: Record<string, VideoProject[]> = {
        tvc: [],
        brand: [],
        event: [],
        corporate: [],
        product: []
      };

      list.forEach(v => {
        if (buckets[v.category]) {
          buckets[v.category].push(v);
        } else {
          buckets.tvc.push(v);
        }
      });

      // Deterministic PRNG using seed
      const pseudoRandom = (n: number) => {
        const x = Math.sin(shuffleSeed * 9973 + n * 401) * 10000;
        return x - Math.floor(x);
      };

      // Shuffle individual buckets
      Object.keys(buckets).forEach((key, bIdx) => {
        buckets[key].sort((a, b) => pseudoRandom(a.title.length + bIdx) - 0.5);
      });

      // Interleave buckets in dynamic alternating order
      const interleaved: VideoProject[] = [];
      const order = ['tvc', 'event', 'brand', 'product', 'corporate'];
      let hasMore = true;
      let round = 0;

      while (hasMore) {
        hasMore = false;
        // Shift starting category per round for variety
        const rotatedOrder = [
          ...order.slice(round % order.length),
          ...order.slice(0, round % order.length)
        ];

        for (const cat of rotatedOrder) {
          if (buckets[cat] && buckets[cat].length > 0) {
            interleaved.push(buckets[cat].shift()!);
            hasMore = true;
          }
        }
        round++;
      }

      return interleaved;
    }

    if (sortMode === 'newest') {
      return [...list].sort((a, b) => parseInt(b.year || '2024') - parseInt(a.year || '2024'));
    }

    if (sortMode === 'genre') {
      const orderMap: Record<string, number> = {
        tvc: 1,
        brand: 2,
        event: 3,
        corporate: 4,
        product: 5
      };
      return [...list].sort((a, b) => (orderMap[a.category] || 99) - (orderMap[b.category] || 99));
    }

    // Default 'curated' order
    return list;
  }, [videos, categoryFilter, sortMode, shuffleSeed]);

  // Helper to get poster image
  const getPosterUrl = (video: VideoProject) => {
    if (video.id === 'virdas-tour') {
      return video.thumbnail || 'https://img.youtube.com/vi/eLAbF6DWp8A/hqdefault.jpg';
    }
    if (video.id === 'alan-walker-kingfisher') {
      return video.thumbnail || 'https://img.youtube.com/vi/chfwqrpuYM0/maxresdefault.jpg';
    }
    if (video.thumbnail) return video.thumbnail;
    if (video.imageUrl) return video.imageUrl;
    if (video.youtubeId) {
      return `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
    }
    if (FALLBACK_POSTERS[video.id]) return FALLBACK_POSTERS[video.id];
    return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80';
  };

  return (
    <div className="w-full select-none">
      {/* ── STICKY CUSTOMIZATION TOOLBAR (DEVELOPER/CREATOR ONLY) ── */}
      {isCreator && (
        <>
          <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 md:px-12 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Reel Status & Info */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#f0ede8]/70 font-light flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Videography Reels</span>
            <span className="text-white/20">·</span>
            <span className="font-mono text-amber-400/90">{processedVideos.length} {processedVideos.length === 1 ? 'Film' : 'Films'}</span>
          </span>

          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden lg:inline text-[10px] text-white/40 tracking-wider">
            Commercial TVCs · Brand Films · Concert &amp; Event Aftermovies
          </span>
        </div>

        {/* Right: Jumble & Customization Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* Jumble / Shuffle Portfolio Action Button */}
          <button
            onClick={handleTriggerShuffle}
            className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-200 text-black font-semibold text-[10px] uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 hover:shadow-amber-400/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Intelligently shuffle reel: alternates commercial TVCs, automotive, live events, brand films, and products"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Jumble Films</span>
          </button>

          {/* Sorting Engine Switcher */}
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded border border-white/10">
            <span className="hidden md:inline px-2 text-[9px] uppercase tracking-wider text-white/40 flex items-center gap-1">
              <ArrowUpDown className="w-2.5 h-2.5" />
              <span>Sort:</span>
            </span>
            <button
              onClick={() => {
                setSortMode('stylized-jumble');
                setShuffleSeed(prev => prev + 1);
              }}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                sortMode === 'stylized-jumble'
                  ? 'bg-amber-400/25 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Stylized Jumble: Intelligently interweaves genres and tempos so the reel stays balanced"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Jumble</span>
            </button>
            <button
              onClick={() => setSortMode('curated')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                sortMode === 'curated'
                  ? 'bg-amber-400/20 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Curated Order: Handpicked director showcase"
            >
              Curated
            </button>
            <button
              onClick={() => setSortMode('newest')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                sortMode === 'newest'
                  ? 'bg-amber-400/20 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Newest releases first"
            >
              Newest
            </button>
            <button
              onClick={() => setSortMode('genre')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                sortMode === 'genre'
                  ? 'bg-amber-400/20 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Grouped by Genre"
            >
              Genre
            </button>
          </div>

          {/* Layout Mode Switcher */}
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded border border-white/10">
            <span className="hidden sm:inline px-2 text-[9px] uppercase tracking-wider text-white/40">
              Layout:
            </span>
            <button
              onClick={() => setLayoutMode('cinema')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                layoutMode === 'cinema'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Cinema Scope: Full-width widescreen feature presentation"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Cinema</span>
            </button>
            <button
              onClick={() => setLayoutMode('diptych')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                layoutMode === 'diptych'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Diptych: 2 Across side-by-side grid"
            >
              <Columns2 className="w-3 h-3" />
              <span>2 Across</span>
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                layoutMode === 'grid'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Grid: 3 Across gallery view"
            >
              <Columns3 className="w-3 h-3" />
              <span className="hidden sm:inline">3 Across</span>
            </button>
          </div>

          {/* Preview Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded border border-white/10">
            <span className="hidden xl:inline px-2 text-[9px] uppercase tracking-wider text-amber-300/80 font-medium flex items-center gap-1">
              <Film className="w-2.5 h-2.5 text-amber-400" />
              <span>Preview:</span>
            </span>
            <button
              onClick={() => setPreviewMode('direct')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                previewMode === 'direct'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Direct Player: Inline video embeds ready to play immediately"
            >
              <Play className="w-2.5 h-2.5" />
              <span>Player</span>
            </button>
            <button
              onClick={() => setPreviewMode('poster')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                previewMode === 'poster'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Cinema Poster: High-resolution posters with custom play triggers & modal theater"
            >
              <Film className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Posters</span>
            </button>
            <button
              onClick={() => setPreviewMode('ambient-sheen')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                previewMode === 'ambient-sheen'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Ambient Sheen: Dynamic colored theater aura highlights each film"
            >
              <Sun className="w-2.5 h-2.5" />
              <span className="hidden md:inline">Ambient</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CURATION RIBBON: GENRE & CATEGORY FILTERS ── */}
      <div className="bg-[#0b0b0b] border-b border-white/[0.06] px-4 sm:px-6 md:px-12 py-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'all'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span>All Films ({videos.length})</span>
            </button>

            <button
              onClick={() => setCategoryFilter('tvc')}
              className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'tvc'
                  ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40 font-medium'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Commercial TVCs</span>
            </button>

            <button
              onClick={() => setCategoryFilter('brand')}
              className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'brand'
                  ? 'bg-cyan-400/25 text-cyan-200 border border-cyan-400/40 font-medium'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Brand Films</span>
            </button>

            <button
              onClick={() => setCategoryFilter('event')}
              className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'event'
                  ? 'bg-pink-400/25 text-pink-200 border border-pink-400/40 font-medium'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              <span>Concert &amp; Events</span>
            </button>

            <button
              onClick={() => setCategoryFilter('corporate')}
              className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'corporate'
                  ? 'bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 font-medium'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Corporate &amp; Narrative</span>
            </button>

            <button
              onClick={() => setCategoryFilter('product')}
              className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'product'
                  ? 'bg-purple-400/25 text-purple-200 border border-purple-400/40 font-medium'
                  : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Product Films</span>
            </button>
          </div>

          {/* Anti-Repetition Status Badge */}
          <div className="flex items-center gap-2 text-[10px] text-white/50 shrink-0">
            <button
              onClick={handleTriggerShuffle}
              className="group flex items-center gap-1.5 px-2 py-1 rounded bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 transition-all text-amber-300/90 hover:text-amber-200 cursor-pointer"
              title="Click to reshuffle: balances commercials, brand stories, arena events, and tabletop products"
            >
              <Shuffle className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500 text-amber-400" />
              <span className="tracking-wide">Anti-Genre Repetition Active</span>
            </button>
            <span className="text-white/20 font-mono">·</span>
            <span className="font-mono text-amber-400/90">{processedVideos.length} Active Films</span>
          </div>
        </div>

        {/* Dynamic Tip Bar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04] text-[10px] text-white/50 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-amber-300 font-medium uppercase tracking-wider text-[9px]">
              {previewMode === 'direct' && 'Direct Player Mode Active'}
              {previewMode === 'poster' && 'Cinema Poster Mode Active'}
              {previewMode === 'ambient-sheen' && 'Ambient Cinema Glow Active'}
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/60">
              {previewMode === 'direct' && 'Watch directly on page with standard high-definition video playback.'}
              {previewMode === 'poster' && 'High-speed posters: Click any card to launch the immersive cinema lightbox.'}
              {previewMode === 'ambient-sheen' && 'Atmospheric color halos illuminate the frame reflecting each film genre.'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[9px] text-white/40 uppercase tracking-widest font-mono">
            <span>Layout:</span>
            <span className="text-amber-400 font-semibold">{layoutMode.toUpperCase()}</span>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ── VIDEO DISPLAY GRID (Responsive to Cinema, Diptych, or 3-Across Grid) ── */}
      <div 
        className={`w-full ${
          layoutMode === 'cinema' 
            ? 'flex flex-col' 
            : layoutMode === 'diptych'
              ? 'grid grid-cols-1 md:grid-cols-2'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {processedVideos.map((video, index) => {
          const activeVideoSrc = customVideoUrls[video.id] || video.videoSrc;
          const hasVideoSrc = Boolean(activeVideoSrc);
          const externalUrl = video.videoUrl || (video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : video.youtubeUrl);
          const hasExternalUrl = Boolean(externalUrl && externalUrl.trim().length > 0);

          const isPlaying = inlinePlayingId === video.id;
          const isEmbedFailed = embedFailedIds.has(video.id);

          const isSheen = previewMode === 'ambient-sheen';
          const glowColor = CATEGORY_META[video.category]?.glow || 'rgba(245, 158, 11, 0.15)';
          const aspectClass = video.aspect === '21/8' 
            ? (layoutMode === 'cinema' ? 'aspect-[21/8]' : 'aspect-[16/9]')
            : 'aspect-video';

          const handlePlayVideo = () => {
            if (inlinePlayingId === video.id) return;
            setInlinePlayingId(video.id);
          };

          const handleStopVideo = () => {
            setInlinePlayingId(null);
          };

          const handleReportRestricted = () => {
            setEmbedFailedIds(prev => new Set(prev).add(video.id));
          };

          const handleRetryEmbed = () => {
            setEmbedFailedIds(prev => {
              const next = new Set(prev);
              next.delete(video.id);
              return next;
            });
            setInlinePlayingId(video.id);
          };

          return (
            <div
              key={video.id}
              className={`relative group bg-[#0a0a0a] border-b border-white/[0.06] ${
                layoutMode === 'diptych' && index % 2 === 0 ? 'md:border-r border-white/[0.06]' : ''
              } ${
                layoutMode === 'grid' && index % 3 !== 2 ? 'lg:border-r border-white/[0.06]' : ''
              } transition-all duration-500 overflow-hidden flex flex-col justify-between`}
              style={
                isSheen
                  ? {
                      boxShadow: `inset 0 0 40px ${glowColor}, 0 10px 30px ${glowColor}`
                    }
                  : undefined
              }
            >
              {/* Media Container */}
              <div className={`relative w-full ${aspectClass} bg-black overflow-hidden`}>
                
                {/* Ambient Aura Background */}
                {isSheen && (
                  <div 
                    className="absolute -inset-4 opacity-40 blur-xl pointer-events-none transition-opacity duration-500 group-hover:opacity-70 -z-0"
                    style={{ backgroundColor: glowColor }}
                  />
                )}

                {/* Direct Inline Video Embed or Fallback */}
                {isPlaying ? (
                  isEmbedFailed ? (
                    /* Fallback Message when embedding is disabled/restricted */
                    <div className="absolute inset-0 z-20 bg-[#0c0c0c] border border-amber-400/20 p-6 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-amber-400/90 mb-1">
                        Notice · External Playback Required
                      </span>
                      <h4 className="font-serif-garamond text-xl sm:text-2xl text-white font-normal mb-2">
                        Embedding Restricted by Video Owner
                      </h4>
                      <p className="text-xs text-white/60 max-w-sm mb-5 leading-relaxed">
                        This video publisher has restricted playback on third-party websites. You can watch the full film directly on YouTube.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {hasExternalUrl && (
                          <a
                            href={externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs uppercase tracking-wider font-semibold transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
                          >
                            <span>Watch on YouTube</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={handleRetryEmbed}
                          className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs uppercase tracking-wider transition-colors border border-white/15 cursor-pointer"
                        >
                          Try Player Again
                        </button>
                        <button
                          type="button"
                          onClick={handleStopVideo}
                          className="px-4 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Return to Thumbnail
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Active Embedded Video Player with standard controls */
                    <div className="relative w-full h-full bg-black">
                      {hasVideoSrc ? (
                        <video
                          src={activeVideoSrc}
                          controls
                          autoPlay
                          playsInline
                          poster={getPosterUrl(video)}
                          className="absolute inset-0 w-full h-full object-cover z-10 bg-black"
                        />
                      ) : video.youtubeId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&controls=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
                          className="absolute inset-0 w-full h-full border-none z-10"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                          allowFullScreen
                          title={`${video.title} — Sriram Karthick`}
                        />
                      ) : (
                        <div className="absolute inset-0 z-20 bg-[#0c0c0c] p-6 flex flex-col items-center justify-center text-center">
                          <Film className="w-8 h-8 text-amber-400 mb-3" />
                          <h4 className="font-serif-garamond text-xl text-white mb-2">{video.title}</h4>
                          <p className="text-xs text-white/60 max-w-sm mb-4">No embedded video source available for this item.</p>
                          {hasExternalUrl && (
                            <a
                              href={externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-black text-xs font-semibold rounded-full uppercase tracking-wider"
                            >
                              <span>Open Original Link</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Top Right Stop / Close Player Button */}
                      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStopVideo();
                          }}
                          className="px-3 py-1.5 rounded-full bg-black/85 hover:bg-white hover:text-black text-white/90 border border-white/20 text-[10px] font-mono tracking-wider backdrop-blur-md transition-all cursor-pointer shadow-xl flex items-center gap-1.5"
                          title="Stop video & return to thumbnail"
                          aria-label="Stop video and return to thumbnail"
                        >
                          <X className="w-3.5 h-3.5 text-amber-400 group-hover:text-black" />
                          <span>Close Player</span>
                        </button>
                      </div>

                      {/* Discreet fallback trigger if user encounters YouTube restriction */}
                      {video.youtubeId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReportRestricted();
                          }}
                          className="absolute bottom-2 left-2 z-30 opacity-30 hover:opacity-100 transition-opacity text-[9px] font-mono text-white/70 bg-black/80 hover:bg-black px-2 py-0.5 rounded border border-white/10 cursor-pointer"
                          title="If playback is restricted by YouTube, switch to direct link fallback"
                        >
                          Playback restricted?
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  /* Video Poster Thumbnail Card */
                  <div
                    onClick={handlePlayVideo}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('video/')) {
                        handleAttachVideoFile(video.id, file);
                      }
                    }}
                    className="relative block w-full h-full cursor-pointer overflow-hidden z-10 group/poster"
                    title={`Play ${video.title}`}
                  >
                    <img
                      src={getPosterUrl(video)}
                      alt={`${video.title} Poster Frame`}
                      className="w-full h-full object-cover filter brightness-[0.82] contrast-[1.06] group-hover/poster:scale-105 group-hover/poster:brightness-95 transition-all duration-700 ease-out"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (video.id === 'virdas-tour') {
                          if (!target.src.includes('hqdefault')) {
                            target.src = 'https://img.youtube.com/vi/eLAbF6DWp8A/hqdefault.jpg';
                          } else if (!target.src.includes('virdas-youtube-thumbnail.jpg')) {
                            target.src = '/virdas-youtube-thumbnail.jpg';
                          }
                        } else if (video.id === 'alan-walker-kingfisher') {
                          if (!target.src.includes('alan-walker-kingfisher.jpg')) {
                            target.src = '/alan-walker-kingfisher.jpg';
                          } else if (!target.src.includes('sddefault')) {
                            target.src = 'https://img.youtube.com/vi/chfwqrpuYM0/sddefault.jpg';
                          }
                        } else if (FALLBACK_POSTERS[video.id] && !target.src.includes(FALLBACK_POSTERS[video.id])) {
                          target.src = FALLBACK_POSTERS[video.id];
                        } else if (video.youtubeId && !target.src.includes('sddefault') && !target.src.includes('hqdefault')) {
                          target.src = `https://img.youtube.com/vi/${video.youtubeId}/sddefault.jpg`;
                        } else {
                          target.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80';
                        }
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none transition-opacity duration-300 group-hover/poster:opacity-60" />

                    {/* Center Play Icon Trigger */}
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVideo();
                        }}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:scale-110 group-hover/poster:scale-110 hover:bg-amber-400 group-hover/poster:bg-amber-400 hover:text-black group-hover/poster:text-black hover:border-amber-400 group-hover/poster:border-amber-400 transition-all duration-300 shadow-2xl cursor-pointer"
                        title={`Play ${video.title}`}
                        aria-label={`Play ${video.title}`}
                      >
                        <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                      </button>
                    </div>

                    {/* Subtle Action indicator on hover */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayVideo();
                      }}
                      className="absolute bottom-3 right-3 z-20 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 px-3 py-1.5 bg-black/90 backdrop-blur-md rounded-full border border-white/25 text-[9px] uppercase tracking-widest text-amber-300 font-mono shadow-lg hover:bg-amber-400 hover:text-black cursor-pointer"
                    >
                      <span>Play Film</span>
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </div>

                    {/* Creator Mode Attach Video Trigger */}
                    {isCreator && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveUploadId(video.id);
                          fileInputRef.current?.click();
                        }}
                        className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-black/80 hover:bg-amber-400 hover:text-black border border-white/20 hover:border-amber-400 text-white/80 rounded text-[9px] font-mono tracking-wider transition-colors cursor-pointer"
                        title="Attach / Replace video file (MP4)"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>{hasVideoSrc ? 'Replace MP4' : 'Attach MP4'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Title Strip */}
              <div className="p-4 sm:p-5 md:p-6 bg-[#0a0a0a] flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={isPlaying ? handleStopVideo : handlePlayVideo}
                    className="text-left group/title inline-flex items-center gap-2.5 text-[#f0ede8] hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <h3 className="font-serif-garamond text-2xl sm:text-3xl font-normal leading-tight group-hover/title:text-amber-300 transition-colors">
                      {video.title} {video.highlight && <span className="italic">{video.highlight}</span>}
                    </h3>
                    {isPlaying && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[9px] text-amber-300 font-mono uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Playing
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPlaying ? (
                    <button
                      type="button"
                      onClick={handleStopVideo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-black border border-amber-400/40 text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer"
                      title="Stop playback & return to thumbnail"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePlayVideo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.03] hover:bg-amber-400/20 text-white/60 hover:text-amber-300 border border-white/[0.08] hover:border-amber-400/30 text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer"
                      title={`Play ${video.title} inline`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Play</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden File Input for Creator Mode MP4 attachment */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeUploadId) {
            handleAttachVideoFile(activeUploadId, file);
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
      />
    </div>
  );
};
