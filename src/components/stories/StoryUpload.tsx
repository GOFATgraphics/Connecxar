import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface StoryUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const StoryUpload = ({ open, onOpenChange, onSuccess }: StoryUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith("image/");
    const isVideo = selectedFile.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const bucket = file.type.startsWith("image/") ? "posts" : "sparks";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          content_url: publicUrl,
          content_type: file.type.startsWith("image/") ? "image" : "video",
          caption: caption || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "Story posted!",
        description: "Your story is now live",
      });

      setFile(null);
      setPreview("");
      setCaption("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error uploading story:", error);
      toast({
        title: "Upload failed",
        description: "Could not post your story",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
              <Upload className="h-12 w-12 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Upload image or video</span>
              <Input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              {file?.type.startsWith("image/") ? (
                <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
              ) : (
                <video src={preview} className="w-full h-64 object-cover rounded-lg" controls />
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {preview && (
            <>
              <Textarea
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none"
                rows={3}
              />
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? "Posting..." : "Post Story"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
