import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, Send, MoreVertical, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

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
  stories: Story[];
}

interface StoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onStoryDeleted: () => void;
}

export const StoryViewer = ({ open, onOpenChange, storyGroups, initialGroupIndex, onStoryDeleted }: StoryViewerProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [comment, setComment] = useState("");
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const STORY_DURATION = 15000;
  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (open && currentStory) {
      recordView();
      loadLikes();
    }
  }, [open, currentStory?.id]);

  useEffect(() => {
    if (!open || paused || !currentStory) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const increment = 100 / (STORY_DURATION / 100);
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + increment;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, paused, currentStory, currentGroupIndex, currentStoryIndex]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const recordView = async () => {
    if (!currentStory || !currentUser) return;
    
    await supabase.from("story_views").insert({
      story_id: currentStory.id,
      user_id: currentUser.id,
    });
  };

  const loadLikes = async () => {
    if (!currentStory) return;

    const { count } = await supabase
      .from("story_likes")
      .select("*", { count: "exact", head: true })
      .eq("story_id", currentStory.id);

    setLikes(count || 0);

    if (currentUser) {
      const { data } = await supabase
        .from("story_likes")
        .select("id")
        .eq("story_id", currentStory.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      setHasLiked(!!data);
    }
  };

  const handleLike = async () => {
    if (!currentUser || !currentStory) return;

    if (hasLiked) {
      await supabase
        .from("story_likes")
        .delete()
        .eq("story_id", currentStory.id)
        .eq("user_id", currentUser.id);
      setLikes((prev) => prev - 1);
      setHasLiked(false);
    } else {
      await supabase.from("story_likes").insert({
        story_id: currentStory.id,
        user_id: currentUser.id,
      });
      setLikes((prev) => prev + 1);
      setHasLiked(true);
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !currentUser || !currentStory) return;

    await supabase.from("story_comments").insert({
      story_id: currentStory.id,
      user_id: currentUser.id,
      content: comment,
    });

    toast({ title: "Reply sent!", description: "Your message was sent" });
    setComment("");
  };

  const handleDelete = async () => {
    if (!currentStory) return;

    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", currentStory.id);

    if (error) {
      toast({ title: "Error", description: "Could not delete story", variant: "destructive" });
    } else {
      toast({ title: "Story deleted" });
      setShowDeleteDialog(false);
      onStoryDeleted();
      onOpenChange(false);
    }
  };

  const nextStory = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onOpenChange(false);
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  if (!currentGroup || !currentStory) return null;

  const isOwnStory = currentUser?.id === currentStory.user_id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md h-[90vh] p-0 bg-black border-none">
          <div className="relative h-full flex flex-col">
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
              {currentGroup.stories.map((_, idx) => (
                <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width: idx < currentStoryIndex ? "100%" : idx === currentStoryIndex ? `${progress}%` : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src={currentGroup.avatar_url || ""} />
                  <AvatarFallback>{currentGroup.display_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-sm font-semibold">{currentGroup.display_name}</p>
                  <p className="text-white/70 text-xs">
                    {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwnStory && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                        Delete Story
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Story content */}
            <div className="flex-1 flex items-center justify-center">
              <div
                className="absolute inset-0 flex"
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
              >
                <div className="flex-1" onClick={prevStory} />
                <div className="flex-1" onClick={nextStory} />
              </div>

              {currentStory.content_type === "image" ? (
                <img
                  src={currentStory.content_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={currentStory.content_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  loop
                  playsInline
                />
              )}

              {currentStory.caption && (
                <p className="absolute bottom-24 left-4 right-4 text-white text-sm">{currentStory.caption}</p>
              )}
            </div>

            {/* Bottom interaction bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Send message"
                  className="flex-1 bg-transparent border-white/30 text-white placeholder:text-white/50"
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                />
                <Button size="icon" variant="ghost" onClick={handleLike} className="text-white hover:bg-white/20">
                  <Heart className={`h-5 w-5 ${hasLiked ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                {likes > 0 && <span className="text-white text-sm">{likes}</span>}
                <Button size="icon" variant="ghost" onClick={handleComment} className="text-white hover:bg-white/20">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story?</AlertDialogTitle>
            <AlertDialogDescription>
              This story will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
