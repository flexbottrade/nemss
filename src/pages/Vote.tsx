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

      // Sort elections by position hierarchy
      const positionOrder = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Financial Secretary', 'PRO', 'Organizing Secretary'];
      const sortedElections = electionsWithVoteStatus.sort((a, b) => {
        const aIndex = positionOrder.findIndex(pos => a.position.toLowerCase().includes(pos.toLowerCase()));
        const bIndex = positionOrder.findIndex(pos => b.position.toLowerCase().includes(pos.toLowerCase()));
        
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      setElections(sortedElections);
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

    // Check if election is closed or past deadline
    if (election?.status === "closed" || (election && new Date(election.deadline) < new Date())) {
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
      console.error("Vote error:", error);
      toast.error(error.message || "Failed to cast vote");
    }
  };

  const isElectionActive = (deadline: string) => {
    return new Date(deadline) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-3 md:py-6">
        {/* Header */}
        <div className="mb-3 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center">
              <VoteIcon className="w-4 h-4 md:w-6 md:h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Elections</h1>
          </div>
          <p className="text-xs md:text-base text-muted-foreground">Cast your votes</p>
        </div>

        {/* Elections List */}
        <div className="space-y-3 md:space-y-4">
          {elections.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <VoteIcon className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                <p className="text-xs md:text-sm text-muted-foreground">No elections available</p>
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
                <Card key={election.id} className="overflow-hidden bg-card border-border">
                  <CardHeader className="bg-card p-3 md:p-6 border-b border-border">
                    <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base md:text-xl mb-1 md:mb-2 text-foreground">
                          {election.position}
                        </CardTitle>
                        <div className="flex flex-wrap gap-1 md:gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4" />
                            <span>
                              {new Date(election.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {election.totalVotes !== undefined && (
                            <span>• {election.totalVotes} votes</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 md:gap-2">
                        {active && !election.userVoted && (
                          <Badge className="bg-success text-success-foreground text-xs">Active</Badge>
                        )}
                        {election.userVoted && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span className="hidden md:inline">Voted</span>
                          </Badge>
                        )}
                        {closed && (
                          <Badge variant="secondary" className="text-xs">Closed</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 md:p-6 bg-card">
                    {closed && winner && (
                      <div className="mb-3 md:mb-4 p-2 md:p-3 bg-accent/10 rounded-lg border-2 border-accent">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                          <span className="font-semibold text-xs md:text-sm text-accent">Winner</span>
                        </div>
                        <p className="text-sm md:text-base font-bold text-foreground">
                          {winner.profiles.first_name} {winner.profiles.last_name}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {winner.votes_count} votes ({election.totalVotes ? Math.round((winner.votes_count / election.totalVotes) * 100) : 0}%)
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 md:space-y-3">
                      <h3 className="font-semibold text-xs md:text-base text-foreground">
                        {closed ? "Results" : "Candidates"}
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
                               className={`p-2 md:p-3 rounded-lg border ${
                                 isWinner ? "border-accent bg-accent/5" : "border-border bg-card"
                               }`}
                             >
                               <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                                 <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                     <p className="font-medium text-xs md:text-base text-foreground">
                                       {nominee.profiles.first_name} {nominee.profiles.last_name}
                                     </p>
                                     {isWinner && <Trophy className="w-3 h-3 md:w-4 md:h-4 text-accent" />}
                                   </div>
                                   <p className="text-xs text-muted-foreground">
                                     {nominee.profiles.member_id}
                                    </p>
                                  </div>
                                  {/* Only show vote button if election is active and user hasn't voted */}
                                  {active && !closed && !election.userVoted && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleVote(election.id, nominee.id)}
                                      className="shrink-0 h-7 md:h-9 text-xs md:text-sm"
                                    >
                                      Vote
                                    </Button>
                                  )}
                                </div>

                               {(closed || election.userVoted) && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {nominee.votes_count || 0}
                                    </span>
                                    <span className="font-medium">{percentage}%</span>
                                  </div>
                                  <Progress value={percentage} className="h-1.5 md:h-2" />
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
