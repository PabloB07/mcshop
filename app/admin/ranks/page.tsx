'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

interface Rank {
  id: string;
  product_id: string;
  luckperms_group: string;
  priority: number;
  prefix?: string;
  suffix?: string;
  weight?: number;
  display_name?: string;
  description?: string;
  permissions?: string[];
  product?: {
    id: string;
    name: string;
    price: number;
  };
}

export default function AdminRanksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    category: 'rank',
    luckperms_group: '',
    priority: '0',
    prefix: '',
    suffix: '',
    weight: '',
    display_name: '',
    rank_description: '',
    permissions: '',
  });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const isUserAdmin = user.user_metadata?.is_admin === true || 
                         user.user_metadata?.is_admin === 'true';
      
      if (!isUserAdmin) {
        router.push('/dashboard');
        return;
      }

      setUser(user);
      setIsAdmin(true);
      setLoading(false);
      loadRanks();
    };

    checkAdmin();
  }, [router]);

  const loadRanks = async () => {
    try {
      const response = await fetch('/api/admin/ranks');
      const data = await response.json();
      if (data.ranks) {
        setRanks(data.ranks);
      }
    } catch (error) {
      console.error('Error cargando rangos', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const permissionsArray = formData.permissions
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const response = await fetch('/api/admin/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          image_url: formData.image_url,
          category: 'rank',
          product_type: 'rank',
          luckperms_group: formData.luckperms_group,
          priority: parseInt(formData.priority),
          prefix: formData.prefix,
          suffix: formData.suffix,
          weight: formData.weight ? parseInt(formData.weight) : undefined,
          display_name: formData.display_name,
          description: formData.rank_description,
          rank_permissions: permissionsArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error desconocido'));
        return;
      }

      alert('Rango creado exitosamente');
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        price: '',
        image_url: '',
        category: 'rank',
        luckperms_group: '',
        priority: '0',
        prefix: '',
        suffix: '',
        weight: '',
        display_name: '',
        rank_description: '',
        permissions: '',
      });
      loadRanks();
    } catch (error) {
      console.error('Error creando rango', error);
      alert('Error al crear el rango');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Volver al panel
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Gestionar Rangos</h1>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Rango
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Crear Nuevo Rango</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Producto
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grupo LuckPerms
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.luckperms_group}
                      onChange={(e) => setFormData({ ...formData, luckperms_group: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="vip"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prefijo
                    </label>
                    <input
                      type="text"
                      value={formData.prefix}
                      onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="&7[&aVIP&7]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sufijo
                    </label>
                    <input
                      type="text"
                      value={formData.suffix}
                      onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (Weight)
                    </label>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre para Mostrar
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permisos (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={formData.permissions}
                    onChange={(e) => setFormData({ ...formData, permissions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="minecraft.command.gamemode, minecraft.command.fly"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Imagen
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Crear Rango</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ranks.map((rank) => (
            <Card key={rank.id}>
              <CardHeader>
                <CardTitle>{rank.product?.name || rank.display_name || rank.luckperms_group}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Grupo:</strong> {rank.luckperms_group}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Prioridad:</strong> {rank.priority}
                  </p>
                  {rank.product && (
                    <p className="text-sm text-gray-600">
                      <strong>Precio:</strong> ${rank.product.price}
                    </p>
                  )}
                  {rank.prefix && (
                    <p className="text-sm text-gray-600">
                      <strong>Prefijo:</strong> {rank.prefix}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

