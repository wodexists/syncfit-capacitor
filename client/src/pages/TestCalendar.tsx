import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getEventStatusCounts } from '@/lib/calendarSync';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

export default function TestCalendar() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncCounts, setSyncCounts] = useState<any>({
    total: 0,
    pending: 0,
    synced: 0,
    error: 0
  });
  const [lastApiCall, setLastApiCall] = useState<Date | null>(null);

  useEffect(() => {
    // If the user is authenticated and has a Firebase UID, get sync counts
    if (user?.firebaseUid) {
      getEventStatusCounts(user.firebaseUid)
        .then(counts => {
          setSyncCounts(counts);
        })
        .catch(err => {
          console.error('Error getting sync counts:', err);
        });
    }
  }, [user]);

  const testCalendarConnection = async () => {
    if (!isAuthenticated) {
      setError('You need to be logged in to test the calendar connection');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      console.log('Testing calendar connection...');
      // Set the timestamp immediately when we start the API call
      setLastApiCall(new Date());
      
      const response = await fetch('/api/calendar/calendars', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'same-origin'
      });
      
      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Calendars:', data);
        setResponse({
          status: response.status,
          data
        });
      } else {
        // Try to get error details from response
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || '';
        } catch (e) {
          errorDetail = await response.text();
        }
        
        setError(`Error: ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ''}`);
      }
    } catch (err) {
      console.error('Error testing calendar connection:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      
      // Update sync counts after API call
      if (user?.firebaseUid) {
        getEventStatusCounts(user.firebaseUid)
          .then(counts => {
            setSyncCounts(counts);
          })
          .catch(err => {
            console.error('Error getting sync counts:', err);
          });
      }
    }
  };

  const testTimeSlots = async () => {
    if (!isAuthenticated) {
      setError('You need to be logged in to test time slots');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      console.log('Testing available time slots...');
      setLastApiCall(new Date());
      
      const response = await fetch('/api/calendar/available-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          date: new Date().toISOString(),
          durationMinutes: 30
        }),
        credentials: 'same-origin'
      });
      
      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Time slots:', data);
        setResponse({
          status: response.status,
          data
        });
      } else {
        // Try to get error details from response
        let errorDetail = '';
        try {
          const errorData = await response.json();
          errorDetail = errorData.message || '';
        } catch (e) {
          errorDetail = await response.text();
        }
        
        setError(`Error: ${response.status} ${response.statusText}${errorDetail ? ` - ${errorDetail}` : ''}`);
      }
    } catch (err) {
      console.error('Error testing time slots:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Calendar Integration Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            This information helps diagnose authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticated ? (
            <div className="grid gap-2">
              <div>
                <span className="font-medium">User ID:</span> {user?.id}
              </div>
              <div>
                <span className="font-medium">Firebase UID:</span> {user?.firebaseUid || 'Not available'}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user?.email}
              </div>
              <div>
                <span className="font-medium">Google Access Token:</span> {user?.googleAccessToken ? 
                  `${user.googleAccessToken.substring(0, 10)}...` : 
                  'Not available'}
              </div>
              <div>
                <span className="font-medium">Last API Call:</span> {lastApiCall ? 
                  lastApiCall.toLocaleTimeString() : 
                  'No API calls made yet'}
              </div>
            </div>
          ) : (
            <div className="text-amber-600">
              You are not authenticated. Please log in first.
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Calendar Sync Status</CardTitle>
          <CardDescription>
            Statistics about calendar events synchronization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-md">
              <div className="text-muted-foreground text-sm">Total Events</div>
              <div className="text-2xl font-bold">{syncCounts.total}</div>
            </div>
            <div className="p-4 border rounded-md">
              <div className="text-muted-foreground text-sm">Pending</div>
              <div className="text-2xl font-bold text-amber-600">{syncCounts.pending}</div>
            </div>
            <div className="p-4 border rounded-md">
              <div className="text-muted-foreground text-sm">Synced</div>
              <div className="text-2xl font-bold text-green-600">{syncCounts.synced}</div>
            </div>
            <div className="p-4 border rounded-md">
              <div className="text-muted-foreground text-sm">Errors</div>
              <div className="text-2xl font-bold text-red-600">{syncCounts.error}</div>
            </div>
          </div>
          
          {syncCounts.lastSyncedAt && (
            <div className="mt-4 text-sm text-muted-foreground">
              Last synced at: {new Date(syncCounts.lastSyncedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Calendar API Tests</CardTitle>
          <CardDescription>
            Run these tests to check your Google Calendar integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Button 
              onClick={testCalendarConnection}
              disabled={loading || !isAuthenticated}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Test Calendar List API
            </Button>
            
            <Button 
              onClick={testTimeSlots}
              disabled={loading || !isAuthenticated}
              variant="outline"
              className="gap-2"
            >
              Test Available Time Slots
            </Button>
          </div>
          
          {loading && (
            <div className="p-4 border rounded-md bg-muted animate-pulse">
              Loading...
            </div>
          )}
          
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-800">
              <div className="font-medium mb-1">Error:</div>
              <div className="text-sm">{error}</div>
            </div>
          )}
          
          {response && (
            <div className="p-4 border border-green-200 bg-green-50 rounded-md">
              <div className="font-medium mb-1 text-green-800">
                Success: Status {response.status}
              </div>
              <div className="mt-2 overflow-auto max-h-64 border rounded p-2 bg-white">
                <pre className="text-xs">{JSON.stringify(response.data, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          This page helps diagnose issues with the Google Calendar integration
        </CardFooter>
      </Card>
    </div>
  );
}