import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EnrollmentFormProps {
  onSubmit: (phone: string) => void;
  isProcessing: boolean;
}

export function EnrollmentForm({ onSubmit, isProcessing }: EnrollmentFormProps) {
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) onSubmit(phone.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="relative flex-1">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="tel"
          placeholder="Enter member phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isProcessing}
          className="pl-10 bg-muted/50 border-border h-14 text-foreground placeholder:text-muted-foreground text-lg focus:border-primary focus:shadow-[0_0_0_3px_hsl(25_95%_53%/0.1)]"
        />
      </div>
      <Button
        type="submit"
        disabled={isProcessing || !phone.trim()}
        className="bg-primary text-primary-foreground h-14 px-8 font-bold text-lg uppercase tracking-wider hover:bg-primary/90 hover:scale-105 hover:shadow-[0_0_20px_hsl(25_95%_53%/0.25)] transition-all duration-200"
      >
        {isProcessing ? "Processing..." : "Enroll"}
      </Button>
    </form>
  );
}
