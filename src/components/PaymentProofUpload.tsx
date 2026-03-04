import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { MAX_PROOF_FILES } from "@/lib/payment-proofs";

interface PaymentProofUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  label?: string;
  existingCount?: number;
}

export const PaymentProofUpload = ({
  files,
  onFilesChange,
  maxFiles = MAX_PROOF_FILES,
  label = "Upload Payment Proof(s)",
  existingCount = 0,
}: PaymentProofUploadProps) => {
  const remainingSlots = maxFiles - existingCount - files.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    const totalAllowed = maxFiles - existingCount;
    const combined = [...files, ...newFiles].slice(0, totalAllowed);
    onFilesChange(combined);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs md:text-sm">{label} (max {maxFiles})</Label>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-1.5 bg-muted rounded text-xs">
              <span className="truncate flex-1">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 ml-2"
                onClick={() => removeFile(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {remainingSlots > 0 && (
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-border rounded-md bg-input text-foreground text-xs md:text-sm"
        />
      )}
      {remainingSlots <= 0 && (
        <p className="text-xs text-muted-foreground">Maximum {maxFiles} files reached</p>
      )}
    </div>
  );
};
