// Centralized localStorage service with comprehensive logging and audit trail
export interface Entity {
  id: string
  name: string
  parentId: string | null
  adminId: string // Changed from managerId to adminId
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
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface Personnel {
  id: string
  email: string
  password: string
  name: string
  role: "superadmin" | "entity_admin" | "approver" | "member" | "consumer"
  entityId: string // Required for all personnel
  signatureUrl?: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
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
  updatedAt: string
  updatedBy: string
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
  createdBy: string
  updatedAt: string
  updatedBy: string
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

// New: Comprehensive audit log system
export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: string
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "APPROVE" | "REJECT" | "VERIFY_PAYMENT"
  resourceType: "Entity" | "Personnel" | "WorkflowTemplate" | "WorkflowInstance" | "System"
  resourceId: string
  resourceName: string
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
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

  // Audit logging system
  private createAuditLog(
    userId: string,
    action: AuditLog["action"],
    resourceType: AuditLog["resourceType"],
    resourceId: string,
    resourceName: string,
    changes?: AuditLog["changes"],
    metadata?: Record<string, any>,
  ): void {
    const user = this.getPersonnelById(userId)
    if (!user) return

    const log: AuditLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId,
      userName: user.name,
      userRole: user.role,
      action,
      resourceType,
      resourceId,
      resourceName,
      changes,
      metadata,
      ipAddress: "127.0.0.1", // In real app, get from request
      userAgent: navigator.userAgent,
    }

    const logs = this.getAuditLogs()
    logs.push(log)
    this.save("audit_logs", logs)
  }

  // Audit log operations
  getAuditLogs(): AuditLog[] {
    return this.getAll<AuditLog>("audit_logs")
  }

  searchAuditLogs(filters: {
    userId?: string
    action?: string
    resourceType?: string
    dateFrom?: string
    dateTo?: string
    searchTerm?: string
  }): AuditLog[] {
    let logs = this.getAuditLogs()

    if (filters.userId) {
      logs = logs.filter((log) => log.userId === filters.userId)
    }

    if (filters.action) {
      logs = logs.filter((log) => log.action === filters.action)
    }

    if (filters.resourceType) {
      logs = logs.filter((log) => log.resourceType === filters.resourceType)
    }

    if (filters.dateFrom) {
      logs = logs.filter((log) => new Date(log.timestamp) >= new Date(filters.dateFrom!))
    }

    if (filters.dateTo) {
      logs = logs.filter((log) => new Date(log.timestamp) <= new Date(filters.dateTo!))
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      logs = logs.filter(
        (log) =>
          log.userName.toLowerCase().includes(term) ||
          log.resourceName.toLowerCase().includes(term) ||
          log.action.toLowerCase().includes(term),
      )
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Entity operations with audit logging
  getEntities(): Entity[] {
    return this.getAll<Entity>("entities")
  }

  createEntity(
    entity: Omit<
      Entity,
      "id" | "createdAt" | "tokenId" | "subscriptionExpiry" | "createdBy" | "updatedAt" | "updatedBy"
    >,
    createdBy: string,
  ): Entity {
    const entities = this.getEntities()
    const newEntity: Entity = {
      ...entity,
      id: this.generateId(),
      tokenId: this.generateTokenId(),
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days free trial
      createdAt: new Date().toISOString(),
      createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: createdBy,
    }
    entities.push(newEntity)
    this.save("entities", entities)

    // Create audit log
    this.createAuditLog(createdBy, "CREATE", "Entity", newEntity.id, newEntity.name)

    return newEntity
  }

  updateEntity(id: string, updates: Partial<Entity>, updatedBy: string): Entity | null {
    const entities = this.getEntities()
    const index = entities.findIndex((e) => e.id === id)
    if (index === -1) return null

    const oldEntity = { ...entities[index] }
    const changes: AuditLog["changes"] = []

    // Track changes
    Object.keys(updates).forEach((key) => {
      const oldValue = (oldEntity as any)[key]
      const newValue = (updates as any)[key]
      if (oldValue !== newValue) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        })
      }
    })

    entities[index] = {
      ...entities[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy,
    }
    this.save("entities", entities)

    // Create audit log
    if (changes.length > 0) {
      this.createAuditLog(updatedBy, "UPDATE", "Entity", id, entities[index].name, changes)
    }

    return entities[index]
  }

