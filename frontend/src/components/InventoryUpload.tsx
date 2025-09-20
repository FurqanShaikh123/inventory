import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadService } from "@/services/uploadService";
import { useToast } from "@/hooks/use-toast";

interface InventoryUploadProps {
  uploadType?: 'sales' | 'inventory';
  className?: string;
}

export function InventoryUpload({
  uploadType = 'sales',
  className
}: InventoryUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      return uploadType === 'sales'
        ? uploadService.uploadSalesData(file)
        : uploadService.uploadInventoryData(file);
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful!",
        description: `Processed ${data.recordsProcessed} records successfully.`,
      });

      // Invalidate all related queries to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });

      if (uploadType === 'sales') {
        queryClient.invalidateQueries({ queryKey: ['predictions'] });
        queryClient.invalidateQueries({ queryKey: ['chart-data'] });
      }

      // Also invalidate inventory data that other components use
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadedFile(null);
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file && (file.type === "text/csv" || file.type === "application/json" || file.name.endsWith('.csv') || file.name.endsWith('.json'))) {
      setUploadedFile(file);
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or JSON file.",
        variant: "destructive",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const getTitle = () => {
    return uploadType === 'sales' ? 'Upload Sales Data' : 'Upload Inventory Data';
  };

  const getDescription = () => {
    return uploadType === 'sales'
      ? 'Upload your historical sales data in CSV or JSON format to start predicting inventory needs'
      : 'Upload your current inventory data in CSV or JSON format to update stock levels';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary-light"
              : "border-border hover:border-primary/50",
            uploadedFile && !uploadMutation.isPending && "border-success bg-success-light",
            uploadMutation.isError && "border-critical bg-critical-light"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-primary animate-pulse" />
              <div>
                <p className="font-medium text-primary">Uploading...</p>
                <p className="text-sm text-muted-foreground mt-1">Processing your file</p>
              </div>
            </div>
          ) : uploadedFile && !uploadMutation.isError ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-12 w-12 text-success" />
              <div>
                <p className="font-medium text-success">File uploaded successfully!</p>
                <p className="text-sm text-muted-foreground mt-1">{uploadedFile.name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadedFile(null);
                  const input = document.getElementById('file-input') as HTMLInputElement;
                  if (input) input.value = '';
                  uploadMutation.reset();
                }}
              >
                Upload Different File
              </Button>
            </div>
          ) : uploadMutation.isError ? (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="h-12 w-12 text-critical" />
              <div>
                <p className="font-medium text-critical">Upload failed</p>
                <p className="text-sm text-muted-foreground mt-1">Please try again</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadedFile(null);
                  uploadMutation.reset();
                }}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Drop your file here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse (CSV, JSON files only)
                </p>
              </div>
              <Button variant="outline" className="mt-2" asChild>
                <label htmlFor="file-input" className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Choose File
                </label>
              </Button>
            </div>
          )}

          <input
            id="file-input"
            type="file"
            accept=".csv,.json"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}
