# Análisis Completo: AdminPanel.tsx

## 📊 Información General

**Archivo:** `frontend/pages/admin/AdminPanel.tsx`
**Líneas:** 638 líneas totales
**Propósito:** Panel de administración para gestionar el sistema DreamLeague
**Última revisión:** 20 de octubre de 2025

---

## 🏗️ Estructura del Componente

### Imports y Dependencias

```typescript
// React & React Native
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

// UI Components
import LinearGradient from 'react-native-linear-gradient';
import { CustomAlertManager } from '../../components/CustomAlert';
import { VectorIcons } from '../../components/VectorIcons';

// Services
import { JornadaService } from '../../services/JornadaService';
import { LigaService } from '../../services/LigaService';
import EncryptedStorage from 'react-native-encrypted-storage';

// Navigation
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
```

### Estados del Componente

```typescript
const [isClosingJornada, setIsClosingJornada] = useState(false);    // Loading para "Cerrar Cambios"
const [isOpeningJornada, setIsOpeningJornada] = useState(false);    // Loading para "Abrir Cambios"
const [jornadaStatus, setJornadaStatus] = useState<'open' | 'closed' | null>(null);  // Estado actual
const [currentJornada, setCurrentJornada] = useState<number | null>(null);  // Número de jornada
const [isLoadingStatus, setIsLoadingStatus] = useState(true);       // Loading inicial
```

---

## 🔄 Ciclo de Vida y Carga Inicial

### useEffect - Cargar Estado de Jornada (líneas 44-92)

```typescript
useEffect(() => {
  const loadJornadaStatus = async () => {
    try {
      setIsLoadingStatus(true);
      
      // 1. Obtener userId desde EncryptedStorage
      const userId = await EncryptedStorage.getItem('userId');
      if (!userId) return;
      
      // 2. Obtener ligas del usuario
      const ligas = await LigaService.obtenerLigasPorUsuario(userId);
      
      // 3. Consultar estado de la primera liga
      if (ligas.length > 0) {
        const primeraLiga = ligas[0];
        const status = await JornadaService.getJornadaStatus(primeraLiga.id);
        
        setJornadaStatus(status.status as 'open' | 'closed');
        setCurrentJornada(status.currentJornada);
      } else {
        // Default a 'open' si no hay ligas
        setJornadaStatus('open');
        setCurrentJornada(null);
      }
    } catch (error) {
      console.error('❌ Error cargando estado:', error);
      setJornadaStatus(null);
      setCurrentJornada(null);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  loadJornadaStatus();
}, []);
```

**Flujo:**
1. ✅ Obtiene userId del storage encriptado
2. ✅ Busca ligas del usuario administrador
3. ✅ Consulta el estado de la primera liga (asume sincronización global)
4. ✅ Actualiza estados locales: `jornadaStatus` y `currentJornada`

---

## 🎯 Funciones Principales

### 1. handleCerrarJornada (líneas 94-161)

**Propósito:** Bloquear cambios para todas las ligas (inicio de jornada)

**Flujo de Ejecución:**

```
Usuario presiona botón
       ↓
CustomAlert de confirmación
       ↓
Usuario confirma "Cerrar"
       ↓
setIsClosingJornada(true)
       ↓
JornadaService.openAllJornadas()  ← Backend API
       ↓
setJornadaStatus('closed')
       ↓
CustomAlert de éxito
       ↓
setIsClosingJornada(false)
```

**Alert de Confirmación:**
```typescript
CustomAlertManager.alert(
  '🔒 Cerrar Cambios',
  `¿Estás seguro de que quieres bloquear los cambios para TODAS las ligas?

  Esto hará lo siguiente:
  🔒 BLOQUEO:
  • Bloqueará modificaciones de plantillas
  • Bloqueará fichajes y ventas
  • Bloqueará nuevas apuestas

  📊 INICIO DE JORNADA:
  • Comenzará el seguimiento en tiempo real
  • Los puntos se actualizarán automáticamente

  ⚠️ Los usuarios NO podrán hacer cambios hasta que cierres la jornada.`,
  [...]
);
```

**Llamada Backend:**
```typescript
const result = await JornadaService.openAllJornadas();
// Resultado esperado:
// { leaguesProcessed: 5 }
```

