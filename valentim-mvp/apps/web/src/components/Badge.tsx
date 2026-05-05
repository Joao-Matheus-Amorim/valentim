import type { BadgeProps } from '../types/ui';

export function Badge({ color = 'teal', children }: BadgeProps) {
  return <span className={`badge ${color}`}>{children}</span>;
}
