'use client';

import { motion } from 'framer-motion';
import { Product, ProductType } from '@/types/database';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { ShoppingCart, Shield, Package, Coins, Code } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const getProductTypeInfo = (type?: ProductType) => {
  switch (type) {
    case 'rank':
      return {
        label: 'Rango',
        icon: Shield,
        color: 'bg-purple-100 text-purple-700',
        iconColor: 'text-purple-600',
      };
    case 'item':
      return {
        label: 'Item',
        icon: Package,
        color: 'bg-blue-100 text-blue-700',
        iconColor: 'text-blue-600',
      };
    case 'money':
      return {
        label: 'Dinero',
        icon: Coins,
        color: 'bg-yellow-100 text-yellow-700',
        iconColor: 'text-yellow-600',
      };
    case 'plugin':
    default:
      return {
        label: 'Plugin',
        icon: Code,
        color: 'bg-green-100 text-green-700',
        iconColor: 'text-green-600',
      };
  }
};

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const typeInfo = getProductTypeInfo(product.product_type);
  const TypeIcon = typeInfo.icon;

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
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${typeInfo.color}`}>
                <TypeIcon className={`w-3 h-3 ${typeInfo.iconColor}`} />
                {typeInfo.label}
              </span>
            </div>
          </div>
        )}
        {!product.image_url && (
          <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <TypeIcon className={`w-16 h-16 ${typeInfo.iconColor} opacity-50`} />
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${typeInfo.color}`}>
                <TypeIcon className={`w-3 h-3 ${typeInfo.iconColor}`} />
                {typeInfo.label}
              </span>
            </div>
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
            <div className="flex flex-wrap gap-2">
              {product.category && (
                <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded">
                  {product.category}
                </span>
              )}
              {product.product_type && product.product_type !== 'plugin' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${typeInfo.color}`}>
                  <TypeIcon className={`w-3 h-3 ${typeInfo.iconColor}`} />
                  {typeInfo.label}
                </span>
              )}
            </div>
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

