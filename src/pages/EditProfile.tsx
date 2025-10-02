import { useState, useEffect } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  useEffect(() => {
    loadProfile();
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

      if (data) {
        setDisplayName(data.display_name || "");
        setHandle(data.handle || "");
        setBio(data.bio || "");
        setLocation(data.location || "");
        setAvatarUrl(data.avatar_url || "");
        setCoverUrl(data.cover_url || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          handle: handle,
          bio: bio,
          location: location,
          avatar_url: avatarUrl,
          cover_url: coverUrl,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });

      navigate("/profile");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Edit Profile</h1>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Cover Image */}
        <div>
          <Label>Cover Photo</Label>
          <div className="relative h-48 bg-muted rounded-xl overflow-hidden mt-2">
            {coverUrl && <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />}
            <button className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-full">
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div>
          <Label>Profile Picture</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="relative">
              <img
                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}`}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
              <button className="absolute bottom-0 right-0 bg-background/80 backdrop-blur-sm p-2 rounded-full">
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mt-2"
          />
        </div>

        {/* Handle */}
        <div>
          <Label htmlFor="handle">Handle</Label>
          <Input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="username"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">@{handle}</p>
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="mt-2 min-h-[100px]"
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground mt-1">{bio.length}/160</p>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            className="mt-2"
          />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>
    </div>
  );
};
