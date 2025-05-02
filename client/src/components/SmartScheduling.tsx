import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Clock, CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { findAvailableTimeSlots, TimeSlot } from "@/lib/calendar";
import TimeSlotComponent from "@/components/TimeSlot";
import SchedulingModal from "@/components/SchedulingModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function SmartScheduling() {
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedTimeSlots, setRecommendedTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    fetchTimeSlots();
  }, []);
  
  const fetchTimeSlots = async () => {
    setIsLoading(true);
    try {
      const slots = await findAvailableTimeSlots();
      setRecommendedTimeSlots(slots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSchedule = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setIsModalOpen(true);
  };
  
  const handleViewAllSlots = () => {
    // This would normally navigate to a more detailed view
    console.log("View all slots clicked");
  };
  
  const handleAddManually = () => {
    setIsModalOpen(true);
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Smart Scheduling</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary text-sm flex items-center"
            onClick={fetchTimeSlots}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-600 mb-4">Based on your calendar, here are the best times for your workout today:</p>
        
        <div className="space-y-3 mb-4">
          {isLoading ? (
            // Loading skeletons
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : recommendedTimeSlots.length > 0 ? (
            // Render time slots
            recommendedTimeSlots.map((slot, index) => (
              <TimeSlotComponent
                key={index}
                timeSlot={slot}
                onSchedule={handleSchedule}
              />
            ))
          ) : (
            // No time slots found
            <div className="text-center py-6 text-gray-500">
              No available time slots found for today.
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={fetchTimeSlots}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary text-sm flex items-center"
            onClick={handleViewAllSlots}
          >
            <Clock className="h-4 w-4 mr-1" />
            View all available slots
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-primary text-sm flex items-center"
            onClick={handleAddManually}
          >
            <CalendarPlus className="h-4 w-4 mr-1" />
            Add manually
          </Button>
        </div>
      </CardContent>
      
      {isModalOpen && (
        <SchedulingModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </Card>
  );
}
