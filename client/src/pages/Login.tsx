import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { RedeployButton } from "@/components/RedeployButton";

export default function Login() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Since we're now using popup authentication instead of redirect,
  // we don't need to check for redirect results anymore
  useEffect(() => {
    setIsCheckingRedirect(false);
  }, []);
  
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const result = await signInWithGoogle();
      
      if (result.success) {
        console.log("Google sign-in successful, checking session status...");
        
        // Check if session is properly established
        try {
          console.log("Checking auth status immediately after login...");
          const response = await fetch('/api/auth/user', { 
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' },
            cache: 'no-store'
          });
          const data = await response.json();
          
          console.log("Auth status check result:", data);
          
          if (data.authenticated) {
            console.log("Authentication confirmed, redirecting to dashboard...");
            // Force a page reload to ensure the authentication state is fresh
            // This is a workaround for potential stale React Query cache
            window.location.href = '/dashboard';
          } else {
            console.error("Backend session not established despite successful Firebase auth");
            toast({
              title: "Login issue",
              description: "Successfully authenticated with Google, but session wasn't established. Please try again.",
              variant: "destructive",
            });
          }
        } catch (checkError) {
          console.error("Error checking authentication status:", checkError);
          setLocation("/dashboard"); // Fallback to normal redirect
        }
      } else {
        if (result.error && result.error.includes('unauthorized-domain')) {
          // Set a specific error for unauthorized domain
          setAuthError(result.error);
        } else {
          toast({
            title: "Login failed",
            description: result.error || "Failed to authenticate with Google",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center bg-primary text-white rounded-t-lg pb-4 relative pt-4">
            <div className="flex items-center justify-center -mt-2 -mb-2">
              <img src="/images/syncfit_logo_main.png" alt="SyncFit Logo" className="h-28 mr-2" />
            </div>
            <CardDescription className="text-primary-foreground text-lg mt-2">
              Smart Fitness Scheduling
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 pb-4">
            <div className="space-y-4 text-center">
              <div className="flex justify-center space-x-2 mb-6">
                <div className="bg-primary/10 p-3 rounded-full">
                  <span className="material-icons text-primary text-2xl">calendar_today</span>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <span className="material-icons text-primary text-2xl">schedule</span>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <span className="material-icons text-primary text-2xl">fitness_center</span>
                </div>
              </div>
              
              <h2 className="text-xl font-semibold">Welcome to SyncFit</h2>
              
              <p className="text-gray-600 px-4">
                Connect with your Google account to find the perfect time for workouts based on your calendar and preferences.
              </p>
              
              <div className="grid grid-cols-3 gap-3 mt-6 px-6">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                    <span className="material-icons text-secondary text-xl">sync</span>
                  </div>
                  <p className="text-xs text-gray-600">Sync Calendar</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                    <span className="material-icons text-secondary text-xl">schedule</span>
                  </div>
                  <p className="text-xs text-gray-600">Find Time</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                    <span className="material-icons text-secondary text-xl">fitness_center</span>
                  </div>
                  <p className="text-xs text-gray-600">Stay Fit</p>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3 pt-2 pb-6">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading || isCheckingRedirect}
              className="w-full flex items-center justify-center"
            >
              {isLoading || isCheckingRedirect ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              By continuing, you agree to allow SyncFit to access your Google Calendar for workout scheduling
            </p>
            
            {authError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription className="text-xs text-left mt-2 ml-6">
                  {authError}
                </AlertDescription>
                {authError.includes('authorized domains') && (
                  <div className="mt-3 text-xs border-t border-red-200 pt-2">
                    <p className="font-semibold">How to fix:</p>
                    <ol className="list-decimal text-left ml-4 mt-1 space-y-1">
                      <li>Deploy your app using the Replit "Deploy" button</li>
                      <li>Go to Firebase Console → Authentication → Settings</li>
                      <li>Under 'Authorized domains', add your deployed domain: <code className="bg-red-100 px-1">{'<your-app>.replit.app'}</code></li>
                      <li>Also go to Authentication → Sign-in method → Google</li>
                      <li>Add <code className="bg-red-100 px-1">{'https://<your-app>.replit.app/__/auth/handler'}</code> to Authorized redirect URIs</li>
                      <li>Save and try again with the deployed URL</li>
                    </ol>
                    <p className="mt-2 text-red-700 font-medium">Current hostname: <code className="bg-red-100 px-1">{window.location.hostname}</code></p>
                  </div>
                )}
              </Alert>
            )}
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
          <p>SyncFit helps you find the perfect time for workouts</p>
          <p>We'll analyze your schedule and recommend optimal time slots</p>
          
          <div className="mt-6 flex justify-center">
            <RedeployButton />
          </div>
        </div>
      </div>
    </div>
  );
}
