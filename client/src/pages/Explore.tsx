import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import WorkoutCard from "@/components/WorkoutCard";
import { FilterIcon, Search, Dumbbell, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Workout, WorkoutCategory } from "@/lib/workouts";
import AddWorkoutButton from "@/components/AddWorkoutButton";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface ExploreProps {
  user: User | null;
}

// Sample workout data for when API fails
const DEFAULT_WORKOUTS: Workout[] = [
  {
    id: 1,
    name: "Full Body HIIT",
    description: "High intensity interval training to burn calories and build strength",
    duration: 30,
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2940&auto=format&fit=crop",
    categoryId: 4,
    rating: 48,
    ratingCount: 245
  },
  {
    id: 2,
    name: "Morning Yoga Flow",
    description: "Start your day with energizing yoga sequences for flexibility",
    duration: 45,
    equipment: "Yoga mat",
    difficulty: "Beginner",
    imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=2940&auto=format&fit=crop",
    categoryId: 3,
    rating: 47,
    ratingCount: 187
  },
  {
    id: 3,
    name: "Core Strength Builder",
    description: "Develop a stronger core with this focused routine",
    duration: 25,
    equipment: "Mat, resistance bands",
    difficulty: "Intermediate",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2940&auto=format&fit=crop",
    categoryId: 2,
    rating: 45,
    ratingCount: 132
  }
];

// Sample categories data for when API fails
const DEFAULT_CATEGORIES: WorkoutCategory[] = [
  { id: 1, name: "Cardio", description: "Cardiovascular exercises" },
  { id: 2, name: "Strength", description: "Strength training exercises" },
  { id: 3, name: "Yoga", description: "Yoga practices" },
  { id: 4, name: "HIIT", description: "High-intensity interval training" }
];

export default function Explore({ user }: ExploreProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  console.log("Explore page rendering, user:", user);
  
  // Fetch workouts
  const { 
    data: workouts, 
    isLoading: workoutsLoading,
    error: workoutsError 
  } = useQuery<Workout[]>({
    queryKey: ['/api/workouts'],
    retry: 1,
  });

  // Fetch workout categories
  const { 
    data: categories, 
    isLoading: categoriesLoading,
    error: categoriesError 
  } = useQuery<WorkoutCategory[]>({
    queryKey: ['/api/workout-categories'],
    retry: 1,
  });
  
  // Fetch recommended workouts - only if user is authenticated
  const { 
    data: recommendedWorkouts, 
    isLoading: recommendedLoading,
    error: recommendedError
  } = useQuery<Workout[]>({
    queryKey: ['/api/workouts/recommended'],
    enabled: !!user, // Only run query if user is logged in
    retry: 1,
  });
  
  // Handle errors
  React.useEffect(() => {
    if (workoutsError) {
      console.error("Error fetching workouts");
      setHasError(true);
      toast({
        title: "Failed to load workouts",
        description: "Using sample data for now. Please try again later.",
        variant: "destructive",
      });
    }
    
    if (categoriesError) {
      console.error("Error fetching categories");
    }
    
    if (recommendedError) {
      console.error("Error fetching recommended workouts");
    }
  }, [workoutsError, categoriesError, recommendedError, toast]);

  // Use default data if API fails
  const workoutsData = workoutsError ? DEFAULT_WORKOUTS : workouts || [];
  const categoriesData = categoriesError ? DEFAULT_CATEGORIES : categories || [];
  const recommendedData = recommendedError ? DEFAULT_WORKOUTS.slice(0, 2) : recommendedWorkouts || [];
  
  // Filter workouts based on search and category
  const filteredWorkouts = workoutsData.filter((workout) => {
    const matchesSearch = !searchQuery || 
      workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || workout.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Log data for debugging
  useEffect(() => {
    console.log("Workouts loaded:", workouts?.length || 0);
    console.log("Categories loaded:", categories?.length || 0);
    console.log("Recommended workouts:", recommendedWorkouts?.length || 0);
  }, [workouts, categories, recommendedWorkouts]);
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Explore Workouts</h2>
          <p className="text-muted-foreground text-sm">Find your perfect workout routine</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search workouts..."
              className="pl-8 pr-4 py-2 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10">
              <FilterIcon className="h-4 w-4" />
            </Button>
            
            <AddWorkoutButton />
          </div>
        </div>
      </div>
      
      {hasError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem loading data from the server. Showing sample workouts instead.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Workout Categories */}
      <div className="flex items-center space-x-3 overflow-x-auto py-2 mb-4 no-scrollbar">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap rounded-full"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        
        {categoriesLoading ? (
          // Loading skeleton for categories
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        ) : (
          categoriesData.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap rounded-full"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))
        )}
      </div>
      
      {/* Recommended Workouts - only show if logged in */}
      {user && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Recommended For You</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedLoading ? (
              // Loading skeletons for recommended workouts
              <>
                <Skeleton className="h-80 w-full rounded-lg" />
                <Skeleton className="h-80 w-full rounded-lg" />
                <Skeleton className="h-80 w-full rounded-lg" />
              </>
            ) : recommendedData.length > 0 ? (
              recommendedData.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} isRecommended={true} />
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-gray-500">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No personalized recommendations available yet.</p>
                <p className="text-sm">Complete your profile preferences to get recommendations.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Popular/Filtered Workouts */}
      <div>
        <h3 className="text-lg font-medium mb-3">
          {selectedCategory ? "Filtered Workouts" : "Popular Workouts"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workoutsLoading ? (
            // Loading skeletons for workouts
            <>
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-80 w-full rounded-lg" />
              <Skeleton className="h-80 w-full rounded-lg" />
            </>
          ) : filteredWorkouts.length > 0 ? (
            filteredWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-gray-500">
              <p>No workouts found matching your criteria.</p>
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
