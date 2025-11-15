'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';
import { Cart } from '@/components/cart';
import { ShoppingCart, User, LogOut, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getMinecraftAvatarUrl } from '@/lib/minecraft/api';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [minecraftAvatar, setMinecraftAvatar] = useState<string | null>(null);
  const itemCount = useCartStore((state) => state.getItemCount());
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Obtener avatar de Minecraft si existe
      if (user?.user_metadata?.minecraft_uuid) {
        const avatar = getMinecraftAvatarUrl(user.user_metadata.minecraft_uuid, 32);
        setMinecraftAvatar(avatar);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Actualizar avatar cuando cambia la sesión
      if (session?.user?.user_metadata?.minecraft_uuid) {
        const avatar = getMinecraftAvatarUrl(session.user.user_metadata.minecraft_uuid, 32);
        setMinecraftAvatar(avatar);
      } else {
        setMinecraftAvatar(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <nav className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image 
                src="/logo-shopmc.png" 
                alt="ShopMC" 
                width={150}
                height={60}
                className="h-12 w-auto"
                priority
              />
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/products">
                <Button variant="ghost">Productos</Button>
              </Link>
              
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 hover:bg-gray-100 rounded-lg"
              >
                <ShoppingCart className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      {minecraftAvatar ? (
                        <img
                          src={minecraftAvatar}
                          alt="Avatar"
                          className="w-6 h-6 rounded"
                        />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      {user.user_metadata?.minecraft_username || 'Mi Cuenta'}
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Salir
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">
                      <LogIn className="w-4 h-4 mr-2" />
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm">
                      Registrarse
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <Cart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

