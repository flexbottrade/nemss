import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Edit, Ban } from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

interface MemberWaiverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; first_name: string; last_name: string } | null;
  onSuccess: () => void;
}

interface Waiver {
  id: string;
  waiver_type: 'dues' | 'event';
  year?: number;
  months?: number[];
  event_id?: string;
  notes?: string;
  events?: { title: string };
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const MemberWaiverDialog = ({ open, onOpenChange, member, onSuccess }: MemberWaiverDialogProps) => {
  const [activeTab, setActiveTab] = useState<"dues" | "events">("dues");
  const [loading, setLoading] = useState(false);
  
  // Dues waiver state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [duesNotes, setDuesNotes] = useState("");
  
  // Event waiver state
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventNotes, setEventNotes] = useState("");
  
  // Existing waivers
  const [existingWaivers, setExistingWaivers] = useState<Waiver[]>([]);
  
  // Edit mode
  const [editingWaiver, setEditingWaiver] = useState<Waiver | null>(null);
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (open && member) {
      loadData();
    }
  }, [open, member]);

  useEffect(() => {
    if (editingWaiver) {
      if (editingWaiver.waiver_type === 'dues') {
        setActiveTab('dues');
        setSelectedYear(editingWaiver.year || new Date().getFullYear());
        setSelectedMonths(editingWaiver.months || []);
        setDuesNotes(editingWaiver.notes || "");
      } else {
        setActiveTab('events');
        setSelectedEventId(editingWaiver.event_id || "");
        setEventNotes(editingWaiver.notes || "");
      }
    }
  }, [editingWaiver]);

  const loadData = async () => {
    if (!member) return;
    
    // Load events
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });
    setEvents(eventsData || []);
    
    // Load existing waivers for this member
    const { data: waiversData } = await supabase
      .from("member_waivers")
      .select("*, events(title)")
      .eq("user_id", member.id);
    setExistingWaivers((waiversData as Waiver[]) || []);
  };

  const resetForm = () => {
    setSelectedMonths([]);
    setDuesNotes("");
    setSelectedEventId("");
    setEventNotes("");
    setEditingWaiver(null);
  };

  const handleAddDuesWaiver = async () => {
    if (!member || selectedMonths.length === 0) {
      toast.error("Please select at least one month");
      return;
    }

    setConfirmDialog({
      open: true,
      title: editingWaiver ? "Update Dues Waiver" : "Confirm Dues Waiver",
      description: `Are you sure you want to ${editingWaiver ? 'update' : 'waive'} dues for ${member.first_name} ${member.last_name} for ${selectedMonths.length} month(s) in ${selectedYear}? This will mark those months as paid.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (editingWaiver) {
            const { error } = await supabase
              .from("member_waivers")
              .update({
                year: selectedYear,
                months: selectedMonths,
                notes: duesNotes || null,
              })
              .eq("id", editingWaiver.id);
            
            if (error) throw error;
            toast.success("Dues waiver updated successfully");
          } else {
            const { error } = await supabase
              .from("member_waivers")
              .insert({
                user_id: member.id,
                waiver_type: "dues",
                year: selectedYear,
                months: selectedMonths,
                notes: duesNotes || null,
                created_by: user?.id,
              });
            
            if (error) throw error;
            toast.success("Dues waiver added successfully");
          }
          
          resetForm();
          loadData();
          onSuccess();
        } catch (error: any) {
          console.error("Error adding dues waiver:", error);
          toast.error(error.message || "Failed to add dues waiver");
        } finally {
          setLoading(false);
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      },
    });
  };

  const handleAddEventWaiver = async () => {
    if (!member || !selectedEventId) {
      toast.error("Please select an event");
      return;
    }

    const selectedEvent = events.find(e => e.id === selectedEventId);

    setConfirmDialog({
      open: true,
      title: editingWaiver ? "Update Event Waiver" : "Confirm Event Waiver",
      description: `Are you sure you want to ${editingWaiver ? 'update' : 'waive'} the event payment for "${selectedEvent?.title}" for ${member.first_name} ${member.last_name}? This will mark the event as paid.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (editingWaiver) {
            const { error } = await supabase
              .from("member_waivers")
              .update({
                event_id: selectedEventId,
                notes: eventNotes || null,
              })
              .eq("id", editingWaiver.id);
            
            if (error) throw error;
            toast.success("Event waiver updated successfully");
          } else {
            const { error } = await supabase
              .from("member_waivers")
              .insert({
                user_id: member.id,
                waiver_type: "event",
                event_id: selectedEventId,
                notes: eventNotes || null,
                created_by: user?.id,
              });
            
            if (error) throw error;
            toast.success("Event waiver added successfully");
          }
          
          resetForm();
          loadData();
          onSuccess();
        } catch (error: any) {
          console.error("Error adding event waiver:", error);
          toast.error(error.message || "Failed to add event waiver");
        } finally {
          setLoading(false);
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      },
    });
  };

  const handleDeleteWaiver = (waiver: Waiver) => {
    const description = waiver.waiver_type === 'dues'
      ? `Are you sure you want to remove the dues waiver for ${waiver.year}? The member will owe for those months again.`
      : `Are you sure you want to remove the event waiver for "${waiver.events?.title}"? The member will owe for this event again.`;
    
    setConfirmDialog({
      open: true,
      title: "Remove Waiver",
      description,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("member_waivers")
            .delete()
            .eq("id", waiver.id);
          
          if (error) throw error;
          toast.success("Waiver removed successfully");
          loadData();
          onSuccess();
        } catch (error: any) {
          console.error("Error deleting waiver:", error);
          toast.error(error.message || "Failed to remove waiver");
        } finally {
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      },
    });
  };

  const handleEditWaiver = (waiver: Waiver) => {
    setEditingWaiver(waiver);
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const getMonthLabel = (months: number[]) => {
    return months.map(m => MONTHS.find(mo => mo.value === m)?.label).join(", ");
  };

  // Get already waived events
  const waivedEventIds = existingWaivers
    .filter(w => w.waiver_type === 'event')
    .map(w => w.event_id);

  // Get already waived months for selected year
  const waivedMonthsForYear = existingWaivers
    .filter(w => w.waiver_type === 'dues' && w.year === selectedYear && w.id !== editingWaiver?.id)
    .flatMap(w => w.months || []);

  const currentYear = new Date().getFullYear();
  // Filter out 2025 since it's automatically waived for all members
  const years = Array.from({ length: currentYear - 2023 + 2 }, (_, i) => currentYear + 1 - i).filter(year => year !== 2025);

  const duesWaivers = existingWaivers.filter(w => w.waiver_type === 'dues');
  const eventWaivers = existingWaivers.filter(w => w.waiver_type === 'event');

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Manage Waivers - {member?.first_name} {member?.last_name}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "dues" | "events"); resetForm(); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dues">Dues Waivers</TabsTrigger>
              <TabsTrigger value="events">Event Waivers</TabsTrigger>
            </TabsList>

            <TabsContent value="dues" className="space-y-4">
              {/* Existing Dues Waivers */}
              {duesWaivers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Existing Dues Waivers</Label>
                  <div className="space-y-2">
                    {duesWaivers.map(waiver => (
                      <Card key={waiver.id} className="bg-muted/50">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {waiver.year} - {getMonthLabel(waiver.months || [])}
                            </p>
                            {waiver.notes && (
                              <p className="text-xs text-muted-foreground">{waiver.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWaiver(waiver)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWaiver(waiver)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Add/Edit Dues Waiver Form */}
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">
                  {editingWaiver ? "Edit Dues Waiver" : "Add New Dues Waiver"}
                </Label>
                
                <div>
                  <Label className="text-xs">Year</Label>
                  <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Select Months to Waive</Label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {MONTHS.map(month => {
                      const isWaived = waivedMonthsForYear.includes(month.value);
                      return (
                        <div key={month.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`month-${month.value}`}
                            checked={selectedMonths.includes(month.value)}
                            onCheckedChange={() => toggleMonth(month.value)}
                            disabled={isWaived}
                          />
                          <Label 
                            htmlFor={`month-${month.value}`} 
                            className={`text-xs cursor-pointer ${isWaived ? 'text-muted-foreground line-through' : ''}`}
                          >
                            {month.label}
                            {isWaived && " (waived)"}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Notes (Optional)</Label>
                  <Textarea
                    value={duesNotes}
                    onChange={(e) => setDuesNotes(e.target.value)}
                    placeholder="Reason for waiver..."
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  {editingWaiver && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="text-xs"
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    onClick={handleAddDuesWaiver}
                    disabled={loading || selectedMonths.length === 0}
                    className="text-xs"
                  >
                    {loading ? "Processing..." : editingWaiver ? "Update Waiver" : "Add Dues Waiver"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              {/* Existing Event Waivers */}
              {eventWaivers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Existing Event Waivers</Label>
                  <div className="space-y-2">
                    {eventWaivers.map(waiver => (
                      <Card key={waiver.id} className="bg-muted/50">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{waiver.events?.title}</p>
                            {waiver.notes && (
                              <p className="text-xs text-muted-foreground">{waiver.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditWaiver(waiver)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWaiver(waiver)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Add/Edit Event Waiver Form */}
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">
                  {editingWaiver ? "Edit Event Waiver" : "Add New Event Waiver"}
                </Label>

                <div>
                  <Label className="text-xs">Select Event</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choose an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => {
                        const isWaived = waivedEventIds.includes(event.id) && editingWaiver?.event_id !== event.id;
                        return (
                          <SelectItem 
                            key={event.id} 
                            value={event.id}
                            disabled={isWaived}
                          >
                            {event.title} {isWaived && "(waived)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Notes (Optional)</Label>
                  <Textarea
                    value={eventNotes}
                    onChange={(e) => setEventNotes(e.target.value)}
                    placeholder="Reason for waiver..."
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  {editingWaiver && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="text-xs"
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    onClick={handleAddEventWaiver}
                    disabled={loading || !selectedEventId}
                    className="text-xs"
                  >
                    {loading ? "Processing..." : editingWaiver ? "Update Waiver" : "Add Event Waiver"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
      />
    </>
  );
};
