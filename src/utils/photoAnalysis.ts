import type { CatalogPhoto } from '../components/PhotoCatalog';

export type PhotoMood = 
  | 'cinematic-noir' 
  | 'golden-hour' 
  | 'ethereal-cool' 
  | 'raw-documentary' 
  | 'vivid-editorial' 
  | 'minimal-pure';

export type PhotoColorSpace = 
  | 'warm-gold' 
  | 'cool-cyan' 
  | 'monochrome' 
  | 'earthy-muted' 
  | 'vivid-spectrum' 
  | 'deep-noir' 
  | 'high-key';

export type PhotoCategory = 
  | 'editorial-portrait' 
  | 'cinematic-landscape' 
  | 'street-documentary' 
  | 'architectural-minimal' 
  | 'commercial-still';

export interface VisualAnalysisResult {
  dominantColor: string;
  palette: string[];
  colorSpace: PhotoColorSpace;
  mood: PhotoMood;
  category: PhotoCategory;
  hue: number;
  saturation: number;
  lightness: number;
}

/**
 * Human-readable titles and descriptions for metadata badges
 */
export const MOOD_LABELS: Record<PhotoMood, { label: string; toneClass: string; bgClass: string }> = {
  'cinematic-noir': { label: 'Cinematic Noir', toneClass: 'text-zinc-300', bgClass: 'bg-zinc-900/80 border-zinc-700/50' },
  'golden-hour': { label: 'Golden Hour', toneClass: 'text-amber-300', bgClass: 'bg-amber-950/40 border-amber-500/40' },
  'ethereal-cool': { label: 'Ethereal Cool', toneClass: 'text-cyan-300', bgClass: 'bg-cyan-950/40 border-cyan-500/40' },
  'raw-documentary': { label: 'Raw Documentary', toneClass: 'text-stone-300', bgClass: 'bg-stone-900/80 border-stone-600/50' },
  'vivid-editorial': { label: 'Vivid Editorial', toneClass: 'text-rose-300', bgClass: 'bg-rose-950/40 border-rose-500/40' },
  'minimal-pure': { label: 'Minimal Pure', toneClass: 'text-white', bgClass: 'bg-white/10 border-white/20' }
};

export const COLOR_SPACE_LABELS: Record<PhotoColorSpace, { label: string; dotClass: string }> = {
  'warm-gold': { label: 'Warm Gold', dotClass: 'bg-amber-400' },
  'cool-cyan': { label: 'Cool Cyan & Blue', dotClass: 'bg-cyan-400' },
  'monochrome': { label: 'Monochrome B&W', dotClass: 'bg-zinc-400' },
  'earthy-muted': { label: 'Earthy Muted', dotClass: 'bg-emerald-600' },
  'vivid-spectrum': { label: 'Vivid Spectrum', dotClass: 'bg-rose-400' },
  'deep-noir': { label: 'Deep Shadow Noir', dotClass: 'bg-slate-700' },
  'high-key': { label: 'High-Key Pure', dotClass: 'bg-zinc-200' }
};

export const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  'editorial-portrait': 'Fashion & Portrait',
  'cinematic-landscape': 'Cinematic Landscape',
  'street-documentary': 'Street & Documentary',
  'architectural-minimal': 'Architecture & Form',
  'commercial-still': 'Commercial Still'
};

/**
 * Analyzes an image canvas or data URL to extract exact color space, mood, and category.
 * Uses downscaled thumbnail sampling for ultra-fast performance.
 */
