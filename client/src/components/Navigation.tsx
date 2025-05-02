import { Link } from "wouter";

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
              <span className="material-icons">dashboard</span>
              <span className="text-xs mt-1">Dashboard</span>
            </a>
          </Link>
          
          <Link href="/calendar">
            <a className={getLinkClass("/calendar")}>
              <span className="material-icons">calendar_today</span>
              <span className="text-xs mt-1">Calendar</span>
            </a>
          </Link>
          
          <Link href="/explore">
            <a className={getLinkClass("/explore")}>
              <span className="material-icons">explore</span>
              <span className="text-xs mt-1">Explore</span>
            </a>
          </Link>
          
          <Link href="/stats">
            <a className={getLinkClass("/stats")}>
              <span className="material-icons">bar_chart</span>
              <span className="text-xs mt-1">Stats</span>
            </a>
          </Link>
          
          <Link href="/profile">
            <a className={getLinkClass("/profile")}>
              <span className="material-icons">person</span>
              <span className="text-xs mt-1">Profile</span>
            </a>
          </Link>
        </div>
      </div>
    </nav>
  );
}
