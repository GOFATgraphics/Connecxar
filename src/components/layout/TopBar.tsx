import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MessageCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case "/":
    case "/home":
      return "Connexar";
    case "/discover":
      return "Discover";
    case "/sparks":
      return "Sparks";
    case "/profile":
      return "Profile";
    case "/messages":
      return "Messages";
    case "/notifications":
      return "Notifications";
    default:
      if (pathname.startsWith("/profile/")) return "Profile";
      return "Connexar";
  }
};

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const showBackButton = !["/", "/home", "/discover", "/sparks", "/profile"].includes(location.pathname);
  const title = getPageTitle(location.pathname);

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to real-time notification changes
    const channel = supabase
      .channel('notifications-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto">
        {showBackButton ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div />
        )}

        <h1 className="text-lg font-bold">{title}</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
            className="touch-target"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notifications")}
            className="touch-target relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};
