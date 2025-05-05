import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { formatDateTimeRange, findAvailableTimeSlots, TimeSlot, TimeSlotResponse } from "@/lib/calendar";
import { formatWorkoutDuration, scheduleWorkout, type Workout } from "@/lib/workouts";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "../hooks/useAuth";
import { createPendingEvent, updateEventAfterSync, markEventSyncError } from "@/lib/calendarSync";
import { 
  CheckIcon, 
  Clock, 
  Dumbbell, 
  Calendar, 
  RotateCw,
  ChevronRight,
  Loader2,
  Star,
  Sparkles,
  Brain,
  Sun,
  Utensils,
  Moon,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecurringWorkoutForm from "./RecurringWorkoutForm";
import { getLearningModeSetting } from "@/lib/learningModeClient";
import { rankTimeSlots, recordScheduledWorkout, dateToSlotId } from "@/lib/intelligentScheduling";
import SuccessConfetti from "./SuccessConfetti";

type SchedulingMode = "smart" | "manual";
type SchedulingTab = "single" | "recurring";

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: (e?: React.MouseEvent) => void;
  selectedWorkout?: Workout;
}

export default function SchedulingModal({ isOpen, onClose, selectedWorkout }: SchedulingModalProps) {
  const [mode, setMode] = useState<SchedulingMode>("smart");
  const [scheduleTab, setScheduleTab] = useState<SchedulingTab>("single");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<any[]>([]);
  // State for tracking scheduling status
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  // State for success celebration animation
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
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

  // Access the authenticated user
  const { user } = useAuth();
  
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
      // Track if we created a pending event in Firestore
      let tempEventId: string | undefined;
      
      try {
        // First create a pending event in Firestore to track reliability
        if (user?.firebaseUid) {
          tempEventId = await createPendingEvent(
            user.firebaseUid,
            workoutName,
            startTime,
            endTime
          );
          console.log("Created pending event in Firestore:", tempEventId);
        }
      } catch (error) {
        console.error("Error creating pending event in Firestore:", error);
        // Continue even if Firebase tracking fails - don't block the user
      }
      
      // Create the event directly - include the timestamp from when we fetched the slots
      // to help the server verify if the calendar has been updated since
      const conflictCheck = await apiRequest('POST', '/api/calendar/create-event', {
        workoutName,
        startTime,
        endTime,
        slotsTimestamp // Send the timestamp when slots were fetched
      });
      
      const calendarData = await conflictCheck.json();
      
      if (!calendarData.success) {
        // For all errors, use a user-friendly message that doesn't expose API details
        if (calendarData.error && calendarData.error.includes("Google Calendar API")) {
          // Log the technical error for developers
          console.error("Calendar API error:", calendarData.error);
          
          // Mark event as error in Firestore if we created a pending event
          if (tempEventId && user?.firebaseUid) {
            try {
              await markEventSyncError(
                user.firebaseUid, 
                tempEventId,
                "Calendar API error: " + calendarData.error
              );
            } catch (e) {
              console.error("Error marking event sync error:", e);
            }
          }
          
          // Show a user-friendly message
          throw new Error("We're having trouble connecting to your calendar right now. Please try again in a few minutes.");
        } else if (calendarData.message && calendarData.message.includes("calendar has been updated")) {
          // Calendar has changed since slots were fetched - refresh the slots automatically
          console.log("Calendar changed, refreshing time slots...");
          
          // Mark event as error in Firestore if we created a pending event
          if (tempEventId && user?.firebaseUid) {
            try {
              await markEventSyncError(
                user.firebaseUid, 
                tempEventId,
                "Calendar changed since loading: " + calendarData.message
              );
            } catch (e) {
              console.error("Error marking event sync error:", e);
            }
          }
          
          // Get fresh slots and try to schedule again with the same slot time if possible
          const slotsResponse = await findAvailableTimeSlots(new Date(), workout?.duration || 60);
          const freshSlots = slotsResponse.slots;
          const slotTimestamp = slotsResponse.timestamp;
          
          // Try to find the same time slot in the fresh slots
          const originalStartTime = startTime;
          const originalEndTime = endTime;
          const matchingSlot = freshSlots.find(slot => 
            new Date(slot.start).getHours() === new Date(originalStartTime).getHours() &&
            new Date(slot.start).getMinutes() === new Date(originalStartTime).getMinutes()
          );
          
          // If we found a matching slot, try scheduling again automatically
          if (matchingSlot) {
            toast({
              title: "Retrying scheduling",
              description: "Your calendar has changed. Attempting to schedule at the same time...",
              variant: "default",
            });
            
            // Create a new pending event
            let newTempEventId: string | undefined;
            if (user?.firebaseUid) {
              try {
                newTempEventId = await createPendingEvent(
                  user.firebaseUid,
                  workoutName,
                  matchingSlot.start,
                  matchingSlot.end
                );
              } catch (error) {
                console.error("Error creating new pending event:", error);
              }
            }
            
            // Try scheduling again with fresh slot
            try {
              const retryResult = await apiRequest('POST', '/api/calendar/create-event', {
                workoutName,
                startTime: matchingSlot.start,
                endTime: matchingSlot.end,
                slotsTimestamp: slotTimestamp // Include the fresh timestamp
              });
              
              const retryData = await retryResult.json();
              
              if (retryData.success) {
                // Update the Firestore event with the Google Calendar event ID
                if (newTempEventId && user?.firebaseUid && retryData.eventId) {
                  try {
                    await updateEventAfterSync(
                      user.firebaseUid,
                      newTempEventId,
                      retryData.eventId,
                      retryData.htmlLink
                    );
                  } catch (error) {
                    console.error("Error updating event after retry sync:", error);
                  }
                }
                
                // Schedule in our database
                const scheduledWorkout = await scheduleWorkout(
                  workoutId,
                  matchingSlot.start,
                  matchingSlot.end,
                  retryData.eventId
                );
                
                // Return successful retry result
                return { 
                  scheduledWorkout, 
                  calendarEvent: retryData
                };
              }
            } catch (error) {
              console.error("Auto-retry scheduling failed:", error);
            }
          }
          
          // Update available slots for the UI
          setAvailableSlots(freshSlots);
          
          // Select first time slot by default
          if (freshSlots.length > 0) {
            setSelectedTimeSlot(freshSlots[0].start);
            // Show a helpful message if auto-retry failed or wasn't possible
            toast({
              title: "Calendar updated",
              description: "Your calendar has changed. We've refreshed the available time slots.",
              variant: "default",
            });
          } else {
            // No slots available after refresh
            throw new Error("No available time slots found. Your calendar appears to be full.");
          }
          
          // Return empty to prevent further execution but don't throw error
          return { scheduledWorkout: null, calendarEvent: null };
        } else {
          // Other error
          
          // Mark event as error in Firestore if we created a pending event
          if (tempEventId && user?.firebaseUid) {
            try {
              await markEventSyncError(
                user.firebaseUid, 
                tempEventId,
                calendarData.message || "Unknown error during calendar sync"
              );
            } catch (e) {
              console.error("Error marking event sync error:", e);
            }
          }
          
          throw new Error(calendarData.message || "Unable to schedule workout. Please try again.");
        }
      }
      
      // Update the Firestore event with the Google Calendar event ID
      if (tempEventId && user?.firebaseUid && calendarData.eventId) {
        try {
          await updateEventAfterSync(
            user.firebaseUid,
            tempEventId,
            calendarData.eventId,
            calendarData.htmlLink
          );
          console.log("Updated event in Firestore after successful sync:", calendarData.eventId);
        } catch (error) {
          console.error("Error updating event after sync:", error);
          // Continue even if update fails - we'll have a retry mechanism
        }
      }
      
      // Schedule in our database
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
      // Skip success handling if we returned null from a slot refresh
      if (!data || data.scheduledWorkout === null) {
        return;
      }
      
      // Check if we have a valid scheduled workout
      if (data.scheduledWorkout) {
        // Using the start and end time values
        const startDate = new Date(data.scheduledWorkout.startTime || data.scheduledWorkout.scheduledDate);
        const endDate = new Date(data.scheduledWorkout.endTime || '');
        
        // Instead of a toast, show the celebration animation
        setShowCelebration(true);
        
        // Invalidate queries that depend on scheduled workouts
        queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
        
        // Close the modal after celebration animation
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to schedule workout",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  // Keep track of the slots timestamp for validation
  const [slotsTimestamp, setSlotsTimestamp] = useState<number>(0);

  // Fetch available time slots when modal opens or workout changes
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (workout) {
        // Get user's time horizon preference if available
        const userPrefsResponse = await apiRequest('GET', '/api/user-preferences');
        let timeHorizon = 1; // Default to searching today only
        
        try {
          const userPrefs = await userPrefsResponse.json();
          if (userPrefs && userPrefs.defaultTimeHorizon) {
            timeHorizon = parseInt(userPrefs.defaultTimeHorizon);
          }
        } catch (error) {
          console.error('Error parsing user preferences:', error);
        }
        
        // Get raw time slots from the API with time horizon
        const slotsResponse = await findAvailableTimeSlots(new Date(), workout.duration, timeHorizon);
        const slots = slotsResponse.slots;
        
        // Store the timestamp for validation during booking
        setSlotsTimestamp(slotsResponse.timestamp);
        
        try {
          // Check if learning mode is enabled
          const learningModeResult = await getLearningModeSetting();
          const learningEnabled = learningModeResult.success && learningModeResult.enabled;
          
          // Identify slots with adjacent meetings (not implemented yet)
          const adjacentMeetingSlots: string[] = [];
          
          if (learningEnabled) {
            // If learning mode is enabled, rank the slots
            const rankedSlots = await rankTimeSlots(slots, learningEnabled, adjacentMeetingSlots);
            setAvailableSlots(rankedSlots);
          } else {
            // Otherwise use the slots as-is
            setAvailableSlots(slots);
          }
        } catch (error) {
          console.error('Error in intelligent scheduling:', error);
          // Fallback to unranked slots
          setAvailableSlots(slots);
        }
        
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

  const handleSchedule = async (event: React.MouseEvent) => {
    // Prevent default to stop any navigation
    event.preventDefault();
    event.stopPropagation();
    
    if (!workout || !selectedTimeSlot) {
      toast({
        title: "Error",
        description: "Please select a workout and time slot",
        variant: "destructive",
      });
      return;
    }
    
    // Get active workout (we've already checked it exists)
    const activeWorkout = workout;
    
    try {
      const selectedSlot = availableSlots.find(slot => slot.start === selectedTimeSlot);
      
      if (!selectedSlot) {
        throw new Error("Selected time slot not found");
      }
      
      // Record this scheduled workout for learning purposes
      try {
        const startDate = new Date(selectedSlot.start);
        const slotId = dateToSlotId(startDate);
        await recordScheduledWorkout(slotId);
      } catch (error) {
        // Don't block scheduling if the learning feature fails
        console.error('Error recording scheduled workout for learning:', error);
      }
      
      scheduleMutation.mutate({
        workoutId: activeWorkout.id,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        workoutName: activeWorkout.name
      });
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
    
    // Get active workout (either from currentlySelectedWorkout or workout prop)
    const activeWorkout = (currentlySelectedWorkout || workout)!;
    
    // Different message based on how many events were created
    if (events.length === 0) {
      toast({
        title: "No workouts scheduled",
        description: "We couldn't find any free time slots that match your pattern. Please try different dates or times.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Recurring workouts scheduled!",
        description: `Successfully scheduled ${events.length} occurrences of ${activeWorkout?.name || "workout"}`,
        variant: "default",
      });
      
      // Invalidate queries that depend on scheduled workouts
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scheduled-workouts/upcoming'] });
    }
  };

  // We'll use a state to manage the workout selection view and the currently selected workout
  const [showWorkoutSelection, setShowWorkoutSelection] = useState<boolean>(!selectedWorkout && !workout);
  const [currentlySelectedWorkout, setCurrentlySelectedWorkout] = useState<Workout | undefined>(selectedWorkout || workout);
  
  // Track the actual workout that will be scheduled
  useEffect(() => {
    if (selectedWorkoutId && workouts) {
      const selected = workouts.find(w => w.id === selectedWorkoutId);
      if (selected) {
        setCurrentlySelectedWorkout(selected);
      }
    }
  }, [selectedWorkoutId, workouts]);
  
  // Handle workout selection and switch to scheduling view
  const handleWorkoutSelect = (workoutId: number, event: React.MouseEvent) => {
    // Prevent any navigation
    event.preventDefault();
    event.stopPropagation();
    
    setSelectedWorkoutId(workoutId);
  };
  
  // Handle the continue button in workout selection
  const handleContinueFromSelection = (event: React.MouseEvent) => {
    // Prevent default to stop link navigation
    event.preventDefault();
    event.stopPropagation();
    
    if (selectedWorkoutId && workouts) {
      const selected = workouts.find(w => w.id === selectedWorkoutId);
      if (selected) {
        setCurrentlySelectedWorkout(selected);
        setShowWorkoutSelection(false);
      }
    }
  };
  
  // Render workout selection if needed
  if (showWorkoutSelection && workouts && workouts.length > 0) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
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
                onClick={(e) => handleWorkoutSelect(w.id, e)}
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
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinueFromSelection}
              disabled={!selectedWorkoutId}
              className="flex items-center"
              type="button"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // If we don't have a workout selected or available, don't render the scheduling view
  if (!currentlySelectedWorkout && !workout) {
    return null;
  }
  
  // Use the currently selected workout or the passed in workout
  // We've already checked that at least one of these exists
  const activeWorkout = (currentlySelectedWorkout || workout)!;

  // Create different content based on tabs
  const renderMainContent = () => {
    if (recurringEnabled && scheduleTab === "recurring") {
      return (
        <>
          {selectedTimeSlot && activeWorkout ? (
            <RecurringWorkoutForm
              workoutName={activeWorkout.name}
              startTime={selectedTimeSlot}
              endTime={availableSlots.find(slot => slot.start === selectedTimeSlot)?.end || ""}
              timestamp={slotsTimestamp} // Pass the timestamp for slot validation
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
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose(e);
                }} 
                type="button"
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </>
      );
    }
    
    // Default content (single workout)
    return (
      <>
        <p className="mb-4">Would you like SyncFit to find free time slots or add workout time manually?</p>
        
        <div className="space-y-3 mb-4">
          <button
            className={`w-full flex items-center justify-between ${
              mode === "smart" 
                ? "bg-primary border border-primary" 
                : "bg-white border border-gray-300"
            } rounded-md p-3 text-left`}
            onClick={(e) => {
              e.preventDefault();
              setMode("smart");
            }}
            type="button"
          >
            <div className="flex items-center">
              <Clock className={`h-5 w-5 mr-3 ${mode === "smart" ? "text-white" : "text-primary"}`} />
              <div>
                <div className="flex items-center gap-1">
                  <h3 className={`font-medium ${mode === "smart" ? "text-white" : ""}`}>Smart Scheduling</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className={`h-3.5 w-3.5 ${mode === "smart" ? "text-gray-200" : "text-gray-400"}`} />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[250px] text-xs">
                        <p>Chosen based on your recent scheduling patterns and calendar availability.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className={`text-xs ${mode === "smart" ? "text-gray-200" : "text-gray-600"}`}>Find the best time slots based on your calendar</p>
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
            onClick={(e) => {
              e.preventDefault();
              setMode("manual");
            }}
            type="button"
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
          <h3 className="font-medium mb-2">{activeWorkout.name}</h3>
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            <Clock className="h-4 w-4 mr-1" />
            Duration: {formatWorkoutDuration(activeWorkout.duration)}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4 mr-1" />
            Equipment: {activeWorkout.equipment || "None"}
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Available Time Slots</h3>
          <div className="flex items-center text-xs text-muted-foreground">
            <Brain className="h-4 w-4 mr-1 text-primary" />
            <span>Smart Recommendations</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[250px] text-xs">
                  <p>Chosen based on your recent scheduling patterns and calendar availability.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {availableSlots.length > 0 ? (
          <RadioGroup value={selectedTimeSlot || undefined} onValueChange={setSelectedTimeSlot}>
            <div className="space-y-2">
              {availableSlots.map((slot, index) => {
                const startDate = new Date(slot.start);
                const endDate = new Date(slot.end);
                const hour = startDate.getHours();
                const isRecommended = slot.isRecommended === true;
                const hasScore = typeof slot.score !== 'undefined';
                
                // Get appropriate time icon
                let TimeIcon = Sun;
                if (hour >= 12 && hour < 17) {
                  TimeIcon = Utensils;
                } else if (hour >= 17) {
                  TimeIcon = Moon;
                }
                
                // Get day label (either from slot or calculate it)
                const dayLabel = slot.day || (slot.daysFromNow ? (
                  slot.daysFromNow === 0 ? 'Today' : 
                  slot.daysFromNow === 1 ? 'Tomorrow' : 
                  startDate.toLocaleDateString(undefined, { weekday: 'long' })
                ) : 'Today');
                
                // Format the time only (not date) for display
                const timeOnly = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) +
                  ' – ' + endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                
                return (
                  <div 
                    key={index} 
                    className={`calendar-time-slot border rounded-md p-3 flex items-center hover:bg-muted 
                      ${isRecommended ? 'border-primary bg-primary/5' : ''}
                    `}
                  >
                    <RadioGroupItem value={slot.start} id={`slot-${index}`} className="mr-2" />
                    <Label htmlFor={`slot-${index}`} className="text-sm flex-grow cursor-pointer">
                      {/* Time section with day label */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full 
                            ${dayLabel === 'Today' ? 'bg-green-100' : 
                              dayLabel === 'Tomorrow' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                            <TimeIcon className={`h-3.5 w-3.5 
                              ${dayLabel === 'Today' ? 'text-green-600' : 
                                dayLabel === 'Tomorrow' ? 'text-blue-600' : 'text-amber-600'}`} />
                          </div>
                          <div>
                            <div className="font-medium">{timeOnly}</div>
                            <div className="text-xs text-muted-foreground">{dayLabel}</div>
                          </div>
                        </div>
                        
                        {isRecommended && (
                          <div className="flex items-center gap-1 text-primary text-xs font-medium bg-primary/10 px-2 py-1 rounded-full">
                            <Brain className="h-3.5 w-3.5" />
                            <span>Recommended</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Additional slot info */}
                      <div className="flex items-center justify-between mt-1.5">
                        {slot.label && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {slot.label}
                          </div>
                        )}
                        {hasScore && (slot.score ?? 0) > 5 && (
                          <div className="text-xs text-primary flex items-center gap-1">
                            <Star className="h-3 w-3 fill-primary" />
                            {(slot.score ?? 0) > 7 ? 'Optimal time' : 'Good time'}
                          </div>
                        )}
                      </div>
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
      </>
    );
  };

  return (
    <div>
      {/* Success celebration animation */}
      <SuccessConfetti 
        visible={showCelebration}
        message={`Workout scheduled! You're making space for yourself.`}
        onComplete={() => setShowCelebration(false)}
      />
      
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
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
            
            {renderMainContent()}
          </div>
        
          <DialogFooter className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose(e);
              }}
              type="button"
            >
              Cancel
            </Button>
            {(!recurringEnabled || scheduleTab === "single") ? (
              <Button 
                onClick={(e) => handleSchedule(e)} 
                disabled={!selectedTimeSlot || scheduleMutation.isPending}
                type="button"
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setScheduleTab("single");
                }} 
                type="button"
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
    </div>
  );
}