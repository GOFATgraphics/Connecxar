import { useState } from "react";
import { ArrowLeft, Camera, Image as ImageIcon, Video, Loader2, MapPin, Hash, Globe, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Composer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") === "story" ? "story" : searchParams.get("type") === "spark" ? "spark" : "post";

  const [contentType, setContentType] = useState<"post" | "story" | "spark">(initialType);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "friends" | "brand">("public");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (contentType === "spark" && !isVideo) {
      toast({ title: "Invalid file", description: "Sparks must be video files", variant: "destructive" });
      return;
    }

    if ((contentType === "post" || contentType === "story") && !isImage && !isVideo) {
      toast({ title: "Invalid file", description: "Please select an image or video", variant: "destructive" });
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Files must be under 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!caption.trim() && !selectedFile) {
      toast({ title: "Empty content", description: "Please add content", variant: "destructive" });
      return;
    }

    if ((contentType === "spark" || contentType === "story") && !selectedFile) {
      toast({ title: "Media required", description: `${contentType === "spark" ? "Sparks" : "Stories"} must include media`, variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not authenticated", description: "Please log in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      let fileUrl = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const bucket = contentType === "spark" ? "sparks" : contentType === "story" ? "posts" : "posts";

        const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, selectedFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        fileUrl = publicUrl;
      }

      // Handle story upload
      if (contentType === "story") {
        const { error: storyError } = await supabase.from("stories").insert({
          user_id: user.id,
          content_type: selectedFile?.type.startsWith("video/") ? "video" : "image",
          content_url: fileUrl,
          caption: caption.trim(),
        });

        if (storyError) throw storyError;

        toast({ title: "Success", description: "Your story has been posted!" });
        navigate("/home");
        return;
      }

      // Handle post/spark upload
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        content_type: contentType === "spark" ? "video" : (fileUrl ? (selectedFile?.type.startsWith("video/") ? "video" : "image") : "text"),
        content_url: fileUrl,
        caption: caption.trim(),
        is_spark: contentType === "spark",
      });

      if (postError) throw postError;

      toast({ title: "Success", description: `Your ${contentType} has been published!` });
      navigate(contentType === "spark" ? "/sparks" : "/home");
    } catch (error: any) {
      console.error("Error publishing:", error);
      toast({ title: "Error", description: error?.message || "Failed to publish", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const getButtonText = () => {
    if (uploading) return "Publishing...";
    if (contentType === "story") return "Post Story! 📸";
    if (contentType === "spark") return "Drop Spark! ⚡";
    return "Drop it! 🔥";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} disabled={uploading}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Create Post</h1>
        <Button variant="ghost" className="text-sm text-muted-foreground">
          Save Draft
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Content Type Selector */}
        <div>
          <h2 className="text-xl font-bold mb-4">What are you dropping today?</h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Post Card */}
            <button
              onClick={() => setContentType("post")}
              disabled={uploading}
              className={`p-4 rounded-2xl border-2 transition-all ${
                contentType === "post"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">📷</div>
                <div className="font-semibold text-sm">Post</div>
                <div className="text-xs text-muted-foreground text-center">Share a photo or video</div>
              </div>
            </button>

            {/* Story Card */}
            <button
              onClick={() => setContentType("story")}
              disabled={uploading}
              className={`p-4 rounded-2xl border-2 transition-all ${
                contentType === "story"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">📸</div>
                <div className="font-semibold text-sm">Story</div>
                <div className="text-xs text-muted-foreground text-center">24h ephemeral content</div>
              </div>
            </button>

            {/* Spark Card */}
            <button
              onClick={() => setContentType("spark")}
              disabled={uploading}
              className={`p-4 rounded-2xl border-2 transition-all ${
                contentType === "spark"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">📹</div>
                <div className="font-semibold text-sm">Spark</div>
                <div className="text-xs text-muted-foreground text-center">Short-form vertical video</div>
              </div>
            </button>
          </div>
        </div>

        {/* Media Upload Section */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Add Media</h3>
          {previewUrl ? (
            <div className="relative">
              {selectedFile?.type.startsWith("video/") ? (
                <video src={previewUrl} controls className="w-full aspect-video object-cover rounded-2xl" />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full aspect-square object-cover rounded-2xl" />
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setSelectedFile(null); setPreviewUrl(""); }}
                className="absolute top-2 right-2"
                disabled={uploading}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* Take Photo */}
              <label className="cursor-pointer">
                <div className="aspect-square bg-muted/50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">Take Photo</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {/* Record Video */}
              <label className="cursor-pointer">
                <div className="aspect-square bg-muted/50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
                  <Video className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">Record Video</span>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {/* Gallery */}
              <label className="cursor-pointer">
                <div className="aspect-square bg-muted/50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">Gallery</span>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        {/* Caption Section */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Caption</h3>
          <Textarea
            placeholder="Share what's on your mind... Use #hashtags and @mentions"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[120px] rounded-2xl border-border resize-none"
            maxLength={2200}
            disabled={uploading}
          />
          <div className="text-right text-xs text-muted-foreground mt-1">{caption.length}/2200</div>
        </div>

        {/* Location & Tags Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Location</span>
            </div>
            <Input
              placeholder="Add location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-2xl"
              disabled={uploading}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Tags</span>
            </div>
            <Input
              placeholder="#hashtags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="rounded-2xl"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Privacy Settings */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Who can see this?</h3>
          <div className="space-y-3">
            {/* Public Option */}
            <button
              onClick={() => setPrivacy("public")}
              disabled={uploading}
              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                privacy === "public"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/50"
              }`}
            >
              <Globe className="h-6 w-6 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Public</div>
                <div className="text-xs text-muted-foreground">Everyone can see</div>
              </div>
            </button>

            {/* Friends Option */}
            <button
              onClick={() => setPrivacy("friends")}
              disabled={uploading}
              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                privacy === "friends"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/50"
              }`}
            >
              <Users className="h-6 w-6 text-muted-foreground" />
              <div className="text-left">
                <div className="font-semibold">Friends</div>
                <div className="text-xs text-muted-foreground">Friends only</div>
              </div>
            </button>

            {/* Brand Only Option */}
            <button
              onClick={() => setPrivacy("brand")}
              disabled={uploading}
              className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                privacy === "brand"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/50"
              }`}
            >
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <div className="text-left">
                <div className="font-semibold">Brand Only</div>
                <div className="text-xs text-muted-foreground">Brand partners only</div>
              </div>
            </button>
          </div>
        </div>

        {/* Publish Button */}
        <Button
          onClick={handlePublish}
          className="w-full h-14 rounded-full text-lg font-bold"
          disabled={uploading || (!caption.trim() && !selectedFile)}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            getButtonText()
          )}
        </Button>
      </div>
    </div>
  );
};
