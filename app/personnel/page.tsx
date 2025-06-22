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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Plus, Edit, Trash2, Search, Shield, User, Crown, Settings, Globe } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/lib/auth"
import { storageService, type Personnel, type Entity } from "@/lib/storage"

export default function PersonnelPage() {
  const [user, setUser] = useState<Personnel | null>(null)
  const router = useRouter()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "member" as "superadmin" | "entity_admin" | "approver" | "member" | "consumer",
    entityId: "",
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

    let hierarchicalPersonnel: Personnel[]
    let availableEntities: Entity[]

    if (user.role === "superadmin") {
      // SuperAdmin can see all personnel and entities
      hierarchicalPersonnel = storageService.getPersonnel()
      availableEntities = storageService.getEntities()
    } else {
      // Entity Admin can only see personnel from their hierarchy
      hierarchicalPersonnel = storageService.getHierarchicalPersonnel(user.entityId)
      const currentEntity = storageService.getEntityById(user.entityId)
      const descendants = storageService.getDescendantEntities(user.entityId)
      availableEntities = currentEntity ? [currentEntity, ...descendants] : descendants
    }

    setPersonnel(hierarchicalPersonnel)
    setEntities(availableEntities)
    setFilteredPersonnel(hierarchicalPersonnel)
  }, [user])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = personnel.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredPersonnel(filtered)
    } else {
      setFilteredPersonnel(personnel)
    }
  }, [searchQuery, personnel])

  const loadData = () => {
    if (!user) return

    let hierarchicalPersonnel: Personnel[]
    let availableEntities: Entity[]

    if (user.role === "superadmin") {
      hierarchicalPersonnel = storageService.getPersonnel()
      availableEntities = storageService.getEntities()
    } else {
      hierarchicalPersonnel = storageService.getHierarchicalPersonnel(user.entityId)
      const currentEntity = storageService.getEntityById(user.entityId)
      const descendants = storageService.getDescendantEntities(user.entityId)
      availableEntities = currentEntity ? [currentEntity, ...descendants] : descendants
    }

    setPersonnel(hierarchicalPersonnel)
    setEntities(availableEntities)
    setFilteredPersonnel(hierarchicalPersonnel)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "member",
      entityId: "",
    })
    setEditingPersonnel(null)
  }

  const handleCreate = () => {
    setIsCreateModalOpen(true)
    resetForm()
  }

  const handleEdit = (personnel: Personnel) => {
    setFormData({
      name: personnel.name,
      email: personnel.email,
      password: "", // Don't pre-fill password
      role: personnel.role,
      entityId: personnel.entityId,
    })
    setEditingPersonnel(personnel)
    setIsCreateModalOpen(true)
  }

  const handleDelete = (personnelId: string) => {
    if (confirm("Are you sure you want to delete this personnel?")) {
      storageService.deletePersonnel(personnelId, user!.id)
      loadData()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingPersonnel) {
      // Update existing personnel
      const updates: Partial<Personnel> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        entityId: formData.entityId,
      }
      if (formData.password) {
        updates.password = formData.password
      }
      storageService.updatePersonnel(editingPersonnel.id, updates, user!.id)
    } else {
      // Create new personnel
      storageService.createPersonnel(
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          entityId: formData.entityId,
        },
        user!.id,
      )
    }

    setIsCreateModalOpen(false)
    resetForm()
    loadData()
  }

  const getEntityName = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId)
    return entity?.name || "Unknown Entity"
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin":
        return <Crown className="h-4 w-4 text-red-600" />
      case "entity_admin":
        return <Settings className="h-4 w-4 text-blue-600" />
      case "approver":
        return <Shield className="h-4 w-4 text-green-600" />
      case "member":
        return <User className="h-4 w-4 text-purple-600" />
      case "consumer":
        return <Globe className="h-4 w-4 text-orange-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-red-100 text-red-800"
      case "entity_admin":
        return "bg-blue-100 text-blue-800"
      case "approver":
        return "bg-green-100 text-green-800"
      case "member":
        return "bg-purple-100 text-purple-800"
      case "consumer":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "superadmin":
        return "Nexus Staff"
      case "entity_admin":
        return "Entity Admin"
      case "approver":
        return "Approver"
      case "member":
        return "Member"
      case "consumer":
        return "Consumer"
      default:
        return role
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Personnel Management</h1>
                <p className="text-sm text-gray-500">
                  Manage team members and their roles
                  {user.role === "superadmin" && " (All Personnel)"}
                  {user.role === "entity_admin" && " (Your Hierarchy)"}
                </p>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Personnel
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
                  placeholder="Search personnel by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personnel Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Personnel ({filteredPersonnel.length})
            </CardTitle>
            <CardDescription>Manage personnel accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonnel.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(person.role)}
                        <Badge className={getRoleBadgeColor(person.role)}>{getRoleDisplayName(person.role)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{getEntityName(person.entityId)}</TableCell>
                    <TableCell>{new Date(person.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(person)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {person.id !== user.id && ( // Prevent self-deletion
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(person.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredPersonnel.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No personnel found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? "No personnel match your search criteria." : "Get started by adding personnel."}
                </p>
                {!searchQuery && (
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Personnel
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPersonnel ? "Edit Personnel" : "Add New Personnel"}</DialogTitle>
            <DialogDescription>
              {editingPersonnel ? "Update personnel information" : "Create a new personnel account"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password {editingPersonnel && "(leave blank to keep current)"}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingPersonnel}
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      {getRoleIcon("member")}
                      Member (Executor privileges only)
                    </div>
                  </SelectItem>
                  <SelectItem value="approver">
                    <div className="flex items-center gap-2">
                      {getRoleIcon("approver")}
                      Approver (Decision-maker)
                    </div>
                  </SelectItem>
                  <SelectItem value="entity_admin">
                    <div className="flex items-center gap-2">
                      {getRoleIcon("entity_admin")}
                      Entity Admin (IT Administrator)
                    </div>
                  </SelectItem>
                  <SelectItem value="consumer">
                    <div className="flex items-center gap-2">
                      {getRoleIcon("consumer")}
                      Consumer (Public user)
                    </div>
                  </SelectItem>
                  {user?.role === "superadmin" && (
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        {getRoleIcon("superadmin")}
                        Nexus Staff (SuperAdmin)
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entity">Entity</Label>
              <Select
                value={formData.entityId}
                onValueChange={(value) => setFormData({ ...formData, entityId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                      {entity.name === "Public" && " (For Consumers)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingPersonnel ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
