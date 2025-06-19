"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { storageService, type WorkflowTemplate, type MilestoneData } from "@/lib/storage"
import { FileText, Play, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewWorkflowPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [workflowTitle, setWorkflowTitle] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    loadTemplates()

    if (templateId) {
      const template = storageService.getWorkflowTemplateById(templateId)
      if (template) {
        setSelectedTemplate(template)
        setWorkflowTitle(template.title)
      }
    }
  }, [user, router, templateId])

  const loadTemplates = () => {
    const allTemplates = storageService.getWorkflowTemplates()
    setTemplates(allTemplates)
  }

  const createWorkflow = async () => {
    if (!user || !selectedTemplate || !workflowTitle.trim()) return

    setCreating(true)
    try {
      // Initialize milestone data
      const milestoneData: MilestoneData[] = selectedTemplate.milestones.map((milestone, index) => ({
        milestoneId: milestone.id,
        status: index === 0 ? "active" : "pending",
        fieldValues: {},
      }))

      const newWorkflow = storageService.createWorkflowInstance({
        templateId: selectedTemplate.id,
        title: workflowTitle.trim(),
        ownerId: user.id,
        status: "active",
        currentMilestoneIndex: 0,
        milestoneData,
      })

      router.push(`/workflows/${newWorkflow.id}`)
    } catch (error) {
      alert("Failed to create workflow")
    } finally {
      setCreating(false)
    }
  }

  if (!user) return null

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start New Workflow</h1>
                <p className="text-sm text-gray-500">Choose a template and begin a new process</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Templates</CardTitle>
                <CardDescription>Select a workflow template to start with</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No templates available</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template)
                          setWorkflowTitle(template.title)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-blue-600 mt-1" />
                            <div className="flex-1">
                              <div className="font-medium">{template.title}</div>
                              <div className="text-sm text-gray-500 mt-1">{template.description}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">{template.milestones.length} steps</Badge>
                                <span className="text-xs text-gray-400">
                                  Created {new Date(template.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Workflow Details */}
          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Details</CardTitle>
                    <CardDescription>Configure your new workflow instance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="workflow-title">Workflow Title</Label>
                      <Input
                        id="workflow-title"
                        value={workflowTitle}
                        onChange={(e) => setWorkflowTitle(e.target.value)}
                        placeholder="Enter a descriptive title for this workflow"
                      />
                    </div>

                    <div>
                      <Label>Template</Label>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="font-medium">{selectedTemplate.title}</div>
                        <div>{selectedTemplate.description}</div>
                      </div>
                    </div>

                    <div>
                      <Label>Owner</Label>
                      <div className="text-sm text-gray-600 mt-1">
                        {user.name} ({user.email})
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Process Overview</CardTitle>
                    <CardDescription>Steps that will be executed in this workflow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedTemplate.milestones.map((milestone, index) => {
                        const approvingEntity = storageService.getEntityById(milestone.approvingEntityId)
                        return (
                          <div key={milestone.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{milestone.title}</div>
                              <div className="text-sm text-gray-500">
                                Approver: {approvingEntity?.name || "Unknown Entity"}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {milestone.requirements.length} requirements, {milestone.placeholderFields.length}{" "}
                                fields
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={createWorkflow}
                  disabled={creating || !workflowTitle.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {creating ? "Creating Workflow..." : "Start Workflow"}
                </Button>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Template</h3>
                  <p className="text-gray-500">Choose a workflow template from the list to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
