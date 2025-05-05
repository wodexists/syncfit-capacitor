import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { checkPendingEvents, useSyncStatus } from '@/lib/calendarSync';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export type SyncStatusType = 'idle' | 'syncing' | 'synced' | 'error';

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusType>('idle');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const { resync } = useSyncStatus();
  const { user } = useAuth();
  
  // Check for pending events on mount
  useEffect(() => {
    let isMounted = true;
    
    const checkEvents = async () => {
      if (!user?.firebaseUid) return;
      
      try {
        const count = await checkPendingEvents(user.firebaseUid);
        if (isMounted) {
          setPendingCount(count);
          setStatus(count > 0 ? 'error' : 'idle');
        }
      } catch (error) {
        console.error('Error checking pending events:', error);
        if (isMounted) {
          setStatus('error');
        }
      }
    };
    
    checkEvents();
    
    // Set up an interval to check for pending events
    const interval = setInterval(checkEvents, 60000); // Check every minute
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);
  
  const handleResync = async () => {
    if (!user?.firebaseUid) return;
    
    setStatus('syncing');
    
    try {
      const result = await resync(user.firebaseUid);
      setStatus(result.failed > 0 ? 'error' : 'synced');
      
      // Check pending count again
      const count = await checkPendingEvents(user.firebaseUid);
      setPendingCount(count);
      
      // Reset to idle after a few seconds when synced
      if (result.failed === 0) {
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Error during resync:', error);
      setStatus('error');
    }
  };
  
  // Don't show anything if there are no pending events and status is idle
  if (status === 'idle' && pendingCount === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm mb-4">
      <div className="flex items-center gap-2">
        {status === 'syncing' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Syncing calendar events...</span>
          </>
        )}
        
        {status === 'synced' && (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>All events synced with Google Calendar</span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>
              {pendingCount > 0 
                ? `${pendingCount} event${pendingCount > 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} to be synced`
                : 'Error syncing with Google Calendar'}
            </span>
          </>
        )}
      </div>
      
      {(status === 'error' || pendingCount > 0) && (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 flex items-center gap-1"
          onClick={handleResync}
          disabled={status === 'syncing'}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {status === 'syncing' ? 'Syncing...' : 'Sync now'}
        </Button>
      )}
    </div>
  );
}