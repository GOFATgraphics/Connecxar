import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Send, Trash2, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ProfileLink } from "./ProfileLink";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
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

interface FeedPost {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string;
    avatar: string;
    verified?: boolean;
    isFollowing?: boolean;
  };
  content: {
    type: "image" | "video" | "text";
    url?: string;
    caption: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  timestamp: string;
}

interface FeedCardProps {
  post: FeedPost;
  onPostDeleted?: (postId: string) => void;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    handle: string;
    display_name: string;
    avatar_url: string;
    verified?: boolean;
  };
  liked?: boolean;
  likes_count?: number;
}

export const FeedCard = ({ post, onPostDeleted }: FeedCardProps) => {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(post.author.isFollowing || false);
  const [likesCount, setLikesCount] = useState(post.engagement.likes);
  const [commentsCount, setCommentsCount] = useState(post.engagement.comments);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinning, setPinning] = useState(false);

  useEffect(() => {
    loadEngagementData();

    const likesChannel = supabase
      .channel(`post-${post.id}-likes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` }, () => loadLikes())
      .subscribe();

    const commentsChannel = supabase
      .channel(`post-${post.id}-comments`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => loadComments())
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [post.id]);

  const loadEngagementData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    await Promise.all([loadLikes(), loadComments(), loadPinStatus()]);
  };

  const loadLikes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
    setLikesCount(count || 0);

    if (user) {
      const { data } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle();
      setIsLiked(!!data);
    }
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`id, user_id, content, created_at, profiles!comments_user_id_fkey (handle, display_name, avatar_url, verified)`)
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data as any);
      setCommentsCount(data.length);
    }
  };

  const loadPinStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('pinned_posts').select('id').eq('user_id', user.id).eq('post_id', post.id).maybeSingle();
    setIsPinned(!!data);
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not authenticated", description: "Please log in to like posts", variant: "destructive" });
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
        if (user.id !== post.authorId) {
          const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
          await supabase.from('notifications').insert({
            user_id: post.authorId,
            type: 'like',
            title: 'New Like',
            message: `${profile?.display_name || 'Someone'} liked your post`,
            actor_id: user.id,
            post_id: post.id
          });
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({ title: "Error", description: "Failed to update like", variant: "destructive" });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not authenticated", description: "Please log in to comment", variant: "destructive" });
      return;
    }

    setSubmittingComment(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: user.id,
        content: newComment.trim()
      });

      if (error) throw error;

      if (user.id !== post.authorId) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
        await supabase.from('notifications').insert({
          user_id: post.authorId,
          type: 'comment',
          title: 'New Comment',
          message: `${profile?.display_name || 'Someone'} commented on your post`,
          actor_id: user.id,
          post_id: post.id
        });
      }

      setNewComment("");
      toast({ title: "Comment added", description: "Your comment has been posted" });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;

      toast({ title: "Post deleted", description: "Your post has been removed" });
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <article className="feed-card animate-fade-in">
      <div className="flex items-center justify-between p-4">
        <ProfileLink userId={post.authorId} className="flex items-center gap-3">
          <img src={post.author.avatar} alt={post.author.username} className="w-10 h-10 rounded-full object-cover" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">{post.author.displayName}</span>
              {post.author.verified && <VerifiedBadge />}
            </div>
            <span className="text-xs text-muted-foreground">@{post.author.username}</span>
          </div>
        </ProfileLink>

        <div className="flex items-center gap-2">
          {!isFollowing && currentUserId !== post.authorId && (
            <Button size="sm" onClick={() => setIsFollowing(true)} className="h-8 px-4 rounded-full text-xs font-medium">
              Follow
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="touch-target">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsPinned(!isPinned)} disabled={pinning}>
                <Pin className="h-4 w-4 mr-2" />
                {isPinned ? 'Unpin' : 'Pin'} Post
              </DropdownMenuItem>
              {currentUserId === post.authorId && (
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {post.content.url && (
        <img src={post.content.url} alt="Post content" className="w-full aspect-square object-cover" />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="engagement-button">
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-destructive text-destructive' : ''}`} />
              <span className="text-sm font-medium">{formatNumber(likesCount)}</span>
            </button>

            <button className="engagement-button" onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{formatNumber(commentsCount)}</span>
            </button>

            <button className="engagement-button">
              <Share className="h-5 w-5" />
              <span className="text-sm font-medium">{formatNumber(post.engagement.shares)}</span>
            </button>
          </div>

          <button onClick={() => setIsSaved(!isSaved)} className="engagement-button">
            <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-foreground' : ''}`} />
          </button>
        </div>

        <p className="text-sm">
          <span className="font-semibold mr-2">@{post.author.username}</span>
          {post.content.caption}
        </p>

        <span className="text-xs text-muted-foreground mt-1 block">{post.timestamp}</span>

        {showComments && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                disabled={submittingComment}
                className="flex-1"
              />
              <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim() || submittingComment}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img
                      src={comment.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                      alt={comment.profiles.handle}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">{comment.profiles.display_name}</span>
                        {comment.profiles.verified && <VerifiedBadge size="sm" />}
                        <span className="text-xs text-muted-foreground ml-1">@{comment.profiles.handle}</span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                      <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
};
