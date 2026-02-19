import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="text-4xl font-semibold tracking-tight text-foreground">{value}</div>
        {subtitle ? <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div> : null}
      </CardContent>
    </Card>
  );
}
