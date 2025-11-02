import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Reports = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [reportType, setReportType] = useState("finance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select date range");
      return;
    }

    toast.info("Generating report...");

    // In a real app, this would call an edge function to generate PDF
    // For now, we'll show a placeholder message
    setTimeout(() => {
      toast.success("Report generation feature coming soon");
    }, 1000);
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
          <h1 className="text-2xl md:text-3xl font-bold">Generate Reports</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Financial Report</SelectItem>
                    <SelectItem value="dues">Dues Report</SelectItem>
                    <SelectItem value="events">Events Report</SelectItem>
                    <SelectItem value="members">Members Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button onClick={generateReport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Generate PDF Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Financial Report:</strong> Includes total inflow, outflow, balance, and all
                adjustments.
              </p>
              <p>
                <strong>Dues Report:</strong> Shows all members' dues payment status with
                outstanding amounts.
              </p>
              <p>
                <strong>Events Report:</strong> Lists all events and payment contributions.
              </p>
              <p>
                <strong>Members Report:</strong> Complete member list with payment summaries.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
