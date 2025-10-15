# 📋 Listado de Jugadores y Precios

## 📁 Archivos Generados

Este directorio contiene 3 archivos con la información de todos los jugadores de LaLiga y sus precios:

### 1️⃣ `jugadores_precios.txt` (Formato legible)
- 📄 Archivo de texto plano
- 👁️ Fácil de leer para humanos
- 📊 Organizado por posición
- 📈 Incluye estadísticas al final

**Características:**
- Emojis para cada posición (🧤 Porteros, 🛡️ Defensas, ⚙️ Centrocampistas, ⚽ Delanteros)
- Nombres alineados para fácil lectura
- Precios en formato "XXM"
- Nombre del equipo entre paréntesis

### 2️⃣ `jugadores_precios.csv` (Excel/Hojas de cálculo)
- 📊 Compatible con Excel, Google Sheets, etc.
- 🔍 Fácil de filtrar y ordenar
- 📈 Ideal para análisis de datos

**Columnas:**
- Nombre
- Precio (M)
- Posición
- Equipo

### 3️⃣ `jugadores_precios.json` (Para programadores)
- 🔧 Formato JSON estructurado
- 💻 Listo para usar en aplicaciones
- 📊 Incluye estadísticas completas

**Estructura:**
```json
{
  "generatedAt": "timestamp ISO",
  "totalPlayers": 615,
  "statistics": {
    "total": 615,
    "byPosition": { ... },
    "prices": { ... }
  },
  "players": [ ... ]
}
```

## 📊 Estadísticas

- **Total de jugadores:** 615
- **Porteros:** 77
- **Defensas:** 199
- **Centrocampistas:** 197
- **Delanteros:** 142

### 💰 Precios

- **Promedio:** 20M
- **Máximo:** 200M (Kylian Mbappé, Lamine Yamal)
- **Mínimo:** 1M (varios jugadores)

### 🏆 Top 10 Más Caros

1. Kylian Mbappé - 200M (Real Madrid)
2. Lamine Yamal - 200M (Barcelona)
3. J. Álvarez - 180M (Atletico Madrid)
4. Vinícius Júnior - 170M (Real Madrid)
5. Pedri - 150M (Barcelona)
6. Raphinha - 130M (Barcelona)
7. R. Lewandowski - 130M (Barcelona)
8. Nico Williams - 120M (Athletic Club)
9. Álex Baena - 100M (Atletico Madrid)
10. M. Rashford - 100M (Barcelona)

## 🔄 Regenerar Archivos

Para generar archivos actualizados con los últimos datos:

```bash
# Desde la raíz del proyecto
npx tsx backend/scripts/export-players-prices.ts
```

El script:
1. ✅ Se conecta a la base de datos
2. ✅ Obtiene todos los jugadores ordenados por precio
3. ✅ Genera 3 archivos (TXT, CSV, JSON)
4. ✅ Calcula estadísticas automáticamente
5. ✅ Muestra un resumen en consola

## 📖 Ejemplos de Uso

### Abrir en Excel
1. Abre Excel
2. Archivo → Abrir
3. Selecciona `jugadores_precios.csv`
4. Ya puedes filtrar, ordenar y hacer gráficos

### Leer el TXT
```bash
# En Windows
notepad jugadores_precios.txt

# En Linux/Mac
cat jugadores_precios.txt
```

### Usar el JSON en JavaScript
```javascript
const data = require('./jugadores_precios.json');

// Obtener jugadores caros
const expensive = data.players.filter(p => p.price > 100);

// Promedio por posición
const avgByPosition = data.statistics.byPosition;
```

### Importar CSV en Python
```python
import pandas as pd

df = pd.read_csv('jugadores_precios.csv')

# Top 10 más caros
print(df.head(10))

# Promedio por posición
print(df.groupby('Posición')['Precio (M)'].mean())
```

## 🔍 Búsquedas Rápidas

### Encontrar un jugador en TXT
```bash
# Windows PowerShell
Select-String "Mbappé" jugadores_precios.txt

# Linux/Mac
grep "Mbappé" jugadores_precios.txt
```

### Jugadores de un equipo
```bash
# Windows PowerShell
Select-String "Real Madrid" jugadores_precios.txt

# Linux/Mac
grep "Real Madrid" jugadores_precios.txt
```

## ⚠️ Notas

1. **Actualización:** Los archivos reflejan el estado de la base de datos al momento de generarlos
2. **Ordenamiento:** Los jugadores están ordenados por precio (mayor a menor)
3. **Encoding:** Todos los archivos usan UTF-8
4. **Fecha:** La fecha de generación está en el encabezado de cada archivo

## 📅 Última Actualización

Ejecuta el script para ver la fecha exacta en los archivos generados.
