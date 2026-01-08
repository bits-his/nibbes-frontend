import { memo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OptimizedImage } from '@/components/OptimizedImage';
import type { MenuItem } from '@shared/schema';

interface MenuItemCardProps {
  item: MenuItem;
  isInCart: boolean;
  cartQuantity?: number;
  isOutOfStock: boolean;
  canAddMore: boolean;
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
}

/**
 * Memoized MenuItem Card Component
 * Prevents unnecessary re-renders when other items change
 */
export const MenuItemCard = memo<MenuItemCardProps>(
  ({
    item,
    isInCart,
    cartQuantity = 0,
    isOutOfStock,
    canAddMore,
    onAddToCart,
    onUpdateQuantity,
  }) => {
    return (
      <Card
        className={`overflow-hidden hover-elevate transition-all ${
          isInCart ? 'ring-2 ring-primary' : ''
        }`}
        data-testid={`card-menu-item-${item.id}`}
      >
        <div className="aspect-square overflow-hidden relative">
          <OptimizedImage
            src={item.imageUrl || ''}
            alt={item.name}
            aspectRatio="square"
            width={400}
            height={400}
            priority={false} // Lazy load menu items
            className={isOutOfStock ? 'opacity-60' : ''}
          />
          
          {/* SOLD OUT Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-primary/90 flex items-center justify-center">
              <Badge
                variant="default"
                className="text-sm sm:text-base font-bold bg-primary text-white px-4 py-2 shadow-lg"
              >
                SOLD OUT
              </Badge>
            </div>
          )}
          
          {/* Low Stock Badge */}
          {!isOutOfStock &&
            item.stockBalance !== null &&
            item.stockBalance !== undefined &&
            item.stockBalance > 0 &&
            item.stockBalance <= 3 && (
              <div className="absolute top-2 left-2 bg-orange-500 text-white rounded-md px-2 py-1 text-xs font-semibold shadow-md z-10">
                Only {item.stockBalance} left!
              </div>
            )}
          
          {/* Cart Quantity Badge */}
          {isInCart && !isOutOfStock && (
            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-semibold z-10">
              {cartQuantity}
            </div>
          )}
        </div>
        
        <CardContent className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
          <div>
            <h3 className="text-sm font-semibold mb-0.5 sm:mb-1">{item.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {item.description}
            </p>
          </div>
          
          {/* Stock Balance Info */}
          {item.stockBalance !== null &&
            item.stockBalance !== undefined &&
            item.stockBalance > 0 &&
            item.stockBalance <= 5 && (
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={`font-medium ${
                    item.stockBalance <= 2 ? 'text-red-600' : 'text-orange-600'
                  }`}
                >
                  ⚡ Only {item.stockBalance} portion
                  {item.stockBalance !== 1 ? 's' : ''} left
                </span>
              </div>
            )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">
              ₦{parseFloat(item.price).toLocaleString()}
            </span>
            {isInCart ? (
              <div className="flex items-center gap-1 border rounded-lg">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => item.id && onUpdateQuantity(String(item.id), -1)}
                  data-testid={`button-minus-${item.id}`}
                  className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-xs"
                >
                  <Minus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                </Button>
                <span className="font-semibold min-w-[14px] sm:min-w-[16px] text-center text-xs">
                  {cartQuantity}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => item.id && onUpdateQuantity(String(item.id), 1)}
                  disabled={isOutOfStock || !canAddMore}
                  data-testid={`button-plus-${item.id}`}
                  className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-xs"
                  title={!canAddMore ? `Maximum ${item.stockBalance} portions available` : ''}
                >
                  <Plus className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => onAddToCart(item)}
                disabled={isOutOfStock}
                data-testid={`button-add-${item.id}`}
                className="text-xs px-2 py-1.5"
              >
                <Plus className="w-2.5 h-2.5 mr-1" />
                {!isOutOfStock ? 'Add' : 'SOLD OUT'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.imageUrl === nextProps.item.imageUrl &&
      prevProps.item.price === nextProps.item.price &&
      prevProps.item.available === nextProps.item.available &&
      prevProps.item.stockBalance === nextProps.item.stockBalance &&
      prevProps.isInCart === nextProps.isInCart &&
      prevProps.cartQuantity === nextProps.cartQuantity &&
      prevProps.isOutOfStock === nextProps.isOutOfStock &&
      prevProps.canAddMore === nextProps.canAddMore
    );
  }
);

MenuItemCard.displayName = 'MenuItemCard';

