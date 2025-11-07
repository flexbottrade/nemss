import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailVerificationDialogProps {
  open: boolean;
  email: string;
}

export const EmailVerificationDialog = ({ open, email }: EmailVerificationDialogProps) => {
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResendVerification = async () => {
    if (!canResend) return;

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast.success("Verification email sent! Please check your inbox.");
      setCountdown(300); // 5 minutes
      setCanResend(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Verify Your Email</DialogTitle>
          <DialogDescription className="text-center">
            We've sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-center">
            <p className="mb-2">Didn't receive the email?</p>
            <p className="text-xs text-muted-foreground">Check your spam folder or request a new verification link.</p>
          </div>
          <Button
            onClick={handleResendVerification}
            disabled={!canResend}
            className="w-full"
            variant="outline"
          >
            {canResend ? (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Link
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Resend in {formatTime(countdown)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
