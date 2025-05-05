import { useEffect, useState } from "react";
import { Check, RefreshCw, Info, X, AlertCircle, AlertTriangle, RotateCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { getEventStatusCounts, retryFailedEvents } from "@/lib/calendarSync";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SyncCounts {
  total: number;
  pending: number;
  synced: number;
  error: number;
  conflict: number;
  success: number;
  lastSyncedAt?: Date;
}

export function SyncStatus() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncCounts, setSyncCounts] = useState<SyncCounts>({
    total: 0,
    pending: 0,
    synced: 0,
    error: 0,
    conflict: 0,
    success: 0,
    lastSyncedAt: undefined
  });
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchSyncStatus = async () => {
    if (user?.firebaseUid) {
      try {
        setLoading(true);
        const counts = await getEventStatusCounts(user.firebaseUid);
        setSyncCounts(counts);
      } catch (error) {
        console.error("Error fetching sync status:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.firebaseUid) {
      fetchSyncStatus();
      
      // Set up an interval to auto-refresh the sync status every 30 seconds
      const intervalId = setInterval(fetchSyncStatus, 30000);
      
      // Clear the interval when the component unmounts
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, user?.firebaseUid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSyncStatus();
    setRefreshing(false);
  };
  
  const handleRetry = async () => {
    if (!user?.firebaseUid) return;
    
    setRetrying(true);
    try {
      const retryCount = await retryFailedEvents(user.firebaseUid);
      
      if (retryCount > 0) {
        toast({
          title: "Retry successful",
          description: `Successfully retried ${retryCount} event${retryCount > 1 ? 's' : ''}.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No events retried",
          description: "No events were eligible for retry or all retries failed.",
          variant: "default",
        });
      }
      
      // Refresh the counts after retrying
      await fetchSyncStatus();
    } catch (error) {
      console.error("Error retrying events:", error);
      toast({
        title: "Retry failed",
        description: "There was a problem retrying the failed events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRetrying(false);
    }
  };

  // Don't show the component if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Don't show if there are no events tracked
  if (!loading && syncCounts.total === 0) {
    return null;
  }

  // Calculate progress percentage
  const syncedPercentage = syncCounts.total > 0 
    ? Math.round((syncCounts.synced / syncCounts.total) * 100) 
    : 0;

  return (
    <Card className="mb-6 p-4 relative overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-medium">Calendar Sync Status</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="max-w-xs">
                    This tracks the syncing status of your workouts with Google Calendar. 
                    Any errors will be automatically retried.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="ml-1">Refresh</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(!expanded)}
              className="h-8 px-2 text-muted-foreground"
            >
              {expanded ? "Hide Details" : "Show Details"}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${syncCounts.synced} of ${syncCounts.total} events synced with Google Calendar`}
          </span>
          <span className="text-sm font-medium">
            {syncedPercentage}%
          </span>
        </div>
        
        <Progress value={syncedPercentage} className="h-2" />
        
        {/* Last Synced Timestamp */}
        {syncCounts.lastSyncedAt && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center">
            <span>Last synced at {format(syncCounts.lastSyncedAt, 'MMM d, h:mm a')}</span>
            <span className="mx-2">•</span>
            <span>{syncCounts.synced} synced</span>
            {syncCounts.error > 0 && (
              <>
                <span className="mx-2">•</span>
                <span className="text-red-500">{syncCounts.error} errors</span>
              </>
            )}
            {syncCounts.conflict > 0 && (
              <>
                <span className="mx-2">•</span>
                <span className="text-amber-500">{syncCounts.conflict} conflicts</span>
              </>
            )}
          </div>
        )}
        
        {expanded && !loading && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex items-center justify-between border rounded-md p-2 bg-muted/50">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 mr-2">
                  <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm font-medium">Pending</span>
              </div>
              <span className="text-sm">{syncCounts.pending}</span>
            </div>
            
            <div className="flex items-center justify-between border rounded-md p-2 bg-muted/50">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 mr-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-sm font-medium">Synced</span>
              </div>
              <span className="text-sm">{syncCounts.synced}</span>
            </div>
            
            <div className="flex items-center justify-between border rounded-md p-2 bg-muted/50">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 mr-2">
                  <X className="h-3.5 w-3.5 text-red-600" />
                </div>
                <span className="text-sm font-medium">Errors</span>
              </div>
              <span className="text-sm">{syncCounts.error}</span>
            </div>
            
            <div className="flex items-center justify-between border rounded-md p-2 bg-muted/50">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 mr-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <span className="text-sm font-medium">Conflicts</span>
              </div>
              <span className="text-sm">{syncCounts.conflict}</span>
            </div>
          </div>
        )}
        
        {expanded && (syncCounts.error > 0 || syncCounts.conflict > 0) && (
          <div className="mt-3">
            {syncCounts.error > 0 && (
              <div className="flex items-start p-3 border rounded-md bg-yellow-50 border-yellow-200 mb-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">Some events failed to sync</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    We'll automatically retry syncing these events with Google Calendar. 
                    Check your calendar permissions if this persists.
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Button 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={handleRetry}
                      disabled={retrying}
                    >
                      {retrying ? (
                        <>
                          <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry Failed Events
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {syncCounts.conflict > 0 && (
              <div className="flex items-start p-3 border rounded-md bg-amber-50 border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Calendar conflicts detected</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Some events in your Google Calendar have been modified outside of SyncFit. 
                    These modifications won't be automatically overwritten.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}