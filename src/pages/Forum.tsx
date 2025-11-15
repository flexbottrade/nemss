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

type ViewType = 'navigation' | 'general' | 'topic' | 'poll';

const Forum = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [currentView, setCurrentView] = useState<ViewType>('navigation');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
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
      data?.forEach(poll => loadPollOptions(poll.id));
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
      if (selectedTopicId === deletingItem.id) {
        setCurrentView('navigation');
        setSelectedTopicId(null);
      }
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
      if (selectedPollId === deletingItem.id) {
        setCurrentView('navigation');
        setSelectedPollId(null);
      }
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
    } else if (type === 'poll' && id) {
      setSelectedPollId(id);
    }
  };

  const handleBackToNavigation = () => {
    setCurrentView('navigation');
    setSelectedTopicId(null);
    setSelectedPollId(null);
  };

  const selectedTopic = topics.find(t => t.id === selectedTopicId);
  const selectedPoll = polls.find(p => p.id === selectedPollId);

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

      <ForumPollDialog
        open={showPollDialog}
        onClose={() => {
          setShowPollDialog(false);
          setEditingPoll(null);
        }}
        onSuccess={() => {
          loadPolls();
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

      {/* Header - Sticky */}
      <div className="shrink-0 sticky top-0 z-10 bg-background border-b border-border">
        <div className="container max-w-4xl mx-auto px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-10 md:w-10"
                onClick={currentView === 'navigation' ? () => navigate("/dashboard") : handleBackToNavigation}
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <div>
                <h1 className="text-base md:text-xl font-bold">
                  {currentView === 'navigation' && 'Member Forum'}
                  {currentView === 'general' && 'General Chat'}
                  {currentView === 'topic' && selectedTopic?.title}
                  {currentView === 'poll' && 'Voting'}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {currentView === 'navigation' ? `${posts.length} messages` : 
                   currentView === 'poll' && selectedPoll ? selectedPoll.question : ''}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs md:text-sm h-7 md:h-9">
                  @{currentUsername || "Set"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowUsernameDialog(true)}>
                  <Edit2 className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Edit Username
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Admin Actions - Sticky */}
      {isAdmin && currentView === 'navigation' && (
        <div className="shrink-0 sticky top-[52px] md:top-[64px] z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container max-w-4xl mx-auto px-3 md:px-4 py-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowTopicDialog(true)}
                className="gap-1 h-7 md:h-9 text-xs md:text-sm flex-1"
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4" />
                Add Topic
              </Button>
              <Button
                size="sm"
                onClick={() => setShowPollDialog(true)}
                className="gap-1 h-7 md:h-9 text-xs md:text-sm flex-1"
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4" />
                Add Poll
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'navigation' && (
          <div className="h-full overflow-y-auto">
            <div className="container max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4 space-y-3 md:space-y-4">
              {/* Polls Section */}
              {polls.length > 0 && (
                <div className="space-y-2">
                  {polls.map(poll => (
                    <Card
                      key={poll.id}
                      className="cursor-pointer hover:bg-accent hover:shadow-md transition-all border-l-4 border-l-primary"
                      onClick={() => handleNavigateToView('poll', poll.id)}
                    >
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-primary uppercase">Poll</span>
                              </div>
                              <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">{poll.question}</h3>
                              <p className="text-xs text-muted-foreground">
                                {userVotes[poll.id] ? '✓ Voted' : 'Tap to vote'}
                              </p>
                            </div>
                            <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 md:h-8 md:w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPoll({ ...poll, options: pollOptions[poll.id] || [] });
                                  setShowPollDialog(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 md:h-8 md:w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingItem({ type: 'poll', id: poll.id });
                                }}
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* General Discussion Card - Always visible */}
              <Card
                className="cursor-pointer hover:bg-accent hover:shadow-md transition-all"
                onClick={() => handleNavigateToView('general')}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start gap-2 md:gap-3">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary uppercase">Discussion</span>
                      </div>
                      <h3 className="font-semibold text-sm md:text-base mb-1">General</h3>
                      <p className="text-xs text-muted-foreground">
                        {posts.length} messages • Open for all
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                  </div>
                </CardContent>
              </Card>

              {/* Topics Section */}
              {topics.length > 0 && (
                <div className="space-y-2">
                  {topics.map(topic => (
                    <Card
                      key={topic.id}
                      className="cursor-pointer hover:bg-accent hover:shadow-md transition-all"
                      onClick={() => handleNavigateToView('topic', topic.id)}
                    >
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                            <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-primary uppercase">Topic</span>
                              </div>
                              <h3 className="font-semibold text-sm md:text-base line-clamp-1 mb-1">{topic.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {topic.description}
                              </p>
                            </div>
                            <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 md:h-8 md:w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTopic(topic);
                                  setShowTopicDialog(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 md:h-8 md:w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingItem({ type: 'topic', id: topic.id });
                                }}
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
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
        )}

        {/* Poll View */}
        {currentView === 'poll' && selectedPoll && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="container max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
                <Card>
                  <CardContent className="p-3 md:p-4">
                    <h3 className="font-semibold text-sm md:text-base mb-3 md:mb-4">{selectedPoll.question}</h3>
                    <div className="space-y-2">
                      {pollOptions[selectedPoll.id]?.map(option => {
                        const totalVotes = pollOptions[selectedPoll.id]?.reduce((sum, opt) => sum + opt.votes_count, 0) || 0;
                        const percentage = totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;
                        const isSelected = userVotes[selectedPoll.id] === option.id;
                        const userVoted = !!userVotes[selectedPoll.id];

                        return (
                          <div key={option.id}>
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              className="w-full justify-start h-auto py-2 md:py-3 text-xs md:text-sm"
                              onClick={() => handleVote(selectedPoll.id, option.id)}
                              disabled={userVoted}
                            >
                              <div className="flex-1 text-left">
                                <div className="font-medium">{option.option_text}</div>
                                {userVoted && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {option.votes_count} votes ({percentage}%)
                                  </div>
                                )}
                              </div>
                            </Button>
                            {userVoted && (
                              <Progress value={percentage} className="h-1 md:h-2 mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {userVotes[selectedPoll.id] && (
                      <p className="text-xs text-muted-foreground mt-3 md:mt-4">
                        Total votes: {pollOptions[selectedPoll.id]?.reduce((sum, opt) => sum + opt.votes_count, 0) || 0}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* General or Topic Chat View */}
        {(currentView === 'general' || currentView === 'topic') && (
          <div className="h-full flex flex-col">
            {/* Topic Description */}
            {currentView === 'topic' && selectedTopic && (
              <div className="shrink-0 border-b border-border bg-muted/30">
                <div className="container max-w-4xl mx-auto px-3 md:px-4 py-2 md:py-3">
                  <p className="text-xs md:text-sm text-muted-foreground">{selectedTopic.description}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
              <div className="container max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
                <div className="space-y-3 md:space-y-4">
                  {posts.map((post) => {
                    const isOwnPost = post.user_id === currentUserId;
                    const userColor = getUserColor(post.user_id);
                    return (
                      <div
                        key={post.id}
                        className={`flex gap-2 ${isOwnPost ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <Avatar className="h-7 w-7 md:h-9 md:w-9 shrink-0">
                          <AvatarFallback className="text-xs md:text-sm" style={{ backgroundColor: userColor }}>
                            {getInitials(post.profiles.first_name, post.profiles.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`flex-1 min-w-0 ${isOwnPost ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs md:text-sm" style={{ color: userColor }}>
                              @{getDisplayName(post)}
                            </span>
                            <span className="text-[10px] md:text-xs text-muted-foreground">
                              {getRelativeTime(post.created_at)}
                            </span>
                          </div>
                          
                          {post.reply_post && (
                            <div className={`bg-muted/50 border-l-2 border-primary px-2 py-1 mb-1 rounded text-xs ${isOwnPost ? 'ml-auto' : 'mr-auto'}`}>
                              <div className="font-semibold text-[10px] md:text-xs">
                                @{post.reply_post.profiles.forum_username || 
                                  `${post.reply_post.profiles.first_name} ${post.reply_post.profiles.last_name}`}
                              </div>
                              <div className="text-[10px] md:text-xs text-muted-foreground line-clamp-2">
                                {post.reply_post.message}
                              </div>
                            </div>
                          )}
                          
                          <Card className={`max-w-[85%] md:max-w-[75%] ${isOwnPost ? 'ml-auto' : 'mr-auto'}`}>
                            <CardContent className="p-2 md:p-3">
                              <p className="text-xs md:text-sm break-words" style={{ color: userColor }}>
                                {renderMessage(post.message)}
                              </p>
                            </CardContent>
                          </Card>

                          <div className="flex gap-1 mt-1">
                            {!isOwnPost && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 md:h-6 md:w-6"
                                onClick={() => setReplyingTo(post)}
                              >
                                <Reply className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            )}
                            {isOwnPost && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5 md:h-6 md:w-6"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-border bg-background">
              <div className="container max-w-4xl mx-auto px-3 md:px-4 py-2 md:py-3">
                {replyingTo && (
                  <div className="mb-2 bg-muted/50 border-l-2 border-primary px-2 py-1 rounded text-xs flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-xs">
                        Replying to @{getDisplayName(replyingTo)}
                      </div>
                      <div className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                        {replyingTo.message}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 md:h-5 md:w-5"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                )}

                {showMentionMenu && filteredUsers.length > 0 && (
                  <Card className="mb-2 max-h-32 md:max-h-40 overflow-y-auto">
                    <CardContent className="p-1 md:p-2">
                      {filteredUsers.slice(0, 5).map(user => (
                        <Button
                          key={user.id}
                          variant="ghost"
                          className="w-full justify-start h-auto py-1 text-xs md:text-sm"
                          onClick={() => handleMention(user.username)}
                        >
                          <div>
                            <div className="font-medium">@{user.username}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground">{user.name}</div>
                          </div>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type @ to mention someone..."
                    className="resize-none text-xs md:text-sm min-h-[60px] md:min-h-[80px]"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="h-[60px] w-[60px] md:h-[80px] md:w-[80px] shrink-0"
                  >
                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
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
