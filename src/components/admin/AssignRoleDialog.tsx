import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  onSuccess: () => void;
}

export const AssignRoleDialog = ({
  open,
  onOpenChange,
  member,
  onSuccess,
}: AssignRoleDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssignRole = async () => {
    if (!member || !selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if role already exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", member.id)
        .eq("role", selectedRole as any)
        .single();

      if (existingRole) {
        toast.info("User already has this role");
        onOpenChange(false);
        setSelectedRole("");
        setIsSubmitting(false);
        return;
      }

      // Insert the new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ 
          user_id: member.id, 
          role: selectedRole
        } as any);

      if (error) {
        console.error("Error assigning role:", error);
        toast.error(`Failed to assign role: ${error.message}`);
        return;
      }

      toast.success(
        `${member.first_name} ${member.last_name} has been assigned the ${selectedRole} role`
      );
      onSuccess();
      onOpenChange(false);
      setSelectedRole("");
    } catch (err: any) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            Assign a role to {member?.first_name} {member?.last_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="financial_secretary">
                  Financial Secretary
                </SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Role Descriptions:</p>
            <ul className="space-y-1 text-xs">
              <li>
                <strong>Admin:</strong> Full administrative access to all
                features
              </li>
              <li>
                <strong>Financial Secretary:</strong> Can manage payments and
                view financial reports
              </li>
              <li>
                <strong>Moderator:</strong> Can manage content and members
              </li>
              <li>
                <strong>Member:</strong> Standard member access
              </li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleAssignRole} disabled={isSubmitting}>
            {isSubmitting ? "Assigning..." : "Assign Role"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
