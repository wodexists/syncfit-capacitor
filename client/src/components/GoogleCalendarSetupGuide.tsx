import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface GoogleCalendarSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function GoogleCalendarSetupGuide({ isOpen, onClose, projectId }: GoogleCalendarSetupGuideProps) {
  const cloudConsoleUrl = `https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${projectId}`;
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Enable Google Calendar API</AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/70">
            The Google Calendar API needs to be enabled for your project to use SyncFit's scheduling features.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Step 1: Enable the API</h3>
            <p className="text-sm text-muted-foreground">
              Visit the Google Cloud Console and enable the Google Calendar API for your project.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center text-sm mt-2" 
              onClick={() => window.open(cloudConsoleUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Google Cloud Console
            </Button>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Step 2: Wait for Activation</h3>
            <p className="text-sm text-muted-foreground">
              After enabling the API, wait 5-10 minutes for changes to propagate through Google's systems.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Step 3: Try Again</h3>
            <p className="text-sm text-muted-foreground">
              Return to SyncFit and try scheduling a workout again.
            </p>
          </div>
          
          <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mt-4">
            <p>For detailed setup instructions, please check the <strong>GOOGLE_CALENDAR_API_SETUP.md</strong> file in the project root.</p>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={() => window.open(cloudConsoleUrl, '_blank')}>
              Enable Google Calendar API
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}