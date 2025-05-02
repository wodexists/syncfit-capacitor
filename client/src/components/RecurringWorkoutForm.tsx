import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Calendar as CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RecurringWorkoutFormProps {
  workoutName: string;
  startTime: string;
  endTime: string;
  onSuccess: (events: any) => void;
  onCancel: () => void;
}

interface RecurringPattern {
  frequency: 'daily' | 'weekly';
  daysOfWeek?: number[];
  interval?: number;
  count?: number;
  endDate?: string;
}

export default function RecurringWorkoutForm({
  workoutName,
  startTime,
  endTime,
  onSuccess,
  onCancel
}: RecurringWorkoutFormProps) {
  const [pattern, setPattern] = useState<RecurringPattern>({
    frequency: 'weekly',
    daysOfWeek: [new Date(startTime).getDay()],
    count: 4
  });
  const [endType, setEndType] = useState<'count' | 'date'>('count');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const { toast } = useToast();

  // Map day numbers to day names
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  // Create mutation for recurring workouts
  const createRecurringMutation = useMutation({
    mutationFn: async (recurringPattern: RecurringPattern) => {
      const response = await apiRequest('/api/calendar/create-recurring-events', 'POST', {
        workoutName,
        startTime,
        endTime,
        pattern: recurringPattern
      });
      
      // Parse the JSON response
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Recurring workouts scheduled",
        description: `Successfully created ${data.count} recurring workouts`,
        variant: "default",
      });
      
      onSuccess(data.events);
    },
    onError: (error) => {
      toast({
        title: "Error scheduling workouts",
        description: "There was a problem creating your recurring workouts",
        variant: "destructive",
      });
      console.error('Error creating recurring workouts:', error);
    }
  });

  const handleFrequencyChange = (value: string) => {
    if (value === 'daily' || value === 'weekly') {
      setPattern(prev => ({ ...prev, frequency: value }));
    }
  };

  const handleDayToggle = (day: number, checked: boolean) => {
    setPattern(prev => {
      const days = prev.daysOfWeek || [];
      if (checked) {
        return { ...prev, daysOfWeek: [...days, day].sort() };
      } else {
        return { ...prev, daysOfWeek: days.filter(d => d !== day) };
      }
    });
  };

  const handleCountChange = (value: string) => {
    const count = parseInt(value);
    if (!isNaN(count) && count > 0) {
      setPattern(prev => ({ ...prev, count }));
    }
  };

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value);
    if (!isNaN(interval) && interval > 0) {
      setPattern(prev => ({ ...prev, interval }));
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      setPattern(prev => ({ ...prev, endDate: date.toISOString() }));
    } else {
      // Remove endDate if it's reset
      const { endDate, ...rest } = pattern;
      setPattern(rest);
    }
  };

  const handleEndTypeChange = (value: string) => {
    if (value === 'count' || value === 'date') {
      setEndType(value);
      
      // Reset the other end type value
      if (value === 'count') {
        const { endDate, ...rest } = pattern;
        setPattern({ ...rest, count: 4 });
      } else {
        const { count, ...rest } = pattern;
        if (endDate) {
          setPattern({ ...rest, endDate: endDate.toISOString() });
        } else {
          setPattern(rest);
        }
      }
    }
  };

  const handleSubmit = () => {
    // Prepare the final pattern
    const finalPattern = { ...pattern };
    
    // Make sure to include only the relevant end type
    if (endType === 'count') {
      delete finalPattern.endDate;
    } else {
      delete finalPattern.count;
    }
    
    createRecurringMutation.mutate(finalPattern);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="weekly" onValueChange={handleFrequencyChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2">Repeat on</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`day-${index}`}
                          checked={pattern.daysOfWeek?.includes(index)}
                          onCheckedChange={(checked) => handleDayToggle(index, checked as boolean)}
                        />
                        <Label htmlFor={`day-${index}`}>{day.substring(0, 3)}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="interval" className="block mb-2">Every</Label>
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={String(pattern.interval || 1)}
                      onValueChange={handleIntervalChange}
                    >
                      <SelectTrigger id="interval" className="w-20">
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4].map(num => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>week(s)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="daily" className="pt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="interval" className="block mb-2">Every</Label>
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={String(pattern.interval || 1)}
                      onValueChange={handleIntervalChange}
                    >
                      <SelectTrigger id="interval" className="w-20">
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map(num => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>day(s)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="space-y-4">
        <Label>End</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id="end-count" 
              name="end-type" 
              value="count"
              checked={endType === 'count'}
              onChange={() => handleEndTypeChange('count')}
              className="h-4 w-4"
            />
            <Label htmlFor="end-count" className="flex items-center space-x-2">
              <span>After</span>
              <Input 
                id="count" 
                value={pattern.count || ''} 
                onChange={(e) => handleCountChange(e.target.value)}
                className="w-16 h-8" 
                disabled={endType !== 'count'}
              />
              <span>occurrences</span>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id="end-date" 
              name="end-type" 
              value="date"
              checked={endType === 'date'}
              onChange={() => handleEndTypeChange('date')}
              className="h-4 w-4"
            />
            <Label htmlFor="end-date" className="flex items-center space-x-2">
              <span>On date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-32 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    disabled={endType !== 'date'}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </Label>
          </div>
        </div>
      </div>
      
      <Separator className="my-4" />
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createRecurringMutation.isPending || 
            (pattern.frequency === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0))}
          className="flex items-center"
        >
          {createRecurringMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Create Recurring Workouts
            </>
          )}
        </Button>
      </div>
    </div>
  );
}