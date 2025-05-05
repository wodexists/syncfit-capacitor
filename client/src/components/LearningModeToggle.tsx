import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

interface LearningModeToggleProps {
  className?: string;
  userId?: number;
}

export default function LearningModeToggle({ className, userId }: LearningModeToggleProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch the current learning mode setting when the component mounts
  useEffect(() => {
    fetchLearningModeSetting();
  }, [userId]);

  const fetchLearningModeSetting = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/learning-mode');
      const data = await response.json();
      
      if (data.success) {
        setIsEnabled(data.enabled);
      } else {
        console.error('Failed to fetch learning mode setting:', data.message);
      }
    } catch (error) {
      console.error('Error fetching learning mode setting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLearningMode = async () => {
    if (!userId) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to change settings.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const newState = !isEnabled;
      
      const response = await apiRequest('POST', '/api/learning-mode', {
        enabled: newState
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsEnabled(newState);
        toast({
          title: newState ? "Learning Mode Enabled" : "Learning Mode Disabled",
          description: newState 
            ? "SyncFit will now learn from your workout patterns to provide better recommendations." 
            : "Your workout history is still saved, but recommendations will be paused.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update learning mode setting",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error toggling learning mode:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating your preferences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-primary mr-2" />
              <Label htmlFor="learning-mode" className="text-sm font-medium">
                Intelligent Scheduling
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-1 rounded-full bg-muted w-4 h-4 inline-flex items-center justify-center text-xs font-bold">?</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      When enabled, SyncFit learns from your workout history to suggest optimal timeslots with
                      higher success rates. Your workout patterns are analyzed to provide personalized recommendations.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isEnabled 
                ? "SyncFit is learning from your patterns to recommend optimal workout times" 
                : "Personalized scheduling recommendations are disabled"}
            </p>
          </div>
          <Switch
            id="learning-mode"
            checked={isEnabled}
            onCheckedChange={toggleLearningMode}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}