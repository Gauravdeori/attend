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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { db } from '@/integrations/firebase/client';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { Class } from '@/types/classes';
import { useToast } from '@/hooks/use-toast';

interface BulkImportDialogProps {
  classes: Class[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export function BulkImportDialog({ classes, open, onOpenChange, onImportSuccess }: BulkImportDialogProps) {
  const { toast } = useToast();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<{ name: string; roll: string; email: string }[]>([]);

  const parseCSVData = (text: string) => {
    const lines = text.split('\n');
    const parsed: { name: string; roll: string; email: string }[] = [];
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts[0]?.trim();
        const roll = parts[1]?.trim();
        const email = parts[2]?.trim() || '';
        
        if (name && roll) {
          parsed.push({ name, roll, email });
        }
      }
    }
    return parsed;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    setPreviewStudents(parseCSVData(text));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setPreviewStudents(parseCSVData(text));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || previewStudents.length === 0) return;

    setIsImporting(true);
    let importedCount = 0;

    try {
      for (const student of previewStudents) {
        let studentUid = '';
        
        // Search if student already has a registered user profile
        if (student.email) {
          const q = query(
            collection(db, 'users'),
            where('email', '==', student.email.toLowerCase().trim())
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            studentUid = snap.docs[0].id;
          }
        }

        // Generate a deterministic membership ID to prevent duplicate imports
        const cleanRoll = student.roll.replace(/[^a-zA-Z0-9]/g, '_');
        const membershipId = studentUid ? `${studentUid}_${selectedClassId}` : `${cleanRoll}_${selectedClassId}`;

        const membershipData = {
          user_id: studentUid, // Empty string if they haven't registered yet
          class_id: selectedClassId,
          role: 'student',
          student_name: student.name,
          roll_number: student.roll,
          email: student.email.toLowerCase().trim(),
          joined_at: serverTimestamp()
        };

        await setDoc(doc(db, 'class_memberships', membershipId), membershipData);
        importedCount++;
      }

      toast({
        title: "Import Complete",
        description: `Successfully enrolled ${importedCount} students in the class.`,
      });

      setCsvText('');
      setPreviewStudents([]);
      setSelectedClassId('');
      onOpenChange(false);
      if (onImportSuccess) onImportSuccess();
    } catch (error: any) {
      console.error('Import Error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-3xl bg-white border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Bulk CSV Student Import
          </DialogTitle>
          <DialogDescription className="font-semibold text-slate-500">
            Import student listings using comma-separated values (CSV) into a specific class.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Select Destination Class
            </Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId} required>
              <SelectTrigger className="h-11 rounded-xl border border-slate-200 font-bold bg-slate-50">
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200">
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-bold text-slate-700">
                    {c.name} ({c.teacherName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                CSV Student Data
              </Label>
              <Label htmlFor="csv-file" className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload CSV file
              </Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <Textarea
              placeholder="Format: Student Name, Roll Number, Email (one per line)&#10;e.g. John Doe, 2026CS101, john@school.edu&#10;Jane Smith, 2026CS102, jane@school.edu"
              value={csvText}
              onChange={handleTextChange}
              className="h-36 rounded-xl border border-slate-200 font-mono text-xs bg-slate-50 p-3 leading-relaxed"
              required
            />
          </div>

          {previewStudents.length > 0 && (
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 max-h-40 overflow-y-auto space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1 border-b pb-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Parsed {previewStudents.length} student{previewStudents.length !== 1 && 's'} successfully:
              </div>
              {previewStudents.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>{s.name} ({s.roll})</span>
                  <span className="text-[10px] text-slate-400 font-mono">{s.email || 'No email'}</span>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20"
              disabled={isImporting || !selectedClassId || previewStudents.length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Students...
                </>
              ) : (
                'Import and Enroll Students'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
