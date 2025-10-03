import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Heart, MessageCircle, Send, Share2, MoreVertical, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Spark {
  id: string;
  user_id: string;
  content_url: string;
  caption: string;
  created_at: string;
  profiles: {
    display_name: string;
    handle: string;
    avatar_url: string;
    verified: boolean;
  };
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  user_liked?: boolean;
}

export const Sparks = () => {
  const navigate = useNavigate();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<"sparks" | "following">("sparks");
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    loadSparks();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadSparks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id, user_id, content_url, caption, created_at, 
          profiles!inner (display_name, handle, avatar_url, verified)
        `)
        .eq("is_spark", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Load engagement counts for each spark
      const sparksWithEngagement = await Promise.all(
        (data || []).map(async (spark) => {
          const [likesData, commentsData, userLikeData] = await Promise.all([
            supabase.from("likes").select("id", { count: "exact" }).eq("post_id", spark.id),
            supabase.from("comments").select("id", { count: "exact" }).eq("post_id", spark.id),
            user ? supabase.from("likes").select("id").eq("post_id", spark.id).eq("user_id", user.id).single() : null
          ]);

          return {
            ...spark,
            likes_count: likesData.count || 0,
            comments_count: commentsData.count || 0,
            shares_count: 0,
            user_liked: !!userLikeData?.data
          };
        })
      );

      setSparks(sparksWithEngagement);
    } catch (error) {
      console.error("Error loading sparks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < sparks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPaused(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPaused(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isSwipe = Math.abs(distance) > 50;

    if (isSwipe) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleDoubleTap = async () => {
    await handleLike();
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please sign in to like");
      return;
    }

    const spark = sparks[currentIndex];
    const isLiked = spark.user_liked;

    try {
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", spark.id)
          .eq("user_id", currentUser.id);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: spark.id, user_id: currentUser.id });
      }

      setSparks(prev => prev.map((s, idx) => 
        idx === currentIndex 
          ? { 
              ...s, 
              user_liked: !isLiked,
              likes_count: isLiked ? (s.likes_count || 0) - 1 : (s.likes_count || 0) + 1
            }
          : s
      ));
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to like");
    }
  };

  const handleComment = () => {
    toast.info("Comments coming soon!");
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Check out this Spark!",
        url: window.location.href
      });
    } catch (error) {
      toast.info("Share feature coming soon!");
    }
  };

  const formatCount = (count: number = 0) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (sparks.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-2xl font-bold mb-4">No Sparks Yet</h2>
        <p className="text-white/60 mb-6 text-center">Be the first to create a spark!</p>
        <Button onClick={() => navigate("/composer?type=spark")} className="rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          Create Spark
        </Button>
      </div>
    );
  }

  const currentSpark = sparks[currentIndex];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("sparks")}
              className={`text-lg font-semibold transition-colors ${
                activeTab === "sparks" ? "text-white" : "text-white/50"
              }`}
            >
              Sparks
              {activeTab === "sparks" && (
                <div className="h-0.5 bg-white mt-1 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`text-lg font-semibold transition-colors ${
                activeTab === "following" ? "text-white" : "text-white/50"
              }`}
            >
              Following
              {activeTab === "following" && (
                <div className="h-0.5 bg-white mt-1 rounded-full" />
              )}
            </button>
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigate("/composer?type=spark")} className="text-white hover:bg-white/10">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video Container */}
      <div 
        className="h-screen w-full relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          key={currentSpark.id}
          src={currentSpark.content_url}
          className="w-full h-full object-cover"
          autoPlay
          loop
          playsInline
          muted={isMuted}
          onClick={handleVideoClick}
          onDoubleClick={handleDoubleTap}
        />

        {/* Right Side Action Buttons */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6 z-40">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <Heart 
                className={`h-7 w-7 transition-all ${
                  currentSpark.user_liked 
                    ? "fill-red-500 text-red-500 scale-110" 
                    : "text-white"
                }`}
              />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(currentSpark.likes_count)}
            </span>
          </button>

          {/* Comment Button */}
          <button
            onClick={handleComment}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(currentSpark.comments_count)}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <Share2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium">
              {formatCount(currentSpark.shares_count)}
            </span>
          </button>

          {/* Send/DM Button */}
          <button
            onClick={() => toast.info("DM feature coming soon!")}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <Send className="h-7 w-7 text-white" />
            </div>
          </button>

          {/* More Options */}
          <button
            onClick={() => toast.info("More options coming soon!")}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
              <MoreVertical className="h-6 w-6 text-white" />
            </div>
          </button>
        </div>

        {/* Mute/Unmute Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-20 right-3 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors z-40"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-white" />
          ) : (
            <Volume2 className="h-5 w-5 text-white" />
          )}
        </button>

        {/* Bottom User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-30">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-12 h-12 ring-2 ring-white">
              <AvatarImage 
                src={currentSpark.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentSpark.user_id}`}
                alt={currentSpark.profiles.display_name}
              />
              <AvatarFallback>{currentSpark.profiles.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white">@{currentSpark.profiles.handle}</p>
                {currentSpark.user_id !== currentUser?.id && (
                  <button className="px-4 py-1 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors">
                    Follow
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {currentSpark.caption && (
            <p className="text-white text-sm mb-2 line-clamp-2">
              {currentSpark.caption}
            </p>
          )}

          <div className="flex items-center gap-2 text-white/60 text-xs">
            <span>🎵 Original audio</span>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1 z-20">
          {sparks.map((_, index) => (
            <div
              key={index}
              className={`h-0.5 rounded-full transition-all ${
                index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
