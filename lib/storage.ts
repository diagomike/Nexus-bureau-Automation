// Centralized localStorage service for easy migration to real backend
export interface Entity {
  id: string
  name: string
  parentId: string | null
  managerId: string
  visibility: "public" | "protected" | "private"
  tokenId: string // For protected entities
  stampUrl?: string
  subscriptionExpiry: string
  paymentDetails?: {
    provider: "telebirr" | "cbe"
    receiverName: string
    receiverAccount: string
    verified: boolean
  }
  createdAt: string
}

export interface Personnel {
  id: string
  email: string
  password: string
  name: string
  role: "superadmin" | "entity_admin" | "approver" | "consumer"
  entityId?: string // Optional for consumers
  signatureUrl?: string
  createdAt: string
}

export interface WorkflowTemplate {
  id: string
  title: string
  description: string
  entityId: string
  createdBy: string
  milestones: (Milestone | PaymentMilestone)[]
  executioner: {
    type: "personnel" | "entity" | "public"
    id?: string // Optional when type is "public"
  }
  archived?: boolean
  usageLimit?: number
  usageCount: number
  createdAt: string
}

export interface Milestone {
  id: string
  type: "standard"
  title: string
  approvingEntityId: string
  approvingType: "entity" | "owner" // New: allows self-approval
  requirements: string[]
  placeholderFields: PlaceholderField[]
  order: number
}

export interface PaymentMilestone {
  id: string
  type: "payment"
  title: string
  paymentProvider: "telebirr" | "cbe"
  requiredAmount: number
  receiverName: string
  receiverAccount: string
  requirements: string[]
  order: number
}

export interface PlaceholderField {
  id: string
  label: string
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "date"
    | "select"
    | "multiselect"
    | "checkbox"
    | "radio"
    | "boolean"
    | "file"
    | "telebirr_verification"
    | "cbe_verification"
  required: boolean
  options?: string[] // For select, multiselect, radio
  placeholder?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    maxFileSize?: number // For file uploads (in MB)
    allowedFileTypes?: string[] // For file uploads
  }
}

export interface WorkflowInstance {
  id: string
  templateId: string
  title: string
  ownerId: string
  status: "active" | "completed" | "rejected"
  currentMilestoneIndex: number
  milestoneData: (MilestoneData | PaymentMilestoneData)[]
  createdAt: string
  completedAt?: string
}

export interface MilestoneData {
  milestoneId: string
  type: "standard"
  status: "pending" | "active" | "approved" | "rejected"
  approverId?: string
  approvedAt?: string
  fieldValues: Record<string, any>
  rejectionReason?: string
}

export interface PaymentMilestoneData {
  milestoneId: string
  type: "payment"
  status: "pending" | "active" | "verified" | "failed"
  verificationData?: any
  verifiedAt?: string
  paymentReference?: string
}

class StorageService {
  private getKey(type: string): string {
    return `nexus_${type}`
  }

  // Generic CRUD operations
  private getAll<T>(type: string): T[] {
    const data = localStorage.getItem(this.getKey(type))
    return data ? JSON.parse(data) : []
  }

