import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/integrations/firebase/client';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Shield, 
  Users, 
  UserCheck, 
  GraduationCap, 
  Plus, 
  FileSpreadsheet, 
  TrendingUp, 
  Building, 
  Copy, 
  BookOpen, 
  Mail, 
  Hash, 
  Calendar,
  Loader2,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { BulkImportDialog } from '@/components/BulkImportDialog';
import { Class, UserProfile } from '@/types/classes';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [overallAttendance, setOverallAttendance] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Create Class form state
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showCreateClassDialog, setShowCreateClassDialog] = useState(false);

  const fetchDashboardData = async () => {
    if (!profile?.institutionId) return;

    setIsLoading(true);
    try {
      // 1. Fetch all classes in the institution
      const classesQuery = query(
        collection(db, 'classes'),
        where('institution_id', '==', profile.institutionId)
      );
      const classesSnap = await getDocs(classesQuery);
      const fetchedClasses: Class[] = classesSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          description: data.description,
          joinCode: data.join_code,
          teacherId: data.teacher_id,
          teacherName: data.teacher_name,
          createdAt: data.created_at
        };
      });
      setClasses(fetchedClasses);

      // 2. Fetch all teachers in the institution
      const teachersQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', profile.institutionId),
        where('role', '==', 'teacher')
      );
      const teachersSnap = await getDocs(teachersQuery);
      const fetchedTeachers: UserProfile[] = teachersSnap.docs.map(d => d.data() as UserProfile);
      setTeachers(fetchedTeachers);

      // 3. Fetch all students in the institution
      const studentsQuery = query(
        collection(db, 'users'),
        where('institutionId', '==', profile.institutionId),
        where('role', '==', 'student')
      );
      const studentsSnap = await getDocs(studentsQuery);
      const fetchedStudents: UserProfile[] = studentsSnap.docs.map(d => d.data() as UserProfile);
      setStudents(fetchedStudents);

      // 4. Fetch overall attendance rate for all classes combined
      let totalRecords = 0;
      let presentRecords = 0;

      for (const c of fetchedClasses) {
        const recordsQuery = query(
          collection(db, 'class_attendance_records'),
          where('class_id', '==', c.id)
        );
        const recordsSnap = await getDocs(recordsQuery);
        recordsSnap.docs.forEach(docSnap => {
          totalRecords++;
          if (docSnap.data().status === 'present') {
            presentRecords++;
          }
        });
      }

      const rate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
      setOverallAttendance(rate);

    } catch (e: any) {
      console.error("Error loading dashboard data:", e);
      toast({
        title: "Error Loading Data",
        description: e.message || "Failed to load dashboard metrics.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile?.institutionId]);

  const handleCopyCode = () => {
    if (profile?.institutionId) {
      // Find joinCode of the institution
      const instQuery = doc(db, 'institutions', profile.institutionId);
      getDocs(query(collection(db, 'institutions'), where('id', '==', profile.institutionId))).then(snap => {
        if (!snap.empty) {
          const code = snap.docs[0].data().joinCode;
          navigator.clipboard.writeText(code);
          toast({
            title: "Copied!",
            description: "Institution join code copied to clipboard."
          });
        }
      });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !selectedTeacherId || !profile?.institutionId) return;

    setIsCreatingClass(true);
    try {
      const teacher = teachers.find(t => t.uid === selectedTeacherId);
      const teacherName = teacher?.displayName || 'Teacher';
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const classData = {
        name: className,
        description: classDescription,
        join_code: joinCode,
        teacher_id: selectedTeacherId,
        teacher_name: teacherName,
        institution_id: profile.institutionId,
        created_at: serverTimestamp(),
      };

      const classRef = await addDoc(collection(db, 'classes'), classData);

      // Create membership record for the teacher
      const membershipData = {
        user_id: selectedTeacherId,
        class_id: classRef.id,
        role: 'teacher',
        joined_at: serverTimestamp(),
      };

      await setDoc(doc(db, 'class_memberships', `${selectedTeacherId}_${classRef.id}`), membershipData);

      toast({
        title: "Class Created",
        description: `Successfully created class "${className}" and assigned ${teacherName}.`,
      });

      setClassName('');
      setClassDescription('');
      setSelectedTeacherId('');
      setShowCreateClassDialog(false);
      fetchDashboardData();
    } catch (e: any) {
      toast({
        title: "Failed to Create Class",
        description: e.message || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingClass(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Building className="h-9 w-9" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800">
              {profile?.institutionName || "Institution Admin Panel"}
            </h1>
            <p className="text-slate-400 font-semibold text-sm">
              Manage classes, assign educators, and oversee enrollment.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button 
            onClick={handleCopyCode} 
            variant="outline"
            className="h-11 rounded-xl border border-slate-200 font-bold flex items-center gap-2 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4 text-slate-500" />
            Get Institution Code
          </Button>
          <Button 
            onClick={() => setShowCreateClassDialog(true)}
            className="h-11 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/10"
          >
            <Plus className="h-4.5 w-4.5" />
            Add New Class
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="border border-slate-200 bg-white rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase tracking-wider text-slate-400">Total Classes</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-800">{classes.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> Enrolled in institution
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase tracking-wider text-slate-400">Educators</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-800">{teachers.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" /> Active teaching roles
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase tracking-wider text-slate-400">Students</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-800">{students.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Registered accounts
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white rounded-2xl shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-black uppercase tracking-wider text-slate-400">Attendance Rate</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-850 text-emerald-600">
              {overallAttendance.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Overall average
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="classes" className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-4">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-11 border border-slate-200/50">
            <TabsTrigger value="classes" className="rounded-lg font-bold">Classes</TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-lg font-bold">Teachers</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg font-bold">Students</TabsTrigger>
          </TabsList>
          
          <Button 
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="h-10 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            Bulk CSV Import Students
          </Button>
        </div>

        {/* Classes List Tab */}
        <TabsContent value="classes" className="pt-6">
          {classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-slate-200 text-center">
              <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-black text-slate-800">No classes registered</h3>
              <p className="text-slate-400 font-semibold max-w-sm mt-1 mb-6 text-sm">
                Get started by creating a class and assigning an educator to it.
              </p>
              <Button onClick={() => setShowCreateClassDialog(true)} className="rounded-xl font-bold">
                Create First Class
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-accordion-down">
              {classes.map((c) => (
                <Card key={c.id} className="border border-slate-200 shadow-none bg-white rounded-2xl overflow-hidden hover:border-primary/50 transition-colors duration-300 flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-black text-slate-800 tracking-tight">{c.name}</CardTitle>
                      <Badge className="bg-primary/10 hover:bg-primary/15 text-primary border-none rounded-lg text-[10px] font-black tracking-widest px-2.5 py-1">
                        CODE: {c.joinCode}
                      </Badge>
                    </div>
                    <CardDescription className="font-semibold text-slate-500 text-xs min-h-[2.5rem]">
                      {c.description || 'No description provided.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 border-t border-slate-100/60 bg-slate-50/50 p-4 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                        {c.teacherName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700">Educator: {c.teacherName}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="font-bold text-primary hover:bg-primary/5" asChild>
                      <a href={`/classes/${c.id}`}>View Class →</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="pt-6">
          {teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-slate-200 text-center">
              <UserCheck className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-black text-slate-800">No teachers linked</h3>
              <p className="text-slate-400 font-semibold max-w-sm mt-1 text-sm">
                Teachers can register using the institution code: <span className="font-black text-slate-700">{profile?.institutionId ? '...' : ''}</span>
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 text-xs font-black uppercase tracking-wider">
                      <th className="p-4 pl-6">Teacher Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {teachers.map((t) => (
                      <tr key={t.uid} className="hover:bg-slate-50/50">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                            {t.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{t.displayName}</span>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">{t.email}</td>
                        <td className="p-4">
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[10px] font-black uppercase tracking-wider px-2 py-0.5">
                            Educator
                          </Badge>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button variant="ghost" size="sm" className="font-bold text-slate-500 hover:text-slate-800" disabled>
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="pt-6">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-slate-200 text-center">
              <Users className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-black text-slate-800">No students linked</h3>
              <p className="text-slate-400 font-semibold max-w-sm mt-1 text-sm">
                Students can sign up and enter the join code, or you can import them in bulk via CSV.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 text-xs font-black uppercase tracking-wider">
                      <th className="p-4 pl-6">Student Name</th>
                      <th className="p-4">Roll Number</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                    {students.map((s) => (
                      <tr key={s.uid} className="hover:bg-slate-50/50">
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                            {s.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{s.displayName}</span>
                        </td>
                        <td className="p-4 font-mono text-xs font-bold text-slate-600">{s.rollNumber || '—'}</td>
                        <td className="p-4 text-slate-500 font-medium">{s.email}</td>
                        <td className="p-4 pr-6 text-right">
                          <Button variant="ghost" size="sm" className="font-bold text-slate-500 hover:text-slate-800" disabled>
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* dialogs */}
      {/* Create Class dialog */}
      <Dialog open={showCreateClassDialog} onOpenChange={setShowCreateClassDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-855">Add Class Room</DialogTitle>
            <DialogDescription className="font-semibold text-slate-500">
              Create a classroom in your institution and assign an educator to it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClass} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="class-name" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g. Computer Science 101"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 font-bold bg-slate-50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-desc" className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Description</Label>
              <Input
                id="class-desc"
                placeholder="e.g. Fall Semester, MWF 10-11 AM"
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 font-bold bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Assign Educator</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} required>
                <SelectTrigger className="h-11 rounded-xl border border-slate-200 font-bold bg-slate-50">
                  <SelectValue placeholder="Choose a teacher..." />
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200">
                  {teachers.map((t) => (
                    <SelectItem key={t.uid} value={t.uid} className="font-bold text-slate-700">
                      {t.displayName} ({t.email})
                    </SelectItem>
                  ))}
                  {teachers.length === 0 && (
                    <SelectItem value="none" disabled>
                      No educators registered yet.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button 
                type="submit" 
                className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20"
                disabled={isCreatingClass || !className.trim() || !selectedTeacherId}
              >
                {isCreatingClass ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Class...
                  </>
                ) : (
                  'Create and Assign'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk CSV Import dialog */}
      <BulkImportDialog
        classes={classes}
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportSuccess={fetchDashboardData}
      />
    </div>
  );
}
