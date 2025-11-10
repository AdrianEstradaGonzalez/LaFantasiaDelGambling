# Cambios Implementados en UI de Apuestas

## ✅ Completado: HistorialApuestas.tsx

Se han implementado todos los cambios solicitados:

1. **Sistema de Tabs Deslizables** (similar a Reglas.tsx)
   - Tab "Balances": Muestra los usuarios con sus balances
   - Tab "Apuestas": Muestra las apuestas agrupadas por partido

2. **Balances con Expansión/Contracción**
   - Vista contraída: Muestra nombre de usuario, resumen de apuestas (X w Y l) y balance total
   - Al hacer clic: Se expande mostrando detalles de apuestas ganadas, perdidas y pendientes
   - Ordenados de mayor a menor balance

3. **Apuestas con Expansión/Contracción**
   - Vista contraída: Muestra equipos (con escudos), fecha, hora y número de apuestas
   - Al hacer clic: Se expande mostrando quién apostó, a qué, cuánto y ganancia potencial

## 🔄 Pendiente: Apuestas.tsx

Para completar los cambios en `Apuestas.tsx`, necesitas buscar la sección que comienza con:

```tsx
{leagueBets.length === 0 ? (
  <View style={{...}}>
    ...Sin apuestas registradas...
  </View>
) : (
  <>
    {/* Balance de usuarios (evaluación en tiempo real) */}
```

Y reemplazar TODO el bloque `<>...</>` con la estructura de tabs similar a HistorialApuestas.

### Cambios específicos en Apuestas.tsx:

1. **Importar iconos adicionales** ✅
   - ChevronDownIcon
   - ChevronUpIcon
   - ChartBarIcon
   - Dimensions

2. **Añadir estados** ✅
   - `expandedUsers`
   - `activeTab`
   - `tabScrollViewRef`
   - `tabIndicatorAnim`
   - `expandedBets`

3. **Añadir handlers** ✅
   - `toggleUserExpansion`
   - `handleTabPress`
   - `handleTabScroll`
   - `toggleBetExpansion`

4. **Modificar el renderizado** (Línea ~1074):
   Buscar donde dice `) : (` después de "Sin apuestas registradas" y reemplazar con:

```tsx
) : (
  <>
    {/* Tabs: Balances / Apuestas */}
    <View style={{
      flexDirection: 'row',
      position: 'relative',
      marginBottom: 20,
      backgroundColor: '#1a2332',
      borderRadius: 12,
      padding: 4,
    }}>
      {/* ... contenido de tabs igual que HistorialApuestas ... */}
    </View>

    {/* Content ScrollView Horizontal para Tabs */}
    <ScrollView
      ref={tabScrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={handleTabScroll}
      scrollEventThrottle={16}
      style={{ marginHorizontal: -16 }}
    >
      {/* TAB 1: BALANCES */}
      <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 16 }}>
        {/* ... contenido de balances con expansión ... */}
      </View>

      {/* TAB 2: APUESTAS */}
      <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 16 }}>
        {/* ... contenido de apuestas por partido con expansión ... */}
      </View>
    </ScrollView>
  </>
)}
```

## Características Clave

### Vista Contraída (Balances)
- Nombre de usuario
- Número total de apuestas
- Contador de ganadas (icono check verde)
- Contador de perdidas (icono X rojo)
- Balance total (verde si positivo, rojo si negativo)
- Icono chevron para indicar expansión

### Vista Expandida (Balances)
- Secciones separadas por estado:
  - ✅ Ganadas (fondo verde oscuro)
  - ❌ Perdidas (fondo rojo oscuro)
  - ⏱️ Pendientes (fondo naranja oscuro)
- Cada apuesta muestra:
  - Tipo de apuesta
  - Label formateado
  - Cuota
  - Ganancia/pérdida

### Vista Contraída (Apuestas por Partido)
- Equipos con escudos
- Fecha y hora del partido
- Número de apuestas realizadas
- Icono chevron para indicar expansión

### Vista Expandida (Apuestas por Partido)
- Lista de todas las apuestas del partido
- Cada apuesta muestra:
  - Nombre del usuario
  - Monto apostado
  - Tipo de apuesta
  - Label formateado
  - Cuota
  - Ganancia potencial

## Estilos Mantenidos

- Colores corporativos (#0892D0 para tabs activos)
- Fondos oscuros (#1a2332, #0f172a, #0a1420)
- Bordes de color según estado (verde/rojo/naranja/azul)
- Tipografía consistente con el resto de la app
- Animaciones suaves (spring animation para tabs)

## Iconos Utilizados

- ChevronDownIcon / ChevronUpIcon: Para indicar estado expandido/contraído
- CheckIcon: Apuestas ganadas
- ErrorIcon: Apuestas perdidas
- ClockIcon: Apuestas pendientes
- ChartBarIcon / CoinsIcon: Encabezados de secciones
- CalendarIcon / ClockIcon: Fecha y hora de partidos

## Notas de Implementación

- El sistema de tabs usa `horizontal pagingEnabled` ScrollView
- La animación del indicador usa `Animated.spring` para suavidad
- Los estados de expansión usan `Set<>` para eficiencia
- Las vistas contraídas son `TouchableOpacity` para feedback visual
- Se mantiene la evaluación en tiempo real de balances cuando está disponible
