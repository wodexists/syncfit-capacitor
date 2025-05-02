import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Clock, Bell, Check, RotateCw } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function WorkoutReminderSettings() {
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [enableRecurring, setEnableRecurring] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch user preferences
  const { data: preferences, isLoading, error } = useQuery<any>({
    queryKey: ['/api/user-preferences'],
    refetchOnWindowFocus: false,
  });

  // Mutation to save reminder preferences
  const reminderMutation = useMutation({
    mutationFn: (minutes: number) => {
      return apiRequest('/api/calendar/reminder-preferences', 'POST', { reminderMinutes: minutes });
    },
    onSuccess: () => {
      toast({
        title: "Reminder preferences saved",
        description: `You'll be reminded ${reminderMinutes} minutes before your workouts`,
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: "There was a problem saving your reminder preferences",
        variant: "destructive",
      });
      console.error('Error saving reminder preferences:', error);
    }
  });

  // Mutation to save recurring workout preferences
  const recurringMutation = useMutation({
    mutationFn: (enableRecurring: boolean) => {
      return apiRequest('/api/user-preferences', 'POST', { enableRecurring });
    },
    onSuccess: () => {
      toast({
        title: "Recurring workout preferences saved",
        description: enableRecurring 
          ? "Recurring workout feature has been enabled" 
          : "Recurring workout feature has been disabled",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: "There was a problem saving your recurring workout preferences",
        variant: "destructive",
      });
      console.error('Error saving recurring preferences:', error);
    }
  });

  // Initialize values from fetched preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.reminderMinutes !== undefined) {
        setReminderMinutes(preferences.reminderMinutes);
      }
      
      if (preferences.enableRecurring !== undefined) {
        setEnableRecurring(preferences.enableRecurring);
      }
    }
  }, [preferences]);

  const handleSaveReminder = () => {
    reminderMutation.mutate(reminderMinutes);
  };

  const handleSaveRecurring = () => {
    recurringMutation.mutate(enableRecurring);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading your preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Workout Reminders
          </CardTitle>
          <CardDescription>
            Choose how many minutes before your workout to receive a reminder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Reminder time: {reminderMinutes} minutes before</Label>
                <span className="text-sm text-muted-foreground">
                  <Clock className="inline-block mr-1 h-3 w-3" /> 
                  {reminderMinutes === 0 ? 'At start time' : `${reminderMinutes} min${reminderMinutes !== 1 ? 's' : ''}`}
                </span>
              </div>
              <Slider 
                value={[reminderMinutes]} 
                min={0} 
                max={60} 
                step={5}
                onValueChange={(vals) => setReminderMinutes(vals[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 min</span>
                <span>15 min</span>
                <span>30 min</span>
                <span>45 min</span>
                <span>60 min</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={handleSaveReminder}
                disabled={reminderMutation.isPending}
                className="flex items-center"
              >
                {reminderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <RotateCw className="mr-2 h-5 w-5" />
            Recurring Workouts
          </CardTitle>
          <CardDescription>
            Enable the ability to schedule workouts on a recurring basis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recurring-toggle">Enable recurring workouts</Label>
                <p className="text-sm text-muted-foreground">
                  Schedule your workouts on a daily or weekly basis
                </p>
              </div>
              <Switch
                id="recurring-toggle"
                checked={enableRecurring}
                onCheckedChange={setEnableRecurring}
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-end">
              <Button
                onClick={handleSaveRecurring}
                disabled={recurringMutation.isPending}
                className="flex items-center"
              >
                {recurringMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}