  private save<T>(type: string, items: T[]): void {
    localStorage.setItem(this.getKey(type), JSON.stringify(items))
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private generateTokenId(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  // Entity operations
  getEntities(): Entity[] {
    return this.getAll<Entity>("entities")
  }

  createEntity(entity: Omit<Entity, "id" | "createdAt" | "tokenId" | "subscriptionExpiry" | "usageCount">): Entity {
    const entities = this.getEntities()
    const newEntity: Entity = {
      ...entity,
      id: this.generateId(),
      tokenId: this.generateTokenId(),
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days free trial
      createdAt: new Date().toISOString(),
    }
    entities.push(newEntity)
    this.save("entities", entities)
    return newEntity
  }

  updateEntity(id: string, updates: Partial<Entity>): Entity | null {
    const entities = this.getEntities()
    const index = entities.findIndex((e) => e.id === id)
    if (index === -1) return null

    entities[index] = { ...entities[index], ...updates }
    this.save("entities", entities)
    return entities[index]
  }

  deleteEntity(id: string): boolean {
    const entities = this.getEntities()
    const filtered = entities.filter((e) => e.id !== id)
    if (filtered.length === entities.length) return false

    this.save("entities", filtered)
    return true
  }

  getEntityById(id: string): Entity | null {
    return this.getEntities().find((e) => e.id === id) || null
  }

  getEntityByTokenId(tokenId: string): Entity | null {
    return this.getEntities().find((e) => e.tokenId === tokenId) || null
  }

  getSubEntities(parentId: string): Entity[] {
    return this.getEntities().filter((e) => e.parentId === parentId)
  }

  // Get all descendant entities of a given entity
  getDescendantEntities(entityId: string): Entity[] {
    const allEntities = this.getEntities()
    const descendants: Entity[] = []

    const findDescendants = (parentId: string) => {
      const children = allEntities.filter((e) => e.parentId === parentId)
      children.forEach((child) => {
        descendants.push(child)
        findDescendants(child.id)
      })
    }

    findDescendants(entityId)
    return descendants
  }

  // Get all ancestor entities of a given entity
  getAncestorEntities(entityId: string): Entity[] {
    const allEntities = this.getEntities()
    const ancestors: Entity[] = []

    let currentEntity = allEntities.find((e) => e.id === entityId)
    while (currentEntity?.parentId) {
      const parent = allEntities.find((e) => e.id === currentEntity!.parentId)
      if (parent) {
        ancestors.unshift(parent)
        currentEntity = parent
      } else {
        break
      }
    }

    return ancestors
  }

  // Get public entities for consumer search
  getPublicEntities(): Entity[] {
    return this.getEntities().filter((e) => e.visibility === "public")
  }

  // Search entities based on user role and visibility
  searchEntities(query: string, userRole: string, userEntityId?: string): Entity[] {
    let entities = this.getEntities()

    // Filter by visibility based on user role
    if (userRole === "consumer") {
      entities = entities.filter((e) => e.visibility === "public")
    } else if (userRole === "entity_admin" || userRole === "approver") {
      // Can see their own entity hierarchy + public entities
      const userEntity = userEntityId ? this.getEntityById(userEntityId) : null
      if (userEntity) {
        const hierarchy = [
          userEntity,
          ...this.getDescendantEntities(userEntityId!),
          ...this.getAncestorEntities(userEntityId!),
        ]
        const hierarchyIds = hierarchy.map((e) => e.id)
        entities = entities.filter((e) => e.visibility === "public" || hierarchyIds.includes(e.id))
      }
    }
    // SuperAdmin can see all entities

    if (!query.trim()) return entities

    const searchTerm = query.toLowerCase()
    return entities.filter((entity) => entity.name.toLowerCase().includes(searchTerm))
  }

  // Check if user can access workflow based on executioner assignment
  canUserAccessWorkflow(userId: string, template: WorkflowTemplate): boolean {
    const user = this.getPersonnelById(userId)
    if (!user) return false

    // Public workflows are accessible to all consumers
    if (template.executioner.type === "public") {
      return user.role === "consumer" || user.role === "approver"
    }

    if (template.executioner.type === "personnel") {
      return template.executioner.id === userId
    } else if (template.executioner.type === "entity") {
      if (!user.entityId) return false

      const userEntity = this.getEntityById(user.entityId)
      if (!userEntity) return false

      if (user.entityId === template.executioner.id) return true

      // Check if user's entity is a descendant of the executioner entity
      const ancestors = this.getAncestorEntities(user.entityId)
      return ancestors.some((ancestor) => ancestor.id === template.executioner.id)
    }

    return false
  }

  // Get accessible workflows for a user
  getAccessibleWorkflowTemplates(userId: string): WorkflowTemplate[] {
    const allTemplates = this.getWorkflowTemplates().filter((t) => !t.archived)
    return allTemplates.filter((template) => {
      // Check usage limit
      if (template.usageLimit && template.usageCount >= template.usageLimit) {
        return false
      }
      return this.canUserAccessWorkflow(userId, template)
    })
  }

  // Get public workflows for consumers
  getPublicWorkflowTemplates(): WorkflowTemplate[] {
    return this.getWorkflowTemplates().filter(
      (t) => !t.archived && t.executioner.type === "public" && (!t.usageLimit || t.usageCount < t.usageLimit),
    )
  }

  // Get personnel within entity hierarchy
  getHierarchicalPersonnel(entityId: string): Personnel[] {
    const entity = this.getEntityById(entityId)
    if (!entity) return []

    const descendants = this.getDescendantEntities(entityId)
    const entityIds = [entityId, ...descendants.map((e) => e.id)]

    return this.getPersonnel().filter((p) => p.entityId && entityIds.includes(p.entityId))
  }

  // Check if entity subscription is expired
  isEntitySubscriptionExpired(entityId: string): boolean {
    const entity = this.getEntityById(entityId)
    if (!entity) return true

    return new Date(entity.subscriptionExpiry) < new Date()
  }

  // Personnel operations
  getPersonnel(): Personnel[] {
    return this.getAll<Personnel>("personnel")
  }

  createPersonnel(personnel: Omit<Personnel, "id" | "createdAt">): Personnel {
    const allPersonnel = this.getPersonnel()
    const newPersonnel: Personnel = {
      ...personnel,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    }
    allPersonnel.push(newPersonnel)
    this.save("personnel", allPersonnel)
    return newPersonnel
  }

  updatePersonnel(id: string, updates: Partial<Personnel>): Personnel | null {
    const allPersonnel = this.getPersonnel()
    const index = allPersonnel.findIndex((p) => p.id === id)
    if (index === -1) return null

    allPersonnel[index] = { ...allPersonnel[index], ...updates }
    this.save("personnel", allPersonnel)
    return allPersonnel[index]
  }

  deletePersonnel(id: string): boolean {
    const allPersonnel = this.getPersonnel()
    const filtered = allPersonnel.filter((p) => p.id !== id)
    if (filtered.length === allPersonnel.length) return false

    this.save("personnel", filtered)
    return true
  }

  getPersonnelById(id: string): Personnel | null {
    return this.getPersonnel().find((p) => p.id === id) || null
  }

  getPersonnelByEntity(entityId: string): Personnel[] {
    return this.getPersonnel().filter((p) => p.entityId === entityId)
  }

  authenticatePersonnel(email: string, password: string): Personnel | null {
    return this.getPersonnel().find((p) => p.email === email && p.password === password) || null
  }

  // Workflow Template operations
  getWorkflowTemplates(): WorkflowTemplate[] {
    return this.getAll<WorkflowTemplate>("workflow_templates")
  }

  createWorkflowTemplate(template: Omit<WorkflowTemplate, "id" | "createdAt" | "usageCount">): WorkflowTemplate {
    const templates = this.getWorkflowTemplates()
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: this.generateId(),
      usageCount: 0,
      createdAt: new Date().toISOString(),
    }
    templates.push(newTemplate)
    this.save("workflow_templates", templates)
    return newTemplate
  }

  updateWorkflowTemplate(id: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const templates = this.getWorkflowTemplates()
    const index = templates.findIndex((t) => t.id === id)
    if (index === -1) return null

    templates[index] = { ...templates[index], ...updates }
    this.save("workflow_templates", templates)
    return templates[index]
  }

  deleteWorkflowTemplate(id: string): boolean {
    const templates = this.getWorkflowTemplates()
    const filtered = templates.filter((t) => t.id !== id)
    if (filtered.length === templates.length) return false

    this.save("workflow_templates", filtered)
    return true
  }

  getWorkflowTemplateById(id: string): WorkflowTemplate | null {
    return this.getWorkflowTemplates().find((t) => t.id === id) || null
  }

  getWorkflowTemplatesByEntity(entityId: string): WorkflowTemplate[] {
    return this.getWorkflowTemplates().filter((t) => t.entityId === entityId && !t.archived)
  }

  // Increment usage count when workflow is started
  incrementWorkflowUsage(templateId: string): void {
    const template = this.getWorkflowTemplateById(templateId)
    if (template) {
      this.updateWorkflowTemplate(templateId, { usageCount: template.usageCount + 1 })
    }
  }

  // Workflow Instance operations
  getWorkflowInstances(): WorkflowInstance[] {
    return this.getAll<WorkflowInstance>("workflow_instances")
  }

  createWorkflowInstance(instance: Omit<WorkflowInstance, "id" | "createdAt">): WorkflowInstance {
    const instances = this.getWorkflowInstances()
    const newInstance: WorkflowInstance = {
      ...instance,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
    }
    instances.push(newInstance)
    this.save("workflow_instances", instances)

    // Increment usage count
    this.incrementWorkflowUsage(instance.templateId)

    return newInstance
  }

  updateWorkflowInstance(id: string, updates: Partial<WorkflowInstance>): WorkflowInstance | null {
    const instances = this.getWorkflowInstances()
    const index = instances.findIndex((i) => i.id === id)
    if (index === -1) return null

    instances[index] = { ...instances[index], ...updates }
    this.save("workflow_instances", instances)
    return instances[index]
  }

  getWorkflowInstanceById(id: string): WorkflowInstance | null {
    return this.getWorkflowInstances().find((i) => i.id === id) || null
  }

  getWorkflowInstancesByOwner(ownerId: string): WorkflowInstance[] {
    return this.getWorkflowInstances().filter((i) => i.ownerId === ownerId)
  }

  getPendingApprovals(personnelId: string): WorkflowInstance[] {
    const instances = this.getWorkflowInstances().filter((i) => i.status === "active")
    const personnel = this.getPersonnelById(personnelId)
    if (!personnel) return []

    return instances.filter((instance) => {
      const template = this.getWorkflowTemplateById(instance.templateId)
      if (!template) return false

      const currentMilestone = template.milestones[instance.currentMilestoneIndex]
      if (!currentMilestone || currentMilestone.type === "payment") return false

      const standardMilestone = currentMilestone as Milestone

      // Check for owner approval
      if (standardMilestone.approvingType === "owner") {
        return instance.ownerId === personnelId
      }

      // Check if this personnel's entity matches the approving entity
      return personnel.entityId && standardMilestone.approvingEntityId === personnel.entityId
    })
  }

  // Initialize with sample data
  initializeSampleData(): void {
    if (this.getPersonnel().length > 0) return // Already initialized

    // Create root entities
    const govEntity = this.createEntity({
      name: "Government of Example",
      parentId: null,
      managerId: "temp",
      visibility: "public",
    })

    const healthMinistry = this.createEntity({
      name: "Ministry of Health",
      parentId: govEntity.id,
      managerId: "temp",
      visibility: "public",
    })

    // Create SuperAdmin (Nexus Staff)
    const superAdmin = this.createPersonnel({
      email: "admin@nexus.gov",
      password: "admin123",
      name: "System Administrator",
      role: "superadmin",
      entityId: govEntity.id,
    })

    // Create Entity Admin
    const entityAdmin = this.createPersonnel({
      email: "admin@health.gov",
      password: "admin123",
      name: "Health IT Administrator",
      role: "entity_admin",
      entityId: healthMinistry.id,
    })

    // Create Approver
    const approver = this.createPersonnel({
      email: "minister@health.gov",
      password: "minister123",
      name: "Dr. Sarah Johnson - Health Minister",
      role: "approver",
      entityId: healthMinistry.id,
    })

    // Create Consumer
    this.createPersonnel({
      email: "john.doe@gmail.com",
      password: "user123",
      name: "John Doe",
      role: "consumer",
    })

    // Update entity manager IDs
    this.updateEntity(govEntity.id, { managerId: superAdmin.id })
    this.updateEntity(healthMinistry.id, { managerId: entityAdmin.id })

    // Create regional health office
    const regionalHealth = this.createEntity({
      name: "Regional Health Office - North",
      parentId: healthMinistry.id,
      managerId: entityAdmin.id,
      visibility: "protected",
    })

    // Create IT Department
    const itDept = this.createEntity({
      name: "IT Department",
      parentId: govEntity.id,
      managerId: superAdmin.id,
      visibility: "private",
    })
  }
}

export const storageService = new StorageService()
