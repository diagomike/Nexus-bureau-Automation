"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import type { PlaceholderField } from "@/lib/storage"
import { verifyTelebirr } from "@/lib/verifyTelebirr"
import { verifyCBE } from "@/lib/verifyCBE"

interface DynamicFormRendererProps {
  fields: PlaceholderField[]
  values: Record<string, any>
  onChange: (fieldId: string, value: any) => void
  disabled?: boolean
}

export function DynamicFormRenderer({ fields, values, onChange, disabled = false }: DynamicFormRendererProps) {
  const [verificationStates, setVerificationStates] = useState<
    Record<
      string,
      {
        verifying: boolean
        result: any
        error: string
      }
    >
  >({})

  const handleFileUpload = (fieldId: string, file: File | null) => {
    if (!file) {
      onChange(fieldId, null)
      return
    }

    const field = fields.find((f) => f.id === fieldId)
    const maxSize = field?.validation?.maxFileSize || 5 // Default 5MB
    const allowedTypes = field?.validation?.allowedFileTypes || ["jpg", "jpeg", "png", "pdf", "doc", "docx"]

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    // Check file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      alert(`File type not allowed. Allowed types: ${allowedTypes.join(", ")}`)
      return
    }

    // Convert to base64 for storage
    const reader = new FileReader()
    reader.onload = (e) => {
      onChange(fieldId, {
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target?.result,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleVerification = async (fieldId: string, reference: string, type: "telebirr" | "cbe", suffix?: string) => {
    setVerificationStates((prev) => ({
      ...prev,
      [fieldId]: { verifying: true, result: null, error: "" },
    }))

    try {
      let result
      if (type === "telebirr") {
        result = await verifyTelebirr(reference)
      } else {
        result = await verifyCBE(reference, suffix || "")
      }

      if (result) {
        setVerificationStates((prev) => ({
          ...prev,
          [fieldId]: { verifying: false, result, error: "" },
        }))
        onChange(fieldId, { reference, result, verified: true })
      } else {
        setVerificationStates((prev) => ({
          ...prev,
          [fieldId]: { verifying: false, result: null, error: "Verification failed" },
        }))
      }
    } catch (error) {
      setVerificationStates((prev) => ({
        ...prev,
        [fieldId]: { verifying: false, result: null, error: "Verification error" },
      }))
    }
  }

  const renderField = (field: PlaceholderField) => {
    const value = values[field.id] || ""
    const verificationState = verificationStates[field.id]

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

      case "file":
        return (
          <div className="space-y-2">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label htmlFor={field.id} className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Click to upload or drag and drop
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Max {field.validation?.maxFileSize || 5}MB. Allowed:{" "}
                      {field.validation?.allowedFileTypes?.join(", ") || "JPG, PNG, PDF, DOC, DOCX"}
                    </span>
                  </label>
                  <input
                    id={field.id}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(field.id, e.target.files?.[0] || null)}
                    disabled={disabled}
                    accept={field.validation?.allowedFileTypes?.map((type) => `.${type}`).join(",")}
                  />
                </div>
              </div>
            </div>
            {value && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{value.name}</span>
                    <span className="text-xs text-gray-500">({(value.size / 1024).toFixed(1)} KB)</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case "telebirr_verification":
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={value?.reference || ""}
                onChange={(e) => onChange(field.id, { ...value, reference: e.target.value })}
                placeholder="Enter Telebirr reference number"
                disabled={disabled}
              />
              <Button
                onClick={() => handleVerification(field.id, value?.reference || "", "telebirr")}
                disabled={disabled || verificationState?.verifying || !value?.reference}
              >
                {verificationState?.verifying ? "Verifying..." : "Verify"}
              </Button>
            </div>

            {verificationState?.result && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Verification Successful</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>Payer: {verificationState.result.payerName}</div>
                    <div>Amount: {verificationState.result.settledAmount}</div>
                    <div>Date: {verificationState.result.paymentDate}</div>
                    <div>Status: {verificationState.result.transactionStatus}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {verificationState?.error && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-800">{verificationState.error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case "cbe_verification":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={value?.reference || ""}
                onChange={(e) => onChange(field.id, { ...value, reference: e.target.value })}
                placeholder="Reference number"
                disabled={disabled}
              />
              <Input
                value={value?.suffix || ""}
                onChange={(e) => onChange(field.id, { ...value, suffix: e.target.value })}
                placeholder="Suffix"
                disabled={disabled}
              />
            </div>
            <Button
              onClick={() => handleVerification(field.id, value?.reference || "", "cbe", value?.suffix)}
              disabled={disabled || verificationState?.verifying || !value?.reference || !value?.suffix}
              className="w-full"
            >
              {verificationState?.verifying ? "Verifying..." : "Verify CBE Payment"}
            </Button>

            {verificationState?.result && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Verification Successful</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>Payer: {verificationState.result.payerName}</div>
                    <div>Amount: {verificationState.result.amount}</div>
                    <div>Date: {verificationState.result.transactionDate}</div>
                    <div>Status: {verificationState.result.status}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {verificationState?.error && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-800">{verificationState.error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
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
