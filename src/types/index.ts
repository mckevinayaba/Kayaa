export interface Venue {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  coverImage?: string;
  galleryImages?: string[];  // all gallery photos including cover as [0]
  introVideo?: string;       // short intro video URL
  avatar?: string;
  ownerId?: string;
  checkinCount: number;
  followerCount: number;
  isOpen: boolean;
  // Trust signals from Phase 1 DB columns
  checkinsToday: number;
  checkinsThisWeek: number;
  checkinsLastWeek: number;
  regularsCount: number;
  lastCheckinAt?: string;
  venueStatus: 'open' | 'busy' | 'quiet' | 'closed';
  openHours?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  isVerified?: boolean;
  verificationType?: 'verified' | 'recommended' | 'trusted';
  tags: string[];
  createdAt: string;
}

export interface CheckIn {
  id: string;
  venueId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  note?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  venueId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  coverImage?: string;
  isFree: boolean;
  price?: number;
  createdAt: string;
}

export interface Story {
  id: string;
  venueId: string;
  venueName: string;
  venueType: string;
  content: string;
  createdAt: string;
  expiresAt: string;
}

export interface Post {
  id: string;
  venueId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  image?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  audience: 'public' | 'regulars_only';
}
