# MCShop - Ecommerce de Plugins para Minecraft

Ecommerce moderno construido con Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, Supabase y Flow.cl API para vender plugins de servidores de Minecraft.

## 🚀 Características

- **Next.js 16** con App Router
- **React 19** con Server Components
- **TypeScript** para type safety
- **Tailwind CSS** para estilos
- **Framer Motion** para animaciones
- **Supabase** para base de datos y autenticación
- **Flow.cl API** integración completa para pagos
- **Zustand** para manejo de estado del carrito
- UI moderna y responsive

## 📋 Prerequisitos

- Node.js 18+ 
- Cuenta de Supabase
- Cuenta de Flow.cl con API Key y Secret Key

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone <tu-repo>
cd mcshop
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase

# Flow.cl API
FLOW_API_KEY=tu_api_key_de_flow
FLOW_SECRET_KEY=tu_secret_key_de_flow
FLOW_ENVIRONMENT=sandbox
# Opciones: sandbox o production

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Configura la base de datos en Supabase:

Ejecuta estos SQL en el SQL Editor de Supabase:

```sql
-- Tabla de productos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  version TEXT,
  compatible_versions TEXT[],
  download_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de órdenes
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending',
  flow_token TEXT,
  flow_order INTEGER,
  commerce_order TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items de orden
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para productos (público puede leer productos activos)
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (active = true);

-- Políticas para órdenes (usuarios solo ven sus propias órdenes)
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para order_items
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
mcshop/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   │   └── payment/       # Endpoints de Flow.cl
│   ├── auth/              # Páginas de autenticación
│   ├── checkout/          # Páginas de checkout
│   ├── dashboard/         # Dashboard del usuario
│   ├── products/          # Página de productos
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── components/            # Componentes React
│   ├── ui/                # Componentes UI base
│   ├── cart.tsx           # Componente del carrito
│   ├── navbar.tsx         # Barra de navegación
│   └── product-card.tsx   # Tarjeta de producto
├── lib/                   # Utilidades y configuraciones
│   ├── flow/              # Integración Flow.cl
│   │   ├── api.ts         # Cliente de Flow API
│   │   ├── types.ts       # Tipos de Flow
│   │   └── utils.ts       # Utilidades de Flow
│   ├── supabase/          # Cliente de Supabase
│   └── utils.ts           # Utilidades generales
├── store/                 # Estado global (Zustand)
│   └── cart-store.ts      # Store del carrito
└── types/                 # Tipos TypeScript
    └── database.ts        # Tipos de base de datos
```

## 🔑 Funcionalidades

### Autenticación
- Registro e inicio de sesión con Supabase Auth
- Protección de rutas
- Sesión persistente

### Productos
- Listado de productos
- Búsqueda y filtrado
- Detalles de productos
- Categorías

### Carrito de Compras
- Agregar/eliminar productos
- Actualizar cantidades
- Cálculo automático de totales
- Persistencia en estado global

### Checkout y Pagos
- Integración completa con Flow.cl
- Creación de órdenes de pago
- Webhook para confirmación de pagos
- Redirección a Flow para pago
- Página de éxito

### Dashboard
- Ver historial de pedidos
- Estado de pagos
- Información del usuario

## 🔌 API de Flow.cl

El proyecto incluye una integración completa con la API de Flow.cl:

- **Crear orden de pago**: `POST /api/payment/create`
- **Verificar estado**: `GET /api/payment/status`
- **Webhook de confirmación**: `POST /api/payment/webhook`

Todas las funciones de Flow.cl están implementadas en `lib/flow/api.ts`:
- Crear orden de pago
- Obtener estado de pago
- Crear reembolsos
- Obtener estado de reembolsos

## 🎨 Personalización

### Colores
Edita `tailwind.config.ts` para cambiar los colores del tema.

### Estilos
Los estilos globales están en `app/globals.css`.

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Agrega las variables de entorno en la configuración
3. Deploy automático

### Otros proveedores

Asegúrate de configurar las variables de entorno correctamente.

## 📄 Licencia

MIT

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## 📧 Soporte

Para soporte, abre un issue en el repositorio.

