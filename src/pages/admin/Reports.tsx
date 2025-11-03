import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Reports = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [reportType, setReportType] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      setEvents(data || []);
    };
    loadEvents();
  }, []);

  const generateFinanceReport = async () => {
    let duesQuery = supabase
      .from("dues_payments")
      .select("*, profiles(first_name, last_name, member_id)")
      .eq("status", "approved");
    
    if (startDate) duesQuery = duesQuery.gte("created_at", startDate);
    if (endDate) duesQuery = duesQuery.lte("created_at", endDate);
    
    const { data: duesPayments } = await duesQuery;

    let eventQuery = supabase
      .from("event_payments")
      .select("*, profiles(first_name, last_name, member_id), events(title)")
      .eq("status", "approved");
    
    if (startDate) eventQuery = eventQuery.gte("created_at", startDate);
    if (endDate) eventQuery = eventQuery.lte("created_at", endDate);
    
    const { data: eventPayments } = await eventQuery;

    let adjustmentQuery = supabase
      .from("finance_adjustments")
      .select("*, profiles(first_name, last_name)");
    
    if (startDate) adjustmentQuery = adjustmentQuery.gte("created_at", startDate);
    if (endDate) adjustmentQuery = adjustmentQuery.lte("created_at", endDate);
    
    const { data: adjustments } = await adjustmentQuery;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("NEMSS09 Set - Finance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    if (startDate || endDate) {
      const period = `Period: ${startDate ? new Date(startDate).toLocaleDateString() : 'Start'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Now'}`;
      doc.text(period, 14, 34);
    }

    // Summary
    const totalDues = duesPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalEvents = eventPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const totalAdjustments = adjustments?.reduce((sum, a) => {
      return sum + (a.adjustment_type === "income" ? Number(a.amount) : -Number(a.amount));
    }, 0) || 0;
    const balance = totalDues + totalEvents + totalAdjustments;

    doc.setFontSize(12);
    doc.text("Financial Summary", 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Dues: ₦${totalDues.toLocaleString()}`, 14, 48);
    doc.text(`Total Events: ₦${totalEvents.toLocaleString()}`, 14, 54);
    doc.text(`Adjustments: ₦${totalAdjustments.toLocaleString()}`, 14, 60);
    doc.text(`Balance: ₦${balance.toLocaleString()}`, 14, 66);

    // Dues Payments Table
    if (duesPayments && duesPayments.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['Member', 'Member ID', 'Period', 'Amount']],
        body: duesPayments.map(p => [
          `${p.profiles?.first_name} ${p.profiles?.last_name}`,
          p.profiles?.member_id,
          `${p.start_month}/${p.start_year} (${p.months_paid}m)`,
          `₦${Number(p.amount).toLocaleString()}`
        ]),
        theme: 'grid',
        styles: { fontSize: 8 }
      });
    }

    doc.save("finance-report.pdf");
  };

  const generateMemberReport = async () => {
    const { data: settings } = await supabase.from("settings").select("monthly_dues_amount").single();
    const monthlyDues = settings?.monthly_dues_amount || 3000;

    const { data: members } = await supabase
      .from("profiles")
      .select("*")
      .order("first_name");

    const { data: duesPayments } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("status", "approved");

    const memberData = members?.map(member => {
      const payments = duesPayments?.filter(p => p.user_id === member.id) || [];
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const monthsPaid = payments.reduce((sum, p) => sum + p.months_paid, 0);
      
      // Calculate expected dues (assuming since creation date)
      const monthsSinceJoin = Math.floor(
        (new Date().getTime() - new Date(member.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const expectedDues = monthsSinceJoin * monthlyDues;
      const outstanding = expectedDues - totalPaid;

      return {
        ...member,
        totalPaid,
        monthsPaid,
        outstanding: outstanding > 0 ? outstanding : 0,
        status: outstanding > 0 ? "Owing" : "Up-to-date"
      };
    }) || [];

    // Filter based on selection
    let filteredMembers = memberData;
    if (memberFilter === "uptodate") {
      filteredMembers = memberData.filter(m => m.outstanding === 0);
    } else if (memberFilter === "owing") {
      filteredMembers = memberData.filter(m => m.outstanding > 0);
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("NEMSS09 Set - Member Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Filter: ${memberFilter === "all" ? "All Members" : memberFilter === "uptodate" ? "Up-to-date" : "Owing"}`, 14, 34);
    doc.text(`Total Members: ${filteredMembers.length}`, 14, 40);

    autoTable(doc, {
      startY: 48,
      head: [['Name', 'Member ID', 'Total Paid', 'Months Paid', 'Outstanding', 'Status']],
      body: filteredMembers.map(m => [
        `${m.first_name} ${m.last_name}`,
        m.member_id,
        `₦${m.totalPaid.toLocaleString()}`,
        m.monthsPaid,
        `₦${m.outstanding.toLocaleString()}`,
        m.status
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`member-report-${memberFilter}.pdf`);
  };

  const generateDuesReport = async () => {
    let query = supabase
      .from("dues_payments")
      .select("*, profiles(first_name, last_name, member_id)")
      .order("created_at", { ascending: false });
    
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);
    
    const { data: payments } = await query;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("NEMSS09 Set - Dues Payment Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    if (startDate || endDate) {
      const period = `Period: ${startDate ? new Date(startDate).toLocaleDateString() : 'Start'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Now'}`;
      doc.text(period, 14, 34);
    }

    const pending = payments?.filter(p => p.status === "pending").length || 0;
    const approved = payments?.filter(p => p.status === "approved").length || 0;
    const rejected = payments?.filter(p => p.status === "rejected").length || 0;

    doc.text(`Total Payments: ${payments?.length || 0}`, 14, 36);
    doc.text(`Pending: ${pending} | Approved: ${approved} | Rejected: ${rejected}`, 14, 42);

    if (payments && payments.length > 0) {
      autoTable(doc, {
        startY: 50,
        head: [['Member', 'Member ID', 'Period', 'Months', 'Amount', 'Status', 'Date']],
        body: payments.map(p => [
          `${p.profiles?.first_name} ${p.profiles?.last_name}`,
          p.profiles?.member_id,
          `${p.start_month}/${p.start_year}`,
          p.months_paid,
          `₦${Number(p.amount).toLocaleString()}`,
          p.status,
          new Date(p.created_at).toLocaleDateString()
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    doc.save("dues-report.pdf");
  };

  const generateEventReport = async () => {
    let query = supabase
      .from("events")
      .select("*, event_payments(amount, status, profiles(first_name, last_name))")
      .order("event_date", { ascending: false });
    
    // Only filter by specific event if selectedEventId is not empty string
    if (selectedEventId && selectedEventId !== "") {
      query = query.eq("id", selectedEventId);
    }
    if (startDate) query = query.gte("event_date", startDate);
    if (endDate) query = query.lte("event_date", endDate);
    
    const { data: events } = await query;

    if (!events || events.length === 0) {
      toast.error("No events found for the selected criteria");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("NEMSS09 Set - Events Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    if (startDate || endDate) {
      const period = `Period: ${startDate ? new Date(startDate).toLocaleDateString() : 'Start'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Now'}`;
      doc.text(period, 14, 34);
    }

    let yPos = 38;

    events?.forEach((event) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const payments = event.event_payments || [];
      const totalCollected = payments
        .filter((p: any) => p.status === "approved")
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      doc.setFontSize(12);
      doc.text(`${event.title}`, 14, yPos);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date(event.event_date).toLocaleDateString()}`, 14, yPos + 6);
      doc.text(`Amount: ₦${Number(event.amount).toLocaleString()}`, 14, yPos + 12);
      doc.text(`Total Collected: ₦${totalCollected.toLocaleString()}`, 14, yPos + 18);
      doc.text(`Contributors: ${payments.length}`, 14, yPos + 24);

      yPos += 32;
    });

    doc.save("events-report.pdf");
  };

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast.error("Please select a report type");
      return;
    }

    setGenerating(true);
    try {
      switch (reportType) {
        case "finance":
          await generateFinanceReport();
          break;
        case "members":
          await generateMemberReport();
          break;
        case "dues":
          await generateDuesReport();
          break;
        case "events":
          await generateEventReport();
          break;
      }
      toast.success("Report generated successfully");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl font-bold">Generate Reports</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Download detailed PDF reports</p>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-3 md:p-6 pt-0">
              <div>
                <Label className="text-xs md:text-sm">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Finance Report</SelectItem>
                    <SelectItem value="members">Member Report</SelectItem>
                    <SelectItem value="dues">Dues Payment Report</SelectItem>
                    <SelectItem value="events">Events Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "members" && (
                <div>
                  <Label className="text-xs md:text-sm">Member Filter</Label>
                  <Select value={memberFilter} onValueChange={setMemberFilter}>
                    <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="uptodate">Up-to-date Members</SelectItem>
                      <SelectItem value="owing">Owing Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(reportType === "finance" || reportType === "dues" || reportType === "events") && (
                <>
                  <div>
                    <Label className="text-xs md:text-sm">Start Date (Optional)</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-10"
                    />
                  </div>
                </>
              )}

              {reportType === "events" && (
                <div>
                  <Label className="text-xs md:text-sm">Select Event (Optional)</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                      <SelectValue placeholder="All events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleGenerateReport} 
                disabled={generating}
                className="w-full text-xs md:text-sm h-8 md:h-10"
              >
                <Download className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                {generating ? "Generating..." : "Generate PDF Report"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6">
            <Card>
              <CardHeader className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  <CardTitle className="text-sm md:text-base">Finance Report</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Complete financial overview with dues, events, and balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                  <CardTitle className="text-sm md:text-base">Member Report</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Member list with payment status and outstanding amounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-highlight" />
                  <CardTitle className="text-sm md:text-base">Dues Report</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                  All dues payments with status and member details
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  <CardTitle className="text-sm md:text-base">Events Report</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Event contributions and payment collection summary
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
