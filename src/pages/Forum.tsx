import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Trash2, Reply, X, Edit2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { formatDateDDMMYY } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ForumUsernameDialog } from "@/components/ForumUsernameDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const Forum = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ForumPost | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [allUsers, setAllUsers] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
      await loadAllUsers();
      scrollToBottom();
    };
    init();

    const channel = supabase
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

    return () => {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (posts.length > 0 && messagesContainerRef.current) {
      scrollToBottom();
    }
  }, [posts]);

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
    <div className="min-h-screen bg-background pb-20">
      <ForumUsernameDialog
        open={showUsernameDialog}
        onClose={() => {
          setShowUsernameDialog(false);
          getCurrentUser();
        }}
        currentUsername={currentUsername || undefined}
        userId={currentUserId!}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
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

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="container max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6 overflow-y-auto"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <div className="space-y-3 md:space-y-4 mb-4">
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

      {/* Message Input */}
      <div className="fixed bottom-16 md:bottom-4 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg">
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