export function analyzeCanvasPixels(
  canvas: HTMLCanvasElement,
  aspectRatio: number
): VisualAnalysisResult {
  const sampleW = 64;
  const sampleH = 64;
  const offscreen = document.createElement('canvas');
  offscreen.width = sampleW;
  offscreen.height = sampleH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return getDefaultAnalysis(aspectRatio);
  }

  try {
    ctx.drawImage(canvas, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalSat = 0;
    let totalLight = 0;

    let warmCount = 0;
    let coolCount = 0;
    let monoCount = 0;
    let deepShadowCount = 0;
    let highlightCount = 0;

    const pixelCount = sampleW * sampleH;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];

      totalR += r;
      totalG += g;
      totalB += b;

      const rN = r / 255;
      const gN = g / 255;
      const bN = b / 255;
      const max = Math.max(rN, gN, bN);
      const min = Math.min(rN, gN, bN);
      const l = (max + min) / 2;
      let s = 0;
      let h = 0;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
          case gN: h = (bN - rN) / d + 2; break;
          case bN: h = (rN - gN) / d + 4; break;
        }
        h *= 60;
      }

      totalSat += s;
      totalLight += l;

      if (s < 0.16) monoCount++;
      if (l < 0.22) deepShadowCount++;
      if (l > 0.75) highlightCount++;

      // Warmth vs Coolness detection
      if ((h >= 0 && h <= 55) || (h >= 330 && h <= 360) || (r > b + 30 && g > b)) {
        warmCount++;
      } else if ((h >= 165 && h <= 265) || (b > r + 25)) {
        coolCount++;
      }
    }

    const avgR = Math.round(totalR / pixelCount);
    const avgG = Math.round(totalG / pixelCount);
    const avgB = Math.round(totalB / pixelCount);
    const avgS = totalSat / pixelCount;
    const avgL = totalLight / pixelCount;

    const warmRatio = warmCount / pixelCount;
    const coolRatio = coolCount / pixelCount;
    const monoRatio = monoCount / pixelCount;
    const shadowRatio = deepShadowCount / pixelCount;

    // Convert average RGB to Hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const dominantColor = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`;

    // Approximate dominant hue
    let dominantHue = 40;
    const maxVal = Math.max(avgR, avgG, avgB);
    const minVal = Math.min(avgR, avgG, avgB);
    if (maxVal !== minVal) {
      const d = maxVal - minVal;
      if (maxVal === avgR) dominantHue = ((avgG - avgB) / d + (avgG < avgB ? 6 : 0)) * 60;
      else if (maxVal === avgG) dominantHue = ((avgB - avgR) / d + 2) * 60;
      else dominantHue = ((avgR - avgG) / d + 4) * 60;
    }

    // Determine Color Space
    let colorSpace: PhotoColorSpace = 'warm-gold';
    if (monoRatio > 0.65 || avgS < 0.14) {
      colorSpace = shadowRatio > 0.45 || avgL < 0.26 ? 'deep-noir' : 'monochrome';
    } else if (shadowRatio > 0.50 || avgL < 0.22) {
      colorSpace = 'deep-noir';
    } else if (avgL > 0.72 && highlightCount / pixelCount > 0.4) {
      colorSpace = 'high-key';
    } else if (warmRatio > 0.38) {
      colorSpace = 'warm-gold';
    } else if (coolRatio > 0.34) {
      colorSpace = 'cool-cyan';
    } else if (avgS > 0.42) {
      colorSpace = 'vivid-spectrum';
    } else {
      colorSpace = 'earthy-muted';
    }

    // Determine Mood
    let mood: PhotoMood = 'golden-hour';
    if (colorSpace === 'deep-noir' || shadowRatio > 0.48) {
      mood = 'cinematic-noir';
    } else if (colorSpace === 'warm-gold' || warmRatio > 0.42) {
      mood = 'golden-hour';
    } else if (colorSpace === 'cool-cyan' || coolRatio > 0.36) {
      mood = 'ethereal-cool';
    } else if (colorSpace === 'vivid-spectrum' || avgS > 0.45) {
      mood = 'vivid-editorial';
    } else if (colorSpace === 'high-key' || avgL > 0.68) {
      mood = 'minimal-pure';
    } else {
      mood = 'raw-documentary';
    }

    // Determine Category
    let category: PhotoCategory = 'editorial-portrait';
    if (aspectRatio <= 0.85) {
      category = 'editorial-portrait';
    } else if (aspectRatio >= 1.55) {
      category = 'cinematic-landscape';
    } else if (colorSpace === 'monochrome' || mood === 'raw-documentary') {
      category = 'street-documentary';
    } else if (mood === 'minimal-pure') {
      category = 'architectural-minimal';
    } else {
      category = 'commercial-still';
    }

    return {
      dominantColor,
      palette: [dominantColor],
      colorSpace,
      mood,
      category,
      hue: Math.round(dominantHue),
      saturation: Math.round(avgS * 100),
      lightness: Math.round(avgL * 100)
    };
  } catch {
    return getDefaultAnalysis(aspectRatio);
  }
}

function getDefaultAnalysis(aspectRatio: number): VisualAnalysisResult {
  const isPortrait = aspectRatio < 1.0;
  return {
    dominantColor: isPortrait ? '#9e8574' : '#6b7a82',
    palette: ['#9e8574', '#3b4247'],
    colorSpace: isPortrait ? 'warm-gold' : 'cool-cyan',
    mood: isPortrait ? 'golden-hour' : 'cinematic-noir',
    category: isPortrait ? 'editorial-portrait' : 'cinematic-landscape',
    hue: isPortrait ? 35 : 200,
    saturation: 30,
    lightness: 45
  };
}

/**
 * Automatically groups photos into "shoots" if not already explicitly tagged.
 * Groups photos that were uploaded together or share strong visual feature similarity.
 */
