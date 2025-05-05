import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCalendarDate, formatDate } from "@/lib/utils";
import { formatDateTimeRange } from "@/lib/calendar";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CalendarIcon, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import { createPendingEvent, updateEventAfterSync, markEventSyncError } from "@/lib/calendarSync";

interface RecurringWorkoutFormProps {
  workoutName: string;
  startTime: string;
  endTime: string;
  timestamp?: number; // Add timestamp from when slots were fetched
  onSuccess: (events: any[]) => void;
  onCancel: () => void;
}

type RecurrencePattern = "weekly" | "biweekly" | "monthly";

export default function RecurringWorkoutForm({
  workoutName,
  startTime,
  endTime,
  timestamp,
  onSuccess,
  onCancel
}: RecurringWorkoutFormProps) {
  const [pattern, setPattern] = useState<RecurrencePattern>("weekly");
  const [occurrences, setOccurrences] = useState<number>(4);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endType, setEndType] = useState<"occurrences" | "date">("occurrences");
  const [excludedDates, setExcludedDates] = useState<Date[]>([]);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Parse initial date
  const initialDate = new Date(startTime);
  
  const handleSubmit = async () => {
    // Array to store pending event IDs
    const tempEventIds: string[] = [];
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        workoutName,
        startTime,
        endTime,
        pattern,
        endType,
        occurrences: endType === "occurrences" ? occurrences : undefined,
        endDate: endDate ? formatCalendarDate(endDate) : undefined,
        excludedDates: excludedDates.map(d => formatCalendarDate(d)),
        slotsTimestamp: timestamp // Include the timestamp when slots were fetched
      };
      
      // First create a pending event for the initial occurrence
      if (user?.firebaseUid) {
        try {
          const tempId = await createPendingEvent(
            user.firebaseUid,
            workoutName,
            startTime,
            endTime
          );
          tempEventIds.push(tempId);
          console.log("Created pending event for initial occurrence:", tempId);
        } catch (error) {
          console.error("Error creating pending event in Firestore:", error);
          // Continue even if Firebase tracking fails - don't block the user
        }
      }
      
      const response = await apiRequest('POST', '/api/calendar/create-recurring-events', payload);
      const result = await response.json();
      
      if (result.success) {
        // Update pending events with real Google Calendar event IDs
        if (user?.firebaseUid && result.events && result.events.length > 0) {
          try {
            // Update the first event with the Google Calendar ID
            await updateEventAfterSync(
              user.firebaseUid,
              tempEventIds[0], // First event ID
              result.events[0].id,
              result.events[0].htmlLink
            );
            
            // For additional events (beyond the first one we already tracked),
            // create them directly as synced events
            for (let i = 1; i < result.events.length; i++) {
              const event = result.events[i];
              const eventStartTime = new Date(event.start.dateTime || event.start.date);
              const eventEndTime = new Date(event.end.dateTime || event.end.date);
              
              // Create a new event and mark it as already synced
              const tempId = await createPendingEvent(
                user.firebaseUid,
                workoutName,
                eventStartTime.toISOString(),
                eventEndTime.toISOString()
              );
              
              await updateEventAfterSync(
                user.firebaseUid,
                tempId,
                event.id,
                event.htmlLink
              );
            }
          } catch (error) {
            console.error("Error updating events after sync:", error);
            // Continue even if updates fail - we'll have a retry mechanism
          }
        }
        
        onSuccess(result.events);
      } else {
        // Mark any pending events as errors
        if (user?.firebaseUid && tempEventIds.length > 0) {
          try {
            for (const tempId of tempEventIds) {
              await markEventSyncError(
                user.firebaseUid,
                tempId,
                result.message || "Failed to create recurring events"
              );
            }
          } catch (e) {
            console.error("Error marking events as errors:", e);
          }
        }
        
        // Show a user-friendly error message
        if (result.message && result.message.includes("calendar has been updated")) {
          // If calendar was updated, we'll return an empty array to show no events were created
          // This will trigger a toast message in the parent component
          console.log("Calendar has been updated since loading form, skipping recurring scheduling");
          onSuccess([]);
        } else if (result.message && (result.message.includes("conflicts") || result.message.includes("overlap"))) {
          // This should never happen with our new approach, but keeping it as a fallback
          throw new Error("Some of your selected times overlap with existing calendar events. Please try different dates or times.");
        } else {
          throw new Error(result.message || "We couldn't schedule your recurring workouts. Please try again later.");
        }
      }
    } catch (error) {
      // Mark any pending events as errors
      if (user?.firebaseUid && tempEventIds.length > 0) {
        try {
          for (const tempId of tempEventIds) {
            await markEventSyncError(
              user.firebaseUid,
              tempId,
              error instanceof Error ? error.message : "Unknown error during recurring event creation"
            );
          }
        } catch (e) {
          console.error("Error marking events as errors:", e);
        }
      }
      
      toast({
        title: "Error creating recurring workouts",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format times for display
  const displayDateTime = formatDateTimeRange(new Date(startTime), new Date(endTime));
  
  // Calculate default end date (1 month from now)
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1);

  return (
    <div className="space-y-4">
      <div className="bg-muted p-3 rounded-md mb-4">
        <h3 className="text-base font-medium">{workoutName}</h3>
        <p className="text-sm text-muted-foreground">First occurrence: {displayDateTime}</p>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Repeat Pattern</h3>
        <RadioGroup value={pattern} onValueChange={(v) => setPattern(v as RecurrencePattern)} className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="weekly" id="weekly" />
            <Label htmlFor="weekly">Weekly</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="biweekly" id="biweekly" />
            <Label htmlFor="biweekly">Every 2 Weeks</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly">Monthly</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">End After</h3>
        <RadioGroup value={endType} onValueChange={(v) => setEndType(v as "occurrences" | "date")} className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="occurrences" id="occurrences" />
            <Label htmlFor="occurrences" className="flex items-center gap-2">
              <span>Occurrences:</span>
              <Input
                type="number"
                min="1"
                max="24"
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value) || 4)}
                disabled={endType !== "occurrences"}
                className="w-16 h-8"
              />
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="date" id="end-date" />
            <Label htmlFor="end-date" className="flex items-center gap-2">
              <span>End Date:</span>
              <Popover open={datePopoverOpen && endType === "date"} onOpenChange={(open) => setDatePopoverOpen(open)}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={endType !== "date"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDate(endDate) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setDatePopoverOpen(false);
                    }}
                    disabled={(date) => date < initialDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-2 border-t pt-4 mt-4">
        <h3 className="text-sm font-medium mb-2">Skip Specific Dates (Optional)</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {excludedDates.map((date, i) => (
            <div key={i} className="bg-muted text-sm rounded-full px-3 py-1 flex items-center">
              {formatDate(date)}
              <button
                className="ml-1 text-muted-foreground hover:text-destructive"
                onClick={() => setExcludedDates(excludedDates.filter((_, index) => index !== i))}
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
          {excludedDates.length === 0 && (
            <p className="text-sm text-muted-foreground">No exclusions set</p>
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Add Exclusion Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              onSelect={(date) => {
                if (date) {
                  setExcludedDates([...excludedDates, date]);
                }
              }}
              disabled={(date) => date < initialDate || excludedDates.some(d => d.toDateString() === date.toDateString())}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Recurring Workouts"
          )}
        </Button>
      </div>
    </div>
  );
}