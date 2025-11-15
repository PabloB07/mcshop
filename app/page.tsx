import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { createServerClient } from '@/lib/supabase/server';
import { Product } from '@/types/database';

async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .limit(6)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data || [];
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">
          Bienvenido a MCShop
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          La mejor tienda de plugins para servidores de Minecraft
        </p>
        <Link href="/products">
          <Button size="lg">Explorar Productos</Button>
        </Link>
      </section>

      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Productos Destacados</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <p>No hay productos disponibles en este momento.</p>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">¿Por qué elegir MCShop?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          <div>
            <h3 className="font-semibold mb-2">Plugins de Calidad</h3>
            <p className="text-gray-600">
              Todos nuestros plugins son probados y optimizados
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Soporte Incluido</h3>
            <p className="text-gray-600">
              Recibe ayuda cuando la necesites
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Actualizaciones Gratuitas</h3>
            <p className="text-gray-600">
              Mantén tus plugins siempre actualizados
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

