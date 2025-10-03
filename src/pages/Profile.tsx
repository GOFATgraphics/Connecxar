import { useState, useEffect } from "react";
import { Share2, MoreHorizontal, Grid3x3, Zap, Bookmark, Heart, MapPin, Globe, Camera, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/ui/verified-badge";

interface Profile {
  display_name: string;
  handle: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  verified: boolean;
  rewards: number;
  location: string | null;
}

interface Post {
  id: string;
  content_url: string | null;
  content_type: string;
  created_at: string;
}

interface Spark {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [sparksCount, setSparksCount] = useState(0);

  useEffect(() => {
    loadProfile();
    loadPosts();
    loadSparks();
    loadFollowStats();
    loadCounts();

    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('profile-posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadPosts();
        loadSparks();
        loadCounts();
      })
      .subscribe();

    const followsChannel = supabase
      .channel('profile-follows-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
        loadFollowStats();
      })
      .subscribe();

    const likesChannel = supabase
      .channel('profile-likes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(likesChannel);
    };
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

  const loadCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_spark", false);

      const { count: sparksCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_spark", true);

      setPostsCount(postsCount || 0);
      setSparksCount(sparksCount || 0);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, content_url, content_type, created_at")
        .eq("user_id", user.id)
        .eq("is_spark", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const loadSparks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("posts")
        .select("id, content_url, caption, created_at")
        .eq("user_id", user.id)
        .eq("is_spark", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformedSparks: Spark[] = (data || []).map((spark: any) => ({
        id: spark.id,
        video_url: spark.content_url,
        thumbnail_url: null,
        created_at: spark.created_at,
      }));

      setSparks(transformedSparks);
    } catch (error) {
      console.error("Error loading sparks:", error);
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
    <div className="pb-20 bg-background min-h-screen">
      {/* Cover Photo Section */}
      <div className="relative h-56">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-100 via-pink-50 to-blue-50" />
        )}
        
        {/* Share and Menu buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg"
            onClick={() => navigate("/profile/edit")}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-6">
          <div className="relative">
            <img
              src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.handle}`}
              alt={profile.display_name}
              className="w-32 h-32 rounded-full border-4 border-background object-cover"
            />
            {/* Camera icon for edit */}
            <button 
              onClick={() => navigate("/profile/edit")}
              className="absolute bottom-1 right-1 bg-background rounded-full p-2 shadow-lg hover:bg-muted transition-colors"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-20 px-6">
        {/* Edit Profile Button */}
        <div className="flex justify-end mb-6">
          <Button 
            onClick={() => navigate("/profile/edit")} 
            variant="outline"
            className="rounded-full px-6 font-semibold"
            size="sm"
          >
            Edit Profile
          </Button>
        </div>

        {/* Name and Username */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            {profile.verified && <VerifiedBadge size="lg" />}
          </div>
          <p className="text-muted-foreground text-sm">@{profile.handle}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-5 text-sm leading-relaxed">
            {profile.bio}
          </div>
        )}

        {/* Location and Website */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          <a 
            href="https://alexchen.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Globe className="h-4 w-4" />
            <span>alexchen.dev</span>
          </a>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-1 mb-8 pb-6 border-b">
          <button className="flex flex-col items-center hover:bg-muted/50 rounded-lg py-3 transition-colors">
            <span className="text-xl font-bold">{formatNumber(postsCount)}</span>
            <span className="text-xs text-muted-foreground mt-1">Posts</span>
          </button>
          <button className="flex flex-col items-center hover:bg-muted/50 rounded-lg py-3 transition-colors">
            <span className="text-xl font-bold">{formatNumber(sparksCount)}</span>
            <span className="text-xs text-muted-foreground mt-1">Sparks</span>
          </button>
          <button className="flex flex-col items-center hover:bg-muted/50 rounded-lg py-3 transition-colors">
            <span className="text-xl font-bold">{formatNumber(followersCount)}</span>
            <span className="text-xs text-muted-foreground mt-1">Followers</span>
          </button>
          <button className="flex flex-col items-center hover:bg-muted/50 rounded-lg py-3 transition-colors">
            <span className="text-xl font-bold">{formatNumber(followingCount)}</span>
            <span className="text-xs text-muted-foreground mt-1">Following</span>
          </button>
          <button className="flex flex-col items-center hover:bg-muted/50 rounded-lg py-3 transition-colors">
            <span className="text-xl font-bold text-primary">{formatNumber(profile.rewards)}</span>
            <span className="text-xs text-muted-foreground mt-1">Rewards</span>
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6 bg-muted/30">
            <TabsTrigger value="posts" className="data-[state=active]:bg-background">
              <Grid3x3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="sparks" className="data-[state=active]:bg-background">
              <Zap className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="pinned" className="data-[state=active]:bg-background">
              <Bookmark className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="liked" className="data-[state=active]:bg-background">
              <Heart className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            {posts.length === 0 ? (
              <div className="text-center py-16">
                <Grid3x3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-semibold mb-2">No posts yet</p>
                <p className="text-sm text-muted-foreground mb-6">Share your first post with the world</p>
                <Button onClick={() => navigate("/composer")} size="sm" className="rounded-full">
                  Create Post
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="aspect-square bg-muted overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                    onClick={() => navigate("/")}
                  >
                    {post.content_url ? (
                      post.content_type === "image" ? (
                        <img 
                          src={post.content_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video 
                            src={post.content_url} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="h-8 w-8 text-white" fill="white" />
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                        <span className="text-xs text-muted-foreground px-2 text-center">Text</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sparks" className="mt-0">
            {sparks.length === 0 ? (
              <div className="text-center py-16">
                <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-semibold mb-2">No Sparks yet</p>
                <p className="text-sm text-muted-foreground mb-6">Create short videos to engage your audience</p>
                <Button onClick={() => navigate("/sparks")} size="sm" className="rounded-full">
                  Create Spark
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {sparks.map((spark) => (
                  <div 
                    key={spark.id} 
                    className="aspect-[9/16] bg-muted overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                    onClick={() => navigate("/sparks")}
                  >
                    <video 
                      src={spark.video_url} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-10 w-10 text-white" fill="white" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pinned" className="mt-0">
            <div className="text-center py-16">
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold mb-2">No pinned posts</p>
              <p className="text-sm text-muted-foreground">Pin your favorite posts to showcase them here</p>
            </div>
          </TabsContent>

          <TabsContent value="liked" className="mt-0">
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold mb-2">No liked posts yet</p>
              <p className="text-sm text-muted-foreground">Posts you like will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
