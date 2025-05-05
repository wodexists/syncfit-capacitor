import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CalendarPlus, LogOut, Plus, UserCircle, Home, ChevronDown, 
         AlertCircle, Calendar, RefreshCw, Check, X } from "lucide-react";
import { signOut, signInWithGoogle } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AddWorkoutButton from "./AddWorkoutButton";
import Logo from "./Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const { toast } = useToast();
  const [calendarStatus, setCalendarStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Check calendar connection status
  useEffect(() => {
    if (!user) {
      setCalendarStatus('disconnected');
      return;
    }
    
    const checkCalendarConnection = async () => {
      try {
        setCalendarStatus('checking');
        const response = await fetch('/api/calendar/calendars');
        
        if (response.ok) {
          setCalendarStatus('connected');
        } else if (response.status === 401 || response.status === 403) {
          // Auth issues
          setCalendarStatus('disconnected');
        } else {
          // Other API errors
          setCalendarStatus('error');
        }
      } catch (error) {
        console.error('Error checking calendar connection:', error);
        setCalendarStatus('error');
      }
    };
    
    checkCalendarConnection();
    
    // Check every 3 minutes
    const intervalId = setInterval(checkCalendarConnection, 3 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user]);

  const handleReconnectCalendar = async () => {
    try {
      setIsReconnecting(true);
      const result = await signInWithGoogle();
      
      if (result.success) {
        toast({
          title: "Google Calendar Reconnected",
          description: "Successfully reconnected to Google Calendar.",
          duration: 3000,
        });
        setCalendarStatus('connected');
      } else {
        toast({
          title: "Reconnection Failed",
          description: result.error || "Failed to reconnect to Google Calendar.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error reconnecting to Google Calendar:', error);
      toast({
        title: "Reconnection Error",
        description: "An unexpected error occurred while reconnecting to Google Calendar.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleLogout = async () => {
    const success = await signOut();
    if (success) {
      toast({
        title: "Logged out successfully",
        duration: 3000,
      });
      setCalendarStatus('disconnected');
    } else {
      toast({
        title: "Failed to log out",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-0 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer -my-6">
            <img src="/images/syncfit_logo_main.png" alt="SyncFit Logo" className="h-20" />
          </div>
        </Link>
        
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-primary-foreground/10">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="ghost" className="text-white hover:bg-primary-foreground/10">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Explore
            </Button>
          </Link>
          <AddWorkoutButton label="Add Workout" />
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Calendar Connection Status Indicator for logged in users */}
          {user && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    {calendarStatus === 'checking' && (
                      <div className="flex items-center px-3 py-1 bg-amber-500 bg-opacity-20 rounded-full">
                        <RefreshCw className="h-4 w-4 text-white animate-spin mr-1" />
                        <span className="text-xs text-white">Checking...</span>
                      </div>
                    )}
                    
                    {calendarStatus === 'connected' && (
                      <div className="flex items-center px-3 py-1 bg-green-500 bg-opacity-20 rounded-full">
                        <Check className="h-4 w-4 text-white mr-1" />
                        <span className="text-xs text-white">Calendar Connected</span>
                      </div>
                    )}
                    
                    {calendarStatus === 'disconnected' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 bg-red-500 bg-opacity-20 border-transparent text-white hover:text-white hover:bg-red-500 hover:bg-opacity-30"
                        onClick={handleReconnectCalendar}
                        disabled={isReconnecting}
                      >
                        {isReconnecting ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            <span className="text-xs">Reconnecting...</span>
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            <span className="text-xs">Reconnect Calendar</span>
                          </>
                        )}
                      </Button>
                    )}
                    
                    {calendarStatus === 'error' && (
                      <div className="flex items-center px-3 py-1 bg-amber-500 bg-opacity-20 rounded-full cursor-pointer" onClick={handleReconnectCalendar}>
                        <AlertCircle className="h-4 w-4 text-white mr-1" />
                        <span className="text-xs text-white">Calendar Error</span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {calendarStatus === 'checking' && (
                    <p className="text-sm">Checking Google Calendar connection...</p>
                  )}
                  {calendarStatus === 'connected' && (
                    <p className="text-sm">Google Calendar is connected and working properly</p>
                  )}
                  {calendarStatus === 'disconnected' && (
                    <p className="text-sm">Google Calendar is disconnected. Click to reconnect your account.</p>
                  )}
                  {calendarStatus === 'error' && (
                    <p className="text-sm">There was an error connecting to Google Calendar. Click to retry.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 cursor-pointer overflow-hidden rounded-full border-2 border-white focus:outline-none">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={`${user.username}'s profile`} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-white flex items-center justify-center">
                      <UserCircle className="h-6 w-6 text-primary" />
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                {calendarStatus !== 'connected' && (
                  <DropdownMenuItem onClick={handleReconnectCalendar}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Connect Google Calendar</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button className="bg-white text-primary hover:bg-white/90">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
