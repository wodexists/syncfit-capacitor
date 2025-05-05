import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SyncEvent, getAllSyncEvents, deleteTrackedEvent, retryEvent } from "@/lib/calendarSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function AdminSyncPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<SyncEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Check if user is admin - in a real application, this would be more robust
  const isAdmin = user?.email?.endsWith('@syncfit.io') || user?.email === 'admin@example.com';

  useEffect(() => {
    if (user?.firebaseUid && isAdmin) {
      fetchEvents();
    }
  }, [user?.firebaseUid, isAdmin]);

  const fetchEvents = async () => {
    if (!user?.firebaseUid) return;
    
    try {
      setLoading(true);
      const allEvents = await getAllSyncEvents(user.firebaseUid);
      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching sync events:", error);
      toast({
        title: "Error",
        description: "Failed to load sync events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!user?.firebaseUid) return;
    
    try {
      setProcessing(eventId);
      await deleteTrackedEvent(user.firebaseUid, eventId);
      
      toast({
        title: "Event deleted",
        description: "Sync event has been removed from tracking.",
        variant: "default",
      });
      
      // Refresh the events list
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the sync event.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRetry = async (eventId: string) => {
    if (!user?.firebaseUid) return;
    
    try {
      setProcessing(eventId);
      const success = await retryEvent(user.firebaseUid, eventId);
      
      if (success) {
        toast({
          title: "Retry successful",
          description: "Event has been successfully synced to Google Calendar.",
          variant: "default",
        });
      } else {
        toast({
          title: "Retry failed",
          description: "Unable to sync event to Google Calendar. Check event details.",
          variant: "destructive",
        });
      }
      
      // Refresh the events list
      fetchEvents();
    } catch (error) {
      console.error("Error retrying event:", error);
      toast({
        title: "Retry failed",
        description: "An error occurred while trying to retry the sync.",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleShowDetails = (event: SyncEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const filteredEvents = events.filter(event => {
    if (activeStatus === "all") return true;
    return event.status === activeStatus;
  });

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Calendar Sync Admin Panel</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchEvents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Administrative tools for debugging and managing calendar synchronization
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          defaultValue="all" 
          value={activeStatus}
          onValueChange={setActiveStatus}
          className="w-full"
        >
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all" className="flex-1">All Events ({events.length})</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">Pending ({events.filter(e => e.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="synced" className="flex-1">Synced ({events.filter(e => e.status === 'synced').length})</TabsTrigger>
            <TabsTrigger value="error" className="flex-1">Errors ({events.filter(e => e.status === 'error').length})</TabsTrigger>
            <TabsTrigger value="conflict" className="flex-1">Conflicts ({events.filter(e => e.status === 'conflict').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeStatus} className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading events...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {activeStatus === 'all' ? '' : activeStatus} events found
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <StatusBadge status={event.status} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-[200px]">{event.title}</div>
                          {event.errorMessage && (
                            <div className="flex items-center mt-1">
                              <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                              <span className="text-xs text-red-500 truncate max-w-[200px]">{event.errorMessage}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(event.createdAt), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(event.startTime), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleShowDetails(event)}
                            >
                              Details
                            </Button>
                            
                            {event.status === 'error' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRetry(event.id)}
                                disabled={!!processing}
                                className="text-blue-600"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${processing === event.id ? "animate-spin" : ""}`} />
                                Retry
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(event.id)}
                              disabled={!!processing}
                              className="text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Event Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about the calendar sync event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <h3 className="text-sm font-semibold mb-1">Title</h3>
                  <p className="text-sm">{selectedEvent.title}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-1">Status</h3>
                  <StatusBadge status={selectedEvent.status} />
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-1">Created At</h3>
                  <p className="text-sm">{format(new Date(selectedEvent.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-1">Updated At</h3>
                  <p className="text-sm">{format(new Date(selectedEvent.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-1">Start Time</h3>
                  <p className="text-sm">{format(new Date(selectedEvent.startTime), 'MMM d, yyyy h:mm a')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-1">End Time</h3>
                  <p className="text-sm">{format(new Date(selectedEvent.endTime), 'MMM d, yyyy h:mm a')}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold mb-1">Retry Count</h3>
                  <p className="text-sm">{selectedEvent.retryCount || 0}</p>
                </div>
                
                {selectedEvent.googleEventId && (
                  <div className="col-span-3">
                    <h3 className="text-sm font-semibold mb-1">Google Calendar Event ID</h3>
                    <p className="text-sm font-mono bg-muted p-2 rounded text-xs overflow-x-auto">
                      {selectedEvent.googleEventId}
                    </p>
                  </div>
                )}
                
                {selectedEvent.htmlLink && (
                  <div className="col-span-3">
                    <h3 className="text-sm font-semibold mb-1">Calendar Link</h3>
                    <a 
                      href={selectedEvent.htmlLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 flex items-center hover:underline"
                    >
                      Open in Google Calendar
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                )}
                
                {selectedEvent.errorMessage && (
                  <div className="col-span-3">
                    <h3 className="text-sm font-semibold mb-1">Error Message</h3>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                      {selectedEvent.errorMessage}
                    </p>
                  </div>
                )}
                
                <div className="col-span-3">
                  <h3 className="text-sm font-semibold mb-1">Event ID</h3>
                  <p className="text-sm font-mono bg-muted p-2 rounded text-xs">
                    {selectedEvent.id}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            {selectedEvent && selectedEvent.status === 'error' && (
              <Button 
                variant="default" 
                onClick={() => {
                  handleRetry(selectedEvent.id);
                  setDialogOpen(false);
                }}
                disabled={!!processing}
                className="mr-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processing ? "animate-spin" : ""}`} />
                Retry Sync
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending</Badge>;
    case 'synced':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Synced</Badge>;
    case 'error':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
    case 'conflict':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Conflict</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}