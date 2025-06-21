import jsPDF from "jspdf"
import { storageService, type WorkflowInstance, type WorkflowTemplate, type Personnel, type Entity } from "./storage"

export interface PDFGenerationOptions {
  workflowInstance: WorkflowInstance
  template: WorkflowTemplate
  owner: Personnel
  entities: Record<string, Entity>
  includeSignatures?: boolean
}

export class PDFGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
    this.margin = 20
    this.currentY = this.margin
  }

  async generateWorkflowPDF(options: PDFGenerationOptions): Promise<Blob> {
    const { workflowInstance, template, owner, entities } = options

    // Reset document
    this.doc = new jsPDF()
    this.currentY = this.margin

    // Header
    this.addHeader(workflowInstance, template)

    // Workflow Information
    this.addSection("Workflow Information")
    this.addKeyValue("Title", workflowInstance.title)
    this.addKeyValue("Description", template.description)
    this.addKeyValue("Owner", owner.name)
    this.addKeyValue("Created", new Date(workflowInstance.createdAt).toLocaleString())
    this.addKeyValue("Status", workflowInstance.status.toUpperCase())
    this.addKeyValue("Workflow ID", workflowInstance.id)

    if (workflowInstance.completedAt) {
      this.addKeyValue("Completed", new Date(workflowInstance.completedAt).toLocaleString())
    }

    this.addSpace(10)

    // Milestones
    this.addSection("Milestone Details")

    for (let i = 0; i < template.milestones.length; i++) {
      const milestone = template.milestones[i]
      const milestoneData = workflowInstance.milestoneData.find((md) => md.milestoneId === milestone.id)
      const approvingEntity = entities[milestone.approvingEntityId]

      this.addSubSection(`${i + 1}. ${milestone.title}`)
      this.addKeyValue("Approving Entity", approvingEntity?.name || "Unknown")
      this.addKeyValue("Status", (milestoneData?.status || "pending").toUpperCase())

      if (milestoneData?.approverId) {
        const approver = storageService.getPersonnelById(milestoneData.approverId)
        this.addKeyValue("Approved By", approver?.name || "Unknown")
        this.addKeyValue("Approved At", new Date(milestoneData.approvedAt!).toLocaleString())
      }

      // Requirements
      if (milestone.requirements.length > 0) {
        this.addText("Requirements:", "bold")
        milestone.requirements.forEach((req, index) => {
          this.addText(`${index + 1}. ${req}`)
        })
      }

      // Field Values
      if (milestoneData?.fieldValues && Object.keys(milestoneData.fieldValues).length > 0) {
        this.addText("Submitted Information:", "bold")
        Object.entries(milestoneData.fieldValues).forEach(([fieldId, value]) => {
          const field = milestone.placeholderFields.find((f) => f.id === fieldId)
          if (field) {
            this.addKeyValue(field.label, Array.isArray(value) ? value.join(", ") : String(value))
          }
        })
      }

      // Add digital signature if milestone is approved
      if (milestoneData?.status === "approved" && milestoneData.approverId) {
        const approver = storageService.getPersonnelById(milestoneData.approverId)
        if (approver?.signatureUrl) {
          await this.addSignature(approver.signatureUrl, approver.name)
        }

        // Add entity stamp if available
        if (approvingEntity?.stampUrl) {
          await this.addStamp(approvingEntity.stampUrl, approvingEntity.name)
        }
      }

      this.addSpace(15)
    }

    // Footer
    this.addFooter()

    return this.doc.output("blob")
  }

  private addHeader(workflow: WorkflowInstance, template: WorkflowTemplate) {
    this.doc.setFontSize(20)
    this.doc.setFont("helvetica", "bold")
    this.doc.text("Nexus Workflow Document", this.margin, this.currentY)
    this.currentY += 15

    this.doc.setFontSize(12)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(`Generated on: ${new Date().toLocaleString()}`, this.margin, this.currentY)
    this.currentY += 10

    // Add line
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 15
  }

  private addSection(title: string) {
    this.checkPageBreak(20)
    this.doc.setFontSize(16)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 12
  }

  private addSubSection(title: string) {
    this.checkPageBreak(15)
    this.doc.setFontSize(14)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 10
  }

  private addKeyValue(key: string, value: string) {
    this.checkPageBreak(8)
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", "bold")
    this.doc.text(`${key}:`, this.margin, this.currentY)

    this.doc.setFont("helvetica", "normal")
    const keyWidth = this.doc.getTextWidth(`${key}: `)
    this.doc.text(value, this.margin + keyWidth, this.currentY)
    this.currentY += 8
  }

  private addText(text: string, style: "normal" | "bold" = "normal") {
    this.checkPageBreak(8)
    this.doc.setFontSize(10)
    this.doc.setFont("helvetica", style)
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += 8
  }

  private addSpace(space: number) {
    this.currentY += space
  }

  private async addSignature(signatureUrl: string, signerName: string) {
    try {
      this.checkPageBreak(60)
      this.addText(`Digital Signature - ${signerName}:`, "bold")

      // Convert base64 to image and add to PDF
      const img = new Image()
      img.crossOrigin = "anonymous"

      return new Promise<void>((resolve) => {
        img.onload = () => {
          this.doc.addImage(img, "PNG", this.margin, this.currentY, 80, 30)
          this.currentY += 35
          resolve()
        }
        img.onerror = () => {
          this.addText("Signature could not be loaded")
          resolve()
        }
        img.src = signatureUrl
      })
    } catch (error) {
      this.addText("Signature could not be loaded")
    }
  }

  private async addStamp(stampUrl: string, entityName: string) {
    try {
      this.checkPageBreak(60)
      this.addText(`Official Stamp - ${entityName}:`, "bold")

      const img = new Image()
      img.crossOrigin = "anonymous"

      return new Promise<void>((resolve) => {
        img.onload = () => {
          this.doc.addImage(img, "PNG", this.margin, this.currentY, 50, 50)
          this.currentY += 55
          resolve()
        }
        img.onerror = () => {
          this.addText("Stamp could not be loaded")
          resolve()
        }
        img.src = stampUrl
      })
    } catch (error) {
      this.addText("Stamp could not be loaded")
    }
  }

  private addFooter() {
    const footerY = this.pageHeight - 20
    this.doc.setFontSize(8)
    this.doc.setFont("helvetica", "normal")
    this.doc.text("This document was generated by Nexus Workflow Management System", this.margin, footerY)
    this.doc.text(`Verification available at: ${window.location.origin}/verify`, this.margin, footerY + 5)
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.doc.addPage()
      this.currentY = this.margin
    }
  }
}

export const pdfGenerator = new PDFGenerator()
