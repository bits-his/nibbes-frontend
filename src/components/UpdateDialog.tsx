import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface UpdateDialogProps {
  open: boolean;
  version: string;
  onDismiss?: () => void;
}

export function UpdateDialog({ open, version, onDismiss }: UpdateDialogProps) {
  const handleUpdate = () => {
    // Clear service worker cache if exists
    if ('serviceWorker' in navigator) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Hard reload to get new version
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Update Available</DialogTitle>
              <p className="text-sm text-muted-foreground">Version {version}</p>
            </div>
          </div>
        </DialogHeader>
        <DialogDescription className="text-base">
          A new version of Nibbles Kitchen is available with the latest features and improvements. 
          Please update to continue using the app.
        </DialogDescription>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDismiss && (
            <Button
              variant="outline"
              onClick={onDismiss}
              className="w-full sm:w-auto"
            >
              Later
            </Button>
          )}
          <Button
            onClick={handleUpdate}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
