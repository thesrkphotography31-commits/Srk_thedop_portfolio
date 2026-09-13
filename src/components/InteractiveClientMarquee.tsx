import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ClientBrand {
  name: string;
  src?: string;
  fallbackSrc?: string;
  alt: string;
  url?: string;
  title: string;
  className?: string;
}

interface InteractiveClientMarqueeProps {
  brands: ClientBrand[];
}

interface ClientBrandItemProps {
  brand: ClientBrand;
  isDraggingRef: React.MutableRefObject<boolean>;
  key?: React.Key;
}

function ClientBrandItem({ brand, isDraggingRef }: ClientBrandItemProps) {
  const [imgError, setImgError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(brand.src);

  const hasImage = Boolean(currentSrc) && !imgError;

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const content = hasImage ? (
    <img
      src={currentSrc}
      alt={`${brand.alt} logo`}
      className={`w-auto object-contain opacity-80 group-hover/brand:opacity-100 transition-opacity duration-300 pointer-events-none select-none ${
        brand.className || 'h-[46px] sm:h-[58px] md:h-[68px] max-h-[74px]'
      }`}
      loading="lazy"
      draggable={false}
      onError={() => {
        if (brand.fallbackSrc && currentSrc !== brand.fallbackSrc) {
          setCurrentSrc(brand.fallbackSrc);
        } else {
          setImgError(true);
        }
      }}
    />
  ) : (
    <span className="text-[16px] sm:text-[19px] md:text-[22px] font-medium tracking-[0.22em] uppercase text-[#f0ede8]/70 group-hover/brand:text-[#f0ede8] transition-colors duration-300 whitespace-nowrap pointer-events-none select-none">
      {brand.name}
    </span>
  );

  if (brand.url) {
    return (
      <a
        href={brand.url}
        target="_blank"
        rel="noopener noreferrer"
        title={brand.title}
        aria-label={`${brand.name} - ${brand.title}`}
        onClick={handleClick}
        draggable={false}
        className="group/brand inline-flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-[1.06] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-sm select-none"
      >
        {content}
      </a>
    );
  }

  return (
    <div
      title={brand.title}
      className="group/brand inline-flex items-center justify-center flex-shrink-0 cursor-default select-none"
    >
      {content}
    </div>
  );
}

export const InteractiveClientMarquee: React.FC<InteractiveClientMarqueeProps> = ({ brands }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const singleSetRef = useRef<HTMLDivElement>(null);

  // Position and physics states stored in refs to run outside React render cycles at 60/120fps
  const posRef = useRef(0);
  const velocityRef = useRef(0);
  const singleSetWidthRef = useRef(0);

  // Drag interaction state
  const isPointerDownRef = useRef(false);
  const startPointerXRef = useRef(0);
  const lastPointerXRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Hover state
  const isHoveredRef = useRef(false);
  const mouseRelXRef = useRef(0.5); // 0 = left edge, 1 = right edge

  // Visual drag state for UI styling
  const [isActivelyDragging, setIsActivelyDragging] = useState(false);

  // Measure single set width
  const measureSetWidth = useCallback(() => {
    if (singleSetRef.current) {
      const width = singleSetRef.current.offsetWidth;
      if (width > 0) {
        singleSetWidthRef.current = width;
      }
    }
  }, []);

  useEffect(() => {
    measureSetWidth();
    const handleResize = () => measureSetWidth();
    window.addEventListener('resize', handleResize);

    // Double check measurement after images might load
    const timer = setTimeout(measureSetWidth, 600);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [measureSetWidth, brands]);

  // Window scroll responsiveness:
  // "If a person is scrolling towards it, they should be able to scroll through the clients that I worked with"
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleWindowScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if section is near the viewport
      if (rect.top < windowHeight + 200 && rect.bottom > -200) {
        // Accelerate/translate the marquee in direct response to page scroll
        velocityRef.current -= deltaY * 0.35;
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  // Main animation loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      const singleWidth = singleSetWidthRef.current;

      if (singleWidth > 0) {
        if (!isPointerDownRef.current) {
          // Base ambient drift speed (slow, elegant marquee)
          let ambientSpeed = 42; // px per second

          // If hovered, slow down slightly or let mouse position steer
          if (isHoveredRef.current) {
            // Mouse position steering: center is neutral, left drifts left, right drifts right
            const steer = (mouseRelXRef.current - 0.5) * 2; // -1 to +1
            ambientSpeed = 16 + steer * 30;
          }

          // Apply ambient drift
          posRef.current -= ambientSpeed * dt;

          // Apply & decay interactive momentum velocity
          posRef.current += velocityRef.current;
          velocityRef.current *= 0.92;
          if (Math.abs(velocityRef.current) < 0.05) {
            velocityRef.current = 0;
          }

          // Seamless infinite toroidal wrap in both directions
          while (posRef.current <= -singleWidth) {
            posRef.current += singleWidth;
          }
          while (posRef.current > 0) {
            posRef.current -= singleWidth;
          }
        }

        // Render hardware-accelerated transform
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Mouse wheel interaction over marquee: scrolling wheel advances the track horizontally
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // If the user is scrolling horizontally or vertically over the marquee track
    const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    velocityRef.current -= scrollDelta * 0.45;
  };

  // Pointer Drag events
  const handlePointerDown = (e: React.PointerEvent) => {
    // Primary mouse click or touch only
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isPointerDownRef.current = true;
    startPointerXRef.current = e.clientX;
    lastPointerXRef.current = e.clientX;
    dragDistanceRef.current = 0;
    isDraggingRef.current = false;
    velocityRef.current = 0;
    setIsActivelyDragging(true);

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Update mouse relative position for hover steering
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        mouseRelXRef.current = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      }
    }

    if (!isPointerDownRef.current) return;

    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;

    dragDistanceRef.current += Math.abs(deltaX);
    if (dragDistanceRef.current > 5) {
      isDraggingRef.current = true;
    }

    posRef.current += deltaX;
    velocityRef.current = deltaX * 1.1;

    const singleWidth = singleSetWidthRef.current;
    if (singleWidth > 0) {
      while (posRef.current <= -singleWidth) {
        posRef.current += singleWidth;
      }
      while (posRef.current > 0) {
        posRef.current -= singleWidth;
      }
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsActivelyDragging(false);

    if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }

    // Reset drag flag after small delay so click handlers can inspect it
    setTimeout(() => {
      isDraggingRef.current = false;
      dragDistanceRef.current = 0;
    }, 50);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    handlePointerUp(e);
  };

  // Nudge buttons for single-click / keyboard access
  const nudge = (amount: number) => {
    velocityRef.current += amount;
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className={`group relative w-full overflow-hidden select-none touch-pan-y ${
        isActivelyDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ userSelect: 'none' }}
      aria-label="Interactive client list. Drag horizontally or scroll with mouse wheel to browse clients."
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') nudge(180);
        if (e.key === 'ArrowRight') nudge(-180);
      }}
    >
      {/* Edge gradient fade masks so logos glide into view smoothly */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 sm:w-24 md:w-36 z-10 bg-gradient-to-r from-[#0c0c0c] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 sm:w-24 md:w-36 z-10 bg-gradient-to-l from-[#0c0c0c] to-transparent" />

      {/* Interactive Navigation Gliders (Visible on group hover or keyboard focus) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          nudge(320);
        }}
        aria-label="Scroll clients left"
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black/90 border border-white/15 hover:border-white/40 text-[#f0ede8] flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-xl cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 -translate-x-0.5" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          nudge(-320);
        }}
        aria-label="Scroll clients right"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black/90 border border-white/15 hover:border-white/40 text-[#f0ede8] flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-xl cursor-pointer"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 translate-x-0.5" />
      </button>

      {/* Smooth hardware-accelerated transform track */}
      <div
        ref={trackRef}
        className="flex items-center py-2 sm:py-3 w-max will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        {/* Set 1 (Measured for seamless wrap length) */}
        <div
          ref={singleSetRef}
          className="flex items-center gap-16 sm:gap-24 md:gap-28 lg:gap-32 pr-16 sm:pr-24 md:pr-28 lg:pr-32 flex-shrink-0"
        >
          {brands.map((client, idx) => (
            <ClientBrandItem
              key={`set1-${client.name}-${idx}`}
              brand={client}
              isDraggingRef={isDraggingRef}
            />
          ))}
        </div>

        {/* Set 2 (Continuous extension) */}
        <div
          className="flex items-center gap-16 sm:gap-24 md:gap-28 lg:gap-32 pr-16 sm:pr-24 md:pr-28 lg:pr-32 flex-shrink-0"
          aria-hidden="true"
        >
          {brands.map((client, idx) => (
            <ClientBrandItem
              key={`set2-${client.name}-${idx}`}
              brand={client}
              isDraggingRef={isDraggingRef}
            />
          ))}
        </div>

        {/* Set 3 (Ultra-wide screen safety margin for seamless wrapping) */}
        <div
          className="flex items-center gap-16 sm:gap-24 md:gap-28 lg:gap-32 pr-16 sm:pr-24 md:pr-28 lg:pr-32 flex-shrink-0"
          aria-hidden="true"
        >
          {brands.map((client, idx) => (
            <ClientBrandItem
              key={`set3-${client.name}-${idx}`}
              brand={client}
              isDraggingRef={isDraggingRef}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
