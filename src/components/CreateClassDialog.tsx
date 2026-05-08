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
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2 } from 'lucide-react';

interface CreateClassDialogProps {
  onCreate: (name: string, description: string) => Promise<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClassDialog({ onCreate, open, onOpenChange }: CreateClassDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onCreate(name, description);
      setName('');
      setDescription('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Create a Class</DialogTitle>
          <DialogDescription className="font-medium">
            Create a new space for your students and manage attendance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Class Name</Label>
            <Input
              id="name"
              placeholder="e.g. Physics 101"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl border-2 focus-visible:ring-primary font-bold"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief overview of the class..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-2xl border-2 focus-visible:ring-primary font-medium min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-2xl font-black text-lg gap-2 shadow-lg shadow-primary/20"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <PlusCircle className="h-5 w-5" />
              )}
              Create Class
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
