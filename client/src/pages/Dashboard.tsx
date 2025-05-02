import SmartScheduling from "@/components/SmartScheduling";
import UpcomingWorkouts from "@/components/UpcomingWorkouts";
import CalendarIntegration from "@/components/CalendarIntegration";
import AvailabilityTimeline from "@/components/AvailabilityTimeline";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface DashboardProps {
  user: User | null;
}

export default function Dashboard({ user }: DashboardProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Dashboard Section */}
      <section id="dashboard" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Today's Schedule</h2>
        
        {/* Smart Scheduling Component */}
        <SmartScheduling />
        
        {/* Upcoming Workouts Component */}
        <UpcomingWorkouts />
      </section>
      
      {/* Calendar Integration Section */}
      <section id="calendar-section" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Schedule</h2>
        
        {/* Calendar Integration Component */}
        <CalendarIntegration />
        
        {/* Availability Timeline Component */}
        <AvailabilityTimeline />
      </section>
    </div>
  );
}
