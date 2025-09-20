import { apiClient } from './apiClient';

export interface InventoryItem {
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
    level: 'safe' | 'low' | 'critical';
    quantity: number;
  };
  salesVelocity?: number;
  predictedRunOut?: string;
  confidenceScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryResponse {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface InventoryStats {
  total: number;
  lowStock: number;
  critical: number;
  avgVelocity: number;
}

export interface CreateInventoryItemRequest {
  name: string;
  category: string;
  currentStock?: number;
  reorderPoint?: number;
  unitCost?: number;
  sellingPrice?: number;
  supplier?: string;
  location?: string;
}

export interface UpdateInventoryItemRequest extends CreateInventoryItemRequest {
  currentStock: number;
  reorderPoint: number;
}

export const inventoryService = {
  // Get all inventory items with filtering and pagination
  getInventoryItems: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
  }): Promise<InventoryResponse> => {
    return apiClient.get<InventoryResponse>('/inventory', params);
  },

  // Get single inventory item
  getInventoryItem: async (id: string): Promise<InventoryItem> => {
    return apiClient.get<InventoryItem>(`/inventory/${id}`);
  },

  // Create new inventory item
  createInventoryItem: async (data: CreateInventoryItemRequest): Promise<{ id: string; message: string }> => {
    return apiClient.post<{ id: string; message: string }>('/inventory', data);
  },

  // Update inventory item
  updateInventoryItem: async (id: string, data: UpdateInventoryItemRequest): Promise<{ message: string }> => {
    return apiClient.put<{ message: string }>(`/inventory/${id}`, data);
  },

  // Delete inventory item
  deleteInventoryItem: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/inventory/${id}`);
  },

  // Get inventory statistics
  getInventoryStats: async (): Promise<InventoryStats> => {
    return apiClient.get<InventoryStats>('/inventory/stats/overview');
  },
};