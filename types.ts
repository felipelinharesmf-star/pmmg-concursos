
export enum Screen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  FILTER = 'FILTER',
  QUESTION = 'QUESTION',
  SETTINGS = 'SETTINGS',
  ONBOARDING = 'ONBOARDING',
  PERFORMANCE = 'PERFORMANCE',

  SUBSCRIPTION = 'SUBSCRIPTION'
}

export interface FilterParams {
  discipline?: string[];
  source?: string[]; // Was subject/board, now mapping specific source
  exam?: string; // Prova
  onlyWrong?: boolean; // New filter for reviewing errors
  onlyBookmarks?: boolean; // New filter for bookmarked questions
  searchText?: string; // New filter for text search
  onlyNotAnswered?: boolean; // New filter for unanaswered questions
  limit?: number; // Quantity of questions
}

export interface NavigationProps {
  onNavigate: (screen: Screen, params?: any) => void;
  params?: any;
}

export interface Option {
  id: string;
  text: string;
}

export interface Notice {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  type: 'news' | 'exam' | 'promo' | 'update';
  action_url?: string;
  active: boolean;
  priority: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  is_public: boolean;
  is_admin?: boolean;
  subscription_plan?: 'free' | 'monthly' | 'quarterly' | 'semiannual';
  subscription_status?: 'active' | 'pending' | 'cancelled' | 'paused' | 'expired';
  subscription_id?: string;
  customer_id?: string;
  subscription_end_date?: string;
}


export interface Question {
  id: number;
  exam: string; // Prova
  subject: string; // Matéria
  questionLabel: string; // Questão (e.g. "9ª QUESTÃO")
  text: string; // Enunciado
  options: Option[];
  correctOptionId: string; // Gabarito
  source: string; // Fonte_documento
  comment?: string; // Comentário/Explicação
}
