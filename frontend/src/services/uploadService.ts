import { apiClient } from './apiClient';

export interface UploadResponse {
  message: string;
  recordsProcessed: number;
  recordsSkipped?: number;
  recordsUpdated?: number;
  recordsCreated?: number;
  newItems?: number;
  errors: Array<{
    record: string;
    error: string;
  }>;
}

export interface SampleFormat {
  csv: string;
  json: any[];
}

export const uploadService = {
  // Upload sales data file
  uploadSalesData: async (file: File): Promise<UploadResponse> => {
    return apiClient.uploadFile<UploadResponse>('/upload/sales-data', file);
  },

  // Upload inventory data file
  uploadInventoryData: async (file: File): Promise<UploadResponse> => {
    return apiClient.uploadFile<UploadResponse>('/upload/inventory-data', file);
  },

  // Get sample data format
  getSampleFormat: async (type: 'sales' | 'inventory'): Promise<SampleFormat> => {
    return apiClient.get<SampleFormat>(`/upload/sample-format/${type}`);
  },
};