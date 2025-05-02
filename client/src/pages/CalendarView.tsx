import CalendarIntegration from "@/components/CalendarIntegration";
import AvailabilityTimeline from "@/components/AvailabilityTimeline";
import SmartScheduling from "@/components/SmartScheduling";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface CalendarViewProps {
  user: User | null;
}

export default function CalendarView({ user }: CalendarViewProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-4">Calendar</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Main Calendar */}
          <CalendarIntegration />
        </div>
        
        <div>
          {/* Smart Scheduling */}
          <SmartScheduling />
          
          {/* Availability Timeline */}
          <AvailabilityTimeline />
        </div>
      </div>
    </div>
  );
}