**Alert de Éxito:**
```typescript
CustomAlertManager.alert(
  '✅ Cambios Bloqueados',
  `Las plantillas y apuestas han sido bloqueadas.

  📊 RESUMEN:
  • Ligas bloqueadas: ${result.leaguesProcessed}

  🔒 BLOQUEADO:
  • Modificar plantillas
  • Hacer fichajes y ventas
  • Realizar apuestas

  📊 La jornada está en curso. Los puntos se actualizarán en tiempo real.`,
  [{ text: 'OK', onPress: () => {}, style: 'default' }],
  { icon: 'lock-closed', iconColor: '#ef4444' }
);
```

**Estado después:**
- `jornadaStatus = 'closed'`
- Botón "Cerrar Cambios" se deshabilita
- Botón "Abrir Cambios" se habilita

---

### 2. handleAbrirJornada (líneas 163-224)

**Propósito:** Cerrar jornada actual, evaluar y abrir nueva jornada

**Flujo de Ejecución:**

```
Usuario presiona botón
       ↓
CustomAlert de confirmación
       ↓
Usuario confirma "Abrir Cambios"
       ↓
setIsOpeningJornada(true)
       ↓
JornadaService.closeAllJornadas()  ← Backend API (proceso complejo)
       ↓
setJornadaStatus('open')
       ↓
CustomAlert de éxito con resumen
       ↓
setIsOpeningJornada(false)
```

**Alert de Confirmación:**
```typescript
CustomAlertManager.alert(
  '🔓 Abrir Cambios',
  `¿Estás seguro de que quieres abrir los cambios para TODAS las ligas?

  Esto ejecutará el siguiente proceso:

  📊 EVALUACIÓN Y CÁLCULOS:
  • Evaluará todas las apuestas con resultados reales
  • Calculará puntos de plantillas
  • Actualizará presupuestos (500M base + puntos + apuestas)
  • Actualizará clasificación total

  🗑️ LIMPIEZA:
  • Vaciará todas las plantillas
  • Eliminará opciones de apuestas antiguas

  ⏭️ AVANCE:
  • Incrementará jornada en +1
  • Desbloqueará modificaciones para nueva jornada

  ⚠️ Este proceso puede tardar varios minutos.`,
  [...]
);
```

**Llamada Backend:**
```typescript
const result = await JornadaService.closeAllJornadas();
// Resultado esperado:
// {
//   leaguesProcessed: 5,
//   totalEvaluations: 150,
//   totalUpdatedMembers: 25,
//   totalClearedSquads: 25
// }
```

**Alert de Éxito:**
```typescript
CustomAlertManager.alert(
  '✅ Cambios Abiertos',
  `El proceso ha finalizado correctamente.

  📊 RESUMEN GLOBAL:
  • Ligas procesadas: ${result.leaguesProcessed}
  • Apuestas evaluadas: ${result.totalEvaluations}
  • Miembros actualizados: ${result.totalUpdatedMembers}
  • Plantillas vaciadas: ${result.totalClearedSquads}

  ✅ PERMITIDO:
  • Modificar plantillas
  • Hacer fichajes y ventas
  • Realizar apuestas

  🎮 Los usuarios ya pueden prepararse para la próxima jornada.`,
  [{ text: 'OK', onPress: () => {}, style: 'default' }],
  { icon: 'check-circle', iconColor: '#10b981' }
);
```

**Estado después:**
- `jornadaStatus = 'open'`
- Botón "Abrir Cambios" se deshabilita
- Botón "Cerrar Cambios" se habilita
- `currentJornada` incrementa en +1 (manejado por backend)

---

## 🎨 Estructura Visual del Panel

### TopNavBar (líneas 226-281)

```
┌─────────────────────────────────────────────┐
│  ←    GESTIÓN DREAMLEAGUE           □       │
└─────────────────────────────────────────────┘
```

**Elementos:**
- Botón Volver (ChevronLeft) - izquierda
- Título "GESTIÓN DREAMLEAGUE" - centro
- Espacio vacío - derecha (balance visual)

