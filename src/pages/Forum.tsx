import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { formatDateDDMMYY } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ForumPost {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    member_id: string;
  };
}

const Forum = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadPosts();
    getCurrentUser();

    // Subscribe to real-time updates
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
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [posts]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);
  };

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select("*, profiles(first_name, last_name, member_id)")
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
        message: newMessage.trim()
      });

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else {
      setNewMessage("");
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

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
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
        </div>
      </div>

      {/* Messages */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4 mb-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No messages yet. Be the first to start a conversation!
                </p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => {
              const isOwnPost = post.user_id === currentUserId;
              return (
                <div
                  key={post.id}
                  className={`flex gap-3 ${isOwnPost ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(post.profiles.first_name, post.profiles.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[85%] md:max-w-[70%] ${isOwnPost ? "items-end" : ""}`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isOwnPost ? "flex-row-reverse" : ""}`}>
                      <span className="font-semibold text-sm">
                        {post.profiles.first_name} {post.profiles.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(post.created_at)}
                      </span>
                    </div>
                    <div className={`relative group ${isOwnPost ? "flex flex-col items-end" : ""}`}>
                      <Card className={`${isOwnPost ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {post.message}
                          </p>
                        </CardContent>
                      </Card>
                      {isOwnPost && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
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
      <div className="fixed bottom-16 md:bottom-4 left-0 right-0 bg-background border-t border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[60px] max-h-[120px] resize-none"
              maxLength={1000}
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {newMessage.length}/1000
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Forum;
