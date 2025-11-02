import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Edit } from "lucide-react";
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

const AdminEvents = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
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
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">Events Management</h1>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const status = getEventStatus(event.event_date);
            return (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                    <p className="text-xl font-bold">₦{Number(event.amount).toLocaleString()}</p>
                    <p className="text-sm">
                      Date: {new Date(event.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => openDialog(event)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events yet</p>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit" : "Create"} Event</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Update event details" : "Add a new event contribution"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event name"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <Label>Amount (₦)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Event Date</Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminEvents;
