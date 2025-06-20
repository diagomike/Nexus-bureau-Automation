"use client"

import { use, useEffect, useState } from "react"
// import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { DynamicFormRenderer } from "@/components/dynamic-form-renderer"
import {
  storageService,
  type WorkflowInstance,
  type WorkflowTemplate,
  type Entity,
  type Personnel,
} from "@/lib/storage"
import { FileText, Clock, CheckCircle, AlertCircle, User, Calendar, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { pdfGenerator } from "@/lib/pdf-generator"

interface WorkflowPageProps {
  params: Promise<{ id: string }>
}

export default function WorkflowPage({ params }: WorkflowPageProps) {
  // const { user } = useAuth()
  const unwrappedParams = use(params) // <-- unwrap the params promise

  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowInstance | null>(null)
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [owner, setOwner] = useState<Personnel | null>(null)
  const [entities, setEntities] = useState<Record<string, Entity>>({})
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    // Set user on mount
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }
    setUser(currentUser)
  }, [router])

  useEffect(() => {
    if (!user) return
    loadWorkflow(unwrappedParams.id)
  }, [user]) // params.id])

  const loadWorkflow = (workflowId: string) => {
    const workflowInstance = storageService.getWorkflowInstanceById(workflowId)
    if (!workflowInstance) {
      router.push("/dashboard")
      return
    }

    setWorkflow(workflowInstance)

    // Load template
    const workflowTemplate = storageService.getWorkflowTemplateById(workflowInstance.templateId)
    setTemplate(workflowTemplate)

    // Load owner
    const workflowOwner = storageService.getPersonnelById(workflowInstance.ownerId)
    setOwner(workflowOwner)

    // Load entities
    const allEntities = storageService.getEntities()
    const entityMap: Record<string, Entity> = {}
    allEntities.forEach((entity) => {
      entityMap[entity.id] = entity
    })
    setEntities(entityMap)

    // Load current milestone form values
    if (workflowTemplate) {
      const currentMilestone = workflowTemplate.milestones[workflowInstance.currentMilestoneIndex]
      const currentMilestoneData = workflowInstance.milestoneData.find((md) => md.milestoneId === currentMilestone?.id)
      if (currentMilestoneData) {
        setFormValues(currentMilestoneData.fieldValues)
      }
    }
  }

  const handleFormChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const canApprove = () => {
    if (!user || !workflow || !template) return false

    const currentMilestone = template.milestones[workflow.currentMilestoneIndex]
    if (!currentMilestone) return false

    // Check if user's entity matches the approving entity
    return currentMilestone.approvingEntityId === user.entityId
  }

  const approveMilestone = async () => {
    if (!user || !workflow || !template || !canApprove()) return

    setApproving(true)
    try {
      const currentMilestone = template.milestones[workflow.currentMilestoneIndex]

      // Update milestone data
      const updatedMilestoneData = workflow.milestoneData.map((md) => {
        if (md.milestoneId === currentMilestone.id) {
          return {
            ...md,
            status: "approved" as const,
            approverId: user.id,
            approvedAt: new Date().toISOString(),
            fieldValues: formValues,
          }
        }
        return md
      })

      // Check if this is the last milestone
      const isLastMilestone = workflow.currentMilestoneIndex === template.milestones.length - 1
      const nextMilestoneIndex = workflow.currentMilestoneIndex + 1

      // Activate next milestone if not last
      if (!isLastMilestone) {
        const nextMilestone = template.milestones[nextMilestoneIndex]
        updatedMilestoneData.forEach((md) => {
          if (md.milestoneId === nextMilestone.id) {
            md.status = "active"
          }
        })
      }

      // Update workflow
      storageService.updateWorkflowInstance(workflow.id, {
        milestoneData: updatedMilestoneData,
        currentMilestoneIndex: isLastMilestone ? workflow.currentMilestoneIndex : nextMilestoneIndex,
        status: isLastMilestone ? "completed" : "active",
        completedAt: isLastMilestone ? new Date().toISOString() : undefined,
      })

      loadWorkflow(workflow.id)
    } catch (error) {
      alert("Failed to approve milestone")
    } finally {
      setApproving(false)
    }
  }

  const generatePDF = async () => {
    if (!workflow || !template || !owner) return

    try {
      const blob = await pdfGenerator.generateWorkflowPDF({
        workflowInstance: workflow,
        template,
        owner,
        entities,
        includeSignatures: true,
      })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `workflow-${workflow.id}-${workflow.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      alert("Failed to generate PDF")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "active":
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "active":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!user || !workflow || !template) return null

  const progress =
    (workflow.milestoneData.filter((md) => md.status === "approved").length / template.milestones.length) * 100
  const currentMilestone = template.milestones[workflow.currentMilestoneIndex]
  const currentMilestoneData = workflow.milestoneData.find((md) => md.milestoneId === currentMilestone?.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{workflow.title}</h1>
                <p className="text-sm text-gray-500">ID: {workflow.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(workflow.status)}>{workflow.status}</Badge>
              {workflow.status === "completed" && (
                <Button variant="outline" onClick={generatePDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Workflow Progress
                </CardTitle>
                <CardDescription>
                  {workflow.milestoneData.filter((md) => md.status === "approved").length} of{" "}
                  {template.milestones.length} milestones completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-4" />
                <div className="text-sm text-gray-600">{Math.round(progress)}% Complete</div>
              </CardContent>
            </Card>

            {/* Current Milestone */}
            {workflow.status === "active" && currentMilestone && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Current Step: {currentMilestone.title}
                  </CardTitle>
                  <CardDescription>
                    Waiting for approval from {entities[currentMilestone.approvingEntityId]?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Requirements */}
                  {currentMilestone.requirements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Requirements</h4>
                      <ul className="space-y-1">
                        {currentMilestone.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-gray-400">{index + 1}.</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Form Fields */}
                  {currentMilestone.placeholderFields.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-4">Information Required</h4>
                      <DynamicFormRenderer
                        fields={currentMilestone.placeholderFields}
                        values={formValues}
                        onChange={handleFormChange}
                        disabled={!canApprove()}
                      />
                    </div>
                  )}

                  {/* Approval Button */}
                  {canApprove() && (
                    <div className="pt-4 border-t">
                      <Button onClick={approveMilestone} disabled={approving} className="w-full" size="lg">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approving ? "Approving..." : "Approve & Continue"}
                      </Button>
                    </div>
                  )}

                  {!canApprove() && currentMilestoneData?.status === "active" && (
                    <div className="pt-4 border-t">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Waiting for approval from {entities[currentMilestone.approvingEntityId]?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Milestone History */}
            <Card>
              <CardHeader>
                <CardTitle>Milestone History</CardTitle>
                <CardDescription>Complete timeline of this workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {template.milestones.map((milestone, index) => {
                    const milestoneData = workflow.milestoneData.find((md) => md.milestoneId === milestone.id)
                    const approver = milestoneData?.approverId
                      ? storageService.getPersonnelById(milestoneData.approverId)
                      : null
                    const approvingEntity = entities[milestone.approvingEntityId]

                    return (
                      <div key={milestone.id} className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">{getStatusIcon(milestoneData?.status || "pending")}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{milestone.title}</h4>
                            <Badge variant="outline" className={getStatusColor(milestoneData?.status || "pending")}>
                              {milestoneData?.status || "pending"}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">Approving Entity: {approvingEntity?.name}</div>
                          {milestoneData?.status === "approved" && (
                            <div className="text-xs text-gray-500">
                              Approved by {approver?.name} on {new Date(milestoneData.approvedAt!).toLocaleString()}
                            </div>
                          )}
                          {milestoneData?.fieldValues && Object.keys(milestoneData.fieldValues).length > 0 && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <div className="text-xs font-medium text-gray-700 mb-2">Submitted Data:</div>
                              {Object.entries(milestoneData.fieldValues).map(([fieldId, value]) => {
                                const field = milestone.placeholderFields.find((f) => f.id === fieldId)
                                if (!field) return null
                                return (
                                  <div key={fieldId} className="text-xs text-gray-600">
                                    <span className="font-medium">{field.label}:</span>{" "}
                                    {Array.isArray(value) ? value.join(", ") : String(value)}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Workflow Info */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Owner</div>
                    <div className="text-sm text-gray-600">{owner?.name}</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div className="text-sm text-gray-600">{new Date(workflow.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {workflow.completedAt && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-sm font-medium">Completed</div>
                        <div className="text-sm text-gray-600">{new Date(workflow.completedAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Template Info */}
            <Card>
              <CardHeader>
                <CardTitle>Template Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Template</div>
                  <div className="text-sm text-gray-600">{template.title}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium">Description</div>
                  <div className="text-sm text-gray-600">{template.description}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-sm font-medium">Total Steps</div>
                  <div className="text-sm text-gray-600">{template.milestones.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
