import { useState, useMemo } from 'react';
import { useAttendanceDB } from '@/hooks/useAttendanceDB';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { useAutoAttendance } from '@/hooks/useAutoAttendance';
import { SubjectCard } from '@/components/SubjectCard';
import { AddSubjectDialog } from '@/components/AddSubjectDialog';
import { EditSubjectDialog } from '@/components/EditSubjectDialog';
import { RoutineImporter } from '@/components/RoutineImporter';
import { AttendanceHistoryDialog } from '@/components/AttendanceHistoryDialog';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ReminderSettings } from '@/components/ReminderSettings';
import { TodayDashboard } from '@/components/TodayDashboard';
import { PostClassPrompt } from '@/components/PostClassPrompt';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Subject } from '@/hooks/useAttendanceDB';
import { ScheduleSlot } from '@/types/attendance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GraduationCap, 
  BookOpen, 
  LogOut, 
  Trash2, 
  Calendar, 
  LayoutGrid,
  Shield,
  TrendingDown,
  Bell,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    subjects,
    scheduleSlots,
    reminders,
    userSettings,
    isLoading,
    addSubject,
    batchAddSubjects,
    updateSubject,
    deleteSubject,
    deleteAllSubjects,
    markAttendance,
    getSubjectRecords,
    getAttendancePercentage,
    saveSchedule,
    saveReminder,
    updateReminder,
    deleteReminder,
    updateSettings,
    getBunkAnalysis,
  } = useAttendanceDB();

  // Dialog states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [historySubject, setHistorySubject] = useState<Subject | null>(null);
  const [activePromptSlot, setActivePromptSlot] = useState<ScheduleSlot | null>(null);

  // Initialize reminders
  useReminders(reminders, scheduleSlots);

  // Initialize auto-attendance prompt
  useAutoAttendance(scheduleSlots, (slot) => {
    setActivePromptSlot(slot);
  });

  const handlePostClassResponse = async (present: boolean) => {
    if (!activePromptSlot) return;
    
    try {
      await markAttendance(activePromptSlot.subjectId, present ? 'present' : 'absent');
      toast({
        title: "Attendance Updated",
        description: `${activePromptSlot.subjectName} marked as ${present ? 'Present' : 'Absent'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update attendance.",
        variant: "destructive"
      });
    } finally {
      setActivePromptSlot(null);
    }
  };

  const handleAddSubject = async (subject: { name: string; code: string; teacherName: string }) => {
    await addSubject(subject);
  };

  const handleUpdateSubject = async (id: string, updates: Partial<Pick<Subject, 'name' | 'code' | 'teacherName'>>) => {
    await updateSubject(id, updates);
  };

  const handleUpdateSettings = async (criteria: number) => {
    await updateSettings({ attendanceCriteria: criteria });
  };

  // Calculate bunk budget summary
  const bunkBudgetSummary = useMemo(() => {
    if (subjects.length === 0) return null;
    
    const subjectsWithClasses = subjects.filter(s => s.totalClasses > 0);
    if (subjectsWithClasses.length === 0) return null;

    let totalBunkable = 0;
    let totalNeedRecovery = 0;
    let dangerCount = 0;

    subjectsWithClasses.forEach(s => {
      const analysis = getBunkAnalysis(s);
      if (analysis.canBunk) {
        totalBunkable += analysis.bunkableClasses;
      } else if (analysis.status === 'danger') {
        totalNeedRecovery += analysis.classesNeeded;
        dangerCount++;
      }
    });

    return { totalBunkable, totalNeedRecovery, dangerCount };
  }, [subjects, getBunkAnalysis]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Attendance Tracker</h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block font-bold">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <RoutineImporter onImport={async (newSubjects, newSchedule) => {
                if (newSubjects.length > 0) await batchAddSubjects(newSubjects);
                if (newSchedule.length > 0) await saveSchedule(newSchedule);
              }} />
              <AddSubjectDialog onAdd={handleAddSubject} />
              {subjects.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/50 hidden sm:flex"
                  onClick={() => {
                    if (window.confirm(`Delete all ${subjects.length} subjects? This cannot be undone.`)) {
                      deleteAllSubjects();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              )}
              <ReminderSettings
                subjects={subjects}
                reminders={reminders}
                onSaveReminder={saveReminder}
                onUpdateReminder={updateReminder}
                onDeleteReminder={deleteReminder}
              />
              <SettingsDialog
                attendanceCriteria={userSettings.attendanceCriteria}
                onSave={handleUpdateSettings}
              />
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Today's Dashboard Section */}
        {(subjects.length > 0 || scheduleSlots.length > 0) && (
          <TodayDashboard 
            scheduleSlots={scheduleSlots} 
            onMarkAttendance={markAttendance} 
          />
        )}

        {subjects.length === 0 && scheduleSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <div className="p-5 rounded-3xl bg-background shadow-md mb-6">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-2">No Subjects Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md font-medium">
              Start your journey by adding subjects one-by-one or import your entire routine using AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <RoutineImporter onImport={async (newSubjects, newSchedule) => {
                if (newSubjects.length > 0) await batchAddSubjects(newSubjects);
                if (newSchedule.length > 0) await saveSchedule(newSchedule);
              }} />
              <AddSubjectDialog onAdd={handleAddSubject} />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="subjects" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 h-12 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="subjects" className="gap-2 font-bold rounded-lg data-[state=active]:shadow-sm">
                <LayoutGrid className="h-4 w-4" />
                Subjects
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2 font-bold rounded-lg data-[state=active]:shadow-sm">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subjects" className="focus-visible:ring-0">
              {/* Summary Stats */}
              <div className={`grid gap-4 mb-8 ${bunkBudgetSummary ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                <div className="p-4 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Total Subjects</p>
                  <p className="text-2xl font-black">{subjects.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Total Classes</p>
                  <p className="text-2xl font-black">
                    {subjects.reduce((sum, s) => sum + s.totalClasses, 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Overall Present</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {subjects.reduce((sum, s) => sum + s.classesPresent, 0)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Overall Attendance
                  </p>
                  <p className="text-2xl font-black">
                    {(() => {
                      const totalClasses = subjects.reduce((sum, s) => sum + s.totalClasses, 0);
                      const totalPresent = subjects.reduce((sum, s) => sum + s.classesPresent, 0);
                      return totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;
                    })()}%
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    min {userSettings.attendanceCriteria}%
                  </p>
                </div>
                {bunkBudgetSummary && (
                  <div className={`p-4 rounded-2xl border transition-all hover:shadow-md shadow-sm ${
                    bunkBudgetSummary.dangerCount > 0 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : 'bg-emerald-500/5 border-emerald-500/20'
                  }`}>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      {bunkBudgetSummary.dangerCount > 0 ? (
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      Bunk Budget
                    </p>
                    {bunkBudgetSummary.totalBunkable > 0 ? (
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {bunkBudgetSummary.totalBunkable}
                      </p>
                    ) : (
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">0</p>
                    )}
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {bunkBudgetSummary.dangerCount > 0
                        ? `${bunkBudgetSummary.dangerCount} subject${bunkBudgetSummary.dangerCount > 1 ? 's' : ''} need recovery`
                        : 'skippable classes total'}
                    </p>
                  </div>
                )}
              </div>

              {/* Subject Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    attendancePercentage={getAttendancePercentage(subject)}
                    attendanceCriteria={userSettings.attendanceCriteria}
                    bunkAnalysis={getBunkAnalysis(subject)}
                    onMarkPresent={() => markAttendance(subject.id, 'present')}
                    onMarkAbsent={() => markAttendance(subject.id, 'absent')}
                    onEdit={() => setEditingSubject(subject)}
                    onDelete={() => deleteSubject(subject.id)}
                    onViewHistory={() => setHistorySubject(subject)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="focus-visible:ring-0">
              <WeeklySchedule scheduleSlots={scheduleSlots} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Popups and Dialogs */}
      <EditSubjectDialog
        subject={editingSubject}
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        onSave={handleUpdateSubject}
      />

      <AttendanceHistoryDialog
        subject={historySubject}
        records={historySubject ? getSubjectRecords(historySubject.id) : []}
        open={!!historySubject}
        onOpenChange={(open) => !open && setHistorySubject(null)}
      />

      <PostClassPrompt
        slot={activePromptSlot}
        onResponse={handlePostClassResponse}
        onClose={() => setActivePromptSlot(null)}
      />
      
      <footer className="py-12 border-t mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary opacity-50" />
            <span className="font-black text-muted-foreground/50 tracking-tight">MY ATTENDANCE HUB</span>
          </div>
          <p className="text-xs text-muted-foreground/50 font-medium tracking-widest uppercase">© 2024 • THE NEXT GENERATION ATTENDANCE TOOL</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
