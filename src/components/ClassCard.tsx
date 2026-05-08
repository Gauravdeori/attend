import { Class } from '@/types/classes';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ClassCardProps {
  classItem: Class;
  role: 'teacher' | 'student';
}

export function ClassCard({ classItem, role }: ClassCardProps) {
  return (
    <Link to={`/classes/${classItem.id}`}>
      <Card className="group overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 bg-card/50 backdrop-blur-sm h-full flex flex-col">
        <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 flex justify-between items-start">
          <div className="p-3 bg-background/80 backdrop-blur-md rounded-2xl shadow-sm border border-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <Badge variant="outline" className="bg-background/50 border-primary/20 font-bold uppercase tracking-widest text-[10px]">
            {role}
          </Badge>
        </div>
        
        <CardHeader className="pt-4 px-6">
          <CardTitle className="text-xl font-black group-hover:text-primary transition-colors line-clamp-1">
            {classItem.name}
          </CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <User className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{classItem.teacherName}</span>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-2 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-2 font-medium">
            {classItem.description || "No description provided."}
          </p>
        </CardContent>

        <CardFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 flex justify-between items-center mt-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-wider">Members</span>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl font-bold gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            Enter Class
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
