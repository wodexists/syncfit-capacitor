import { Link } from "wouter";
import { LayoutDashboard, CalendarIcon, Compass, BarChart3, User } from "lucide-react";

interface NavigationProps {
  currentPath: string;
}

export default function Navigation({ currentPath }: NavigationProps) {
  const isActive = (path: string) => {
    return currentPath === path;
  };

  const getLinkClass = (path: string) => {
    const baseClass = "px-4 py-2 flex flex-col items-center min-w-[80px]";
    return isActive(path)
      ? `text-primary ${baseClass} border-b-2 border-primary`
      : `text-gray-600 ${baseClass}`;
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between overflow-x-auto py-2 no-scrollbar">
          <Link href="/dashboard">
            <a className={getLinkClass("/dashboard")}>
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-xs mt-1">Dashboard</span>
            </a>
          </Link>
          
          <Link href="/calendar">
            <a className={getLinkClass("/calendar")}>
              <CalendarIcon className="h-5 w-5" />
              <span className="text-xs mt-1">Calendar</span>
            </a>
          </Link>
          
          <Link href="/explore">
            <a className={getLinkClass("/explore")}>
              <Compass className="h-5 w-5" />
              <span className="text-xs mt-1">Explore</span>
            </a>
          </Link>
          
          <Link href="/stats">
            <a className={getLinkClass("/stats")}>
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs mt-1">Stats</span>
            </a>
          </Link>
          
          <Link href="/profile">
            <a className={getLinkClass("/profile")}>
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Profile</span>
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
