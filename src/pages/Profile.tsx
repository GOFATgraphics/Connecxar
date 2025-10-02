import { useState, useEffect } from "react";
import { Settings, Grid, Bookmark, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FeedCard } from "@/components/feed/FeedCard";

interface Profile {
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  verified: boolean;
  rewards: number;
}

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

export const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    loadProfile();
    loadPosts();
    loadFollowStats();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select(`id, content_type, content_url, caption, created_at, user_id, profiles!inner (user_id, display_name, handle, avatar_url, verified)`)
        .eq("user_id", user.id)
        .eq("is_spark", false)
        .order("created_at", { ascending: false });

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
    }
  };

  const loadFollowStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);

      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);
    } catch (error) {
      console.error("Error loading follow stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-br from-primary to-accent relative">
        {profile.cover_url && <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile/edit")}
          className="absolute top-4 right-4 bg-background/50 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16">
        <div className="bg-card rounded-3xl p-6 shadow-lg">
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.handle}`}
            alt={profile.display_name}
            className="w-24 h-24 rounded-full border-4 border-background -mt-16 mb-4"
          />

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              <p className="text-muted-foreground">@{profile.handle}</p>
            </div>
          </div>

          {profile.bio && <p className="text-sm mb-4">{profile.bio}</p>}

          {/* Stats */}
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-xl font-bold">{posts.length}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="text-xl font-bold">{followersCount}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-xl font-bold">{followingCount}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div>
              <p className="text-xl font-bold text-accent">{profile.rewards.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Rewards</p>
            </div>
          </div>

          <Button onClick={() => navigate("/profile/edit")} className="w-full rounded-full">
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-6">
        <TabsList className="w-full px-4 grid grid-cols-2">
          <TabsTrigger value="posts">
            <Grid className="h-4 w-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Bookmark className="h-4 w-4 mr-2" />
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="px-4 space-y-0 mt-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            posts.map(post => <FeedCard key={post.id} post={post} onPostDeleted={(id) => setPosts(posts.filter(p => p.id !== id))} />)
          )}
        </TabsContent>

        <TabsContent value="saved" className="px-4 mt-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Saved posts coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
