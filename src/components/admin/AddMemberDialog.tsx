import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddMemberDialog = ({ open, onOpenChange, onSuccess }: AddMemberDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });

  const generateEmail = (firstName: string, lastName: string) => {
    if (firstName && lastName) {
      return `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}@nemss09.com`;
    }
    return "";
  };

  const handleNameChange = (field: "firstName" | "lastName", value: string) => {
    const updated = { ...formData, [field]: value };
    updated.email = generateEmail(updated.firstName, updated.lastName);
    setFormData(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast.error("Phone number must be 11 digits starting with 0");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('create-member', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Member added successfully! Default password: member09set");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>
            Enter the member's information. A default password (member09set) will be assigned.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleNameChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleNameChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                readOnly
                className="bg-muted cursor-not-allowed"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="08012345678"
                required
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> The member will be created with a default password: <code className="bg-background px-1 py-0.5 rounded">member09set</code>. The member should change this after first login.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
