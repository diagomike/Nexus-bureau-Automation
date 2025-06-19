"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Building2, Globe } from "lucide-react";
import { storageService, type Entity } from "@/lib/storage";

interface EnhancedEntitySearchProps {
  onSelect: (entity: Entity) => void;
  selectedEntityId?: string;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  currentEntityId?: string; // To exclude current entity and show hierarchy
}

export function EnhancedEntitySearch({
  onSelect,
  selectedEntityId,
  trigger,
  title = "Search and Select Entity",
  description = "Find and select an entity from the system",
  currentEntityId,
}: EnhancedEntitySearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);

  useEffect(() => {
    const allEntities = storageService.getEntities();
    setEntities(allEntities);
    setFilteredEntities(allEntities);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = storageService.searchEntities(searchQuery);
      setFilteredEntities(filtered);
    } else {
      setFilteredEntities(entities);
    }
  }, [searchQuery, entities]);

  const handleSelect = (entity: Entity) => {
    onSelect(entity);
    setOpen(false);
    setSearchQuery("");
  };

  const getEntityHierarchy = (entity: Entity): string => {
    const ancestors = storageService.getAncestorEntities(entity.id);
    const path = [...ancestors, entity].map((e) => e.name);
    return path.join(" → ");
  };

  const getEntityLevel = (entity: Entity): number => {
    return storageService.getAncestorEntities(entity.id).length;
  };

  const selectedEntity = selectedEntityId
    ? entities.find((e) => e.id === selectedEntityId)
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Globe className="h-4 w-4 mr-2" />
            Global Search
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search entities globally..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredEntities.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No entities found
              </p>
            ) : (
              filteredEntities
                .filter((entity) => entity.id !== currentEntityId) // Exclude current entity
                .map((entity) => {
                  const level = getEntityLevel(entity);
                  const hierarchy = getEntityHierarchy(entity);

                  return (
                    <Card
                      key={entity.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleSelect(entity)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center"
                            style={{ marginLeft: `${level * 20}px` }}
                          >
                            <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                            <div className="flex-1">
                              <div className="font-medium">{entity.name}</div>
                              <div className="text-sm text-gray-500">
                                {hierarchy}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  Level {level + 1}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  ID: {entity.id.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
