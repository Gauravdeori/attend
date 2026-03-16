import { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { Subject } from '@/hooks/useAttendanceDB';

interface EditSubjectDialogProps {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { name: string; code: string; teacherName: string }) => void;
}

export function EditSubjectDialog({ subject, open, onOpenChange, onSave }: EditSubjectDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setCode(subject.code);
      setTeacherName(subject.teacherName);
    }
  }, [subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject && name.trim() && code.trim()) {
      onSave(subject.id, { name: name.trim(), code: code.trim(), teacherName: teacherName.trim() });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update the details of your subject.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Subject Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Subject Code</Label>
              <Input
                id="edit-code"
                placeholder="e.g., MATH101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-teacher">Teacher Name</Label>
              <Input
                id="edit-teacher"
                placeholder="e.g., Dr. Smith"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
