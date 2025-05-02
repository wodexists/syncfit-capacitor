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
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// Auth context
type User = {
  id: number;
  email: string;
  username: string;
  profilePicture?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

function App() {
  const [location] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check authentication status
  const { data: authData, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

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
              
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </main>
          
          <Toaster />
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}

export default App;
