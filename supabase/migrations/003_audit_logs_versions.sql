-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de versiones de plugins
CREATE TABLE IF NOT EXISTS plugin_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  version TEXT NOT NULL,
  jar_file_path TEXT NOT NULL,
  jar_file_size BIGINT,
  changelog TEXT,
  is_active BOOLEAN DEFAULT false,
  release_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, version)
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Índices para plugin_versions
CREATE INDEX IF NOT EXISTS idx_plugin_versions_product_id ON plugin_versions(product_id);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_is_active ON plugin_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_version ON plugin_versions(version);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_versions ENABLE ROW LEVEL SECURITY;

-- Políticas para audit_logs (solo lectura para admins)
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (raw_user_meta_data->>'is_admin')::boolean = true
    )
  );

-- Políticas para plugin_versions (público puede leer versiones activas)
DROP POLICY IF EXISTS "Public can view active plugin versions" ON plugin_versions;
CREATE POLICY "Public can view active plugin versions" ON plugin_versions
  FOR SELECT USING (is_active = true);

-- Función para obtener la versión activa de un plugin
CREATE OR REPLACE FUNCTION get_active_plugin_version(product_uuid UUID)
RETURNS TABLE (
  id UUID,
  version TEXT,
  jar_file_path TEXT,
  jar_file_size BIGINT,
  changelog TEXT,
  release_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.version,
    pv.jar_file_path,
    pv.jar_file_size,
    pv.changelog,
    pv.release_date
  FROM plugin_versions pv
  WHERE pv.product_id = product_uuid
    AND pv.is_active = true
  ORDER BY pv.release_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para desactivar versiones anteriores al activar una nueva
CREATE OR REPLACE FUNCTION deactivate_old_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se está activando una nueva versión, desactivar las demás
  IF NEW.is_active = true THEN
    UPDATE plugin_versions
    SET is_active = false
    WHERE product_id = NEW.product_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para desactivar versiones anteriores
DROP TRIGGER IF EXISTS trigger_deactivate_old_versions ON plugin_versions;
CREATE TRIGGER trigger_deactivate_old_versions
  BEFORE INSERT OR UPDATE ON plugin_versions
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_versions();

