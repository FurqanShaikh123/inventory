import { useState, useMemo } from "react";
import { Search, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StockStatusBadge, type StockStatus } from "./StockStatusBadge";
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
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  location: string;
  status: StockStatus;
  salesVelocity: number;
  predictedRunOut: string | null;
  confidenceScore: number;
}

// Static inventory data
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
    status: { level: "safe" as const, quantity: 45 },
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
    status: { level: "low" as const, quantity: 12 },
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
    status: { level: "critical" as const, quantity: 3 },
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
    status: { level: "safe" as const, quantity: 67 },
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
    status: { level: "critical" as const, quantity: 8 },
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
    status: { level: "safe" as const, quantity: 23 },
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
    status: { level: "low" as const, quantity: 5 },
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
    status: { level: "safe" as const, quantity: 18 },
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

  // Filter items based on search term, status, and category
  const filteredItems = useMemo(() => {
    return MOCK_INVENTORY.filter(item => {
      const matchesSearch = searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || item.status.level === statusFilter;

      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, statusFilter, categoryFilter]);

  // Get unique categories for filter
  const categories = Array.from(new Set(MOCK_INVENTORY.map(item => item.category)));

  return (
    <div className={className}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                </div>
                {item.status.level === "critical" && (
                  <AlertTriangle className="h-5 w-5 text-critical" />
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <StockStatusBadge status={item.status} />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Stock</p>
                  <p className="font-medium">{item.currentStock} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reorder Point</p>
                  <p className="font-medium">{item.reorderPoint} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unit Cost</p>
                  <p className="font-medium">${item.unitCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Selling Price</p>
                  <p className="font-medium">${item.sellingPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Supplier: {item.supplier}</p>
                <p className="text-xs text-muted-foreground">Location: {item.location}</p>
              </div>

              {item.predictedRunOut && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Predicted run-out</p>
                  <p className="text-sm font-medium">
                    {new Date(item.predictedRunOut).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No items found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}