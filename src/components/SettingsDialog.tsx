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
  aiProvider: 'groq' | 'openrouter' | 'openai';
  onSave: (settings: { attendanceCriteria: number, aiProvider: 'groq' | 'openrouter' | 'openai' }) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PRESETS = [
  { label: '75%', value: 75 },
  { label: '80%', value: 80 },
  { label: '85%', value: 85 },
  { label: '90%', value: 90 },
];

export function SettingsDialog({ attendanceCriteria, aiProvider, onSave, trigger, open, onOpenChange }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [criteria, setCriteria] = useState(attendanceCriteria);
  const [provider, setProvider] = useState<'groq' | 'openrouter' | 'openai'>(aiProvider);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;

  const handleOpen = (newOpen: boolean) => {
    if (!isControlled) setIsOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
    if (newOpen) {
      setCriteria(attendanceCriteria);
      setProvider(aiProvider);
    }
  };

  const handleSave = () => {
    onSave({ attendanceCriteria: criteria, aiProvider: provider });
    if (!isControlled) setIsOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" title="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        )}
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

          {/* AI Provider */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Routine AI Provider</p>
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                type="button"
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${provider === 'groq' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                onClick={() => setProvider('groq')}
              >
                Groq (Fast)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 text-[10px] font-bold rounded-lg transition-all ${provider === 'openrouter' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                onClick={() => setProvider('openrouter')}
              >
                OpenRouter
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 text-[10px] font-bold rounded-lg transition-all ${provider === 'openai' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                onClick={() => setProvider('openai')}
              >
                OpenAI
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
              {provider === 'groq' 
                ? "Uses Groq's high-speed inference for near-instant routine analysis." 
                : provider === 'openai'
                ? "Connects directly to OpenAI GPT-4o-mini for high accuracy."
                : "Connects via OpenRouter for more model options if needed."}
            </p>
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
