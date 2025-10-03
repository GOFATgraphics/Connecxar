import { useState, useEffect, useRef } from "react";
import { FeedCard } from "@/components/feed/FeedCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StoriesBar } from "@/components/stories/StoriesBar";

interface Post {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string;
    avatar: string;
    verified: boolean;
    isFollowing: boolean;
  };
  content: {
    type: "image" | "text";
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

export const Home = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopBar, setShowTopBar] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => loadPosts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 10) setShowTopBar(true);
      else if (currentScrollY > lastScrollY.current && currentScrollY > 100) setShowTopBar(false);
      else if (currentScrollY < lastScrollY.current) setShowTopBar(true);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`id, content_type, content_url, caption, created_at, user_id, profiles!inner (user_id, display_name, handle, avatar_url, verified)`)
        .eq("is_spark", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const postIds = (data || []).map((post: any) => post.id);
      const { data: likesData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
      const { data: commentsData } = await supabase.from("comments").select("post_id").in("post_id", postIds);

      const likesCounts = likesData?.reduce((acc: any, like: any) => {
        acc[like.post_id] = (acc[like.post_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const commentsCounts = commentsData?.reduce((acc: any, comment: any) => {
        acc[comment.post_id] = (acc[comment.post_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const transformedPosts: Post[] = (data || []).map((post: any) => {
        const profile = post.profiles;
        let contentUrl = post.content_url;
        if (contentUrl && !contentUrl.startsWith('http')) {
          const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(contentUrl);
          contentUrl = publicUrl;
        }

        return {
          id: post.id,
          authorId: post.user_id,
          author: {
            username: profile?.handle || "user",
            displayName: profile?.display_name || "User",
            avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`,
            verified: profile?.verified || false,
            isFollowing: false,
          },
          content: {
            type: post.content_type as "image" | "text",
            url: contentUrl || undefined,
            caption: post.caption || "",
          },
          engagement: {
            likes: likesCounts[post.id] || 0,
            comments: commentsCounts[post.id] || 0,
            shares: 0,
          },
          timestamp: new Date(post.created_at).toLocaleDateString(),
        };
      });

      setPosts(transformedPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({ title: "Error", description: "Failed to load posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showTopBar ? 'translate-y-0' : '-translate-y-full'}`}>
        <header className="h-16 px-4 flex items-center justify-center bg-background/95 backdrop-blur-md border-b border-border">
          <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">Connexar</h1>
        </header>
      </div>

      <div className="min-h-screen bg-background pb-20 pt-16">
        <div className="mb-4 pt-4">
          <StoriesBar />
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-muted-foreground mb-4">No posts yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share something!</p>
          </div>
        ) : (
          <div className="px-4 space-y-0">
            {posts.map((post) => (
              <FeedCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
            ))}
          </div>
        )}

        {posts.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">You are all caught up! 🎉</p>
          </div>
        )}
      </div>
    </>
  );
};
