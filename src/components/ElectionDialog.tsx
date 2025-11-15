import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ElectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  election?: {
    id: string;
    position: string;
    deadline: string;
  };
}

export const ElectionDialog = ({ open, onClose, onSuccess, election }: ElectionDialogProps) => {
  const [position, setPosition] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (election) {
      setPosition(election.position);
      setDeadline(election.deadline.split('T')[0]);
    } else {
      setPosition("");
      setDeadline("");
    }
  }, [election, open]);

  const handleSave = async () => {
    if (!position.trim() || !deadline) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setSaving(false);
      return;
    }

    if (election) {
      const { error } = await supabase
        .from("elections")
        .update({ 
          position: position.trim(), 
          deadline: new Date(deadline).toISOString()
        })
        .eq("id", election.id);

      if (error) {
        toast.error("Failed to update election");
        console.error(error);
      } else {
        toast.success("Election updated");
        onSuccess?.();
        onClose();
      }
    } else {
      const { error } = await supabase
        .from("elections")
        .insert({ 
          position: position.trim(), 
          deadline: new Date(deadline).toISOString()
        });

      if (error) {
        toast.error("Failed to create election");
        console.error(error);
      } else {
        toast.success("Election created");
        onSuccess?.();
        onClose();
      }
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{election ? "Edit Election" : "Create Election"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., President, Secretary"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : election ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
