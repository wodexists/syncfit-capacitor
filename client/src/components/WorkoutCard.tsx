import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatWorkoutDuration, formatRating, type Workout } from "@/lib/workouts";
import { PlusCircle, Star } from "lucide-react";
import { useState } from "react";
import SchedulingModal from "./SchedulingModal";

interface WorkoutCardProps {
  workout: Workout;
  isRecommended?: boolean;
}

export default function WorkoutCard({ workout, isRecommended = false }: WorkoutCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <Card className={`overflow-hidden ${isRecommended ? 'workout-recommended' : ''}`}>
      <div className="relative h-40">
        <img 
          src={workout.imageUrl} 
          alt={workout.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full px-2 py-1 text-xs">
          {formatWorkoutDuration(workout.duration)}
        </div>
      </div>
      
      <CardContent className="p-4">
        <h4 className="font-medium">{workout.name}</h4>
        <p className="text-sm text-gray-600 mt-1">{workout.description}</p>
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm ml-1">{formatRating(workout.rating)}</span>
            <span className="text-xs text-gray-500 ml-1">({workout.ratingCount})</span>
          </div>
          
          <Button 
            variant="ghost"
            size="sm" 
            className="text-primary text-sm flex items-center"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            type="button"
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Schedule
          </Button>
        </div>
      </CardContent>
      
      {isModalOpen && (
        <SchedulingModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          selectedWorkout={workout}
        />
      )}
    </Card>
  );
}
