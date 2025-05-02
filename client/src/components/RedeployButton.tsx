import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * A button that allows users to trigger a redeployment in development
 * Useful for testing deployment changes
 */
export function RedeployButton() {
  const [isRedeploying, setIsRedeploying] = React.useState(false);
  const { toast } = useToast();

  const handleRedeploy = () => {
    setIsRedeploying(true);
    
    // Show a toast notification
    toast({
      title: "Redeployment triggered",
      description: "Redirecting to the deployment page...",
      duration: 3000,
    });
    
    // In a real application, this could call an API endpoint to trigger redeployment
    // For now, we'll just simulate with a timeout and redirect to Replit's deployment page
    setTimeout(() => {
      window.open("https://replit.com/deployments", "_blank");
      setIsRedeploying(false);
    }, 1500);
  };

  return (
    <Button 
      variant="outline"
      onClick={handleRedeploy}
      disabled={isRedeploying}
      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
    >
      {isRedeploying ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Redeploying...</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          <span>Redeploy App</span>
        </>
      )}
    </Button>
  );
}