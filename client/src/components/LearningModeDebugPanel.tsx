import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, BarChart, ArrowDownUp, RefreshCw, Info, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

interface SlotStat {
  id: number;
  userId: number;
  slotId: string;
  totalScheduled: number;
  totalCompleted: number;
  totalCancelled: number;
  successRate: number;
  lastUsed: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
  '8:00 PM', '9:00 PM'
];

function formatSlotId(slotId: string): string {
  try {
    const [day, hour] = slotId.split('_');
    const dayIndex = parseInt(day);
    const dayString = isNaN(dayIndex) ? day : DAYS[dayIndex];
    const hourInt = parseInt(hour);
    
    if (isNaN(hourInt)) return slotId; // Invalid format, return original
    
    const hourString = hourInt < 12 
      ? `${hourInt === 0 ? 12 : hourInt}:00 AM` 
      : `${hourInt === 12 ? 12 : hourInt - 12}:00 PM`;
    
    return `${dayString}, ${hourString}`;
  } catch (e) {
    return slotId; // If any errors, return the original
  }
}

function getScoreColor(successRate: number): string {
  if (successRate >= 80) return "text-green-600";
  if (successRate >= 50) return "text-amber-600";
  if (successRate >= 30) return "text-orange-600";
  return "text-red-600";
}

