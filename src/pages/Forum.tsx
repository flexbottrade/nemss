import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Trash2, Reply, X, Edit2, Plus, MessageSquare, BarChart3, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { formatDateDDMMYY } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ForumUsernameDialog } from "@/components/ForumUsernameDialog";
import { ForumTopicDialog } from "@/components/ForumTopicDialog";
import { ElectionDialog } from "@/components/ElectionDialog";
import { NomineeDialog } from "@/components/NomineeDialog";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useRole } from "@/hooks/useRole";
import { useIsMobile } from "@/hooks/use-mobile";

const LAST_VISIT_KEY = "forum_last_visit";

interface ForumPost {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  reply_to: string | null;
  topic_id: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    member_id: string;
    forum_username: string | null;
  };
  reply_post?: {
    message: string;
    profiles: {
      forum_username: string | null;
      first_name: string;
      last_name: string;
    };
  } | null;
}

interface ForumTopic {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Election {
  id: string;
  position: string;
  deadline: string;
  status: string;
  created_at: string;
}

interface Nominee {
  id: string;
  election_id: string;
  nominee_id: string;
  votes_count: number;
  profiles: {
    first_name: string;
    last_name: string;
    member_id: string;
  };
}

type ViewType = 'navigation' | 'general' | 'topic' | 'election';

const Forum = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const isMobile = useIsMobile();
  const [currentView, setCurrentView] = useState<ViewType>('navigation');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [nominees, setNominees] = useState<Record<string, Nominee[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [concluding, setConcluding] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [showElectionDialog, setShowElectionDialog] = useState(false);
  const [showNomineeDialog, setShowNomineeDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'topic' | 'election' | 'post'; id: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ForumPost | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [allUsers, setAllUsers] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, smooth ? 100 : 0);
  };

  useEffect(() => {
    const init = async () => {
      await getCurrentUser();
      await loadTopics();
      await loadElections();
      await loadAllUsers();
      setLoading(false);
    };
    init();
  }, []);

