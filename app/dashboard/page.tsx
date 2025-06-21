"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  storageService,
  type WorkflowInstance,
  type WorkflowTemplate,
  type Entity,
  type Personnel,
} from "@/lib/storage"
import { Building2, FileText, Clock, Plus, Users, Settings, BarChart3 } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"

export default function DashboardPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [myWorkflows, setMyWorkflows] = useState<WorkflowInstance[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<WorkflowInstance[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([])
  const [myEntity, setMyEntity] = useState<Entity | null>(null)

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    // Load user's entity
    const entity = storageService.getEntityById(currentUser.entityId)
    setMyEntity(entity)

    // Load user's workflows
    const workflows = storageService.getWorkflowInstancesByOwner(currentUser.id)
    setMyWorkflows(workflows)

    // Load pending approvals
    const approvals = storageService.getPendingApprovals(currentUser.id)
    setPendingApprovals(approvals)

    // Load available templates (for now, show all)
    // const templates = storageService.getWorkflowTemplates()
    const templates = storageService.getAccessibleWorkflowTemplates(currentUser.id)

    setAvailableTemplates(templates)
  }, [router])

  const handleLogout = () => {
    AuthService.logout()
    router.push("/login")
  }

  if (!user) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nexus</h1>
                <p className="text-sm text-gray-500">{myEntity?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">Welcome, {user.name}</span>
              <Badge variant="outline">{user.role}</Badge>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {(user.role === "manager" || user.role === "superadmin") && (
            <>
              <Link href="/templates">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <CardTitle className="ml-2 text-sm font-medium">Manage Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Create and manage workflow templates</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/personnel">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <CardTitle className="ml-2 text-sm font-medium">Manage Personnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Add and manage team members</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/entities">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <CardTitle className="ml-2 text-sm font-medium">Manage Entities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Create and manage organizations</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/analytics">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    <CardTitle className="ml-2 text-sm font-medium">Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">View workflow performance insights</p>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
          <Link href="/workflows/new">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Plus className="h-4 w-4 text-orange-600" />
                <CardTitle className="ml-2 text-sm font-medium">Start New Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Begin a new process</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Workflows */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                My Workflows
              </CardTitle>
              <CardDescription>Workflows you have initiated</CardDescription>
            </CardHeader>
            <CardContent>
              {myWorkflows.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No workflows started yet</p>
              ) : (
                <div className="space-y-3">
                  {myWorkflows.slice(0, 5).map((workflow) => (
                    <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <div>
                          <p className="font-medium">{workflow.title}</p>
                          <p className="text-sm text-gray-500">ID: {workflow.id.slice(0, 8)}...</p>
                        </div>
                        <Badge className={getStatusColor(workflow.status)}>{workflow.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Workflows waiting for your approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending approvals</p>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.slice(0, 5).map((workflow) => (
                    <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <div>
                          <p className="font-medium">{workflow.title}</p>
                          <p className="text-sm text-gray-500">ID: {workflow.id.slice(0, 8)}...</p>
                        </div>
                        <Badge variant="destructive">Action Required</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Available Templates */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Available Workflow Templates</CardTitle>
            <CardDescription>Start a new workflow from these templates</CardDescription>
          </CardHeader>
          <CardContent>
            {availableTemplates.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No templates available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTemplates.map((template) => (
                  <Link key={template.id} href={`/workflows/new?template=${template.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <CardDescription className="text-sm">{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{template.milestones.length} steps</span>
                          <Button size="sm">Start</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
