"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Edit,
  Trash2,
} from "lucide-react";
import type { Entity, Personnel } from "@/lib/storage";

interface EntityTreeProps {
  entities: Entity[];
  personnel: Personnel[];
  onEdit: (entity: Entity) => void;
  onDelete: (entityId: string) => void;
  rootEntityId?: string;
}

interface EntityNodeProps {
  entity: Entity;
  entities: Entity[];
  personnel: Personnel[];
  onEdit: (entity: Entity) => void;
  onDelete: (entityId: string) => void;
  level: number;
}

function EntityNode({
  entity,
  entities,
  personnel,
  onEdit,
  onDelete,
  level,
}: EntityNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const children = entities.filter((e) => e.parentId === entity.id);
  const entityPersonnel = personnel.filter((p) => p.entityId === entity.id);
  const hasChildren = children.length > 0;

  const getManagerName = (managerId: string) => {
    const manager = personnel.find((p) => p.id === managerId);
    return manager?.name || "Unknown Manager";
  };

  return (
    <div className="space-y-2">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2"
              style={{ marginLeft: `${level * 20}px` }}
            >
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 h-6 w-6"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-6" />}

              <Building2 className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium">{entity.name}</div>
                <div className="text-sm text-gray-500">
                  Manager: {getManagerName(entity.managerId)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {entityPersonnel.length} personnel
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {children.length} sub-entities
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Level {level + 1}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(entity)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(entity.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isExpanded && hasChildren && (
        <div className="space-y-2">
          {children.map((child) => (
            <EntityNode
              key={child.id}
              entity={child}
              entities={entities}
              personnel={personnel}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EntityTree({
  entities,
  personnel,
  onEdit,
  onDelete,
  rootEntityId,
}: EntityTreeProps) {
  const rootEntities = rootEntityId
    ? entities.filter((e) => e.id === rootEntityId)
    : entities.filter((e) => e.parentId === null);

  return (
    <div className="space-y-4">
      {rootEntities.map((entity) => (
        <EntityNode
          key={entity.id}
          entity={entity}
          entities={entities}
          personnel={personnel}
          onEdit={onEdit}
          onDelete={onDelete}
          level={0}
        />
      ))}
    </div>
  );
}
