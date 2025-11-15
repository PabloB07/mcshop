-- Datos de ejemplo para productos
-- Ejecuta este script después de crear las tablas para tener datos de prueba

INSERT INTO products (name, description, price, category, version, compatible_versions, image_url, active) VALUES
('Economy Plugin', 'Sistema completo de economía para tu servidor. Permite crear tiendas, bancos y transacciones entre jugadores.', 9990, 'Economía', '2.5.1', ARRAY['1.19', '1.20', '1.21'], 'https://via.placeholder.com/400x300?text=Economy+Plugin', true),
('PvP Arena', 'Crea arenas PvP personalizables con kits, recompensas y estadísticas detalladas.', 14990, 'PvP', '1.8.3', ARRAY['1.19', '1.20', '1.21'], 'https://via.placeholder.com/400x300?text=PvP+Arena', true),
('Land Protection', 'Sistema de protección de terrenos con permisos granulares y soporte para múltiples mundos.', 12990, 'Protección', '3.2.0', ARRAY['1.19', '1.20', '1.21'], 'https://via.placeholder.com/400x300?text=Land+Protection', true),
('Custom Enchants', 'Añade encantamientos personalizados con efectos únicos y configurables.', 7990, 'Gameplay', '1.5.2', ARRAY['1.20', '1.21'], 'https://via.placeholder.com/400x300?text=Custom+Enchants', true),
('Quest System', 'Sistema de misiones completo con recompensas, progreso y múltiples tipos de objetivos.', 17990, 'Gameplay', '2.1.0', ARRAY['1.19', '1.20', '1.21'], 'https://via.placeholder.com/400x300?text=Quest+System', true),
('Shop GUI', 'Tienda con interfaz gráfica intuitiva, categorías y sistema de descuentos.', 11990, 'Economía', '1.3.4', ARRAY['1.19', '1.20', '1.21'], 'https://via.placeholder.com/400x300?text=Shop+GUI', true);

