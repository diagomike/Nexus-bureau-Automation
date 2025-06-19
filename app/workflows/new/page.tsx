"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { storageService, type WorkflowTemplate, type MilestoneData } from "@/lib/storage"
import { FileText, ArrowRight, Building2 } from "lucide-react"
import Link from "next/link"

export default function NewWorkflowPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")

  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const allTemplates = storageService.getWorkflowTemplates()
    setTemplates(allTemplates)

    if (templateId) {
      const template = storageService.getWorkflowTemplateById(templateId)
      setSelectedTemplate(template)
    }
  }, [user, router, templateId])

  const startWorkflow = (template: WorkflowTemplate) => {
    if (!user) return

    // Initialize milestone data
    const milestoneData: MilestoneData[] = template.milestones.map((milestone, index) => ({
      milestoneId: milestone.id,
      status: index === 0 ? "active" : "pending",
      fieldValues: {},
    }))

    const instance = storageService.createWorkflowInstance({
      templateId: template.id,
      title: template.title,
      ownerId: user.id,
      status: "active",
      currentMilestoneIndex: 0,
      milestoneData,
    })

    router.push(`/workflows/${instance.id}`)
  }

  if (!user) return null

  if (selectedTemplate) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/workflows/new" className="mr-4">
                  <Button variant="outline">← Back</Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start Workflow</h1>
                  <p className="text-sm text-gray-500">{selectedTemplate.title}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-6 w-6 mr-2" />
                {selectedTemplate.title}
              </CardTitle>
              <CardDescription>{selectedTemplate.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Workflow Steps</h3>
                  <div className="space-y-4">
                    {selectedTemplate.milestones.map((milestone, index) => {
                      const entity = storageService.getEntityById(milestone.approvingEntityId)
                      return (
                        <div key={milestone.id} className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{milestone.title}</h4>
                            <p className="text-sm text-gray-500 flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              {entity?.name || "Unknown Entity"}
                            </p>
                            {milestone.requirements.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700">Requirements:</p>
                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                  {milestone.requirements.map((req, reqIndex) => (
                                    <li key={reqIndex}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          {index < selectedTemplate.milestones.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Link href="/workflows/new">
                    <Button variant="outline">Choose Different Template</Button>
                  </Link>
                  <Button onClick={() => startWorkflow(selectedTemplate)}>Start This Workflow</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start New Workflow</h1>
                <p className="text-sm text-gray-500">Choose a template to begin</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
              <p className="text-gray-500 mb-4">Contact your administrator to create workflow templates</p>
              <Link href="/dashboard">
                <Button>Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Steps:</span>
                      <Badge variant="secondary">{template.milestones.length}</Badge>
                    </div>
                    <Button className="w-full" onClick={() => router.push(`/workflows/new?template=${template.id}`)}>
                      Select Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
