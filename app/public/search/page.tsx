"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Building2, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { storageService, type Entity, type WorkflowTemplate } from "@/lib/storage"

export default function PublicSearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"entities" | "services">("services")
  const [entities, setEntities] = useState<Entity[]>([])
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [filteredResults, setFilteredResults] = useState<(Entity | WorkflowTemplate)[]>([])

  useEffect(() => {
    // Load public entities and workflows
    const publicEntities = storageService.getPublicEntities()
    const publicWorkflows = storageService.getPublicWorkflowTemplates()

    setEntities(publicEntities)
    setWorkflows(publicWorkflows)
    setFilteredResults(searchType === "entities" ? publicEntities : publicWorkflows)
  }, [searchType])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults(searchType === "entities" ? entities : workflows)
      return
    }

    const query = searchQuery.toLowerCase()
    if (searchType === "entities") {
      const filtered = entities.filter((entity) => entity.name.toLowerCase().includes(query))
      setFilteredResults(filtered)
    } else {
      const filtered = workflows.filter(
        (workflow) =>
          workflow.title.toLowerCase().includes(query) || workflow.description.toLowerCase().includes(query),
      )
      setFilteredResults(filtered)
    }
  }, [searchQuery, searchType, entities, workflows])

  const isEntity = (item: Entity | WorkflowTemplate): item is Entity => {
    return "visibility" in item
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nexus Public Services</h1>
                <p className="text-sm text-gray-500">Search for government and business services</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Register</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Public Services</CardTitle>
            <CardDescription>Find government services, business processes, and organizations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={searchType === "entities" ? "Search organizations..." : "Search services..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={searchType} onValueChange={(value: "entities" | "services") => setSearchType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="entities">Organizations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {searchType === "entities" ? "Organizations" : "Available Services"}
            </h2>
            <Badge variant="secondary">
              {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {filteredResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500">Try adjusting your search terms or browse all available {searchType}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        {isEntity(item) ? (
                          <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                        ) : (
                          <FileText className="h-5 w-5 text-green-600 mr-2" />
                        )}
                        <span className="truncate">{isEntity(item) ? item.name : item.title}</span>
                      </div>
                      <Badge variant="outline">{isEntity(item) ? "Organization" : "Service"}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {isEntity(item) ? `Public organization with ${item.tokenId} token` : item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEntity(item) ? (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          Token ID: <code className="bg-gray-100 px-1 rounded">{item.tokenId}</code>
                        </div>
                        <Link href={`/entities/${item.id}/services`}>
                          <Button className="w-full">
                            View Services
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          {item.milestones.length} step{item.milestones.length !== 1 ? "s" : ""}
                          {item.usageLimit && (
                            <span className="ml-2">
                              • {item.usageCount}/{item.usageLimit} used
                            </span>
                          )}
                        </div>
                        <Link href={`/workflows/new?template=${item.id}`}>
                          <Button className="w-full">
                            Start Service
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
