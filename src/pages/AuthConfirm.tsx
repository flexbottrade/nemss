import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuthConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmAuth = async () => {
      try {
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        
        if (!token_hash || !type) {
          setStatus("error");
          setMessage("Invalid confirmation link. Please request a new one.");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) throw error;

        setStatus("success");
        setMessage("Email verified successfully! Redirecting to dashboard...");
        
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(error.message || "Failed to verify email. The link may have expired.");
      }
    };

    confirmAuth();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border bg-accent shadow-xl">
        <CardHeader className="space-y-1 text-center">
          {status === "loading" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          )}
          {status === "success" && (
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          )}
          {status === "error" && (
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl text-[#0E3B43]">
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-[#0E3B43]/80">
            {message}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full bg-[#0E3B43] text-[#F8E39C] hover:bg-[#0E3B43]/90"
            >
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AuthConfirm;
