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
import { Spinner } from "@/components/ui/spinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateDDMMYY } from "@/lib/utils";

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

  // Helper function to get month name
  const getMonthName = (monthNum: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1];
  };

  // Helper function to format dues period
  const formatDuesPeriod = (startMonth: number, startYear: number, monthsPaid: number) => {
    const lastMonthNumber = startMonth + monthsPaid - 1;
    const endMonth = ((lastMonthNumber - 1) % 12) + 1;
    const endYear = startYear + Math.floor((lastMonthNumber - 1) / 12);
    
    const startMonthName = getMonthName(startMonth);
    const endMonthName = getMonthName(endMonth);
    
    if (startYear === endYear) {
      return `${startMonthName} - ${endMonthName} ${startYear}`;
    } else {
      return `${startMonthName} ${startYear} - ${endMonthName} ${endYear}`;
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
      setEvents(data || []);
    };
    loadEvents();
  }, []);

  const generateFinanceReport = async () => {
    // Fetch all transactions within date range
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

    let donationQuery = supabase
      .from("donation_payments")
      .select("*, profiles(first_name, last_name, member_id), donations(title)")
      .eq("status", "approved");
    
    if (startDate) donationQuery = donationQuery.gte("created_at", startDate);
    if (endDate) donationQuery = donationQuery.lte("created_at", endDate);
    
    const { data: donationPayments } = await donationQuery;

    let adjustmentQuery = supabase
      .from("finance_adjustments")
      .select("*, profiles(first_name, last_name)");
    
    if (startDate) adjustmentQuery = adjustmentQuery.gte("created_at", startDate);
    if (endDate) adjustmentQuery = adjustmentQuery.lte("created_at", endDate);
    
    const { data: adjustments } = await adjustmentQuery;

    // Fetch member waivers for the report
    const { data: memberWaivers } = await supabase
      .from("member_waivers")
      .select("*, profiles(first_name, last_name), events(title)");

    // Create transaction array (bank statement style)
    const transactions: any[] = [];

    // Add dues payments as inflow
    duesPayments?.forEach(p => {
      transactions.push({
        date: new Date(p.created_at),
        payer: `${p.profiles?.first_name} ${p.profiles?.last_name}`,
        description: `Dues Payment (${formatDuesPeriod(p.start_month, p.start_year, p.months_paid)} - ${p.months_paid}m)`,
        amount: Number(p.amount),
        type: 'inflow'
      });
    });

    // Add event payments as inflow
    eventPayments?.forEach(p => {
      transactions.push({
        date: new Date(p.created_at),
        payer: `${p.profiles?.first_name} ${p.profiles?.last_name}`,
        description: `Event: ${p.events?.title}`,
        amount: Number(p.amount),
        type: 'inflow'
      });
    });

    // Add donation payments as inflow
    donationPayments?.forEach(p => {
      transactions.push({
        date: new Date(p.created_at),
        payer: `${p.profiles?.first_name} ${p.profiles?.last_name}`,
        description: `Donation: ${p.donations?.title}`,
        amount: Number(p.amount),
        type: 'inflow'
      });
    });

    // Add adjustments (both inflow and outflow)
    adjustments?.forEach(a => {
      const isInflow = a.adjustment_type === "inflow" || a.adjustment_type === "income";
      const adjustmentLabel = isInflow ? 'Inflow' : 'Outflow';
      transactions.push({
        date: new Date(a.created_at),
        payer: isInflow ? (a.profiles ? `${a.profiles.first_name} ${a.profiles.last_name}` : 'System') : 'N/A',
        description: `${adjustmentLabel}: ${a.reason || 'No reason provided'}`,
        amount: Number(a.amount),
        type: isInflow ? 'inflow' : 'outflow'
      });
    });

    // Sort transactions by date (oldest first)
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate totals
    const totalInflow = transactions
      .filter(t => t.type === 'inflow')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalOutflow = transactions
      .filter(t => t.type === 'outflow')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentBalance = totalInflow - totalOutflow;

    // Create PDF
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("NEMSS09 Set - Finance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateDDMMYY(new Date())}`, 14, 28);
    
    // Date range
    const dateRange = startDate && endDate 
      ? `${formatDateDDMMYY(new Date(startDate))} - ${formatDateDDMMYY(new Date(endDate))}`
      : startDate 
      ? `From ${formatDateDDMMYY(new Date(startDate))}`
      : endDate
      ? `Until ${formatDateDDMMYY(new Date(endDate))}`
      : 'All Time';
    
    doc.text(`Statement Period: ${dateRange}`, 14, 34);

    // Financial Summary
    doc.setFontSize(12);
    doc.text("Financial Summary", 14, 44);
    doc.setFontSize(10);
    doc.setTextColor(0, 150, 0); // Green for inflow
    doc.text(`Total Inflow: NGN ${totalInflow.toLocaleString()}`, 14, 52);
    doc.setTextColor(200, 0, 0); // Red for outflow
    doc.text(`Total Outflow: NGN ${totalOutflow.toLocaleString()}`, 14, 58);
    doc.setTextColor(0, 0, 0); // Black for balance
    doc.text(`Current Balance: NGN ${currentBalance.toLocaleString()}`, 14, 64);

    // Transactions Table (Bank Statement Style)
    let yPos = 72;
    if (transactions.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Payer', 'Description', 'Amount']],
        body: transactions.map(t => [
          formatDateDDMMYY(t.date),
          t.payer,
          t.description,
          `NGN ${t.amount.toLocaleString()}`
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        didParseCell: function(data) {
          // Color code amounts column
          if (data.column.index === 3 && data.section === 'body') {
            const rowIndex = data.row.index;
            const transaction = transactions[rowIndex];
            if (transaction.type === 'inflow') {
              data.cell.styles.textColor = [0, 150, 0]; // Green
            } else {
              data.cell.styles.textColor = [200, 0, 0]; // Red
            }
          }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.text("No transactions found for the selected period", 14, 80);
      yPos = 90;
    }

    // Add Waivers Section
    if (memberWaivers && memberWaivers.length > 0) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Member Waivers Summary", 14, yPos);
      yPos += 8;

      const duesWaivers = memberWaivers.filter((w: any) => w.waiver_type === 'dues');
      const eventWaivers = memberWaivers.filter((w: any) => w.waiver_type === 'event');

      if (duesWaivers.length > 0) {
        doc.setFontSize(10);
        doc.text("Dues Waivers:", 14, yPos);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Year', 'Months Waived', 'Notes']],
          body: duesWaivers.map((w: any) => [
            `${w.profiles?.first_name} ${w.profiles?.last_name}`,
            w.year,
            (w.months || []).map((m: number) => getMonthName(m)).join(', '),
            w.notes || '-'
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 165, 0] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (eventWaivers.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.text("Event Waivers:", 14, yPos);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Member', 'Event', 'Notes']],
          body: eventWaivers.map((w: any) => [
            `${w.profiles?.first_name} ${w.profiles?.last_name}`,
            w.events?.title || '-',
            w.notes || '-'
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 165, 0] },
        });
      }
    }

    doc.save("finance-report.pdf");
  };

  const generateMemberReport = async () => {
    const { data: settings } = await supabase.from("settings").select("monthly_dues_amount").single();
    const defaultMonthlyDues = settings?.monthly_dues_amount || 3000;

    const { data: members } = await supabase
      .from("profiles")
      .select("*")
      .eq("email_verified", true)
      .neq("role", "admin")
      .order("first_name");

    const { data: duesPayments } = await supabase
      .from("dues_payments")
      .select("*")
      .eq("status", "approved");

    const { data: variableDuesSettings } = await supabase
      .from("variable_dues_settings")
      .select("*")
      .order("year");

    // Fetch all events and event payments
    const { data: allEvents } = await supabase
      .from("events")
      .select("*");

    const { data: eventPayments } = await supabase
      .from("event_payments")
      .select("*")
      .eq("status", "approved");

    // Fetch member waivers
    const { data: allWaivers } = await supabase
      .from("member_waivers")
      .select("*");

    const memberData = members?.map(member => {
      // Calculate dues
      const payments = duesPayments?.filter(p => p.user_id === member.id) || [];
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      // Get all months they've paid for
      const paidMonths = new Set<string>();
      payments.forEach(payment => {
        const startMonth = payment.start_month;
        const startYear = payment.start_year;
        for (let i = 0; i < payment.months_paid; i++) {
          const month = ((startMonth + i - 1) % 12) + 1;
          const year = startYear + Math.floor((startMonth + i - 1) / 12);
          paidMonths.add(`${year}-${month}`);
        }
      });

      // Calculate expected dues from January 2023 to current date for ALL members
      const currentDate = new Date();
      let expectedDues = 0;
      
      // Get member's waivers
      const memberWaivers = allWaivers?.filter((w: any) => w.user_id === member.id) || [];
      const duesWaivers = memberWaivers.filter((w: any) => w.waiver_type === 'dues');
      const eventWaivers = memberWaivers.filter((w: any) => w.waiver_type === 'event');
      const waivedEventIds = eventWaivers.map((w: any) => w.event_id);
      
      // Start from January 2023 for all members
      let date = new Date(2023, 0, 1);
      while (date <= currentDate) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${month}`;
        
        // Check if this month is waived for this member
        const yearWaivers = duesWaivers.filter((w: any) => w.year === year);
        const waivedMonths = yearWaivers.flatMap((w: any) => w.months || []);
        const isMonthWaived = waivedMonths.includes(month);
        
        // Check if this month has been paid
        if (!paidMonths.has(monthKey) && !isMonthWaived) {
          // Find the monthly amount for this year
          const yearSetting = variableDuesSettings?.find(s => s.year === year);
          const monthlyAmount = yearSetting 
            ? (yearSetting.is_waived ? 0 : Number(yearSetting.monthly_amount))
            : defaultMonthlyDues;
          
          expectedDues += monthlyAmount;
        }
        
        date.setMonth(date.getMonth() + 1);
      }

      const monthsPaid = payments.reduce((sum, p) => sum + p.months_paid, 0);
      const hasWaivers = memberWaivers.length > 0;

      // Calculate event payments owed (excluding waived events)
      const memberEventPayments = eventPayments?.filter(ep => ep.user_id === member.id) || [];
      const paidEventIds = memberEventPayments.map(ep => ep.event_id);
      
      // Find events that happened but member hasn't paid for (excluding waived)
      const unpaidEvents = allEvents?.filter(event => {
        const eventDate = new Date(event.event_date);
        const memberJoinDate = new Date(member.created_at);
        return eventDate >= memberJoinDate && eventDate <= new Date() && 
          !paidEventIds.includes(event.id) && !waivedEventIds.includes(event.id);
      }) || [];

      const eventsOutstanding = unpaidEvents.reduce((sum, event) => sum + Number(event.amount), 0);
      const totalOutstanding = expectedDues + eventsOutstanding;

      // Determine status based on outstanding balance (excluding waived amounts)
      let status = "Up to Date";
      if (totalOutstanding > 0) {
        status = "Owing";
      }

      return {
        ...member,
        totalPaid,
        monthsPaid,
        outstanding: totalOutstanding,
        duesOutstanding: expectedDues,
        eventsOutstanding,
        hasWaivers,
        status
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
    doc.text(`Generated: ${formatDateDDMMYY(new Date())}`, 14, 28);
    doc.text(`Filter: ${memberFilter === "all" ? "All Members" : memberFilter === "uptodate" ? "Up-to-date" : "Owing"}`, 14, 34);
    doc.text(`Total Members: ${filteredMembers.length}`, 14, 40);

    autoTable(doc, {
      startY: 48,
      head: [['Name', 'Member ID', 'Total Paid', 'Months Paid', 'Outstanding', 'Status']],
      body: filteredMembers.map(m => [
        `${m.first_name} ${m.last_name}`,
        m.member_id,
        `NGN ${m.totalPaid.toLocaleString()}`,
        m.monthsPaid,
        `NGN ${m.outstanding.toLocaleString()}`,
        m.status
      ]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      didParseCell: function(data) {
        // Color code status column
        if (data.column.index === 5 && data.section === 'body') {
          const rowIndex = data.row.index;
          const member = filteredMembers[rowIndex];
          if (member.status === 'Owing') {
            data.cell.styles.textColor = [200, 0, 0]; // Red
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [0, 150, 0]; // Green
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Color code outstanding amount column
        if (data.column.index === 4 && data.section === 'body') {
          const rowIndex = data.row.index;
          const member = filteredMembers[rowIndex];
          if (member.outstanding > 0) {
            data.cell.styles.textColor = [200, 0, 0]; // Red for owing amounts
          }
        }
      }
    });

    doc.save(`member-report-${memberFilter}.pdf`);
  };

  const generateEventReport = async () => {
    // Fetch all members
    const { data: allMembers } = await supabase
      .from("profiles")
      .select("*")
      .eq("email_verified", true)
      .neq("role", "admin")
      .order("first_name");

    // Fetch event waivers
    const { data: eventWaivers } = await supabase
      .from("member_waivers")
      .select("*")
      .eq("waiver_type", "event");

    let query = supabase
      .from("events")
      .select("*, event_payments(user_id, amount, status, profiles(first_name, last_name))")
      .order("event_date", { ascending: false });
    
    // Only filter by specific event if selectedEventId is provided and not empty/default
    if (selectedEventId && selectedEventId !== "" && selectedEventId !== "all") {
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
    doc.text(`Generated: ${formatDateDDMMYY(new Date())}`, 14, 28);
    if (startDate || endDate) {
      const period = `Period: ${startDate ? formatDateDDMMYY(new Date(startDate)) : 'Start'} - ${endDate ? formatDateDDMMYY(new Date(endDate)) : 'Now'}`;
      doc.text(period, 14, 34);
    }

    let yPos = 38;

    events?.forEach((event) => {
      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      const payments = event.event_payments || [];
      const approvedPayments = payments.filter((p: any) => p.status === "approved");
      const totalCollected = approvedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      // Get member IDs who paid for this event
      const paidMemberIds = approvedPayments.map((p: any) => p.user_id);

      // Get waived members for this event with their notes
      const eventWaiversForEvent = eventWaivers?.filter((w: any) => w.event_id === event.id) || [];
      const waivedMemberIds = eventWaiversForEvent.map((w: any) => w.user_id);

      // Separate members into paid, waived, and unpaid
      const paidMembers = allMembers?.filter(m => paidMemberIds.includes(m.id)) || [];
      const waivedMembers = allMembers?.filter(m => waivedMemberIds.includes(m.id) && !paidMemberIds.includes(m.id)).map(m => {
        const waiver = eventWaiversForEvent.find((w: any) => w.user_id === m.id);
        return { ...m, waiverReason: waiver?.notes || '-' };
      }) || [];
      const unpaidMembers = allMembers?.filter(m => !paidMemberIds.includes(m.id) && !waivedMemberIds.includes(m.id)) || [];

      doc.setFontSize(12);
      doc.text(`${event.title}`, 14, yPos);
      doc.setFontSize(10);
      doc.text(`Date: ${formatDateDDMMYY(new Date(event.event_date))}`, 14, yPos + 6);
      doc.text(`Amount: NGN ${Number(event.amount).toLocaleString()}`, 14, yPos + 12);
      doc.text(`Total Collected: NGN ${totalCollected.toLocaleString()}`, 14, yPos + 18);
      doc.text(`Paid: ${paidMembers.length} | Waived: ${waivedMembers.length} | Unpaid: ${unpaidMembers.length}`, 14, yPos + 24);

      yPos += 32;

      // Add table for paid members
      if (paidMembers.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(0, 150, 0);
        doc.text("Members Who Paid:", 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Name', 'Member ID']],
          body: paidMembers.map(m => [
            `${m.first_name} ${m.last_name}`,
            m.member_id
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [0, 150, 0] },
          margin: { left: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      // Add table for waived members
      if (waivedMembers.length > 0) {
        // Check if we need a new page for waived table
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(255, 140, 0); // Orange for waived
        doc.text("Members Waived:", 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Name', 'Member ID', 'Reason']],
          body: waivedMembers.map(m => [
            `${m.first_name} ${m.last_name}`,
            m.member_id,
            m.waiverReason
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 165, 0] }, // Orange header
          margin: { left: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      // Add table for unpaid members
      if (unpaidMembers.length > 0) {
        // Check if we need a new page for unpaid table
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text("Members Who Did Not Pay:", 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Name', 'Member ID']],
          body: unpaidMembers.map(m => [
            `${m.first_name} ${m.last_name}`,
            m.member_id
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [200, 0, 0] },
          margin: { left: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;
      }

      // Add extra space between events
      yPos += 8;
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
    return <Spinner size="lg" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl font-bold">Generate Reports</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Create detailed PDF reports for finances, member payments, and event attendance
            </p>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Report Configuration</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Select report type and customize filters to generate your desired report
              </p>
            </CardHeader>
            <CardContent className="space-y-4 p-3 md:p-6 pt-0">
              <div>
                <Label className="text-xs md:text-sm">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Finance Report - All transactions with inflow/outflow details</SelectItem>
                    <SelectItem value="members">Member Report - Payment status and outstanding balances</SelectItem>
                    <SelectItem value="events">Events Report - Event attendance and payment tracking</SelectItem>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Filter members by their payment status
                  </p>
                </div>
              )}

              {reportType === "finance" && (
                <>
                  <div>
                    <Label className="text-xs md:text-sm">Start Date (Optional)</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Filter transactions from this date onwards
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm">End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs md:text-sm h-8 md:h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Filter transactions up to this date
                    </p>
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
                      <SelectItem value="all">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate report for a specific event or all events
                  </p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
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
