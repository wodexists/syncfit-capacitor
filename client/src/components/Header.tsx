import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CalendarPlus, LogOut, Plus, UserCircle, Home, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/firebase";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AddWorkoutButton from "./AddWorkoutButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const handleLogout = async () => {
    const success = await signOut();
    if (success) {
      toast({
        title: "Logged out successfully",
        duration: 3000,
      });
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
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/">
          <div className="flex items-center cursor-pointer">
            <img src="/images/syncfit_logo.svg" alt="SyncFit Logo" className="h-10 mr-2" />
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  {user.profilePicture ? (
                    <img 
                      src={user.profilePicture} 
                      alt={`${user.username}'s profile`} 
                      className="h-10 w-10 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
                      <UserCircle className="h-6 w-6 text-white" />
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
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
