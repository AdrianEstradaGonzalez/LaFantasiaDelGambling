# CustomAlert - Alertas Personalizadas

## 📱 Componente de Alertas Personalizado

Reemplazo para `Alert.alert()` de React Native con diseño personalizado de DreamLeague.

## 🎨 Características

- ✅ Fondo negro (`#181818ff`) matching con la app
- ✅ Header con "LIGA **DREAMLEAGUE**" (azul: `#0892D0`)
- ✅ Soporte para iconos de Vector Icons
- ✅ Botones personalizados (default, cancel, destructive)
- ✅ Animaciones suaves
- ✅ API similar a `Alert.alert()`

## 📦 Instalación

### 1. Envolver la app con el Provider

En `App.tsx`:

```tsx
import { CustomAlertProvider } from './components/CustomAlert';

function App() {
  return (
    <CustomAlertProvider>
      {/* Tu app aquí */}
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </CustomAlertProvider>
  );
}
```

## 🚀 Uso

### Importar

```tsx
import { CustomAlertManager } from '../components/CustomAlert';
```

### Ejemplos

#### 1. Alert Simple

```tsx
// ANTES (Alert nativo)
Alert.alert('Error', 'No se pudo cargar la clasificación');

// DESPUÉS (CustomAlert)
CustomAlertManager.alert('Error', 'No se pudo cargar la clasificación');
```

#### 2. Alert con Icono

```tsx
CustomAlertManager.alert(
  'Error',
  'No se pudo fichar al jugador',
  [{ text: 'OK', onPress: () => {}, style: 'default' }],
  { 
    icon: 'alert-circle', 
    iconColor: '#ef4444' 
  }
);
```

#### 3. Alert con Múltiples Botones

```tsx
// ANTES
Alert.alert(
  'Confirmar',
  '¿Estás seguro de que quieres vender este jugador?',
  [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Vender', style: 'destructive', onPress: () => handleSell() }
  ]
);

// DESPUÉS
CustomAlertManager.alert(
  'Confirmar',
  '¿Estás seguro de que quieres vender este jugador?',
  [
    { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
    { text: 'Vender', onPress: () => handleSell(), style: 'destructive' }
  ],
  { icon: 'alert', iconColor: '#f59e0b' }
);
```

#### 4. Alert de Éxito

```tsx
CustomAlertManager.alert(
  'Éxito',
  'Jugador fichado correctamente',
  [{ text: 'OK', onPress: () => {}, style: 'default' }],
  { 
    icon: 'check-circle', 
    iconColor: '#10b981' 
  }
);
```

#### 5. Alert de Información

```tsx
CustomAlertManager.alert(
  'Sin espacio',
  'No hay espacio disponible para porteros en tu plantilla.',
  [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
  { 
    icon: 'information', 
    iconColor: '#0892D0' 
  }
);
```

## 🎨 Iconos Disponibles

Los iconos están implementados con **SVG personalizados** desde `VectorIcons.tsx`:

| Icono | Nombre | Color Recomendado | Uso |
|-------|--------|-------------------|-----|
| ✅ | `'check-circle'` | `#10b981` (verde) | Éxito, confirmación |
| ❌ | `'alert-circle'` | `#ef4444` (rojo) | Error, fallo |
| ℹ️ | `'information'` | `#0892D0` (azul) | Información |
| ⚠️ | `'alert'` | `#f59e0b` (amarillo) | Advertencia |
| ❌ | `'error-circle'` | `#ef4444` (rojo) | Error crítico |

**Nota:** Los iconos ahora usan SVG personalizados en lugar de MaterialCommunityIcons.

## 🎨 Estilos de Botones

### `'default'`
- Fondo azul (`#0892D0`)
- Texto blanco
- Botón primario de acción

### `'cancel'`
- Fondo gris (`#334155`)
- Texto gris claro (`#cbd5e1`)
- Para cancelar acciones

### `'destructive'`
- Fondo rojo (`#ef4444`)
- Texto blanco
- Para acciones peligrosas (eliminar, vender, etc.)

## 📝 Reemplazos Comunes

### En PlayerDetail.tsx

```tsx
// ANTES
Alert.alert('Error', 'No se puede añadir más jugadores de esta posición');

// DESPUÉS
CustomAlertManager.alert(
  'Sin espacio',
  `No hay espacio disponible para ${role === 'POR' ? 'porteros' : role === 'DEF' ? 'defensas' : role === 'CEN' ? 'centrocampistas' : 'delanteros'} en tu plantilla.`,
  [{ text: 'OK', onPress: () => {}, style: 'default' }],
  { icon: 'alert-circle', iconColor: '#ef4444' }
);
```

### En SquadService

```tsx
// ANTES
Alert.alert('Error', message);

// DESPUÉS
CustomAlertManager.alert(
  'Error',
  message,
  [{ text: 'OK', onPress: () => {}, style: 'default' }],
  { icon: 'alert-circle', iconColor: '#ef4444' }
);
```

## 🔧 API Reference

### CustomAlertManager.alert()

```typescript
CustomAlertManager.alert(
  title: string,              // Título del alert
  message?: string,           // Mensaje (opcional)
  buttons?: Array<{          // Botones (opcional)
    text: string,
    onPress: () => void,
    style?: 'default' | 'cancel' | 'destructive'
  }>,
  options?: {                // Opciones (opcional)
    icon?: string,           // Nombre del icono de MaterialCommunityIcons
    iconColor?: string       // Color del icono (hex)
  }
)
```

## 🎯 Ventajas vs Alert Nativo

- ✅ Diseño consistente con la app
- ✅ Iconos visuales para mejor UX
- ✅ Botones más grandes y táctiles
- ✅ Colores personalizados por tipo de acción
- ✅ Header branded con "LIGA DREAMLEAGUE"
- ✅ Animaciones suaves
- ✅ Mayor flexibilidad de diseño
