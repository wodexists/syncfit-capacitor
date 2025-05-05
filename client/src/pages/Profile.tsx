import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/lib/firebase";
import { LogOut, Save } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface ProfileProps {
  user: User | null;
}

// Preferences form schema
const preferencesFormSchema = z.object({
  preferredWorkoutDuration: z.string().min(1, "Please select a preferred workout duration"),
  preferredCategories: z.array(z.string()).min(1, "Please select at least one category"),
  preferredWorkoutTimes: z.array(z.string()).optional(),
  morningWorkouts: z.boolean().default(false),
  afternoonWorkouts: z.boolean().default(false),
  eveningWorkouts: z.boolean().default(false),
  defaultTimeHorizon: z.string().min(1, "Please select a default time horizon"),
});

type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;

export default function Profile({ user }: ProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch workout categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ['/api/workout-categories'],
  });

  // Fetch user preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery<any>({
    queryKey: ['/api/user-preferences'],
  });

  // Transform user preferences for the form
  const getDefaultValues = (): PreferencesFormValues => {
    if (!preferences) {
      return {
        preferredWorkoutDuration: "30",
        preferredCategories: [],
        preferredWorkoutTimes: [],
        morningWorkouts: false,
        afternoonWorkouts: false,
        eveningWorkouts: false,
        defaultTimeHorizon: "1",
      };
    }

    let preferredCategories: string[] = [];
    if (preferences.preferredCategories) {
      try {
        preferredCategories = JSON.parse(preferences.preferredCategories);
      } catch (e) {
        console.error("Error parsing preferred categories:", e);
      }
    }

    let preferredTimes: string[] = [];
    let morningWorkouts = false;
    let afternoonWorkouts = false;
    let eveningWorkouts = false;

    if (preferences.preferredWorkoutTimes) {
      try {
        preferredTimes = JSON.parse(preferences.preferredWorkoutTimes);
        morningWorkouts = preferredTimes.includes("morning");
        afternoonWorkouts = preferredTimes.includes("afternoon");
        eveningWorkouts = preferredTimes.includes("evening");
      } catch (e) {
        console.error("Error parsing preferred workout times:", e);
      }
    }

    return {
      preferredWorkoutDuration: preferences.preferredWorkoutDuration?.toString() || "30",
      preferredCategories: preferredCategories.map(String),
      preferredWorkoutTimes: preferredTimes,
      morningWorkouts,
      afternoonWorkouts,
      eveningWorkouts,
      defaultTimeHorizon: preferences.defaultTimeHorizon?.toString() || "1",
    };
  };

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: getDefaultValues(),
  });

  // Update form values when preferences load
  useForm({
    values: preferencesLoading ? undefined : getDefaultValues(),
  });

  const onSubmit = async (data: PreferencesFormValues) => {
    try {
      setIsLoading(true);

      // Prepare workout times based on checkboxes
      const preferredWorkoutTimes: string[] = [];
      if (data.morningWorkouts) preferredWorkoutTimes.push("morning");
      if (data.afternoonWorkouts) preferredWorkoutTimes.push("afternoon");
      if (data.eveningWorkouts) preferredWorkoutTimes.push("evening");

      // Send to API
      await apiRequest('/api/user-preferences', 'POST', {
        preferredWorkoutDuration: parseInt(data.preferredWorkoutDuration),
        preferredCategories: JSON.stringify(data.preferredCategories),
        preferredWorkoutTimes: JSON.stringify(preferredWorkoutTimes),
        defaultTimeHorizon: parseInt(data.defaultTimeHorizon),
      });

      toast({
        title: "Preferences updated",
        description: "Your workout preferences have been saved successfully.",
      });

      // Invalidate queries that depend on user preferences
      queryClient.invalidateQueries({ queryKey: ['/api/user-preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workouts/recommended'] });

    } catch (error) {
      toast({
        title: "Failed to update preferences",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const success = await signOut();
    if (success) {
      toast({
        title: "Logged out successfully",
        duration: 3000,
      });
    } else {
      toast({
        title: "Failed to log out",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Profile</h2>

        {/* User Profile Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Manage your account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="md:w-1/4 flex flex-col items-center">
                {user?.profilePicture ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary mb-2">
                    <img
                      src={user.profilePicture}
                      alt={`${user.username}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl bg-primary mb-2">
                    {user?.username?.charAt(0) || "U"}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-2 text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>

              <div className="md:w-3/4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FormLabel>Username</FormLabel>
                      <Input value={user?.username || ""} disabled />
                    </div>
                    <div>
                      <FormLabel>Email</FormLabel>
                      <Input value={user?.email || ""} disabled />
                    </div>
                  </div>
                  <div>
                    <FormLabel>Google Account</FormLabel>
                    <div className="flex items-center mt-1">
                      <div className="h-5 w-5 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm">Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Integration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Calendar Integration</CardTitle>
            <CardDescription>
              Manage your calendar connections and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Google Calendar</h3>
                <div className="flex items-center mb-4">
                  <div className="h-5 w-5 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Connected</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Calendar Selection</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Choose which calendars to consider when finding available workout times
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = '/calendar-selection'}
                      className="w-full"
                    >
                      Manage Calendars
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Reminder Settings</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Customize how and when you receive workout reminders
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = '/reminder-settings'}
                      className="w-full"
                    >
                      Manage Reminders
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workout Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Preferences</CardTitle>
            <CardDescription>
              Customize your workout experience and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preferencesLoading || categoriesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="preferredWorkoutDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Workout Duration</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full md:w-1/3">
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose your typical workout duration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Preferred Time of Day</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <FormField
                        control={form.control}
                        name="morningWorkouts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Morning</FormLabel>
                              <FormDescription>
                                6:00 AM - 12:00 PM
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="afternoonWorkouts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Afternoon</FormLabel>
                              <FormDescription>
                                12:00 PM - 5:00 PM
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="eveningWorkouts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Evening</FormLabel>
                              <FormDescription>
                                5:00 PM - 10:00 PM
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="preferredCategories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Workout Types</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {categories && categories.map((category: any) => (
                            <FormItem
                              key={category.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
                                  checked={field.value?.includes(category.id.toString())}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const categoryId = category.id.toString();
                                    const updatedValues = checked
                                      ? [...field.value, categoryId]
                                      : field.value.filter((id) => id !== categoryId);
                                    field.onChange(updatedValues);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {category.name}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </div>
                        <FormDescription>
                          Select the types of workouts you enjoy
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultTimeHorizon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Search Time Horizon</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full md:w-1/3">
                              <SelectValue placeholder="Select time horizon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Today only</SelectItem>
                            <SelectItem value="2">Up to 2 days</SelectItem>
                            <SelectItem value="3">Up to 3 days</SelectItem>
                            <SelectItem value="5">Up to 5 days</SelectItem>
                            <SelectItem value="7">Up to a week</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How many days ahead should we look for workout slots if today is too busy?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Save className="mr-2 h-4 w-4" />
                          Save Preferences
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
