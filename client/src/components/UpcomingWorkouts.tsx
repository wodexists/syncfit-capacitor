import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit2, Trash2, Calendar } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDateTimeRange } from "@/lib/calendar";
import { deleteScheduledWorkout, ScheduledWorkout } from "@/lib/workouts";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function UpcomingWorkouts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch upcoming workouts
  const { data: upcomingWorkouts, isLoading } = useQuery({
    queryKey: ['/api/scheduled-workouts/upcoming'],
  });
  
  const handleDelete = async (id: number) => {
    try {
      await deleteScheduledWorkout(id);
      
      toast({
        title: "Workout deleted",
        description: "The workout has been removed from your schedule.",
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the workout",
        variant: "destructive",
      });
    }
  };
  
  const formatWorkoutTime = (workout: ScheduledWorkout) => {
    return formatDateTimeRange(
      new Date(workout.startTime),
      new Date(workout.endTime)
    );
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Upcoming Workouts</CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          // Loading skeletons
          <>
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </>
        ) : upcomingWorkouts && upcomingWorkouts.length > 0 ? (
          // Render upcoming workouts
          <div>
            {upcomingWorkouts.map((scheduledWorkout: ScheduledWorkout) => (
              <div 
                key={scheduledWorkout.id}
                className="border-b border-gray-200 pb-3 mb-3 last:border-0 last:mb-0 last:pb-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{scheduledWorkout.workout?.name}</h4>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatWorkoutTime(scheduledWorkout)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-600 p-1 rounded-full hover:bg-gray-100"
                      onClick={() => handleDelete(scheduledWorkout.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No upcoming workouts
          <div className="text-center py-6 text-gray-500">
            No upcoming workouts scheduled.
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className="w-full mt-3 text-primary flex items-center justify-center py-2 rounded-md hover:bg-gray-100"
        >
          <Eye className="h-4 w-4 mr-1" />
          View all workouts
        </Button>
      </CardContent>
    </Card>
  );
}
