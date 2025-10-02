import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedCard } from "@/components/feed/FeedCard";
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

export const Discover = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`id, content_type, content_url, caption, created_at, user_id, profiles!inner (user_id, display_name, handle, avatar_url, verified)`)
        .eq("is_spark", false)
        .order("created_at", { ascending: false })
        .limit(30);

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

  const filteredPosts = posts.filter(post =>
    post.content.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-20 pt-4">
      <div className="px-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, people, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      <Tabs defaultValue="trending" className="w-full">
        <TabsList className="w-full px-4 grid grid-cols-3 mb-4">
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="px-4 space-y-0">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts found</p>
            </div>
          ) : (
            filteredPosts.map(post => <FeedCard key={post.id} post={post} />)
          )}
        </TabsContent>

        <TabsContent value="recent" className="px-4 space-y-0">
          {filteredPosts.map(post => <FeedCard key={post.id} post={post} />)}
        </TabsContent>

        <TabsContent value="people" className="px-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">People search coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
