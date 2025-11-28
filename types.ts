
export type Role = 'ADM' | 'DESIGNER';

export interface User {
  id: string;
  name: string;
  password?: string; // For mock auth
  role: Role;
  avatarUrl?: string;
  avatarColor?: string; // Hex color for background
  active: boolean;
}

export interface ArtType {
  id: string;
  label: string;
  points: number;
  order: number; // For Drag and Drop sorting
}

export interface DemandItem {
  artTypeId: string;
  artTypeLabel: string;
  pointsPerUnit: number;
  quantity: number;
  // Variation Fields
  variationQuantity?: number;
  variationPoints?: number;
  totalPoints: number;
}

export interface Demand {
  id: string;
  userId: string;
  userName: string;
  items: DemandItem[]; // New: List of items in this demand
  totalQuantity: number; // Sum of quantities
  totalPoints: number; // Sum of points
  timestamp: number;
}

export interface WorkSession {
  id: string;
  userId: string;
  timestamp: number; // Start time
}

export interface WorkSessionRow {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  totalArts: number;
  totalPoints: number;
  timestamp: number;
}

export interface Feedback {
  id: string;
  designerId: string;
  designerName: string;
  adminName: string;
  imageUrls: string[]; // Base64 strings
  comment: string;
  createdAt: number;
  viewed: boolean;
  viewedAt?: number;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  orderIndex: number;
  createdAt: number;
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  designerId: string;
  viewed: boolean;
  viewedAt?: number;
}

export type TimeFilter = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface AdminFilters {
  period: TimeFilter;
  designerId: string | 'all';
  customRange?: { start: Date; end: Date };
}

export interface SystemSettings {
  logoUrl?: string; // Base64 or URL
  brandTitle?: string;
  loginSubtitle?: string;
  variationPoints?: number; // Global point value for variations
}
