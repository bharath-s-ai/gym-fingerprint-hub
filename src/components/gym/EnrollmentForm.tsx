import { useState, useEffect, useRef } from "react";
import { Hash, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EnrollmentFormProps {
  onSubmit: (memberId: string) => void;
  isProcessing: boolean;
  autoFocus?: boolean;
}

export function EnrollmentForm({ onSubmit, isProcessing, autoFocus = true }: EnrollmentFormProps) {
  const [warriorId, setWarriorId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (warriorId.trim()) onSubmit(warriorId.trim());
  };

  const handleClear = () => {
    setWarriorId("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
        Warrior ID
      </label>
      <div className="relative">
        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary/60" />
        <Input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          placeholder="Enter ID (e.g. 701)"
          value={warriorId}
          onChange={(e) => setWarriorId(e.target.value)}
          disabled={isProcessing}
          className="pl-14 pr-12 bg-background/80 border-2 border-border h-16 text-foreground placeholder:text-muted-foreground/50 text-2xl font-black tracking-tight rounded-lg focus:border-primary focus:shadow-[0_0_20px_hsl(25_95%_53%/0.3),0_0_0_3px_hsl(25_95%_53%/0.15)] transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {warriorId && !isProcessing && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md bg-muted/60 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        disabled={isProcessing || !warriorId.trim()}
        className="w-full h-14 bg-primary text-primary-foreground font-black text-lg uppercase tracking-[0.15em] rounded-lg hover:bg-primary/90 hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(25_95%_53%/0.3)] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <Search className="w-5 h-5" />
        {isProcessing ? "PROCESSING..." : "FIND WARRIOR"}
      </Button>
    </form>
  );
}
