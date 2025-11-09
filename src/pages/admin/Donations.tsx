import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const Donations = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    minimum_amount: "",
  });

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; minimum_amount: number }) => {
      const { error } = await supabase.from("donations").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast.success("Donation campaign created successfully!");
      setIsCreateOpen(false);
      setFormData({ title: "", minimum_amount: "" });
    },
    onError: (error) => {
      toast.error("Failed to create donation campaign");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("donations")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast.success("Donation campaign updated successfully!");
      setEditingDonation(null);
    },
    onError: (error) => {
      toast.error("Failed to update donation campaign");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast.success("Donation campaign deleted successfully!");
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete donation campaign");
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.minimum_amount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseFloat(formData.minimum_amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (editingDonation) {
      updateMutation.mutate({
        id: editingDonation.id,
        data: { title: formData.title, minimum_amount: amount },
      });
    } else {
      createMutation.mutate({ title: formData.title, minimum_amount: amount });
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateMutation.mutate({
      id,
      data: { is_active: !currentStatus },
    });
  };

  const openEditDialog = (donation: any) => {
    setEditingDonation(donation);
    setFormData({
      title: donation.title,
      minimum_amount: donation.minimum_amount.toString(),
    });
    setIsCreateOpen(true);
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingDonation(null);
    setFormData({ title: "", minimum_amount: "" });
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4 md:mb-6 pl-12 md:pl-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Donation Management</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Create and manage donation campaigns with minimum amounts. Toggle campaigns on/off as needed.
              </p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Campaign</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDonation ? "Edit" : "Create"} Donation Campaign</DialogTitle>
              <DialogDescription>
                {editingDonation ? "Update the" : "Set up a new"} donation campaign details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Year-End Fundraiser"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Minimum Donation Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minimum_amount}
                  onChange={(e) => setFormData({ ...formData, minimum_amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingDonation ? "Update" : "Create"} Campaign
              </Button>
            </form>
              </DialogContent>
            </Dialog>
          </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {donations.map((donation) => (
            <Card key={donation.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base md:text-lg">{donation.title}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditDialog(donation)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteId(donation.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs md:text-sm">
                Minimum: ₦{donation.minimum_amount.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={`active-${donation.id}`} className="text-xs md:text-sm">
                  {donation.is_active ? "Active" : "Inactive"}
                </Label>
                <Switch
                  id={`active-${donation.id}`}
                  checked={donation.is_active}
                  onCheckedChange={() => handleToggleActive(donation.id, donation.is_active)}
                />
              </div>
            </CardContent>
            </Card>
          ))}
        </div>

        {donations.length === 0 && (
          <Card className="p-12 text-center">
            <CardDescription>No donation campaigns yet. Create your first campaign to get started.</CardDescription>
          </Card>
        )}

        <ConfirmationDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Donation Campaign"
        description="Are you sure you want to delete this donation campaign? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
        </div>
      </main>
    </div>
  );
};

export default Donations;
