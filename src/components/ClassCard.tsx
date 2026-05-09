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
      <Card className="group overflow-hidden rounded-lg border border-border/50 transition-all duration-300 hover:border-primary/50 bg-card h-full flex flex-col shadow-none">
        <div className="h-20 bg-muted/20 border-b border-border/50 p-4 flex justify-between items-start">
          <div className="p-2 bg-background rounded-md border border-border/50">
            <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <Badge variant="outline" className="bg-background font-medium uppercase tracking-widest text-[10px]">
            {role}
          </Badge>
        </div>
        
        <CardHeader className="pt-4 px-5">
          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
            {classItem.name}
          </CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <User className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{classItem.teacherName}</span>
          </div>
        </CardHeader>

        <CardContent className="px-5 py-2 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {classItem.description || "No description provided."}
          </p>
        </CardContent>

        <CardFooter className="px-5 py-3 border-t border-border/50 bg-muted/10 flex justify-between items-center mt-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Members</span>
          </div>
          <Button variant="ghost" size="sm" className="rounded-md font-medium gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            Enter Class
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
