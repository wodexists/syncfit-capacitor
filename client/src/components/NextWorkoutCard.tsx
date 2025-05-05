import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDateTimeRange } from "@/lib/calendar";
import { formatWorkoutDuration, ScheduledWorkout, markWorkoutAsCompleted } from "@/lib/workouts";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import SchedulingModal from "./SchedulingModal";

export default function NextWorkoutCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  
  // Fetch upcoming workouts - we'll just use the first one
  const { data: upcomingWorkouts, isLoading } = useQuery<ScheduledWorkout[]>({
    queryKey: ['/api/scheduled-workouts/upcoming'],
  });
  
  const nextWorkout = upcomingWorkouts && upcomingWorkouts.length > 0 
    ? upcomingWorkouts[0] 
    : null;
  
  const handleMarkAsDone = async (id: number) => {
    try {
      await markWorkoutAsCompleted(id);
      
      toast({
        title: "Workout completed!",
        description: "Great job! You're making progress on your fitness journey.",
        variant: "default",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark workout as completed",
        variant: "destructive",
      });
    }
  };
  
  const formatWorkoutTime = (workout: ScheduledWorkout) => {
    const startDate = new Date(workout.startTime);
    const endDate = new Date(workout.endTime);
    const today = new Date();
    
    let dayText = "";
    if (startDate.toDateString() === today.toDateString()) {
      dayText = "Today";
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (startDate.toDateString() === tomorrow.toDateString()) {
        dayText = "Tomorrow";
      } else {
        const options = { weekday: 'long' as const };
        dayText = startDate.toLocaleDateString(undefined, options);
      }
    }
    
    const timeText = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${timeText}, ${dayText}`;
  };
  
  // If no upcoming workouts, don't render anything
  if (!isLoading && (!upcomingWorkouts || upcomingWorkouts.length === 0)) {
    return null;
  }
  
  return (
    <Card className="mb-6 overflow-hidden border-l-4 border-l-primary">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base font-medium flex items-center">
          <Calendar className="mr-2 h-4 w-4 text-primary" />
          Next Workout
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-3">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : nextWorkout ? (
          // Render next workout
          <div>
            <h3 className="font-medium text-lg">{nextWorkout.workout?.name || "Workout"}</h3>
            <div className="flex items-center text-sm text-muted-foreground mb-3">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              <span>{formatWorkoutTime(nextWorkout)}</span>
              <span className="mx-1.5">•</span>
              <span>Duration: {formatWorkoutDuration(nextWorkout.workout?.duration || 30)}</span>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsSchedulingModalOpen(true)}
                className="flex-1"
              >
                Reschedule
              </Button>
              <Button 
                variant="default"
                size="sm"
                onClick={() => handleMarkAsDone(nextWorkout.id)}
                className="flex-1 bg-primary"
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Mark as Done
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
      
      {isSchedulingModalOpen && nextWorkout && (
        <SchedulingModal 
          isOpen={isSchedulingModalOpen} 
          onClose={() => setIsSchedulingModalOpen(false)}
          selectedWorkout={nextWorkout.workout}
        />
      )}
    </Card>
  );
}