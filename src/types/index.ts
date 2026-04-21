export interface Venue {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  address: string;
  neighborhood: string;
  city: string;
  coverImage?: string;
  avatar?: string;
  ownerId?: string;
  checkinCount: number;
  followerCount: number;
  isOpen: boolean;
  openHours?: string;
  whatsappNumber?: string;
  isVerified?: boolean;
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
}
