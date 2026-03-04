import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { parseProofUrls } from "@/lib/payment-proofs";

interface PaymentProofViewerProps {
  proofUrl: string | null | undefined;
  size?: "sm" | "default";
}

export const PaymentProofViewer = ({ proofUrl, size = "sm" }: PaymentProofViewerProps) => {
  const urls = parseProofUrls(proofUrl);

  if (urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((url, index) => (
        <Button
          key={index}
          size="sm"
          variant="outline"
          className="h-7 text-xs flex items-center gap-1"
          onClick={() => window.open(url, "_blank")}
        >
          <Eye className="w-3 h-3" />
          {urls.length === 1 ? "View Proof" : `Proof ${index + 1}`}
        </Button>
      ))}
    </div>
  );
};
