import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import SchedulingModal from "./SchedulingModal";
import { Skeleton } from "@/components/ui/skeleton";

interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  label: string;
}

export default function AvailabilityTimeline() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Fetch today's availability
  const { data: availabilitySlots, isLoading } = useQuery({
    queryKey: ['/api/calendar/today-availability'],
  });
  
  const formatTimeRange = (start: string, end: string) => {
    return `${format(parseISO(start), 'h:mm a')} - ${format(parseISO(end), 'h:mm a')}`;
  };
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Today's Availability</CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4 mt-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-300 ml-3 pl-4 pb-1">
            {availabilitySlots && availabilitySlots.map((slot: AvailabilitySlot, index: number) => (
              <div key={index} className="mb-3 relative">
                <div className="w-2 h-2 bg-gray-300 rounded-full absolute -left-[25px] top-[10px]"></div>
                <p className="text-sm font-medium">{formatTimeRange(slot.start, slot.end)}</p>
                <div className={`${slot.available ? 'calendar-time-slot' : 'calendar-busy-slot'} mt-1 p-2 rounded-md`}>
                  <p className="text-xs text-gray-600">{slot.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-3 flex justify-end">
          <Button 
            variant="ghost"
            className="text-primary flex items-center text-sm"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Schedule a workout
          </Button>
        </div>
        
        {isModalOpen && (
          <SchedulingModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </CardContent>
    </Card>
  );
}
