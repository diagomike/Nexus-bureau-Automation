"use client"

import { useEffect, useState } from "react"
// import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  storageService,
  type WorkflowTemplate,
  type Entity,
  type Milestone,
  type PlaceholderField,
  type Personnel,
} from "@/lib/storage"
import { Plus, FileText, Trash2 } from "lucide-react"
import Link from "next/link"
import { RequirementsModal } from "@/components/requirements-modal"
import { FieldModal } from "@/components/field-modal"
import { AuthService } from "@/lib/auth"
import { ExecutionerSelector } from "@/components/executioner-selector"
import { ApprovingEntitySelector } from "@/components/approving-entity-selector" // Import the new component

export default function TemplatesPage() {
  // const { user } = useAuth()
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState<{
    title: string
    description: string
    milestones: Milestone[]
    executioner: { type: "personnel" | "entity"; id: string }
  }>({
    title: "",
    description: "",
    milestones: [],
    executioner: { type: "personnel", id: "" },
  })

  const [viewingTemplate, setViewingTemplate] = useState<WorkflowTemplate | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null)

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.role === "member") {
      router.push("/dashboard")
      return
    }
    setUser(currentUser)

    // Load templates and entities after setting user
    const userTemplates = storageService.getWorkflowTemplatesByEntity(currentUser.entityId)
    setTemplates(userTemplates)
    const allEntities = storageService.getEntities()
    setEntities(allEntities)
  }, [router])

  const loadTemplates = () => {
    if (!user) return
    const userTemplates = storageService.getWorkflowTemplatesByEntity(user.entityId)
    setTemplates(userTemplates)
  }

  const viewTemplate = (template: WorkflowTemplate) => {
    setViewingTemplate(template)
    setNewTemplate({
      title: template.title,
      description: template.description,
      milestones: template.milestones,
      executioner: template.executioner,
    })
    setHasChanges(false)
    setIsCreateDialogOpen(true)
  }

  const archiveTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to archive this template? It will no longer be available for new workflows.")) {
      // For now, we'll use a simple flag in the template object
      const template = storageService.getWorkflowTemplateById(templateId)
      if (template) {
        storageService.updateWorkflowTemplate(templateId, { ...template, archived: true })
        loadTemplates()
      }
    }
  }

  const handleTemplateChange = (field: string, value: any) => {
    setNewTemplate((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const createTemplate = () => {
    if (!user || !newTemplate.title.trim()) return

    storageService.createWorkflowTemplate({
      title: newTemplate.title,
      description: newTemplate.description,
      entityId: user.entityId,
      createdBy: user.id,
      milestones: newTemplate.milestones,
      executioner: newTemplate.executioner,
    })

    setNewTemplate({
      title: "",
      description: "",
      milestones: [],
      executioner: { type: "personnel", id: "" },
    })
    setViewingTemplate(null)
    setHasChanges(false)
    setIsCreateDialogOpen(false)
    loadTemplates()
  }

  const deleteTemplate = (templateId: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      storageService.deleteWorkflowTemplate(templateId)
      loadTemplates()
    }
  }

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: "",
      approvingEntityId: "",
      requirements: [],
      placeholderFields: [],
      order: newTemplate.milestones.length,
    }
    setNewTemplate((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }))
  }

  const updateMilestone = (index: number, updates: Partial<Milestone>) => {
    setNewTemplate((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => (i === index ? { ...milestone, ...updates } : milestone)),
    }))
  }

  const removeMilestone = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }))
  }

  const openRequirementsModal = (milestoneIndex: number) => {
    setEditingMilestoneIndex(milestoneIndex)
    setRequirementsModalOpen(true)
  }

  const saveRequirements = (requirements: string[]) => {
    if (editingMilestoneIndex !== null) {
      updateMilestone(editingMilestoneIndex, { requirements })
    }
  }

  const openFieldModal = (milestoneIndex: number) => {
    setEditingMilestoneIndex(milestoneIndex)
    setFieldModalOpen(true)
  }

  const saveFields = (fields: PlaceholderField[]) => {
    if (editingMilestoneIndex !== null) {
      updateMilestone(editingMilestoneIndex, { placeholderFields: fields })
    }
  }

  if (!user || user.role === "member") return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="mr-4">
                <Button variant="outline">← Back</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Templates</h1>
                <p className="text-sm text-gray-500">Manage your organization's processes</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {viewingTemplate ? "View Template Details" : "Create New Workflow Template"}
                  </DialogTitle>
                  <DialogDescription>
                    {viewingTemplate
                      ? "View template details and create a copy with modifications"
                      : "Design a reusable process template for your organization"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Template Title</Label>
                      <Input
                        id="title"
                        value={newTemplate.title}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="e.g., Employee Onboarding"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTemplate.description}
                        onChange={(e) =>
                          setNewTemplate((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Describe this workflow..."
                      />
                    </div>
                  </div>

                  <ExecutionerSelector
                    value={newTemplate.executioner.id ? newTemplate.executioner : null}
                    onChange={(executioner) => setNewTemplate((prev) => ({ ...prev, executioner }))}
                    currentEntityId={user.entityId}
                  />

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Milestones</h3>
                      <Button onClick={addMilestone} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Milestone
                      </Button>
                    </div>

                    {newTemplate.milestones.map((milestone, index) => (
                      <Card key={milestone.id} className="mb-4">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Milestone {index + 1}</CardTitle>
                            <Button variant="destructive" size="sm" onClick={() => removeMilestone(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Milestone Title</Label>
                              <Input
                                value={milestone.title}
                                onChange={(e) =>
                                  updateMilestone(index, {
                                    title: e.target.value,
                                  })
                                }
                                placeholder="e.g., IT Department Setup"
                              />
                            </div>
                            <div>
                              <Label>Approving Entity</Label>
                              <ApprovingEntitySelector
                                value={milestone.approvingEntityId}
                                onChange={(entityId) =>
                                  updateMilestone(index, {
                                    approvingEntityId: entityId,
                                  })
                                }
                                currentEntityId={user.entityId}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label>Requirements ({milestone.requirements.length})</Label>
                              <Button size="sm" variant="outline" onClick={() => openRequirementsModal(index)}>
                                Manage Requirements
                              </Button>
                            </div>
                            {milestone.requirements.length > 0 && (
                              <div className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                                {milestone.requirements.slice(0, 3).map((req, i) => (
                                  <div key={i}>• {req}</div>
                                ))}
                                {milestone.requirements.length > 3 && (
                                  <div className="text-gray-400">... and {milestone.requirements.length - 3} more</div>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label>Data Fields ({milestone.placeholderFields.length})</Label>
                              <Button size="sm" variant="outline" onClick={() => openFieldModal(index)}>
                                Manage Fields
                              </Button>
                            </div>
                            {milestone.placeholderFields.length > 0 && (
                              <div className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                                {milestone.placeholderFields.slice(0, 3).map((field, i) => (
                                  <div key={i}>
                                    • {field.label} ({field.type})
                                  </div>
                                ))}
                                {milestone.placeholderFields.length > 3 && (
                                  <div className="text-gray-400">
                                    ... and {milestone.placeholderFields.length - 3} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={createTemplate}
                      disabled={viewingTemplate ? !hasChanges : !newTemplate.title.trim()}
                    >
                      {viewingTemplate ? "Create Copy From" : "Create Template"}
                    </Button>
                  </div>
                </div>
                <RequirementsModal
                  open={requirementsModalOpen}
                  onOpenChange={setRequirementsModalOpen}
                  requirements={
                    editingMilestoneIndex !== null
                      ? newTemplate.milestones[editingMilestoneIndex]?.requirements || []
                      : []
                  }
                  onSave={saveRequirements}
                />

                <FieldModal
                  open={fieldModalOpen}
                  onOpenChange={setFieldModalOpen}
                  fields={
                    editingMilestoneIndex !== null
                      ? newTemplate.milestones[editingMilestoneIndex]?.placeholderFields || []
                      : []
                  }
                  onSave={saveFields}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
              <p className="text-gray-500 mb-4">Create your first workflow template to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Milestones:</span>
                      <Badge variant="secondary">{template.milestones.length}</Badge>
                    </div>
                    <div className="text-xs text-gray-400">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => viewTemplate(template)}>
                        View Details
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => archiveTemplate(template.id)}>
                        Archive
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
