import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import type { Reminder } from "@/types/attendance";
import type { Subject } from "@/hooks/useAttendanceDB";

interface ReminderSettingsProps {
  subjects: Subject[];
  reminders: Reminder[];
  onSaveReminder: (reminder: Omit<Reminder, 'id'>) => Promise<Reminder | null>;
  onUpdateReminder: (id: string, updates: Partial<Pick<Reminder, 'minutesBefore' | 'enabled'>>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

export function ReminderSettings({
  subjects,
  reminders,
  onSaveReminder,
  onUpdateReminder,
  onDeleteReminder,
}: ReminderSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(10);

  const handleAddReminder = async (subject: Subject) => {
    await onSaveReminder({
      subjectId: subject.id,
      subjectName: subject.name,
      minutesBefore: minutes,
      enabled: true,
    });
    setAddingFor(null);
    setMinutes(10);
  };

  const subjectsWithReminders = subjects.map(subject => ({
    subject,
    reminder: reminders.find(r => r.subjectId === subject.id),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Reminders">
          <Bell className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Bell className="w-5 h-5 text-primary" />
            Class Reminders
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Get notified before your classes start. Reminders use browser notifications.
          </p>

          {subjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Add subjects first to set up reminders.</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {subjectsWithReminders.map(({ subject, reminder }) => (
                  <div
                    key={subject.id}
                    className="p-3 rounded-lg border border-border/50 bg-card/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.code}</p>
                      </div>
                      {reminder ? (
                        <Switch
                          checked={reminder.enabled}
                          onCheckedChange={(enabled) =>
                            onUpdateReminder(reminder.id, { enabled })
                          }
                        />
                      ) : null}
                    </div>

                    {reminder ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            value={reminder.minutesBefore}
                            onChange={(e) =>
                              onUpdateReminder(reminder.id, {
                                minutesBefore: parseInt(e.target.value) || 10,
                              })
                            }
                            className="w-20 h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">min before</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDeleteReminder(reminder.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {addingFor === subject.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              value={minutes}
                              onChange={(e) => setMinutes(parseInt(e.target.value) || 10)}
                              className="w-20 h-8 text-sm"
                              placeholder="10"
                            />
                            <span className="text-xs text-muted-foreground">min</span>
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleAddReminder(subject)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => setAddingFor(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 gap-1 text-xs"
                            onClick={() => {
                              setAddingFor(subject.id);
                              setMinutes(10);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add Reminder
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