  deleteEntity(id: string, deletedBy: string): boolean {
    const entities = this.getEntities()
    const entity = entities.find((e) => e.id === id)
    if (!entity) return false

    const filtered = entities.filter((e) => e.id !== id)
    this.save("entities", filtered)

    // Create audit log
    this.createAuditLog(deletedBy, "DELETE", "Entity", id, entity.name)

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
    } else if (userRole === "entity_admin" || userRole === "approver" || userRole === "member") {
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

    // Public workflows are accessible to all consumers and members
    if (template.executioner.type === "public") {
      return user.role === "consumer" || user.role === "member" || user.role === "approver"
    }

    if (template.executioner.type === "personnel") {
      return template.executioner.id === userId
    } else if (template.executioner.type === "entity") {
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

    return this.getPersonnel().filter((p) => entityIds.includes(p.entityId))
  }

  // Check if entity subscription is expired
  isEntitySubscriptionExpired(entityId: string): boolean {
    const entity = this.getEntityById(entityId)
    if (!entity) return true

    return new Date(entity.subscriptionExpiry) < new Date()
  }

  // Personnel operations with audit logging
  getPersonnel(): Personnel[] {
    return this.getAll<Personnel>("personnel")
  }

  createPersonnel(
    personnel: Omit<Personnel, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">,
    createdBy: string,
  ): Personnel {
    const allPersonnel = this.getPersonnel()
    const newPersonnel: Personnel = {
      ...personnel,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: createdBy,
    }
    allPersonnel.push(newPersonnel)
    this.save("personnel", allPersonnel)

    // Create audit log
    this.createAuditLog(createdBy, "CREATE", "Personnel", newPersonnel.id, newPersonnel.name)

    return newPersonnel
  }

  updatePersonnel(id: string, updates: Partial<Personnel>, updatedBy: string): Personnel | null {
    const allPersonnel = this.getPersonnel()
    const index = allPersonnel.findIndex((p) => p.id === id)
    if (index === -1) return null

    const oldPersonnel = { ...allPersonnel[index] }
    const changes: AuditLog["changes"] = []

    // Track changes (excluding sensitive fields like password)
    Object.keys(updates).forEach((key) => {
      if (key === "password") return // Don't log password changes
      const oldValue = (oldPersonnel as any)[key]
      const newValue = (updates as any)[key]
      if (oldValue !== newValue) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        })
      }
    })

    allPersonnel[index] = {
      ...allPersonnel[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy,
    }
    this.save("personnel", allPersonnel)

    // Create audit log
    if (changes.length > 0) {
      this.createAuditLog(updatedBy, "UPDATE", "Personnel", id, allPersonnel[index].name, changes)
    }

    return allPersonnel[index]
  }

  deletePersonnel(id: string, deletedBy: string): boolean {
    const allPersonnel = this.getPersonnel()
    const personnel = allPersonnel.find((p) => p.id === id)
    if (!personnel) return false

    const filtered = allPersonnel.filter((p) => p.id !== id)
    this.save("personnel", filtered)

    // Create audit log
    this.createAuditLog(deletedBy, "DELETE", "Personnel", id, personnel.name)

    return true
  }

  getPersonnelById(id: string): Personnel | null {
    return this.getPersonnel().find((p) => p.id === id) || null
  }

  getPersonnelByEntity(entityId: string): Personnel[] {
    return this.getPersonnel().filter((p) => p.entityId === entityId)
  }

  authenticatePersonnel(email: string, password: string): Personnel | null {
    const personnel = this.getPersonnel().find((p) => p.email === email && p.password === password)
    if (personnel) {
      // Create audit log for login
      this.createAuditLog(personnel.id, "LOGIN", "System", "login", "User Login")
    }
    return personnel || null
  }

  // Workflow Template operations with audit logging
  getWorkflowTemplates(): WorkflowTemplate[] {
    return this.getAll<WorkflowTemplate>("workflow_templates")
  }

  createWorkflowTemplate(
    template: Omit<WorkflowTemplate, "id" | "createdAt" | "usageCount" | "updatedAt" | "updatedBy">,
  ): WorkflowTemplate {
    const templates = this.getWorkflowTemplates()
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: this.generateId(),
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: template.createdBy,
    }
    templates.push(newTemplate)
    this.save("workflow_templates", templates)

    // Create audit log
    this.createAuditLog(template.createdBy, "CREATE", "WorkflowTemplate", newTemplate.id, newTemplate.title)

    return newTemplate
  }

  updateWorkflowTemplate(id: string, updates: Partial<WorkflowTemplate>, updatedBy: string): WorkflowTemplate | null {
    const templates = this.getWorkflowTemplates()
    const index = templates.findIndex((t) => t.id === id)
    if (index === -1) return null

    const oldTemplate = { ...templates[index] }
    const changes: AuditLog["changes"] = []

    // Track changes
    Object.keys(updates).forEach((key) => {
      const oldValue = (oldTemplate as any)[key]
      const newValue = (updates as any)[key]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        })
      }
    })

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy,
    }
    this.save("workflow_templates", templates)

    // Create audit log
    if (changes.length > 0) {
      this.createAuditLog(updatedBy, "UPDATE", "WorkflowTemplate", id, templates[index].title, changes)
    }

    return templates[index]
  }

  deleteWorkflowTemplate(id: string, deletedBy: string): boolean {
    const templates = this.getWorkflowTemplates()
    const template = templates.find((t) => t.id === id)
    if (!template) return false

    const filtered = templates.filter((t) => t.id !== id)
    this.save("workflow_templates", filtered)

    // Create audit log
    this.createAuditLog(deletedBy, "DELETE", "WorkflowTemplate", id, template.title)

    return true
  }

  getWorkflowTemplateById(id: string): WorkflowTemplate | null {
    return this.getWorkflowTemplates().find((t) => t.id === id) || null
  }

  getWorkflowTemplatesByEntity(entityId: string): WorkflowTemplate[] {
    return this.getWorkflowTemplates().filter((t) => t.entityId === entityId && !t.archived)
  }

  // Increment usage count when workflow is started
  incrementWorkflowUsage(templateId: string, userId: string): void {
    const template = this.getWorkflowTemplateById(templateId)
    if (template) {
      this.updateWorkflowTemplate(templateId, { usageCount: template.usageCount + 1 }, userId)
    }
  }

  // Workflow Instance operations with audit logging
  getWorkflowInstances(): WorkflowInstance[] {
    return this.getAll<WorkflowInstance>("workflow_instances")
  }

  createWorkflowInstance(
    instance: Omit<WorkflowInstance, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">,
    createdBy: string,
  ): WorkflowInstance {
    const instances = this.getWorkflowInstances()
    const newInstance: WorkflowInstance = {
      ...instance,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: createdBy,
    }
    instances.push(newInstance)
    this.save("workflow_instances", instances)

    // Increment usage count
    this.incrementWorkflowUsage(instance.templateId, createdBy)

    // Create audit log
    this.createAuditLog(createdBy, "CREATE", "WorkflowInstance", newInstance.id, newInstance.title)

    return newInstance
  }

  updateWorkflowInstance(id: string, updates: Partial<WorkflowInstance>, updatedBy: string): WorkflowInstance | null {
    const instances = this.getWorkflowInstances()
    const index = instances.findIndex((i) => i.id === id)
    if (index === -1) return null

    const oldInstance = { ...instances[index] }
    const changes: AuditLog["changes"] = []

    // Track changes
    Object.keys(updates).forEach((key) => {
      const oldValue = (oldInstance as any)[key]
      const newValue = (updates as any)[key]
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        })
      }
    })

    instances[index] = {
      ...instances[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy,
    }
    this.save("workflow_instances", instances)

    // Create audit log
    if (changes.length > 0) {
      this.createAuditLog(updatedBy, "UPDATE", "WorkflowInstance", id, instances[index].title, changes)
    }

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
      return standardMilestone.approvingEntityId === personnel.entityId
    })
  }

  // Initialize with sample data including the Public entity for consumers
  initializeSampleData(): void {
    if (this.getPersonnel().length > 0) return // Already initialized

    // Create the default "Public" entity for consumers
    const publicEntity = this.createEntity(
      {
        name: "Public",
        parentId: null,
        adminId: "temp", // Will be updated after creating superadmin
        visibility: "public",
      },
      "system",
    )

    // Create root government entity
    const govEntity = this.createEntity(
      {
        name: "Government of Example",
        parentId: null,
        adminId: "temp",
        visibility: "public",
      },
      "system",
    )

    const healthMinistry = this.createEntity(
      {
        name: "Ministry of Health",
        parentId: govEntity.id,
        adminId: "temp",
        visibility: "public",
      },
      "system",
    )

    // Create SuperAdmin (Nexus Staff)
    const superAdmin = this.createPersonnel(
      {
        email: "admin@nexus.gov",
        password: "admin123",
        name: "System Administrator",
        role: "superadmin",
        entityId: govEntity.id,
      },
      "system",
    )

    // Create Entity Admin
    const entityAdmin = this.createPersonnel(
      {
        email: "admin@health.gov",
        password: "admin123",
        name: "Health IT Administrator",
        role: "entity_admin",
        entityId: healthMinistry.id,
      },
      superAdmin.id,
    )

    // Create Approver
    const approver = this.createPersonnel(
      {
        email: "minister@health.gov",
        password: "minister123",
        name: "Dr. Sarah Johnson - Health Minister",
        role: "approver",
        entityId: healthMinistry.id,
      },
      entityAdmin.id,
    )

    // Create Member
    const member = this.createPersonnel(
      {
        email: "staff@health.gov",
        password: "staff123",
        name: "Health Staff Member",
        role: "member",
        entityId: healthMinistry.id,
      },
      entityAdmin.id,
    )

    // Create Consumer (under Public entity)
    this.createPersonnel(
      {
        email: "john.doe@gmail.com",
        password: "user123",
        name: "John Doe",
        role: "consumer",
        entityId: publicEntity.id,
      },
      "system",
    )

    // Update entity admin IDs
    this.updateEntity(publicEntity.id, { adminId: superAdmin.id }, superAdmin.id)
    this.updateEntity(govEntity.id, { adminId: superAdmin.id }, superAdmin.id)
    this.updateEntity(healthMinistry.id, { adminId: entityAdmin.id }, superAdmin.id)

    // Create regional health office
    const regionalHealth = this.createEntity(
      {
        name: "Regional Health Office - North",
        parentId: healthMinistry.id,
        adminId: entityAdmin.id,
        visibility: "protected",
      },
      entityAdmin.id,
    )

    // Create IT Department
    const itDept = this.createEntity(
      {
        name: "IT Department",
        parentId: govEntity.id,
        adminId: superAdmin.id,
        visibility: "private",
      },
      superAdmin.id,
    )
  }
}

export const storageService = new StorageService()
