"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  storageService,
  type WorkflowInstance,
  type WorkflowTemplate,
  type Entity,
  type Personnel,
} from "@/lib/storage"
import {
  Building2,
  FileText,
  Clock,
  Plus,
  Users,
  Settings,
  BarChart3,
  Search,
  CreditCard,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"

export default function DashboardPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [myWorkflows, setMyWorkflows] = useState<WorkflowInstance[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<WorkflowInstance[]>([])
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([])
  const [myEntity, setMyEntity] = useState<Entity | null>(null)
  const [clientEntities, setClientEntities] = useState<Entity[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [subscriptionExpired, setSubscriptionExpired] = useState(false)

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    setUser(currentUser)

    // Check subscription status for non-superadmin users
    if (currentUser.role !== "superadmin" && currentUser.entityId) {
      const expired = storageService.isEntitySubscriptionExpired(currentUser.entityId)
      if (expired) {
        setSubscriptionExpired(true)
        router.push("/subscription-renewal")
        return
      }
    }

    // Load user's entity
    if (currentUser.entityId) {
      const entity = storageService.getEntityById(currentUser.entityId)
      setMyEntity(entity)
    }

    // Load user's workflows
    const workflows = storageService.getWorkflowInstancesByOwner(currentUser.id)
    setMyWorkflows(workflows)

    // Load pending approvals
    const approvals = storageService.getPendingApprovals(currentUser.id)
    setPendingApprovals(approvals)

    // Load available templates
    const templates = storageService.getAccessibleWorkflowTemplates(currentUser.id)
    setAvailableTemplates(templates)

    // Load client entities for SuperAdmin
    if (currentUser.role === "superadmin") {
      const allEntities = storageService.getEntities()
      setClientEntities(allEntities)
    }
  }, [router])

  const handleLogout = () => {
    AuthService.logout()
    router.push("/login")
  }

  const filteredClientEntities = clientEntities.filter((entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!user) return null

  if (subscriptionExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Subscription Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Your entity's subscription has expired. Please renew to continue using Nexus.
            </p>
            <Link href="/subscription-renewal">
              <Button className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Renew Subscription
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const renderSuperAdminDashboard = () => (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="client-support">Client Support</TabsTrigger>
        <TabsTrigger value="logs">Audit Logs</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        </div>

        {/* Standard workflow sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      </TabsContent>

      <TabsContent value="client-support" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Support Dashboard</CardTitle>
            <CardDescription>Search and manage client entities you support</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search client entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClientEntities.map((entity) => (
                  <Card key={entity.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{entity.name}</span>
                        <Badge
                          variant={
                            entity.visibility === "public"
                              ? "default"
                              : entity.visibility === "protected"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {entity.visibility}
                        </Badge>
                      </CardTitle>
                      <CardDescription>Token: {entity.tokenId}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Subscription:</span>
                          <span
                            className={`ml-2 ${storageService.isEntitySubscriptionExpired(entity.id) ? "text-red-600" : "text-green-600"}`}
                          >
                            {storageService.isEntitySubscriptionExpired(entity.id) ? "Expired" : "Active"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span>
                          <span className="ml-2">{new Date(entity.subscriptionExpiry).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href={`/entities/${entity.id}/manage`}>
                          <Button size="sm" variant="outline">
                            Manage
                          </Button>
                        </Link>
                        <Link href={`/entities/${entity.id}/templates`}>
                          <Button size="sm" variant="outline">
                            Templates
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
            <CardDescription>Latest audit logs and system changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Monitor all system activities, user actions, and data changes</p>
                <Link href="/logs">
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    View All Logs
                  </Button>
                </Link>
              </div>

              {/* Recent logs preview */}
              <div className="space-y-2">
                {storageService
                  .getAuditLogs()
                  .slice(0, 5)
                  .map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            log.action === "CREATE"
                              ? "bg-green-100 text-green-800"
                              : log.action === "UPDATE"
                                ? "bg-blue-100 text-blue-800"
                                : log.action === "DELETE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }
                        >
                          {log.action}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{log.userName}</p>
                          <p className="text-xs text-gray-500">
                            {log.action} {log.resourceType}: {log.resourceName}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )

  const renderApproverDashboard = () => (
    <div className="space-y-8">
      {/* Simple, clean interface for approvers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Milestones Pending My Approval
            </CardTitle>
            <CardDescription>Items requiring your immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending approvals</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((workflow) => (
                  <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div>
                        <p className="font-medium">{workflow.title}</p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(workflow.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="destructive">Approve</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              My Workflow History
            </CardTitle>
            <CardDescription>Workflows you have initiated or approved</CardDescription>
          </CardHeader>
          <CardContent>
            {myWorkflows.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No workflow history</p>
            ) : (
              <div className="space-y-3">
                {myWorkflows.slice(0, 5).map((workflow) => (
                  <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div>
                        <p className="font-medium">{workflow.title}</p>
                        <p className="text-sm text-gray-500">{new Date(workflow.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge className={getStatusColor(workflow.status)}>{workflow.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick start workflow section */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Workflow</CardTitle>
          <CardDescription>Available workflow templates</CardDescription>
        </CardHeader>
        <CardContent>
          {availableTemplates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No templates available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTemplates.slice(0, 6).map((template) => (
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
  )

  const renderConsumerDashboard = () => (
    <div className="space-y-8">
      {/* Public-facing portal for consumers */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Nexus Public Services</CardTitle>
          <CardDescription>Access government and business services online</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Link href="/public/search">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search Services
              </Button>
            </Link>
            <Link href="/workflows/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Start Service
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* My workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            My Services
          </CardTitle>
          <CardDescription>Services you have initiated</CardDescription>
        </CardHeader>
        <CardContent>
          {myWorkflows.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No services started yet</p>
          ) : (
            <div className="space-y-3">
              {myWorkflows.map((workflow) => (
                <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div>
                      <p className="font-medium">{workflow.title}</p>
                      <p className="text-sm text-gray-500">
                        Started: {new Date(workflow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(workflow.status)}>{workflow.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available public services */}
      <Card>
        <CardHeader>
          <CardTitle>Available Public Services</CardTitle>
          <CardDescription>Services you can access</CardDescription>
        </CardHeader>
        <CardContent>
          {availableTemplates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No public services available</p>
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
  )

  const renderEntityAdminDashboard = () => (
    <div className="space-y-8">
      {/* Entity subscription status */}
      {myEntity && (
        <Card
          className={
            storageService.isEntitySubscriptionExpired(myEntity.id)
              ? "border-red-200 bg-red-50"
              : "border-green-200 bg-green-50"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Subscription Status</span>
              {storageService.isEntitySubscriptionExpired(myEntity.id) ? (
                <Badge variant="destructive">Expired</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Expires: {new Date(myEntity.subscriptionExpiry).toLocaleDateString()}</p>
            {storageService.isEntitySubscriptionExpired(myEntity.id) && (
              <Link href="/subscription-renewal" className="mt-2 inline-block">
                <Button variant="destructive">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Renew Subscription
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Management actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      </div>

      {/* Standard workflow sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    </div>
  )

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
                <p className="text-sm text-gray-500">
                  {user.role === "superadmin" && "Nexus Staff Dashboard"}
                  {user.role === "entity_admin" && myEntity?.name}
                  {user.role === "approver" && myEntity?.name}
                  {user.role === "consumer" && "Public Services Portal"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">Welcome, {user.name}</span>
              <Badge variant="outline">
                {user.role === "superadmin" && "Nexus Staff"}
                {user.role === "entity_admin" && "IT Admin"}
                {user.role === "approver" && "Approver"}
                {user.role === "consumer" && "Consumer"}
              </Badge>
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
        {user.role === "superadmin" && renderSuperAdminDashboard()}
        {user.role === "entity_admin" && renderEntityAdminDashboard()}
        {user.role === "approver" && renderApproverDashboard()}
        {user.role === "consumer" && renderConsumerDashboard()}
      </div>
    </div>
  )
}
