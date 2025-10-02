import { useState, useEffect } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
}

export const Sparks = () => {
  const navigate = useNavigate();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSparks();
  }, []);

  const loadSparks = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`id, user_id, content_url, caption, created_at, profiles!inner (display_name, handle, avatar_url, verified)`)
        .eq("is_spark", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSparks(data || []);
    } catch (error) {
      console.error("Error loading sparks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < sparks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
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
        <p className="text-muted-foreground mb-6 text-center">Be the first to create a spark!</p>
        <Button onClick={() => navigate("/composer?type=spark")} className="rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          Create Spark
        </Button>
      </div>
    );
  }

  const currentSpark = sparks[currentIndex];

  return (
    <div className="min-h-screen bg-black relative">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate("/composer?type=spark")} className="text-white">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="h-screen w-full flex items-center justify-center">
        <div className="w-full max-w-md aspect-[9/16] relative">
          <video
            key={currentSpark.id}
            src={currentSpark.content_url}
            className="w-full h-full object-cover rounded-2xl"
            controls
            autoPlay
            loop
            playsInline
          />

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent text-white">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={currentSpark.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentSpark.user_id}`}
                alt={currentSpark.profiles.display_name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
              />
              <div>
                <p className="font-semibold">{currentSpark.profiles.display_name}</p>
                <p className="text-sm text-white/80">@{currentSpark.profiles.handle}</p>
              </div>
            </div>
            <p className="text-sm">{currentSpark.caption}</p>
          </div>

          {currentIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70"
            >
              ←
            </button>
          )}
          {currentIndex < sparks.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70"
            >
              →
            </button>
          )}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
        {sparks.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all ${index === currentIndex ? 'w-8 bg-white' : 'w-1 bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
};
