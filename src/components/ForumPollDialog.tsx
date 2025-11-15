import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

interface ForumPollDialogProps {
  open: boolean;
  onClose: () => void;
  poll?: {
    id: string;
    question: string;
    options: Array<{ id: string; option_text: string }>;
  };
}

export const ForumPollDialog = ({ open, onClose, poll }: ForumPollDialogProps) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (poll) {
      setQuestion(poll.question);
      setOptions(poll.options.map(o => o.option_text));
    } else {
      setQuestion("");
      setOptions(["", ""]);
    }
  }, [poll, open]);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSave = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error("Please provide at least 2 options");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setSaving(false);
      return;
    }

    if (poll) {
      const { error: updateError } = await supabase
        .from("forum_polls")
        .update({ question: question.trim() })
        .eq("id", poll.id);

      if (updateError) {
        toast.error("Failed to update poll");
        console.error(updateError);
        setSaving(false);
        return;
      }

      // Delete old options
      await supabase
        .from("forum_poll_options")
        .delete()
        .eq("poll_id", poll.id);

      // Insert new options
      const optionsData = validOptions.map(opt => ({
        poll_id: poll.id,
        option_text: opt.trim()
      }));

      const { error: optionsError } = await supabase
        .from("forum_poll_options")
        .insert(optionsData);

      if (optionsError) {
        toast.error("Failed to update options");
        console.error(optionsError);
      } else {
        toast.success("Poll updated");
        onClose();
      }
    } else {
      const { data: pollData, error: pollError } = await supabase
        .from("forum_polls")
        .insert({ 
          question: question.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (pollError || !pollData) {
        toast.error("Failed to create poll");
        console.error(pollError);
        setSaving(false);
        return;
      }

      const optionsData = validOptions.map(opt => ({
        poll_id: pollData.id,
        option_text: opt.trim()
      }));

      const { error: optionsError } = await supabase
        .from("forum_poll_options")
        .insert(optionsData);

      if (optionsError) {
        toast.error("Failed to create options");
        console.error(optionsError);
      } else {
        toast.success("Poll created");
        onClose();
      }
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{poll ? "Edit Poll" : "Create Poll"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter poll question"
              maxLength={200}
            />
          </div>
          <div>
            <Label>Options (minimum 2, maximum 10)</Label>
            <div className="space-y-2 mt-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : poll ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
