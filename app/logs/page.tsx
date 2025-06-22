"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Eye, Download, Filter } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { storageService, type Personnel, type AuditLog } from "@/lib/storage"

export default function LogsPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    searchTerm: "",
    userId: "",
    action: "",
    resourceType: "",
    dateFrom: "",
    dateTo: "",
  })

  const [personnel, setPersonnel] = useState<Personnel[]>([])

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    if (currentUser.role !== "superadmin") {
      router.push("/dashboard")
      return
    }

    setUser(currentUser)
    loadData()
  }, [router])

  const loadData = () => {
    const allLogs = storageService.getAuditLogs()
    const allPersonnel = storageService.getPersonnel()
    setLogs(allLogs)
    setFilteredLogs(allLogs)
    setPersonnel(allPersonnel)
  }

  useEffect(() => {
    const filtered = storageService.searchAuditLogs(filters)
    setFilteredLogs(filtered)
  }, [filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      userId: "",
      action: "",
      resourceType: "",
      dateFrom: "",
      dateTo: "",
    })
  }

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "User", "Role", "Action", "Resource Type", "Resource Name", "Changes"].join(","),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.userName,
          log.userRole,
          log.action,
          log.resourceType,
          log.resourceName,
          log.changes ? log.changes.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join("; ") : "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800"
      case "UPDATE":
        return "bg-blue-100 text-blue-800"
      case "DELETE":
        return "bg-red-100 text-red-800"
      case "LOGIN":
        return "bg-purple-100 text-purple-800"
      case "LOGOUT":
        return "bg-gray-100 text-gray-800"
      case "APPROVE":
        return "bg-emerald-100 text-emerald-800"
      case "REJECT":
        return "bg-orange-100 text-orange-800"
      case "VERIFY_PAYMENT":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getResourceTypeColor = (resourceType: string) => {
    switch (resourceType) {
      case "Entity":
        return "bg-blue-100 text-blue-800"
      case "Personnel":
        return "bg-green-100 text-green-800"
      case "WorkflowTemplate":
        return "bg-purple-100 text-purple-800"
      case "WorkflowInstance":
        return "bg-orange-100 text-orange-800"
      case "System":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
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
                <Button variant="outline">← Back</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
                <p className="text-sm text-gray-500">System activity and change tracking</p>
              </div>
            </div>
            <Button onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
            <CardDescription>Filter audit logs by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search logs..."
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="user">User</Label>
                <Select value={filters.userId} onValueChange={(value) => handleFilterChange("userId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {personnel.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="action">Action</Label>
                <Select value={filters.action} onValueChange={(value) => handleFilterChange("action", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="APPROVE">Approve</SelectItem>
                    <SelectItem value="REJECT">Reject</SelectItem>
                    <SelectItem value="VERIFY_PAYMENT">Verify Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resourceType">Resource Type</Label>
                <Select
                  value={filters.resourceType}
                  onValueChange={(value) => handleFilterChange("resourceType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="Entity">Entity</SelectItem>
                    <SelectItem value="Personnel">Personnel</SelectItem>
                    <SelectItem value="WorkflowTemplate">Workflow Template</SelectItem>
                    <SelectItem value="WorkflowInstance">Workflow Instance</SelectItem>
                    <SelectItem value="System">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
              <p className="text-sm text-gray-500">{filteredLogs.length} logs found</p>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>Complete system activity log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource Type</TableHead>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.userRole}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getResourceTypeColor(log.resourceType)}>{log.resourceType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.resourceName}</TableCell>
                      <TableCell className="max-w-xs">
                        {log.changes && log.changes.length > 0 ? (
                          <span className="text-sm text-gray-600">
                            {log.changes.length} field{log.changes.length > 1 ? "s" : ""} changed
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">No changes</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => viewLogDetails(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No audit logs found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>Complete information about this system activity</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm">{selectedLog.userName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <Badge variant="outline">{selectedLog.userRole}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Action</Label>
                  <Badge className={getActionColor(selectedLog.action)}>{selectedLog.action}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Resource Type</Label>
                  <Badge className={getResourceTypeColor(selectedLog.resourceType)}>{selectedLog.resourceType}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Resource Name</Label>
                  <p className="text-sm">{selectedLog.resourceName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">IP Address</Label>
                  <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">User Agent</Label>
                  <p className="text-sm truncate" title={selectedLog.userAgent}>
                    {selectedLog.userAgent}
                  </p>
                </div>
              </div>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Changes Made</Label>
                  <div className="mt-2 space-y-2">
                    {selectedLog.changes.map((change, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium">{change.field}</p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="text-xs text-gray-500">Old Value:</span>
                            <p className="text-sm font-mono bg-red-50 p-1 rounded">{JSON.stringify(change.oldValue)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">New Value:</span>
                            <p className="text-sm font-mono bg-green-50 p-1 rounded">
                              {JSON.stringify(change.newValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <Label className="text-sm font-medium">Additional Metadata</Label>
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
