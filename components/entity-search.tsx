"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Building2 } from "lucide-react"
import { storageService, type Entity } from "@/lib/storage"

interface EntitySearchProps {
  onSelect: (entity: Entity) => void
  selectedEntityId?: string
  trigger?: React.ReactNode
}

export function EntitySearch({ onSelect, selectedEntityId, trigger }: EntitySearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [entities, setEntities] = useState<Entity[]>([])
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([])

  useEffect(() => {
    const allEntities = storageService.getEntities()
    setEntities(allEntities)
    setFilteredEntities(allEntities)
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = storageService.searchEntities(searchQuery)
      setFilteredEntities(filtered)
    } else {
      setFilteredEntities(entities)
    }
  }, [searchQuery, entities])

  const handleSelect = (entity: Entity) => {
    onSelect(entity)
    setOpen(false)
    setSearchQuery("")
  }

  const selectedEntity = selectedEntityId ? entities.find((e) => e.id === selectedEntityId) : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start">
            <Building2 className="h-4 w-4 mr-2" />
            {selectedEntity ? selectedEntity.name : "Select Entity"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search and Select Entity</DialogTitle>
          <DialogDescription>Find and select an entity from the system</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredEntities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No entities found</p>
            ) : (
              filteredEntities.map((entity) => (
                <Card key={entity.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSelect(entity)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{entity.name}</div>
                        <div className="text-sm text-gray-500">ID: {entity.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
