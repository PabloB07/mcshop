'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Server, Package, Coins, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      
      // Verificar si es admin
      const isUserAdmin = user.user_metadata?.is_admin === true || 
                         user.user_metadata?.is_admin === 'true';
      
      if (!isUserAdmin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="mt-2 text-gray-600">Gestiona rangos, items, dinero, plugins y servidores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/ranks">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rangos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gestiona rangos de Minecraft y comandos de LuckPerms</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/items">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gestiona items del juego para vender</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/money">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Dinero
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gestiona dinero en juego (Vault, PlayerPoints, etc.)</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/servers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Servidores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Configura servidores de Minecraft y API keys</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/plugins">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Plugins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gestiona plugins y versiones</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Configuración general del sistema</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

