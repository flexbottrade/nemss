import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ForumUsernameDialogProps {
  open: boolean;
  onClose: () => void;
  currentUsername?: string;
  userId: string;
}

export const ForumUsernameDialog = ({ open, onClose, currentUsername, userId }: ForumUsernameDialogProps) => {
  const [username, setUsername] = useState(currentUsername || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      toast.error("Username must be between 3 and 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ forum_username: username.trim().toLowerCase() })
      .eq("id", userId);

    if (error) {
      if (error.code === "23505") {
        toast.error("This username is already taken");
      } else {
        toast.error("Failed to set username");
      }
    } else {
      toast.success("Forum username set successfully");
      onClose();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentUsername ? "Edit Forum Username" : "Set Your Forum Username"}
          </DialogTitle>
          <DialogDescription>
            {currentUsername 
              ? "Update your username for the forum"
              : "Choose a unique username to use in the forum. This is separate from your profile name."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Forum Username</Label>
            <Input
              id="username"
              placeholder="e.g., john_doe"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={20}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {currentUsername && (
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading || !username.trim()}>
            {loading ? "Saving..." : "Save Username"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
