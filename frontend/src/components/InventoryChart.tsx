import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { predictionsService } from "@/services/predictionsService";

interface ChartData {
  date: string;
  actual: number | null;
  predicted: number | null;
  threshold: number;
}

interface InventoryChartProps {
  itemId?: string;
  title?: string;
  description?: string;
  days?: number;
}

export function InventoryChart({
  itemId = "item-001", // Default to first sample item
  title = "Stock Levels & Predictions",
  description = "Historical data and forecasted inventory levels",
  days = 30
}: InventoryChartProps) {
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['chart-data', itemId, days],
    queryFn: () => predictionsService.getChartData(itemId, days),
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !chartData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>Failed to load chart data</p>
              {error && <p className="text-sm">{error.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              className="text-xs fill-muted-foreground"
            />
            <YAxis className="text-xs fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))" }}
              name="Actual Stock"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--chart-2))" }}
              name="Predicted"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="hsl(var(--chart-3))"
              strokeWidth={1}
              dot={false}
              name="Reorder Point"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}