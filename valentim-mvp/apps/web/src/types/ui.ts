import type { ReactNode } from 'react';

export type Color = 'green' | 'teal' | 'amber' | 'violet' | 'rose' | 'sky' | 'slate' | 'emerald';

export type AppSectionId =
  | 'dashboard'
  | 'architecture'
  | 'clients'
  | 'companies'
  | 'documents'
  | 'whatsapp'
  | 'review'
  | 'deadlines'
  | 'finance'
  | 'proposals';

export interface NavItem {
  id: AppSectionId;
  label: string;
  icon: string;
  tag?: string;
}

export interface CardProps {
  children: ReactNode;
  color?: Color;
  title?: string;
  className?: string;
}

export interface BadgeProps {
  children: ReactNode;
  color?: Color;
}
