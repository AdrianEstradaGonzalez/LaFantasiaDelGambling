# Solución al Error de Autenticación en PlayerDetail

## Problema Identificado

Al acceder a los detalles de un jugador en la aplicación móvil, se producían los siguientes errores:

```
PlayerDetail.tsx:123 Error obteniendo estadísticas del backend: Error: No autenticado
PlayerDetail.tsx:176 Error obteniendo estadísticas de la jornada seleccionada: Error: No autenticado
```

## Causa Raíz

El error "No autenticado" se lanzaba desde el `PlayerStatsService.ts` en el frontend cuando intentaba recuperar el token de autenticación del almacenamiento encriptado:

```typescript
const token = await EncryptedStorage.getItem('accessToken');
if (!token) throw new Error('No autenticado');
```

El problema puede deberse a una de las siguientes causas:

1. **Sesión no iniciada**: El usuario no ha iniciado sesión en la aplicación
2. **Token expirado o borrado**: El token de autenticación ha sido eliminado del almacenamiento
3. **Problema con EncryptedStorage**: Fallo al acceder al almacenamiento encriptado

## Soluciones Implementadas

### 1. Logging Mejorado en PlayerStatsService (`frontend/services/PlayerStatsService.ts`)

Se agregaron logs detallados en los métodos de obtención de estadísticas para facilitar la depuración:

```typescript
async getPlayerJornadaStats(...) {
  try {
    const token = await EncryptedStorage.getItem('accessToken');
    if (!token) {
      console.error('[PlayerStatsService] No se encontró token de autenticación');
      throw new Error('No autenticado');
    }

    console.log('[PlayerStatsService] Solicitando estadísticas:', { playerId, jornada, url });
    
    const response = await fetch(url, { ... });
    
    if (!response.ok) {
      console.error('[PlayerStatsService] Error en respuesta:', response.status, response.statusText);
      // Mejor manejo de errores...
    }
    
    console.log('[PlayerStatsService] Estadísticas obtenidas correctamente');
    return result.data;
  } catch (error) {
    console.error('[PlayerStatsService] Error en getPlayerJornadaStats:', error);
    throw error;
  }
}
```

### 2. Utilidad de Depuración de Autenticación (`frontend/utils/authDebug.ts`)

Se creó una nueva utilidad para verificar y depurar el estado de autenticación:

```typescript
export class AuthDebug {
  // Verifica si hay token y usuario guardados
  static async checkAuthStatus(): Promise<{
    hasToken: boolean;
    hasUserId: boolean;
    tokenPreview?: string;
  }> { ... }

  // Muestra todos los datos de autenticación (con preview del token)
  static async getAllAuthData(): Promise<{...}> { ... }

  // Limpia todos los datos de autenticación
  static async clearAuthData(): Promise<void> { ... }
}
```

### 3. Validación Temprana en PlayerDetail (`frontend/pages/players/PlayerDetail.tsx`)

Se agregó una verificación del estado de autenticación al inicio de la carga de datos:

```typescript
useEffect(() => {
  const loadPlayerData = async () => {
    try {
      setLoading(true);
      
      console.log('[PlayerDetail] Iniciando carga de datos para jugador:', player.id, player.name);
      
      // ✨ NUEVO: Verificar estado de autenticación
      const authStatus = await AuthDebug.checkAuthStatus();
      if (!authStatus.hasToken) {
        console.error('[PlayerDetail] ¡No hay token de autenticación!');
        CustomAlertManager.alert(
          'Sesión expirada',
          'Por favor, inicia sesión nuevamente para ver los detalles del jugador.',
          [{ text: 'OK', onPress: () => {}, style: 'default' }],
          { icon: 'alert-circle', iconColor: '#ef4444' }
        );
        setLoading(false);
        return;
      }
      
      // Continuar con la carga de datos...
    }
  };
}, [player.id]);
```

### 4. Logs Adicionales en PlayerDetail

Se agregaron logs en puntos clave para rastrear el flujo de ejecución:

- Al iniciar la carga de datos
- Al obtener jornadas disponibles
- Al solicitar estadísticas al backend
- En caso de error con detalles completos

## Cómo Usar

### Para Depurar

1. Abre las herramientas de desarrollo del emulador/dispositivo
2. Busca logs con los prefijos:
   - `[PlayerDetail]` - Logs del componente PlayerDetail
   - `[PlayerStatsService]` - Logs del servicio de estadísticas
   - `[AuthDebug]` - Logs de depuración de autenticación

3. Para verificar manualmente el estado de autenticación en cualquier parte de la app:

```typescript
import { AuthDebug } from '../../utils/authDebug';

// Verificar si hay token
const status = await AuthDebug.checkAuthStatus();
console.log(status); // { hasToken: true/false, hasUserId: true/false, tokenPreview: "..." }

// Ver todos los datos de auth
const data = await AuthDebug.getAllAuthData();
console.log(data); // { accessToken: "...", userId: "...", isAdmin: "..." }
```

### Para el Usuario Final

Si aparece el error "Sesión expirada":

1. Cerrar sesión en la aplicación
2. Volver a iniciar sesión con tus credenciales
3. Intentar acceder nuevamente a los detalles del jugador

## Próximos Pasos Recomendados

1. **Implementar refresh token**: Actualmente los tokens duran 365 días, pero sería mejor tener un sistema de refresh token automático

2. **Persistencia mejorada**: Considerar usar AsyncStorage como fallback si EncryptedStorage falla

3. **Interceptor global**: Crear un interceptor de fetch que maneje automáticamente:
   - Agregar el token a todas las peticiones
   - Detectar errores 401 y redirigir al login
   - Reintentar peticiones fallidas

4. **Estado global de autenticación**: Usar Context API o Redux para manejar el estado de autenticación globalmente

## Archivos Modificados

- ✅ `frontend/services/PlayerStatsService.ts` - Logging mejorado
- ✅ `frontend/pages/players/PlayerDetail.tsx` - Validación temprana y logs
- ✅ `frontend/utils/authDebug.ts` - Nueva utilidad de depuración (CREADO)

## Testing

Para probar que la solución funciona:

1. **Caso 1: Usuario autenticado correctamente**
   - Iniciar sesión normalmente
   - Acceder a los detalles de un jugador
   - Verificar que los logs muestran "hasToken: true"
   - Las estadísticas deben cargarse sin errores

2. **Caso 2: Sin token (sesión expirada)**
   - Limpiar el storage manualmente: `await AuthDebug.clearAuthData()`
   - Intentar acceder a los detalles de un jugador
   - Debe aparecer la alerta "Sesión expirada"
   - Los logs deben mostrar "hasToken: false"

3. **Caso 3: Error de red**
   - Desactivar la conexión de red
   - Intentar acceder a los detalles de un jugador
   - Los logs deben mostrar el error de red específico
   - La app debe manejar gracefully el error

## Conclusión

Con estas mejoras, ahora es mucho más fácil identificar la causa exacta del error "No autenticado":

- Si el problema es falta de token, se detecta inmediatamente con mensaje claro
- Los logs detallados permiten rastrear cada paso de las peticiones HTTP
- La utilidad `AuthDebug` facilita verificar el estado de autenticación en cualquier momento
