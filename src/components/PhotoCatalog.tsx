import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RotateCcw,
  Move,
  Upload,
  Plus,
  Check,
  Loader2,
  Trash2,
  Grid,
  Columns3,
  Columns2,
  Columns4,
  SlidersHorizontal,
  Sparkles,
  Camera,
  ArrowUpDown,
  Shuffle,
  Palette,
  Layers,
  Filter,
  Mouse,
  MousePointer2,
  MoveVertical,
  Sun,
  Eye
} from 'lucide-react';
import defaultPortfolioContent from '../data/portfolioContent.json';
import { 
  savePhotosToStorage, 
  loadPhotosFromStorage, 
  clearPhotosFromStorage, 
  processAndOptimizeImage,
  sanitizePhotos,
  syncAllToCodebase
} from '../utils/photoStorage';
import {
  PhotoMood,
  PhotoColorSpace,
  PhotoCategory,
  MOOD_LABELS,
  COLOR_SPACE_LABELS,
  CATEGORY_LABELS,
  generateStylizedShuffle,
  clusterPhotosIntoShoots
} from '../utils/photoAnalysis';

export interface CatalogPhoto {
  id: string;
  imageUrl: string;
  aspect: '16/9' | '21/9' | '4/3' | '3/4' | '1/1' | '3/2' | '2/3' | '9/16' | '4/5';
  width?: number;
  height?: number;
  title?: string;
  mood?: PhotoMood;
  colorSpace?: PhotoColorSpace;
  category?: PhotoCategory;
  dominantColor?: string;
  shootId?: string;
}

export function determineAspectRatio(width: number, height: number): CatalogPhoto['aspect'] {
  const ratio = width / height;
  if (ratio >= 2.05) return '21/9';
  if (ratio >= 1.55) return '16/9';
  if (ratio >= 1.35) return '3/2';
  if (ratio >= 1.12) return '4/3';
  if (ratio >= 0.90) return '1/1';
  if (ratio >= 0.78) return '4/5';
  if (ratio >= 0.70) return '3/4'; // 4:3 vertical
  if (ratio >= 0.60) return '2/3'; // 3:2 vertical
  return '9/16'; // 9:16 vertical reel
}

export function getAspectBadge(aspect: CatalogPhoto['aspect'] | string, ratio?: number): string {
  if (ratio) {
    if (ratio >= 2.1) return '21:9 Cinema';
    if (ratio >= 1.55) return '16:9 Landscape';
    if (ratio >= 1.35) return '3:2 Classic 35mm';
    if (ratio >= 1.12) return '4:3 Medium Format';
    if (ratio >= 0.90 && ratio <= 1.1) return '1:1 Square';
    if (ratio <= 0.60) return '9:16 Vertical Reel';
    if (ratio <= 0.70) return '2:3 Vertical Still (3:2)';
    if (ratio <= 0.80) return '3:4 Vertical Still (4:3)';
    if (ratio <= 0.88) return '4:5 Editorial Portrait';
  }
  switch (aspect) {
    case '21/9': return '21:9 Cinema';
    case '16/9': return '16:9 Landscape';
    case '3/2': return '3:2 35mm Still';
    case '4/3': return '4:3 Medium Format';
    case '1/1': return '1:1 Square';
    case '3/4': return '3:4 Vertical Still (4:3)';
    case '2/3': return '2:3 Vertical Still (3:2)';
    case '9/16': return '9:16 Vertical Reel';
    case '4/5': return '4:5 Editorial Portrait';
    default: return 'Cinematography Still';
  }
}

// ── Curated Stills & Motion Frames: Loaded directly from portfolioContent.json for instant offline & published availability ──
const CATALOG_PHOTOS: CatalogPhoto[] = sanitizePhotos((defaultPortfolioContent.photos as CatalogPhoto[]) || []);

export type CursorScrollMode = 
  | 'parallax' 
  | 'scroll-zoom' 
  | 'pan-drift' 
  | 'ambient-glow' 
  | 'static';

export type ZoomMode = CursorScrollMode;
type PortraitColumns = 2 | 3 | 4;
type FitMode = 'fill' | 'contain';
type FlowStyle = 'rhythmic' | 'widescreen';
export type AspectFilter = 'all' | '16/9' | '9/16' | '2/3' | '3/4';
export type SortMode = 'stylized-shuffle' | 'neat-aspect' | 'newest' | 'rhythmic';
export type MoodFilter = 'all' | PhotoMood;
export type ColorSpaceFilter = 'all' | PhotoColorSpace;
export type CategoryFilter = 'all' | PhotoCategory;
export type FilterTab = 'mood' | 'color' | 'category' | 'aspect';

export interface SavedPhotographySettings {
  portraitColumns: PortraitColumns;
  fitMode: FitMode;
  flowStyle: FlowStyle;
  zoomMode: CursorScrollMode;
  aspectFilter: AspectFilter;
  sortMode: SortMode;
  shuffleSeed: number;
  activeFilterTab: FilterTab;
  moodFilter: MoodFilter;
  colorFilter: ColorSpaceFilter;
  categoryFilter: CategoryFilter;
}

const STORAGE_KEY_PHOTO_SETTINGS = 'srk_portfolio_photography_settings';

const DEFAULT_PHOTO_SETTINGS: SavedPhotographySettings = {
  portraitColumns: 2,
  fitMode: 'fill',
  flowStyle: 'rhythmic',
  zoomMode: 'parallax',
  aspectFilter: 'all',
  sortMode: 'stylized-shuffle',
  shuffleSeed: 101, // Deterministic stable seed ensuring no random jumbling across refreshes
  activeFilterTab: 'mood',
  moodFilter: 'all',
  colorFilter: 'all',
  categoryFilter: 'all'
};

function loadSavedPhotographySettings(): SavedPhotographySettings {
  if (typeof window === 'undefined') return DEFAULT_PHOTO_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHOTO_SETTINGS);
    if (!raw) return DEFAULT_PHOTO_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PHOTO_SETTINGS;

    const portraitColumns: PortraitColumns = (parsed.portraitColumns === 2 || parsed.portraitColumns === 3 || parsed.portraitColumns === 4)
      ? parsed.portraitColumns
      : DEFAULT_PHOTO_SETTINGS.portraitColumns;

    const fitMode: FitMode = (parsed.fitMode === 'fill' || parsed.fitMode === 'contain')
      ? parsed.fitMode
      : DEFAULT_PHOTO_SETTINGS.fitMode;

    const flowStyle: FlowStyle = (parsed.flowStyle === 'rhythmic' || parsed.flowStyle === 'widescreen')
      ? parsed.flowStyle
      : DEFAULT_PHOTO_SETTINGS.flowStyle;

    const zoomMode: CursorScrollMode = (['parallax', 'scroll-zoom', 'pan-drift', 'ambient-glow', 'static'] as string[]).includes(parsed.zoomMode)
      ? parsed.zoomMode
      : DEFAULT_PHOTO_SETTINGS.zoomMode;

    const aspectFilter: AspectFilter = (['all', '16/9', '9/16', '2/3', '3/4'] as string[]).includes(parsed.aspectFilter)
      ? parsed.aspectFilter
      : DEFAULT_PHOTO_SETTINGS.aspectFilter;

    const sortMode: SortMode = (['stylized-shuffle', 'neat-aspect', 'newest', 'rhythmic'] as string[]).includes(parsed.sortMode)
      ? parsed.sortMode
      : DEFAULT_PHOTO_SETTINGS.sortMode;

    const shuffleSeed: number = (typeof parsed.shuffleSeed === 'number' && !isNaN(parsed.shuffleSeed))
      ? parsed.shuffleSeed
      : DEFAULT_PHOTO_SETTINGS.shuffleSeed;

    const activeFilterTab: FilterTab = (['mood', 'color', 'category', 'aspect'] as string[]).includes(parsed.activeFilterTab)
      ? parsed.activeFilterTab
      : DEFAULT_PHOTO_SETTINGS.activeFilterTab;

    const moodFilter: MoodFilter = typeof parsed.moodFilter === 'string' && parsed.moodFilter.length > 0
      ? parsed.moodFilter
      : DEFAULT_PHOTO_SETTINGS.moodFilter;

    const colorFilter: ColorSpaceFilter = typeof parsed.colorFilter === 'string' && parsed.colorFilter.length > 0
      ? parsed.colorFilter
      : DEFAULT_PHOTO_SETTINGS.colorFilter;

    const categoryFilter: CategoryFilter = typeof parsed.categoryFilter === 'string' && parsed.categoryFilter.length > 0
      ? parsed.categoryFilter
      : DEFAULT_PHOTO_SETTINGS.categoryFilter;

    return {
      portraitColumns,
      fitMode,
      flowStyle,
      zoomMode,
      aspectFilter,
      sortMode,
      shuffleSeed,
      activeFilterTab,
      moodFilter,
      colorFilter,
      categoryFilter
    };
  } catch (err) {
    return DEFAULT_PHOTO_SETTINGS;
  }
}

