import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [monthlyDues, setMonthlyDues] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);

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

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-3xl font-bold">Settings</h1>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Monthly Dues Configuration</CardTitle>
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
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
