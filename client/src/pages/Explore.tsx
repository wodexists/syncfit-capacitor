import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import WorkoutCard from "@/components/WorkoutCard";
import { FilterIcon, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface ExploreProps {
  user: User | null;
}

export default function Explore({ user }: ExploreProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Fetch workouts
  const { data: workouts, isLoading: workoutsLoading } = useQuery({
    queryKey: ['/api/workouts'],
  });
  
  // Fetch workout categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/workout-categories'],
  });
  
  // Fetch recommended workouts
  const { data: recommendedWorkouts, isLoading: recommendedLoading } = useQuery({
    queryKey: ['/api/workouts/recommended'],
  });
  
  // Filter workouts based on search and category
  const filteredWorkouts = workouts ? workouts.filter((workout: any) => {
    const matchesSearch = !searchQuery || 
      workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || workout.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) : [];
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Explore Workouts</h2>
        
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search workouts..."
              className="pl-8 pr-4 py-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button variant="outline" size="icon">
            <FilterIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
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
          categories && categories.map((category: any) => (
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
      
      {/* Recommended Workouts */}
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
          ) : (
            recommendedWorkouts && recommendedWorkouts.slice(0, 3).map((workout: any) => (
              <WorkoutCard key={workout.id} workout={workout} isRecommended={true} />
            ))
          )}
        </div>
      </div>
      
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
            filteredWorkouts.map((workout: any) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No workouts found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