interface LayoutRow {
  id: string;
  type: 'landscape-16-9' | 'portraits-row';
  items: { photo: CatalogPhoto; originalIndex: number }[];
  columns: number;
  aspectClass: string;
  badge: string;
}

/**
 * Intelligent Layout & Sorting Engine:
 * 1. Landscape photos maintain 16:9 widescreen presentation (aspect-video md:aspect-[16/9]).
 * 2. Vertical photos (9:16, 2:3/3:2, 3:4/4:3) are arranged side-by-side with mathematically
 *    identical heights, even spacing, and even alignment across columns.
 * 3. Supports Neat Aspect Sort (matching formats grouped seamlessly), Newest first, or Rhythmic flow.
 */
function buildAdjustableLayout(
  photoList: CatalogPhoto[],
  portraitColumns: PortraitColumns,
  flowStyle: FlowStyle,
  sortMode: SortMode = 'stylized-shuffle'
): LayoutRow[] {
  if (!photoList || photoList.length === 0) return [];

  if (flowStyle === 'widescreen') {
    return photoList.map((photo, idx) => ({
      id: `widescreen-${photo.id}-${idx}`,
      type: 'landscape-16-9',
      items: [{ photo, originalIndex: idx }],
      columns: 1,
      aspectClass: 'aspect-video md:aspect-[16/9]',
      badge: '16:9 Landscape'
    }));
  }

  // 1. Classify photos into landscapes (>= 1.12 aspect) and portraits (< 1.12 aspect)
  const taggedPhotos = photoList.map((photo, originalIndex) => {
    let ratio = 1.77;
    if (photo.width && photo.height && photo.height > 0) {
      ratio = photo.width / photo.height;
    } else {
      switch (photo.aspect) {
        case '21/9': ratio = 2.33; break;
        case '16/9': ratio = 1.77; break;
        case '3/2': ratio = 1.5; break;
        case '4/3': ratio = 1.33; break;
        case '1/1': ratio = 1.0; break;
        case '4/5': ratio = 0.8; break;
        case '3/4': ratio = 0.75; break;
        case '2/3': ratio = 0.66; break;
        case '9/16': ratio = 0.56; break;
        default: ratio = 1.77;
      }
    }
    const isPortrait = ratio < 1.12;
    return { photo, originalIndex, ratio, isPortrait };
  });

  const determineRowAspect = (items: typeof taggedPhotos): { aspectClass: string; badge: string } => {
    if (items.some(it => it.photo.aspect === '9/16' || it.ratio <= 0.60)) {
      return { aspectClass: 'aspect-[9/16]', badge: '9:16 Vertical Reel' };
    }
    if (items.some(it => it.photo.aspect === '2/3' || it.ratio <= 0.70)) {
      return { aspectClass: 'aspect-[2/3]', badge: '2:3 Vertical Still (3:2)' };
    }
    if (items.some(it => it.photo.aspect === '3/4' || it.ratio <= 0.80)) {
      return { aspectClass: 'aspect-[3/4]', badge: '3:4 Vertical Still (4:3)' };
    }
    if (items.some(it => it.photo.aspect === '4/5' || it.ratio <= 0.88)) {
      return { aspectClass: 'aspect-[4/5]', badge: '4:5 Editorial Portrait' };
    }
    return { aspectClass: 'aspect-square', badge: '1:1 Square Still' };
  };

  const buildPortraitRows = (pList: typeof taggedPhotos): LayoutRow[] => {
    const pRows: LayoutRow[] = [];
    let pIdx = 0;
    const total = pList.length;

    while (pIdx < total) {
      const remaining = total - pIdx;
      const take = Math.min(portraitColumns, remaining);
      const chunk = pList.slice(pIdx, pIdx + take);
      const { aspectClass, badge } = determineRowAspect(chunk);
      pRows.push({
        id: `portraits-${pIdx}-${chunk[0].photo.id}`,
        type: 'portraits-row',
        items: chunk.map(p => ({ photo: p.photo, originalIndex: p.originalIndex })),
        columns: take,
        aspectClass,
        badge
      });
      pIdx += take;
    }
    return pRows;
  };

  if (sortMode === 'stylized-shuffle') {
    // ── STYLIZED SHUFFLE: Non-repetitive editorial rhythm with anti-shoot diptych pairing ──
    const rows: LayoutRow[] = [];
    const queue = [...taggedPhotos];
    let rowIdx = 0;

    while (queue.length > 0) {
      rowIdx++;
      const first = queue.shift()!;

      if (!first.isPortrait) {
        // Landscape photo sits full width in 16:9 cinematic aspect
        rows.push({
          id: `shuffle-landscape-${first.photo.id}-${rowIdx}`,
          type: 'landscape-16-9',
          items: [{ photo: first.photo, originalIndex: first.originalIndex }],
          columns: 1,
          aspectClass: 'aspect-video md:aspect-[16/9]',
          badge: '16:9 Landscape'
        });
      } else {
        // Vertical photo: form a multi-portrait row (e.g. 2 across diptych, 3 across, or 4 across)
        const portraitChunk: typeof taggedPhotos = [first];

        while (portraitChunk.length < portraitColumns && queue.length > 0) {
          // Find next portrait in queue
          const nextPortraitIdx = queue.findIndex(q => q.isPortrait);
          if (nextPortraitIdx === -1) {
            break;
          }

          // If next portrait is from the SAME shoot as any current member of portraitChunk,
          // look ahead for an alternative portrait from a DIFFERENT shoot to create contrasting editorial diptych
          let chosenIdx = nextPortraitIdx;
          const chunkShootIds = new Set(portraitChunk.map(p => p.photo.shootId).filter(Boolean));

          if (chunkShootIds.size > 0 && queue[nextPortraitIdx].photo.shootId && chunkShootIds.has(queue[nextPortraitIdx].photo.shootId!)) {
            // Search further ahead in queue for a portrait with different shoot
            const betterIdx = queue.findIndex((q, qIdx) => qIdx > nextPortraitIdx && q.isPortrait && (!q.photo.shootId || !chunkShootIds.has(q.photo.shootId)));
            if (betterIdx !== -1) {
              chosenIdx = betterIdx;
            }
          }

          const [chosen] = queue.splice(chosenIdx, 1);
          portraitChunk.push(chosen);
        }

        const { aspectClass, badge } = determineRowAspect(portraitChunk);
        rows.push({
          id: `shuffle-portraits-${portraitChunk[0].photo.id}-${rowIdx}`,
          type: 'portraits-row',
          items: portraitChunk.map(p => ({ photo: p.photo, originalIndex: p.originalIndex })),
          columns: portraitChunk.length,
          aspectClass,
          badge
        });
      }
    }

    return rows;
  }

  if (sortMode === 'neat-aspect') {
    // ── NEAT ASPECT SORTING: Landscapes first, then vertical stills grouped by exact aspect ──
    const landscapes = taggedPhotos.filter(p => !p.isPortrait);
    const portraits = taggedPhotos.filter(p => p.isPortrait);

    // Group portraits by format: 2:3 classic stills first, then 9:16 vertical reels, then 3:4 medium format
    const sortedPortraits = [...portraits].sort((a, b) => {
      const getRatioRank = (p: typeof a) => {
        if (p.photo.aspect === '2/3' || (p.ratio > 0.60 && p.ratio <= 0.70)) return 1;
        if (p.photo.aspect === '9/16' || p.ratio <= 0.60) return 2;
        if (p.photo.aspect === '3/4' || (p.ratio > 0.70 && p.ratio <= 0.80)) return 3;
        if (p.photo.aspect === '4/5' || (p.ratio > 0.80 && p.ratio <= 0.88)) return 4;
        return 5;
      };
      return getRatioRank(a) - getRatioRank(b);
    });

    const rows: LayoutRow[] = [];

    // 1. All Landscapes edge-to-edge
    landscapes.forEach((land, idx) => {
      rows.push({
        id: `landscape-${land.photo.id}-${idx}`,
        type: 'landscape-16-9',
        items: [{ photo: land.photo, originalIndex: land.originalIndex }],
        columns: 1,
        aspectClass: 'aspect-video md:aspect-[16/9]',
        badge: '16:9 Landscape'
      });
    });

    // 2. All Portraits paired side-by-side with matched heights
    const portraitRows = buildPortraitRows(sortedPortraits);
    rows.push(...portraitRows);

    return rows;
  }

  if (sortMode === 'newest') {
    // ── NEWEST FIRST: Chronological flow, chunking adjacent portraits ──
    const rows: LayoutRow[] = [];
    let i = 0;
    while (i < taggedPhotos.length) {
      const curr = taggedPhotos[i];
      if (!curr.isPortrait) {
        rows.push({
          id: `landscape-${curr.photo.id}-${i}`,
          type: 'landscape-16-9',
          items: [{ photo: curr.photo, originalIndex: curr.originalIndex }],
          columns: 1,
          aspectClass: 'aspect-video md:aspect-[16/9]',
          badge: '16:9 Landscape'
        });
        i++;
      } else {
        const portraitChunk: typeof taggedPhotos = [];
        while (i < taggedPhotos.length && taggedPhotos[i].isPortrait && portraitChunk.length < portraitColumns) {
          portraitChunk.push(taggedPhotos[i]);
          i++;
        }
        const { aspectClass, badge } = determineRowAspect(portraitChunk);
        rows.push({
          id: `portraits-${i}-${portraitChunk[0].photo.id}`,
          type: 'portraits-row',
          items: portraitChunk.map(p => ({ photo: p.photo, originalIndex: p.originalIndex })),
          columns: portraitChunk.length,
          aspectClass,
          badge
        });
      }
    }
    return rows;
  }

  // Fallback: 'rhythmic'
  const landscapes = taggedPhotos.filter(p => !p.isPortrait);
  const portraits = taggedPhotos.filter(p => p.isPortrait);
  const portraitRows = buildPortraitRows(portraits);

  const rows: LayoutRow[] = [];
  let lIdx = 0;
  let rIdx = 0;

  while (lIdx < landscapes.length || rIdx < portraitRows.length) {
    if (lIdx < landscapes.length) {
      const land = landscapes[lIdx];
      rows.push({
        id: `landscape-${land.photo.id}-${lIdx}`,
        type: 'landscape-16-9',
        items: [{ photo: land.photo, originalIndex: land.originalIndex }],
        columns: 1,
        aspectClass: 'aspect-video md:aspect-[16/9]',
        badge: '16:9 Landscape'
      });
      lIdx++;
    }

    if (rIdx < portraitRows.length) {
      rows.push(portraitRows[rIdx]);
      rIdx++;
    }
  }

  return rows;
}

