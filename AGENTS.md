# Sriram Karthick Portfolio — Version Memory & Design Directives

This file locks in the user-approved milestone version, architectural decisions, and visual preferences for the portfolio of Sriram Karthick (Cinematographer & Photographer).

## 1. Locked Layout & Visual Standards

- **Brand Identity & Header**:
  - Top-left header brand name is strictly uppercase **`SRIRAM`** / **`KARTHICK`** stacked across two elegant lines with refined light optical weight (`font-serif-cinzel font-light text-[13px] sm:text-[15px] tracking-[0.22em]` and `text-[11px] sm:text-[13px] tracking-[0.28em]`), avoiding heavy/thick lettering.
  - No misspelled variants (`Sriram Karthik` without 'c').

- **Brand & Client Logos**:
  - Sized prominently (~46px–74px heights) across mobile and desktop.
  - Interactive marquee with seamless drift, drag-to-scrub, and logo links.
  - Spacing around the marquee and the "Archive & Motion Stills" section must remain tight (minimal vertical padding, no excessive gaps).

- **Discipline Typography**:
  - "Videography" and "Photography" category switcher headers must use matching, non-italicized classical serif typography (EB Garamond), optical weights, and active underline indicators.

- **Videography Presentation (Clean Title & Film Mandate)**:
  - Video cards and the screening modal display strictly the name of the video and the film itself.
  - All descriptions, roles, client metadata, discipline tags, and location badges are permanently removed.

- **Photography Presentation (Clean Frame Mandate)**:
  - **No bottom corner overlays**: The technical aspect ratio badge (e.g. `16:9 Cinema`) and mood label (e.g. `Golden Hour`) in the bottom corners are permanently removed.
  - **No dark bottom vignette**: Frames display crisp, clean edge-to-edge images.
  - **Top-right Inspect Pill**: The clean hover Inspect pill is retained for full-screen inspection.
  - Continuous vertical photo flow with automatic widescreen 16:9 detection and paired portrait layouts.

- **Customization & Jumble Tab (Both Disciplines)**:
  - Both Photography and Videography sections must feature the customization toolbar:
    - **Jumble / Shuffle Engine**: Quick-shuffle action with intelligent pacing preventing consecutive videos or stills from sharing the same genre.
    - **Sorting Modes**: Stylized Jumble, Curated, Newest, Genre.
    - **Layout Controls**: Full-width Cinema scope, Diptych (2-across), and Grid (3-across).
    - **Preview Modes**: Direct Player, Cinema Posters, and Ambient Sheen.
    - **Genre Filters**: Real-time filtering by TVCs, Brand Films, Concerts/Events, Corporate, and Products.

## 2. Audio & Media Handling
- Ambient soundscape toggle in top navigation.
- Native YouTube embeds for video reels with full responsive aspect ratio handling.
- Creator mode (`?creator=true` or Shift+C/Alt+C, or footer trigger) for uploading and managing custom photos with browser persistence.
- Public Mode: Developer/Creator controls are completely isolated and invisible to public visitors; all public visitors experience only the clean, editorial, curated portfolio.

## 3. Hero Banner & Mobile Framing
- Hero banner features mobile-optimized focal framing (`object-[58%_18%]`), ensuring Sriram's face, eyes, and cinema camera are clearly visible and unshadowed on all mobile screens.
- Mobile negative space gradients are sculpted to keep the upper-right quadrant crisp, clear, and bright.
- Creator mode includes one-click mobile focal adjustment and banner image upload/replacement.

## 4. Locked Official Contact & Social Credentials
- **Official Email**: `thesrkphotography31@gmail.com` across all direct links, clipboard triggers, and inquiry forms.
- **Phone & WhatsApp**: `+91 72008 45915` (`tel:+917200845915`, `https://wa.me/917200845915`).
- **Instagram**: `https://www.instagram.com/srk.dop/` (Display: `@srk.dop (Sriram Karthick)`).
- **LinkedIn**: `https://www.linkedin.com/in/sriram-karthick-2250551ab/`.
- **Location**: `Bengaluru, India · Available Worldwide`.
- **Hyundai Video**: `Hyundai Ioniq Hi-tea` (YouTube ID: `PKHYOfKeQH8`).
- **Featured Film Reel**: `Featured Film` (YouTube ID: `Z0qMvkytexc`).
- **Get in Touch Structure**: Clean single-row layout without separate YouTube/channel row.

## 5. Publishing, Build & Auto-Sync State
- Single-page static application architecture compiling cleanly to `dist/`.
- Full SEO metadata, OpenGraph tags, and semantic page headers configured.
- Clean production builds (`npm run build`) with zero linting issues.
- All configuration, source code, and compiled distribution are locked to this latest milestone.


