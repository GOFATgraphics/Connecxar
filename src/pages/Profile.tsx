import { useState, useEffect } from "react";
import { Share2, MoreHorizontal, Grid3x3, Zap, Bookmark, Heart, MapPin, Globe, Check } from "lucide-react";
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
    <div className="pb-20 bg-background">
      {/* Cover Photo Section */}
      <div className="relative h-52">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-200 via-pink-100 to-blue-100" />
        )}
        
        {/* Share and Menu buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-xl bg-muted/80 backdrop-blur-sm hover:bg-muted"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            size="icon" 
            variant="secondary" 
            className="rounded-xl bg-muted/80 backdrop-blur-sm hover:bg-muted"
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
              className="w-32 h-32 rounded-full border-4 border-background"
            />
            {/* Emoji name tag */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
              ✨{profile.display_name.split(' ')[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-20 px-6">
        {/* Edit Profile Button */}
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => navigate("/profile/edit")} 
            variant="outline"
            className="rounded-full"
            size="sm"
          >
            Edit Profile
          </Button>
        </div>

        {/* Name and Username */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{profile.display_name} ✨</h1>
            {profile.verified && <VerifiedBadge className="w-6 h-6" />}
          </div>
          <p className="text-muted-foreground">@{profile.handle}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-4 text-sm whitespace-pre-wrap">
            {profile.bio}
          </div>
        )}

        {/* Location and Website */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-primary cursor-pointer">
            <Globe className="h-4 w-4" />
            <span>alexchen.dev</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between items-center mb-6 pb-6 border-b">
          <button className="flex flex-col items-center">
            <span className="text-xl font-bold">{formatNumber(postsCount)}</span>
            <span className="text-xs text-muted-foreground">Posts</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-xl font-bold">{formatNumber(sparksCount)}</span>
            <span className="text-xs text-muted-foreground">Sparks</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-xl font-bold">{formatNumber(followersCount)}</span>
            <span className="text-xs text-muted-foreground">Followers</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-xl font-bold">{formatNumber(followingCount)}</span>
            <span className="text-xs text-muted-foreground">Following</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-xl font-bold text-orange-500">{formatNumber(profile.rewards)}</span>
            <span className="text-xs text-muted-foreground">Rewards</span>
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              <span>Posts</span>
            </TabsTrigger>
            <TabsTrigger value="sparks" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Sparks</span>
            </TabsTrigger>
            <TabsTrigger value="pinned" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              <span>Pinned</span>
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Liked</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No posts yet</p>
                <Button onClick={() => navigate("/composer")} size="sm">
                  Create Post
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="aspect-square bg-muted rounded-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
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
                        <video 
                          src={post.content_url} 
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                        <span className="text-xs text-muted-foreground">Text Post</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sparks" className="mt-0">
            {sparks.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No Sparks yet</p>
                <Button onClick={() => navigate("/sparks")} size="sm">
                  Create Spark
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {sparks.map((spark) => (
                  <div 
                    key={spark.id} 
                    className="aspect-[9/16] bg-muted rounded-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate("/sparks")}
                  >
                    <video 
                      src={spark.video_url} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pinned" className="mt-0">
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Pinned posts coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="liked" className="mt-0">
            <div className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Liked posts coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
