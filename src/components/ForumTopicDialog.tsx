import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ForumTopicDialogProps {
  open: boolean;
  onClose: () => void;
  topic?: {
    id: string;
    title: string;
    description: string;
  };
}

export const ForumTopicDialog = ({ open, onClose, topic }: ForumTopicDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setDescription(topic.description);
    } else {
      setTitle("");
      setDescription("");
    }
  }, [topic, open]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setSaving(false);
      return;
    }

    if (topic) {
      const { error } = await supabase
        .from("forum_topics")
        .update({ title: title.trim(), description: description.trim() })
        .eq("id", topic.id);

      if (error) {
        toast.error("Failed to update topic");
        console.error(error);
      } else {
        toast.success("Topic updated");
        onClose();
      }
    } else {
      const { error } = await supabase
        .from("forum_topics")
        .insert({ 
          title: title.trim(), 
          description: description.trim(),
          created_by: user.id
        });

      if (error) {
        toast.error("Failed to create topic");
        console.error(error);
      } else {
        toast.success("Topic created");
        onClose();
      }
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{topic ? "Edit Topic" : "Add Discussion Topic"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter topic title"
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter topic description"
              maxLength={1000}
              rows={5}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : topic ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
