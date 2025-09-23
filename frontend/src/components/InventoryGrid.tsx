import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, AlertTriangle, Package, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StockStatusBadge, type StockStatus } from "./StockStatusBadge";
import { inventoryService, type InventoryItem as ServiceInventoryItem } from "@/services/inventoryService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  unitCost?: number;
  sellingPrice?: number;
  supplier?: string;
  location?: string;
  status: {
    level: StockStatus;
    quantity: number;
  };
  salesVelocity?: number;
  predictedRunOut?: string;
  confidenceScore?: number;
}

// Static inventory data as fallback
const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    category: "Electronics",
    currentStock: 45,
    reorderPoint: 20,
    unitCost: 75.00,
    sellingPrice: 149.99,
    supplier: "TechCorp",
    location: "Warehouse A",
    status: { level: "safe", quantity: 45 },
    salesVelocity: 2.5,
    predictedRunOut: "2024-02-15",
    confidenceScore: 0.85
  },
  {
    id: "2",
    name: "Organic Coffee Beans",
    category: "Food & Beverage",
    currentStock: 12,
    reorderPoint: 25,
    unitCost: 8.50,
    sellingPrice: 16.99,
    supplier: "CoffeeSupply Inc",
    location: "Storage B",
    status: { level: "low", quantity: 12 },
    salesVelocity: 4.2,
    predictedRunOut: "2024-01-28",
    confidenceScore: 0.92
  },
  {
    id: "3",
    name: "Bluetooth Smart Watch",
    category: "Electronics",
    currentStock: 3,
    reorderPoint: 15,
    unitCost: 120.00,
    sellingPrice: 249.99,
    supplier: "TechCorp",
    location: "Warehouse A",
    status: { level: "critical", quantity: 3 },
    salesVelocity: 1.8,
    predictedRunOut: "2024-01-25",
    confidenceScore: 0.78
  },
  {
    id: "4",
    name: "Eco-Friendly Water Bottle",
    category: "Lifestyle",
    currentStock: 67,
    reorderPoint: 30,
    unitCost: 12.00,
    sellingPrice: 24.99,
    supplier: "EcoProducts",
    location: "Warehouse C",
    status: { level: "safe", quantity: 67 },
    salesVelocity: 3.1,
    predictedRunOut: "2024-03-10",
    confidenceScore: 0.88
  },
  {
    id: "5",
    name: "Protein Powder Vanilla",
    category: "Health",
    currentStock: 8,
    reorderPoint: 20,
    unitCost: 25.00,
    sellingPrice: 49.99,
    supplier: "HealthSupplements",
    location: "Storage B",
    status: { level: "critical", quantity: 8 },
    salesVelocity: 2.7,
    predictedRunOut: "2024-01-30",
    confidenceScore: 0.81
  },
  {
    id: "6",
    name: "Yoga Mat Premium",
    category: "Fitness",
    currentStock: 23,
    reorderPoint: 15,
    unitCost: 18.00,
    sellingPrice: 39.99,
    supplier: "FitnessGear",
    location: "Warehouse C",
    status: { level: "safe", quantity: 23 },
    salesVelocity: 1.9,
    predictedRunOut: "2024-02-20",
    confidenceScore: 0.76
  },
  {
    id: "7",
    name: "Stainless Steel Cookware Set",
    category: "Kitchen",
    currentStock: 5,
    reorderPoint: 10,
    unitCost: 89.00,
    sellingPrice: 179.99,
    supplier: "KitchenPro",
    location: "Storage A",
    status: { level: "low", quantity: 5 },
    salesVelocity: 1.2,
    predictedRunOut: "2024-02-05",
    confidenceScore: 0.73
  },
  {
    id: "8",
    name: "Gaming Mechanical Keyboard",
    category: "Electronics",
    currentStock: 18,
    reorderPoint: 12,
    unitCost: 65.00,
    sellingPrice: 129.99,
    supplier: "TechCorp",
    location: "Warehouse A",
    status: { level: "safe", quantity: 18 },
    salesVelocity: 2.3,
    predictedRunOut: "2024-02-18",
    confidenceScore: 0.84
  }
];

interface InventoryGridProps {
  className?: string;
}

export function InventoryGrid({ className }: InventoryGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [useStaticData, setUseStaticData] = useState(false);

  // Try to fetch from API, fallback to static data
  const {
    data: apiResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryService.getInventoryItems(),
    retry: 1,
    retryDelay: 1000,
    enabled: !useStaticData,
  });

  // Use API data if available, otherwise use static data
  const inventoryData: InventoryItem[] = useMemo(() => {
    if (!useStaticData && apiResponse?.items) {
      // Convert service items to component items
      return apiResponse.items.map(item => ({
        ...item,
        unitCost: item.unitCost || 0,
        sellingPrice: item.sellingPrice || 0,
        supplier: item.supplier || "Unknown",
        location: item.location || "Unknown",
        salesVelocity: item.salesVelocity || 0,
        predictedRunOut: item.predictedRunOut || null,
        confidenceScore: item.confidenceScore || 0,
      }));
    }
    return MOCK_INVENTORY;
  }, [useStaticData, apiResponse]);

  // If API fails, automatically switch to static data
  if (error && !useStaticData) {
    setUseStaticData(true);
  }

  // Filter items based on search term, status, and category
  const filteredItems = useMemo(() => {
    return inventoryData.filter(item => {
      const matchesSearch = searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || item.status.level === (statusFilter as StockStatus);

      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [inventoryData, searchTerm, statusFilter, categoryFilter]);

  // Get unique categories for filter
  const categories = Array.from(new Set(inventoryData.map(item => item.category)));

  const handleRefresh = () => {
    if (useStaticData) {
      setUseStaticData(false);
      refetch();
    } else {
      refetch();
    }
  };

  const toggleDataSource = () => {
    setUseStaticData(!useStaticData);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredItems.length} items)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {useStaticData && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Demo Data
              </span>
            )}
            {!useStaticData && !error && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Live API
              </span>
            )}
            {error && !useStaticData && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                API Error
              </span>
            )}
          </div>
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="safe">Safe</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleRefresh} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={toggleDataSource} variant="outline" size="sm">
            {useStaticData ? 'Use API' : 'Use Demo'}
          </Button>
        </div>

        {error && !useStaticData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                API connection failed. Using demo data.
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading && !useStaticData && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading inventory...</p>
            </div>
          </div>
        )}

        {(!isLoading || useStaticData) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    <StockStatusBadge status={item.status.level} />
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><span className="font-medium">Category:</span> {item.category}</p>
                    <p><span className="font-medium">Stock:</span> {item.currentStock} units</p>
                    <p><span className="font-medium">Reorder Point:</span> {item.reorderPoint}</p>
                    <p><span className="font-medium">Price:</span> ${item.sellingPrice}</p>
                    <p><span className="font-medium">Supplier:</span> {item.supplier}</p>
                    <p><span className="font-medium">Location:</span> {item.location}</p>

                    {item.status.level !== "safe" && (
                      <div className="flex items-center gap-1 text-amber-600 mt-2">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">
                          {item.status.level === "critical" ? "Critical stock level!" : "Low stock warning"}
                        </span>
                      </div>
                    )}

                    {item.predictedRunOut && (
                      <p className="text-xs"><span className="font-medium">Predicted runout:</span> {item.predictedRunOut}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (!isLoading || useStaticData) && (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No items found</p>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
