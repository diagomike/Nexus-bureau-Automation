import { storageService, type WorkflowInstance, type WorkflowTemplate, type Personnel } from "./storage"

export interface WorkflowAnalytics {
  totalWorkflows: number
  completedWorkflows: number
  activeWorkflows: number
  completionRate: number
  averageExecutionTime: number
  workflowsByTemplate: Record<string, number>
  workflowsByExecutioner: Record<string, number>
  monthlyWorkflows: Array<{ month: string; count: number }>
  milestonePerformance: Array<{
    templateId: string
    templateName: string
    milestones: Array<{
      title: string
      averageTime: number
      approvalRate: number
    }>
  }>
  bottlenecks: Array<{
    templateId: string
    templateName: string
    milestoneIndex: number
    milestoneTitle: string
    averageTime: number
    issueCount: number
  }>
}

export interface AnalyticsFilters {
  startDate?: Date
  endDate?: Date
  templateId?: string
  executionerId?: string
  status?: "active" | "completed" | "all"
}

class AnalyticsService {
  generateAnalytics(filters: AnalyticsFilters = {}): WorkflowAnalytics {
    const workflows = this.getFilteredWorkflows(filters)
    const templates = storageService.getWorkflowTemplates()
    const personnel = storageService.getPersonnel()

    return {
      totalWorkflows: workflows.length,
      completedWorkflows: workflows.filter((w) => w.status === "completed").length,
      activeWorkflows: workflows.filter((w) => w.status === "active").length,
      completionRate: this.calculateCompletionRate(workflows),
      averageExecutionTime: this.calculateAverageExecutionTime(workflows),
      workflowsByTemplate: this.getWorkflowsByTemplate(workflows, templates),
      workflowsByExecutioner: this.getWorkflowsByExecutioner(workflows, personnel),
      monthlyWorkflows: this.getMonthlyWorkflows(workflows),
      milestonePerformance: this.getMilestonePerformance(workflows, templates),
      bottlenecks: this.identifyBottlenecks(workflows, templates),
    }
  }

  private getFilteredWorkflows(filters: AnalyticsFilters): WorkflowInstance[] {
    let workflows = storageService.getWorkflowInstances()

    if (filters.startDate) {
      workflows = workflows.filter((w) => new Date(w.createdAt) >= filters.startDate!)
    }

    if (filters.endDate) {
      workflows = workflows.filter((w) => new Date(w.createdAt) <= filters.endDate!)
    }

    if (filters.templateId) {
      workflows = workflows.filter((w) => w.templateId === filters.templateId)
    }

    if (filters.executionerId) {
      workflows = workflows.filter((w) => w.ownerId === filters.executionerId)
    }

    if (filters.status && filters.status !== "all") {
      workflows = workflows.filter((w) => w.status === filters.status)
    }

    return workflows
  }

  private calculateCompletionRate(workflows: WorkflowInstance[]): number {
    if (workflows.length === 0) return 0
    const completed = workflows.filter((w) => w.status === "completed").length
    return (completed / workflows.length) * 100
  }

  private calculateAverageExecutionTime(workflows: WorkflowInstance[]): number {
    const completedWorkflows = workflows.filter((w) => w.status === "completed" && w.completedAt)

    if (completedWorkflows.length === 0) return 0

    const totalTime = completedWorkflows.reduce((sum, workflow) => {
      const start = new Date(workflow.createdAt).getTime()
      const end = new Date(workflow.completedAt!).getTime()
      return sum + (end - start)
    }, 0)

    return totalTime / completedWorkflows.length / (1000 * 60 * 60 * 24) // Convert to days
  }

  private getWorkflowsByTemplate(workflows: WorkflowInstance[], templates: WorkflowTemplate[]): Record<string, number> {
    const templateCounts: Record<string, number> = {}

    templates.forEach((template) => {
      templateCounts[template.title] = workflows.filter((w) => w.templateId === template.id).length
    })

    return templateCounts
  }

