import { Volume2, VolumeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MuteToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export function MuteToggle({ muted, onToggle }: MuteToggleProps) {
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="icon"
      className="border-primary/30 bg-muted/50 text-primary hover:bg-primary/10 hover:border-primary/50 min-h-[48px] min-w-[48px]"
      title={muted ? "Unmute sounds" : "Mute sounds"}
    >
      {muted ? <VolumeOff className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </Button>
  );
}
