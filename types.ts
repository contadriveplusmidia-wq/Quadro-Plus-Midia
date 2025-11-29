
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

export interface Award {
  id: string;
  designerId: string;
  designerName: string;
  month: string; // Nome do mês (ex: "Janeiro", "Fevereiro")
  description: string;
  imageUrl?: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface LinkTag {
  id: string;
  linkId: string;
  tagId: string;
}

export interface UsefulLink {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  createdAt: number;
  tags?: Tag[]; // Tags associadas ao link
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
  dailyArtGoal?: number; // Meta diária de artes para designers
  motivationalMessage?: string; // Mensagem motivacional para premiações
  motivationalMessageEnabled?: boolean; // Ativar/desativar mensagem motivacional
  nextAwardImage?: string; // Imagem grande da próxima premiação (Base64 or URL)
  chartEnabled?: boolean; // Ativar/desativar gráfico no painel do designer
  showAwardsChart?: boolean; // Ativar/desativar gráfico de pontos na página de premiações
  awardsHasUpdates?: boolean; // Flag para indicar novidades na página de premiações
}

// Performance status types
export type PerformanceStatus = 'success' | 'warning' | 'neutral';

export interface DailyPerformanceResult {
  status: PerformanceStatus;
  percentage: number;
  message: string;
  colors: {
    bg: string;
    bgDark: string;
    border: string;
    borderDark: string;
    text: string;
    textDark: string;
    accent: string;
    accentDark: string;
  };
}
