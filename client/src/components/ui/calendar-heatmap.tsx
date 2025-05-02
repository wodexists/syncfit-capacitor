import { HTMLAttributes, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CalendarHeatmapProps extends HTMLAttributes<HTMLDivElement> {
  data: Array<{
    date: string;
    value: number;
  }>;
  colorRange?: string[];
  monthsToShow?: number;
}

export function CalendarHeatmap({
  data,
  colorRange = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  monthsToShow = 6,
  className,
  ...props
}: CalendarHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Logic for rendering the calendar heatmap using SVG could go here
    // For a complete implementation, you would use D3.js or a similar library
    // This is a placeholder component for the workout frequency visualization
    
    // Example implementation:
    // 1. Group data by month and day
    // 2. Create a grid of squares (7 rows for days of week, columns for each week)
    // 3. Color each square based on the value for that day
    // 4. Add month labels on top
    // 5. Add day of week labels on the left
    
  }, [data, colorRange, monthsToShow]);
  
  return (
    <div 
      ref={containerRef}
      className={cn("w-full overflow-x-auto", className)}
      {...props}
    >
      <div className="text-sm text-center text-gray-500 mb-2">
        Workout Frequency (Last {monthsToShow} Months)
      </div>
      <div className="h-[120px] bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center text-gray-400">
        Calendar heatmap visualization goes here
      </div>
      <div className="flex justify-end mt-2">
        <div className="flex items-center text-xs space-x-1">
          <span>Less</span>
          {colorRange.map((color, i) => (
            <div 
              key={i}
              style={{ backgroundColor: color }}
              className="w-3 h-3"
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
