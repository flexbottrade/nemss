import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Users } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const Elections = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [elections, setElections] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNominees, setSelectedNominees] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    position: "",
    deadline: "",
  });

  const positions = [
    "President",
    "Vice President",
    "Treasurer",
    "Financial Secretary",
    "Provost",
    "General Secretary",
    "Social Director",
  ];

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard");
      toast.error("Access denied");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    const { data: electionsData } = await supabase
      .from("elections")
      .select("*, election_nominees(*, profiles(first_name, last_name, member_id))")
      .order("created_at", { ascending: false });

    const { data: membersData } = await supabase
      .from("profiles")
      .select("*")
      .order("first_name");

    setElections(electionsData || []);
    setMembers(membersData || []);
  };

  const handleSave = async () => {
    if (!formData.position || !formData.deadline || selectedNominees.length === 0) {
      toast.error("Please fill all fields and select at least one nominee");
      return;
    }

    const { data: election, error: electionError } = await supabase
      .from("elections")
      .insert({
        position: formData.position,
        deadline: formData.deadline,
        status: "active",
      })
      .select()
      .single();

    if (electionError || !election) {
      toast.error("Failed to create election");
      return;
    }

    const nominees = selectedNominees.map((nomineeId) => ({
      election_id: election.id,
      nominee_id: nomineeId,
    }));

    const { error: nomineesError } = await supabase.from("election_nominees").insert(nominees);

    if (nomineesError) {
      toast.error("Failed to add nominees");
      return;
    }

    toast.success("Election created");
    setIsDialogOpen(false);
    setFormData({ position: "", deadline: "" });
    setSelectedNominees([]);
    loadData();
  };

  const handleEndElection = async (electionId: string) => {
    if (!confirm("End this election and declare winner?")) return;

    const { data: nominees } = await supabase
      .from("election_nominees")
      .select("*, profiles(id, first_name, last_name)")
      .eq("election_id", electionId)
      .order("votes_count", { ascending: false });

    if (!nominees || nominees.length === 0) return;

    const winner = nominees[0];
    const { data: election } = await supabase
      .from("elections")
      .select("position")
      .eq("id", electionId)
      .single();

    await supabase.from("elections").update({ status: "closed" }).eq("id", electionId);

    if (election && winner.profiles) {
      await supabase
        .from("profiles")
        .update({ position: election.position })
        .eq("id", winner.profiles.id);
    }

    toast.success("Election ended and winner declared");
    loadData();
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary p-4 md:p-8">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">Elections</h1>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Election
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {elections.map((election) => (
            <Card key={election.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{election.position}</CardTitle>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      election.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {election.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deadline: {new Date(election.deadline).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">Nominees:</span>
                  </div>
                  {election.election_nominees?.map((nominee: any) => (
                    <div
                      key={nominee.id}
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <span className="text-sm">
                        {nominee.profiles?.first_name} {nominee.profiles?.last_name}
                      </span>
                      <span className="font-bold">{nominee.votes_count || 0} votes</span>
                    </div>
                  ))}
                  {election.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => handleEndElection(election.id)}
                    >
                      End Election
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {elections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No elections yet</p>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Election</DialogTitle>
              <DialogDescription>Set up a new election for a position</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Voting Deadline</Label>
                <Input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label>Select Nominees</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={member.id}
                        checked={selectedNominees.includes(member.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedNominees([...selectedNominees, member.id]);
                          } else {
                            setSelectedNominees(selectedNominees.filter((id) => id !== member.id));
                          }
                        }}
                      />
                      <label htmlFor={member.id} className="text-sm cursor-pointer">
                        {member.first_name} {member.last_name} ({member.member_id})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Create Election</Button>
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

export default Elections;