  // Realtime subscription for posts
  useEffect(() => {
    if (currentView !== 'general' && currentView !== 'topic') return;

    const postsChannel = supabase
      .channel(`forum-posts-${currentView}-${selectedTopicId || 'general'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_posts'
        },
        (payload) => {
          console.log('Post change detected:', payload);
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [currentView, selectedTopicId]);

  // Realtime subscription for topics
  useEffect(() => {
    const topicsChannel = supabase
      .channel('forum-topics-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_topics'
        },
        (payload) => {
          console.log('Topic inserted:', payload);
          setTopics(prev => [payload.new as ForumTopic, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'forum_topics'
        },
        (payload) => {
          console.log('Topic updated:', payload);
          setTopics(prev => prev.map(t => 
            t.id === (payload.new as ForumTopic).id ? (payload.new as ForumTopic) : t
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'forum_topics'
        },
        (payload) => {
          console.log('Topic deleted:', payload);
          setTopics(prev => prev.filter(t => t.id !== (payload.old as ForumTopic).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(topicsChannel);
    };
  }, []);

  // Realtime subscription for elections
  useEffect(() => {
    const electionsChannel = supabase
      .channel('elections-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'elections'
        },
        (payload) => {
          console.log('Election inserted:', payload);
          setElections(prev => [payload.new as Election, ...prev]);
          const newElection = payload.new as Election;
          loadNominees(newElection.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'elections'
        },
        (payload) => {
          console.log('Election updated:', payload);
          setElections(prev => prev.map(e => 
            e.id === (payload.new as Election).id ? (payload.new as Election) : e
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'elections'
        },
        (payload) => {
          console.log('Election deleted:', payload);
          setElections(prev => prev.filter(e => e.id !== (payload.old as Election).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(electionsChannel);
    };
  }, []);

  // Realtime subscription for nominees
  useEffect(() => {
    if (currentView !== 'election' || !selectedElectionId) return;

    const nomineesChannel = supabase
      .channel(`election-nominees-${selectedElectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'election_nominees',
          filter: `election_id=eq.${selectedElectionId}`
        },
        (payload) => {
          console.log('Nominee change detected:', payload);
          loadNominees(selectedElectionId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(nomineesChannel);
    };
  }, [currentView, selectedElectionId]);

  // Realtime subscription for votes
  useEffect(() => {
    if (!currentUserId) return;

    const votesChannel = supabase
      .channel('votes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes'
        },
        (payload) => {
          console.log('Vote change detected:', payload);
          loadUserVotes();
          
          // Reload nominees for the affected election
          if (payload.new && 'election_id' in payload.new) {
            loadNominees((payload.new as any).election_id);
          }
          if (payload.old && 'election_id' in payload.old) {
            loadNominees((payload.old as any).election_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (currentView === 'general' || currentView === 'topic') {
      loadPosts();
    }
    if (currentView === 'election' && selectedElectionId) {
      loadNominees(selectedElectionId);
    }
    
    return () => {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    };
  }, [currentView, selectedTopicId, selectedElectionId]);

  useEffect(() => {
    if (posts.length > 0 && currentView !== 'navigation') {
      scrollToBottom(false);
    }
  }, [posts.length, currentView]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("forum_username")
      .eq("id", user.id)
      .single();

    if (profile) {
      setCurrentUsername(profile.forum_username);
      if (!profile.forum_username) {
        setShowUsernameDialog(true);
      }
    }
  };

  const loadAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, forum_username, first_name, last_name")
      .not("forum_username", "is", null);

    if (data) {
      setAllUsers(data.map(u => ({
        id: u.id,
        username: u.forum_username!,
        name: `${u.first_name} ${u.last_name}`
      })));
    }
  };

  const loadTopics = async () => {
    const { data, error } = await supabase
      .from("forum_topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load topics:", error);
    } else {
      setTopics(data || []);
    }
  };

  const loadElections = async () => {
    const { data, error } = await supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load elections:", error);
    } else {
      setElections(data || []);
      
      // Auto-conclude expired elections
      const now = new Date();
      const expiredElections = data?.filter(e => 
        e.status === 'active' && new Date(e.deadline) < now
      ) || [];
      
      for (const election of expiredElections) {
        await autoConcludeElection(election.id);
      }
      
      data?.forEach(election => {
        loadNominees(election.id);
      });
      if (currentUserId) {
        loadUserVotes();
      }
    }
  };

  const autoConcludeElection = async (electionId: string) => {
    if (!currentUserId) return;
    
    // Get election details and nominees first
    const { data: electionData } = await supabase
      .from("elections")
      .select("*")
      .eq("id", electionId)
      .single();
    
    const { data: nomineesData } = await supabase
      .from("election_nominees")
      .select(`
        id,
        election_id,
        nominee_id,
        votes_count,
        profiles:nominee_id(first_name, last_name, member_id)
      `)
      .eq("election_id", electionId)
      .order("votes_count", { ascending: false });

    if (!electionData || !nomineesData) return;

    // Update election status
    await supabase
      .from("elections")
      .update({ status: "concluded" })
      .eq("id", electionId);

    // Post announcement if there are votes
    const totalVotes = nomineesData.reduce((sum: number, n: any) => sum + n.votes_count, 0);
    const winner = nomineesData[0];

    if (winner && totalVotes > 0) {
      const announcementMessage = `🏆 Election Results for ${electionData.position}

Winner: ${winner.profiles.first_name} ${winner.profiles.last_name} (${winner.profiles.member_id})
Votes: ${winner.votes_count} (${Math.round((winner.votes_count / totalVotes) * 100)}%)
Total Votes Cast: ${totalVotes}

Congratulations! 🎉`;

      await supabase
        .from("forum_posts")
        .insert({
          user_id: currentUserId,
          message: announcementMessage,
          reply_to: null,
          topic_id: null
        });
    }
  };

  const loadNominees = async (electionId: string) => {
    const { data, error } = await supabase
      .from("election_nominees")
      .select(`
        id,
        election_id,
        nominee_id,
        votes_count,
        profiles:nominee_id(first_name, last_name, member_id)
      `)
      .eq("election_id", electionId)
      .order("votes_count", { ascending: false });

    if (error) {
      console.error("Failed to load nominees:", error);
    } else {
      setNominees(prev => ({ ...prev, [electionId]: data as any || [] }));
    }
  };

  const loadUserVotes = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("votes")
      .select("election_id, nominee_id")
      .eq("voter_id", currentUserId);

    if (error) {
      console.error("Failed to load user votes:", error);
    } else {
      const votes: Record<string, string> = {};
      data?.forEach(vote => {
        votes[vote.election_id] = vote.nominee_id;
      });
      setUserVotes(votes);
    }
  };

  const loadPosts = async () => {
    const topicFilter = currentView === 'general' ? null : selectedTopicId;
    
    let query = supabase
      .from("forum_posts")
      .select(`
        *,
        profiles(first_name, last_name, member_id, forum_username),
        reply_post:reply_to(
          message,
          profiles(forum_username, first_name, last_name)
        )
      `)
      .order("created_at", { ascending: true });

    if (topicFilter === null) {
      query = query.is('topic_id', null);
    } else {
      query = query.eq('topic_id', topicFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load forum posts");
      console.error(error);
    } else {
      setPosts(data as any || []);
      setTimeout(() => scrollToBottom(false), 300);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (newMessage.length > 1000) {
      toast.error("Message is too long (max 1000 characters)");
      return;
    }

    if (!currentUsername) {
      toast.error("Please set your forum username first");
      setShowUsernameDialog(true);
      return;
    }

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    const topicId = currentView === 'general' ? null : selectedTopicId;

    const { error } = await supabase
      .from("forum_posts")
      .insert({
        user_id: user.id,
        message: newMessage.trim(),
        reply_to: replyingTo?.id || null,
        topic_id: topicId
      });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      setNewMessage("");
      setReplyingTo(null);
      toast.success("Message sent");
      setTimeout(() => scrollToBottom(false), 200);
    }
    setSending(false);
  };

  const handleDeletePost = async () => {
    if (!deletingItem || deletingItem.type !== 'post') return;

    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      toast.error("Failed to delete post");
      console.error(error);
    } else {
      toast.success("Post deleted");
    }
    setDeletingItem(null);
  };

  const handleDeleteTopic = async () => {
    if (!deletingItem || deletingItem.type !== 'topic') return;

    const { error } = await supabase
      .from("forum_topics")
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      toast.error("Failed to delete topic");
      console.error(error);
    } else {
      toast.success("Topic deleted");
      if (selectedTopicId === deletingItem.id) {
        setCurrentView('navigation');
        setSelectedTopicId(null);
      }
    }
    setDeletingItem(null);
  };

