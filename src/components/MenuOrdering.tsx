import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, RotateCcw, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { MenuItem } from '@shared/schema';
import { ImageWithSkeleton } from '@/components/ImageWithSkeleton';

interface SortableItemProps {
  item: MenuItem;
  index: number;
}

function SortableItem({ item, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(item.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white border rounded-lg ${
        isDragging ? 'shadow-lg z-50' : 'shadow-sm'
      } hover:shadow-md transition-shadow`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>

      {/* Order Number */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full font-semibold text-sm text-slate-700">
        {index + 1}
      </div>

      {/* Image */}
      <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
        <ImageWithSkeleton
          src={item.imageUrl || ''}
          alt={item.name}
          containerClassName="w-full h-full"
        />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{item.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {item.category}
          </Badge>
          <span className="text-sm text-muted-foreground">
            ₦{parseFloat(item.price).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {item.available ? (
          <Badge variant="default" className="bg-green-600">
            Available
          </Badge>
        ) : (
          <Badge variant="secondary">Unavailable</Badge>
        )}
      </div>
    </div>
  );
}

interface MenuOrderingProps {
  items: MenuItem[];
  onClose: () => void;
}

export function MenuOrdering({ items, onClose }: MenuOrderingProps) {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(
    [...items].sort((a, b) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      if (orderA === orderB) {
        return a.name.localeCompare(b.name);
      }
      return orderA - orderB;
    })
  );
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMenuItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare bulk update payload
      const updates = menuItems.map((item, index) => ({
        id: item.id,
        displayOrder: index + 1,
      }));

      await apiRequest('POST', '/api/menu/order/bulk', { items: updates });

      toast({
        title: 'Success',
        description: `Menu order updated successfully for ${updates.length} items`,
      });

      // Refresh menu data
      queryClient.invalidateQueries({ queryKey: ['/api/menu/all'] });
      
      onClose();
    } catch (error) {
      console.error('Error updating menu order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update menu order. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAlphabetical = async () => {
    try {
      await apiRequest('POST', '/api/menu/order/reset-alphabetical');

      toast({
        title: 'Success',
        description: 'Menu items reset to alphabetical order',
      });

      // Refresh menu data
      queryClient.invalidateQueries({ queryKey: ['/api/menu/all'] });
      
      onClose();
    } catch (error) {
      console.error('Error resetting menu order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset menu order. Please try again.',
      });
    }
  };

  const handleResetByCategory = async () => {
    try {
      await apiRequest('POST', '/api/menu/order/reset-by-category');

      toast({
        title: 'Success',
        description: 'Menu items reset by category',
      });

      // Refresh menu data
      queryClient.invalidateQueries({ queryKey: ['/api/menu/all'] });
      
      onClose();
    } catch (error) {
      console.error('Error resetting menu order:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset menu order. Please try again.',
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Arrange Menu Items</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop items to change their display order
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAlphabetical}
              title="Reset to A-Z order"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              A-Z
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetByCategory}
              title="Reset by category"
            >
              <FolderTree className="w-4 h-4 mr-2" />
              By Category
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={menuItems.map((item) => String(item.id))}
              strategy={verticalListSortingStrategy}
            >
              {menuItems.map((item, index) => (
                <SortableItem key={item.id} item={item} index={index} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Order'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
