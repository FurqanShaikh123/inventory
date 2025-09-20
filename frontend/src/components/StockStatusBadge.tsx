import { cn } from "@/lib/utils";

export interface StockStatus {
  level: "safe" | "low" | "critical";
  quantity: number;
  threshold?: number;
}

interface StockStatusBadgeProps {
  status: StockStatus;
  className?: string;
}

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
  const getStatusConfig = (level: StockStatus["level"]) => {
    switch (level) {
      case "safe":
        return {
          label: "Safe",
          className: "bg-success text-success-foreground",
          bgClass: "bg-success-light",
        };
      case "low":
        return {
          label: "Low Stock",
          className: "bg-warning text-warning-foreground",
          bgClass: "bg-warning-light",
        };
      case "critical":
        return {
          label: "Critical",
          className: "bg-critical text-critical-foreground",
          bgClass: "bg-critical-light",
        };
    }
  };

  const config = getStatusConfig(status.level);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          config.className
        )}
      >
        {config.label}
      </span>
      <span className="text-sm text-muted-foreground">
        {status.quantity} units
      </span>
    </div>
  );
}