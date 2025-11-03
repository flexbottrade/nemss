import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Vote as VoteIcon, Trophy, Clock, CheckCircle2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Election {
  id: string;
  position: string;
  deadline: string;
  status: string;
  nominees: Nominee[];
  userVoted?: boolean;
  totalVotes?: number;
}

interface Nominee {
  id: string;
  nominee_id: string;
  votes_count: number;
  profiles: {
    first_name: string;
    last_name: string;
    member_id: string;
  };
}

const Vote = () => {
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadElections();

    // Subscribe to real-time vote updates
    const channel = supabase
      .channel('vote-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes'
        },
        () => {
          loadElections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setUserId(user.id);
  };

  const loadElections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load elections with nominees
    const { data: electionsData } = await supabase
      .from("elections")
      .select(`
        *,
        nominees:election_nominees(
          id,
          nominee_id,
          votes_count,
          profiles:nominee_id(
            first_name,
            last_name,
            member_id
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (electionsData) {
      // Check if user has voted in each election
      const electionsWithVoteStatus = await Promise.all(
        electionsData.map(async (election) => {
          const { data: userVote } = await supabase
            .from("votes")
            .select("id")
            .eq("election_id", election.id)
            .eq("voter_id", user.id)
            .single();

          const totalVotes = election.nominees.reduce(
            (sum: number, nom: any) => sum + (nom.votes_count || 0),
            0
          );

          return {
            ...election,
            userVoted: !!userVote,
            totalVotes,
          };
        })
      );

      setElections(electionsWithVoteStatus);
    }
    setLoading(false);
  };

  const handleVote = async (electionId: string, nomineeId: string) => {
    if (!userId) return;

    const election = elections.find(e => e.id === electionId);
    if (election?.userVoted) {
      toast.error("You have already voted in this election");
      return;
    }

    // Check deadline
    if (election && new Date(election.deadline) < new Date()) {
      toast.error("This election has ended");
      return;
    }

    try {
      // Cast vote - nomineeId is the election_nominees.id
      const { error: voteError } = await supabase
        .from("votes")
        .insert({
          election_id: electionId,
          nominee_id: nomineeId,
          voter_id: userId,
        });

      if (voteError) throw voteError;

      // Increment vote count
      const nominee = election?.nominees.find((n: any) => n.id === nomineeId);
      if (nominee) {
        await supabase
          .from("election_nominees")
          .update({ votes_count: (nominee.votes_count || 0) + 1 })
          .eq("id", nomineeId);
      }

      toast.success("Vote cast successfully!");
      loadElections();
    } catch (error: any) {
      toast.error(error.message || "Failed to cast vote");
    }
  };

  const isElectionActive = (deadline: string) => {
    return new Date(deadline) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-accent to-highlight flex items-center justify-center">
              <VoteIcon className="w-5 h-5 md:w-6 md:h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Elections</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Cast your vote for leadership positions
          </p>
        </div>

        {/* Elections List */}
        <div className="space-y-4">
          {elections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <VoteIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No elections available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            elections.map((election) => {
              const active = isElectionActive(election.deadline);
              const closed = election.status === "closed";
              const winner = election.nominees.reduce((prev: any, current: any) =>
                (current.votes_count || 0) > (prev.votes_count || 0) ? current : prev
              , election.nominees[0]);

              return (
                <Card key={election.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg md:text-xl mb-2">
                          {election.position}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 text-xs md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {active ? "Ends" : "Ended"}: {new Date(election.deadline).toLocaleDateString()}
                            </span>
                          </div>
                          {election.totalVotes !== undefined && (
                            <span>• {election.totalVotes} total votes</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {active && !election.userVoted && (
                          <Badge className="bg-green-500">Active</Badge>
                        )}
                        {election.userVoted && (
                          <Badge className="bg-blue-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Voted
                          </Badge>
                        )}
                        {closed && (
                          <Badge variant="secondary">Closed</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 md:p-6">
                    {closed && winner && (
                      <div className="mb-4 p-3 bg-accent/10 rounded-lg border-2 border-accent">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-5 h-5 text-accent" />
                          <span className="font-semibold text-accent">Winner</span>
                        </div>
                        <p className="font-bold">
                          {winner.profiles.first_name} {winner.profiles.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {winner.votes_count} votes ({election.totalVotes ? Math.round((winner.votes_count / election.totalVotes) * 100) : 0}%)
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm md:text-base">
                        {closed ? "Final Results:" : "Candidates:"}
                      </h3>
                      {election.nominees
                        .sort((a: any, b: any) => (b.votes_count || 0) - (a.votes_count || 0))
                        .map((nominee: any) => {
                          const percentage = election.totalVotes
                            ? Math.round((nominee.votes_count / election.totalVotes) * 100)
                            : 0;
                          const isWinner = closed && nominee.id === winner.id;

                          return (
                            <div
                              key={nominee.id}
                              className={`p-3 rounded-lg border ${
                                isWinner ? "border-accent bg-accent/5" : "border-border"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm md:text-base">
                                      {nominee.profiles.first_name} {nominee.profiles.last_name}
                                    </p>
                                    {isWinner && <Trophy className="w-4 h-4 text-accent" />}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {nominee.profiles.member_id}
                                  </p>
                                </div>
                                {active && !election.userVoted && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleVote(election.id, nominee.id)}
                                    className="shrink-0"
                                  >
                                    Vote
                                  </Button>
                                )}
                              </div>

                              {(closed || election.userVoted) && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {nominee.votes_count || 0} votes
                                    </span>
                                    <span className="font-medium">{percentage}%</span>
                                  </div>
                                  <Progress value={percentage} className="h-2" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Vote;
