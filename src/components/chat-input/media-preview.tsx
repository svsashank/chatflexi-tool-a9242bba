
import React from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";

interface MediaPreviewProps {
  uploadedImages: Array<{ id: string; file: File; dataUrl: string }>;
  uploadedFiles: Array<{ id: string; file: File; name: string; size: string }>;
  removeImage: (id: string) => void;
  removeFile: (id: string) => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  uploadedImages,
  uploadedFiles,
  removeImage,
  removeFile,
}) => {
  if (uploadedImages.length === 0 && uploadedFiles.length === 0) return null;

  return (
    <div className="border rounded-t-lg p-2 bg-background/50 space-y-2 max-h-48 overflow-y-auto">
      {uploadedImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedImages.map((image) => (
            <div
              key={image.id}
              className="relative group w-16 h-16 rounded-md overflow-hidden"
            >
              <img
                src={image.dataUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-0 right-0 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(image.id)}
              >
                <X size={12} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-1">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm"
            >
              <div className="truncate flex-1">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.size}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(file.id)}
              >
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
