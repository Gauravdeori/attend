import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface AddSubjectDialogProps {
  onAdd: (subject: { name: string; code: string; teacherName: string }) => void;
  trigger?: React.ReactNode;
}

export function AddSubjectDialog({ onAdd, trigger }: AddSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && code.trim()) {
      onAdd({ name: name.trim(), code: code.trim(), teacherName: teacherName.trim() });
      setName('');
      setCode('');
      setTeacherName('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 animate-click">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Subject</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Enter the details of your new subject to start tracking attendance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Subject Name</Label>
              <Input
                id="name"
                placeholder="e.g., Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Subject Code</Label>
              <Input
                id="code"
                placeholder="e.g., MATH101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teacher">Teacher Name</Label>
              <Input
                id="teacher"
                placeholder="e.g., Dr. Smith"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Subject</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
