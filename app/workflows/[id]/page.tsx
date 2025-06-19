"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  storageService,
  type WorkflowInstance,
  type WorkflowTemplate,
  type Entity,
  type Personnel,
} from "@/lib/storage"
import { CheckCircle, Clock, AlertCircle, Building2, User, Calendar } from "lucide-react"
import Link from "next/link"

interface WorkflowDetailPageProps {
  params: { id: string }
}

export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [instance, setInstance] = useState<WorkflowInstance | null>(null)
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [entities, setEntities] = useState<Record<string, Entity>>({})
  const [personnel, setPersonnel] = useState<Record<string, Personnel>>({})
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    loadWorkflowData()
  }, [user, router, params.id])

  const loadWorkflowData = () => {
    const workflowInstance = storageService.getWorkflowInstanceById(params.id)
    if (!workflowInstance) {
      router.push("/dashboard")
      return
    }

    setInstance(workflowInstance)

    const workflowTemplate = storageService.getWorkflowTemplateById(workflowInstance.templateId)
    setTemplate(workflowTemplate)

    // Load entities and personnel
    const allEntities = storageService.getEntities()
    const allPersonnel = storageService.getPersonnel()

    const entityMap: Record<string, Entity> = {}
    const personnelMap: Record<string, Personnel> = {}

    allEntities.forEach((entity) => (entityMap[entity.id] = entity))
    allPersonnel.forEach((person) => (personnelMap[person.id] = person))

    setEntities(entityMap)
    setPersonnel(personnelMap)

    // Initialize field values for current milestone
    if (workflowTemplate && workflowInstance.status === "active") {
      const currentMilestone = workflowTemplate.milestones[workflowInstance.currentMilestoneIndex]
      if (currentMilestone) {
        const currentMilestoneData = workflowInstance.milestoneData.find((md) => md.milestoneId === currentMilestone.id)
        if (currentMilestoneData) {
          setFieldValues(currentMilestoneData.fieldValues)
        }
      }
    }
  }

  const canApprove = () => {
    if (!user || !instance || !template || instance.status !== "active") return false

    const currentMilestone = template.milestones[instance.currentMilestoneIndex]
    if (!currentMilestone) return false

    return currentMilestone.approvingEntityId === user.entityId
  }

  const approveMilestone = async () => {
    if (!user || !instance || !template || !canApprove()) return

    setIsApproving(true)

    const currentMilestone = template.milestones[instance.currentMilestoneIndex]
    const updatedMilestoneData = instance.milestoneData.map((md) => {
      if (md.milestoneId === currentMilestone.id) {
        return {
          ...md,
          status: "approved" as const,
          approverId: user.id,
          approvedAt: new Date().toISOString(),
          fieldValues: fieldValues,
        }
      }
      return md
    })

    const isLastMilestone = instance.currentMilestoneIndex === template.milestones.length - 1
    const nextMilestoneIndex = instance.currentMilestoneIndex + 1

    // Update next milestone status if not last
    if (!isLastMilestone) {
      const nextMilestone = template.milestones[nextMilestoneIndex]
      updatedMilestoneData.forEach((md) => {
        if (md.milestoneId === nextMilestone.id) {
          md.status = "active"
        }
      })
    }

    const updatedInstance: Partial<WorkflowInstance> = {
      milestoneData: updatedMilestoneData,
      currentMilestoneIndex: isLastMilestone ? instance.currentMilestoneIndex : nextMilestoneIndex,
      status: isLastMilestone ? "completed" : "active",
      completedAt: isLastMilestone ? new Date().toISOString() : undefined,
    }

    storageService.updateWorkflowInstance(instance.id, updatedInstance)
    setIsApproving(false)
    loadWorkflowData()
  }

  const updateFieldValue = (fieldId: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  if (!user || !instance || !template) return null

  const owner = personnel[instance.ownerId]
  const currentMilestone = instance.status === "active" ? template.milestones[instance.currentMilestoneIndex] : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="outline">← Back</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{instance.title}</h1>
                <p className="text-sm text-gray-500">ID: {instance.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge
                variant={instance.status === "completed" ? "default" : "secondary"}
                className={
                  instance.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                }
              >
                {instance.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workflow Progress */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Progress</CardTitle>
                <CardDescription>Track the status of each milestone</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {template.milestones.map((milestone, index) => {
                    const milestoneData = instance.milestoneData.find((md) => md.milestoneId === milestone.id)
                    const entity = entities[milestone.approvingEntityId]
                    const approver = milestoneData?.approverId ? personnel[milestoneData.approverId] : null

                    const getStatusIcon = () => {
                      switch (milestoneData?.status) {
                        case "approved":
                          return <CheckCircle className="h-6 w-6 text-green-600" />
                        case "active":
                          return <Clock className="h-6 w-6 text-blue-600" />
                        default:
                          return <AlertCircle className="h-6 w-6 text-gray-400" />
                      }
                    }

                    const getStatusColor = () => {
                      switch (milestoneData?.status) {
                        case "approved":
                          return "border-green-200 bg-green-50"
                        case "active":
                          return "border-blue-200 bg-blue-50"
                        default:
                          return "border-gray-200 bg-gray-50"
                      }
                    }

                    return (
                      <div key={milestone.id} className={`border rounded-lg p-4 ${getStatusColor()}`}>
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">{getStatusIcon()}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{milestone.title}</h3>
                              <Badge variant="outline">Step {index + 1}</Badge>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <Building2 className="h-4 w-4 mr-1" />
                              {entity?.name || "Unknown Entity"}
                            </div>

                            {milestone.requirements.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Requirements:</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                  {milestone.requirements.map((req, reqIndex) => (
                                    <li key={reqIndex}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {milestoneData?.status === "approved" && approver && (
                              <div className="mt-3 p-3 bg-white rounded border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center text-sm text-green-700">
                                    <User className="h-4 w-4 mr-1" />
                                    Approved by {approver.name}
                                  </div>
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {milestoneData.approvedAt
                                      ? new Date(milestoneData.approvedAt).toLocaleDateString()
                                      : ""}
                                  </div>
                                </div>
                                {Object.keys(milestoneData.fieldValues).length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {milestone.placeholderFields.map((field) => {
                                      const value = milestoneData.fieldValues[field.id]
                                      if (!value) return null
                                      return (
                                        <div key={field.id} className="text-sm">
                                          <span className="font-medium">{field.label}:</span> {value}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {milestoneData?.status === "active" && canApprove() && (
                              <div className="mt-4 p-4 bg-white rounded border">
                                <h4 className="font-medium mb-3">Complete This Milestone</h4>
                                {milestone.placeholderFields.length > 0 && (
                                  <div className="space-y-3 mb-4">
                                    {milestone.placeholderFields.map((field) => (
                                      <div key={field.id}>
                                        <Label htmlFor={field.id}>{field.label}</Label>
                                        {field.type === "textarea" ? (
                                          <Textarea
                                            id={field.id}
                                            value={fieldValues[field.id] || ""}
                                            onChange={(e) => updateFieldValue(field.id, e.target.value)}
                                            required={field.required}
                                          />
                                        ) : (
                                          <Input
                                            id={field.id}
                                            type={field.type}
                                            value={fieldValues[field.id] || ""}
                                            onChange={(e) => updateFieldValue(field.id, e.target.value)}
                                            required={field.required}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <Button onClick={approveMilestone} disabled={isApproving} className="w-full">
                                  {isApproving ? "Approving..." : "Approve & Sign"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Owner</Label>
                  <p className="text-sm">{owner?.name || "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Started</Label>
                  <p className="text-sm">{new Date(instance.createdAt).toLocaleDateString()}</p>
                </div>
                {instance.completedAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Completed</Label>
                    <p className="text-sm">{new Date(instance.completedAt).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Progress</Label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${((instance.currentMilestoneIndex + (instance.status === "completed" ? 1 : 0)) / template.milestones.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">
                      {instance.status === "completed"
                        ? template.milestones.length
                        : instance.currentMilestoneIndex + 1}{" "}
                      / {template.milestones.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentMilestone && !canApprove() && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Waiting for approval from {entities[currentMilestone.approvingEntityId]?.name || "Unknown Entity"}
                </AlertDescription>
              </Alert>
            )}

            {instance.status === "completed" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>This workflow has been completed successfully!</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
