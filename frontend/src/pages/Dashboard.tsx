import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryGrid } from "@/components/InventoryGrid";
import { InventoryChart } from "@/components/InventoryChart";
import { InventoryUpload } from "@/components/InventoryUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Bell,
  Download,
  RefreshCw
} from "lucide-react";
import { inventoryService } from "@/services/inventoryService";
import { predictionsService } from "@/services/predictionsService";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventory items to get the first item for chart
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => inventoryService.getInventoryItems(),
    staleTime: 60000,
  });

  // Get first available item for chart
  const firstItem = inventoryItems?.[0];

  // Fetch inventory statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => inventoryService.getInventoryStats(),
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Fetch low stock alerts
  const { data: alerts } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => predictionsService.getLowStockAlerts(),
    staleTime: 30000,
  });

  // Generate predictions mutation
  const generatePredictionsMutation = useMutation({
    mutationFn: () => predictionsService.generatePredictions(),
    onSuccess: (data) => {
      toast({
        title: "Predictions generated successfully!",
        description: `Updated predictions for ${data.predictions.length} items.`,
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['chart-data'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate predictions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh all data function
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['chart-data'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });

    toast({
      title: "Data refreshed!",
      description: "All dashboard data has been updated.",
    });
  };

  // Export report functionality
  const exportReport = () => {
    if (!stats) {
      toast({
        title: "No data to export",
        description: "Please wait for data to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts: stats.total,
        lowStockItems: stats.lowStock,
        criticalItems: stats.critical,
        averageVelocity: stats.avgVelocity
      },
      alerts: alerts || []
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported!",
      description: "Your inventory report has been downloaded.",
    });
  };

  // Show alerts functionality
  const showAlerts = () => {
    if (!alerts || alerts.length === 0) {
      toast({
        title: "No alerts",
        description: "All items are currently in good stock.",
      });
      return;
    }

    const alertsText = alerts.map(alert =>
      `${alert.name}: ${alert.currentStock} units remaining (${alert.alertLevel} stock)`
    ).join('\n');

    toast({
      title: `${alerts.length} Stock Alert${alerts.length > 1 ? 's' : ''}`,
      description: alertsText,
      duration: 10000,
    });
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Inventory Dashboard</h1>
              <p className="text-muted-foreground">Monitor and predict your inventory levels</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generatePredictionsMutation.mutate()}
                disabled={generatePredictionsMutation.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${generatePredictionsMutation.isPending ? 'animate-spin' : ''}`} />
                Generate Predictions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportReport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={showAlerts}
              >
                <Bell className="mr-2 h-4 w-4" />
                Alerts ({alerts?.length || 0})
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <TrendingDown className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {statsLoading ? "..." : stats?.lowStock || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention soon
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-critical" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-critical">
                {statsLoading ? "..." : stats?.critical || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Immediate restock needed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Sales Velocity</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : (stats?.avgVelocity || 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                units per day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            {firstItem ? (
              <InventoryChart
                itemId={firstItem.id}
                title={`Stock Levels & Predictions - ${firstItem.name}`}
                description={`Historical data and forecasted inventory levels for ${firstItem.name}`}
              />
            ) : (
              <InventoryChart
                title="Stock Levels & Predictions"
                description="Upload inventory data to see charts and predictions"
              />
            )}
          </div>
          <div>
            <InventoryUpload />
          </div>
        </div>

        {/* Inventory Grid */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Inventory Items</h2>
            <p className="text-muted-foreground">
              Monitor individual product stock levels and predictions
            </p>
          </div>
          <InventoryGrid />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;