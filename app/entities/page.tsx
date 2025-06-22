"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, Plus, Edit, Trash2, Search, Eye, Shield, Globe, Lock } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { storageService, type Personnel, type Entity } from "@/lib/storage"

export default function EntitiesPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    parentId: "",
    adminId: "",
    visibility: "public" as "public" | "protected" | "private",
  })

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }

    if (currentUser.role !== "entity_admin" && currentUser.role !== "superadmin") {
      router.push("/dashboard")
      return
    }

    setUser(currentUser)
  }, [router])

  useEffect(() => {
    if (!user) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadData = () => {
    if (!user) return

    let hierarchicalEntities: Entity[]
    let availablePersonnel: Personnel[]

    if (user.role === "superadmin") {
      // SuperAdmin can see all entities
      hierarchicalEntities = storageService.getEntities()
      availablePersonnel = storageService.getPersonnel()
    } else {
      // Entity Admin can only see their hierarchy
      const currentEntity = storageService.getEntityById(user.entityId)
      const descendants = storageService.getDescendantEntities(user.entityId)
      hierarchicalEntities = currentEntity ? [currentEntity, ...descendants] : descendants
      availablePersonnel = storageService.getHierarchicalPersonnel(user.entityId)
    }

    setEntities(hierarchicalEntities)
    setPersonnel(availablePersonnel)
    setFilteredEntities(hierarchicalEntities)
  }

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = entities.filter((entity) => entity.name.toLowerCase().includes(searchQuery.toLowerCase()))
      setFilteredEntities(filtered)
    } else {
      setFilteredEntities(entities)
    }
  }, [searchQuery, entities])

  const resetForm = () => {
    setFormData({
      name: "",
      parentId: "",
      adminId: "",
      visibility: "public",
    })
    setEditingEntity(null)
  }

  const handleCreate = () => {
    setIsCreateModalOpen(true)
    resetForm()
  }

  const handleEdit = (entity: Entity) => {
    setFormData({
      name: entity.name,
      parentId: entity.parentId || "",
      adminId: entity.adminId,
      visibility: entity.visibility,
    })
    setEditingEntity(entity)
    setIsCreateModalOpen(true)
  }

  const handleDelete = (entityId: string) => {
    if (
      confirm("Are you sure you want to delete this entity? This will also affect related personnel and workflows.")
    ) {
      storageService.deleteEntity(entityId, user!.id)
      loadData()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Normalize parentId
    const normalizedParentId =
      !formData.parentId || formData.parentId === "none" || formData.parentId === "" ? null : formData.parentId

    if (editingEntity) {
      // Update existing entity
      storageService.updateEntity(
        editingEntity.id,
        {
          name: formData.name,
          parentId: normalizedParentId,
          adminId: formData.adminId,
          visibility: formData.visibility,
        },
        user!.id,
      )
    } else {
      // Create new entity
      storageService.createEntity(
        {
          name: formData.name,
          parentId: normalizedParentId,
          adminId: formData.adminId,
          visibility: formData.visibility,
        },
        user!.id,
      )
    }

    setIsCreateModalOpen(false)
    resetForm()
    loadData()
  }

  const getEntityHierarchy = (entity: Entity): string => {
    const path: string[] = []
    let current: Entity | null = entity

    while (current) {
      path.unshift(current.name)
      current = current.parentId ? entities.find((e) => e.id === current!.parentId) || null : null
    }

    return path.join(" → ")
  }

  const getAdminName = (adminId: string) => {
    const admin = personnel.find((p) => p.id === adminId)
    return admin?.name || "Unknown Admin"
  }

  const getSubEntitiesCount = (entityId: string) => {
    return entities.filter((e) => e.parentId === entityId).length
  }

  const getPersonnelCount = (entityId: string) => {
    return personnel.filter((p) => p.entityId === entityId).length
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-4 w-4 text-green-600" />
      case "protected":
        return <Shield className="h-4 w-4 text-yellow-600" />
      case "private":
        return <Lock className="h-4 w-4 text-red-600" />
      default:
        return <Eye className="h-4 w-4 text-gray-600" />
    }
  }

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "bg-green-100 text-green-800"
      case "protected":
        return "bg-yellow-100 text-yellow-800"
      case "private":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Get available admins (entity_admin or superadmin role)
  const availableAdmins = personnel.filter((p) => p.role === "entity_admin" || p.role === "superadmin")

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entity Management</h1>
                <p className="text-sm text-gray-500">
                  Manage organizational structure and hierarchy
                  {user.role === "superadmin" && " (All Entities)"}
                  {user.role === "entity_admin" && " (Your Hierarchy)"}
                </p>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entities by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntities.map((entity) => (
            <Card
              key={entity.id}
              className="relative overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow group"
            >
              {/* Accent Bar */}
              <div className="absolute left-0 top-0 h-full w-1 bg-blue-600 group-hover:w-2 transition-all" />

              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <span className="truncate font-semibold text-lg">{entity.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getVisibilityIcon(entity.visibility)}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(entity)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {entity.name !== "Public" && ( // Prevent deletion of Public entity
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entity.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {entity.parentId ? getEntityHierarchy(entity) : "Root Entity"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Visibility:</span>
                    <Badge className={getVisibilityColor(entity.visibility)}>{entity.visibility}</Badge>
                  </div>
                  {entity.visibility === "protected" && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Token:</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{entity.tokenId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Admin:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{getAdminName(entity.adminId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-blue-400" /> Sub-entities:
                    </span>
                    <span className="font-medium">{getSubEntitiesCount(entity.id)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="7" r="4" />
                        <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                      </svg>
                      Personnel:
                    </span>
                    <span className="font-medium">{getPersonnelCount(entity.id)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Subscription:</span>
                    <span
                      className={`font-medium ${
                        storageService.isEntitySubscriptionExpired(entity.id) ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {storageService.isEntitySubscriptionExpired(entity.id) ? "Expired" : "Active"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">{new Date(entity.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEntities.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No entities found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? "No entities match your search criteria." : "Get started by creating your first entity."}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Entity
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntity ? "Edit Entity" : "Create New Entity"}</DialogTitle>
            <DialogDescription>
              {editingEntity ? "Update entity information" : "Create a new organizational entity"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Entity Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Ministry of Health"
                required
              />
            </div>

            <div>
              <Label htmlFor="parent">Parent Entity (Optional)</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent entity (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent (Root Entity)</SelectItem>
                  {entities
                    .filter((e) => e.id !== editingEntity?.id) // Don't allow self as parent
                    .map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="admin">Entity Administrator</Label>
              <Select value={formData.adminId} onValueChange={(value) => setFormData({ ...formData, adminId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select administrator" />
                </SelectTrigger>
                <SelectContent>
                  {availableAdmins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name} ({admin.role === "superadmin" ? "Nexus Staff" : "Entity Admin"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: "public" | "protected" | "private") =>
                  setFormData({ ...formData, visibility: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-green-600" />
                      Public - Searchable by everyone
                    </div>
                  </SelectItem>
                  <SelectItem value="protected">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-600" />
                      Protected - Accessible via Token ID
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-red-600" />
                      Private - Hidden from searches
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingEntity ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
