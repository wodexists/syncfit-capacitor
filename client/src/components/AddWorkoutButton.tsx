import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SchedulingModal from "@/components/SchedulingModal";
import { Workout } from "@/lib/workouts";

interface AddWorkoutButtonProps {
  selectedWorkout?: Workout;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
  label?: string;
  className?: string;
}

export default function AddWorkoutButton({
  selectedWorkout,
  variant = "default",
  size = "default",
  showIcon = true,
  label = "Add Workout",
  className = ""
}: AddWorkoutButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {showIcon && <Plus className="h-4 w-4 mr-2" />}
        {label}
      </Button>

      <SchedulingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedWorkout={selectedWorkout}
      />
    </>
  );
}