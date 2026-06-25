import { Card, CardContent } from '@almio/design-system';

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/70 bg-muted/20 shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
