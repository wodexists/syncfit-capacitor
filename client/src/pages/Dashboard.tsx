import SmartScheduling from "@/components/SmartScheduling";
import UpcomingWorkouts from "@/components/UpcomingWorkouts";
import CalendarIntegration from "@/components/CalendarIntegration";
import AvailabilityTimeline from "@/components/AvailabilityTimeline";
import { SyncStatus } from "../components/SyncStatus";
import { AdminSyncPanel } from "@/components/AdminSyncPanel";
import LearningModeToggle from "@/components/LearningModeToggle";
import LearningModeDebugPanel from "@/components/LearningModeDebugPanel";
import WorkoutReminderSettings from "@/components/WorkoutReminderSettings";

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
      {/* Calendar Sync Status */}
      <SyncStatus />
      
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
      
      {/* Settings Section */}
      <section id="workout-settings" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Workout Settings</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Learning Mode Toggle Component */}
          <LearningModeToggle userId={user?.id} />
          
          {/* Workout Reminder Settings Component */}
          <WorkoutReminderSettings />
        </div>
      </section>
      
      {/* Admin Sync Panel - Only visible to admins */}
      <AdminSyncPanel />
      
      {/* Learning Mode Debug Panel - Only visible to admins */}
      {user?.email?.includes('admin') && (
        <section id="learning-debug" className="mb-8">
          <LearningModeDebugPanel />
        </section>
      )}
    </div>
  );
}
