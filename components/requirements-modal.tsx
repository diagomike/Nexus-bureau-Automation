"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

interface RequirementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirements: string[];
  onSave: (requirements: string[]) => void;
}

export function RequirementsModal({
  open,
  onOpenChange,
  requirements,
  onSave,
}: RequirementsModalProps) {
  const [localRequirements, setLocalRequirements] =
    useState<string[]>(requirements);
  const [newRequirement, setNewRequirement] = useState("");

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setLocalRequirements([...localRequirements, newRequirement.trim()]);
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setLocalRequirements(localRequirements.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localRequirements);
    setLocalRequirements(() => []); // Reset to original requirements
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalRequirements(requirements);
    setNewRequirement("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Requirements</DialogTitle>
          <DialogDescription>
            Add requirements that need to be fulfilled for this milestone
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-requirement">Add New Requirement</Label>
              <Input
                id="new-requirement"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Enter requirement description..."
                onKeyPress={(e) => e.key === "Enter" && addRequirement()}
              />
            </div>
            <Button onClick={addRequirement} className="mt-6">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Current Requirements</Label>
            {localRequirements.length === 0 ? (
              <p className="text-gray-500 text-sm">No requirements added yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {localRequirements.map((req, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <span className="flex-1 text-sm">
                      {index + 1}. {req}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRequirement(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Requirements</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
