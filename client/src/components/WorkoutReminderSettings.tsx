import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Bell, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReminderSettings {
  enableReminders: boolean;
  reminderTime: number; // minutes before workout
  useNotifications: boolean;
}

export default function WorkoutReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>({
    enableReminders: true,
    reminderTime: 30,
    useNotifications: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch current reminder settings when component mounts
  useEffect(() => {
    const fetchReminderSettings = async () => {
      try {
        const response = await apiRequest('GET', '/api/calendar/reminder-preferences');
        const data = await response.json();
        
        if (data.success) {
          setSettings({
            enableReminders: data.enableReminders ?? true,
            reminderTime: data.reminderTime ?? 30,
            useNotifications: data.useNotifications ?? true
          });
        }
      } catch (error) {
        console.error('Error fetching reminder settings:', error);
      }
    };

    fetchReminderSettings();
  }, []);

  // Save reminder settings
  const saveReminderSettings = async (newSettings: Partial<ReminderSettings>) => {
    setIsLoading(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      const response = await apiRequest('POST', '/api/calendar/reminder-preferences', updatedSettings);
      const data = await response.json();
      
      if (data.success) {
        setSettings(updatedSettings);
        toast({
          title: "Reminder settings updated",
          description: "Your workout reminder preferences have been saved.",
        });
      } else {
        toast({
          title: "Error",
          description: "Could not update reminder settings. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      toast({
        title: "Error",
        description: "Could not update reminder settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reminder time change
  const handleReminderTimeChange = (value: string) => {
    saveReminderSettings({ reminderTime: parseInt(value) });
  };

  // Handle enable/disable reminders
  const handleEnableReminders = (enabled: boolean) => {
    saveReminderSettings({ enableReminders: enabled });
  };

  // Handle enable/disable notifications
  const handleEnableNotifications = (enabled: boolean) => {
    saveReminderSettings({ useNotifications: enabled });
  };

  const reminderTimeOptions = [
    { value: "10", label: "10 minutes before" },
    { value: "15", label: "15 minutes before" },
    { value: "30", label: "30 minutes before" },
    { value: "60", label: "1 hour before" },
    { value: "120", label: "2 hours before" },
    { value: "1440", label: "1 day before" },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Workout Reminders
          </CardTitle>
          <CardDescription>
            Get notified about your upcoming workouts
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enable-reminders"
            checked={settings.enableReminders}
            onCheckedChange={handleEnableReminders}
            disabled={isLoading}
          />
          <Label 
            htmlFor="enable-reminders" 
            className={`text-sm ${settings.enableReminders ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            {settings.enableReminders ? 'Enabled' : 'Disabled'}
          </Label>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={`space-y-4 ${!settings.enableReminders ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reminder-time" className="text-sm">Reminder time</Label>
            <Select 
              value={settings.reminderTime.toString()} 
              onValueChange={handleReminderTimeChange}
              disabled={isLoading || !settings.enableReminders}
            >
              <SelectTrigger id="reminder-time" className="w-full">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <SelectValue placeholder="Select when to be reminded" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {reminderTimeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="use-notifications" className="text-sm">Use browser notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive popup notifications in your browser
              </p>
            </div>
            <Switch
              id="use-notifications"
              checked={settings.useNotifications}
              onCheckedChange={handleEnableNotifications}
              disabled={isLoading || !settings.enableReminders}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-3 mt-3">
        <div className="text-xs text-muted-foreground">
          {settings.enableReminders
            ? `Reminders will be sent ${reminderTimeOptions.find(o => o.value === settings.reminderTime.toString())?.label || ''}`
            : 'Reminders are currently disabled'}
        </div>
      </CardFooter>
    </Card>
  );
}