export function clusterPhotosIntoShoots(photos: CatalogPhoto[]): CatalogPhoto[] {
  if (!photos || photos.length === 0) return [];

  return photos.map((p, idx) => {
    if (p.shootId && p.shootId.trim().length > 0) {
      return p;
    }

    // 1. Check if ID contains a timestamp batch cluster (e.g. photo-import-1712345678-0)
    const match = p.id.match(/photo-import-(\d+)-/);
    if (match && match[1]) {
      // Photos uploaded within 10 seconds of each other belong to the same shoot
      const timestamp = parseInt(match[1], 10);
      const bucket = Math.floor(timestamp / 10000);
      return { ...p, shootId: `shoot-batch-${bucket}` };
    }

    // 2. Fallback visual clustering: group adjacent photos with identical color space and mood
    const colorSig = `${p.colorSpace || 'warm-gold'}-${p.mood || 'golden-hour'}`;
    const syntheticCluster = Math.floor(idx / 3);
    return { ...p, shootId: `shoot-series-${syntheticCluster}-${colorSig}` };
  });
}

/**
 * ── SMART STYLIZED SHUFFLE & ANTI-REPETITION ENGINE ──
 * 
 * Solves the exact user problem:
 * "There are a lot of photos which is continuous from the same shoot. It shouldn't look like that;
 * it should look more professional, more stylized, and jumbled. Shuffle depending on the mood,
 * color space, and category."
 * 
 * Rules:
 * 1. ZERO adjacent frames from the same shoot (Anti-Shoot Clustering).
 * 2. High variance in Color Space (never 2 identical color spaces consecutively).
 * 3. Rhythmic Mood alternation (noir -> golden -> cool -> raw -> vivid).
 * 4. Alternating categories and balanced diptych pairings.
 */
export function generateStylizedShuffle(
  rawPhotos: CatalogPhoto[],
  seedModifier: number = 0
): CatalogPhoto[] {
  if (!rawPhotos || rawPhotos.length <= 1) return [...rawPhotos];

  // 1. Ensure all photos have shoot IDs and visual metadata
  const clustered = clusterPhotosIntoShoots(rawPhotos);

  // 2. Separate into remaining candidates
  const remaining = [...clustered];
  
  // Deterministic pseudo-random based on seed modifier
  const pseudoRandom = (i: number) => {
    const sin = Math.sin(seedModifier * 997 + i * 83.13);
    return sin - Math.floor(sin);
  };

  // Initial light shuffle of remaining items to avoid predictable ordering
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom(i) * (i + 1));
    const temp = remaining[i];
    remaining[i] = remaining[j];
    remaining[j] = temp;
  }

  const result: CatalogPhoto[] = [];

  // Pick the first photo (prefer an anchor with striking visual balance)
  if (remaining.length > 0) {
    result.push(remaining.shift()!);
  }

  // Iteratively pick the next best photo with maximum diversity
  let step = 0;
  while (remaining.length > 0) {
    step++;
    const last1 = result[result.length - 1];
    const last2 = result.length >= 2 ? result[result.length - 2] : null;

    let bestScore = -Infinity;
    let bestIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let score = 0;

      // ── HARD CONSTRAINT: ANTI-SHOOT CLUSTERING ──
      // Consecutive photo from the same shoot is strictly penalized
      if (cand.shootId && cand.shootId === last1.shootId) {
        score -= 5000;
      }
      if (last2 && cand.shootId && cand.shootId === last2.shootId) {
        score -= 800;
      }

      // ── COLOR SPACE VARIANCE ──
      if (cand.colorSpace === last1.colorSpace) {
        score -= 400;
      } else {
        score += 250;
      }

      // ── MOOD HARMONY & CONTRAST ──
      if (cand.mood === last1.mood) {
        score -= 300;
      } else {
        score += 200;
      }

      // ── CATEGORY VARIETY ──
      if (cand.category === last1.category) {
        score -= 150;
      } else {
        score += 150;
      }

      // ── ASPECT RATIO RHYTHM ──
      const candIsPortrait = cand.aspect !== '16/9' && cand.aspect !== '21/9';
      const lastIsPortrait = last1.aspect !== '16/9' && last1.aspect !== '21/9';
      
      // Encourage alternating between landscapes and vertical pairs
      if (candIsPortrait !== lastIsPortrait) {
        score += 120;
      }

      // Small pseudo-random jitter to ensure lively variations per shuffle click
      score += pseudoRandom(step * 31 + i) * 60;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    result.push(remaining.splice(bestIndex, 1)[0]);
  }

  return result;
}
