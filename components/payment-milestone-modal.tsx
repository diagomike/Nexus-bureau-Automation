"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, CheckCircle } from "lucide-react"
import { storageService, type PaymentMilestone, type Entity } from "@/lib/storage"
import { verifyTelebirr } from "@/lib/verifyTelebirr"

interface PaymentMilestoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestone: Partial<PaymentMilestone> | null
  onSave: (milestone: PaymentMilestone) => void
  entityId: string
}

export function PaymentMilestoneModal({ open, onOpenChange, milestone, onSave, entityId }: PaymentMilestoneModalProps) {
  const [formData, setFormData] = useState<Partial<PaymentMilestone>>({
    title: "",
    paymentProvider: "telebirr",
    requiredAmount: 0,
    receiverName: "",
    receiverAccount: "",
    requirements: [],
    ...milestone,
  })
  const [entity, setEntity] = useState<Entity | null>(null)
  const [setupMode, setSetupMode] = useState<"existing" | "new">("existing")
  const [sampleReference, setSampleReference] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)

  useEffect(() => {
    const entityData = storageService.getEntityById(entityId)
    setEntity(entityData)

    if (entityData?.paymentDetails) {
      setFormData((prev) => ({
        ...prev,
        receiverName: entityData.paymentDetails!.receiverName,
        receiverAccount: entityData.paymentDetails!.receiverAccount,
      }))
    }
  }, [entityId])

  const handleVerifySample = async () => {
    if (!sampleReference.trim()) return

    setVerifying(true)
    try {
      const result = await verifyTelebirr(sampleReference)
      if (result) {
        setVerificationResult(result)
        setFormData((prev) => ({
          ...prev,
          receiverName: result.creditedPartyName,
          receiverAccount: result.creditedPartyAccountNo,
        }))
      }
    } catch (error) {
      console.error("Verification failed:", error)
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = () => {
    if (!formData.title || !formData.receiverName || !formData.receiverAccount || !formData.requiredAmount) {
      return
    }

    const paymentMilestone: PaymentMilestone = {
      id: milestone?.id || Date.now().toString(),
      type: "payment",
      title: formData.title!,
      paymentProvider: formData.paymentProvider!,
      requiredAmount: formData.requiredAmount!,
      receiverName: formData.receiverName!,
      receiverAccount: formData.receiverAccount!,
      requirements: formData.requirements || [],
      order: milestone?.order || 0,
    }

    // Save payment details to entity if verified
    if (verificationResult && entity) {
      storageService.updateEntity(entity.id, {
        paymentDetails: {
          provider: formData.paymentProvider!,
          receiverName: formData.receiverName!,
          receiverAccount: formData.receiverAccount!,
          verified: true,
        },
      })
    }

    onSave(paymentMilestone)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            {milestone ? "Edit Payment Milestone" : "Add Payment Milestone"}
          </DialogTitle>
          <DialogDescription>Configure a payment verification step in your workflow</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="title">Milestone Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Application Fee Payment"
            />
          </div>

          <div>
            <Label htmlFor="provider">Payment Provider</Label>
            <Select
              value={formData.paymentProvider}
              onValueChange={(value: "telebirr" | "cbe") =>
                setFormData((prev) => ({ ...prev, paymentProvider: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telebirr">Telebirr</SelectItem>
                <SelectItem value="cbe">CBE (Commercial Bank of Ethiopia)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Required Amount (Birr)</Label>
            <Input
              id="amount"
              type="number"
              value={formData.requiredAmount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, requiredAmount: Number.parseFloat(e.target.value) || 0 }))
              }
              placeholder="0.00"
            />
          </div>

          {/* Payment Details Setup */}
          <div className="space-y-4">
            <Label>Receiver Information</Label>

            {entity?.paymentDetails?.verified ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Verified Payment Details</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Name: {entity.paymentDetails.receiverName}</div>
                    <div>Account: {entity.paymentDetails.receiverAccount}</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={setupMode === "existing" ? "default" : "outline"}
                    onClick={() => setSetupMode("existing")}
                    size="sm"
                  >
                    Use Existing
                  </Button>
                  <Button
                    variant={setupMode === "new" ? "default" : "outline"}
                    onClick={() => setSetupMode("new")}
                    size="sm"
                  >
                    Setup New
                  </Button>
                </div>

                {setupMode === "new" && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 space-y-4">
                      <div className="text-sm text-blue-800">
                        <strong>Setup Payment Details:</strong> Provide a sample receipt to automatically extract
                        receiver information
                      </div>

                      <div>
                        <Label htmlFor="sample">Sample Telebirr Reference</Label>
                        <div className="flex gap-2">
                          <Input
                            id="sample"
                            value={sampleReference}
                            onChange={(e) => setSampleReference(e.target.value)}
                            placeholder="e.g., CFK21YPWYQ"
                          />
                          <Button onClick={handleVerifySample} disabled={verifying}>
                            {verifying ? "Verifying..." : "Verify"}
                          </Button>
                        </div>
                      </div>

                      {verificationResult && (
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm space-y-1">
                            <div>
                              <strong>Extracted Details:</strong>
                            </div>
                            <div>Name: {verificationResult.creditedPartyName}</div>
                            <div>Account: {verificationResult.creditedPartyAccountNo}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {setupMode === "existing" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="receiverName">Receiver Name</Label>
                      <Input
                        id="receiverName"
                        value={formData.receiverName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, receiverName: e.target.value }))}
                        placeholder="Organization Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="receiverAccount">Receiver Account</Label>
                      <Input
                        id="receiverAccount"
                        value={formData.receiverAccount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, receiverAccount: e.target.value }))}
                        placeholder="Account Number"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="requirements">Additional Requirements</Label>
            <Textarea
              id="requirements"
              value={formData.requirements?.join("\n") || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requirements: e.target.value.split("\n").filter((r) => r.trim()),
                }))
              }
              placeholder="Enter each requirement on a new line..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Payment Milestone</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
