import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassesDB } from '@/hooks/useClassesDB';
import { useAuth } from '@/hooks/useAuth';
import { useAttendanceDB } from '@/hooks/useAttendanceDB';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  CalendarCheck, 
  BarChart3, 
  Download,
  Copy,
  CheckCircle2,
  MapPin,
  Clock,
  User as UserIcon,
  Send,
  MoreVertical,
  KeyRound,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Class, Announcement, AttendanceSession, ClassAttendanceRecord, ClassMembership } from '@/types/classes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { generateAttendanceReport } from '@/lib/reportUtils';

// Helper for distance calculation
function calculateDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return Infinity;
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

function formatDate(timestamp: any) {
  if (!timestamp) return 'Just now';
  try {
    let date: Date;
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Just now';
    }

    if (isNaN(date.getTime())) return 'Just now';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch (e) {
    return 'Recently';
  }
}

export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userSettings } = useAttendanceDB();
  const { 
    classes, 
    memberships, 
    isLoading: dbLoading,
    getAnnouncements,
    postAnnouncement,
    getAttendanceSessions,
    startSession,
    endSession,
    markAttendance,
    getAttendanceRecords,
    getClassMembers
  } = useClassesDB();

  const [activeTab, setActiveTab] = useState('stream');
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [members, setMembers] = useState<ClassMembership[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load class and role
  useEffect(() => {
    if (!dbLoading && classes.length > 0 && classId) {
      const foundClass = classes.find(c => c.id === classId);
      if (foundClass) {
        setClassItem(foundClass);
        const m = memberships.find(mem => mem.classId === classId);
        setRole(m?.role || null);
      } else {
        toast({ title: "Error", description: "Class not found", variant: "destructive" });
        navigate('/classes');
      }
    }
  }, [classes, memberships, classId, dbLoading, navigate]);

  // Load class data
  useEffect(() => {
    if (classId) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [a, s, r, m] = await Promise.all([
            getAnnouncements(classId),
            getAttendanceSessions(classId),
            getAttendanceRecords(classId),
            getClassMembers(classId)
          ]);
          setAnnouncements(a);
          setSessions(s);
          setRecords(r);
          setMembers(m);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [classId, getAnnouncements, getAttendanceSessions, getAttendanceRecords, getClassMembers]);

  const activeSession = useMemo(() => sessions.find(s => s.status === 'active'), [sessions]);

  const handleCopyCode = () => {
    if (classItem?.joinCode) {
      navigator.clipboard.writeText(classItem.joinCode);
      toast({ title: "Copied!", description: "Join code copied to clipboard." });
    }
  };

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim() || !classId) return;
    setIsPosting(true);
    try {
      await postAnnouncement(classId, newAnnouncement);
      setNewAnnouncement('');
      const updated = await getAnnouncements(classId);
      setAnnouncements(updated);
      toast({ title: "Success", description: "Announcement posted." });
    } finally {
      setIsPosting(false);
    }
  };

  const handleStartSession = async () => {
    if (!classId) return;
    
    // Get geolocation
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const id = await startSession(classId, { lat: latitude, lng: longitude, radius: 50 }); // 50m radius default
      if (id) {
        const updated = await getAttendanceSessions(classId);
        setSessions(updated);
        toast({ title: "Session Started", description: "Students can now mark their attendance." });
      }
    }, () => {
      toast({ title: "Error", description: "Failed to get location. Location is required to start a session.", variant: "destructive" });
    });
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    const success = await endSession(activeSession.id);
    if (success) {
      const updated = await getAttendanceSessions(classId!);
      setSessions(updated);
      toast({ title: "Session Ended", description: "Attendance session has been closed." });
    }
  };

  const handleMarkAttendance = async () => {
    if (!activeSession || !classId) return;

    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const distance = calculateDistance(
        latitude, longitude, 
        activeSession?.location?.lat, activeSession?.location?.lng
      );

      const verified = distance <= (activeSession?.location?.radius || 50);
      
      if (!verified) {
        toast({ 
          title: "Location Verification Failed", 
          description: `You are too far from the classroom (${Math.round(distance)}m away).`,
          variant: "destructive" 
        });
        return;
      }

      const success = await markAttendance(activeSession.id, classId, 'present', true);
      if (success) {
        const updated = await getAttendanceRecords(classId);
        setRecords(updated);
        toast({ title: "Success", description: "You have been marked present!" });
      }
    }, () => {
      toast({ title: "Error", description: "Failed to get location. Location is required for attendance.", variant: "destructive" });
    });
  };

  const handleGenerateReport = (format: 'pdf' | 'excel') => {
    if (!classItem || members.length === 0) return;

    const studentMembers = members.filter(m => m.role === 'student');
    const totalSessions = sessions.filter(s => s.status === 'completed').length;

    const reportData = {
      className: classItem.name,
      teacherName: classItem.teacherName,
      criteria: userSettings.attendanceCriteria,
      students: studentMembers.map(m => {
        const studentRecords = records.filter(r => r.studentId === m.userId && r.status === 'present');
        const attended = studentRecords.length;
        return {
          name: m.studentName || `User ${m.userId.substring(0, 5)}`,
          rollNumber: m.rollNumber || 'N/A',
          attended,
          total: totalSessions,
          percentage: totalSessions > 0 ? (attended / totalSessions) * 100 : 0
        };
      })
    };

    generateAttendanceReport(reportData, format);
    toast({ title: "Report Generated", description: `Exporting ${format.toUpperCase()} report...` });
  };

  if (isLoading || !classItem) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Class Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/80 to-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-6 h-full flex flex-col justify-end pb-8">
          <Button 
            variant="ghost" 
            className="w-fit mb-4 text-primary-foreground hover:bg-white/10 gap-2 font-bold rounded-xl"
            onClick={() => navigate('/classes')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Button>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight line-clamp-1">{classItem.name}</h1>
          <p className="text-primary-foreground/80 font-bold mt-2 flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            {classItem.teacherName}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-14 p-1 bg-muted/50 rounded-2xl border mb-8 flex-wrap justify-start sm:justify-center overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="stream" className="rounded-xl px-4 md:px-8 font-bold data-[state=active]:shadow-sm gap-2">
              <MessageSquare className="h-4 w-4" />
              Stream
            </TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-xl px-4 md:px-8 font-bold data-[state=active]:shadow-sm gap-2">
              <CalendarCheck className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="students" className="rounded-xl px-4 md:px-8 font-bold data-[state=active]:shadow-sm gap-2">
              <Users className="h-4 w-4" />
              People
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl px-4 md:px-8 font-bold data-[state=active]:shadow-sm gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar info (Code/Actions) */}
            <div className="space-y-6">
              {role === 'teacher' && (
                <Card className="rounded-3xl border-2 shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Class Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <code className="text-2xl font-black text-primary tracking-widest">{classItem.joinCode}</code>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary" onClick={handleCopyCode}>
                      <Copy className="h-5 w-5" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeSession ? (
                <Card className="rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/5 shadow-lg animate-pulse">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold uppercase tracking-widest text-[10px]">Active Now</Badge>
                      <Clock className="h-4 w-4 text-emerald-500" />
                    </div>
                    <CardTitle className="text-lg font-black text-emerald-600 dark:text-emerald-400">Attendance Session</CardTitle>
                    <CardDescription className="text-xs font-bold flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Verification Radius: {activeSession.location.radius}m
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {role === 'student' ? (
                      <Button 
                        onClick={handleMarkAttendance}
                        className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg gap-2"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        Mark Present
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleEndSession}
                        variant="destructive"
                        className="w-full h-12 rounded-2xl font-black text-lg gap-2"
                      >
                        Stop Session
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                role === 'teacher' && (
                  <Button 
                    onClick={handleStartSession}
                    className="w-full h-14 rounded-2xl bg-primary shadow-xl shadow-primary/20 font-black text-lg gap-3 transition-transform hover:scale-[1.02]"
                  >
                    <CalendarCheck className="h-6 w-6" />
                    Start Session
                  </Button>
                )
              )}
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <TabsContent value="stream" className="m-0 space-y-6">
                {/* Announcement Input */}
                {role === 'teacher' && (
                  <Card className="rounded-[2rem] border-2 border-primary/10 shadow-sm overflow-hidden focus-within:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/5 text-primary font-black">
                          {user?.displayName?.substring(0, 1) || "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex items-center gap-2">
                        <Input 
                          placeholder="Announce something to your class..." 
                          className="border-none shadow-none focus-visible:ring-0 text-lg font-medium p-0 h-auto"
                          value={newAnnouncement}
                          onChange={(e) => setNewAnnouncement(e.target.value)}
                        />
                        <Button 
                          size="icon" 
                          className="rounded-xl h-10 w-10" 
                          disabled={!newAnnouncement.trim() || isPosting}
                          onClick={handlePostAnnouncement}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Announcements List */}
                <div className="space-y-4">
                  {announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 bg-muted/5 rounded-[2rem] border border-dashed">
                      <MessageSquare className="h-12 w-12 mb-4" />
                      <p className="font-bold">No announcements yet.</p>
                    </div>
                  ) : (
                    announcements.map((a) => (
                      <Card key={a.id} className="rounded-3xl border-2 transition-hover hover:shadow-md">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                          <Avatar className="h-10 w-10 border-2 border-primary/10">
                            <AvatarFallback className="bg-primary/5 text-primary font-black">
                              {a.authorName.substring(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-black text-sm">{a.authorName}</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                              {formatDate(a.createdAt)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive font-bold">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground font-medium leading-relaxed">
                            {a.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="m-0 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black">Attendance History</h3>
                  {role === 'teacher' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="rounded-xl font-bold gap-2 border-2 border-primary/20 hover:border-primary/50">
                          <Download className="h-4 w-4" />
                          Generate Report
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
                        <DropdownMenuLabel className="font-black text-xs uppercase tracking-widest text-muted-foreground">Export As</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleGenerateReport('pdf')} className="rounded-xl font-bold gap-2 cursor-pointer py-3">
                          <FileText className="h-4 w-4 text-red-500" />
                          PDF Document
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateReport('excel')} className="rounded-xl font-bold gap-2 cursor-pointer py-3">
                          <TableIcon className="h-4 w-4 text-emerald-500" />
                          Excel Spreadsheet
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="grid gap-4">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 bg-muted/5 rounded-[2rem] border border-dashed text-center">
                      <CalendarCheck className="h-12 w-12 mb-4" />
                      <p className="font-bold">No attendance sessions recorded.</p>
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <Card key={s.id} className="rounded-2xl border-2 overflow-hidden">
                        <div className="flex items-center p-4">
                          <div className={cn(
                            "p-3 rounded-xl mr-4",
                            s.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                          )}>
                            <Clock className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm">
                              {formatDate(s.startTime)}
                            </h4>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                              {s.startTime ? new Date(typeof s.startTime.toDate === 'function' ? s.startTime.toDate() : s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                              {s.endTime && ` — ${new Date(typeof s.endTime.toDate === 'function' ? s.endTime.toDate() : s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={s.status === 'active' ? "default" : "secondary"} className="rounded-full font-black uppercase tracking-widest text-[10px]">
                              {s.status}
                            </Badge>
                            <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">
                              {records.filter(r => r.sessionId === s.id).length} Present
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="students" className="m-0 space-y-6">
                <div className="flex items-center justify-between border-b-2 border-primary/10 pb-4">
                  <h3 className="text-3xl font-black text-primary">Classmates</h3>
                  <Badge className="rounded-full px-4 font-black">{members.length} Total</Badge>
                </div>
                
                <div className="grid gap-2">
                  {members.length === 0 ? (
                    <p className="text-center py-10 font-bold text-muted-foreground">Empty class.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-border/50">
                            <AvatarFallback className="bg-primary/5 text-primary font-black uppercase">
                              {m.userId.substring(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-black text-sm">{m.userId === user?.uid ? "You" : `User ${m.userId.substring(0, 5)}`}</h4>
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest mt-1">
                              {m.role}
                            </Badge>
                          </div>
                        </div>
                        {role === 'teacher' && m.role !== 'teacher' && (
                          <Button variant="ghost" size="sm" className="text-destructive font-bold hover:bg-destructive/10">Remove</Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="rounded-3xl border-2 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Average Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-black">85%</p>
                      <p className="text-xs font-bold text-emerald-500 mt-2">+5% from last week</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-2">
                    <CardHeader>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Total Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-black">{sessions.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-2">
                    <CardHeader>
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Top Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-black">{members.filter(m => m.role === 'student').length}</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="rounded-[2.5rem] border-2 shadow-sm p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <BarChart3 className="h-16 w-16 text-muted-foreground/20" />
                  <div>
                    <h3 className="text-xl font-black">Analytics Dashboard Coming Soon</h3>
                    <p className="text-muted-foreground font-medium">We're building detailed charts and trends for your class.</p>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Sub-components can be added here if needed