function formatDate(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LearningModeDebugPanel() {
  const [slotStats, setSlotStats] = useState<SlotStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<string>("successRate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  // Fetch slot statistics when component mounts
  useEffect(() => {
    fetchSlotStats();
  }, []);

  const fetchSlotStats = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/slot-stats');
      const data = await response.json();
      
      if (data.success) {
        setSlotStats(data.slotStats || []);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch learning mode statistics",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching slot stats:', error);
      toast({
        title: "Error",
        description: "An error occurred while fetching learning mode statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sort the slot stats based on selected field and direction
  const sortedStats = [...slotStats].sort((a, b) => {
    // Handle different field types
    let valueA, valueB;
    
    if (sortField === "slotId") {
      valueA = a.slotId;
      valueB = b.slotId;
      // String comparison
      return sortDirection === "asc" 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    } else if (sortField === "lastUsed") {
      valueA = new Date(a.lastUsed || 0).getTime();
      valueB = new Date(b.lastUsed || 0).getTime();
    } else {
      valueA = a[sortField as keyof SlotStat] || 0;
      valueB = b[sortField as keyof SlotStat] || 0;
    }
    
    return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
  });

  // Toggle sort direction and field
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending when changing fields
    }
  };

  // Simulate a slot usage
  const simulateSlotUsage = async (action: 'scheduled' | 'completed' | 'cancelled', slotId: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/slot-stats/record', {
        slotId,
        action
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Simulation Success",
          description: `Successfully simulated ${action} for slot ${formatSlotId(slotId)}`,
        });
        // Refresh the stats
        fetchSlotStats();
      } else {
        toast({
          title: "Simulation Error",
          description: data.message || `Failed to simulate ${action}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error simulating ${action}:`, error);
      toast({
        title: "Simulation Error",
        description: `An error occurred while simulating ${action}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all slot stats (for testing)
  const resetAllSlotStats = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/slot-stats/reset', {});
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Reset Success",
          description: "Successfully reset all learning mode statistics",
        });
        // Clear local state and refetch
        setSlotStats([]);
        setTimeout(fetchSlotStats, 500);
      } else {
        toast({
          title: "Reset Error",
          description: data.message || "Failed to reset learning mode statistics",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting slot stats:', error);
      toast({
        title: "Reset Error",
        description: "An error occurred while resetting learning mode statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsResetConfirmOpen(false);
    }
  };

  // Reset a specific slot stat
  const resetSlotStat = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', `/api/slot-stats/${id}/reset`, {});
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Reset Success",
          description: "Successfully reset the selected time slot statistics",
        });
        // Refresh the stats
        fetchSlotStats();
      } else {
        toast({
          title: "Reset Error",
          description: data.message || "Failed to reset the selected time slot statistics",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting slot stat:', error);
      toast({
        title: "Reset Error",
        description: "An error occurred while resetting the selected time slot statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedSlotId(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              Learning Mode Statistics
            </CardTitle>
            <CardDescription>
              Debug panel for intelligent scheduling data
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchSlotStats}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Reset All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset All Learning Data?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete all learning history and statistics. 
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsResetConfirmOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={resetAllSlotStats} disabled={isLoading}>
                    Yes, Reset Everything
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {slotStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No learning data available yet.</p>
            <p className="text-sm mt-2">Start scheduling workouts to generate statistics</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableCaption>
                Learning data for time slot recommendations
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px] cursor-pointer" onClick={() => handleSort("slotId")}>
                    <div className="flex items-center">
                      Time Slot
                      {sortField === "slotId" && (
                        <ArrowDownUp className={`h-4 w-4 ml-1 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort("totalScheduled")}>
                    <div className="flex items-center justify-center">
                      Scheduled
                      {sortField === "totalScheduled" && (
                        <ArrowDownUp className={`h-4 w-4 ml-1 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort("totalCompleted")}>
                    <div className="flex items-center justify-center">
                      Completed
                      {sortField === "totalCompleted" && (
                        <ArrowDownUp className={`h-4 w-4 ml-1 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort("successRate")}>
                    <div className="flex items-center justify-center">
                      Success Rate
                      {sortField === "successRate" && (
                        <ArrowDownUp className={`h-4 w-4 ml-1 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer" onClick={() => handleSort("lastUsed")}>
                    <div className="flex items-center justify-center">
                      Last Used
                      {sortField === "lastUsed" && (
                        <ArrowDownUp className={`h-4 w-4 ml-1 ${sortDirection === "desc" ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">
                      {formatSlotId(stat.slotId)}
                    </TableCell>
                    <TableCell className="text-center">
                      {stat.totalScheduled}
                    </TableCell>
                    <TableCell className="text-center">
                      {stat.totalCompleted}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getScoreColor(stat.successRate)}>
                        {stat.successRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(stat.lastUsed)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <Info className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Time Slot: {formatSlotId(stat.slotId)}</DialogTitle>
                              <DialogDescription>
                                Historical data for this time slot
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="flex flex-col">
                                  <span className="text-2xl font-bold">{stat.totalScheduled}</span>
                                  <span className="text-xs text-muted-foreground">Scheduled</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-2xl font-bold">{stat.totalCompleted}</span>
                                  <span className="text-xs text-muted-foreground">Completed</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-2xl font-bold">{stat.totalCancelled}</span>
                                  <span className="text-xs text-muted-foreground">Cancelled</span>
                                </div>
                              </div>
                              
                              <div className="text-center">
                                <span className={`text-3xl font-bold ${getScoreColor(stat.successRate)}`}>
                                  {stat.successRate}%
                                </span>
                                <span className="block text-xs text-muted-foreground">Success Rate</span>
                              </div>

                              <Separator />
                              
                              <p className="text-sm text-center text-muted-foreground">
                                Add test data for this time slot:
                              </p>
                              
                              <div className="flex justify-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => simulateSlotUsage('scheduled', stat.slotId)}
                                  disabled={isLoading}
                                >
                                  + Scheduled
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => simulateSlotUsage('completed', stat.slotId)}
                                  disabled={isLoading}
                                >
                                  + Completed
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => simulateSlotUsage('cancelled', stat.slotId)}
                                  disabled={isLoading}
                                >
                                  + Cancelled
                                </Button>
                              </div>
                              
                              <Separator />
                              
                              <div className="flex justify-center">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      disabled={isLoading}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Reset Slot
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Reset This Time Slot?</DialogTitle>
                                      <DialogDescription>
                                        This will permanently delete all learning history for {formatSlotId(stat.slotId)}.
                                        This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline">Cancel</Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => resetSlotStat(stat.id)}
                                        disabled={isLoading}
                                      >
                                        Yes, Reset Slot
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Select
                          onValueChange={(value) => simulateSlotUsage(value as any, stat.slotId)}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-7 w-[110px]">
                            <SelectValue placeholder="Simulate" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">+ Scheduled</SelectItem>
                            <SelectItem value="completed">+ Completed</SelectItem>
                            <SelectItem value="cancelled">+ Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}