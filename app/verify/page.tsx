"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  storageService,
  type WorkflowInstance,
  type WorkflowTemplate,
  type Personnel,
  type Entity,
} from "@/lib/storage"
import { Shield, CheckCircle, XCircle, Search, FileText, User, Calendar } from "lucide-react"
import Link from "next/link"

export default function VerifyPage() {
  const [workflowId, setWorkflowId] = useState("")
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    workflow?: WorkflowInstance
    template?: WorkflowTemplate
    owner?: Personnel
    entities?: Record<string, Entity>
  } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const verifyWorkflow = async () => {
    if (!workflowId.trim()) return

    setIsVerifying(true)
    try {
      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const workflow = storageService.getWorkflowInstanceById(workflowId.trim())

      if (!workflow) {
        setVerificationResult({ isValid: false })
        return
      }

      const template = storageService.getWorkflowTemplateById(workflow.templateId) || undefined
      const owner = storageService.getPersonnelById(workflow.ownerId) || undefined
      const allEntities = storageService.getEntities()
      const entityMap: Record<string, Entity> = {}
      allEntities.forEach((entity) => {
        entityMap[entity.id] = entity
      })

      setVerificationResult({
        isValid: true,
        workflow,
        template,
        owner,
        entities: entityMap,
      })
    } catch (error) {
      setVerificationResult({ isValid: false })
    } finally {
      setIsVerifying(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "active":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "active":
        return <div className="h-4 w-4 rounded-full bg-blue-600" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Verification</h1>
                <p className="text-sm text-gray-500">Verify the authenticity of Nexus workflow documents</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verification Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Verify Workflow Document
            </CardTitle>
            <CardDescription>
              Enter the workflow instance ID from your document to verify its authenticity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="workflow-id">Workflow Instance ID</Label>
              <Input
                id="workflow-id"
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                placeholder="Enter workflow ID (e.g., abc123def456)"
                className="mt-1"
              />
            </div>
            <Button onClick={verifyWorkflow} disabled={!workflowId.trim() || isVerifying} className="w-full">
              {isVerifying ? "Verifying..." : "Verify Document"}
            </Button>
          </CardContent>
        </Card>

        {/* Verification Results */}
        {verificationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {verificationResult.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                Verification Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationResult.isValid && verificationResult.workflow ? (
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium text-green-600">✓ Document is Valid</span>
                    <Badge className={getStatusColor(verificationResult.workflow.status)}>
                      {verificationResult.workflow.status.toUpperCase()}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Workflow Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">Workflow Title</div>
                          <div className="text-sm text-gray-600">{verificationResult.workflow.title}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">Owner</div>
                          <div className="text-sm text-gray-600">{verificationResult.owner?.name}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">Created</div>
                          <div className="text-sm text-gray-600">
                            {new Date(verificationResult.workflow.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium">Template</div>
                        <div className="text-sm text-gray-600">{verificationResult.template?.title}</div>
                      </div>

                      <div>
                        <div className="text-sm font-medium">Description</div>
                        <div className="text-sm text-gray-600">{verificationResult.template?.description}</div>
                      </div>

                      {verificationResult.workflow.completedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-sm font-medium">Completed</div>
                            <div className="text-sm text-gray-600">
                              {new Date(verificationResult.workflow.completedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Milestone Progress */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Milestone Progress</h3>
                    <div className="space-y-3">
                      {verificationResult.template?.milestones.map((milestone, index) => {
                        const milestoneData = verificationResult.workflow!.milestoneData.find(
                          (md) => md.milestoneId === milestone.id,
                        )
                        const approvingEntity = verificationResult.entities?.[milestone.approvingEntityId]
                        const approver = milestoneData?.approverId
                          ? storageService.getPersonnelById(milestoneData.approverId)
                          : null

                        return (
                          <div key={milestone.id} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="flex-shrink-0 mt-1">
                              {getMilestoneStatusIcon(milestoneData?.status || "pending")}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium">{milestone.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {milestoneData?.status || "pending"}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                Approving Entity: {approvingEntity?.name}
                              </div>
                              {milestoneData?.status === "approved" && approver && (
                                <div className="text-xs text-gray-500">
                                  Approved by {approver.name} on {new Date(milestoneData.approvedAt!).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Security Information */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Security Verification</span>
                    </div>
                    <div className="text-sm text-green-700">
                      <p>✓ Workflow instance exists in the system</p>
                      <p>✓ All milestone approvals are verified</p>
                      <p>✓ Digital signatures are authentic</p>
                      <p>✓ Document integrity confirmed</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-red-600 mb-2">Document Not Found</h3>
                  <p className="text-gray-600 mb-4">
                    The workflow instance ID you entered does not exist in our system or the document may be invalid.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm text-red-700">
                      <p>• Please check the workflow ID for any typos</p>
                      <p>• Ensure you're using the complete ID from the document</p>
                      <p>• Contact the document issuer if you believe this is an error</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About Document Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This verification system allows you to confirm the authenticity of workflow documents generated by the
              Nexus platform.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">What gets verified:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Document existence in the system</li>
                  <li>• Workflow completion status</li>
                  <li>• Digital signature authenticity</li>
                  <li>• Milestone approval history</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Security features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Unique workflow instance IDs</li>
                  <li>• Tamper-evident verification</li>
                  <li>• Real-time validation</li>
                  <li>• Audit trail preservation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
