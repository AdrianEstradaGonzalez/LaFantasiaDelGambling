# Carpeta Shared - Código Compartido

Esta carpeta contiene código que se comparte entre **backend** y **frontend** de DreamLeague.

## 📁 Contenido

### `pointsConfig.ts`
Configuración centralizada del sistema de puntuación. Aquí se definen **todos los valores** de puntos:

- `CLEAN_SHEET_MINUTES = 60` - Minutos mínimos para bonus de portería a cero
- `BASE_POINTS` - Puntos comunes a todas las posiciones (minutos, asistencias, tarjetas, etc.)
- `GOALKEEPER_POINTS` - Puntos específicos de porteros
- `DEFENDER_POINTS` - Puntos específicos de defensas
- `MIDFIELDER_POINTS` - Puntos específicos de centrocampistas
- `ATTACKER_POINTS` - Puntos específicos de delanteros

**✏️ Modifica este archivo** cuando necesites cambiar reglas de puntuación.

### `pointsCalculator.ts`
Lógica unificada de cálculo de puntos. Contiene:

- `calculatePlayerPoints(stats, role)` - Calcula puntos con desglose detallado
- `calculatePlayerPointsTotal(stats, role)` - Calcula solo el total (más rápido)
- `normalizeRole(position)` - Normaliza nombres de posiciones
- Type `Role` - Tipo TypeScript para posiciones

**⚠️ No modifiques este archivo** a menos que necesites cambiar la lógica de cálculo.

## 🔧 Uso

### Backend (TypeScript/Node.js)
```typescript
import { 
  calculatePlayerPointsTotal, 
  normalizeRole 
} from '../../../shared/pointsCalculator.js'; // ⚠️ Nota el .js

const role = normalizeRole(player.position);
const points = calculatePlayerPointsTotal(stats, role);
```

### Frontend (React Native)
```typescript
import { 
  calculatePlayerPoints, 
  type Role 
} from '../../../shared/pointsCalculator'; // Sin .js

const result = calculatePlayerPoints(stats, 'Midfielder');
console.log(result.total); // Total de puntos
console.log(result.breakdown); // Desglose detallado
```

## 🚨 Importante

### Para Backend
- Los imports DEBEN incluir la extensión `.js`
- Usa `calculatePlayerPointsTotal()` si solo necesitas el número total

### Para Frontend (React Native)
- Los imports NO incluyen extensión
- Si modificas archivos en `shared`, reinicia Metro:
  ```bash
  cd frontend
  npx react-native start --reset-cache
  ```
- Configuración especial en `frontend/metro.config.js` permite acceder a esta carpeta

## 🎯 Ejemplo de Modificación

**Objetivo**: Cambiar "cada 2 pases clave = 1 punto" a "cada pase clave = 1 punto" para centrocampistas

**Solución**:
```typescript
// pointsConfig.ts
export const MIDFIELDER_POINTS = {
  KEY_PASSES_PER_POINT: 1,  // Era 2, ahora es 1
  // ... resto sin cambios
};
```

✅ Cambio aplicado automáticamente en backend y frontend
✅ No necesitas modificar ningún otro archivo
✅ Los tests seguirán funcionando

## 📊 Estructura de Datos

### Stats Object (entrada)
```typescript
{
  games: { minutes: number },
  goals: { total: number, assists: number, conceded: number, saves: number },
  shots: { on: number },
  passes: { key: number },
  dribbles: { success: number },
  tackles: { interceptions: number },
  duels: { won: number },
  fouls: { drawn: number },
  cards: { yellow: number, red: number },
  penalty: { won: number, committed: number, scored: number, missed: number, saved: number },
  goalkeeper: { conceded: number, saves: number },
}
```

### Role Type
```typescript
type Role = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';
```

### Result Object (salida de calculatePlayerPoints)
```typescript
{
  total: number,
  breakdown: Array<{
    category: string,
    points: number
  }>
}
```

## 🔍 Troubleshooting

### Error: "Cannot find module '../../../shared/pointsCalculator'"

**Frontend**: Reinicia Metro con caché limpio
```bash
cd frontend
npx react-native start --reset-cache
```

**Backend**: Verifica que incluyas `.js` en el import
```typescript
// ✅ Correcto
import { ... } from '../../../shared/pointsCalculator.js';

// ❌ Incorrecto
import { ... } from '../../../shared/pointsCalculator';
```

### Los cambios no se reflejan

1. **Backend**: Reinicia el servidor
2. **Frontend**: Reinicia Metro y reconstruye:
   ```bash
   npx react-native start --reset-cache
   npx react-native run-android
   ```

---

**📚 Más información**: Ver `SISTEMA_PUNTOS_CENTRALIZADO.md` en la raíz del proyecto
