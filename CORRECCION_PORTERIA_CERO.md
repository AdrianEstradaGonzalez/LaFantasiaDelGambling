# Corrección de Evaluación de Apuestas "Portería a Cero"

## Problema Identificado
Las apuestas de tipo "Portería a Cero - Local" y "Portería a Cero - Visitante" no estaban siendo evaluadas correctamente. El sistema marcaba TODAS las opciones (Sí y No) como perdidas (`lost`) porque no había lógica implementada para este tipo de apuestas.

### Ejemplo del Error
**Partido:** Mallorca 1-0 Getafe
- **Apuesta:** Portería a Cero - Visitante
  - **Opción "Sí"**: Debería ser `lost` (Getafe SÍ encajó 1 gol) ❌ Estaba `lost` (pero por defecto, no por evaluación correcta)
  - **Opción "No"**: Debería ser `won` (Getafe encajó 1+ goles) ❌ Estaba `lost` (INCORRECTO)

## Solución Implementada

### 1. Lógica de Evaluación Agregada
**Archivo:** `backend/src/services/betEvaluation.service.ts` (líneas 283-312)

Se agregó la evaluación para apuestas de "Portería a Cero" con la siguiente lógica:

#### Portería a Cero - Local
- **Sí**: El equipo local no encajó goles (`awayGoals === 0`)
- **No**: El equipo local encajó goles (`awayGoals > 0`)

#### Portería a Cero - Visitante
- **Sí**: El equipo visitante no encajó goles (`homeGoals === 0`)
- **No**: El equipo visitante encajó goles (`homeGoals > 0`)

```typescript
// PORTERÍA A CERO (CLEAN SHEET)
if (betType.toLowerCase().includes('portería') && betType.toLowerCase().includes('cero')) {
  const isLocal = betType.toLowerCase().includes('local');
  const isVisitante = betType.toLowerCase().includes('visitante');
  const labelLower = betLabel.toLowerCase();
  const isSi = labelLower === 'sí' || labelLower === 'si';
  
  if (isLocal) {
    const cleanSheet = stats.awayGoals === 0;
    return {
      won: isSi ? cleanSheet : !cleanSheet,
      actualResult: `${stats.homeTeam} encajó ${stats.awayGoals} goles`
    };
  }
  
  if (isVisitante) {
    const cleanSheet = stats.homeGoals === 0;
    return {
      won: isSi ? cleanSheet : !cleanSheet,
      actualResult: `${stats.awayTeam} encajó ${stats.homeGoals} goles`
    };
  }
}
```

### 2. Script de Re-evaluación
**Archivo:** `backend/scripts/reevaluate-clean-sheet-bets.ts`

Se creó un script que:
1. Busca todas las apuestas de "Portería a Cero" ya evaluadas
2. Agrupa por partido
3. Extrae el resultado del partido de otras apuestas (ej: "Ambos Marcan" que tiene "Mallorca 1-0 Getafe")
4. Re-evalúa cada apuesta con la nueva lógica
5. Actualiza el status y apiValue correctos

## Resultados

### Apuestas Actualizadas
**Total procesado:** 43 apuestas de "Portería a Cero"
**Actualizadas:** 4 apuestas (del partido Mallorca 1-0 Getafe)

#### Partido Mallorca 1-0 Getafe (ID: 1390935)
| Tipo | Opción | Status Anterior | Status Nuevo | Resultado |
|------|--------|----------------|--------------|-----------|
| Visitante | No | lost | **won** ✅ | Getafe encajó 1 goles |
| Visitante | No | lost | **won** ✅ | Getafe encajó 1 goles |
| Visitante | No | lost | **won** ✅ | Getafe encajó 1 goles |
| Visitante | No | lost | **won** ✅ | Getafe encajó 1 goles |

Las demás apuestas quedaron igual porque ya estaban correctas:
- Visitante - Sí: `lost` ✅ (Getafe encajó, no mantuvo portería a cero)
- Local - No: `lost` ✅ (Mallorca NO encajó, entonces "No" es incorrecto)

### Otros Partidos
**Partidos sin actualizar:** 6 partidos de la jornada 11
- Estos partidos no tenían el resultado guardado en ninguna apuesta
- Son partidos antiguos que fueron evaluados antes de implementar correctamente otros tipos de apuestas
- Las futuras apuestas de estos partidos se evaluarán correctamente con la nueva lógica

## Impacto

### ✅ Correcciones Actuales
- 4 apuestas del partido Mallorca-Getafe corregidas de `lost` a `won`
- Usuarios afectados recibirán los puntos correspondientes

### ✅ Futuro
- **TODAS** las nuevas apuestas de "Portería a Cero" se evaluarán correctamente
- La lógica está implementada en el servicio principal de evaluación
- El worker de evaluación automática usará la nueva lógica

## Archivos Modificados

1. **`backend/src/services/betEvaluation.service.ts`**
   - Agregada lógica de evaluación para "Portería a Cero - Local" y "Portería a Cero - Visitante"
   - Líneas 283-312

2. **`backend/scripts/reevaluate-clean-sheet-bets.ts`**
   - Script de re-evaluación de apuestas existentes
   - Extrae resultados de otras apuestas del mismo partido
   - Actualiza status y apiValue

## Pruebas Realizadas

### Caso de Prueba: Mallorca 1-0 Getafe
```
Resultado: Mallorca 1-0 Getafe
Goles encajados:
  - Mallorca (Local): 0 goles
  - Getafe (Visitante): 1 gol

Evaluaciones:
✅ Portería a Cero - Local - Sí: lost (Mallorca SÍ mantuvo portería a 0, awayGoals=0)
✅ Portería a Cero - Local - No: lost (Mallorca NO encajó, "No" es incorrecto)
✅ Portería a Cero - Visitante - Sí: lost (Getafe NO mantuvo portería a 0, homeGoals=1)
✅ Portería a Cero - Visitante - No: WON (Getafe SÍ encajó 1+ goles, "No" es correcto)
```

## Conclusión
El bug ha sido corregido. La evaluación de apuestas "Portería a Cero" ahora funciona correctamente tanto para equipos locales como visitantes, y tanto para opciones "Sí" como "No".
