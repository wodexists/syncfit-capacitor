import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Brain, Info, Sparkles } from "lucide-react";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  getLearningModePreferences, 
  setLearningModeEnabled,
  type LearningModePreferences
} from "@/lib/learningModeClient";

export default function LearningModeToggle() {
  const [learningEnabled, setLearningEnabled] = useState<boolean>(true);
  const [lastChange, setLastChange] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch current learning mode status when component mounts
  useEffect(() => {
    const fetchLearningMode = async () => {
      try {
        const preferences = await getLearningModePreferences();
        if (preferences) {
          setLearningEnabled(preferences.learningEnabled);
          setLastChange(preferences.lastLearningChange ? new Date(preferences.lastLearningChange) : null);
        }
      } catch (error) {
        console.error('Error fetching learning mode preferences:', error);
      }
    };

    fetchLearningMode();
  }, []);

  // Handle toggling learning mode
  const handleToggleChange = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const success = await setLearningModeEnabled(enabled);
      
      if (success) {
        setLearningEnabled(enabled);
        setLastChange(new Date());
        
        toast({
          title: enabled ? "Learning Mode Enabled" : "Learning Mode Disabled",
          description: enabled 
            ? "SyncFit will now learn from your workout patterns to suggest better times." 
            : "SyncFit will no longer use your past workout data for scheduling suggestions.",
        });
      } else {
        toast({
          title: "Error",
          description: "Could not update learning mode preferences. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating learning mode:', error);
      toast({
        title: "Error",
        description: "Could not update learning mode preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Learning Mode
          </CardTitle>
          <CardDescription>
            Personalized scheduling based on your habits
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="learning-mode"
            checked={learningEnabled}
            onCheckedChange={handleToggleChange}
            disabled={isLoading}
          />
          <Label 
            htmlFor="learning-mode" 
            className={`text-sm ${learningEnabled ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            {learningEnabled ? 'Enabled' : 'Disabled'}
          </Label>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-0">
        <div className="text-sm text-muted-foreground">
          {learningEnabled ? (
            <div className="flex items-center mt-2 gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span>SyncFit learns from your successful workouts to suggest optimal times</span>
            </div>
          ) : (
            <p>Enable to receive workout time suggestions based on your past success patterns</p>  
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-3 mt-3">
        {lastChange ? (
          <p className="text-xs text-muted-foreground flex items-center">
            Last changed: {format(lastChange, 'MMM d, yyyy')}
          </p>
        ) : (
          <span></span>
        )}
        
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Learn more</span>
              <Info className="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">About Learning Mode</h4>
              <p className="text-sm">
                When enabled, SyncFit analyzes which time slots have led to 
                the highest workout completion rates and recommends similar times 
                for future workouts.
              </p>
              <p className="text-sm">
                This feature helps optimize your schedule for times when you're 
                most likely to complete your workouts successfully.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </CardFooter>
    </Card>
  );
}