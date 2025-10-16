# Implementación de Menú Lateral (Drawer) 🎨

## Cambios Realizados

### 1. **Nuevo Componente: DrawerMenu** (`frontend/components/DrawerMenu.tsx`)
- Menú lateral deslizable con diseño moderno
- Muestra información del usuario (avatar, nombre, email)
- **Opciones del menú:**
  - 🏠 **Inicio** - Navega a Home
  - 🛡️ **Panel Admin** - Solo visible para administradores (con badge ADMIN)
  - 📄 **Reglas del Juego** - Próximamente (muestra alert temporal)
  - 🚪 **Cerrar Sesión** - Con confirmación antes de salir

### 2. **Nuevos Íconos** (`frontend/components/VectorIcons.tsx`)
- ✅ `FileTextIcon` - Ícono de documento para "Reglas"
- ✅ `MenuIcon` - Ícono de hamburguesa (3 rayas) para abrir el drawer

### 3. **Home Actualizado** (`frontend/pages/home/Home.tsx`)
- ❌ **Eliminado**: `BottomNavBar` (barra de navegación inferior)
- ✅ **Agregado**: Botón de menú hamburguesa en la esquina superior izquierda
  - Posición fija con fondo semitransparente
  - Abre el drawer al hacer clic
- Reducido `paddingBottom` de 200 a 100 (ya no hay barra inferior)

### 4. **AppNavigator Actualizado** (`frontend/router/AppNavigator.tsx`)
- Implementado sistema de drawer usando **Modal de React Native**
  - No requiere instalar dependencias adicionales
  - Animación de slide desde la izquierda
  - Overlay oscuro para cerrar al tocar fuera
- Drawer ocupa 75% del ancho (máximo 300px)
- Integrado con el navigation stack existente

## Características del Menú Lateral

### Diseño Visual
- **Gradiente oscuro** de fondo (#0f172a → #1e293b)
- **Avatar circular** con inicial del usuario
- **Secciones separadas** por divisores
- **Badges** para opciones especiales (ej: ADMIN)
- **Footer** con nombre de la app y versión

### Funcionalidad
- **Detección automática** de usuario admin
- **Confirmación** antes de cerrar sesión
- **Cierre automático** al navegar a otra pantalla
- **Overlay táctil** para cerrar tocando fuera del menú

### Seguridad
- La opción "Panel Admin" solo se muestra si `isAdmin: true`
- Al cerrar sesión se limpia EncryptedStorage y redirige a Login

## Flujo de Usuario

1. Usuario abre la app → ve Home con botón de menú (☰) arriba a la izquierda
2. Toca el botón → se abre el drawer desde la izquierda
3. Ve su nombre, email y opciones del menú
4. Selecciona una opción:
   - **Inicio**: Cierra drawer y navega a Home
   - **Panel Admin**: Cierra drawer y abre AdminPanel (solo admins)
   - **Reglas**: Muestra alerta "Próximamente"
   - **Cerrar Sesión**: Pide confirmación → limpia sesión → Login
5. Puede cerrar el drawer tocando fuera del menú

## Próximos Pasos

### Pendiente de Implementación
- [ ] Crear pantalla "Reglas del Juego" con contenido
- [ ] Agregar más opciones al menú según necesidades:
  - Perfil de usuario
  - Configuración
  - Ayuda/Soporte
  - Acerca de

### Mejoras Opcionales
- [ ] Animación de avatar al abrir drawer
- [ ] Indicador de notificaciones
- [ ] Modo oscuro/claro toggle
- [ ] Estadísticas rápidas del usuario

## Notas Técnicas

- **No requiere `@react-navigation/drawer`** - Implementado con Modal nativo
- Compatible con la arquitectura existente
- Mantiene navegación por Stack para las pantallas principales
- El drawer es un overlay que no afecta la estructura de navegación

## Testing Recomendado

1. ✅ Verificar que el botón de menú aparece en Home
2. ✅ Probar apertura/cierre del drawer
3. ✅ Verificar navegación desde cada opción del menú
4. ✅ Confirmar que "Panel Admin" solo aparece para admins
5. ✅ Probar flujo completo de cerrar sesión
6. ✅ Verificar overlay y cierre al tocar fuera
