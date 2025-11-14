import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Spinner } from "@/components/ui/spinner";

const AdminEvents = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [dataLoading, setDataLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    event_date: "",
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadEvents();
    }
  }, [isAdmin]);

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    setEvents(data || []);
    setDataLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.amount || !formData.event_date) {
      toast.error("Title, amount, and event date are required");
      return;
    }

    const eventData = {
      ...formData,
      amount: parseFloat(formData.amount),
    };

    if (editingEvent) {
      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", editingEvent.id);

      if (error) {
        toast.error("Failed to update event");
        return;
      }
      toast.success("Event updated");
    } else {
      const { error } = await supabase.from("events").insert(eventData);

      if (error) {
        toast.error("Failed to create event");
        return;
      }
      toast.success("Event created");
    }

    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData({ title: "", description: "", amount: "", event_date: "" });
    loadEvents();
  };

  const openDialog = (event?: any) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        amount: event.amount.toString(),
        event_date: event.event_date,
      });
    } else {
      setEditingEvent(null);
      setFormData({ title: "", description: "", amount: "", event_date: "" });
    }
    setIsDialogOpen(true);
  };

  if (loading || !isAdmin) {
    return <Spinner size="lg" />;
  }

  if (dataLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1">
          <Spinner size="lg" />
        </main>
      </div>
    );
  }

  const getEventStatus = (eventDate: string) => {
    const now = new Date();
    const date = new Date(eventDate);
    const daysDiff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) return { label: "Past", color: "text-muted-foreground" };
    if (daysDiff <= 7) return { label: "Active", color: "text-green-600" };
    return { label: "Upcoming", color: "text-blue-600" };
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6 pl-12 md:pl-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-3xl font-bold">Events Management</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Create and manage events that require member contributions
                </p>
              </div>
              <Button onClick={() => openDialog()} size="sm" className="text-xs md:text-sm h-8 md:h-10">
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Create Event
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {events.map((event) => {
              const status = getEventStatus(event.event_date);
              return (
                <Card key={event.id}>
                  <CardHeader className="p-3 md:p-6">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm md:text-lg">{event.title}</CardTitle>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    <div className="space-y-1 md:space-y-2">
                      {event.description && (
                        <p className="text-xs md:text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <p className="text-lg md:text-xl font-bold">₦{Number(event.amount).toLocaleString()}</p>
                      <p className="text-xs md:text-sm">
                        Date: {new Date(event.event_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 md:mt-4 w-full text-xs h-7 md:h-9"
                      onClick={() => openDialog(event)}
                    >
                      <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xs md:text-sm text-muted-foreground">No events yet</p>
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-sm md:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">{editingEvent ? "Edit" : "Create"} Event</DialogTitle>
                <DialogDescription className="text-xs md:text-sm">
                  {editingEvent ? "Update event details" : "Add a new event contribution"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <Label className="text-xs md:text-sm">Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Event name"
                    className="text-xs md:text-sm h-8 md:h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Description (Optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description"
                    className="text-xs md:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Amount (₦)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="text-xs md:text-sm h-8 md:h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Event Date</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="text-xs md:text-sm h-8 md:h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="text-xs md:text-sm h-8 md:h-10">Save</Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs md:text-sm h-8 md:h-10">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default AdminEvents;
