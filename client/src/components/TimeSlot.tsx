import { Button } from "@/components/ui/button";
import { PlusIcon, Sparkles, Star } from "lucide-react";
import { TimeSlot } from "@/lib/calendar";
import { format, parseISO } from "date-fns";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimeSlotProps {
  timeSlot: TimeSlot;
  onSchedule: (timeSlot: TimeSlot) => void;
}

export default function TimeSlotComponent({ timeSlot, onSchedule }: TimeSlotProps) {
  const handleSchedule = () => {
    onSchedule(timeSlot);
  };

  // Format the time range
  const formatTimeRange = () => {
    const start = parseISO(timeSlot.start);
    const end = parseISO(timeSlot.end);
    
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  // Determine if it's a recommended slot
  const isRecommended = timeSlot.isRecommended === true;
  
  // Determine the border and background based on recommendation status
  const slotClasses = isRecommended 
    ? "border-2 border-primary/50 bg-primary/5 shadow-sm" 
    : "border border-border";

  return (
    <div className={`calendar-time-slot rounded-md p-3 flex justify-between items-center ${slotClasses} hover:shadow-md transition-all`}>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{formatTimeRange()}</span>
          {isRecommended && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Recommended based on your successful workout history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {timeSlot.score !== undefined && timeSlot.score > 7 && !isRecommended && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Star className="h-4 w-4 text-blue-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">A good time based on your preferences</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {timeSlot.label && <p className="text-xs text-muted-foreground">{timeSlot.label}</p>}
      </div>
      <Button 
        onClick={handleSchedule}
        size="sm"
        variant={isRecommended ? "default" : "outline"}
        className="px-3 py-1 rounded-md text-sm flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        Schedule
      </Button>
    </div>
  );
}
