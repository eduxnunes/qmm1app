import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface MultiTtnrInputProps {
  value: string; // comma-separated
  onChange: (value: string) => void;
}

export function MultiTtnrInput({ value, onChange }: MultiTtnrInputProps) {
  const [input, setInput] = useState('');
  
  const ttnrs = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTtnr = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (ttnrs.includes(trimmed)) {
      setInput('');
      return;
    }
    onChange([...ttnrs, trimmed].join(', '));
    setInput('');
  };

  const removeTtnr = (index: number) => {
    const updated = ttnrs.filter((_, i) => i !== index);
    onChange(updated.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTtnr();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 8738215975"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addTtnr} title="Add TTNR">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {ttnrs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ttnrs.map((t, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {t}
              <button
                type="button"
                onClick={() => removeTtnr(i)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
