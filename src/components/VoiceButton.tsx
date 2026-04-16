import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
}

export function VoiceButton({ isListening, isSupported, onToggle }: VoiceButtonProps) {
  if (!isSupported) return null;

  return (
    <Button
      type="button"
      onClick={onToggle}
      variant="outline"
      size="icon"
      className={`relative h-12 w-12 rounded-full border-2 transition-all duration-300 ${
        isListening
          ? "border-destructive bg-destructive/10 text-destructive pulse-mic"
          : "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary"
      }`}
    >
      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}
