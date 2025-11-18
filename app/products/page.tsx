'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/product-card';
import { supabase } from '@/lib/supabase/client';
import { Product, ProductType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Shield, Package, Coins, Code, X } from 'lucide-react';

async function getProducts(type?: ProductType): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*')
    .eq('active', true);

  if (type) {
    query = query.eq('product_type', type);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data || [];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ProductType | undefined>(undefined);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const data = await getProducts(selectedType);
      setProducts(data);
      setLoading(false);
    };
    loadProducts();
  }, [selectedType]);

  const filterButtons = [
    { type: undefined as ProductType | undefined, label: 'Todos', icon: Package },
    { type: 'rank' as ProductType, label: 'Rangos', icon: Shield },
    { type: 'item' as ProductType, label: 'Items', icon: Package },
    { type: 'money' as ProductType, label: 'Dinero', icon: Coins },
    { type: 'plugin' as ProductType, label: 'Plugins', icon: Code },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Todos los Productos</h1>
      
      {/* Filtros */}
      <div className="mb-8 flex flex-wrap gap-2">
        {filterButtons.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.label}
              variant={selectedType === filter.type ? 'default' : 'outline'}
              onClick={() => setSelectedType(filter.type)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {filter.label}
            </Button>
          );
        })}
        {selectedType && (
          <Button
            variant="ghost"
            onClick={() => setSelectedType(undefined)}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando productos...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          <p>No hay productos disponibles{selectedType ? ` de tipo ${selectedType}` : ''} en este momento.</p>
        </div>
      )}
    </div>
  );
}

