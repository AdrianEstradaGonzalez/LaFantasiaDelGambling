# Sistema de Puntuación Centralizado

## 📋 Resumen

Se ha refactorizado completamente el sistema de puntuación de DreamLeague para **eliminar código duplicado** y establecer una **única fuente de verdad** para todas las reglas de puntuación.

## 🎯 Problema Resuelto

### Antes (Código Duplicado)
- **7 archivos** con implementaciones duplicadas de `calculatePlayerPoints`
- Lógica de puntuación repetida en:
  - **Backend**: `playerPoints.service.ts`, `admin.service.ts`, `jornada.service.ts`
  - **Frontend**: `FutbolService.ts`, `PlayerDetail.tsx`, `MiPlantilla.tsx`
- Difícil de mantener: cambiar una regla requería modificar múltiples archivos
- Riesgo de inconsistencias entre frontend y backend

### Después (Sistema Centralizado)
- **2 archivos compartidos** en `/shared`:
  - `pointsConfig.ts`: Configuración de todos los valores de puntos
  - `pointsCalculator.ts`: Lógica de cálculo unificada
- Todos los servicios importan desde la misma fuente
- **Un solo lugar** para modificar reglas de puntuación

## 📁 Estructura de Archivos

```
shared/
├── pointsConfig.ts         # Configuración de puntos (fácil de modificar)
└── pointsCalculator.ts     # Lógica de cálculo (no tocar a menos que sea necesario)
```

## ⚙️ Cómo Modificar Reglas de Puntuación

### Ejemplo 1: Cambiar puntos por pases clave de centrocampistas

**Actualmente**: Cada 2 pases clave = 1 punto

Para cambiar a "cada pase clave = 1 punto":

```typescript
// shared/pointsConfig.ts

export const MIDFIELDER_POINTS = {
  // ... otras configuraciones
  KEY_PASSES_PER_POINT: 1,  // Cambiar de 2 a 1
};
```

### Ejemplo 2: Aumentar bonus por portería a cero para defensas

**Actualmente**: 4 puntos

Para cambiar a 6 puntos:

```typescript
// shared/pointsConfig.ts

export const DEFENDER_POINTS = {
  // ... otras configuraciones
  CLEAN_SHEET: 6,  // Cambiar de 4 a 6
};
```

### Ejemplo 3: Cambiar minutos mínimos para portería a cero

**Actualmente**: 60 minutos

Para cambiar a 70 minutos:

```typescript
// shared/pointsConfig.ts

export const CLEAN_SHEET_MINUTES = 70;  // Cambiar de 60 a 70
```

## 🔧 API del Sistema

### `pointsConfig.ts`

Exporta las siguientes constantes:

```typescript
// Minutos mínimos para bonus
export const CLEAN_SHEET_MINUTES = 60;

// Puntos base (todas las posiciones)
export const BASE_POINTS = {
  MINUTES_UNDER_45: 1,
  MINUTES_45_OR_MORE: 2,
  ASSIST: 3,
  YELLOW_CARD: -1,
  RED_CARD: -3,
  // ... más
};

// Puntos específicos por posición
export const GOALKEEPER_POINTS = { /* ... */ };
export const DEFENDER_POINTS = { /* ... */ };
export const MIDFIELDER_POINTS = { /* ... */ };
export const ATTACKER_POINTS = { /* ... */ };
```

### `pointsCalculator.ts`

Exporta las siguientes funciones:

```typescript
// Tipo de posición
export type Role = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';

// Calcular puntos con desglose detallado
export function calculatePlayerPoints(stats: any, role: Role): {
  total: number;
  breakdown: { category: string; points: number }[];
}

// Calcular solo el total (más rápido)
export function calculatePlayerPointsTotal(stats: any, role: Role): number;

// Normalizar posición desde string
export function normalizeRole(position?: string | null): Role;
```

## 🔄 Archivos Migrados

### Backend
- ✅ `playerPoints.service.ts` - Ahora importa desde shared
- ✅ `admin.service.ts` - Ahora importa desde shared
- ✅ `jornada.service.ts` - Ahora importa desde shared

### Frontend
- ✅ `FutbolService.ts` - Ahora usa `calculatePointsShared`
- ✅ `PlayerDetail.tsx` - Ahora usa `calculatePointsShared`
- ✅ `MiPlantilla.tsx` - (pendiente verificar si usa cálculo inline)

## 📊 Beneficios

### 1. Mantenibilidad
- **Antes**: Modificar en 7 archivos
- **Ahora**: Modificar en 1 archivo (`pointsConfig.ts`)

### 2. Consistencia
- Garantía de que backend y frontend usan las mismas reglas
- No más desincronizaciones

### 3. Testabilidad
- Un solo lugar para escribir tests unitarios
- Fácil validar cambios

### 4. Claridad
- Configuración separada de la lógica
- Valores claramente nombrados (ej: `KEY_PASSES_PER_POINT`)

## 🚀 Próximos Pasos

1. **Verificar MiPlantilla.tsx**: Confirmar si usa cálculo inline y migrarlo
2. **Agregar Tests**: Crear tests unitarios para `pointsCalculator.ts`
3. **Documentar Fórmulas**: Agregar comentarios explicando el razonamiento de cada valor
4. **Configuración UI**: Considerar crear una interfaz de administración para modificar valores sin tocar código

## 📝 Notas Técnicas

### Configuración de Metro Bundler (React Native)

Para que React Native pueda importar archivos desde la carpeta `shared` (que está fuera de `frontend`), se configuró `metro.config.js`:

```javascript
const config = {
  watchFolders: [
    path.resolve(__dirname, '..'), // Permitir acceso a carpeta parent
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
  },
};
```

**Importante**: Si cambias archivos en `/shared`, reinicia Metro con caché limpio:
```bash
npx react-native start --reset-cache
```

### Compatibilidad con TypeScript
- Todos los tipos están correctamente definidos
- No hay errores de compilación
- Uso de `type Role` para type-safety

### Rendimiento
- `calculatePlayerPointsTotal()` es más rápida (solo devuelve número)
- `calculatePlayerPoints()` devuelve desglose detallado (para UI)

### Imports Relativos
- **Backend**: `import { ... } from '../../../shared/pointsCalculator.js'`
- **Frontend**: `import { ... } from '../../../shared/pointsCalculator'`

## ❓ Preguntas Frecuentes

**Q: ¿Dónde cambio cuántos puntos vale un gol de delantero?**
A: `shared/pointsConfig.ts` → `ATTACKER_POINTS.GOAL = X`

**Q: ¿Dónde cambio la lógica de cálculo (ej: agregar nueva estadística)?**
A: `shared/pointsCalculator.ts` → función `calculatePlayerPoints`

**Q: ¿Cómo sé que todos los archivos usan la misma lógica?**
A: Todos importan de `shared/pointsCalculator.ts`. Verificar con:
```bash
grep -r "calculatePlayerPoints" --include="*.ts" --include="*.tsx"
```

**Q: ¿Puedo revertir estos cambios?**
A: Sí, pero no es recomendable. Los archivos originales están en el historial de Git.

---

**Última actualización**: 2025
**Autor**: Refactorización del sistema de puntuación DreamLeague
