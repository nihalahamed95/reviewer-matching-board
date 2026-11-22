// src/app/models/reviewer-matching.models.ts

export interface Author {
  name: string;
  institution: string;
}

export interface Article {
  id: string;
  title: string;
  author: Author;
  assigned_reviewer_id?: string | null;
}

export interface Reviewer {
  id: string;
  name: string;
  institution: string;
  keywords: string[];
}

export interface DashboardStats {
  total_articles: number;
  total_reviewers: number;
  assigned_articles: number;
  conflicts_count: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Assignment {
  article_id: string;
  reviewer_id: string;
  assigned_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  status_code?: number;
  data?: T;
  stats?: DashboardStats;
  message?: string;
  error?: string;
  token?: string;
  user?: User;
  assignment?: Assignment;
}
