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
          className="pl-10 bg-background/50 border-border/50 h-12 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Button
        type="submit"
        disabled={isProcessing || !phone.trim()}
        className="gradient-primary text-primary-foreground h-12 px-6 font-semibold hover:opacity-90 transition-opacity"
      >
        {isProcessing ? "Processing..." : "Enroll"}
      </Button>
    </form>
  );
}