  const handleDeleteElection = async () => {
    if (!deletingItem || deletingItem.type !== 'election') return;

    const { error } = await supabase
      .from("elections")
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      toast.error("Failed to delete election");
      console.error(error);
    } else {
      toast.success("Election deleted");
      if (selectedElectionId === deletingItem.id) {
        setCurrentView('navigation');
        setSelectedElectionId(null);
      }
    }
    setDeletingItem(null);
  };

  const handleVote = async (electionId: string, nomineeId: string) => {
    if (!currentUserId) return;

    const election = elections.find(e => e.id === electionId);
    if (election?.status === 'concluded' || (election && new Date(election.deadline) < new Date())) {
      toast.error("This election has concluded");
      return;
    }

    const hasVoted = userVotes[electionId];
    if (hasVoted) {
      toast.error("You have already voted in this election");
      return;
    }

    const { error } = await supabase
      .from("votes")
      .insert({
        election_id: electionId,
        voter_id: currentUserId,
        nominee_id: nomineeId
      });

    if (error) {
      if (error.code === '23505') {
        toast.error("You have already voted in this election");
        await loadUserVotes();
      } else {
        toast.error("Failed to cast vote");
        console.error(error);
      }
    } else {
      toast.success("Vote cast successfully!");
      setUserVotes(prev => ({ ...prev, [electionId]: nomineeId }));
    }
  };

  const handleConcludeElection = async (electionId: string) => {
    if (!isAdmin || !currentUserId) return;
    
    setConcluding(true);
    
    try {
      // Get fresh election details and nominees from database
      const { data: election, error: electionError } = await supabase
        .from("elections")
        .select("*")
        .eq("id", electionId)
        .maybeSingle();

      if (electionError) {
        toast.error("Database error: " + electionError.message);
        console.error("Election fetch error:", electionError);
        setConcluding(false);
        return;
      }

      if (!election) {
        toast.error("Election not found");
        setConcluding(false);
        return;
      }

      const { data: electionNominees, error: nomineesError } = await supabase
        .from("election_nominees")
        .select(`
          id,
          election_id,
          nominee_id,
          votes_count,
          profiles:nominee_id(first_name, last_name, member_id)
        `)
        .eq("election_id", electionId)
        .order("votes_count", { ascending: false });

      if (nomineesError) {
        toast.error("Failed to load nominees");
        console.error(nomineesError);
        setConcluding(false);
        return;
      }

      // Update election status
      const { error: updateError } = await supabase
        .from("elections")
        .update({ status: "concluded" })
        .eq("id", electionId);

      if (updateError) {
        toast.error("Failed to conclude election");
        console.error(updateError);
        setConcluding(false);
        return;
      }

      // Post announcement if there are votes
      const totalVotes = (electionNominees || []).reduce((sum: number, n: any) => sum + (n.votes_count || 0), 0);
      const winner = (electionNominees || [])[0];

      if (winner && winner.profiles && totalVotes > 0) {
        const announcementMessage = `🏆 Election Results for ${election.position}

Winner: ${winner.profiles.first_name} ${winner.profiles.last_name} (${winner.profiles.member_id})
Votes: ${winner.votes_count} (${Math.round((winner.votes_count / totalVotes) * 100)}%)
Total Votes Cast: ${totalVotes}

Congratulations! 🎉`;

        const { error: postError } = await supabase
          .from("forum_posts")
          .insert({
            user_id: currentUserId,
            message: announcementMessage,
            reply_to: null,
            topic_id: null
          });

        if (postError) {
          console.error("Failed to post announcement:", postError);
        }
      }

      toast.success("Election concluded successfully");
      loadElections();
    } catch (error) {
      console.error("Error concluding election:", error);
      toast.error("Failed to conclude election");
    } finally {
      setConcluding(false);
    }
  };

  const handleMention = (username: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBefore = newMessage.substring(0, cursorPos);
    const lastAtIndex = textBefore.lastIndexOf('@');
    const textAfter = newMessage.substring(cursorPos);
    
    const newText = newMessage.substring(0, lastAtIndex) + `@${username} ` + textAfter;
    setNewMessage(newText);
    setShowMentionMenu(false);
    
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtIndex + username.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    const cursorPos = e.target.selectionStart;
    const textBefore = text.substring(0, cursorPos);
    const lastAtIndex = textBefore.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && (lastAtIndex === 0 || text[lastAtIndex - 1] === ' ')) {
      const searchTerm = textBefore.substring(lastAtIndex + 1);
      if (searchTerm.length > 0 && !searchTerm.includes(' ')) {
        setMentionSearch(searchTerm);
        setShowMentionMenu(true);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateDDMMYY(date);
  };

  const renderMessage = (message: string) => {
    const parts = message.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        const user = allUsers.find(u => u.username === username);
        if (user) {
          return (
            <span key={index} className="font-bold text-primary">
              {part}
            </span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const getDisplayName = (post: ForumPost) => {
    return post.profiles.forum_username || `${post.profiles.first_name} ${post.profiles.last_name}`;
  };

  const filteredUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleNavigateToView = (type: ViewType, id?: string) => {
    setCurrentView(type);
    if (type === 'topic' && id) {
      setSelectedTopicId(id);
    } else if (type === 'election' && id) {
      setSelectedElectionId(id);
    }
  };

  const handleBackToNavigation = () => {
    setCurrentView('navigation');
    setSelectedTopicId(null);
    setSelectedElectionId(null);
  };

  const selectedTopic = topics.find(t => t.id === selectedTopicId);
  const selectedElection = elections.find(e => e.id === selectedElectionId);

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="flex flex-col h-screen bg-background pb-16 md:pb-4">
      <ForumUsernameDialog
        open={showUsernameDialog}
        onClose={() => {
          setShowUsernameDialog(false);
          getCurrentUser();
        }}
        currentUsername={currentUsername || undefined}
        userId={currentUserId!}
      />

      <ForumTopicDialog
        open={showTopicDialog}
        onClose={() => {
          setShowTopicDialog(false);
          setEditingTopic(null);
        }}
        onSuccess={() => {
          loadTopics();
        }}
        topic={editingTopic || undefined}
      />

      <ElectionDialog
        open={showElectionDialog}
        onClose={() => {
          setShowElectionDialog(false);
          setEditingElection(null);
        }}
        onSuccess={() => {
          loadElections();
        }}
        election={editingElection || undefined}
      />

      <NomineeDialog
        open={showNomineeDialog}
        onClose={() => {
          setShowNomineeDialog(false);
        }}
        onSuccess={() => {
          if (selectedElectionId) {
            loadNominees(selectedElectionId);
          }
        }}
        electionId={selectedElectionId || ''}
        existingNominees={selectedElectionId ? (nominees[selectedElectionId]?.map(n => n.nominee_id) || []) : []}
      />

      <ConfirmationDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        onConfirm={
          deletingItem?.type === 'topic' 
            ? handleDeleteTopic 
            : deletingItem?.type === 'election' 
            ? handleDeleteElection 
            : handleDeletePost
        }
        title={`Delete ${
          deletingItem?.type === 'topic' 
            ? 'Topic' 
            : deletingItem?.type === 'election' 
            ? 'Election' 
            : 'Message'
        }?`}
        description={`Are you sure you want to delete this ${
          deletingItem?.type === 'post' ? 'message' : deletingItem?.type
        }? This action cannot be undone.`}
        confirmText="Delete"
      />

      {/* Header */}
      {currentView !== 'navigation' && (
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="container max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToNavigation}
                className="gap-1 h-8 md:h-9 text-xs md:text-sm"
              >
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
                Back
              </Button>
              <h1 className="text-sm md:text-base font-semibold truncate flex-1 text-center">
                {currentView === 'general' && 'General Discussion'}
                {currentView === 'topic' && selectedTopic?.title}
                {currentView === 'election' && selectedElection?.position}
              </h1>
              {isAdmin && currentView === 'topic' && selectedTopic && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => {
                      setEditingTopic(selectedTopic);
                      setShowTopicDialog(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 md:h-8 md:w-8 text-destructive"
                    onClick={() => setDeletingItem({ type: 'topic', id: selectedTopic.id })}
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              )}
              {isAdmin && currentView === 'election' && selectedElection && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => setShowNomineeDialog(true)}
                  >
                    <Users className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 md:h-8 md:w-8"
                    onClick={() => {
                      setEditingElection(selectedElection);
                      setShowElectionDialog(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 md:h-8 md:w-8 text-destructive"
                    onClick={() => setDeletingItem({ type: 'election', id: selectedElection.id })}
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              )}
              {!isAdmin && <div className="w-8" />}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'navigation' && (
          <div className="h-full flex flex-col">
            {/* Sticky Top Section - Admin Buttons + General Discussion */}
            <div className="shrink-0 bg-background sticky top-0 z-10 border-b border-border">
              <div className="container max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-3 space-y-2">
                {/* Admin Action Buttons */}
                {isAdmin && (
                  <div className="flex gap-1 md:gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowTopicDialog(true)}
                      className="gap-1 h-8 md:h-9 text-xs md:text-sm flex-1"
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                      Add Topic
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowElectionDialog(true)}
                      className="gap-1 h-8 md:h-9 text-xs md:text-sm flex-1"
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                      Add Election
                    </Button>
                  </div>
                )}

                {/* General Discussion Card */}
                <Card
                  className="cursor-pointer hover:bg-accent hover:shadow-md transition-all"
                  onClick={() => handleNavigateToView('general')}
                >
                  <CardContent className="p-2 md:p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                        <div>
                          <h3 className="font-semibold text-xs md:text-sm">General Discussion</h3>
                          <p className="text-[10px] md:text-xs text-muted-foreground">Open chat for all members</p>
                        </div>
                      </div>
                      <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground rotate-180 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Scrollable Section - Elections + Topics */}
            <div className="flex-1 overflow-y-auto">
              <div className="container max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-3 space-y-2">
                {/* Elections Section */}
                {elections.length > 0 && (
                  <div className="space-y-2">
                    {elections.map(election => (
                      <Card
                        key={election.id}
                        className="cursor-pointer hover:bg-accent hover:shadow-md transition-all border-l-4 border-l-primary"
                        onClick={() => handleNavigateToView('election', election.id)}
                      >
                        <CardContent className="p-2 md:p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] md:text-xs font-medium text-primary uppercase">Election</span>
                                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-0.5">{election.position}</h3>
                                <p className="text-[10px] md:text-xs text-muted-foreground">
                                  {userVotes[election.id] ? '✓ Voted' : 'Tap to vote'}
                                </p>
                              </div>
                              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground rotate-180 shrink-0" />
                            </div>
                            {isAdmin && (
                              <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 md:h-7 md:w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedElectionId(election.id);
                                    setShowNomineeDialog(true);
                                  }}
                                >
                                  <Users className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 md:h-7 md:w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingElection(election);
                                    setShowElectionDialog(true);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 md:h-7 md:w-7 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingItem({ type: 'election', id: election.id });
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Topics Section */}
                {topics.length > 0 && (
                  <div className="space-y-2">
                    {topics.map(topic => (
                      <Card
                        key={topic.id}
                        className="cursor-pointer hover:bg-accent hover:shadow-md transition-all"
                        onClick={() => handleNavigateToView('topic', topic.id)}
                      >
                        <CardContent className="p-2 md:p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-0.5">{topic.title}</h3>
                                <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                                  {topic.description}
                                </p>
                              </div>
                              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground rotate-180 shrink-0" />
                            </div>
                            {isAdmin && (
                              <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 md:h-7 md:w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTopic(topic);
                                    setShowTopicDialog(true);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 md:h-7 md:w-7 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingItem({ type: 'topic', id: topic.id });
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Election View */}
        {currentView === 'election' && selectedElection && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="container max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-4">
                <Card className="mb-3">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm md:text-base font-semibold">{selectedElection.position}</h2>
                      {(selectedElection.status === 'concluded' || new Date(selectedElection.deadline) < new Date()) && (
                        <Badge variant="secondary" className="text-[10px] md:text-xs">Concluded</Badge>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2">
                      Deadline: {formatDateDDMMYY(new Date(selectedElection.deadline))}
                    </p>
                    {(() => {
                      const totalVotes = nominees[selectedElection.id]?.reduce((sum, n) => sum + n.votes_count, 0) || 0;
                      const winner = nominees[selectedElection.id]?.reduce((max, n) => 
                        !max || n.votes_count > max.votes_count ? n : max, null as Nominee | null
                      );
                      const isConcluded = selectedElection.status === 'concluded' || new Date(selectedElection.deadline) < new Date();
                      
                      return (
                        <>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Total Votes: {totalVotes}
                          </p>
                          {isConcluded && winner && (
                            <div className="mt-2 p-2 bg-primary/10 border border-primary rounded">
                              <p className="text-[10px] md:text-xs font-medium text-primary mb-1">Winner</p>
                              <p className="text-xs md:text-sm font-bold">
                                {winner.profiles.first_name} {winner.profiles.last_name}
                              </p>
                              <p className="text-[10px] md:text-xs text-muted-foreground">
                                {winner.votes_count} votes ({totalVotes > 0 ? Math.round((winner.votes_count / totalVotes) * 100) : 0}%)
                              </p>
                            </div>
                          )}
                          {isAdmin && !isConcluded && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleConcludeElection(selectedElection.id)}
                              disabled={concluding}
                              className="w-full mt-2 text-xs"
                            >
                              {concluding ? "Concluding..." : "Conclude Election Now"}
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {(nominees[selectedElection.id] || []).map(nominee => {
                    const userVoted = !!userVotes[selectedElection.id];
                    const totalVotes = nominees[selectedElection.id]?.reduce((sum, n) => sum + n.votes_count, 0) || 0;
                    const percentage = totalVotes > 0 ? Math.round((nominee.votes_count / totalVotes) * 100) : 0;
                    const isSelected = userVotes[selectedElection.id] === nominee.nominee_id;
                    const isConcluded = selectedElection.status === 'concluded' || new Date(selectedElection.deadline) < new Date();
                    const canVote = !userVoted && !isConcluded;

                    return (
                      <Card
                        key={nominee.id}
                        className={`transition-all ${
                          canVote ? 'cursor-pointer hover:border-primary hover:shadow-md' : 'cursor-default'
                        } ${isSelected ? 'border-primary border-2' : ''}`}
                        onClick={() => canVote && handleVote(selectedElection.id, nominee.nominee_id)}
                      >
                        <CardContent className="p-2 md:p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 md:h-8 md:w-8 bg-primary/10">
                                <AvatarFallback className="text-xs md:text-sm bg-primary/10 text-primary">
                                  {getInitials(nominee.profiles.first_name, nominee.profiles.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-semibold text-xs md:text-sm">
                                  {nominee.profiles.first_name} {nominee.profiles.last_name}
                                </p>
                                <p className="text-[10px] md:text-xs text-muted-foreground">
                                  {nominee.profiles.member_id}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {isSelected && (
                                <Badge variant="default" className="text-[10px] md:text-xs mb-1">
                                  Your Vote
                                </Badge>
                              )}
                              <div>
                                <p className="text-xs md:text-sm font-bold">{nominee.votes_count}</p>
                                <p className="text-[10px] md:text-xs text-muted-foreground">{percentage}%</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General or Topic Chat View */}
        {(currentView === 'general' || currentView === 'topic') && (
          <div className="h-full flex flex-col pb-16">
            {/* Topic Description */}
            {currentView === 'topic' && selectedTopic && (
              <div className="shrink-0 border-b border-border bg-muted/30">
                <div className="container max-w-4xl mx-auto px-2 md:px-4 py-1.5 md:py-2">
                  <p className="text-[10px] md:text-xs text-muted-foreground">{selectedTopic.description}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pb-32">
              <div className="container max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-3">
                <div className="space-y-2">
                  {posts.map((post) => {
                    const isOwnPost = post.user_id === currentUserId;
                    const cardPadding = isMobile ? 'p-2' : 'p-3';
                    
                    return (
                      <Card key={post.id} className={`border hover:shadow-sm transition-shadow ${cardPadding}`}>
                        <div className="flex gap-1.5 md:gap-2">
                          <Avatar className="h-6 w-6 md:h-8 md:w-8 shrink-0 bg-primary/10">
                            <AvatarFallback className="text-[10px] md:text-xs bg-primary/10 text-primary">
                              {getInitials(post.profiles.first_name, post.profiles.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-semibold text-[10px] md:text-xs text-foreground">
                                @{getDisplayName(post)}
                              </span>
                              {isOwnPost && (
                                <Badge variant="secondary" className="text-[8px] md:text-[10px] px-1 py-0">You</Badge>
                              )}
                              <span className="text-[8px] md:text-[10px] text-muted-foreground">
                                {getRelativeTime(post.created_at)}
                              </span>
                            </div>
                            
                            {post.reply_post && (
                              <div className="bg-muted border-l-2 border-primary px-1.5 md:px-2 py-1 mb-1 rounded text-[10px] md:text-xs">
                                <div className="font-semibold text-[9px] md:text-[10px] text-foreground">
                                  Replying to @{post.reply_post.profiles.forum_username || 
                                    `${post.reply_post.profiles.first_name} ${post.reply_post.profiles.last_name}`}
                                </div>
                                <div className="text-[9px] md:text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {post.reply_post.message}
                                </div>
                              </div>
                            )}
                            
                            <p className="text-[11px] md:text-sm text-foreground break-words whitespace-pre-wrap">
                              {renderMessage(post.message)}
                            </p>
                            
                            <div className="flex gap-1 mt-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 md:h-6 md:w-6"
                                onClick={() => setReplyingTo(post)}
                              >
                                <Reply className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                              {isOwnPost && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5 md:h-6 md:w-6 text-destructive"
                                  onClick={() => setDeletingItem({ type: 'post', id: post.id })}
                                >
                                  <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Message Input - Fixed */}
            <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-background z-10">
              <div className="container max-w-4xl mx-auto px-2 md:px-4 py-2">
                {replyingTo && (
                  <div className="flex items-center justify-between gap-2 mb-2 p-1.5 md:p-2 bg-muted rounded text-[10px] md:text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">
                        Replying to @{getDisplayName(replyingTo)}
                      </span>
                      <p className="text-muted-foreground line-clamp-1">
                        {replyingTo.message}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 md:h-6 md:w-6 shrink-0"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                )}

                {showMentionMenu && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-2 right-2 mb-1 bg-background border border-border rounded-md shadow-lg max-h-32 md:max-h-40 overflow-y-auto z-10">
                    {filteredUsers.slice(0, 5).map(user => (
                      <button
                        key={user.id}
                        className="w-full px-2 md:px-3 py-1.5 md:py-2 text-left hover:bg-accent text-[10px] md:text-xs"
                        onClick={() => handleMention(user.username)}
                      >
                        <div className="font-semibold">@{user.username}</div>
                        <div className="text-muted-foreground text-[9px] md:text-[10px]">{user.name}</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5 md:gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className={`resize-none ${isMobile ? 'min-h-[36px] max-h-[80px] text-xs' : 'min-h-[44px] max-h-[120px] text-sm'}`}
                    rows={isMobile ? 1 : 2}
                    maxLength={1000}
                    disabled={sending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className={isMobile ? 'h-9 w-9 shrink-0' : 'h-11 w-11 shrink-0'}
                  >
                    <Send className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                  </Button>
                </div>

                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1 text-right">
                  {newMessage.length}/1000
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Forum;
