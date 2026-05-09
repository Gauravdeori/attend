import { useState } from 'react';
import { useClassesDB } from '@/hooks/useClassesDB';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ClassCard } from '@/components/ClassCard';
import { CreateClassDialog } from '@/components/CreateClassDialog';
import { JoinClassDialog } from '@/components/JoinClassDialog';
import { 
  Users, 
  Plus, 
  Search, 
  GraduationCap, 
  LayoutGrid, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Classes() {
  const { user } = useAuth();
  const { classes, memberships, isLoading, createClass, joinClass } = useClassesDB();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const teacherClasses = classes.filter(c => 
    memberships.find(m => m.classId === c.id)?.role === 'teacher'
  );
  
  const studentClasses = classes.filter(c => 
    memberships.find(m => m.classId === c.id)?.role === 'student'
  );

  const filteredClasses = activeTab === 'teaching' 
    ? teacherClasses 
    : activeTab === 'joined' 
      ? studentClasses 
      : classes;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Classes</h1>
            <p className="text-muted-foreground font-medium">Manage and join academic sessions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowJoin(true)} 
            variant="outline" 
            className="h-10 px-4 rounded-md font-medium border gap-2"
          >
            <Search className="h-4 w-4" />
            Join Class
          </Button>
          <Button 
            onClick={() => setShowCreate(true)} 
            className="h-10 px-4 rounded-md font-medium gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Class
          </Button>
        </div>
      </div>

      {/* Tabs and Content */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border border-dashed border-border/50 rounded-lg bg-muted/10">
          <div className="p-4 rounded-md bg-card border border-border/50">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">No Classes Yet</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Start by creating your own class or join one using a code from your teacher.
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => setShowJoin(true)} variant="outline" className="rounded-md font-medium">
              Join Class
            </Button>
            <Button onClick={() => setShowCreate(true)} className="rounded-md font-medium">
              Create My First Class
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <TabsList className="h-12 p-1 bg-transparent border-b border-border/50 rounded-none w-full sm:w-auto">
              <TabsTrigger value="all" className="rounded-md px-6 font-medium data-[state=active]:bg-muted">
                All Classes
              </TabsTrigger>
              <TabsTrigger value="teaching" className="rounded-md px-6 font-medium data-[state=active]:bg-muted">
                Teaching
              </TabsTrigger>
              <TabsTrigger value="joined" className="rounded-md px-6 font-medium data-[state=active]:bg-muted">
                Joined
              </TabsTrigger>
            </TabsList>
            
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-4 py-2">
              {filteredClasses.length} class{filteredClasses.length !== 1 && 'es'} found
            </p>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {filteredClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/10 rounded-[3rem] border border-border/50">
                <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-bold">No classes in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredClasses.map((c) => (
                  <ClassCard 
                    key={c.id} 
                    classItem={c} 
                    role={memberships.find(m => m.classId === c.id)?.role || 'student'} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <CreateClassDialog 
        open={showCreate} 
        onOpenChange={setShowCreate} 
        onCreate={createClass} 
      />
      <JoinClassDialog 
        open={showJoin} 
        onOpenChange={setShowJoin} 
        onJoin={joinClass} 
      />
    </div>
  );
}
