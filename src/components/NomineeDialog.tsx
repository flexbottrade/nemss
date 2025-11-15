import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NomineeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  electionId: string;
  existingNominees: string[];
}

export const NomineeDialog = ({ open, onClose, onSuccess, electionId, existingNominees }: NomineeDialogProps) => {
  const [members, setMembers] = useState<Array<{ id: string; first_name: string; last_name: string; member_id: string }>>([]);
  const [selectedNominees, setSelectedNominees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadMembers();
      setSelectedNominees(existingNominees);
    }
  }, [open, existingNominees]);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, member_id")
      .order("first_name");

    if (error) {
      toast.error("Failed to load members");
      console.error(error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  };

  const handleToggle = (memberId: string) => {
    setSelectedNominees(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    setSaving(true);

    // Delete removed nominees
    const toRemove = existingNominees.filter(id => !selectedNominees.includes(id));
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("election_nominees")
        .delete()
        .eq("election_id", electionId)
        .in("nominee_id", toRemove);

      if (error) {
        toast.error("Failed to remove nominees");
        console.error(error);
        setSaving(false);
        return;
      }
    }

    // Add new nominees
    const toAdd = selectedNominees.filter(id => !existingNominees.includes(id));
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("election_nominees")
        .insert(toAdd.map(nominee_id => ({ election_id: electionId, nominee_id })));

      if (error) {
        toast.error("Failed to add nominees");
        console.error(error);
        setSaving(false);
        return;
      }
    }

    toast.success("Nominees updated");
    onSuccess?.();
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Nominees</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded hover:bg-accent">
                  <Checkbox
                    id={member.id}
                    checked={selectedNominees.includes(member.id)}
                    onCheckedChange={() => handleToggle(member.id)}
                  />
                  <Label htmlFor={member.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{member.first_name} {member.last_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({member.member_id})</span>
                  </Label>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
