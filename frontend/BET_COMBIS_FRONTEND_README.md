# Sistema de Combis - Frontend

## Descripción
Sistema de apuestas combinadas integrado en la pantalla de Apuestas. Permite a los usuarios seleccionar entre 2 y 3 opciones de apuestas de diferentes partidos, multiplicando las cuotas para obtener mayores ganancias potenciales.

## Características Implementadas

### 1. Botón "Combinar" por Opción
- Ubicado debajo del botón "Apostar" en cada opción de apuesta
- Estados del botón:
  - **"Combinar"** (azul #1e40af): Disponible para agregar a combi
  - **"✓ En combi"** (azul claro #0ea5e9): Ya seleccionada en la combi
  - **Bloqueado** (gris #374151): Cuando ya se seleccionó otra opción del mismo partido

### 2. Reglas de Selección
✅ **Mínimo**: 2 apuestas  
✅ **Máximo**: 3 apuestas  
✅ **Restricción**: Solo 1 opción por partido  
✅ **Bloqueo automático**: Al seleccionar una opción, se bloquean todas las demás del mismo partido

### 3. Indicador Flotante
Widget en la esquina inferior derecha que muestra:
- Número de apuestas seleccionadas (X / 3)
- Cuota total multiplicada
- Botones "Crear" y "Cancelar"

```tsx
// Ubicación: position absolute, bottom: 80, right: 16
<View>
  <Text>Combi en construcción</Text>
  <Text>2 / 3 apuestas seleccionadas</Text>
  <Text>Cuota total: 4.50</Text>
  <Button>Crear</Button>
  <Button>Cancelar</Button>
</View>
```

### 4. Modal de Confirmación
Al presionar "Crear", se abre un modal con:
- Lista de las apuestas seleccionadas (equipos + opción + cuota)
- Cuota total multiplicada (destacada)
- Input para cantidad a apostar (máx. 50M)
- Ganancia potencial calculada en tiempo real
- Botones "Cancelar" y "Crear Combi"

## Flujo de Usuario

### Paso 1: Seleccionar Apuestas
1. Usuario navega por las opciones de apuestas disponibles
2. Presiona "Combinar" en la primera opción → Se agrega a la combi
3. Otras opciones del mismo partido se bloquean automáticamente
4. Presiona "Combinar" en opciones de otros partidos (máx. 3 total)

### Paso 2: Ver Resumen
- Aparece indicador flotante con resumen
- Muestra cuota multiplicada (ej: 2.0 × 1.8 × 2.5 = 9.0)
- Si tiene menos de 2 selecciones, botón "Crear" está deshabilitado

### Paso 3: Crear Combi
1. Presionar "Crear" en el indicador flotante
2. Se abre modal con formulario
3. Ingresar cantidad (validaciones automáticas)
4. Ver ganancia potencial actualizada
5. Confirmar con "Crear Combi"

### Paso 4: Confirmación
- Se envía request al backend
- Si es exitosa: Mensaje de éxito + actualización de presupuesto
- Si falla: Mensaje de error explicativo
- Se limpia la selección y cierra el modal

## Validaciones Frontend

### En Selección
```tsx
if (combiSelections.length >= 3) {
  showError('Máximo 3 apuestas por combi');
  return;
}

if (hasMatchInCombi) {
  showError('No puedes seleccionar dos opciones del mismo partido');
  return;
}
```

### En Creación
```tsx
if (combiSelections.length < 2) {
  showError('Necesitas mínimo 2 apuestas');
  return;
}

if (amount > 50_000_000) {
  showError('El monto máximo para combis es 50M');
  return;
}

if (amount > budget.available) {
  showError(`Solo tienes ${budget.available}M disponibles`);
  return;
}
```

## Estados de React

### Estado Principal
```tsx
const [combiSelections, setCombiSelections] = useState<CombiSelection[]>([]);
const [combiAmount, setCombiAmount] = useState<string>('');
const [showCombiModal, setShowCombiModal] = useState(false);
const [creatingCombi, setCreatingCombi] = useState(false);
```

### Tipo CombiSelection
```tsx
type CombiSelection = {
  matchId: number;
  betType: string;
  betLabel: string;
  odd: number;
  homeTeam: string;
  awayTeam: string;
};
```

## Funciones Clave

### toggleCombiSelection
Agrega o remueve una selección de la combi:
```tsx
const toggleCombiSelection = (selection: CombiSelection) => {
  // Si ya está, remover
  // Si no, validar máximo y partido duplicado
  // Agregar a la lista
};
```

### isInCombi
Verifica si una opción ya está seleccionada:
```tsx
const isInCombi = (matchId, betType, betLabel): boolean => {
  return combiSelections.some(s => 
    s.matchId === matchId && 
    s.betType === betType && 
    s.betLabel === betLabel
  );
};
```

### isMatchBlockedByCombi
Verifica si un partido ya tiene una selección:
```tsx
const isMatchBlockedByCombi = (matchId: number): boolean => {
  return combiSelections.some(s => s.matchId === matchId);
};
```

### calculateCombiOdds
Calcula la cuota total multiplicada:
```tsx
const calculateCombiOdds = (): number => {
  return combiSelections.reduce((acc, sel) => acc * sel.odd, 1);
};
```

### handleCreateCombi
Envía la combi al backend:
```tsx
const handleCreateCombi = async () => {
  // Validaciones
  // POST /bet-combis/:leagueId
  // Actualizar presupuesto
  // Limpiar selecciones
};
```

### clearCombi
Limpia todas las selecciones:
```tsx
const clearCombi = () => {
  setCombiSelections([]);
  setCombiAmount('');
  setShowCombiModal(false);
};
```

## Integración con BetService

### Nuevas Funciones en BetService.ts
```tsx
// Crear combi
static async createCombi(leagueId: string, data: {
  jornada: number;
  selections: CombiSelection[];
  amount: number;
}): Promise<any>

// Obtener combis del usuario
static async getUserCombis(leagueId: string, jornada?: number): Promise<any[]>
```

## UI/UX

### Colores
- **Botón disponible**: #1e40af (azul oscuro)
- **Botón seleccionado**: #0ea5e9 (azul claro)
- **Botón bloqueado**: #374151 (gris)
- **Crear combi**: #16a34a (verde)
- **Cancelar**: #7f1d1d (rojo oscuro)
- **Indicador flotante**: #1e40af (azul oscuro)

### Iconografía
- ✓ (checkmark) para opciones seleccionadas
- Indicador flotante con sombra y elevación
- Modal con fondo oscuro semitransparente

## Comportamiento con Apuestas Normales

### Bloqueo Mutuo
- Si el usuario tiene una apuesta normal en un partido → No puede agregar opciones de ese partido a combis
- Si hay una opción del partido en una combi → Otras opciones del partido se bloquean para combis
- Las apuestas normales y combis son independientes en términos de presupuesto

### Coexistencia
- Un usuario puede tener apuestas normales Y combis en la misma jornada
- El presupuesto se comparte entre ambos tipos
- Ambas se evalúan al finalizar la jornada

## Ejemplo de Uso

### Escenario: Usuario crea combi de 3 partidos
1. **Partido 1**: Real Madrid vs Barcelona
   - Selecciona "Victoria Local" (2.0)
   - Botón cambia a "✓ En combi"
   - Resto de opciones del partido se bloquean

2. **Partido 2**: Sevilla vs Valencia
   - Selecciona "Más de 2.5 goles" (1.8)
   - Indicador muestra: 2/3 selecciones, Cuota: 3.6

3. **Partido 3**: Atlético vs Betis
   - Selecciona "Empate" (2.5)
   - Indicador muestra: 3/3 selecciones, Cuota: 9.0

4. **Crear Combi**:
   - Presiona "Crear" en indicador
   - Ingresa 10M en el modal
   - Ve ganancia potencial: 90M (10M × 9.0)
   - Confirma creación

5. **Resultado**:
   - Presupuesto se reduce en 10M
   - Combi queda en estado "pending"
   - Si las 3 ganan → +90M
   - Si 1 pierde → -10M

## Archivos Modificados

### Frontend
- `pages/apuestas/Apuestas.tsx` (+150 líneas)
  - Estados de combi
  - Funciones de selección
  - Botón "Combinar" en cada opción
  - Indicador flotante
  - Modal de creación
  
- `services/BetService.ts` (+62 líneas)
  - `createCombi()`
  - `getUserCombis()`

## Testing Manual

### Casos de Prueba
1. ✅ Seleccionar 2 apuestas de partidos diferentes
2. ✅ Intentar seleccionar 4ta apuesta → Error "Máximo 3"
3. ✅ Intentar seleccionar 2 opciones del mismo partido → Bloqueado
4. ✅ Crear combi con menos de 2 selecciones → Botón deshabilitado
5. ✅ Crear combi con más de 50M → Error "Máximo 50M"
6. ✅ Crear combi sin presupuesto → Error "No tienes suficiente"
7. ✅ Cancelar combi → Limpiar selecciones
8. ✅ Crear combi exitosamente → Mensaje de éxito + actualizar presupuesto

## Próximas Mejoras (Opcional)

### Historial de Combis
- Pantalla separada para ver combis creadas
- Filtro por jornada
- Detalle expandible de cada combi
- Estado visual (pending/won/lost)

### Notificaciones
- Push notification cuando una combi gana
- Alert cuando una selección de la combi pierde

### Análisis
- Estadísticas de combis ganadas/perdidas
- Cuota promedio de combis
- ROI de combis vs apuestas simples

## Estado Actual
✅ Backend completo y funcional  
✅ Frontend completamente implementado  
✅ Validaciones en frontend y backend  
✅ UI/UX intuitiva con indicador flotante  
✅ Bloqueo automático de opciones del mismo partido  
⏳ Falta: Pantalla de historial de combis  
⏳ Falta: Integración en evaluación automática de jornadas
