import { cn } from "@/lib/utils";

export type StockStatus = "safe" | "low" | "critical";

interface StockStatusBadgeProps {
  status: StockStatus;
  className?: string;
}

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
  const getStatusConfig = (level: StockStatus) => {
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

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}