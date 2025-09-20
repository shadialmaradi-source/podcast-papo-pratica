import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Trophy, Calendar, Target, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  data?: any;
  created_at: string;
  sent_at?: string;
  status: string;
}

interface NotificationPreferences {
  email_daily_reminders: boolean;
  email_weekly_recaps: boolean;
  email_leaderboard_alerts: boolean;
  in_app_notifications: boolean;
}

export function NotificationsCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_daily_reminders: true,
    email_weekly_recaps: true,
    email_leaderboard_alerts: true,
    in_app_notifications: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadPreferences();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    }
  };

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPreferences(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoading(false);
    }
  };

  const updatePreferences = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      const newPreferences = { ...preferences, [key]: value };
      
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user?.id,
          ...newPreferences
        });

      if (error) throw error;
      
      setPreferences(newPreferences);
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'daily_reminder':
        return <Target className="h-4 w-4" />;
      case 'weekly_recap':
        return <Calendar className="h-4 w-4" />;
      case 'leaderboard_alert':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'daily_reminder':
        return <Badge variant="secondary">Daily</Badge>;
      case 'weekly_recap':
        return <Badge variant="outline">Weekly</Badge>;
      case 'leaderboard_alert':
        return <Badge variant="default">Leaderboard</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-6">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Notifications</h2>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  You'll see daily reminders, weekly recaps, and leaderboard updates here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card key={notification.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-primary/10 rounded-full">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{notification.title}</h4>
                            {getNotificationBadge(notification.type)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Daily Reminder Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Get email reminders when you haven't practiced in 24 hours
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_daily_reminders}
                    onCheckedChange={(value) => updatePreferences('email_daily_reminders', value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Weekly Recap Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly summaries of your progress every Sunday
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_weekly_recaps}
                    onCheckedChange={(value) => updatePreferences('email_weekly_recaps', value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Leaderboard Alert Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're close to passing someone on the leaderboard
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_leaderboard_alerts}
                    onCheckedChange={(value) => updatePreferences('email_leaderboard_alerts', value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications in the app interface
                    </p>
                  </div>
                  <Switch
                    checked={preferences.in_app_notifications}
                    onCheckedChange={(value) => updatePreferences('in_app_notifications', value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}