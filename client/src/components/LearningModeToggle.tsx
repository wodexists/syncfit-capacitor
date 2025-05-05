import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Brain, Check } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function LearningModeToggle() {
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [lastChanged, setLastChanged] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch learning mode preferences
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    learningEnabled: boolean;
    lastLearningChange: string | null;
  }>({
    queryKey: ['/api/learning-mode'],
    refetchOnWindowFocus: false,
  });

  // Mutation to save learning mode preferences
  const learningMutation = useMutation({
    mutationFn: (enabled: boolean) => {
      return apiRequest('POST', '/api/learning-mode', { enabled });
    },
    onSuccess: (data) => {
      // Parse the response
      const response = data.json();
      
      toast({
        title: "Learning mode preference saved",
        description: learningEnabled 
          ? "SyncFit will now learn from your habits to suggest better workout times" 
          : "Learning mode has been disabled. SyncFit will no longer track your workout patterns",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/learning-mode'] });
      // Also invalidate slot stats if they're being used elsewhere
      queryClient.invalidateQueries({ queryKey: ['/api/slot-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving preference",
        description: "There was a problem saving your learning mode preference",
        variant: "destructive",
      });
      console.error('Error saving learning mode preference:', error);
    }
  });

  // Initialize values from fetched preferences
  useEffect(() => {
    if (data) {
      setLearningEnabled(data.learningEnabled !== false); // Default to true if undefined
      
      if (data.lastLearningChange) {
        setLastChanged(new Date(data.lastLearningChange));
      }
    }
  }, [data]);

  const handleToggle = (enabled: boolean) => {
    setLearningEnabled(enabled);
    learningMutation.mutate(enabled);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <p>Loading learning mode preferences...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary" />
          <CardTitle>Learning Mode</CardTitle>
        </div>
        <CardDescription>
          Let SyncFit learn your workout rhythm to suggest better times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="learning-mode" className="text-base">
                Intelligent Scheduling
              </Label>
              <p className="text-sm text-muted-foreground">
                {learningEnabled 
                  ? "SyncFit ranks slots, shows recommendations, and updates stats based on your habits" 
                  : "Only available slots will be shown, without ranking or pattern tracking"}
              </p>
            </div>
            <Switch
              id="learning-mode"
              checked={learningEnabled}
              onCheckedChange={handleToggle}
              disabled={learningMutation.isPending}
            />
          </div>

          {lastChanged && (
            <div className="text-xs text-muted-foreground mt-2">
              Last changed: {format(lastChanged, 'PPP p')}
            </div>
          )}

          {learningMutation.isPending && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Saving preference...
            </div>
          )}

          {learningMutation.isSuccess && (
            <div className="flex items-center text-sm text-green-600">
              <Check className="h-3 w-3 mr-1" />
              Preference saved
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}