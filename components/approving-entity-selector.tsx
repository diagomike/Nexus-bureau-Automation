"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Building2 } from "lucide-react";
import { storageService, type Entity } from "@/lib/storage";
import { EnhancedEntitySearch } from "./enhanced-entity-search";
import { Card, CardContent } from "@/components/ui/card";

interface ApprovingEntitySelectorProps {
  value: string;
  onChange: (entityId: string) => void;
  currentEntityId: string;
}

export function ApprovingEntitySelector({
  value,
  onChange,
  currentEntityId,
}: ApprovingEntitySelectorProps) {
  const [descendantEntities, setDescendantEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  useEffect(() => {
    const descendants = storageService.getDescendantEntities(currentEntityId);
    setDescendantEntities(descendants);

    if (value) {
      const entity = storageService.getEntityById(value);
      setSelectedEntity(entity);
    } else {
      setSelectedEntity(null);
    }
  }, [currentEntityId, value]);

  const handleLocalChange = (entityId: string) => {
    const entity = storageService.getEntityById(entityId);
    setSelectedEntity(entity);
    onChange(entityId);
  };

  const handleGlobalSelect = (entity: Entity) => {
    setSelectedEntity(entity);
    onChange(entity.id);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={handleLocalChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select from hierarchy..." />
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
        <EnhancedEntitySearch
          onSelect={handleGlobalSelect}
          selectedEntityId={value}
          currentEntityId={currentEntityId}
          title="Select Approving Entity"
          description="Search and select any entity to be the approver for this milestone."
          trigger={
            <Button variant="outline" size="icon" aria-label="Global Search">
              <Globe className="h-4 w-4" />
            </Button>
          }
        />
      </div>
      {/* Visual Indicator for Selected Entity */}
      {selectedEntity && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedEntity.name}
                </div>
                <div className="text-xs text-gray-500">
                  Selected as approving entity
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
