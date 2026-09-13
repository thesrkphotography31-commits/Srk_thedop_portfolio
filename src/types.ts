export type ArchetypeId = 'photography' | 'developer' | 'designer' | 'creative';

export type ThemeColor = 'amber' | 'indigo' | 'emerald' | 'rose' | 'slate' | 'cyan';
export type FontStyle = 'sans' | 'serif' | 'mono' | 'outfit';
export type HeroLayout = 'split' | 'immersive' | 'editorial' | 'bento';
export type CardRadius = 'rounded' | 'sharp' | 'pill';

export interface SocialLink {
  platform: 'github' | 'linkedin' | 'instagram' | 'x' | 'unsplash' | 'dribbble' | 'youtube' | 'email' | 'custom';
  label: string;
  url: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  description: string;
  imageUrl: string;
  additionalImages?: string[];
  tags: string[];
  year: string;
  featured: boolean;
  client?: string;
  link?: string;
  githubUrl?: string;
  // Photography specific metadata (optional)
  camera?: string;
  lens?: string;
  settings?: string;
  location?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  deliverables?: string[];
  priceStarting?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  period: string;
  description: string[];
  skills?: string[];
  type?: 'work' | 'exhibition' | 'education' | 'award';
}

export interface TestimonialItem {
  id: string;
  quote: string;
  clientName: string;
  clientRole: string;
  clientCompany?: string;
  clientAvatar?: string;
  rating?: number;
  projectRef?: string;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface PortfolioProfile {
  id: string;
  name: string;
  title: string;
  tagline: string;
  bio: string;
  detailedBio: string;
  avatarUrl: string;
  coverImageUrl?: string;
  location: string;
  email: string;
  phone?: string;
  availability: string; // e.g. "Available for bookings & projects worldwide"
  availabilityStatus: 'available' | 'busy' | 'selective';
  resumeUrl?: string;
  socials: SocialLink[];
  stats: StatItem[];
  skills: SkillGroup[];
  gearOrToolsTitle: string;
  gearOrTools: string[];
  categories: string[];
  projects: ProjectItem[];
  services: ServiceItem[];
  experience: ExperienceItem[];
  testimonials: TestimonialItem[];
}

export interface ThemeConfig {
  mode: 'dark' | 'light';
  accent: ThemeColor;
  font: FontStyle;
  heroLayout: HeroLayout;
  radius: CardRadius;
  sectionsVisible: {
    hero: boolean;
    works: boolean;
    about: boolean;
    services: boolean;
    experience: boolean;
    testimonials: boolean;
    contact: boolean;
  };
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  inquiryType: string;
  budget?: string;
  message: string;
  date: string;
}

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
