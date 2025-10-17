# 📋 Instrucciones: Agregar Menú Drawer a Todas las Pantallas

## ✅ Ya Implementado:
- ✅ Home.tsx
- ✅ Clasificacion.tsx (Liga)

## 🔧 Pendiente de Implementar:

### Pantallas que Necesitan el Drawer:

1. **Equipo / MiPlantilla** (`frontend/pages/plantilla/MiPlantilla.tsx`)
2. **Mercado / PlayersMarket** (`frontend/pages/players/PlayersMarket.tsx`)
3. **Apuestas** (`frontend/pages/apuestas/Apuestas.tsx`)

---

## 📝 Pasos para Agregar el Drawer (Mismo Para Todas):

### 1. Importaciones
Agregar al inicio del archivo:
```typescript
import { Modal, Animated } from 'react-native';
import { DrawerMenu } from '../../components/DrawerMenu';
```

Agregar `useRef` si no está:
```typescript
import React, { useEffect, useState, useRef } from 'react';
```

### 2. Estados
Agregar después de los otros useState:
```typescript
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const slideAnim = useRef(new Animated.Value(-300)).current;
```

### 3. Efecto para Animar
Agregar después de los otros useEffect:
```typescript
// Animar drawer
useEffect(() => {
  if (isDrawerOpen) {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  } else {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }
}, [isDrawerOpen, slideAnim]);
```

### 4. Agregar onMenuPress al NavBar

**Si usa LigaTopNavBar:**
```tsx
<LigaTopNavBar
  nombreLiga={ligaNombre}
  onInvitePress={...}
  onMenuPress={() => setIsDrawerOpen(true)}  // ← AGREGAR ESTA LÍNEA
/>
```

**Si tiene Header Custom:**
Buscar el TouchableOpacity del menú (las 3 rayas) y cambiar:
```tsx
<TouchableOpacity
  onPress={() => setIsDrawerOpen(true)}  // ← CAMBIAR ESTO
  ...
>
  <MenuIcon size={24} color="#ffffff" />
</TouchableOpacity>
```

### 5. Agregar Modal del Drawer al Final

Justo **ANTES del cierre del LinearGradient** y **DENTRO del fragmento <>**:

```tsx
          {/* Drawer Modal */}
          <Modal
            visible={isDrawerOpen}
            animationType="none"
            transparent={true}
            onRequestClose={() => setIsDrawerOpen(false)}
          >
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <Animated.View 
                style={{ 
                  width: '75%', 
                  maxWidth: 300,
                  transform: [{ translateX: slideAnim }]
                }}
              >
                <DrawerMenu 
                  navigation={{
                    ...navigation,
                    closeDrawer: () => setIsDrawerOpen(false),
                    reset: (state: any) => {
                      navigation.reset(state);
                      setIsDrawerOpen(false);
                    },
                  }} 
                />
              </Animated.View>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                activeOpacity={1}
                onPress={() => setIsDrawerOpen(false)}
              />
            </View>
          </Modal>
        </LinearGradient>  {/* ← Aquí termina LinearGradient */}
      )}
    </>
  );
};
```

---

## ⚠️ Notas Importantes:

1. **No duplicar** el Modal si ya existe un setIsDrawerOpen
2. **Verificar** que el componente tenga `navigation` en las props o use `useNavigation()`
3. **Probar** que el drawer se abra y cierre correctamente
4. **Asegurarse** de que el drawer esté DENTRO del LinearGradient pero FUERA del ScrollView principal

---

## 🎯 Resultado Esperado:

- ✅ Botón de menú (3 rayas) visible en esquina superior izquierda de cada pantalla
- ✅ Al tocar el botón, el drawer se desliza desde la izquierda
- ✅ El drawer muestra: Inicio, Panel Admin (si es admin), Reglas, Cerrar Sesión
- ✅ Al tocar fuera del drawer, se cierra con animación
- ✅ Al seleccionar una opción, el drawer se cierra y navega

---

## 📱 Pantallas Específicas:

### MiPlantilla.tsx
- Ya tiene un header custom
- Buscar donde está el botón de volver
- Agregar MenuIcon en la esquina opuesta

### PlayersMarket.tsx  
- Usa LigaTopNavBar
- Agregar `onMenuPress` al componente

### Apuestas.tsx
- Ya tiene código para `setIsDrawerOpen` pero no está funcionando
- Verificar y completar la implementación según los pasos arriba
