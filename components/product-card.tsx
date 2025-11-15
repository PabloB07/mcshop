'use client';

import { motion } from 'framer-motion';
import { Product } from '@/types/database';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="h-full flex flex-col overflow-hidden">
        {product.image_url && (
          <div className="relative w-full h-48 bg-gray-100">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl">{product.name}</CardTitle>
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.description}
          </p>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-2">
            {product.version && (
              <p className="text-xs text-gray-500">
                Versión: {product.version}
              </p>
            )}
            {product.category && (
              <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                {product.category}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <span className="text-2xl font-bold text-primary-600">
            {formatPrice(product.price)}
          </span>
          <Button
            onClick={() => addItem(product)}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Agregar
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

