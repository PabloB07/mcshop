-- Actualizar tabla products para plugins
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS jar_file_path TEXT,
ADD COLUMN IF NOT EXISTS jar_file_size BIGINT,
ADD COLUMN IF NOT EXISTS plugin_version TEXT,
ADD COLUMN IF NOT EXISTS minecraft_versions TEXT[],
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS changelog TEXT;

-- Tabla de licencias
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  license_key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos de usuario (relación usuario-producto comprado)
CREATE TABLE IF NOT EXISTS user_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Tabla de descargas (URLs de un solo uso)
CREATE TABLE IF NOT EXISTS product_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  download_token TEXT UNIQUE NOT NULL,
  download_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product_id ON user_products(product_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_user_id ON product_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_product_id ON product_downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_product_downloads_token ON product_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_product_downloads_used ON product_downloads(used);

-- Habilitar RLS
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_downloads ENABLE ROW LEVEL SECURITY;

-- Políticas para licenses
DROP POLICY IF EXISTS "Users can view own licenses" ON licenses;
CREATE POLICY "Users can view own licenses" ON licenses
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas para user_products
DROP POLICY IF EXISTS "Users can view own products" ON user_products;
CREATE POLICY "Users can view own products" ON user_products
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas para product_downloads
DROP POLICY IF EXISTS "Users can view own downloads" ON product_downloads;
CREATE POLICY "Users can view own downloads" ON product_downloads
  FOR SELECT USING (auth.uid() = user_id);

-- Función para generar license_key
CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    IF i = 8 OR i = 16 OR i = 24 THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en licenses
DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;
CREATE TRIGGER update_licenses_updated_at
    BEFORE UPDATE ON licenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

