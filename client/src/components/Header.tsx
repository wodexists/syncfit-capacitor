import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { signOut } from "@/lib/firebase";
import { useState } from "react";
import SchedulingModal from "./SchedulingModal";
import { useToast } from "@/hooks/use-toast";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        <div className="flex items-center">
          <span className="material-icons mr-2">fitness_center</span>
          <h1 className="text-2xl font-bold">SyncFit</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="text-white bg-secondary hover:bg-secondary/90 px-4 py-2 rounded-md flex items-center"
          >
            <PlusIcon className="mr-1 h-4 w-4" />
            <span>Workout</span>
          </Button>
          
          {user?.profilePicture ? (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden border-2 border-white">
              <img 
                src={user.profilePicture} 
                alt={`${user.username}'s profile`} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white">
              <span className="material-icons text-white">person</span>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <SchedulingModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </header>
  );
}
