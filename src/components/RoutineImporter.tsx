import React, { useState, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUp, Loader2, Sparkles, Filter, CheckCircle2 } from "lucide-react";
import { analyzeRoutine, AnalysisResponse, ExtractedSubject } from "@/services/routineAnalysis";
import { useAttendanceDB } from "@/hooks/useAttendanceDB";
import { useToast } from "@/hooks/use-toast";

type Step = 'upload' | 'filter' | 'confirm';

export function RoutineImporter() {
  const { batchAddSubjects } = useAttendanceDB();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeRoutine(file);
      setAnalysis(result);
      
      // Initialize with all subjects selected by original index
      setSelectedSubjectIds(new Set(result.subjects.map((_, i) => i)));
      
      setStep('filter');
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredSubjectsWithIndex = analysis?.subjects
    .map((s, originalIndex) => ({ ...s, originalIndex }))
    .filter(s => {
      const semMatch = !selectedSemester || selectedSemester === "_all_" || s.semester === selectedSemester;
      const secMatch = !selectedSection || selectedSection === "_all_" || s.section === selectedSection;
      return semMatch && secMatch;
    }) || [];

  const handleImport = async () => {
    const rawSubjects = (analysis?.subjects || [])
      .filter((_, idx) => selectedSubjectIds.has(idx))
      .map(s => ({
        name: s.name,
        code: s.code,
        teacherName: s.teacherName
      }));

    // Deduplicate by name+code (case-insensitive) so the same subject
    // from multiple sections is only added once
    const seen = new Set<string>();
    const subjectsToImport = rawSubjects.filter(s => {
      const key = `${s.name.toLowerCase().trim()}|${s.code.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (subjectsToImport.length === 0) {
      toast({
        title: "No subjects selected",
        description: "Please select at least one subject to import.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    const success = await batchAddSubjects(subjectsToImport);
    setIsImporting(false);

    if (success) {
      setIsOpen(false);
      resetState();
    }
  };

  const resetState = () => {
    setStep('upload');
    setAnalysis(null);
    setSelectedSemester("");
    setSelectedSection("");
    setSelectedSubjectIds(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary/50 transition-all duration-300">
          <Sparkles className="w-4 h-4 text-primary" />
          Import Routine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass overflow-hidden border-primary/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            AI Routine Import
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 min-h-[300px] flex flex-col">
          {step === 'upload' && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-primary/20 rounded-xl p-10 hover:border-primary/40 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                disabled={isAnalyzing}
              />
              {isAnalyzing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-muted-foreground animate-pulse">Analyzing routine with AI...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <FileUp className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Upload Routine Photo</p>
                    <p className="text-sm text-muted-foreground mt-1">PNG, JPG or PDF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'filter' && analysis && (
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Filter className="w-4 h-4" />
                  Filter your schedule
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger className="glass-morphism">
                        <SelectValue placeholder="All Semesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all_">All Semesters</SelectItem>
                        {analysis.semesters.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section (Optional)</Label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger className="glass-morphism">
                        <SelectValue placeholder="All Sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_all_">All Sections</SelectItem>
                        {analysis.sections.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep('confirm')}>
                Next: Verify Subjects
              </Button>
            </div>
          )}

          {step === 'confirm' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Found {filteredSubjectsWithIndex.length} subjects for your selection.
                </p>
              </div>
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {filteredSubjectsWithIndex.map(({ originalIndex, ...s }) => (
                    <div 
                      key={originalIndex} 
                      className="flex items-start gap-3 p-3 rounded-lg border border-primary/5 bg-background/50 hover:bg-background/80 transition-colors"
                    >
                      <Checkbox 
                        id={`sub-${originalIndex}`}
                        checked={selectedSubjectIds.has(originalIndex)}
                        onCheckedChange={(checked) => {
                          setSelectedSubjectIds(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(originalIndex);
                            else next.delete(originalIndex);
                            return next;
                          });
                        }}
                      />
                      <div className="grid gap-1 leading-none">
                        <label 
                          htmlFor={`sub-${originalIndex}`}
                          className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {s.name}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {s.code} {s.teacherName && `• ${s.teacherName}`}
                        </p>
                        {s.semester && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full w-fit mt-1">
                            {s.semester} {s.section && `• ${s.section}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('filter')}>
                  Back
                </Button>
                <Button className="flex-[2] gap-2" onClick={handleImport} disabled={isImporting}>
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm & Add to My Tracker
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="text-[10px] text-muted-foreground text-center">
          Powered by Gemini AI • Always verify extracted data.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
