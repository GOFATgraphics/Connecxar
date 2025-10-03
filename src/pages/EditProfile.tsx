import { useState, useEffect } from "react";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
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
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

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
        setWebsite("");
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast({ title: "Avatar uploaded successfully" });
    } catch (error: any) {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/cover-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      setCoverUrl(publicUrl);
      toast({ title: "Cover photo uploaded successfully" });
    } catch (error: any) {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) return;
    
    setCheckingUsername(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("handle")
        .eq("handle", username)
        .neq("user_id", user?.id || "")
        .maybeSingle();

      if (data) {
        toast({
          title: "Username taken",
          description: "This username is already in use",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setCheckingUsername(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg">Edit Profile</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Cover Photo Upload */}
        <div className="relative h-48 bg-gradient-to-br from-purple-100 via-pink-50 to-blue-50">
          {coverUrl && (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          )}
          {uploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
          <label className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm p-2.5 rounded-full cursor-pointer hover:bg-background shadow-lg transition-colors">
            <Camera className="h-5 w-5" />
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleCoverUpload}
              disabled={uploadingCover}
            />
          </label>
          {coverUrl && (
            <button 
              onClick={() => setCoverUrl("")}
              className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm p-2.5 rounded-full hover:bg-background shadow-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Profile Picture Upload */}
        <div className="px-6 -mt-16">
          <div className="relative inline-block">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${handle}`}
              alt=""
              className="w-32 h-32 rounded-full border-4 border-background object-cover"
            />
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            <label className="absolute bottom-1 right-1 bg-background p-2 rounded-full cursor-pointer hover:bg-muted shadow-lg transition-colors">
              <Camera className="h-4 w-4" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className="px-6 space-y-6 pt-4">

          {/* Display Name */}
          <div>
            <Label htmlFor="display-name" className="text-sm font-medium">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="mt-2"
            />
          </div>

          {/* Username */}
          <div>
            <Label htmlFor="handle" className="text-sm font-medium">Username</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => {
                  const newHandle = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setHandle(newHandle);
                }}
                onBlur={() => checkUsernameAvailability(handle)}
                placeholder="username"
                className="pl-7"
              />
              {checkingUsername && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Choose a unique username (letters, numbers, and underscores only)
            </p>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 160) {
                  setBio(e.target.value);
                }
              }}
              placeholder="Tell us about yourself... ✨"
              className="mt-2 min-h-[100px] resize-none"
              maxLength={160}
            />
            <div className="flex justify-between items-center mt-1.5">
              <p className="text-xs text-muted-foreground">Add emojis, line breaks, and more</p>
              <p className={`text-xs font-medium ${bio.length >= 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {bio.length}/160
              </p>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-sm font-medium">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="mt-2"
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website" className="text-sm font-medium">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              type="url"
              className="mt-2"
            />
          </div>
        </div>

        {/* Save Button - Full Width at Bottom */}
        <div className="sticky bottom-0 bg-background border-t p-6">
          <Button 
            onClick={handleSave} 
            className="w-full rounded-full h-12 font-semibold text-base" 
            disabled={loading || uploadingAvatar || uploadingCover}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
