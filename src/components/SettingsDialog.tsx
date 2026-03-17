import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings } from "lucide-react";

interface SettingsDialogProps {
  attendanceCriteria: number;
  onSave: (criteria: number) => void;
}

const PRESETS = [
  { label: '75%', value: 75 },
  { label: '80%', value: 80 },
  { label: '85%', value: 85 },
  { label: '90%', value: 90 },
];

export function SettingsDialog({ attendanceCriteria, onSave }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [criteria, setCriteria] = useState(attendanceCriteria);

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) setCriteria(attendanceCriteria);
  };

  const handleSave = () => {
    onSave(criteria);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="w-5 h-5 text-primary" />
            Attendance Settings
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Criteria Display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Required Attendance</p>
            <p className="text-5xl font-bold text-primary">{criteria}%</p>
            <p className="text-xs text-muted-foreground mt-2">
              Subjects below this will be flagged
            </p>
          </div>

          {/* Slider */}
          <div className="px-2">
            <Slider
              value={[criteria]}
              min={50}
              max={100}
              step={1}
              onValueChange={(values) => setCriteria(values[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Presets</p>
            <div className="flex gap-2">
              {PRESETS.map(preset => (
                <Button
                  key={preset.value}
                  variant={criteria === preset.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setCriteria(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Save */}
          <Button className="w-full" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
