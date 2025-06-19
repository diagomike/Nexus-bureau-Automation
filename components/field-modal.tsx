"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus } from "lucide-react"
import type { PlaceholderField } from "@/lib/storage"

interface FieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: PlaceholderField[]
  onSave: (fields: PlaceholderField[]) => void
}

export function FieldModal({ open, onOpenChange, fields, onSave }: FieldModalProps) {
  const [localFields, setLocalFields] = useState<PlaceholderField[]>(fields)
  const [editingField, setEditingField] = useState<Partial<PlaceholderField> | null>(null)
  const [newOption, setNewOption] = useState("")

  const fieldTypes = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Text Area" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown Select" },
    { value: "multiselect", label: "Multi-Select" },
    { value: "radio", label: "Radio Buttons" },
    { value: "checkbox", label: "Checkbox" },
    { value: "boolean", label: "Yes/No Switch" },
  ]

  const needsOptions = ["select", "multiselect", "radio"]

  const startNewField = () => {
    setEditingField({
      id: Date.now().toString(),
      label: "",
      type: "text",
      required: false,
      options: [],
      placeholder: "",
    })
  }

  const saveField = () => {
    if (!editingField || !editingField.label?.trim()) return

    const field: PlaceholderField = {
      id: editingField.id || Date.now().toString(),
      label: editingField.label.trim(),
      type: editingField.type || "text",
      required: editingField.required || false,
      options: editingField.options || [],
      placeholder: editingField.placeholder || "",
    }

    const existingIndex = localFields.findIndex((f) => f.id === field.id)
    if (existingIndex >= 0) {
      setLocalFields(localFields.map((f, i) => (i === existingIndex ? field : f)))
    } else {
      setLocalFields([...localFields, field])
    }

    setEditingField(null)
  }

  const editField = (field: PlaceholderField) => {
    setEditingField({ ...field })
  }

  const removeField = (fieldId: string) => {
    setLocalFields(localFields.filter((f) => f.id !== fieldId))
  }

  const addOption = () => {
    if (!newOption.trim() || !editingField) return

    const options = editingField.options || []
    setEditingField({
      ...editingField,
      options: [...options, newOption.trim()],
    })
    setNewOption("")
  }

  const removeOption = (optionIndex: number) => {
    if (!editingField) return

    const options = editingField.options || []
    setEditingField({
      ...editingField,
      options: options.filter((_, i) => i !== optionIndex),
    })
  }

  const handleSave = () => {
    onSave(localFields)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalFields(fields)
    setEditingField(null)
    setNewOption("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Input Fields</DialogTitle>
          <DialogDescription>Create dynamic form fields that approvers will fill out</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Field List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Current Fields</Label>
              <Button onClick={startNewField} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {localFields.length === 0 ? (
              <p className="text-gray-500 text-sm">No fields added yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {localFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2 p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{field.label}</div>
                      <div className="text-sm text-gray-500">
                        Type: {fieldTypes.find((t) => t.value === field.type)?.label}
                        {field.required && (
                          <Badge variant="secondary" className="ml-2">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => editField(field)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeField(field.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Field Editor */}
          <div className="space-y-4">
            {editingField ? (
              <>
                <Label className="text-base font-semibold">
                  {localFields.find((f) => f.id === editingField.id) ? "Edit Field" : "New Field"}
                </Label>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="field-label">Field Label *</Label>
                    <Input
                      id="field-label"
                      value={editingField.label || ""}
                      onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                      placeholder="e.g., Employee Name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="field-type">Field Type</Label>
                    <Select
                      value={editingField.type}
                      onValueChange={(value) =>
                        setEditingField({
                          ...editingField,
                          type: value as PlaceholderField["type"],
                          options: needsOptions.includes(value) ? editingField.options || [] : undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="field-placeholder">Placeholder Text</Label>
                    <Input
                      id="field-placeholder"
                      value={editingField.placeholder || ""}
                      onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                      placeholder="Hint text for users"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="field-required"
                      checked={editingField.required || false}
                      onCheckedChange={(checked) => setEditingField({ ...editingField, required: !!checked })}
                    />
                    <Label htmlFor="field-required">Required field</Label>
                  </div>

                  {needsOptions.includes(editingField.type || "") && (
                    <div>
                      <Label>Options</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          placeholder="Add option..."
                          onKeyPress={(e) => e.key === "Enter" && addOption()}
                        />
                        <Button onClick={addOption} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {(editingField.options || []).map((option, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            <span className="flex-1 text-sm">{option}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeOption(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveField} disabled={!editingField.label?.trim()}>
                    Save Field
                  </Button>
                  <Button variant="outline" onClick={() => setEditingField(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Select a field to edit or create a new one</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save All Fields</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
