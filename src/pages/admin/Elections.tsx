import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6 pl-12 md:pl-0">
            <h1 className="text-xl md:text-3xl font-bold">Elections</h1>
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="text-xs md:text-sm h-8 md:h-10">
              <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Create Election
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {elections.map((election) => (
              <Card key={election.id}>
                <CardHeader className="p-3 md:p-6">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm md:text-lg">{election.position}</CardTitle>
                    <span
                      className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded ${
                        election.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {election.status}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Deadline: {new Date(election.deadline).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-xs md:text-sm font-medium">Nominees:</span>
                  </div>
                  {election.election_nominees?.map((nominee: any) => (
                    <div
                      key={nominee.id}
                      className="flex justify-between items-center p-1.5 md:p-2 bg-muted rounded"
                    >
                      <span className="text-xs md:text-sm">
                        {nominee.profiles?.first_name} {nominee.profiles?.last_name}
                      </span>
                      <span className="font-bold text-xs md:text-base">{nominee.votes_count || 0} votes</span>
                    </div>
                  ))}
                  {election.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 md:mt-4 text-xs h-7 md:h-9"
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
              <p className="text-xs md:text-sm text-muted-foreground">No elections yet</p>
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-xs md:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">Create Election</DialogTitle>
                <DialogDescription className="text-xs md:text-sm">Set up a new election for a position</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 md:space-y-4">
              <div>
                <Label className="text-xs md:text-sm">Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos} className="text-xs md:text-sm">
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs md:text-sm">Voting Deadline</Label>
                <Input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Select Nominees</Label>
                <div className="border rounded-lg p-2 md:p-4 max-h-60 overflow-y-auto space-y-2">
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
                      <label htmlFor={member.id} className="text-xs md:text-sm cursor-pointer">
                        {member.first_name} {member.last_name} ({member.member_id})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="text-xs md:text-sm h-8 md:h-10">Create Election</Button>
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

export default Elections;
