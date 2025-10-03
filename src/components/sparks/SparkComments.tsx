import { useState, useEffect } from "react";
import { X, Heart, Send, Smile } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url: string;
    verified: boolean;
  };
  likes_count: number;
  user_liked: boolean;
  replies_count?: number;
}

interface SparkCommentsProps {
  sparkId: string;
  sparkAuthorId: string;
  sparkAuthorHandle: string;
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_REACTIONS = ["😂", "🙏", "🔥", "👏", "😢", "😍", "😮", "😅"];

export const SparkComments = ({ 
  sparkId, 
  sparkAuthorId, 
  sparkAuthorHandle,
  isOpen, 
  onClose 
}: SparkCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; handle: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, sparkId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setCurrentUser({ ...user, profile });
    }
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      // Load top-level comments (no parent)
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id, user_id, content, created_at, parent_comment_id,
          profiles!inner (display_name, handle, avatar_url, verified)
        `)
        .eq("post_id", sparkId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load engagement data for each comment
      const commentsWithData = await Promise.all(
        (data || []).map(async (comment) => {
          const [likesData, userLikeData, repliesData] = await Promise.all([
            supabase.from("comment_likes").select("id", { count: "exact" }).eq("comment_id", comment.id),
            currentUser ? supabase.from("comment_likes").select("id").eq("comment_id", comment.id).eq("user_id", currentUser.id).single() : null,
            supabase.from("comments").select("id", { count: "exact" }).eq("parent_comment_id", comment.id)
          ]);

          return {
            ...comment,
            likes_count: likesData.count || 0,
            user_liked: !!userLikeData?.data,
            replies_count: repliesData.count || 0
          };
        })
      );

      setComments(commentsWithData);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id, user_id, content, created_at, parent_comment_id,
          profiles!inner (display_name, handle, avatar_url, verified)
        `)
        .eq("parent_comment_id", parentId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const repliesWithData = await Promise.all(
        (data || []).map(async (reply) => {
          const [likesData, userLikeData] = await Promise.all([
            supabase.from("comment_likes").select("id", { count: "exact" }).eq("comment_id", reply.id),
            currentUser ? supabase.from("comment_likes").select("id").eq("comment_id", reply.id).eq("user_id", currentUser.id).single() : null
          ]);

          return {
            ...reply,
            likes_count: likesData.count || 0,
            user_liked: !!userLikeData?.data,
            replies_count: 0
          };
        })
      );

      // Insert replies after parent comment
      setComments(prev => {
        const parentIndex = prev.findIndex(c => c.id === parentId);
        if (parentIndex === -1) return prev;
        
        const newComments = [...prev];
        newComments.splice(parentIndex + 1, 0, ...repliesWithData);
        return newComments;
      });

      setExpandedReplies(prev => new Set(prev).add(parentId));
    } catch (error) {
      console.error("Error loading replies:", error);
      toast.error("Failed to load replies");
    }
  };

  const handlePostComment = async () => {
    if (!currentUser) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: sparkId,
          user_id: currentUser.id,
          content: newComment.trim(),
          parent_comment_id: replyingTo?.id || null
        })
        .select(`
          id, user_id, content, created_at, parent_comment_id,
          profiles!inner (display_name, handle, avatar_url, verified)
        `)
        .single();

      if (error) throw error;

      const newCommentData: Comment = {
        ...data,
        likes_count: 0,
        user_liked: false,
        replies_count: 0
      };

      if (replyingTo) {
        // Add reply to comments list
        const parentIndex = comments.findIndex(c => c.id === replyingTo.id);
        if (parentIndex !== -1) {
          setComments(prev => {
            const newComments = [...prev];
            newComments.splice(parentIndex + 1, 0, newCommentData);
            // Increment replies count
            newComments[parentIndex] = {
              ...newComments[parentIndex],
              replies_count: (newComments[parentIndex].replies_count || 0) + 1
            };
            return newComments;
          });
        }
      } else {
        // Add top-level comment
        setComments(prev => [newCommentData, ...prev]);
      }

      setNewComment("");
      setReplyingTo(null);
      toast.success("Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) {
      toast.error("Please sign in to like");
      return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      if (comment.user_liked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUser.id);

        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, user_liked: false, likes_count: c.likes_count - 1 }
            : c
        ));
      } else {
        await supabase
          .from("comment_likes")
          .insert({ comment_id: commentId, user_id: currentUser.id });

        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, user_liked: true, likes_count: c.likes_count + 1 }
            : c
        ));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to like comment");
    }
  };

  const handleReply = (commentId: string, handle: string) => {
    setReplyingTo({ id: commentId, handle });
    setNewComment(`@${handle} `);
  };

  const handleViewReplies = (commentId: string) => {
    if (expandedReplies.has(commentId)) {
      // Collapse replies
      setComments(prev => prev.filter(c => c.parent_comment_id !== commentId));
      setExpandedReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      // Load and expand replies
      loadReplies(commentId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60] animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[61] bg-background rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-in-bottom">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Comments</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div 
                  key={comment.id}
                  className={comment.parent_comment_id ? "ml-12" : ""}
                >
                  <div className="flex gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage 
                        src={comment.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                        alt={comment.profiles.display_name}
                      />
                      <AvatarFallback>{comment.profiles.display_name[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">@{comment.profiles.handle}</span>
                        {comment.profiles.verified && (
                          <span className="text-primary">✓</span>
                        )}
                        {comment.user_id === sparkAuthorId && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">Author</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-sm mt-1 break-words">{comment.content}</p>

                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => handleReply(comment.id, comment.profiles.handle)}
                          className="text-xs text-muted-foreground hover:text-foreground font-medium"
                        >
                          Reply
                        </button>
                        {comment.replies_count > 0 && !comment.parent_comment_id && (
                          <button
                            onClick={() => handleViewReplies(comment.id)}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium"
                          >
                            {expandedReplies.has(comment.id) 
                              ? "Hide replies" 
                              : `View ${comment.replies_count} ${comment.replies_count === 1 ? 'reply' : 'replies'}`
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Like Button */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Heart 
                          className={`h-5 w-5 ${
                            comment.user_liked 
                              ? "fill-red-500 text-red-500" 
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                      {comment.likes_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {comment.likes_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t bg-background p-4">
          {/* Emoji Quick Reactions */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setNewComment(prev => prev + emoji)}
                className="text-2xl hover:scale-110 transition-transform flex-shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <span>Replying to @{replyingTo.handle}</span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment("");
                }}
                className="text-primary hover:text-primary/80"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3 items-end">
            {currentUser?.profile && (
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage 
                  src={currentUser.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                  alt={currentUser.profile.display_name}
                />
                <AvatarFallback>{currentUser.profile.display_name[0]}</AvatarFallback>
              </Avatar>
            )}
            
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Add a comment for @${sparkAuthorHandle}...`}
              className="flex-1 min-h-[40px] max-h-[100px] resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
            />

            <Button
              onClick={handlePostComment}
              disabled={!newComment.trim()}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};