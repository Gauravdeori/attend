import { LayoutGrid, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddSubjectDialog } from './AddSubjectDialog';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddSubject: (subject: { name: string; code: string; teacherName: string }) => Promise<void>;
}

export function MobileBottomNav({ activeTab, onTabChange, onAddSubject }: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-background/95 backdrop-blur border-t px-2 pb-safe pt-2 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <button 
        onClick={() => onTabChange('subjects')}
        className={cn("flex flex-col items-center justify-center p-2 w-20 h-14 rounded-xl transition-all", activeTab === 'subjects' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <LayoutGrid className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-bold">Subjects</span>
      </button>

      {/* Floating Action Button (FAB) for Add Subject */}
      <div className="relative -top-6">
        <AddSubjectDialog 
          onAdd={onAddSubject} 
          trigger={
            <button className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg transition-transform active:scale-95 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
              <Plus className="h-7 w-7" />
            </button>
          } 
        />
      </div>

      <button 
        onClick={() => onTabChange('schedule')}
        className={cn("flex flex-col items-center justify-center p-2 w-20 h-14 rounded-xl transition-all", activeTab === 'schedule' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Calendar className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-bold">Schedule</span>
      </button>
    </div>
  );
}
