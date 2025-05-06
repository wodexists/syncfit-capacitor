import { Switch, Route, useLocation } from "wouter";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import CalendarView from "@/pages/CalendarView";
import Explore from "@/pages/Explore";
import Stats from "@/pages/Stats";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import TestCalendar from "@/pages/TestCalendar";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import CalendarSelector from "@/components/CalendarSelector";
import WorkoutReminderSettings from "@/components/WorkoutReminderSettings";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, createContext } from "react";

// Auth context
export type User = {
  id: number;
  email: string;
  username: string;
  profilePicture?: string;
  firebaseUid?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
};

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

// Create the context with a default value
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true
});

function App() {
  const [location] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check authentication status
  const { data: authData, isLoading, refetch } = useQuery<{
    authenticated: boolean;
    user?: User;
  }>({
    queryKey: ['/api/auth/user'],
    retry: 1,
    staleTime: 30000, // Keep auth status fresh for 30 seconds
    refetchInterval: 60000, // Only check every minute
    refetchOnWindowFocus: true,
  });
  
  // Force refresh auth state when component mounts
  useEffect(() => {
    // Quietly refetch without logging
    refetch();
  }, []);

  useEffect(() => {
    if (authData && authData.authenticated && authData.user) {
      setCurrentUser(authData.user);
    } else {
      setCurrentUser(null);
    }
  }, [authData]);

  const authContext: AuthContextType = {
    user: currentUser,
    isAuthenticated: !!currentUser,
    isLoading
  };

  // If on login page, don't show header/nav
  const isLoginPage = location === "/login";

  return (
    <AuthContext.Provider value={authContext}>
      <TooltipProvider>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            {!isLoginPage && authContext.isAuthenticated && <Header user={authContext.user} />}
            {!isLoginPage && authContext.isAuthenticated && <Navigation currentPath={location} />}
            
            <main className="flex-grow">
              <Switch>
              <Route path="/login" component={Login} />
              
              {/* Protected Routes */}
              <Route path="/">
                {authContext.isAuthenticated ? <Dashboard user={authContext.user} /> : <Login />}
              </Route>
              <Route path="/dashboard">
                {authContext.isAuthenticated ? <Dashboard user={authContext.user} /> : <Login />}
              </Route>
              <Route path="/calendar">
                {authContext.isAuthenticated ? <CalendarView user={authContext.user} /> : <Login />}
              </Route>
              <Route path="/explore">
                {authContext.isAuthenticated ? <Explore user={authContext.user} /> : <Login />}
              </Route>
              <Route path="/stats">
                {authContext.isAuthenticated ? <Stats user={authContext.user} /> : <Login />}
              </Route>
              <Route path="/profile">
                {authContext.isAuthenticated ? <Profile user={authContext.user} /> : <Login />}
              </Route>
              
              {/* Calendar Settings Pages */}
              <Route path="/calendar-selection">
                {authContext.isAuthenticated ? 
                  <div className="container mx-auto px-4 py-6">
                    <h2 className="text-2xl font-semibold mb-6">Calendar Selection</h2>
                    <CalendarSelector />
                  </div> 
                : <Login />}
              </Route>
              
              <Route path="/reminder-settings">
                {authContext.isAuthenticated ? 
                  <div className="container mx-auto px-4 py-6">
                    <h2 className="text-2xl font-semibold mb-6">Reminder Settings</h2>
                    <WorkoutReminderSettings />
                  </div> 
                : <Login />}
              </Route>

              {/* Test Calendar Page */}
              <Route path="/test-calendar">
                {authContext.isAuthenticated ? <TestCalendar /> : <Login />}
              </Route>
              
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </main>
          
          <Toaster />
        </div>
      </ToastProvider>
    </TooltipProvider>
    </AuthContext.Provider>
  );
}

export default App;
