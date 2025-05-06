import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldCheck, ShieldOff, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function AuthTest() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Function to manually refresh auth status
  const refreshAuthStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/auth/user');
      const data = await response.json();
      console.log('Auth status refreshed:', data);
    } catch (error) {
      console.error('Failed to refresh auth status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to test Google Calendar access
  const testCalendarAccess = async () => {
    try {
      const response = await fetch('/api/calendar/calendars');
      const data = await response.json();
      console.log('Calendar access test:', data);
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Calendar access test failed:', error);
      alert('Calendar access test failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="container max-w-3xl py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isAuthenticated ? (
              <><ShieldCheck className="h-5 w-5 text-green-500" /> Authentication Status</>
            ) : (
              <><ShieldOff className="h-5 w-5 text-red-500" /> Authentication Status</>
            )}
          </CardTitle>
          <CardDescription>
            Check and debug user authentication status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-md">
                <h3 className="text-sm font-semibold mb-2">User Information</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Authenticated:</span> {isAuthenticated ? 'Yes' : 'No'}</p>
                  <p><span className="font-medium">User ID:</span> {user?.id || 'Not logged in'}</p>
                  <p><span className="font-medium">Email:</span> {user?.email || 'N/A'}</p>
                  <p><span className="font-medium">Username:</span> {user?.username || 'N/A'}</p>
                  <p><span className="font-medium">Firebase UID:</span> {user?.firebaseUid || 'Missing'}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-md">
                <h3 className="text-sm font-semibold mb-2">Token Information</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Google Token:</span> {
                    user?.googleAccessToken 
                      ? `Present (${user.googleAccessToken.substring(0, 10)}...)` 
                      : 'Not available'
                  }</p>
                  <p><span className="font-medium">Refresh Token:</span> {
                    user?.googleRefreshToken ? 'Present' : 'Not available'
                  }</p>
                  <p><span className="font-medium">Token Status:</span> {
                    !user?.googleAccessToken
                      ? 'No token'
                      : 'Token available'
                  }</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshAuthStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Auth Status
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={testCalendarAccess}
                disabled={!isAuthenticated}
              >
                <Clock className="h-4 w-4 mr-2" />
                Test Calendar Access
              </Button>
              
              {isAuthenticated && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={logout}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Server Response Log */}
      <Card>
        <CardHeader>
          <CardTitle>Session Debugging Tips</CardTitle>
          <CardDescription>Information to help diagnose auth issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-md">
              <h3 className="text-sm font-semibold mb-2">Common Issues</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>If Firebase UID is missing but you're authenticated, the Google auth flow may not be completing properly</li>
                <li>If Google token is missing, you may need to re-authenticate</li>
                <li>Try using the Emergency Reset button in the SyncStatus component if you're having persistent issues</li>
                <li>Clearing browser cookies can help resolve stuck sessions</li>
              </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-md">
              <h3 className="text-sm font-semibold mb-2">Next Steps</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>If you're not authenticated, please login</li>
                <li>After login, check if Firebase UID is present</li>
                <li>If authenticated but Google token is missing, try logging out and back in</li>
                <li>Use the Test Calendar Access button to check Google Calendar connectivity</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}