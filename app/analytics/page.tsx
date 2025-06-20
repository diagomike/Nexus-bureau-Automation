"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts"
import { storageService, type Personnel, type WorkflowTemplate } from "@/lib/storage"
import { analyticsService, type WorkflowAnalytics, type AnalyticsFilters } from "@/lib/analytics"
import { AuthService } from "@/lib/auth"
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, Download, Filter } from "lucide-react"
import Link from "next/link"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function AnalyticsPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null)
  const [filters, setFilters] = useState<AnalyticsFilters>({
    status: "all",
  })
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser || currentUser.role === "member") {
      router.push("/dashboard")
      return
    }
    setUser(currentUser)

    // Load data
    const allTemplates = storageService.getWorkflowTemplates()
    const allPersonnel = storageService.getPersonnel()
    setTemplates(allTemplates)
    setPersonnel(allPersonnel)

    loadAnalytics()
  }, [router])

  const loadAnalytics = () => {
    setLoading(true)
    try {
      const analyticsData = analyticsService.generateAnalytics(filters)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [filters, user])

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const exportData = (format: "json" | "csv") => {
    if (analytics) {
      analyticsService.exportAnalytics(analytics, format)
    }
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const chartConfig = {
    workflows: {
      label: "Workflows",
      color: "#0088FE",
    },
    completed: {
      label: "Completed",
      color: "#00C49F",
    },
    active: {
      label: "Active",
      color: "#FFBB28",
    },
  }

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Analytics</h1>
                <p className="text-sm text-gray-500">Comprehensive insights into workflow performance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => exportData("csv")}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportData("json")}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Analytics Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate ? filters.startDate.toISOString().split("T")[0] : ""}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate ? filters.endDate.toISOString().split("T")[0] : ""}
                  onChange={(e) => handleFilterChange("endDate", e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Template</Label>
                <Select
                  value={filters.templateId || ""}
                  onValueChange={(value) => handleFilterChange("templateId", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All templates</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalWorkflows}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.completedWorkflows} of {analytics.totalWorkflows} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Execution Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageExecutionTime.toFixed(1)} days</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeWorkflows}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Workflow Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={analytics.monthlyWorkflows}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="count" stroke="#0088FE" strokeWidth={2} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Completed", value: analytics.completedWorkflows },
                          { name: "Active", value: analytics.activeWorkflows },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {[
                          { name: "Completed", value: analytics.completedWorkflows },
                          { name: "Active", value: analytics.activeWorkflows },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflows by Template</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <BarChart
                    data={Object.entries(analytics.workflowsByTemplate).map(([name, count]) => ({ name, count }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#0088FE" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {analytics.milestonePerformance.map((template) => (
              <Card key={template.templateId}>
                <CardHeader>
                  <CardTitle>{template.templateName} - Milestone Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {template.milestones.map((milestone, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{milestone.title}</h4>
                          <p className="text-sm text-gray-600">Avg. Time: {milestone.averageTime.toFixed(1)} days</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={milestone.approvalRate > 80 ? "default" : "secondary"}>
                            {milestone.approvalRate.toFixed(1)}% approval rate
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="bottlenecks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Identified Bottlenecks
                </CardTitle>
                <CardDescription>
                  Milestones with longer than average processing times or high pending counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.bottlenecks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No significant bottlenecks identified</p>
                ) : (
                  <div className="space-y-4">
                    {analytics.bottlenecks.map((bottleneck, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50"
                      >
                        <div>
                          <h4 className="font-medium">{bottleneck.templateName}</h4>
                          <p className="text-sm text-gray-600">{bottleneck.milestoneTitle}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-orange-600">
                            {bottleneck.averageTime.toFixed(1)} days avg.
                          </div>
                          <div className="text-xs text-gray-500">{bottleneck.issueCount} pending</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
