import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Trash2, Reply, X, Edit2, Plus, MessageSquare, BarChart3 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { formatDateDDMMYY } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ForumUsernameDialog } from "@/components/ForumUsernameDialog";
import { ForumTopicDialog } from "@/components/ForumTopicDialog";
import { ForumPollDialog } from "@/components/ForumPollDialog";
import { useRole } from "@/hooks/useRole";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LAST_VISIT_KEY = "forum_last_visit";

interface ForumPost {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  reply_to: string | null;
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

interface ForumPoll {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
}

interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  votes_count: number;
}

const Forum = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [polls, setPolls] = useState<ForumPoll[]>([]);
  const [pollOptions, setPollOptions] = useState<Record<string, PollOption[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<ForumTopic | null>(null);
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'topic' | 'poll'; id: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ForumPost | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [allUsers, setAllUsers] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, smooth ? 100 : 0);
  };

  const getUserColor = (userId: string): string => {
    const colors = [
      "hsl(346, 77%, 50%)",
      "hsl(262, 83%, 58%)",
      "hsl(221, 83%, 53%)",
      "hsl(142, 71%, 45%)",
      "hsl(24, 95%, 53%)",
      "hsl(280, 67%, 55%)",
      "hsl(173, 80%, 40%)",
      "hsl(48, 96%, 53%)",
      "hsl(339, 90%, 51%)",
      "hsl(199, 89%, 48%)",
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    const init = async () => {
      await getCurrentUser();
      await loadPosts();
      await loadTopics();
      await loadPolls();
      await loadAllUsers();
      scrollToBottom();
    };
    init();

    const postsChannel = supabase
      .channel('forum-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_posts'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    const topicsChannel = supabase
      .channel('forum-topics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_topics'
        },
        () => {
          loadTopics();
        }
      )
      .subscribe();

    const pollsChannel = supabase
      .channel('forum-polls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_polls'
        },
        () => {
          loadPolls();
        }
      )
      .subscribe();

    const pollOptionsChannel = supabase
      .channel('forum-poll-options')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_poll_options'
        },
        (payload) => {
          if (payload.new && 'poll_id' in payload.new) {
            loadPollOptions(payload.new.poll_id as string);
          }
        }
      )
      .subscribe();

    return () => {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(topicsChannel);
      supabase.removeChannel(pollsChannel);
      supabase.removeChannel(pollOptionsChannel);
    };
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      scrollToBottom(false);
    }
  }, [posts.length]);

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

  const loadPolls = async () => {
    const { data, error } = await supabase
      .from("forum_polls")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load polls:", error);
    } else {
      setPolls(data || []);
      // Load options for each poll
      data?.forEach(poll => loadPollOptions(poll.id));
      // Load user votes
      if (currentUserId) {
        loadUserVotes();
      }
    }
  };

  const loadPollOptions = async (pollId: string) => {
    const { data, error } = await supabase
      .from("forum_poll_options")
      .select("*")
      .eq("poll_id", pollId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load poll options:", error);
    } else {
      setPollOptions(prev => ({ ...prev, [pollId]: data || [] }));
    }
  };

  const loadUserVotes = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("forum_poll_votes")
      .select("poll_id, option_id")
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Failed to load user votes:", error);
    } else {
      const votes: Record<string, string> = {};
      data?.forEach(vote => {
        votes[vote.poll_id] = vote.option_id;
      });
      setUserVotes(votes);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
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

    if (error) {
      toast.error("Failed to load forum posts");
      console.error(error);
    } else {
      setPosts(data as any || []);
      // Scroll to bottom after posts load
      setTimeout(() => scrollToBottom(false), 300);
    }
    setLoading(false);
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

    const { error } = await supabase
      .from("forum_posts")
      .insert({
        user_id: user.id,
        message: newMessage.trim(),
        reply_to: replyingTo?.id || null
      });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      setNewMessage("");
      setReplyingTo(null);
      toast.success("Message sent");
      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom(false), 200);
    }
    setSending(false);
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      toast.error("Failed to delete post");
      console.error(error);
    } else {
      toast.success("Post deleted");
    }
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
    }
    setDeletingItem(null);
  };

  const handleDeletePoll = async () => {
    if (!deletingItem || deletingItem.type !== 'poll') return;

    const { error } = await supabase
      .from("forum_polls")
      .delete()
      .eq("id", deletingItem.id);

    if (error) {
      toast.error("Failed to delete poll");
      console.error(error);
    } else {
      toast.success("Poll deleted");
    }
    setDeletingItem(null);
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!currentUserId) {
      toast.error("You must be logged in to vote");
      return;
    }

    if (userVotes[pollId]) {
      toast.error("You have already voted in this poll");
      return;
    }

    const { error } = await supabase
      .from("forum_poll_votes")
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: currentUserId
      });

    if (error) {
      toast.error("Failed to cast vote");
      console.error(error);
    } else {
      toast.success("Vote cast successfully");
      setUserVotes(prev => ({ ...prev, [pollId]: optionId }));
      loadPollOptions(pollId);
    }
  };

  const handleMention = (username: string) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBefore = newMessage.substring(0, cursorPos);
    const textAfter = newMessage.substring(cursorPos);
    const lastAtIndex = textBefore.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const newText = textBefore.substring(0, lastAtIndex) + `@${username} ` + textAfter;
      setNewMessage(newText);
    }
    
    setShowMentionMenu(false);
    setMentionSearch("");
    textareaRef.current?.focus();
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
      } else if (searchTerm.length === 0) {
        setMentionSearch("");
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

  const formatTime = (dateString: string) => {
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
    u.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    u.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

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
        topic={editingTopic || undefined}
      />

      <ForumPollDialog
        open={showPollDialog}
        onClose={() => {
          setShowPollDialog(false);
          setEditingPoll(null);
        }}
        poll={editingPoll}
      />

      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deletingItem?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletingItem?.type === 'topic' ? handleDeleteTopic : handleDeletePoll}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="shrink-0 sticky top-0 z-10 bg-background border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Member Forum</h1>
                <p className="text-sm text-muted-foreground">
                  {posts.length} {posts.length === 1 ? "message" : "messages"}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  @{currentUsername || "Set Username"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowUsernameDialog(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Username
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Topics and Polls - Scrollable Section */}
      <div className="shrink-0 overflow-y-auto max-h-[30vh] border-b border-border">
        {/* Topics Section */}
        {(topics.length > 0 || isAdmin) && (
          <div className="container max-w-4xl mx-auto px-3 md:px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Discussion Topics</h2>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowTopicDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Topic
              </Button>
            )}
          </div>
          <div className="space-y-2 mb-4">
            {topics.map((topic) => (
              <Card key={topic.id} className="border-l-4 border-l-primary">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm md:text-base mb-1">{topic.title}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-wrap">
                        {topic.description}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
                        Posted {formatTime(topic.created_at)}
                      </p>
                    </div>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTopic(topic);
                              setShowTopicDialog(true);
                            }}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingItem({ type: 'topic', id: topic.id })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

        {/* Polls Section */}
        {(polls.length > 0 || isAdmin) && (
          <div className="container max-w-4xl mx-auto px-3 md:px-4 pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Active Polls</h2>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setShowPollDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Poll
              </Button>
            )}
          </div>
          <div className="space-y-3 mb-4">
            {polls.map((poll) => {
              const options = pollOptions[poll.id] || [];
              const totalVotes = options.reduce((sum, opt) => sum + opt.votes_count, 0);
              const userVoted = !!userVotes[poll.id];

              return (
                <Card key={poll.id} className="border-2 border-primary/20">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-sm md:text-base flex-1">{poll.question}</h3>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingPoll({ ...poll, options });
                                setShowPollDialog(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingItem({ type: 'poll', id: poll.id })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="space-y-2">
                      {options.map((option) => {
                        const percentage = totalVotes > 0 ? (option.votes_count / totalVotes) * 100 : 0;
                        const isSelected = userVotes[poll.id] === option.id;

                        return (
                          <div key={option.id}>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              className="w-full justify-start mb-1 text-left h-auto py-2 px-3"
                              onClick={() => !userVoted && handleVote(poll.id, option.id)}
                              disabled={userVoted}
                            >
                              <span className="flex-1 text-xs md:text-sm">{option.option_text}</span>
                              {userVoted && (
                                <span className="ml-2 text-xs font-semibold">
                                  {option.votes_count} ({percentage.toFixed(1)}%)
                                </span>
                              )}
                            </Button>
                            {userVoted && (
                              <Progress value={percentage} className="h-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-3">
                      {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                      {userVoted && " • You voted"}
                    </p>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="container max-w-4xl mx-auto px-3 md:px-4 h-full overflow-y-auto"
        >
          <div className="py-4 md:py-6 space-y-3 md:space-y-4">
          {posts.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="py-8 md:py-12 text-center">
                <p className="text-muted-foreground text-sm md:text-base">
                  No messages yet. Be the first to start a conversation!
                </p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => {
              const isOwnPost = post.user_id === currentUserId;
              const userColor = getUserColor(post.user_id);
              return (
                <div
                  key={post.id}
                  className={`flex gap-2 md:gap-3 ${isOwnPost ? "flex-row-reverse" : ""}`}
                >
                  <Avatar 
                    className="h-8 w-8 md:h-10 md:w-10 shrink-0 ring-2 ring-offset-1"
                    style={{ "--tw-ring-color": userColor } as React.CSSProperties}
                  >
                    <AvatarFallback 
                      className="text-white text-xs md:text-sm font-semibold"
                      style={{ backgroundColor: userColor }}
                    >
                      {getInitials(post.profiles.first_name, post.profiles.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[80%] md:max-w-[70%] ${isOwnPost ? "items-end" : ""}`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isOwnPost ? "flex-row-reverse" : ""}`}>
                      <span 
                        className="font-bold text-xs md:text-sm"
                        style={{ color: userColor }}
                      >
                        @{getDisplayName(post)}
                      </span>
                      <span className="text-[10px] md:text-xs text-muted-foreground">
                        {formatTime(post.created_at)}
                      </span>
                    </div>
                    <div className={`relative group ${isOwnPost ? "flex flex-col items-end" : ""}`}>
                      <Card 
                        className="border-2 shadow-sm"
                        style={{ 
                          borderColor: userColor,
                          backgroundColor: isOwnPost ? userColor : "hsl(var(--card))"
                        }}
                      >
                        <CardContent className="p-2.5 md:p-3">
                          {post.reply_to && post.reply_post && (
                            <div className="mb-2 p-2 bg-black/10 rounded border-l-2 border-white/30">
                              <p className="text-[10px] md:text-xs font-semibold opacity-80">
                                @{post.reply_post.profiles.forum_username || 
                                  `${post.reply_post.profiles.first_name} ${post.reply_post.profiles.last_name}`}
                              </p>
                              <p className="text-[10px] md:text-xs opacity-70 line-clamp-2">
                                {post.reply_post.message}
                              </p>
                            </div>
                          )}
                          <p 
                            className="text-xs md:text-sm whitespace-pre-wrap break-words leading-relaxed"
                            style={{ color: isOwnPost ? "white" : "hsl(var(--foreground))" }}
                          >
                            {renderMessage(post.message)}
                          </p>
                        </CardContent>
                      </Card>
                      <div className={`absolute ${isOwnPost ? "-left-8 md:-left-10" : "-right-8 md:-right-10"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                        {!isOwnPost && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8"
                            onClick={() => setReplyingTo(post)}
                          >
                            <Reply className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          </Button>
                        )}
                        {isOwnPost && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="shrink-0 bg-background border-t border-border shadow-lg">
        <div className="container max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          {replyingTo && (
            <div className="mb-2 p-2 bg-muted rounded-lg flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">
                  Replying to @{getDisplayName(replyingTo)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyingTo.message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setReplyingTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {showMentionMenu && filteredUsers.length > 0 && (
            <div className="mb-2 p-2 bg-card rounded-lg border shadow-lg max-h-40 overflow-y-auto">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  className="w-full text-left p-2 hover:bg-muted rounded text-sm"
                  onClick={() => handleMention(user.username)}
                >
                  <span className="font-semibold">@{user.username}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{user.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message... (use @ to mention)"
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[52px] md:min-h-[60px] max-h-[100px] md:max-h-[120px] resize-none text-sm md:text-base"
              maxLength={1000}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              size="icon"
              className="h-[52px] w-[52px] md:h-[60px] md:w-[60px] shrink-0"
            >
              <Send className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 text-right">
            {newMessage.length}/1000
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Forum;
