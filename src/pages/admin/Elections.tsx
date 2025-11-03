import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users, Trophy } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const Elections = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useRole();
  const [elections, setElections] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isElectionActive, setIsElectionActive] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const positions = [
    "President",
    "Vice President",
    "Secretary",
    "Treasurer",
    "Financial Secretary",
    "PRO",
    "Organizing Secretary",
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
    try {
      // Load election global settings
      const { data: settings } = await supabase
        .from("election_settings")
        .select("is_active")
        .single();
      
      setIsElectionActive(settings?.is_active || false);

      // Load all positions as separate "elections"
      const electionsData = await Promise.all(
        positions.map(async (position) => {
          const { data: election } = await supabase
            .from("elections")
            .select("*, election_nominees(*, profiles(first_name, last_name, member_id))")
            .eq("position", position)
            .eq("status", "active")
            .single();

          return election || { position, nominees: [], status: "none" };
        })
      );

      setElections(electionsData);

      const { data: membersData } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name");

      setMembers(membersData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleElectionStatus = async (active: boolean) => {
    const { error } = await supabase
      .from("election_settings")
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq("id", (await supabase.from("election_settings").select("id").single()).data?.id);

    if (error) {
      toast.error("Failed to update election status");
      return;
    }

    setIsElectionActive(active);
    toast.success(`Elections ${active ? "activated" : "closed"}`);
  };

  const handleAddNominee = async (position: string, nomineeId: string) => {
    const election = elections.find(e => e.position === position);
    
    // Create election if it doesn't exist
    let electionId = election?.id;
    if (!electionId) {
      const { data: newElection, error: electionError } = await supabase
        .from("elections")
        .insert({
          position,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
          status: "active",
        })
        .select()
        .single();

      if (electionError || !newElection) {
        toast.error("Failed to create election");
        return;
      }
      electionId = newElection.id;
    }

    // Add nominee
    const { error } = await supabase
      .from("election_nominees")
      .insert({
        election_id: electionId,
        nominee_id: nomineeId,
      });

    if (error) {
      toast.error("Failed to add nominee");
      return;
    }

    toast.success("Nominee added");
    loadData();
  };

  const handleRemoveNominee = async (nomineeRecordId: string) => {
    const { error } = await supabase
      .from("election_nominees")
      .delete()
      .eq("id", nomineeRecordId);

    if (error) {
      toast.error("Failed to remove nominee");
      return;
    }

    toast.success("Nominee removed");
    loadData();
  };

  const handleUpdateDeadline = async (position: string, deadline: string) => {
    const election = elections.find(e => e.position === position);
    if (!election?.id) return;

    const { error } = await supabase
      .from("elections")
      .update({ deadline })
      .eq("id", election.id);

    if (error) {
      toast.error("Failed to update deadline");
      return;
    }

    toast.success("Deadline updated");
    loadData();
  };

  const handleEndElection = async (position: string) => {
    if (!confirm(`End election for ${position} and declare winner?`)) return;

    const election = elections.find(e => e.position === position);
    if (!election?.id) return;

    const nominees = election.election_nominees || [];
    const sortedNominees = [...nominees].sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0));
    const winner = sortedNominees[0];

    await supabase
      .from("elections")
      .update({ status: "closed" })
      .eq("id", election.id);

    if (winner && winner.votes_count > 0) {
      // Clear position from previous holders
      await supabase
        .from("profiles")
        .update({ position: null })
        .eq("position", position);

      // Assign to winner
      await supabase
        .from("profiles")
        .update({ position })
        .eq("id", winner.nominee_id);
    }

    toast.success(`Election ended. Winner: ${winner?.profiles?.first_name} ${winner?.profiles?.last_name}`);
    loadData();
  };

  if (loading || !isAdmin || loadingData) {
    return <Spinner />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="flex-1 p-3 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6 pl-12 md:pl-0">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-foreground">Elections Management</h1>
              <p className="text-sm text-muted-foreground">Manage nominees and election status per position</p>
            </div>
            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
              <Label className="text-sm text-foreground">Election Active</Label>
              <Switch
                checked={isElectionActive}
                onCheckedChange={toggleElectionStatus}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {positions.map((position) => {
              const election = elections.find(e => e.position === position);
              const nominees = election?.election_nominees || [];
              const totalVotes = nominees.reduce((sum: number, n: any) => sum + (n.votes_count || 0), 0);
              const sortedNominees = [...nominees].sort((a: any, b: any) => (b.votes_count || 0) - (a.votes_count || 0));
              const hasElection = election?.id;
              const isClosed = election?.status === "closed";

              return (
                <Card key={position} className="bg-card border-border">
                  <CardHeader className="p-4 bg-accent/10">
                    <CardTitle className="flex items-center justify-between text-foreground">
                      <span className="text-base md:text-lg">{position}</span>
                      {isClosed && <span className="text-xs bg-muted px-2 py-1 rounded">Closed</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {/* Deadline */}
                    {hasElection && !isClosed && (
                      <div>
                        <Label className="text-xs text-foreground">End Date</Label>
                        <Input
                          type="datetime-local"
                          defaultValue={election.deadline ? new Date(election.deadline).toISOString().slice(0, 16) : ""}
                          onChange={(e) => handleUpdateDeadline(position, new Date(e.target.value).toISOString())}
                          className="h-8 text-xs bg-input border-border text-foreground"
                        />
                      </div>
                    )}

                    {/* Add Nominee */}
                    {!isClosed && (
                      <div>
                        <Label className="text-xs text-foreground">Add Nominee</Label>
                        <div className="flex gap-2">
                          <Select onValueChange={(value) => handleAddNominee(position, value)}>
                            <SelectTrigger className="h-8 text-xs bg-input border-border text-foreground">
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                              {members
                                .filter(m => !nominees.find((n: any) => n.nominee_id === m.id))
                                .map((member) => (
                                  <SelectItem key={member.id} value={member.id} className="text-xs">
                                    {member.first_name} {member.last_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Nominees List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Nominees ({nominees.length})
                        </Label>
                        {totalVotes > 0 && (
                          <span className="text-xs text-muted-foreground">{totalVotes} votes</span>
                        )}
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {sortedNominees.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No nominees yet</p>
                        ) : (
                          sortedNominees.map((nominee: any, index: number) => {
                            const voteCount = nominee.votes_count || 0;
                            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                            const isWinner = isClosed && index === 0;

                            return (
                              <div
                                key={nominee.id}
                                className={`flex items-center justify-between p-2 rounded border ${
                                  isWinner ? "border-accent bg-accent/10" : "border-border bg-background"
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isWinner && <Trophy className="w-3 h-3 text-accent" />}
                                    <p className="text-xs font-medium text-foreground">
                                      {nominee.profiles?.first_name} {nominee.profiles?.last_name}
                                    </p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{voteCount} votes ({percentage}%)</p>
                                </div>
                                {!isClosed && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveNominee(nominee.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* End Election Button */}
                    {hasElection && !isClosed && nominees.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEndElection(position)}
                        className="w-full text-xs h-8"
                      >
                        End Election & Declare Winner
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Elections;