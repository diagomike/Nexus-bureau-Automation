"use client"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { PlaceholderField } from "@/lib/storage"

interface DynamicFormRendererProps {
  fields: PlaceholderField[]
  values: Record<string, any>
  onChange: (fieldId: string, value: any) => void
  disabled?: boolean
}

export function DynamicFormRenderer({ fields, values, onChange, disabled = false }: DynamicFormRendererProps) {
  const renderField = (field: PlaceholderField) => {
    const value = values[field.id] || ""

    switch (field.type) {
      case "text":
      case "email":
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
          />
        )

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )

      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        )

      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
          />
        )

      case "select":
        return (
          <Select value={value} onValueChange={(val) => onChange(field.id, val)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "multiselect":
        const multiValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={multiValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked ? [...multiValues, option] : multiValues.filter((v) => v !== option)
                    onChange(field.id, newValues)
                  }}
                  disabled={disabled}
                />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        )

      case "radio":
        return (
          <RadioGroup value={value} onValueChange={(val) => onChange(field.id, val)} disabled={disabled}>
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={!!value}
              onCheckedChange={(checked) => onChange(field.id, checked)}
              disabled={disabled}
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        )

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.id}
              checked={!!value}
              onCheckedChange={(checked) => onChange(field.id, checked)}
              disabled={disabled}
            />
            <Label htmlFor={field.id}>{field.label}</Label>
          </div>
        )

      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            required={field.required}
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          {field.type !== "checkbox" && field.type !== "boolean" && (
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          )}
          {renderField(field)}
        </div>
      ))}
    </div>
  )
}
