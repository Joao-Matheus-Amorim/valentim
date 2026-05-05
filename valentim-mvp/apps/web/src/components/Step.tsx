import type { Color } from '../types/ui';
import { Badge } from './Badge';

interface StepProps {
  n: string;
  actor: string;
  action: string;
  detail: string;
  color: Color;
}

export function Step({ n, actor, action, detail, color }: StepProps) {
  return (
    <div className="step">
      <div className={`step-number ${color}`}>{n}</div>
      <div>
        <div className="step-head">
          <Badge color={color}>{actor}</Badge>
          <strong>{action}</strong>
        </div>
        <p>{detail}</p>
      </div>
    </div>
  );
}
