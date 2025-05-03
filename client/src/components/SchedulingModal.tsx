import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { formatDateTimeRange, findAvailableTimeSlots, TimeSlot } from "@/lib/calendar";
import { formatWorkoutDuration, scheduleWorkout, type Workout } from "@/lib/workouts";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckIcon, 
  Clock, 
  Dumbbell, 
  Calendar, 
  Bell, 
  RotateCw,
  ChevronRight,
  Loader2,
  Star
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import RecurringWorkoutForm from "./RecurringWorkoutForm";

type SchedulingMode = "smart" | "manual";
type SchedulingTab = "single" | "recurring";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkout?: Workout;
}

export default function SchedulingModal({ isOpen, onClose, selectedWorkout }: SchedulingModalProps) {
  const [mode, setMode] = useState<SchedulingMode>("smart");
  const [scheduleTab, setScheduleTab] = useState<SchedulingTab>("single");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workouts if no workout is provided
  const { data: workouts } = useQuery<Workout[]>({
    queryKey: ['/api/workouts'],
    enabled: !selectedWorkout,
  });

  // Fetch user preferences to check if recurring workouts are enabled
  const { data: userPreferences } = useQuery<any>({
    queryKey: ['/api/user-preferences'],
    refetchOnWindowFocus: false,
  });

  // Check if recurring workouts are enabled
  const recurringEnabled = userPreferences?.enableRecurring || false;

  // State for workout selection when no workout is provided
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(
    selectedWorkout ? selectedWorkout.id : null
  );
  
  // If a workout is directly selected, use it; otherwise use the one selected from the list
  const workout = selectedWorkout || 
    (workouts && selectedWorkoutId ? 
      workouts.find(w => w.id === selectedWorkoutId) : undefined);

  // Create mutation for scheduling single workouts
  const scheduleMutation = useMutation({
    mutationFn: async ({ 
      workoutId, 
      startTime, 
      endTime, 
      workoutName 
    }: { 
      workoutId: number, 
      startTime: string, 
      endTime: string, 
      workoutName: string 
    }) => {
      // First check for conflicts
      const conflictCheck = await apiRequest('POST', '/api/calendar/create-event', {
        workoutName,
        startTime,
        endTime
      });
      
      const calendarData = await conflictCheck.json();
      
      if (!calendarData.success) {
        throw new Error(calendarData.message || 'Calendar conflict detected');
      }
      
      // If no conflicts, schedule in our database
      const scheduledWorkout = await scheduleWorkout(
        workoutId,
        startTime,
        endTime,
        calendarData.eventId
      );
      
      return { 
        scheduledWorkout, 
        calendarEvent: calendarData 
      };
    },
    onSuccess: (data) => {
      // Using the start and end time values
      const startDate = new Date(data.scheduledWorkout.startTime || data.scheduledWorkout.scheduledDate);
      const endDate = new Date(data.scheduledWorkout.endTime || '');
      
      toast({
        title: "Workout scheduled!",
        description: `${workout?.name} scheduled for ${formatDateTimeRange(startDate, endDate)}`,
        variant: "default",
      });
      
      // Invalidate queries that depend on scheduled workouts
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule workout",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Fetch available time slots when modal opens or workout changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (workout) {
        const slots = await findAvailableTimeSlots(new Date(), workout.duration);
        setAvailableSlots(slots);
        
        // Select first time slot by default
        if (slots.length > 0) {
          setSelectedTimeSlot(slots[0].start);
        }
      }
    };
    
    if (isOpen) {
      fetchTimeSlots();
      // Reset state when modal opens
      setScheduleTab("single");
      setScheduledEvents([]);
    }
  }, [isOpen, workout]);

  const handleSchedule = async () => {
    if (!workout || !selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a workout and time slot",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const selectedSlot = availableSlots.find(slot => slot.start === selectedTimeSlot);
      
      if (!selectedSlot) {
        throw new Error("Selected time slot not found");
      }
      
      scheduleMutation.mutate({
        workoutId: workout.id,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        workoutName: workout.name
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Failed to schedule workout",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRecurringSuccess = (events: any) => {
    setScheduledEvents(events);
    
    toast({
      title: "Recurring workouts scheduled!",
      description: `Successfully scheduled ${events.length} occurrences of ${workout?.name}`,
      variant: "default",
    });
    
    // Invalidate queries that depend on scheduled workouts
    queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
  };

  // Render workout selection if no workout is selected yet
  if (!workout && workouts) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Select a Workout</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {workouts.map((w) => (
              <div 
                key={w.id} 
                className={`border rounded-md p-3 cursor-pointer hover:border-primary hover:bg-primary/5 ${
                  selectedWorkoutId === w.id ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => setSelectedWorkoutId(w.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 rounded-md overflow-hidden">
                    <img src={w.imageUrl} alt={w.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{w.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {formatWorkoutDuration(w.duration)}
                      </span>
                      <span className="flex items-center">
                        <Star className="h-3.5 w-3.5 mr-1 text-yellow-500 fill-yellow-500" />
                        {(w.rating / 10).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{w.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => {
                // Force the workout to update
                if (selectedWorkoutId && workouts) {
                  const selected = workouts.find(w => w.id === selectedWorkoutId);
                  if (selected) {
                    // This forces re-rendering with the selected workout
                    setSelectedWorkoutId(selectedWorkoutId); 
                  }
                }
              }} 
              disabled={!selectedWorkoutId}
              className="flex items-center"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!workout) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Schedule Workout</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {recurringEnabled && (
            <Tabs value={scheduleTab} onValueChange={(value) => setScheduleTab(value as SchedulingTab)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Single Workout
                </TabsTrigger>
                <TabsTrigger value="recurring" className="flex items-center">
                  <RotateCw className="h-4 w-4 mr-2" />
                  Recurring
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
          <TabsContent value="single" className="mt-0">
            <p className="mb-4">Would you like SyncFit to find free time slots or add workout time manually?</p>
            
            <div className="space-y-3 mb-4">
              <button
                className={`w-full flex items-center justify-between ${
                  mode === "smart" 
                    ? "bg-primary bg-opacity-10 border border-primary" 
                    : "bg-white border border-gray-300"
                } rounded-md p-3 text-left`}
                onClick={() => setMode("smart")}
              >
                <div className="flex items-center">
                  <Clock className="text-primary h-5 w-5 mr-3" />
                  <div>
                    <h3 className={`font-medium ${mode === "smart" ? "text-primary" : ""}`}>Smart Scheduling</h3>
                    <p className="text-xs text-gray-600">Find the best time slots based on your calendar</p>
                  </div>
                </div>
                <CheckIcon className={`h-5 w-5 ${mode === "smart" ? "text-primary" : "text-gray-300"}`} />
              </button>
              
              <button
                className={`w-full flex items-center justify-between ${
                  mode === "manual" 
                    ? "bg-primary bg-opacity-10 border border-primary" 
                    : "bg-white border border-gray-300"
                } rounded-md p-3 text-left`}
                onClick={() => setMode("manual")}
              >
                <div className="flex items-center">
                  <Calendar className={`h-5 w-5 mr-3 ${mode === "manual" ? "text-primary" : "text-gray-600"}`} />
                  <div>
                    <h3 className={`font-medium ${mode === "manual" ? "text-primary" : ""}`}>Manual Scheduling</h3>
                    <p className="text-xs text-gray-600">Choose your own time for the workout</p>
                  </div>
                </div>
                <CheckIcon className={`h-5 w-5 ${mode === "manual" ? "text-primary" : "text-gray-300"}`} />
              </button>
            </div>
            
            <div className="bg-muted rounded-md p-3 mb-4">
              <h3 className="font-medium mb-2">{workout.name}</h3>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4 mr-1" />
                Duration: {formatWorkoutDuration(workout.duration)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Dumbbell className="h-4 w-4 mr-1" />
                Equipment: {workout.equipment || "None"}
              </div>
            </div>
            
            <h3 className="font-medium mb-2">Recommended Time Slots</h3>
            
            {availableSlots.length > 0 ? (
              <RadioGroup value={selectedTimeSlot || undefined} onValueChange={setSelectedTimeSlot}>
                <div className="space-y-2">
                  {availableSlots.map((slot, index) => {
                    const startDate = new Date(slot.start);
                    const endDate = new Date(slot.end);
                    const timeRangeText = formatDateTimeRange(startDate, endDate);
                    
                    return (
                      <div key={index} className="calendar-time-slot border rounded-md p-2 flex items-center hover:bg-muted">
                        <RadioGroupItem value={slot.start} id={`slot-${index}`} className="mr-2" />
                        <Label htmlFor={`slot-${index}`} className="text-sm flex-grow cursor-pointer">
                          {timeRangeText}
                          {slot.label && <div className="text-xs text-muted-foreground">{slot.label}</div>}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            ) : (
              <div className="text-center py-3 text-muted-foreground">
                No available time slots found. Try a different date or duration.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recurring" className="mt-0">
            {selectedTimeSlot && workout && scheduleTab === "recurring" ? (
              <RecurringWorkoutForm
                workoutName={workout.name}
                startTime={selectedTimeSlot}
                endTime={availableSlots.find(slot => slot.start === selectedTimeSlot)?.end || ""}
                onSuccess={handleRecurringSuccess}
                onCancel={() => setScheduleTab("single")}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Please select a time slot first
              </div>
            )}
            
            {scheduledEvents.length > 0 && (
              <div className="mt-4 border rounded-md p-3">
                <h3 className="font-medium mb-2">Scheduled Recurring Workouts</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  Successfully scheduled {scheduledEvents.length} workouts
                </div>
                <Button variant="outline" onClick={onClose} className="w-full">
                  Close
                </Button>
              </div>
            )}
          </TabsContent>
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {scheduleTab === "single" ? (
            <Button 
              onClick={handleSchedule} 
              disabled={!selectedTimeSlot || scheduleMutation.isPending}
              className="flex items-center"
            >
              {scheduleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Add to Calendar
                </>
              )}
            </Button>
          ) : recurringEnabled && scheduleTab === "recurring" && scheduledEvents.length === 0 ? (
            <Button 
              onClick={() => setScheduleTab("single")} 
              variant="secondary"
              className="flex items-center"
            >
              <ChevronRight className="mr-2 h-4 w-4" />
              Continue
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
