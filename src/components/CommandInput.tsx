import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceButton } from "./VoiceButton";

interface CommandInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isListening: boolean;
  isVoiceSupported: boolean;
  onVoiceToggle: () => void;
}

export function CommandInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  isListening,
  isVoiceSupported,
  onVoiceToggle,
}: CommandInputProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-3"
    >
      <VoiceButton
        isListening={isListening}
        isSupported={isVoiceSupported}
        onToggle={onVoiceToggle}
      />
      <div className="relative flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-primary/60">
          $&gt;
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Try: "Insert name Arun and marks 95 into students"'
          className="h-12 pl-10 pr-4 font-mono text-sm bg-muted border-border focus:border-primary focus:ring-primary/20 placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Execute
          </>
        )}
      </Button>
    </form>
  );
}
