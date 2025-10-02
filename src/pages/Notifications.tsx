import { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, UserPlus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  actor_id?: string;
  post_id?: string;
  actor?: {
    display_name: string;
    avatar_url: string;
  };
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "like": return Heart;
    case "comment": return MessageCircle;
    case "follow": return UserPlus;
    case "post": return FileText;
    default: return Bell;
  }
};

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notificationsWithActors = await Promise.all(
        (data || []).map(async (notification) => {
          if (notification.actor_id) {
            const { data: actorData } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', notification.actor_id)
              .single();

            return { ...notification, actor: actorData };
          }
          return notification;
        })
      );

      setNotifications(notificationsWithActors as Notification[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => loadNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    await supabase.from('notifications').update({ read: true }).eq('id', notification.id);
    if (notification.post_id) navigate('/home');
    else if (notification.type === 'follow' && notification.actor_id) navigate(`/profile/${notification.actor_id}`);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    loadNotifications();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>Mark all read</Button>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const timeAgo = new Date(notification.created_at).toLocaleDateString();

            return (
              <Card
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${!notification.read ? "bg-accent/20" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={notification.actor?.avatar_url} />
                    <AvatarFallback><Icon className="h-4 w-4" /></AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${
                          notification.type === "like" ? "text-red-500" :
                          notification.type === "comment" ? "text-blue-500" :
                          notification.type === "follow" ? "text-green-500" :
                          notification.type === "post" ? "text-purple-500" : "text-muted-foreground"
                        }`} />
                        <p className="font-semibold text-sm">{notification.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
