# Fuente de Minecraft

Para usar la fuente de Minecraft en este proyecto, necesitas descargar los archivos de fuente desde:

**https://www.fontspace.com/minecraft-font-f28180**

## Instrucciones:

1. Descarga la fuente "Minecraft Font" desde FontSpace (es gratuita y de dominio público)
2. Extrae los archivos TTF de la fuente
3. Convierte los archivos TTF a WOFF2 para mejor rendimiento web usando:
   - [CloudConvert](https://cloudconvert.com/ttf-to-woff2)
   - O cualquier otro convertidor online

4. Coloca los siguientes archivos en esta carpeta (`public/fonts/`):
   - `Minecraft-Regular.woff2` (de Minecraft Regular.ttf)
   - `Minecraft-Bold.woff2` (de Minecraft Bold.ttf)
   - `Minecraft-Italic.woff2` (de Minecraft Italic.ttf)
   - `Minecraft-BoldItalic.woff2` (de Minecraft Bold Italic.ttf)

## Uso en el proyecto:

Una vez que los archivos estén en esta carpeta, la fuente estará disponible en todo el proyecto usando:

- Clase CSS: `font-minecraft`
- Variable CSS: `var(--font-minecraft)`
- En Tailwind: `font-minecraft`

Ejemplo:
```tsx
<h1 className="font-minecraft">MCShop</h1>
```