export interface PhotoCatalogProps {
  isCreator?: boolean;
  onToggleCreator?: () => void;
}

export function PhotoCatalog({ isCreator = false, onToggleCreator }: PhotoCatalogProps) {
  const [photos, setPhotos] = useState<CatalogPhoto[]>(() => {
    if (isCreator && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('srk_portfolio_catalog_photos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = sanitizePhotos(parsed);
            if (sanitized.length > 0) return sanitized;
          }
        }
      } catch {}
    }
    return CATALOG_PHOTOS;
  });

  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(new Set());

  const [isCustomList, setIsCustomList] = useState<boolean>(() => {
    if (isCreator && typeof window !== 'undefined') {
      try {
        return localStorage.getItem('srk_has_custom_photos') === 'true';
      } catch {}
    }
    return false;
  });

  // Pre-load validated saved photography settings from localStorage
  const initialSettings = useMemo(() => loadSavedPhotographySettings(), []);

  // Adjustable layout states restored from localStorage
  const [portraitColumns, setPortraitColumns] = useState<PortraitColumns>(() => initialSettings.portraitColumns);
  const [fitMode, setFitMode] = useState<FitMode>(() => initialSettings.fitMode);
  const [flowStyle, setFlowStyle] = useState<FlowStyle>(() => initialSettings.flowStyle);
  const [zoomMode, setZoomMode] = useState<CursorScrollMode>(() => initialSettings.zoomMode);
  const [aspectFilter, setAspectFilter] = useState<AspectFilter>(() => initialSettings.aspectFilter);
  const [sortMode, setSortMode] = useState<SortMode>(() => initialSettings.sortMode);
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => initialSettings.shuffleSeed);

  // Curation Filters: Mood, Color Space, Category, Aspect restored from localStorage
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>(() => initialSettings.activeFilterTab);
  const [moodFilter, setMoodFilter] = useState<MoodFilter>(() => initialSettings.moodFilter);
  const [colorFilter, setColorFilter] = useState<ColorSpaceFilter>(() => initialSettings.colorFilter);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(() => initialSettings.categoryFilter);

  // Persist all photography settings immediately upon user modification
  useEffect(() => {
    try {
      const payload: SavedPhotographySettings = {
        portraitColumns,
        fitMode,
        flowStyle,
        zoomMode,
        aspectFilter,
        sortMode,
        shuffleSeed,
        activeFilterTab,
        moodFilter,
        colorFilter,
        categoryFilter
      };
      localStorage.setItem(STORAGE_KEY_PHOTO_SETTINGS, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save photography settings to localStorage:', err);
    }
  }, [
    portraitColumns,
    fitMode,
    flowStyle,
    zoomMode,
    aspectFilter,
    sortMode,
    shuffleSeed,
    activeFilterTab,
    moodFilter,
    colorFilter,
    categoryFilter
  ]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos asynchronously from storage ONLY in Creator Mode
  useEffect(() => {
    if (!isCreator) {
      setPhotos(CATALOG_PHOTOS);
      setIsCustomList(false);
      return;
    }

    let active = true;
    loadPhotosFromStorage().then((stored) => {
      if (!active) return;
      if (stored && Array.isArray(stored) && stored.length > 0) {
        const cleaned = sanitizePhotos(stored);
        if (cleaned.length > 0) {
          setPhotos(cleaned);
          setIsCustomList(true);
          return;
        }
      }
      if (photos.length === 0 && CATALOG_PHOTOS.length > 0) {
        setPhotos(CATALOG_PHOTOS);
      }
    }).catch((err) => {
      console.warn('Storage load error:', err);
      if (photos.length === 0 && CATALOG_PHOTOS.length > 0) {
        setPhotos(CATALOG_PHOTOS);
      }
    });

    return () => {
      active = false;
    };
  }, [isCreator]);

  // Monitor scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!catalogRef.current) return;
      const rect = catalogRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height;
      const scrolled = windowHeight - rect.top;
      const progress = Math.min(Math.max(scrolled / (totalHeight + windowHeight), 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter out any dead photos (guarantees NO blank black frames)
  const visiblePhotos = photos.filter(p => !failedPhotoIds.has(p.id));

  // Multi-dimensional filtering: Aspect, Mood, Color Space, and Category
  const filteredPhotos = visiblePhotos.filter((p) => {
    // 1. Aspect Ratio Filter
    if (aspectFilter !== 'all') {
      let ratio = 1.77;
      if (p.width && p.height && p.height > 0) {
        ratio = p.width / p.height;
      } else {
        switch (p.aspect) {
          case '16/9': ratio = 1.77; break;
          case '21/9': ratio = 2.33; break;
          case '3/2': ratio = 1.5; break;
          case '4/3': ratio = 1.33; break;
          case '1/1': ratio = 1.0; break;
          case '4/5': ratio = 0.8; break;
          case '3/4': ratio = 0.75; break;
          case '2/3': ratio = 0.66; break;
          case '9/16': ratio = 0.56; break;
          default: ratio = 1.77;
        }
      }
      if (aspectFilter === '16/9' && ratio < 1.12) return false;
      if (aspectFilter === '9/16' && (p.aspect !== '9/16' && ratio > 0.60)) return false;
      if (aspectFilter === '2/3' && (p.aspect !== '2/3' && (ratio <= 0.60 || ratio > 0.70))) return false;
      if (aspectFilter === '3/4' && (p.aspect !== '3/4' && (ratio <= 0.70 || ratio >= 1.12))) return false;
    }

    // 2. Mood Filter
    if (moodFilter !== 'all' && p.mood !== moodFilter) {
      return false;
    }

    // 3. Color Space Filter
    if (colorFilter !== 'all' && p.colorSpace !== colorFilter) {
      return false;
    }

    // 4. Category Filter
    if (categoryFilter !== 'all' && p.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  // Apply intelligent stylized anti-repetition shuffle when in 'stylized-shuffle' mode
  const sortedPhotos = React.useMemo(() => {
    if (sortMode === 'stylized-shuffle') {
      return generateStylizedShuffle(filteredPhotos, shuffleSeed);
    }
    return filteredPhotos;
  }, [filteredPhotos, sortMode, shuffleSeed]);

  // Build the edge-to-edge adjustable layout rows with matched heights & zero negative space
  const layoutRows = buildAdjustableLayout(sortedPhotos, portraitColumns, flowStyle, sortMode);

  // One-click Trigger to generate a fresh stylized editorial jumble
  const handleTriggerShuffle = () => {
    setSortMode('stylized-shuffle');
    setShuffleSeed(prev => prev + 1);
    setNotification('Shuffled by mood, color space & anti-repetitive shoot cadence');
    setTimeout(() => setNotification(null), 3200);
  };

  const handleImageError = useCallback((id: string) => {
    setFailedPhotoIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const nextPhoto = useCallback(() => {
    if (selectedPhotoIndex === null || sortedPhotos.length === 0) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % sortedPhotos.length);
  }, [selectedPhotoIndex, sortedPhotos.length]);

  const prevPhoto = useCallback(() => {
    if (selectedPhotoIndex === null || sortedPhotos.length === 0) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + sortedPhotos.length) % sortedPhotos.length);
  }, [selectedPhotoIndex, sortedPhotos.length]);

  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingStatus(`Processing ${validFiles.length} photo${validFiles.length > 1 ? 's' : ''}...`);

    const batchShootId = `shoot-${Date.now()}`;

    try {
      const newItems: CatalogPhoto[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setProcessingStatus(`Analyzing color & mood (${i + 1} of ${validFiles.length})...`);
        const optimized = await processAndOptimizeImage(file);
        newItems.push({
          id: `photo-import-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          imageUrl: optimized.dataUrl,
          aspect: optimized.aspect,
          width: optimized.width,
          height: optimized.height,
          dominantColor: optimized.dominantColor,
          colorSpace: optimized.colorSpace,
          mood: optimized.mood,
          category: optimized.category,
          shootId: batchShootId
        });
      }

      setProcessingStatus('Saving permanently...');
      const updated = sanitizePhotos([...newItems, ...photos]);
      setPhotos(updated);
      setIsCustomList(true);

      await savePhotosToStorage(updated);
      syncAllToCodebase({ photos: updated }).catch(() => {});
      setShuffleSeed(Date.now());
      setNotification(`Imported ${newItems.length} photograph${newItems.length > 1 ? 's' : ''} with stylized flow`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Error importing photos:', err);
      setNotification('Failed to process some images');
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (indexToDelete: number) => {
    const photoToDelete = sortedPhotos[indexToDelete];
    if (!photoToDelete) return;
    const updated = photos.filter(p => p.id !== photoToDelete.id);
    setPhotos(updated);
    setIsCustomList(updated.length > 0);
    if (selectedPhotoIndex !== null) {
      if (selectedPhotoIndex >= sortedPhotos.length - 1) {
        setSelectedPhotoIndex(sortedPhotos.length > 1 ? sortedPhotos.length - 2 : null);
      }
    }
    await savePhotosToStorage(updated);
    setNotification('Photo removed');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClearAllPhotos = async () => {
    await clearPhotosFromStorage();
    setPhotos([]);
    setFailedPhotoIds(new Set());
    setIsCustomList(false);
    setSelectedPhotoIndex(null);
    setNotification('All photographs cleared');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleResetDefault = handleClearAllPhotos;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div 
      ref={catalogRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative w-full bg-[#070707] transition-all duration-300 select-none ${
        isDragOver ? 'ring-2 ring-amber-400/50 bg-[#0d0d0d]' : ''
      }`}
    >
      {/* Hidden File Input */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleProcessFiles(e.target.files);
          }
        }}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161616] text-[#f0ede8] px-4 py-3 rounded-lg border border-white/15 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in text-xs">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Upload Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-sm font-medium tracking-wide">{processingStatus}</p>
          <p className="text-xs text-white/50">Filling frames with zero negative space...</p>
        </div>
      )}

      {/* Drag & Drop Visual Cue */}
      {isDragOver && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm pointer-events-none flex flex-col items-center justify-center text-amber-400 gap-3 border-4 border-dashed border-amber-400/50 m-4 rounded-xl">
          <Upload className="w-12 h-12 animate-bounce" />
          <p className="text-lg font-serif-garamond tracking-wider">Drop photographs to add to portfolio</p>
          <p className="text-xs text-amber-400/70">Edge-to-edge arrangement · Fills frames seamlessly</p>
        </div>
      )}

      {/* ── CUSTOMIZATION TAB & CURATION RIBBON: STYLIZED JUMBLE, PREVIEW OPTIONS & FILTERS (DEVELOPER/CREATOR ONLY) ── */}
      {isCreator && (
        <>
          {/* ── SUB-HEADER TOOLBAR: ADJUSTABLE LAYOUT CONTROLS ── */}
          <div className="sticky top-16 md:top-20 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 md:px-12 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Frame Status & Clear */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#f0ede8]/70 font-light flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${visiblePhotos.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>Photography Stills</span>
            <span className="text-white/20">·</span>
            <span className="font-mono text-amber-400/90">{visiblePhotos.length} {visiblePhotos.length === 1 ? 'Frame' : 'Frames'}</span>
          </span>

          <span className="hidden sm:inline text-white/20">|</span>
          <span className="hidden lg:inline text-[10px] text-white/40 tracking-wider">
            16:9 Cinema Landscapes &amp; Evenly Aligned Portraits
          </span>

          {isCreator && visiblePhotos.length > 0 && (
            <button
              onClick={handleClearAllPhotos}
              disabled={isProcessing}
              className="p-1.5 rounded bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-white/50 hover:text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Clear all photographs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Interactive Scroll Depth */}
        <div className="hidden xl:flex items-center gap-2 text-[10px] text-white/40">
          <span>Scroll Depth:</span>
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400/60 to-amber-400 transition-all duration-300"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
          <span className="tabular-nums font-mono text-white/70">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>

        {/* Right: Sort & Layout Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* Quick Stylized Shuffle Action Button */}
          <button
            onClick={handleTriggerShuffle}
            className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-200 text-black font-semibold text-[10px] uppercase tracking-wider transition-all shadow-md shadow-amber-400/20 hover:shadow-amber-400/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Intelligently shuffle portfolio: distributes shoots, balances color spaces, and harmonizes mood rhythms"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Portfolio</span>
          </button>

          {/* Sorting Engine Switcher */}
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded border border-white/10">
            <span className="hidden md:inline px-2 text-[9px] uppercase tracking-wider text-white/40 flex items-center gap-1">
              <ArrowUpDown className="w-2.5 h-2.5" />
              <span>Sort:</span>
            </span>
            <button
              onClick={() => {
                setSortMode('stylized-shuffle');
                setShuffleSeed(prev => prev + 1);
              }}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                sortMode === 'stylized-shuffle'
                  ? 'bg-amber-400/25 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Stylized Jumble: Intelligently alternates mood, color space, and prevents continuous photos from same shoot"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Stylized Jumble</span>
            </button>
            <button
              onClick={() => setSortMode('neat-aspect')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                sortMode === 'neat-aspect'
                  ? 'bg-amber-400/20 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Neat Aspect Sort: 16:9 Landscapes first, then matched pairs of vertical stills"
            >
              Neat Aspect
            </button>
            <button
              onClick={() => setSortMode('newest')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                sortMode === 'newest'
                  ? 'bg-amber-400/20 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Newest uploads first"
            >
              Newest
            </button>
            <button
              onClick={() => setSortMode('rhythmic')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                sortMode === 'rhythmic'
                  ? 'bg-amber-400/20 text-amber-300 font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Alternating Landscape and Vertical rows"
            >
              Rhythm
            </button>
          </div>

          {/* Portrait Grid Adjustment: 2 Across vs 3 Across vs 4 Across */}
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded border border-white/10">
            <span className="hidden sm:inline px-2 text-[9px] uppercase tracking-wider text-white/40">
              Portraits:
            </span>
            <button
              onClick={() => setPortraitColumns(2)}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                portraitColumns === 2
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="2 Portraits Across (50% / 50% Pairs - Grand Diptychs)"
            >
              <Columns2 className="w-3 h-3" />
              <span>2 Across</span>
            </button>
            <button
              onClick={() => setPortraitColumns(3)}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                portraitColumns === 3
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="3 Portraits Across (33% / 33% / 33% Triptychs)"
            >
              <Columns3 className="w-3 h-3" />
              <span>3 Across</span>
            </button>
            <button
              onClick={() => setPortraitColumns(4)}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                portraitColumns === 4
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="4 Portraits Across (25% Quad Grid)"
            >
              <Columns4 className="w-3 h-3" />
              <span className="hidden sm:inline">4</span>
            </button>
          </div>

          {/* Fit Mode Adjustment: Fill Edge-to-Edge vs Contain */}
          <div className="hidden sm:flex items-center bg-white/[0.04] p-0.5 rounded border border-white/10">
            <button
              onClick={() => setFitMode('fill')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                fitMode === 'fill'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Fill & Bleed — Zero gaps, frames filled edge-to-edge"
            >
              Fill
            </button>
            <button
              onClick={() => setFitMode('contain')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                fitMode === 'contain'
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Contain Uncropped — Ambient photographic tone fills background, zero black voids"
            >
              Contain
            </button>
          </div>

          {/* Cursor & Scroll Interaction Modes */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded border border-white/10">
            <span className="hidden xl:inline px-2 text-[9px] uppercase tracking-wider text-amber-300/80 font-medium flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Cursor:</span>
            </span>
            <button
              onClick={() => setZoomMode('parallax')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                zoomMode === 'parallax'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Parallax Flow: Smooth multi-axis drift linked to page scroll and cursor direction"
            >
              <MoveVertical className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Parallax</span>
            </button>
            <button
              onClick={() => setZoomMode('scroll-zoom')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                zoomMode === 'scroll-zoom'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Scroll Wheel Zoom: Hover any photo and scroll mouse wheel or trackpad to zoom up to 2.5x"
            >
              <Mouse className="w-2.5 h-2.5" />
              <span>Scroll Zoom</span>
            </button>
            <button
              onClick={() => setZoomMode('pan-drift')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                zoomMode === 'pan-drift'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Cinema Glide: Move cursor across photo to smoothly pan compositions"
            >
              <Move className="w-2.5 h-2.5" />
              <span className="hidden md:inline">Glide Pan</span>
            </button>
            <button
              onClick={() => setZoomMode('ambient-glow')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                zoomMode === 'ambient-glow'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Ambient Sheen: Tactile gallery lighting sheen follows cursor with subtle tilt"
            >
              <Sun className="w-2.5 h-2.5" />
              <span className="hidden md:inline">Ambient</span>
            </button>
            <button
              onClick={() => setZoomMode('static')}
              className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                zoomMode === 'static'
                  ? 'bg-amber-400/25 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Static View: Clean, unmanipulated photographic presentation with zero motion"
            >
              <Eye className="w-2.5 h-2.5" />
              <span className="hidden lg:inline">Static</span>
            </button>
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 transition-colors cursor-pointer"
            title="Upload photographs"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── CURATION RIBBON: MOOD, COLOR SPACE, CATEGORY, ASPECT ── */}
      <div className="bg-[#0b0b0b] border-b border-white/[0.06] px-4 sm:px-6 md:px-12 py-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Filter Mode Selector */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded border border-white/[0.08]">
            <button
              onClick={() => setActiveFilterTab('mood')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'mood'
                  ? 'bg-amber-400/20 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Mood Space</span>
              {moodFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              onClick={() => setActiveFilterTab('color')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'color'
                  ? 'bg-amber-400/20 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Palette className="w-3 h-3 text-cyan-400" />
              <span>Color Space</span>
              {colorFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>

            <button
              onClick={() => setActiveFilterTab('category')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'category'
                  ? 'bg-amber-400/20 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Category</span>
              {categoryFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setActiveFilterTab('aspect')}
              className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'aspect'
                  ? 'bg-amber-400/20 text-amber-300 font-medium border border-amber-400/30'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Filter className="w-3 h-3 text-white/50" />
              <span>Aspect Format</span>
              {aspectFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

          {/* Anti-Repetition Status Badge */}
          <div className="flex items-center gap-2 text-[10px] text-white/50 shrink-0">
            <button
              onClick={handleTriggerShuffle}
              className="group flex items-center gap-1.5 px-2 py-1 rounded bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 transition-all text-amber-300/90 hover:text-amber-200 cursor-pointer"
              title="Click to reshuffle: prevents consecutive photos from the same photoshoot and interweaves moods"
            >
              <Shuffle className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500 text-amber-400" />
              <span className="tracking-wide">Anti-Shoot Repetition Active</span>
            </button>
            <span className="text-white/20 font-mono">·</span>
            <span className="font-mono text-amber-400/90">{filteredPhotos.length} Active / {layoutRows.length} Rows</span>
          </div>
        </div>

        {/* Dynamic Filter Sub-Options */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {activeFilterTab === 'mood' && (
            <>
              <button
                onClick={() => setMoodFilter('all')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  moodFilter === 'all'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                All Moods ({visiblePhotos.length})
              </button>
              {(Object.keys(MOOD_LABELS) as PhotoMood[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMoodFilter(m)}
                  className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    moodFilter === m
                      ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40 font-medium'
                      : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  <span>{MOOD_LABELS[m]?.label || m}</span>
                </button>
              ))}
            </>
          )}

          {activeFilterTab === 'color' && (
            <>
              <button
                onClick={() => setColorFilter('all')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  colorFilter === 'all'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                All Color Spaces
              </button>
              {(Object.keys(COLOR_SPACE_LABELS) as PhotoColorSpace[]).map(c => {
                let dotColor = '#f59e0b';
                if (c === 'cool-cyan') dotColor = '#06b6d4';
                if (c === 'monochrome') dotColor = '#ffffff';
                if (c === 'earthy-muted') dotColor = '#84cc16';
                if (c === 'vivid-spectrum') dotColor = '#ec4899';
                if (c === 'deep-noir') dotColor = '#64748b';
                if (c === 'high-key') dotColor = '#f8fafc';

                return (
                  <button
                    key={c}
                    onClick={() => setColorFilter(c)}
                    className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      colorFilter === c
                        ? 'bg-cyan-400/25 text-cyan-200 border border-cyan-400/40 font-medium'
                        : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full inline-block border border-white/20"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span>{COLOR_SPACE_LABELS[c]?.label || c}</span>
                  </button>
                );
              })}
            </>
          )}

          {activeFilterTab === 'category' && (
            <>
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                All Categories
              </button>
              {(Object.keys(CATEGORY_LABELS) as PhotoCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded text-[10px] tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 font-medium'
                      : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </>
          )}

          {activeFilterTab === 'aspect' && (
            <>
              <button
                onClick={() => setAspectFilter('all')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  aspectFilter === 'all'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                All Stills ({visiblePhotos.length})
              </button>
              <button
                onClick={() => setAspectFilter('16/9')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  aspectFilter === '16/9'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                16:9 Landscapes
              </button>
              <button
                onClick={() => setAspectFilter('9/16')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  aspectFilter === '9/16'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                9:16 Vertical Reels
              </button>
              <button
                onClick={() => setAspectFilter('2/3')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  aspectFilter === '2/3'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                3:2 / 2:3 Vertical
              </button>
              <button
                onClick={() => setAspectFilter('3/4')}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  aspectFilter === '3/4'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-medium'
                    : 'bg-white/[0.03] text-white/60 hover:text-white border border-white/[0.08]'
                }`}
              >
                4:3 / 3:4 Vertical
              </button>
            </>
          )}
        </div>

        {/* Cursor & Scroll Interaction Helper Tip */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.04] text-[10px] text-white/50 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-amber-300 font-medium uppercase tracking-wider text-[9px]">
              {zoomMode === 'parallax' && 'Parallax Flow Active'}
              {zoomMode === 'scroll-zoom' && 'Scroll Zoom Active'}
              {zoomMode === 'pan-drift' && 'Cinema Glide Active'}
              {zoomMode === 'ambient-glow' && 'Ambient Sheen Active'}
              {zoomMode === 'static' && 'Static View Active'}
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/60">
              {zoomMode === 'parallax' && 'Multi-axis drift fluidly responsive to page scrolling and cursor direction'}
              {zoomMode === 'scroll-zoom' && 'Hover any frame and scroll your mouse wheel or trackpad to zoom smoothly up to 2.5x (Double-click to reset)'}
              {zoomMode === 'pan-drift' && 'Move cursor across the frame to dynamically glide and pan wide compositions'}
              {zoomMode === 'ambient-glow' && 'Subtle gallery spotlight sheen follows cursor with soft 3D perspective'}
              {zoomMode === 'static' && 'Zero motion, pure photographic presentation'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[9px] text-white/40 uppercase tracking-widest font-mono">
            <span>Interaction:</span>
            <span className="text-amber-400 font-semibold">{zoomMode}</span>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ── DROPZONE / UPLOAD BANNER (Visible only to Creator) ── */}
      {isCreator && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 sm:px-6 md:px-12 py-3.5 bg-gradient-to-r from-[#0d0d0d] via-[#121212] to-[#0d0d0d] border-b border-amber-400/20 hover:border-amber-400/40 transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 text-left group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-full bg-amber-400/10 group-hover:bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 transition-all">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-[#f0ede8] font-medium tracking-wide">
                  Upload Photographs to Portfolio
                </p>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono border border-amber-400/30">
                  Auto-Saved &amp; Persistent
                </span>
              </div>
              <p className="text-[10px] text-[#f0ede8]/50 mt-0.5">
                Drag &amp; drop files or click to browse · 16:9 Landscapes auto-widescreen · 2:3, 9:16, 3:4 Verticals neatly sorted &amp; paired
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded bg-white/10 group-hover:bg-amber-400 group-hover:text-black text-[11px] font-medium text-white transition-all">
              Browse Files
            </span>
            <span className="text-[10px] uppercase tracking-widest text-amber-400/80 font-mono hidden sm:inline">
              {filteredPhotos.length} {filteredPhotos.length === 1 ? 'Still' : 'Stills'}
            </span>
          </div>
        </div>
      )}

      {/* ── THE CONTINUOUS CLEAN SCROLL LAYOUT (100% Edge-to-Edge, Zero Negative Space) ── */}
      {visiblePhotos.length === 0 ? (
        /* ── STUDIO EMPTY STATE (TEMPLATE PHOTOS REMOVED) ── */
        isCreator ? (
          <div className="w-full py-10 md:py-14 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#0a0a0a] via-[#0d0d0d] to-[#080808] border-b border-white/[0.08]">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-amber-400/20 flex items-center justify-center text-amber-400 mb-4 shadow-xl relative group">
              <Camera className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute -inset-1 bg-amber-400/10 rounded-2xl blur-lg -z-10" />
            </div>

            <span className="text-[11px] uppercase tracking-[0.25em] text-amber-400/90 font-mono mb-2">
              Photography Stills Archive
            </span>

            <h3 className="font-serif-garamond text-2xl sm:text-3xl md:text-4xl text-[#f0ede8] font-normal tracking-wide max-w-xl">
              Upload Your Original Stills &amp; Photography
            </h3>

            <p className="text-xs sm:text-sm text-[#f0ede8]/50 max-w-lg mt-2 font-light leading-relaxed">
              All sample template photos have been cleared. Upload your personal photography work — the layout engine automatically locks landscapes into 16:9 widescreen and pairs vertical stills side-by-side with matched heights.
            </p>

            {/* Supported Formats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 max-w-2xl w-full">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-left">
                <span className="text-[10px] font-mono uppercase text-amber-400/80 block">16:9 Cinema</span>
                <p className="text-xs text-white/70 mt-0.5">Full-width widescreen</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-left">
                <span className="text-[10px] font-mono uppercase text-amber-400/80 block">2:3 Classic 35mm</span>
                <p className="text-xs text-white/70 mt-0.5">Side-by-side diptych</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-left">
                <span className="text-[10px] font-mono uppercase text-amber-400/80 block">9:16 Vertical Reel</span>
                <p className="text-xs text-white/70 mt-0.5">Tall mobile cinematography</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-left">
                <span className="text-[10px] font-mono uppercase text-amber-400/80 block">3:4 / 4:3 Medium</span>
                <p className="text-xs text-white/70 mt-0.5">Editorial portraits</p>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 rounded-full bg-amber-400 text-black font-medium text-xs tracking-wider uppercase hover:bg-amber-300 transition-all shadow-lg hover:shadow-amber-400/20 cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Browse &amp; Upload Photographs</span>
              </button>
              <span className="text-xs text-white/40">or drag &amp; drop image files directly here</span>
            </div>
          </div>
        ) : (
          <div className="w-full py-12 sm:py-16 px-6 flex flex-col items-center justify-center text-center bg-[#090909] border-b border-white/[0.08]">
            <span className="text-[11px] uppercase tracking-[0.25em] text-amber-400/80 font-mono mb-2">
              Photography Archive
            </span>
            <h3 className="font-serif-garamond text-2xl sm:text-3xl md:text-4xl text-[#f0ede8] font-normal tracking-wide max-w-xl">
              Selected Frames &amp; Motion Stills
            </h3>
            <p className="text-xs sm:text-sm text-[#f0ede8]/40 max-w-md mt-1.5 font-light">
              Curated cinematography stills and portfolio by Sriram Karthick.
            </p>
          </div>
        )
      ) : filteredPhotos.length === 0 ? (
        <div className="w-full py-16 px-6 text-center bg-[#090909] border-b border-white/[0.08]">
          <p className="text-sm text-white/60">No photographs matching the selected aspect ratio format.</p>
          <button
            onClick={() => setAspectFilter('all')}
            className="mt-3 px-3 py-1.5 rounded bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
          >
            Show All Stills ({visiblePhotos.length})
          </button>
        </div>
      ) : (
        <div className="w-full divide-y divide-white/[0.08]">
          {layoutRows.map((row) => {
            // ── CASE 1: 16:9 Horizontal Landscape Frame ──
            if (row.type === 'landscape-16-9') {
              const item = row.items[0];
              return (
                <div 
                  key={row.id} 
                  className="relative w-full aspect-video md:aspect-[16/9] bg-[#070707] overflow-hidden"
                >
                  <InteractiveCatalogFrame
                    photo={item.photo}
                    index={item.originalIndex}
                    totalPhotos={visiblePhotos.length}
                    scrollProgress={scrollProgress}
                    overrideMode={zoomMode}
                    fitMode={fitMode}
                    isLandscapeFullWidth
                    onSelect={() => openLightbox(item.originalIndex)}
                    onDelete={isCreator ? () => handleDeletePhoto(item.originalIndex) : undefined}
                    onError={handleImageError}
                  />
                </div>
              );
            }

            // ── CASE 2: Single Portrait Item Centered with Fine Gallery Matte Framing ──
            if (row.items.length === 1) {
              const item = row.items[0];
              return (
                <div 
                  key={row.id} 
                  className="w-full py-8 sm:py-12 md:py-16 bg-[#070707] flex items-center justify-center px-4"
                >
                  <div className={`w-full max-w-sm sm:max-w-md md:max-w-lg ${row.aspectClass || 'aspect-[2/3]'} border border-white/10 shadow-2xl relative overflow-hidden bg-black`}>
                    <InteractiveCatalogFrame
                      photo={item.photo}
                      index={item.originalIndex}
                      totalPhotos={visiblePhotos.length}
                      scrollProgress={scrollProgress}
                      overrideMode={zoomMode}
                      fitMode={fitMode}
                      isLandscapeFullWidth={false}
                      onSelect={() => openLightbox(item.originalIndex)}
                      onDelete={isCreator ? () => handleDeletePhoto(item.originalIndex) : undefined}
                      onError={handleImageError}
                    />
                  </div>
                </div>
              );
            }

            // ── CASE 3: Multi-Portrait Row (Side-by-Side Next to Each Other, Matched Height & Flush Edges) ──
            return (
              <div 
                key={row.id} 
                className={`w-full grid ${
                  row.columns === 2 
                    ? 'grid-cols-2' 
                    : row.columns === 3 
                      ? 'grid-cols-3' 
                      : 'grid-cols-2 md:grid-cols-4'
                } divide-x divide-white/[0.08] bg-[#070707] overflow-hidden`}
              >
                {row.items.map((item) => (
                  <div 
                    key={`frame-${item.photo.id}`}
                    className={`relative w-full overflow-hidden ${row.aspectClass || 'aspect-[2/3]'}`}
                  >
                    <InteractiveCatalogFrame
                      photo={item.photo}
                      index={item.originalIndex}
                      totalPhotos={visiblePhotos.length}
                      scrollProgress={scrollProgress}
                      overrideMode={zoomMode}
                      fitMode={fitMode}
                      isLandscapeFullWidth={false}
                      onSelect={() => openLightbox(item.originalIndex)}
                      onDelete={isCreator ? () => handleDeletePhoto(item.originalIndex) : undefined}
                      onError={handleImageError}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── IMMERSIVE LIGHTBOX (100% Uncropped with Filmstrip) ── */}
      {selectedPhotoIndex !== null && sortedPhotos[selectedPhotoIndex] && (
        <MinimalistLightbox
          photos={sortedPhotos}
          currentIndex={selectedPhotoIndex}
          onSelectIndex={setSelectedPhotoIndex}
          onClose={closeLightbox}
          onNext={nextPhoto}
          onPrev={prevPhoto}
          onDelete={isCreator ? () => handleDeletePhoto(selectedPhotoIndex) : undefined}
          onReshuffle={isCreator ? handleTriggerShuffle : undefined}
        />
      )}
    </div>
  );
}

// ─── Individual Catalog Frame (Zero Negative Space, Edge-to-Edge Fill) ───
interface FrameProps {
  photo: CatalogPhoto;
  index: number;
  totalPhotos: number;
  scrollProgress: number;
  overrideMode: ZoomMode;
  fitMode: FitMode;
  isLandscapeFullWidth: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onError?: (id: string) => void;
}

function InteractiveCatalogFrame({
  photo,
  index,
  totalPhotos,
  scrollProgress,
  overrideMode,
  fitMode,
  isLandscapeFullWidth,
  onSelect,
  onDelete,
  onError
}: FrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 }); // percentage (0-100)
  const [tilt, setTilt] = useState({ x: 0, y: 0 }); // tilt degrees
  const [wheelZoom, setWheelZoom] = useState(1.0); // interactive scroll-to-zoom level
  const [viewportOffset, setViewportOffset] = useState(0); // -1.5 (above) to +1.5 (below viewport)
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Intrinsic ratio
  const [aspectRatioValue, setAspectRatioValue] = useState<number>(() => {
    if (photo.width && photo.height && photo.height > 0) {
      return photo.width / photo.height;
    }
    switch (photo.aspect) {
      case '21/9': return 21 / 9;
      case '16/9': return 16 / 9;
      case '3/2': return 3 / 2;
      case '4/3': return 4 / 3;
      case '1/1': return 1;
      case '4/5': return 4 / 5;
      case '3/4': return 3 / 4;
      case '2/3': return 2 / 3;
      case '9/16': return 9 / 16;
      default: return 16 / 9;
    }
  });

  // Track viewport vertical offset for smooth parallax scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const calculateOffset = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const frameCenter = rect.top + rect.height / 2;
      const viewportCenter = windowHeight / 2;
      const offset = (frameCenter - viewportCenter) / (windowHeight / 2);
      setViewportOffset(Math.max(-1.5, Math.min(1.5, offset)));
    };
    calculateOffset();
    window.addEventListener('scroll', calculateOffset, { passive: true });
    window.addEventListener('resize', calculateOffset, { passive: true });
    return () => {
      window.removeEventListener('scroll', calculateOffset);
      window.removeEventListener('resize', calculateOffset);
    };
  }, []);

  // Non-passive wheel event listener for direct scroll-to-zoom on hover
  useEffect(() => {
    const el = containerRef.current;
    if (!el || overrideMode !== 'scroll-zoom') return;

    const onWheel = (e: WheelEvent) => {
      if (!isHovered) return;
      e.preventDefault();
      e.stopPropagation();
      const sensitivity = 0.0022;
      setWheelZoom((prev) => {
        const next = prev - e.deltaY * sensitivity;
        return Math.max(1.0, Math.min(2.5, next));
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [overrideMode, isHovered]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatioValue(img.naturalWidth / img.naturalHeight);
    }
    setIsLoaded(true);
  };

  const handleImageError = () => {
    setHasError(true);
    onError?.(photo.id);
  };

  // If the image fails to load, completely omit from render (eliminates blank black frame)
  if (hasError) {
    return null;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });

    if (overrideMode === 'ambient-glow') {
      const tiltX = ((e.clientY - rect.top) / rect.height - 0.5) * -5;
      const tiltY = ((e.clientX - rect.left) / rect.width - 0.5) * 5;
      setTilt({ x: tiltX, y: tiltY });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setWheelZoom(1.0);
  };

  // Dynamic transform & transition based on the user-selected Cursor & Scroll Mode
  let imgTransform = 'scale(1)';
  let imgOrigin = 'center center';
  let transitionStyle = 'transform 400ms ease-out, filter 400ms ease-out, opacity 400ms ease-out';

  if (overrideMode === 'parallax') {
    // Parallax: smooth vertical drift with page scroll + slight cursor float
    const scrollShiftY = viewportOffset * -20;
    const cursorFloatX = isHovered ? (mousePos.x - 50) * 0.22 : 0;
    const cursorFloatY = isHovered ? (mousePos.y - 50) * 0.22 : 0;
    const scale = isHovered ? 1.07 : 1.03;
    imgTransform = `translate3d(${cursorFloatX}px, ${scrollShiftY + cursorFloatY}px, 0) scale(${scale})`;
    transitionStyle = isHovered 
      ? 'transform 120ms cubic-bezier(0.2, 0, 0.2, 1), filter 300ms ease-out, opacity 400ms ease-out'
      : 'transform 500ms ease-out, filter 400ms ease-out, opacity 400ms ease-out';
  } else if (overrideMode === 'scroll-zoom') {
    // Scroll Zoom: mouse wheel / trackpad scroll zooms centered at cursor
    imgOrigin = `${mousePos.x}% ${mousePos.y}%`;
    imgTransform = `scale(${wheelZoom})`;
    transitionStyle = wheelZoom > 1.02 
      ? 'transform 80ms ease-out, filter 300ms ease-out, opacity 400ms ease-out' 
      : 'transform 300ms ease-out, filter 300ms ease-out, opacity 400ms ease-out';
  } else if (overrideMode === 'pan-drift') {
    // Cinema Pan: cursor position dynamically pans widescreen framing
    const panX = isHovered ? ((mousePos.x - 50) / 50) * -18 : 0;
    const panY = isHovered ? ((mousePos.y - 50) / 50) * -18 : 0;
    const scale = isHovered ? 1.09 : 1.0;
    imgTransform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
    transitionStyle = isHovered 
      ? 'transform 140ms cubic-bezier(0.2, 0, 0.2, 1), filter 300ms ease-out, opacity 400ms ease-out'
      : 'transform 500ms ease-out, filter 400ms ease-out, opacity 400ms ease-out';
  } else if (overrideMode === 'ambient-glow') {
    // Ambient Glow: subtle lift with soft perspective tilt and warm light sheen
    imgTransform = isHovered ? 'scale(1.02)' : 'scale(1.0)';
    transitionStyle = 'transform 250ms ease-out, filter 300ms ease-out, opacity 400ms ease-out';
  } else {
    // Static / pure: clean photograph with zero motion
    imgTransform = 'scale(1)';
    transitionStyle = 'filter 300ms ease-out, opacity 400ms ease-out';
  }

  return (
    <div
      ref={containerRef}
      onClick={onSelect}
      onDoubleClick={() => {
        if (overrideMode === 'scroll-zoom') {
          setWheelZoom((prev) => (prev > 1.05 ? 1.0 : 1.6));
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full overflow-hidden bg-[#070707] cursor-pointer select-none group flex items-center justify-center transition-colors duration-500 hover:bg-[#0c0c0c]"
      style={{
        perspective: '1000px'
      }}
    >
      {/* 
        Zero Negative Space Frame:
        Fills 100% of width and height.
        If 'contain' fit mode is selected, an ambient blurred tone of the image fills
        the background so NO BLANK BLACK GAPS exist!
      */}
      {fitMode === 'contain' && (
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-30 pointer-events-none"
          style={{ backgroundImage: `url(${photo.imageUrl})` }}
        />
      )}

      {/* The Image Container with 3D Tilt for ambient-glow mode */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          transform: overrideMode === 'ambient-glow' && isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
            : 'none',
          transition: 'transform 200ms ease-out'
        }}
      >
        <img
          src={photo.imageUrl}
          alt={photo.title || 'Cinematography still'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full ${
            fitMode === 'fill' ? 'object-cover' : 'object-contain'
          } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transformOrigin: imgOrigin,
            transform: imgTransform,
            filter: isHovered 
              ? 'brightness(1.02) contrast(1.04)' 
              : 'brightness(0.93) contrast(1.02)',
            transition: transitionStyle
          }}
          loading="lazy"
          draggable={false}
        />

        {/* Ambient Light Sheen for 'ambient-glow' mode (Luminous gallery light wash, no circular loupe) */}
        {overrideMode === 'ambient-glow' && isHovered && (
          <div 
            className="pointer-events-none absolute inset-0 z-10 mix-blend-screen opacity-75 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 280px at ${mousePos.x}% ${mousePos.y}%, rgba(251, 191, 36, 0.14), rgba(255, 255, 255, 0.04) 50%, transparent 80%)`
            }}
          />
        )}

        {/* Interactive HUD Indicator for 'scroll-zoom' mode */}
        {overrideMode === 'scroll-zoom' && isHovered && (
          <div 
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 px-3 py-1 bg-black/85 backdrop-blur-md rounded-full border border-amber-400/40 text-[10px] font-mono text-amber-300 shadow-2xl animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Mouse className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>
              {wheelZoom > 1.02 ? `${wheelZoom.toFixed(2)}x Zoom` : 'Scroll Wheel ↕ to Zoom'}
            </span>
            {wheelZoom > 1.05 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setWheelZoom(1.0);
                }}
                className="ml-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white text-[9px] uppercase tracking-wider cursor-pointer"
                title="Reset zoom to 1.0x"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Inspect Pill on Hover */}
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/15 text-[9px] uppercase tracking-widest text-white/90">
          <Maximize2 className="w-3 h-3 text-amber-400" />
          <span>Inspect</span>
        </div>

        {/* Delete Photo Button on Hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-black/80 hover:bg-red-600/90 backdrop-blur-md rounded-full border border-white/20 text-white/70 hover:text-white cursor-pointer shadow-lg"
            title="Remove photograph"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Minimalist Lightbox (100% Uncropped Viewing with Filmstrip) ───
interface LightboxProps {
  photos: CatalogPhoto[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDelete?: () => void;
  onReshuffle?: () => void;
}

function MinimalistLightbox({
  photos,
  currentIndex,
  onSelectIndex,
  onClose,
  onNext,
  onPrev,
  onDelete,
  onReshuffle
}: LightboxProps) {
  const photo = photos[currentIndex];
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === '+' || e.key === '=') setZoomLevel(z => Math.min(z + 0.25, 3.5));
      if (e.key === '-') setZoomLevel(z => Math.max(z - 0.25, 0.75));
      if (e.key === '0') {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, [photo?.id]);

  if (!photo) return null;

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoomLevel(z => Math.min(z + 0.15, 3.5));
    } else {
      setZoomLevel(z => {
        const next = Math.max(z - 0.15, 0.75);
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoomLevel(2);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between select-none"
      onClick={onClose}
    >
      {/* Top Toolbar */}
      <div 
        className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/10 z-20 bg-black/60 backdrop-blur-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-white/70 tracking-widest">
            {String(currentIndex + 1).padStart(2, '0')} &nbsp;/&nbsp; {String(photos.length).padStart(2, '0')}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono">
            {getAspectBadge(photo.aspect)}
          </span>
          {photo.mood && MOOD_LABELS[photo.mood] && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[10px] uppercase tracking-wider text-amber-200/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-mono">
                {MOOD_LABELS[photo.mood].label}
              </span>
            </>
          )}
          {photo.dominantColor && (
            <>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-white/70 bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono">
                <span 
                  className="w-2 h-2 rounded-full border border-white/40"
                  style={{ backgroundColor: photo.dominantColor }}
                />
                <span className="hidden sm:inline">
                  {photo.colorSpace && COLOR_SPACE_LABELS[photo.colorSpace] 
                    ? COLOR_SPACE_LABELS[photo.colorSpace].label 
                    : photo.dominantColor}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onReshuffle && (
            <button
              onClick={onReshuffle}
              className="px-2.5 py-1 rounded bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              title="Reshuffle Stills Flow"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reshuffle Flow</span>
            </button>
          )}

          <button
            onClick={() => setZoomLevel(z => Math.max(z - 0.25, 0.75))}
            disabled={zoomLevel <= 0.75}
            className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setZoomLevel(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Reset Zoom (0)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          <button
            onClick={() => setZoomLevel(z => Math.min(z + 0.25, 3.5))}
            disabled={zoomLevel >= 3.5}
            className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="text-white/20">|</span>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onDelete && (
            <button
              onClick={() => onDelete()}
              className="p-2 rounded hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors cursor-pointer"
              title="Remove photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-6"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
      >
        <img
          src={photo.imageUrl}
          alt=""
          className="max-h-[84vh] max-w-[94vw] object-contain shadow-2xl transition-transform ease-out pointer-events-none select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
            transitionDuration: isDragging ? '0ms' : '150ms'
          }}
          draggable={false}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-white/20 backdrop-blur-md text-white/70 hover:text-white transition-all cursor-pointer z-20 border border-white/15 shadow-xl"
          title="Previous Image (←)"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-black/50 hover:bg-white/20 backdrop-blur-md text-white/70 hover:text-white transition-all cursor-pointer z-20 border border-white/15 shadow-xl"
          title="Next Image (→)"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Filmstrip Bar */}
      <div 
        className="px-4 sm:px-6 py-2.5 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-[70vw]">
          {photos.map((p, idx) => (
            <button
              key={`thumb-${p.id}`}
              onClick={() => onSelectIndex(idx)}
              className={`relative shrink-0 h-10 w-14 rounded overflow-hidden border transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-amber-400 scale-105 opacity-100 shadow-md ring-1 ring-amber-400'
                  : 'border-white/20 opacity-40 hover:opacity-80'
              }`}
            >
              <img 
                src={p.imageUrl} 
                alt="" 
                className="w-full h-full object-cover" 
                loading="lazy" 
              />
            </button>
          ))}
        </div>

        <div className="text-right text-[11px] text-white/40 shrink-0">
          {zoomLevel > 1 ? (
            <span className="flex items-center gap-1 text-amber-400">
              <Move className="w-3.5 h-3.5" />
              <span>Panning Active</span>
            </span>
          ) : (
            <span className="hidden sm:inline">Use ← → arrow keys</span>
          )}
        </div>
      </div>
    </div>
  );
}
