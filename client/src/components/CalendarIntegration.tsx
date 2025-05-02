import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CalendarEventDisplay {
  title: string;
  date: Date;
  isWorkout: boolean;
}

export default function CalendarIntegration() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  
  // Fetch scheduled workouts
  const { data: scheduledWorkouts } = useQuery({
    queryKey: ['/api/scheduled-workouts'],
  });
  
  // Helper functions for calendar navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());
  
  // Function to format events for display on the calendar
  const getEventsForDay = (day: Date): CalendarEventDisplay[] => {
    const events: CalendarEventDisplay[] = [];
    
    // Add scheduled workouts
    if (scheduledWorkouts) {
      scheduledWorkouts.forEach((workout: any) => {
        const workoutDate = new Date(workout.startTime);
        if (isSameDay(day, workoutDate)) {
          events.push({
            title: workout.workout.name,
            date: workoutDate,
            isWorkout: true,
          });
        }
      });
    }
    
    // In a real implementation, we would also fetch and add Google Calendar events here
    
    return events;
  };
  
  // Generate the days for the current month view
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const rows = [];
    let days = [];
    let day = startDate;
    
    // Create header row with day names
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    const renderDayHeader = () => {
      return (
        <div className="grid grid-cols-7 text-center border-b border-gray-200">
          {dayNames.map((dayName, index) => (
            <div key={index} className="p-2 border-r border-gray-200 last:border-r-0 text-sm font-medium">
              {dayName}
            </div>
          ))}
        </div>
      );
    };
    
    // Create calendar grid
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isToday(day);
        const dayEvents = getEventsForDay(day);
        
        days.push(
          <div 
            key={day.toString()} 
            className={cn(
              "border-r border-b border-gray-200 min-h-[100px] p-1 relative",
              !isCurrentMonth && "bg-gray-50"
            )}
          >
            <div className={cn(
              "text-right text-sm mb-1",
              !isCurrentMonth && "text-gray-400",
              isCurrentDay && "font-bold text-primary"
            )}>
              {formattedDate}
            </div>
            
            {dayEvents.map((event, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "text-xs rounded-sm p-1 mb-1 truncate",
                  event.isWorkout 
                    ? "bg-secondary text-white" 
                    : "bg-gray-100"
                )}
              >
                {event.title}
              </div>
            ))}
          </div>
        );
        
        day = addDays(day, 1);
      }
      
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 text-center">
          {days}
        </div>
      );
      
      days = [];
    }
    
    return (
      <>
        {renderDayHeader()}
        {rows}
      </>
    );
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-medium">{format(currentDate, 'MMMM yyyy')}</h3>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={goToToday}>Today</Button>
            
            <Button 
              variant={currentView === 'month' ? 'secondary' : 'outline'} 
              size="sm"
              onClick={() => setCurrentView('month')}
            >
              Month
            </Button>
            
            <Button 
              variant={currentView === 'week' ? 'secondary' : 'outline'} 
              size="sm"
              onClick={() => setCurrentView('week')}
            >
              Week
            </Button>
            
            <Button 
              variant={currentView === 'day' ? 'secondary' : 'outline'} 
              size="sm"
              onClick={() => setCurrentView('day')}
            >
              Day
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {renderCalendarDays()}
      </CardContent>
    </Card>
  );
}
