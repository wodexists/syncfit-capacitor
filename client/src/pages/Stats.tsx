import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { formatDateTimeRange } from "@/lib/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface StatsProps {
  user: User | null;
}

export default function Stats({ user }: StatsProps) {
  // Fetch scheduled workouts
  const { data: scheduledWorkouts, isLoading } = useQuery({
    queryKey: ['/api/scheduled-workouts'],
  });
  
  // This would be real data in a production app
  const sampleWorkoutFrequencyData = [
    { name: 'Mon', workouts: 1 },
    { name: 'Tue', workouts: 2 },
    { name: 'Wed', workouts: 0 },
    { name: 'Thu', workouts: 3 },
    { name: 'Fri', workouts: 1 },
    { name: 'Sat', workouts: 2 },
    { name: 'Sun', workouts: 0 },
  ];
  
  const sampleWorkoutTypeData = [
    { name: 'Cardio', count: 5 },
    { name: 'Strength', count: 8 },
    { name: 'Yoga', count: 3 },
    { name: 'HIIT', count: 6 },
    { name: 'Other', count: 2 },
  ];
  
  const sampleWeeklyDurationData = [
    { name: 'Week 1', duration: 120 },
    { name: 'Week 2', duration: 150 },
    { name: 'Week 3', duration: 90 },
    { name: 'Week 4', duration: 180 },
  ];
  
  // Sample data for the calendar heatmap
  // In a real app, this would come from actual user data
  const calendarData = Array.from({ length: 120 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    return {
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 5) // 0-4 range for demonstration
    };
  });
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-4">Your Workout Stats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scheduledWorkouts ? scheduledWorkouts.length : '-'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5</div>
            <p className="text-xs text-green-500">+2 from last week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">3 days</div>
            <p className="text-xs text-gray-500">Keep it up!</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Workout Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sampleWorkoutFrequencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="workouts" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Workout Duration Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sampleWeeklyDurationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="hsl(var(--primary))" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap data={calendarData} />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workout Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sampleWorkoutTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="completed">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              </TabsList>
              
              <TabsContent value="completed">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : scheduledWorkouts && scheduledWorkouts.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledWorkouts
                      .filter((workout: any) => workout.isCompleted)
                      .slice(0, 5)
                      .map((workout: any) => (
                        <div key={workout.id} className="flex justify-between text-sm border-b pb-2">
                          <span>{workout.workout.name}</span>
                          <span className="text-gray-500">
                            {formatDateTimeRange(
                              new Date(workout.startTime),
                              new Date(workout.endTime)
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No completed workouts yet.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="upcoming">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : scheduledWorkouts && scheduledWorkouts.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledWorkouts
                      .filter((workout: any) => !workout.isCompleted)
                      .slice(0, 5)
                      .map((workout: any) => (
                        <div key={workout.id} className="flex justify-between text-sm border-b pb-2">
                          <span>{workout.workout.name}</span>
                          <span className="text-gray-500">
                            {formatDateTimeRange(
                              new Date(workout.startTime),
                              new Date(workout.endTime)
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No upcoming workouts scheduled.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
