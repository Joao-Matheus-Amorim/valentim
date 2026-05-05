import type { CardProps } from '../types/ui';

export function Card({ children, color = 'slate', title, className = '' }: CardProps) {
  return (
    <section className={`card ${color} ${className}`}>
      {title ? <div className={`card-title ${color}`}>{title}</div> : null}
      {children}
    </section>
  );
}
