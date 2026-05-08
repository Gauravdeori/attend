import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, User, Hash } from 'lucide-react';

interface JoinClassDialogProps {
  onJoin: (code: string, studentName: string, rollNumber: string) => Promise<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinClassDialog({ onJoin, open, onOpenChange }: JoinClassDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !roll.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onJoin(code, name, roll);
      setCode('');
      setName('');
      setRoll('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Join a Class</DialogTitle>
          <DialogDescription className="font-medium">
            Enter your details and the 6-character class code.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              Your Full Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl border-2 focus-visible:ring-primary font-bold"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roll" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Roll Number
            </Label>
            <Input
              id="roll"
              placeholder="e.g. 2021PH001"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              className="h-12 rounded-2xl border-2 focus-visible:ring-primary font-bold"
              required
            />
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 flex items-center gap-1">
              <KeyRound className="h-3 w-3" />
              Class Code
            </Label>
            <Input
              id="code"
              placeholder="e.g. AB1234"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-14 rounded-2xl border-2 border-primary/20 focus-visible:ring-primary font-black text-center text-2xl tracking-[0.2em] uppercase bg-primary/5"
              maxLength={6}
              required
            />
          </div>
          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-2xl font-black text-lg gap-2 shadow-lg shadow-primary/20"
              disabled={isSubmitting || code.length < 6 || !name.trim() || !roll.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
              Join Class
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
