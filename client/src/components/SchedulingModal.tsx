import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { formatDateTimeRange, findAvailableTimeSlots, TimeSlot } from "@/lib/calendar";
import { formatWorkoutDuration, scheduleWorkout, type Workout } from "@/lib/workouts";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, Clock, Dumbbell } from "lucide-react";

type SchedulingMode = "smart" | "manual";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWorkout?: Workout;
}

export default function SchedulingModal({ isOpen, onClose, selectedWorkout }: SchedulingModalProps) {
  const [mode, setMode] = useState<SchedulingMode>("smart");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workouts if no workout is provided
  const { data: workouts } = useQuery({
    queryKey: ['/api/workouts'],
    enabled: !selectedWorkout,
  });

  // Default to first workout if none selected
  const workout = selectedWorkout || (workouts && workouts[0]);

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
      
      await scheduleWorkout(
        workout.id,
        selectedSlot.start,
        selectedSlot.end
      );
      
      toast({
        title: "Workout scheduled!",
        description: `${workout.name} scheduled for ${formatDateTimeRange(
          new Date(selectedSlot.start),
          new Date(selectedSlot.end)
        )}`,
      });
      
      // Invalidate queries that depend on scheduled workouts
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
      
      onClose();
    } catch (error) {
      toast({
        title: "Failed to schedule workout",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  if (!workout) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Schedule Workout</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
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
                <span className="material-icons text-primary mr-3">schedule</span>
                <div>
                  <h3 className={`font-medium ${mode === "smart" ? "text-primary" : ""}`}>Smart Scheduling</h3>
                  <p className="text-xs text-gray-600">Find the best time slots based on your calendar</p>
                </div>
              </div>
              <span className="material-icons text-primary">
                {mode === "smart" ? "check_circle" : "radio_button_unchecked"}
              </span>
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
                <span className={`material-icons ${mode === "manual" ? "text-primary" : "text-gray-600"} mr-3`}>edit_calendar</span>
                <div>
                  <h3 className={`font-medium ${mode === "manual" ? "text-primary" : ""}`}>Manual Scheduling</h3>
                  <p className="text-xs text-gray-600">Choose your own time for the workout</p>
                </div>
              </div>
              <span className={`material-icons ${mode === "manual" ? "text-primary" : "text-gray-300"}`}>
                {mode === "manual" ? "check_circle" : "radio_button_unchecked"}
              </span>
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-md p-3 mb-4">
            <h3 className="font-medium mb-2">{workout.name}</h3>
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Clock className="h-4 w-4 mr-1" />
              Duration: {formatWorkoutDuration(workout.duration)}
            </div>
            <div className="flex items-center text-sm text-gray-600">
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
                    <div key={index} className="calendar-time-slot rounded-md p-2 flex items-center">
                      <RadioGroupItem value={slot.start} id={`slot-${index}`} className="mr-2" />
                      <Label htmlFor={`slot-${index}`} className="text-sm flex-grow">
                        {timeRangeText}
                        {slot.label && <div className="text-xs text-gray-600">{slot.label}</div>}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          ) : (
            <div className="text-center py-3 text-gray-500">
              No available time slots found. Try a different date or duration.
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={!selectedTimeSlot}>Add to Calendar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
