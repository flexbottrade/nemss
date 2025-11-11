import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Trash2, Plus } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [monthlyDues, setMonthlyDues] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    const { data } = await supabase.from("settings").select("*").single();

    if (data) {
      setMonthlyDues(data.monthly_dues_amount.toString());
      setSettingsId(data.id);
    }
  };

  // Fetch alert recipients
  const { data: recipients = [] } = useQuery({
    queryKey: ["alert-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_recipients")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Add recipient mutation
  const addRecipientMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const { error } = await supabase
        .from("alert_recipients")
        .insert({ phone_number: phoneNumber });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-recipients"] });
      setNewPhoneNumber("");
      toast.success("Recipient added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add recipient");
    },
  });

  // Delete recipient mutation
  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alert_recipients")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-recipients"] });
      toast.success("Recipient deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete recipient");
    },
  });

  const handleSave = async () => {
    if (!monthlyDues || parseFloat(monthlyDues) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (settingsId) {
      const { error } = await supabase
        .from("settings")
        .update({ monthly_dues_amount: parseFloat(monthlyDues) })
        .eq("id", settingsId);

      if (error) {
        toast.error("Failed to update settings");
        return;
      }
    } else {
      const { error } = await supabase
        .from("settings")
        .insert({ monthly_dues_amount: parseFloat(monthlyDues) });

      if (error) {
        toast.error("Failed to save settings");
        return;
      }
    }

    toast.success("Settings saved successfully");
    loadSettings();
  };

  const handleAddRecipient = () => {
    if (!newPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    if (recipients.length >= 1) {
      toast.error("Maximum 1 recipient allowed");
      return;
    }

    if (!newPhoneNumber.startsWith("+")) {
      toast.error("Phone number must start with + and country code");
      return;
    }

    addRecipientMutation.mutate(newPhoneNumber);
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl font-bold">Settings</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Configure system-wide settings and default values for the application
            </p>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Monthly Dues Configuration</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Set the default monthly dues amount that all members are expected to pay
              </p>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="space-y-3 md:space-y-4">
                <div>
                  <Label htmlFor="dues" className="text-xs md:text-sm">Monthly Dues Amount (₦)</Label>
                  <Input
                    id="dues"
                    type="number"
                    value={monthlyDues}
                    onChange={(e) => setMonthlyDues(e.target.value)}
                    placeholder="3000"
                    className="mt-2 text-xs md:text-sm h-8 md:h-10"
                  />
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">
                    This is the standard monthly dues amount that members are expected to pay.
                  </p>
                </div>
                <Button onClick={handleSave} className="text-xs md:text-sm h-8 md:h-10">
                  <Save className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Payment Alert Recipients</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Manage phone numbers that receive WhatsApp payment alerts (Max: 1 number)
              </p>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="space-y-3 md:space-y-4">
                {/* Current Recipients */}
                {recipients.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm">Current Recipient</Label>
                    {recipients.map((recipient: any) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                      >
                        <span className="text-xs md:text-sm font-medium">{recipient.phone_number}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                          disabled={deleteRecipientMutation.isPending}
                          className="h-8 text-xs md:text-sm"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-muted-foreground">
                    No recipients configured. Add a phone number to receive payment alerts.
                  </p>
                )}

                {/* Add New Recipient */}
                {recipients.length < 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs md:text-sm">
                      Add Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        type="text"
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value)}
                        placeholder="+2341234567890"
                        className="text-xs md:text-sm h-8 md:h-10"
                      />
                      <Button
                        onClick={handleAddRecipient}
                        disabled={addRecipientMutation.isPending}
                        className="text-xs md:text-sm h-8 md:h-10"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +234 for Nigeria)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
