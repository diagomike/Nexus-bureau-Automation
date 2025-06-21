"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Globe } from "lucide-react";
import { storageService, type Personnel, type Entity } from "@/lib/storage";
import { EnhancedEntitySearch } from "./enhanced-entity-search";

interface ExecutionerSelectorProps {
  value: { type: "personnel" | "entity"; id: string } | null;
  onChange: (executioner: { type: "personnel" | "entity"; id: string }) => void;
  currentEntityId: string;
}

export function ExecutionerSelector({
  value,
  onChange,
  currentEntityId,
}: ExecutionerSelectorProps) {
  const [executionerType, setExecutionerType] = useState<
    "personnel" | "entity"
  >(value?.type || "personnel");
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [descendantEntities, setDescendantEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  useEffect(() => {
    // Load personnel from current entity
    const entityPersonnel =
      storageService.getPersonnelByEntity(currentEntityId);
    setPersonnel(entityPersonnel);

    // Load descendant entities
    const descendants = storageService.getDescendantEntities(currentEntityId);
    setDescendantEntities(descendants);

    // Set selected entity if value exists
    if (value?.type === "entity") {
      const entity = storageService.getEntityById(value.id);
      setSelectedEntity(entity);
    }
  }, [currentEntityId, value]);

  const handleTypeChange = (type: "personnel" | "entity") => {
    setExecutionerType(type);
    if (type === "personnel" && personnel.length > 0) {
      onChange({ type: "personnel", id: personnel[0].id });
    } else if (type === "entity" && descendantEntities.length > 0) {
      onChange({ type: "entity", id: descendantEntities[0].id });
    } else {
      onChange({ type, id: "" });
    }
  };

  const handlePersonnelChange = (personnelId: string) => {
    onChange({ type: "personnel", id: personnelId });
  };

  const handleEntityChange = (entityId: string) => {
    const entity = storageService.getEntityById(entityId);
    setSelectedEntity(entity);
    onChange({ type: "entity", id: entityId });
  };

  const handleGlobalEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    onChange({ type: "entity", id: entity.id });
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Workflow Executioner</Label>

      <RadioGroup value={executionerType} onValueChange={handleTypeChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="personnel" id="personnel" />
          <Label htmlFor="personnel">Assign to Personnel</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="entity" id="entity" />
          <Label htmlFor="entity">Assign to Entity</Label>
        </div>
      </RadioGroup>

      {executionerType === "personnel" && (
        <div>
          <Label>Select Personnel from Your Entity</Label>
          <Select
            value={value?.type === "personnel" ? value.id : ""}
            onValueChange={handlePersonnelChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select personnel" />
            </SelectTrigger>
            <SelectContent>
              {personnel.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {person.name} ({person.role})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {executionerType === "entity" && (
        <div className="space-y-3">
          <Label>Select Entity</Label>

          {/* Local Entity Dropdown */}
          <div>
            <Label className="text-sm text-gray-600">From Your Hierarchy</Label>
            <Select
              value={value?.type === "entity" ? value.id : ""}
              onValueChange={handleEntityChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity from hierarchy" />
              </SelectTrigger>
              <SelectContent>
                {descendantEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {entity.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Global Search Button */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Or search globally:</span>
            <EnhancedEntitySearch
              onSelect={handleGlobalEntitySelect}
              selectedEntityId={value?.id}
              currentEntityId={currentEntityId}
              title="Select Executioner Entity"
              description="Search and select any entity to assign as workflow executioner"
              trigger={
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Global Search
                </Button>
              }
            />
          </div>

          {/* Selected Entity Display */}
          {selectedEntity &&
            value?.type === "entity" &&
            value?.id === selectedEntity.id && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">
                        {selectedEntity.name}
                      </div>
                      <div className="text-sm text-blue-700">
                        Selected as executioner entity
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
