import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoryUpload } from "./StoryUpload";
import { StoryViewer } from "./StoryViewer";

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

export const StoriesBar = () => {
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

    setStoryGroups(Object.values(grouped));
  };

  const currentUserStories = storyGroups.find(g => g.user_id === currentUser?.id);
  const otherUserStories = storyGroups.filter(g => g.user_id !== currentUser?.id);

  const handleStoryClick = (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    setShowViewer(true);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 hide-scrollbar">
        {/* Your Story */}
        <button
          onClick={() => currentUserStories ? handleStoryClick(0) : setShowUpload(true)}
          className="flex flex-col items-center gap-2 min-w-[70px] flex-shrink-0"
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
            {!currentUserStories && (
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1 ring-2 ring-background">
                <Plus className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
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
            className="flex flex-col items-center gap-2 min-w-[70px] flex-shrink-0"
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
