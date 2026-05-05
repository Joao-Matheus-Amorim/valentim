import type { Color } from '../types/ui';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';

interface ModulePlaceholderPageProps {
  title: string;
  badge: string;
  color?: Color;
  description: string;
  nextSteps: string[];
}

export function ModulePlaceholderPage({ title, badge, color = 'slate', description, nextSteps }: ModulePlaceholderPageProps) {
  return (
    <div className="stack">
      <div className="page-title">
        <h2>{title}</h2>
        <Badge color={color}>{badge}</Badge>
      </div>
      <Card color={color}>
        <p className="lead">{description}</p>
      </Card>
      <Card title="Próximos passos" color="slate">
        <ul className="list">
          {nextSteps.map((step) => <li key={step}>▸ {step}</li>)}
        </ul>
      </Card>
    </div>
  );
}
