import { memo, useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShopProduct } from '@/routes/_vendor/vendor/menu'

interface ProductCardProps {
  product: ShopProduct
  onEdit: (product: ShopProduct) => void
  onDelete: (id: string) => void
  onToggleAvailability: (product: ShopProduct) => void
  isToggling?: boolean
  isDeleting?: boolean
}

const ProductCard = memo(function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleAvailability,
  isToggling = false,
  isDeleting = false,
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <Card>
      <CardContent className='space-y-3 p-4'>
        {product.imageUrl && !imageError && (
          <div className='relative h-40 w-full overflow-hidden rounded-lg bg-gray-100'>
            {!imageLoaded && (
              <Skeleton className='absolute inset-0 h-full w-full' />
            )}
            <img
              src={product.imageUrl}
              alt={product.name}
              loading='lazy'
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </div>
        )}
        <div className='flex items-start justify-between gap-4'>
          <div className='flex-1 space-y-1'>
            <h3 className='font-semibold'>{product.name}</h3>
            {product.description && (
              <p className='text-muted-foreground line-clamp-2 text-sm'>
                {product.description}
              </p>
            )}
            <div className='flex items-center gap-2 text-sm font-semibold'>
              <span>D{product.price.toFixed(2)}</span>
              {product.discountedPrice && (
                <span className='text-muted-foreground text-xs line-through'>
                  D{product.discountedPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className='text-muted-foreground text-xs'>
              Stock: {product.stock ?? 0}
            </p>
          </div>
          <Switch
            checked={product.isAvailable}
            onCheckedChange={() => onToggleAvailability(product)}
            disabled={isToggling}
          />
        </div>
        <div className='flex gap-2 pt-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onEdit(product)}
            className='flex-1'
          >
            <Edit className='mr-2 h-4 w-4' />
            Edit
          </Button>
          <Button
            variant='destructive'
            size='sm'
            onClick={() => onDelete(product.id)}
            disabled={isDeleting}
            className='flex-1'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

export default ProductCard
