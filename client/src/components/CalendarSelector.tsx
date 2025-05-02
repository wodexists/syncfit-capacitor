import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, Check } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export default function CalendarSelector() {
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch available calendars
  const { data: calendars, isLoading, error } = useQuery({
    queryKey: ['/api/calendar/calendars'],
    refetchOnWindowFocus: false,
  });

  // Mutation to save selected calendars
  const saveMutation = useMutation({
    mutationFn: (calendarIds: string[]) => {
      return apiRequest('/api/calendar/selected-calendars', {
        method: 'POST',
        body: { calendarIds }
      });
    },
    onSuccess: () => {
      toast({
        title: "Calendar preferences saved",
        description: "Your calendar selection has been updated",
        variant: "default",
      });
      
      // Invalidate calendar-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/calendars'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/available-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/today-availability'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving preferences",
        description: "There was a problem saving your calendar preferences",
        variant: "destructive",
      });
      console.error('Error saving calendar preferences:', error);
    }
  });

  // Initialize selected calendars from fetched data
  useEffect(() => {
    if (calendars && calendars.length > 0) {
      const initialSelected = calendars
        .filter((cal: Calendar) => cal.selected)
        .map((cal: Calendar) => cal.id);
      
      setSelectedCalendars(initialSelected);
    }
  }, [calendars]);

  const handleCalendarToggle = (calendarId: string, checked: boolean) => {
    setSelectedCalendars(prev => {
      if (checked) {
        return [...prev, calendarId];
      } else {
        return prev.filter(id => id !== calendarId);
      }
    });
  };

  const handleSave = () => {
    saveMutation.mutate(selectedCalendars);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading your calendars...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Failed to load your calendars. Please make sure you have granted calendar access.</p>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5" />
          Calendar Selection
        </CardTitle>
        <CardDescription>
          Choose which calendars to consider when finding available workout times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calendars && calendars.length > 0 ? (
            <div className="grid gap-3">
              {calendars.map((calendar: Calendar) => (
                <div 
                  key={calendar.id}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted"
                >
                  <Checkbox 
                    id={`calendar-${calendar.id}`}
                    checked={selectedCalendars.includes(calendar.id)}
                    onCheckedChange={(checked) => 
                      handleCalendarToggle(calendar.id, checked as boolean)
                    }
                    disabled={calendar.primary}
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: calendar.backgroundColor || '#4285F4' }}
                  />
                  <Label 
                    htmlFor={`calendar-${calendar.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    {calendar.summary}
                    {calendar.primary && <span className="ml-2 text-xs text-muted-foreground">(Primary)</span>}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No calendars found</p>
          )}
          
          <Separator className="my-4" />
          
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex items-center"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}