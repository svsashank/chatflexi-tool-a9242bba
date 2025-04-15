
import React from "react";
import { X, FileText } from "lucide-react";

interface MediaPreviewProps {
  uploadedImages: string[];
  uploadedFiles: string[];
  removeImage: (index: number) => void;
  removeFile: (index: number) => void;
}

export const MediaPreview = ({ 
  uploadedImages,
  uploadedFiles,
  removeImage,
  removeFile 
}: MediaPreviewProps) => {
  if (uploadedImages.length === 0 && uploadedFiles.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 p-3 rounded-t-xl border border-border border-b-0">
      {uploadedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {uploadedImages.map((image, index) => (
            <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border border-border group hover:shadow-md transition-all">
              <img src={image} alt="Uploaded" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} className="text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => {
            const fileName = file.split('\n')[0].replace('File: ', '');
            return (
              <div 
                key={index} 
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background/50 group hover:bg-background/80 transition-all"
              >
                <FileText size={14} className="text-primary" />
                <span className="text-xs truncate max-w-[150px]">{fileName}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-1 rounded-full p-1 hover:bg-muted"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
