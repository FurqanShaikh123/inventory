import { apiClient } from './apiClient';

export interface ChartData {
  date: string;
  actual: number | null;
  predicted: number | null;
  threshold: number;
}

export interface Prediction {
  id: string;
  itemId: string;
  itemName: string;
  currentStock?: number;
  reorderPoint?: number;
  predictedRunOutDate: string | null;
  confidenceScore: number;
  salesVelocity: number;
  seasonalFactor: number;
  predictionDate: string;
  modelVersion: string;
}

export interface LowStockAlert {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  predictedRunOut: string | null;
  salesVelocity: number;
  confidenceScore: number;
  alertLevel: 'safe' | 'low' | 'critical' | 'warning';
}

export interface GeneratePredictionsResponse {
  message: string;
  predictions: Array<{
    itemId: string;
    itemName: string;
    salesVelocity: number;
    predictedRunOutDate: string | null;
    confidenceScore: number;
    seasonalFactor: number;
  }>;
}

export const predictionsService = {
  // Generate predictions for all items
  generatePredictions: async (): Promise<GeneratePredictionsResponse> => {
    return apiClient.post<GeneratePredictionsResponse>('/predictions/generate');
  },

  // Get predictions for a specific item
  getItemPredictions: async (itemId: string): Promise<Prediction[]> => {
    return apiClient.get<Prediction[]>(`/predictions/item/${itemId}`);
  },

  // Get chart data for predictions visualization
  getChartData: async (itemId: string, days: number = 30): Promise<ChartData[]> => {
    return apiClient.get<ChartData[]>(`/predictions/chart/${itemId}`, { days });
  },

  // Get low stock alerts
  getLowStockAlerts: async (): Promise<LowStockAlert[]> => {
    return apiClient.get<LowStockAlert[]>('/predictions/alerts/low-stock');
  },
};