**Estilos:**
- Fondo: `#181818`
- Posición: Absolute top
- PaddingTop: 50 (safe area)
- Borde inferior: `#333`

---

### Sección de Navegación (líneas 283-402)

#### 1. Card: Gestión de Usuarios

```
┌─────────────────────────────────────────────┐
│  👥  Gestión de Usuarios               →    │
│      Ver y eliminar usuarios del sistema.   │
└─────────────────────────────────────────────┘
```

**Navegación:** `navigation.navigate('GestionUsuarios')`
**Icono:** `UsersIcon` (#0892D0)

#### 2. Card: Gestión de Ligas

```
┌─────────────────────────────────────────────┐
│  🏆  Gestión de Ligas                  →    │
│      Ver y eliminar ligas del sistema.      │
└─────────────────────────────────────────────┘
```

**Navegación:** `navigation.navigate('GestionLigas')`
**Icono:** `TrophyIcon` (#0892D0)

#### 3. Card: Gestión de Jugadores

```
┌─────────────────────────────────────────────┐
│  👕  Gestión de Jugadores              →    │
│      Edita precios y posiciones de todos    │
│      los jugadores de La Liga.              │
└─────────────────────────────────────────────┘
```

**Navegación:** `navigation.navigate('GestionJugadores')`
**Icono:** `JerseyIcon` (#0892D0)

---

### Sección de Gestión de Jornada (líneas 404-606)

#### 1. Card: Cerrar Cambios (Bloquear)

```
┌─────────────────────────────────────────────┐
│  🔒  Cerrar Cambios                         │
│                                             │
│  Bloquea las plantillas y apuestas para     │
│  TODAS las ligas. Comenzará el seguimiento  │
│  en tiempo real de la jornada.              │
│                                             │
│  ⚠️ Jornada 8 → Se bloqueará para cambios  │
│                                             │
│  [ BLOQUEAR JORNADA 8 ]                     │
└─────────────────────────────────────────────┘
```

**Estados del Botón:**
- ✅ Habilitado: `jornadaStatus === 'open'`
- ❌ Deshabilitado: `jornadaStatus === 'closed'` o `isLoadingStatus`
- ⏳ Loading: `isClosingJornada === true`

**Estilos Dinámicos:**
```typescript
backgroundColor: jornadaStatus === 'closed' ? '#334155' : '#ef4444'
opacity: jornadaStatus === 'closed' ? 0.5 : 1
shadowOpacity: jornadaStatus === 'closed' ? 0 : 0.3
```

**Texto del Botón:**
- Loading: `"Bloqueando Jornada 8..."`
- Bloqueado: `"Jornada 8 ya bloqueada"`
- Normal: `"Bloquear Jornada 8"`

#### 2. Card: Abrir Cambios (Cerrar Jornada)

```
┌─────────────────────────────────────────────┐
│  🔓  Abrir Cambios                          │
│                                             │
│  Cierra la jornada actual para TODAS las    │
│  ligas. Evaluará apuestas, calculará        │
│  puntos y permitirá que los usuarios        │
│  realicen cambios para la próxima jornada.  │
│                                             │
│  ✅ Jornada 8 → Se cerrará y avanzará a    │
│     Jornada 9                               │
│                                             │
│  [ ABRIR CAMBIOS (JORNADA 8) ]              │
└─────────────────────────────────────────────┘
```

**Estados del Botón:**
- ✅ Habilitado: `jornadaStatus === 'closed'`
- ❌ Deshabilitado: `jornadaStatus === 'open'` o `isLoadingStatus`
- ⏳ Loading: `isOpeningJornada === true`

**Estilos Dinámicos:**
```typescript
backgroundColor: jornadaStatus === 'open' ? '#334155' : '#10b981'
opacity: jornadaStatus === 'open' ? 0.5 : 1
shadowOpacity: jornadaStatus === 'open' ? 0 : 0.3
```

**Texto del Botón:**
- Loading: `"Abriendo Cambios (Jornada 8)..."`
- Abierto: `"Cambios ya permitidos (J8)"`
- Normal: `"Abrir Cambios (Jornada 8)"`

---

### Advertencia Final (líneas 608-638)

```
┌─────────────────────────────────────────────┐
│  ⚠️  Advertencia Importante                 │
│                                             │
│  Esta acción afectará a todas las ligas y   │
│  todos los usuarios del sistema. Asegúrate  │
│  de ejecutarla solo cuando la jornada haya  │
│  finalizado completamente.                  │
└─────────────────────────────────────────────┘
```

**Estilos:**
- Fondo: `#451a03` (naranja oscuro)
- Borde izquierdo: `#f59e0b` (naranja brillante)
- Texto: `#fbbf24` y `#fcd34d`

---

## 🔄 Flujo de Estados: Jornada

### Estado Inicial

```
useEffect ejecuta → Carga estado desde BD
                 → jornadaStatus: 'open' | 'closed' | null
                 → currentJornada: 8 | null
```

### Ciclo Completo de una Jornada

```
1. PREPARACIÓN (jornadaStatus: 'open')
   ┌─────────────────────────────────────┐
   │ • Usuarios modifican plantillas     │
   │ • Usuarios hacen fichajes           │
   │ • Usuarios realizan apuestas        │
   │                                     │
   │ Botón habilitado: "Cerrar Cambios" │
   └─────────────────────────────────────┘
              ↓ Admin presiona
              
2. BLOQUEO DE CAMBIOS
   ┌─────────────────────────────────────┐
   │ JornadaService.openAllJornadas()    │
   │ • Marca jornadaStatus = 'closed'    │
   │ • NO incrementa jornada aún         │
   └─────────────────────────────────────┘
              ↓
              
3. JORNADA EN CURSO (jornadaStatus: 'closed')
   ┌─────────────────────────────────────┐
   │ • Usuarios NO pueden hacer cambios  │
   │ • Puntos se actualizan en tiempo    │
   │   real durante los partidos         │
   │ • Apuestas quedan bloqueadas        │
   │                                     │
   │ Botón habilitado: "Abrir Cambios"  │
   └─────────────────────────────────────┘
              ↓ Partidos finalizan
              ↓ Admin presiona
              
4. CIERRE Y EVALUACIÓN
   ┌─────────────────────────────────────┐
   │ JornadaService.closeAllJornadas()   │
   │ • Evalúa todas las apuestas         │
   │ • Calcula puntos finales            │
   │ • Actualiza presupuestos            │
   │ • Vacía plantillas                  │
   │ • Elimina bet_options antiguas      │
   │ • Incrementa jornada: 8 → 9         │
   │ • Marca jornadaStatus = 'open'      │
   └─────────────────────────────────────┘
              ↓
              
5. NUEVA JORNADA (jornadaStatus: 'open')
   ┌─────────────────────────────────────┐
   │ Jornada 9 - Ciclo se repite         │
   └─────────────────────────────────────┘
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. ❌ Falta Botón de Evaluación de Apuestas

**Problema:**
- El AdminPanel NO tiene botón para evaluar apuestas manualmente
- La evaluación solo ocurre dentro de `closeAllJornadas()`
- Si las apuestas necesitan re-evaluación, no hay opción

**Impacto:**
- No se pueden evaluar apuestas sin cerrar la jornada
- No hay forma de ver resultados de evaluación antes del cierre
- No se puede hacer evaluación de prueba

**Solución sugerida:**
Agregar sección entre "Gestión de Jugadores" y "Cerrar Cambios":

```typescript
{/* Evaluación de Apuestas */}
<View style={{ backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 20 }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
    <View style={{ marginRight: 12 }}>
      <CheckCircleIcon size={32} color="#10b981" />
    </View>
    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', flex: 1 }}>
      Evaluar Apuestas
    </Text>
  </View>

  <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>
    Evalúa las apuestas pendientes de una liga específica o de todas las ligas.
  </Text>

  <View style={{ flexDirection: 'row', gap: 12 }}>
    {/* Evaluar Liga Específica */}
    <TouchableOpacity
      onPress={handleEvaluateSingleLeague}
      style={{
        flex: 1,
        backgroundColor: '#3b82f6',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
        Evaluar Liga
      </Text>
    </TouchableOpacity>

    {/* Evaluar Todas */}
    <TouchableOpacity
      onPress={handleEvaluateAllLeagues}
      style={{
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
        Evaluar Todas
      </Text>
    </TouchableOpacity>
  </View>
</View>
```

**Handlers necesarios:**

```typescript
const [isEvaluatingBets, setIsEvaluatingBets] = useState(false);

const handleEvaluateSingleLeague = async () => {
  // Mostrar selector de liga
  // Luego llamar a BetService.evaluateBets(leagueId)
};

const handleEvaluateAllLeagues = async () => {
  CustomAlertManager.alert(
    '📊 Evaluar Todas las Apuestas',
    '¿Evaluar apuestas pendientes de TODAS las ligas?',
    [
      { text: 'Cancelar', style: 'cancel', onPress: () => {} },
      {
        text: 'Evaluar',
        style: 'default',
        onPress: async () => {
          try {
            setIsEvaluatingBets(true);
            const result = await BetService.evaluateAllBets();
            
            CustomAlertManager.alert(
              '✅ Evaluación Completada',
              `📊 Total evaluadas: ${result.totalEvaluated}\n` +
              `✅ Ganadas: ${result.totalWon}\n` +
              `❌ Perdidas: ${result.totalLost}\n` +
              `⏳ Pendientes: ${result.totalPending}`,
              [{ text: 'OK', onPress: () => {}, style: 'default' }],
              { icon: 'check-circle', iconColor: '#10b981' }
            );
          } catch (error: any) {
            CustomAlertManager.alert(
              '❌ Error',
              error.message || 'No se pudieron evaluar las apuestas',
              [{ text: 'OK', onPress: () => {}, style: 'default' }],
              { icon: 'alert-circle', iconColor: '#ef4444' }
            );
          } finally {
            setIsEvaluatingBets(false);
          }
        }
      }
    ],
    { icon: 'alert', iconColor: '#f59e0b' }
  );
};
```

### 2. ⚠️ Nombres Confusos de Botones

**Problema:**
```
handleCerrarJornada()  →  Llama a openAllJornadas()   (CONFUSO)
handleAbrirJornada()   →  Llama a closeAllJornadas()  (CONFUSO)
```

**Explicación:**
Los nombres fueron invertidos para mantener coherencia con la terminología de negocio:
- "Cerrar Cambios" = Bloquear modificaciones (open jornada en BD)
- "Abrir Cambios" = Permitir modificaciones (close jornada en BD)

**Sugerencia:**
Renombrar funciones para mayor claridad:

```typescript
// ANTES
const handleCerrarJornada = async () => {
  await JornadaService.openAllJornadas();
}

const handleAbrirJornada = async () => {
  await JornadaService.closeAllJornadas();
}

// DESPUÉS (más claro)
const handleBloquearCambios = async () => {
  await JornadaService.openAllJornadas(); // Abre jornada = bloquea cambios
}

const handleCerrarYAvanzarJornada = async () => {
  await JornadaService.closeAllJornadas(); // Cierra jornada = permite cambios
}
```

### 3. ⚠️ No Hay Import de BetService

**Problema:**
```typescript
// Imports actuales
import { JornadaService } from '../../services/JornadaService';
import { LigaService } from '../../services/LigaService';

// ❌ FALTA:
import { BetService } from '../../services/BetService';
```

**Impacto:**
- Si se agregan funciones de evaluación, el import no está disponible

**Solución:**
```typescript
import { BetService } from '../../services/BetService';
```

### 4. ℹ️ Asume Sincronización Global

**Código (línea 62-70):**
```typescript
if (ligas.length > 0) {
  // Consultar el estado de la primera liga
  const primeraLiga = ligas[0];
  const status = await JornadaService.getJornadaStatus(primeraLiga.id);
  
  setJornadaStatus(status.status as 'open' | 'closed');
  setCurrentJornada(status.currentJornada);
}
```

**Observación:**
- Asume que todas las ligas están sincronizadas
- Solo consulta la primera liga
- Si las ligas pueden estar en jornadas diferentes, esto podría ser problemático

**¿Es correcto?**
- ✅ SÍ: Si las acciones de admin afectan a TODAS las ligas simultáneamente
- ❌ NO: Si cada liga puede tener jornada independiente

---

## 📊 Métricas del Código

| Métrica | Valor |
|---------|-------|
| Total líneas | 638 |
| Funciones principales | 2 (handleCerrarJornada, handleAbrirJornada) |
| Estados | 5 (isClosingJornada, isOpeningJornada, jornadaStatus, currentJornada, isLoadingStatus) |
| Navegaciones | 3 (GestionUsuarios, GestionLigas, GestionJugadores) |
| Alerts personalizados | 6 (2 confirmación + 2 éxito + 2 error) |
| Servicios usados | 2 (JornadaService, LigaService) |
| Servicios faltantes | 1 (BetService - no usado) |

---

## ✅ Funcionalidades Implementadas

1. ✅ Carga estado inicial de jornada
2. ✅ Navegación a gestión de usuarios
3. ✅ Navegación a gestión de ligas
4. ✅ Navegación a gestión de jugadores
5. ✅ Bloqueo de cambios (inicio jornada)
6. ✅ Cierre de jornada y avance
7. ✅ Manejo de estados loading
8. ✅ Alerts de confirmación y éxito
9. ✅ Manejo de errores
10. ✅ UI responsiva y accesible

---

## ❌ Funcionalidades Faltantes

1. ❌ Evaluación manual de apuestas (sin cerrar jornada)
2. ❌ Selector de liga específica para operaciones
3. ❌ Visualización de estadísticas globales
4. ❌ Historial de jornadas cerradas
5. ❌ Botón para generar apuestas manualmente
6. ❌ Botón para vaciar plantillas manualmente
7. ❌ Dashboard con métricas en tiempo real

---

## 🎨 Diseño y UX

### Puntos Fuertes

✅ **Consistencia Visual:**
- Usa LinearGradient para fondo
- Cards con estilo uniforme
- Iconografía consistente
- Colores semánticos (rojo=bloqueo, verde=apertura)

✅ **Feedback al Usuario:**
- Loading indicators mientras procesa
- Mensajes claros y descriptivos
- Confirmaciones antes de acciones destructivas
- Alerts con iconos y colores apropiados

✅ **Accesibilidad:**
- Botones deshabilitados visualmente diferentes
- Textos legibles con buen contraste
- Espaciado generoso entre elementos

### Áreas de Mejora

⚠️ **Información Limitada:**
- No muestra cuántas ligas hay en el sistema
- No muestra cuántos usuarios activos
- No muestra estado de cada liga individual

⚠️ **Navegación:**
- No tiene breadcrumbs
- Botón volver genérico (no indica a dónde va)

---

## 🔧 Recomendaciones

### Prioridad Alta

1. **Agregar BetService y botones de evaluación**
   - Importar BetService
   - Agregar sección "Evaluar Apuestas"
   - Implementar evaluación por liga y global

2. **Renombrar funciones para claridad**
   - handleBloquearCambios
   - handleCerrarYAvanzarJornada

### Prioridad Media

3. **Agregar dashboard de métricas**
   - Número de ligas activas
   - Número de usuarios activos
   - Jornada actual de cada liga
   - Apuestas pendientes por evaluar

4. **Mejorar feedback visual**
   - Progress bar durante cierre de jornada
   - Lista de pasos completados en tiempo real
   - Indicador de tiempo estimado

### Prioridad Baja

5. **Agregar historial**
   - Ver jornadas anteriores
   - Ver resultados de evaluaciones pasadas
   - Exportar informes

---

## 📝 Conclusión

**Estado General:** ✅ Funcional y bien estructurado

**Fortalezas:**
- Código limpio y legible
- Manejo robusto de estados
- Excelente UX con confirmaciones
- Diseño visual coherente

**Debilidades:**
- Falta evaluación manual de apuestas
- Nombres de funciones confusos (lógica invertida)
- Información limitada sobre el estado del sistema

**Próximo Paso Recomendado:**
Agregar sección de "Evaluar Apuestas" con botones para evaluación manual antes del cierre de jornada.

---

**Fecha de Análisis:** 20 de octubre de 2025
**Archivo Analizado:** `frontend/pages/admin/AdminPanel.tsx`
**Líneas Analizadas:** 1-638 (completo)
