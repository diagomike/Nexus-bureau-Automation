"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Plus, Edit, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { AuthService } from "@/lib/auth";
import { storageService, type Personnel, type Entity } from "@/lib/storage";

export default function EntitiesPage() {
  const [user, setUser] = useState<Personnel | null>(null);
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    parentId: "",
    managerId: "",
  });

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (currentUser.role !== "manager" && currentUser.role !== "superadmin") {
      router.push("/dashboard");
      return;
    }

    setUser(currentUser);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // const loadData = () => {
  //   const allEntities = storageService.getEntities()
  //   const allPersonnel = storageService.getPersonnel()
  //   setEntities(allEntities)
  //   setPersonnel(allPersonnel)
  //   setFilteredEntities(allEntities)
  // }

  const loadData = () => {
    if (!user) return;

    // Load only current entity and its descendants
    const currentEntity = storageService.getEntityById(user.entityId);
    const descendants = storageService.getDescendantEntities(user.entityId);
    const hierarchicalEntities = currentEntity
      ? [currentEntity, ...descendants]
      : descendants;

    const allPersonnel = storageService.getHierarchicalPersonnel(user.entityId);
    setEntities(hierarchicalEntities);
    setPersonnel(allPersonnel);
    setFilteredEntities(hierarchicalEntities);
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = storageService.searchEntities(searchQuery);
      setFilteredEntities(filtered);
    } else {
      setFilteredEntities(entities);
    }
  }, [searchQuery, entities]);

  const resetForm = () => {
    setFormData({
      name: "",
      parentId: "",
      managerId: "",
    });
    setEditingEntity(null);
  };

  const handleCreate = () => {
    setIsCreateModalOpen(true);
    resetForm();
  };

  const handleEdit = (entity: Entity) => {
    setFormData({
      name: entity.name,
      parentId: entity.parentId || "",
      managerId: entity.managerId,
    });
    setEditingEntity(entity);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (entityId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this entity? This will also affect related personnel."
      )
    ) {
      storageService.deleteEntity(entityId);
      loadData();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Normalize parentId
    const normalizedParentId =
      !formData.parentId ||
      formData.parentId === "none" ||
      formData.parentId === ""
        ? null
        : formData.parentId;

    if (editingEntity) {
      // Update existing entity
      storageService.updateEntity(editingEntity.id, {
        name: formData.name,
        parentId: normalizedParentId,
        managerId: formData.managerId,
      });
    } else {
      // Create new entity
      storageService.createEntity({
        name: formData.name,
        parentId: normalizedParentId,
        managerId: formData.managerId,
      });
    }

    setIsCreateModalOpen(false);
    resetForm();
    loadData();
  };

  const getEntityHierarchy = (entity: Entity): string => {
    const path: string[] = [];
    let current: Entity | null = entity;

    while (current) {
      path.unshift(current.name);
      current = current.parentId
        ? entities.find((e) => e.id === current!.parentId) || null
        : null;
    }

    return path.join(" → ");
  };

  const getManagerName = (managerId: string) => {
    const manager = personnel.find((p) => p.id === managerId);
    return manager?.name || "Unknown Manager";
  };

  const getSubEntitiesCount = (entityId: string) => {
    return entities.filter((e) => e.parentId === entityId).length;
  };

  const getPersonnelCount = (entityId: string) => {
    return personnel.filter((p) => p.entityId === entityId).length;
  };

  // Get available managers (personnel with manager or superadmin role)
  const availableManagers = personnel.filter(
    (p) => p.role === "manager" || p.role === "superadmin"
  );

  if (!user) return null;

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Entity Management
                </h1>
                <p className="text-sm text-gray-500">
                  Manage organizational structure and hierarchy
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
            <Card key={entity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="truncate">{entity.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(entity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(entity.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs">
                  {entity.parentId ? getEntityHierarchy(entity) : "Root Entity"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Manager:</span>
                    <span className="font-medium">
                      {getManagerName(entity.managerId)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sub-entities:</span>
                    <span className="font-medium">
                      {getSubEntitiesCount(entity.id)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Personnel:</span>
                    <span className="font-medium">
                      {getPersonnelCount(entity.id)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">
                      {new Date(entity.createdAt).toLocaleDateString()}
                    </span>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No entities found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "No entities match your search criteria."
                  : "Get started by creating your first entity."}
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
            <DialogTitle>
              {editingEntity ? "Edit Entity" : "Create New Entity"}
            </DialogTitle>
            <DialogDescription>
              {editingEntity
                ? "Update entity information"
                : "Create a new organizational entity"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Entity Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Ministry of Health"
                required
              />
            </div>

            <div>
              <Label htmlFor="parent">Parent Entity (Optional)</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentId: value })
                }
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
              <Label htmlFor="manager">Manager</Label>
              <Select
                value={formData.managerId}
                onValueChange={(value) =>
                  setFormData({ ...formData, managerId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {availableManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingEntity ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
