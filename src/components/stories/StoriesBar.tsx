import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoryUpload } from "./StoryUpload";
import { StoryViewer } from "./StoryViewer";
import { useNavigate } from "react-router-dom";

interface Story {
  id: string;
  user_id: string;
  content_url: string;
  content_type: string;
  caption: string | null;
  created_at: string;
}

interface StoryGroup {
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
  stories: Story[];
  hasViewed: boolean;
}

// Mock stories for demonstration
const MOCK_STORIES: StoryGroup[] = [
  {
    user_id: "mock-1",
    display_name: "Sarah Chen",
    handle: "sarahchen",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    verified: true,
    stories: [
      {
        id: "mock-s1",
        user_id: "mock-1",
        content_url: "https://images.unsplash.com/photo-1502139214982-d0ad755818d8?w=800",
        content_type: "image",
        caption: "Beautiful sunset today! 🌅",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: false,
  },
  {
    user_id: "mock-2",
    display_name: "Alex Rivera",
    handle: "alexrivera",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    verified: false,
    stories: [
      {
        id: "mock-s2",
        user_id: "mock-2",
        content_url: "https://images.unsplash.com/photo-1542332213-31f87348057f?w=800",
        content_type: "image",
        caption: "Coffee vibes ☕",
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: false,
  },
  {
    user_id: "mock-3",
    display_name: "Jamie Park",
    handle: "jamiepark",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie",
    verified: true,
    stories: [
      {
        id: "mock-s3",
        user_id: "mock-3",
        content_url: "https://images.unsplash.com/photo-1551404973-761c83935da3?w=800",
        content_type: "image",
        caption: "City lights ✨",
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: false,
  },
  {
    user_id: "mock-4",
    display_name: "Morgan Lee",
    handle: "morganlee",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan",
    verified: false,
    stories: [
      {
        id: "mock-s4",
        user_id: "mock-4",
        content_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800",
        content_type: "image",
        caption: "Beach day! 🏖️",
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: false,
  },
  {
    user_id: "mock-5",
    display_name: "Taylor Swift",
    handle: "taylorswift",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor",
    verified: true,
    stories: [
      {
        id: "mock-s5",
        user_id: "mock-5",
        content_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800",
        content_type: "image",
        caption: "Concert vibes 🎵",
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: true,
  },
  {
    user_id: "mock-6",
    display_name: "Chris Evans",
    handle: "chrisevans",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chris",
    verified: true,
    stories: [
      {
        id: "mock-s6",
        user_id: "mock-6",
        content_url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800",
        content_type: "image",
        caption: "Workout time! 💪",
        created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: true,
  },
  {
    user_id: "mock-7",
    display_name: "Emma Stone",
    handle: "emmastone",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    verified: true,
    stories: [
      {
        id: "mock-s7",
        user_id: "mock-7",
        content_url: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=800",
        content_type: "image",
        caption: "Nature walk 🌲",
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: false,
  },
  {
    user_id: "mock-8",
    display_name: "Ryan Reynolds",
    handle: "ryanreynolds",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan",
    verified: true,
    stories: [
      {
        id: "mock-s8",
        user_id: "mock-8",
        content_url: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=800",
        content_type: "image",
        caption: "Movie night 🎬",
        created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
      },
    ],
    hasViewed: false,
  },
];

export const StoriesBar = () => {
  const navigate = useNavigate();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  useEffect(() => {
    loadCurrentUser();
    loadStories();

    const channel = supabase
      .channel("stories_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => loadStories())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadStories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("stories")
      .select(`id, user_id, content_url, content_type, caption, created_at, profiles!stories_user_id_fkey (user_id, display_name, handle, avatar_url, verified)`)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading stories:", error);
      return;
    }

    // Get story views
    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("user_id", user.id);

    const viewedStoryIds = new Set(views?.map(v => v.story_id) || []);

    const grouped = data.reduce((acc: Record<string, StoryGroup>, story: any) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          display_name: story.profiles.display_name,
          handle: story.profiles.handle,
          avatar_url: story.profiles.avatar_url,
          verified: story.profiles.verified,
          stories: [],
          hasViewed: false,
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    // Check if all stories in a group have been viewed
    Object.values(grouped).forEach((group) => {
      group.hasViewed = group.stories.every((s) => viewedStoryIds.has(s.id));
    });

    const realStories = Object.values(grouped);
    
    // Add mock stories to demonstrate scrolling (only if there are fewer than 5 real stories)
    const allStories = realStories.length < 5 ? [...realStories, ...MOCK_STORIES] : realStories;
    
    setStoryGroups(allStories);
  };

  const currentUserStories = storyGroups.find(g => g.user_id === currentUser?.id);
  const otherUserStories = storyGroups.filter(g => g.user_id !== currentUser?.id);

  const handleStoryClick = (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setShowViewer(true);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 hide-scrollbar snap-x snap-mandatory scroll-smooth">
        {/* Your Story */}
        <button
          onClick={() => currentUserStories ? handleStoryClick(0) : navigate("/composer?type=story")}
          className="flex flex-col items-center gap-2 min-w-[70px] flex-shrink-0 snap-center"
        >
          <div className="relative w-[70px] h-[70px]">
            <div className={`absolute inset-0 rounded-full p-[3px] ${
              currentUserStories && !currentUserStories.hasViewed
                ? "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                : "bg-border"
            }`}>
              <div className="w-full h-full rounded-full p-[2px] bg-background">
                <Avatar className="w-full h-full">
                  <AvatarImage src={currentUserStories?.avatar_url || currentUser?.user_metadata?.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {currentUserStories?.display_name?.[0] || currentUser?.email?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            {/* Blue + icon overlay - always visible on Your Story */}
            <div className="absolute bottom-0 right-0 bg-[#4F46E5] rounded-full p-1 ring-[3px] ring-background">
              <Plus className="h-4 w-4 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-xs text-center truncate w-full max-w-[70px]">
            {currentUserStories ? "Your Story" : "Add Story"}
          </span>
        </button>

        {/* Other Users' Stories */}
        {otherUserStories.map((group, index) => (
          <button
            key={group.user_id}
            onClick={() => handleStoryClick(currentUserStories ? index + 1 : index)}
            className="flex flex-col items-center gap-2 min-w-[70px] flex-shrink-0 snap-center"
          >
            <div className="relative w-[70px] h-[70px]">
              <div className={`absolute inset-0 rounded-full p-[3px] ${
                group.hasViewed
                  ? "bg-border"
                  : "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
              }`}>
                <div className="w-full h-full rounded-full p-[2px] bg-background">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={group.avatar_url || ""} />
                    <AvatarFallback className="text-lg">{group.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
            <span className="text-xs text-center truncate w-full max-w-[70px]">{group.display_name}</span>
          </button>
        ))}
      </div>

      <StoryUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={loadStories}
      />

      {showViewer && (
        <StoryViewer
          open={showViewer}
          onOpenChange={setShowViewer}
          storyGroups={[currentUserStories, ...otherUserStories].filter(Boolean) as StoryGroup[]}
          initialGroupIndex={selectedGroupIndex}
          onStoryDeleted={loadStories}
        />
      )}
    </>
  );
};
