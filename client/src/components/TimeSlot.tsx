import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { TimeSlot } from "@/lib/calendar";
import { format, parseISO } from "date-fns";

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

  return (
    <div className="calendar-time-slot rounded-md p-3 flex justify-between items-center">
      <div>
        <span className="font-medium">{formatTimeRange()}</span>
        {timeSlot.label && <p className="text-xs text-gray-600">{timeSlot.label}</p>}
      </div>
      <Button 
        onClick={handleSchedule}
        size="sm"
        className="bg-primary text-white px-3 py-1 rounded-md text-sm flex items-center"
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        Schedule
      </Button>
    </div>
  );
}
