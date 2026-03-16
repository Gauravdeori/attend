import { useState } from 'react';
import { useAttendanceDB } from '@/hooks/useAttendanceDB';
import { useAuth } from '@/hooks/useAuth';
import { SubjectCard } from '@/components/SubjectCard';
import { AddSubjectDialog } from '@/components/AddSubjectDialog';
import { EditSubjectDialog } from '@/components/EditSubjectDialog';
import { AttendanceHistoryDialog } from '@/components/AttendanceHistoryDialog';
import { Subject } from '@/hooks/useAttendanceDB';
import { GraduationCap, BookOpen, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, signOut } = useAuth();
  const {
    subjects,
    isLoading,
    addSubject,
    updateSubject,
    deleteSubject,
    markAttendance,
    getSubjectRecords,
    getAttendancePercentage,
  } = useAttendanceDB();

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [historySubject, setHistorySubject] = useState<Subject | null>(null);

  const handleAddSubject = async (subject: { name: string; code: string; teacherName: string }) => {
    await addSubject(subject);
  };

  const handleUpdateSubject = async (id: string, updates: Partial<Pick<Subject, 'name' | 'code' | 'teacherName'>>) => {
    await updateSubject(id, updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
                <h1 className="text-xl font-bold">Attendance Tracker</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AddSubjectDialog onAdd={handleAddSubject} />
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Subjects Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Add your first subject to start tracking attendance. It's quick and easy!
            </p>
            <AddSubjectDialog onAdd={handleAddSubject} />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-card border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Subjects</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-card border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Classes</p>
                <p className="text-2xl font-bold">
                  {subjects.reduce((sum, s) => sum + s.totalClasses, 0)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Overall Present</p>
                <p className="text-2xl font-bold text-success">
                  {subjects.reduce((sum, s) => sum + s.classesPresent, 0)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-card border shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Overall Attendance</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const totalClasses = subjects.reduce((sum, s) => sum + s.totalClasses, 0);
                    const totalPresent = subjects.reduce((sum, s) => sum + s.classesPresent, 0);
                    return totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;
                  })()}%
                </p>
              </div>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  attendancePercentage={getAttendancePercentage(subject)}
                  onMarkPresent={() => markAttendance(subject.id, 'present')}
                  onMarkAbsent={() => markAttendance(subject.id, 'absent')}
                  onEdit={() => setEditingSubject(subject)}
                  onDelete={() => deleteSubject(subject.id)}
                  onViewHistory={() => setHistorySubject(subject)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Edit Dialog */}
      <EditSubjectDialog
        subject={editingSubject}
        open={!!editingSubject}
        onOpenChange={(open) => !open && setEditingSubject(null)}
        onSave={handleUpdateSubject}
      />

      {/* History Dialog */}
      <AttendanceHistoryDialog
        subject={historySubject}
        records={historySubject ? getSubjectRecords(historySubject.id) : []}
        open={!!historySubject}
        onOpenChange={(open) => !open && setHistorySubject(null)}
      />
    </div>
  );
};

export default Index;
