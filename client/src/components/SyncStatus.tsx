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
  const [initialLoad, setInitialLoad] = useState(true); // Track first load
  const [isAuthIssue, setIsAuthIssue] = useState(false); // Track if we're having auth issues
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
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
  const [connectivityIssue, setConnectivityIssue] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);

  const fetchSyncStatus = async () => {
    if (user?.firebaseUid) {
      try {
        setLoading(true);
        setConnectivityIssue(false);
        
        // Check if we have connectivity to Google APIs
        try {
          const response = await fetch('/api/calendar/calendars');
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              // This indicates an authentication or permission issue
              console.error("Calendar API access issue - Auth problem detected");
              setIsAuthIssue(true);
              
              // Make a more aggressive attempt to fix if we've already tried multiple times
              if (recoveryAttempts > 2) {
                console.log("Multiple recovery attempts failed, trying to refresh user session");
                // Forcefully clear and reset session here if implemented
              }
              
              setRecoveryAttempts(prev => prev + 1);
            } else {
              // This is more likely a network or general API issue
              console.error(`Calendar API access issue - HTTP ${response.status}`);
              setConnectivityIssue(true);
            }
          } else {
            // If we get here, we have API access, so reset error states
            setIsAuthIssue(false);
            setConnectivityIssue(false);
            setRecoveryAttempts(0);
          }
        } catch (error) {
          console.error("Error checking Google Calendar API status:", error);
          setConnectivityIssue(true);
        }
        
        // Update last checked timestamp
        setLastChecked(new Date());
        
        // Still try to get event counts even if we had API issues
        const counts = await getEventStatusCounts(user.firebaseUid);
        setSyncCounts(counts);
        
        // If we're past initial load and still have no events,
        // we might be in a "stalled state" which happens when Firebase
        // auth works but we don't have calendar access
        if (!initialLoad && counts.total === 0 && isAuthIssue) {
          console.log("Possible stalled state - authenticated but no calendar events found");
        }
      } catch (error) {
        console.error("Error fetching sync status:", error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
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
    } else {
      // Reset state when not authenticated
      setLoading(true);
      setIsAuthIssue(false);
      setConnectivityIssue(false);
      setRecoveryAttempts(0);
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

  // Always show the sync status for now, even when there are no events
  // This helps with debugging and provides better user feedback
  // if (!loading && syncCounts.total === 0) {
  //   return null;
  // }

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
          <span className="text-sm font-medium flex items-center">
            {loading ? (
              <span className="flex items-center text-amber-600">
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> 
                Syncing events with Google Calendar...
              </span>
            ) : syncCounts.error > 0 ? (
              <span className="flex items-center text-red-600">
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> 
                Error syncing {syncCounts.error} {syncCounts.error === 1 ? 'event' : 'events'} – <Button variant="link" className="p-0 h-auto text-red-600 underline" onClick={handleRetry}>Retry Now</Button>
              </span>
            ) : syncCounts.total === 0 ? (
              <span className="flex items-center text-slate-600">
                <Info className="h-3.5 w-3.5 mr-1" /> 
                No events to sync
              </span>
            ) : (
              <span className="flex items-center text-green-600">
                <Check className="h-3.5 w-3.5 mr-1" /> 
                Synced successfully ({syncCounts.synced} {syncCounts.synced === 1 ? 'event' : 'events'})
              </span>
            )}
          </span>
          {syncCounts.total > 0 && (
            <span className="text-sm font-medium">
              {syncedPercentage}%
            </span>
          )}
        </div>
        
        <Progress 
          value={syncedPercentage} 
          className={`h-2 ${
            loading ? 'bg-amber-100' : 
            syncCounts.error > 0 ? 'bg-red-100' : 
            'bg-green-100'
          }`} 
        />
        
        {/* Show a mini diagnostic log when syncing is in progress */}
        {loading && (
          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded-md p-2">
            <div className="flex items-center text-amber-800 font-medium mb-1">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Sync in progress
            </div>
            <div className="text-amber-700 space-y-1">
              <p>• Checking for pending events</p>
              <p>• Verifying Google Calendar access</p>
              <p>• Syncing new workouts</p>
            </div>
          </div>
        )}
        
        {/* Show connectivity issues */}
        {!loading && connectivityIssue && (
          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded-md p-2">
            <div className="flex items-center text-amber-800 font-medium mb-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Calendar connectivity issue detected
            </div>
            <div className="text-amber-700 space-y-1">
              <p>• We're having trouble connecting to Google Calendar</p>
              <p>• This might be a temporary network issue</p>
              <p>• Click refresh to try again, or check your internet connection</p>
            </div>
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                className="h-7 text-xs"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <>
                    <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Connection
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Show auth issues */}
        {!loading && isAuthIssue && (
          <div className="mt-2 text-xs bg-red-50 border border-red-200 rounded-md p-2">
            <div className="flex items-center text-red-800 font-medium mb-1">
              <X className="h-3 w-3 mr-1" />
              Calendar authentication issue
            </div>
            <div className="text-red-700 space-y-1">
              <p>• We can't access your Google Calendar</p>
              <p>• You may need to reconnect or grant calendar permissions</p>
              <p>• Try signing out and back in to reset your session</p>
            </div>
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => window.location.href = '/logout'}
              >
                Sign Out & Reconnect
              </Button>
            </div>
          </div>
        )}
        
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
                  
                  <div className="bg-yellow-100 p-2 rounded-md mt-2 text-xs text-yellow-800">
                    <p className="font-medium mb-1">Diagnostic Information:</p>
                    <div className="space-y-0.5">
                      <p>• Google Calendar API may be temporarily unavailable</p>
                      <p>• Your Google Calendar permission may need to be refreshed</p>
                      <p>• Network connectivity issues might be affecting synchronization</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-2 items-center">
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://calendar.google.com', '_blank');
                      }}
                    >
                      Check Google Calendar
                    </Button>
                    
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
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Calendar conflicts detected</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Some events in your Google Calendar have been modified outside of SyncFit. 
                    These modifications won't be automatically overwritten.
                  </p>
                  
                  <div className="bg-amber-100 p-2 rounded-md mt-2 text-xs text-amber-800">
                    <p className="font-medium mb-1">Possible Causes:</p>
                    <div className="space-y-0.5">
                      <p>• Event was edited directly in Google Calendar</p>
                      <p>• Another app modified your calendar events</p>
                      <p>• Event time was changed due to timezone differences</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-end">
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://calendar.google.com', '_blank');
                      }}
                    >
                      View in Google Calendar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Developer Diagnostics Panel (only shown in expanded mode) */}
        {expanded && (
          <div className="mt-3 border-t pt-3">
            <button 
              onClick={(e) => {
                e.preventDefault();
                const elem = document.getElementById('syncfit-diagnostics');
                if (elem) {
                  elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
                }
              }}
              className="text-xs flex items-center text-slate-600 hover:text-slate-900"
            >
              <Info className="h-3.5 w-3.5 mr-1" />
              Toggle Developer Diagnostics
            </button>
            
            <div id="syncfit-diagnostics" className="mt-2 bg-slate-50 border border-slate-200 rounded-md p-2 text-xs font-mono hidden">
              <p className="font-medium text-slate-700 mb-1">Sync State Diagnostic Log:</p>
              <div className="space-y-0.5 text-slate-600 max-h-64 overflow-y-auto">
                <p>Last API Call: {lastChecked?.toISOString() || 'Never'}</p>
                <p>Auth Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
                <p>Google Calendar Connectivity: {
                  connectivityIssue ? 'Error - Connection Problem' : 
                  isAuthIssue ? 'Error - Authentication Problem' :
                  'OK'
                }</p>
                <p>User ID: {user?.firebaseUid || 'Unknown'}</p>
                <p>Initial Load Complete: {initialLoad ? 'No' : 'Yes'}</p>
                <p>Recovery Attempts: {recoveryAttempts}</p>
                <p>Pending Retries: {syncCounts.error}</p>
                <p>Sync Counts: {JSON.stringify(syncCounts, null, 2)}</p>
                <p>Last Checked: {lastChecked?.toLocaleTimeString() || 'Never'}</p>
                <p>Session Health: {
                  isAuthenticated && user?.firebaseUid && !isAuthIssue ? 'Healthy' :
                  isAuthenticated && user?.firebaseUid && isAuthIssue ? 'Auth Token Problem' :
                  isAuthenticated && !user?.firebaseUid ? 'Missing User ID' :
                  'Not Authenticated'
                }</p>
                <p>Auto-refresh Active: {isAuthenticated ? 'Yes (30s)' : 'No'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}