import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Dues Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dues">Monthly Dues Amount (₦)</Label>
                <Input
                  id="dues"
                  type="number"
                  value={monthlyDues}
                  onChange={(e) => setMonthlyDues(e.target.value)}
                  placeholder="3000"
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  This is the standard monthly dues amount that members are expected to pay.
                </p>
              </div>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
