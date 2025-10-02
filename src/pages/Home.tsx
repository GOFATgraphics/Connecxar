import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

      const transformedPosts: Post[] = (data || []).map((post: any) => ({
        id: post.id,
        authorId: post.user_id,
        author: {
          username: post.profiles?.handle || "user",
          displayName: post.profiles?.display_name || "User",
          avatar: post.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`,
          verified: post.profiles?.verified || false,
          isFollowing: false,
        },
        content: {
          type: post.content_type as "image" | "text",
          url: post.content_url || undefined,
          caption: post.caption || "",
        },
        engagement: { likes: 0, comments: 0, shares: 0 },
        timestamp: new Date(post.created_at).toLocaleDateString(),
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({ title: "Error", description: "Failed to load posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">CHILL-Z</h1>
        </header>
      </div>

      <div className="min-h-screen bg-background pb-20 pt-16">
        <div className="max-w-2xl mx-auto p-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No posts yet</p>
              <p className="text-sm text-muted-foreground">Be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="feed-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={post.author.avatar} alt={post.author.displayName} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold">{post.author.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{post.author.username}</p>
                    </div>
                  </div>
                  {post.content.url && (
                    <img src={post.content.url} alt="Post" className="w-full rounded-xl mb-3" />
                  )}
                  <p className="text-sm">{post.content.caption}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