  private getWorkflowsByExecutioner(workflows: WorkflowInstance[], personnel: Personnel[]): Record<string, number> {
    const executionerCounts: Record<string, number> = {}

    personnel.forEach((person) => {
      executionerCounts[person.name] = workflows.filter((w) => w.ownerId === person.id).length
    })

    return executionerCounts
  }

  private getMonthlyWorkflows(workflows: WorkflowInstance[]): Array<{ month: string; count: number }> {
    const monthlyData: Record<string, number> = {}

    workflows.forEach((workflow) => {
      const date = new Date(workflow.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
    })

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))
  }

  private getMilestonePerformance(workflows: WorkflowInstance[], templates: WorkflowTemplate[]) {
    return templates.map((template) => {
      const templateWorkflows = workflows.filter((w) => w.templateId === template.id)

      const milestones = template.milestones.map((milestone) => {
        const milestoneData = templateWorkflows.flatMap((w) =>
          w.milestoneData.filter((md) => md.milestoneId === milestone.id),
        )

        const approvedMilestones = milestoneData.filter((md) => md.status === "approved")
        const approvalRate = milestoneData.length > 0 ? (approvedMilestones.length / milestoneData.length) * 100 : 0

        // Calculate average time (simplified - would need more detailed tracking in real implementation)
        const averageTime = this.calculateMilestoneAverageTime(approvedMilestones)

        return {
          title: milestone.title,
          averageTime,
          approvalRate,
        }
      })

      return {
        templateId: template.id,
        templateName: template.title,
        milestones,
      }
    })
  }

  private calculateMilestoneAverageTime(milestoneData: any[]): number {
    // Simplified calculation - in real implementation, you'd track when each milestone started
    return Math.random() * 5 + 1 // Random 1-6 days for demo
  }

  private identifyBottlenecks(workflows: WorkflowInstance[], templates: WorkflowTemplate[]) {
    const bottlenecks: any[] = []

    templates.forEach((template) => {
      const templateWorkflows = workflows.filter((w) => w.templateId === template.id)

      template.milestones.forEach((milestone, index) => {
        const milestoneData = templateWorkflows.flatMap((w) =>
          w.milestoneData.filter((md) => md.milestoneId === milestone.id),
        )

        const averageTime = this.calculateMilestoneAverageTime(milestoneData)
        const issueCount = milestoneData.filter((md) => md.status === "pending").length

        // Consider it a bottleneck if average time > 3 days or many pending
        if (averageTime > 3 || issueCount > 2) {
          bottlenecks.push({
            templateId: template.id,
            templateName: template.title,
            milestoneIndex: index,
            milestoneTitle: milestone.title,
            averageTime,
            issueCount,
          })
        }
      })
    })

    return bottlenecks.sort((a, b) => b.averageTime - a.averageTime)
  }

  exportAnalytics(analytics: WorkflowAnalytics, format: "json" | "csv" = "json"): void {
    if (format === "json") {
      const dataStr = JSON.stringify(analytics, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      this.downloadFile(dataBlob, "workflow-analytics.json")
    } else {
      const csvData = this.convertToCSV(analytics)
      const dataBlob = new Blob([csvData], { type: "text/csv" })
      this.downloadFile(dataBlob, "workflow-analytics.csv")
    }
  }

  private convertToCSV(analytics: WorkflowAnalytics): string {
    const headers = ["Metric", "Value"]
    const rows = [
      ["Total Workflows", analytics.totalWorkflows.toString()],
      ["Completed Workflows", analytics.completedWorkflows.toString()],
      ["Active Workflows", analytics.activeWorkflows.toString()],
      ["Completion Rate (%)", analytics.completionRate.toFixed(2)],
      ["Average Execution Time (days)", analytics.averageExecutionTime.toFixed(2)],
    ]

    return [headers, ...rows].map((row) => row.join(",")).join("\n")
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const analyticsService = new AnalyticsService()
