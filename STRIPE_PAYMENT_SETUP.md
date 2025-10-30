# Sistema de Pagos con Stripe - Liga Premium

## 📋 Resumen
Se ha implementado un sistema de pagos con Stripe para monetizar la creación de ligas premium. Los usuarios deben pagar **10€** para crear una liga premium con características exclusivas.

## ✅ Características Implementadas

### Backend
1. **Servicio de Pagos** (`backend/src/services/payment.service.ts`)
   - `createPremiumLeagueCheckout()`: Crea sesión de pago de Stripe (10€)
   - `verifyPayment()`: Verifica el estado de un pago completado

2. **Controlador de Pagos** (`backend/src/controllers/payment.controller.ts`)
   - `POST /payment/create-checkout`: Inicia sesión de pago
   - `GET /payment/verify`: Verifica estado del pago

3. **Rutas** (`backend/src/routes/payment.routes.ts`)
   - Registradas en `/payment/*`
   - Protegidas con autenticación JWT

### Frontend
1. **Servicio de Pagos** (`frontend/services/PaymentService.ts`)
   - `createPremiumCheckout()`: Solicita URL de pago al backend
   - `verifyPayment()`: Verifica pago completado

2. **Flujo de Pago en CrearLiga.tsx**
   - Botón cambiado a "Pagar 10€ y Crear Liga"
   - WebView modal que abre Stripe Checkout
   - Detección automática de pago exitoso/cancelado
   - Creación de liga solo después de pago exitoso

## 🔧 Configuración Requerida

### 1. Crear cuenta de Stripe
1. Ir a https://stripe.com
2. Crear una cuenta (o iniciar sesión)
3. Activar cuenta con datos bancarios para recibir pagos

### 2. Obtener claves de API
1. En el Dashboard de Stripe, ir a **Developers → API Keys**
2. Copiar:
   - **Publishable key** (pk_test_... o pk_live_...)
   - **Secret key** (sk_test_... o sk_live_...)

### 3. Configurar variables de entorno

#### Backend (`.env`)
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxx
APP_URL=https://tu-dominio.com

# O para desarrollo local
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxx
APP_URL=http://localhost:3000
```

#### URLs de Retorno
Las URLs de éxito y cancelación están configuradas en `payment.service.ts`:
- Success: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel: `${APP_URL}/payment/cancel`

**Importante**: Estas URLs deben estar configuradas correctamente para que el WebView detecte el pago completado.

### 4. Configurar Webhooks (Opcional pero Recomendado)

Para mayor seguridad, configura webhooks de Stripe:

1. En Stripe Dashboard: **Developers → Webhooks**
2. Añadir endpoint: `https://tu-backend.com/payment/webhook`
3. Seleccionar eventos:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

4. Crear endpoint en backend:
```typescript
// backend/src/controllers/payment.controller.ts
webhook: async (request, reply) => {
  const sig = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  try {
    const event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      webhookSecret
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      // Crear liga automáticamente
    }
    
    return reply.status(200).send({ received: true });
  } catch (err) {
    return reply.status(400).send({ error: err.message });
  }
}
```

## 💰 Precio y Producto

**Precio actual**: 10€ (10.00 EUR)
- Configurado en: `payment.service.ts` → `unit_amount: 1000` (en centavos)
- Nombre del producto: "Liga Premium - La Fantasía del Gambling"
- Modo: `payment` (pago único, no recurrente)

Para cambiar el precio, modifica `unit_amount` en `payment.service.ts`:
```typescript
unit_amount: 2000, // Para 20€
unit_amount: 500,  // Para 5€
```

## 🔐 Seguridad

- ✅ Autenticación JWT requerida para crear checkout
- ✅ Validación de nombre de liga (mínimo 3 caracteres)
- ✅ Secret key de Stripe nunca se expone al frontend
- ✅ Verificación de pago antes de crear liga
- ✅ Metadata incluida (userId, leagueName) para rastrear pagos

## 🧪 Testing

### Modo Test (Desarrollo)
Usa tarjetas de prueba de Stripe:
- **Éxito**: `4242 4242 4242 4242`
- **Rechazo**: `4000 0000 0000 0002`
- Cualquier fecha futura, cualquier CVC

### Modo Live (Producción)
1. Cambiar claves de `sk_test_...` a `sk_live_...`
2. Verificar que las URLs de retorno apunten al dominio de producción
3. Configurar webhooks en producción

## 📱 Flujo de Usuario

1. Usuario presiona "Crear Liga Premium"
2. Modal informativo muestra características premium (incluye "Apuestas Combinadas")
3. Usuario presiona "Crear Liga Premium" en modal
4. Modal de configuración: elige nombre y división
5. **Usuario presiona "Pagar 10€ y Crear Liga"**
6. **Se abre WebView con Stripe Checkout**
7. **Usuario completa el pago**
8. **Detección automática de éxito → Crear liga**
9. Navegación a pantalla de invitación con código de liga

## ⚠️ Notas Importantes

- El WebView detecta las URLs `/payment/success` y `/payment/cancel` automáticamente
- La liga solo se crea **después** del pago exitoso
- Si el usuario cancela, no se cobra ni se crea la liga
- Los pagos quedan registrados en el Dashboard de Stripe con metadata del usuario

## 🔄 Próximas Mejoras

- [ ] Implementar webhooks para mayor confiabilidad
- [ ] Guardar registro de pagos en base de datos
- [ ] Panel de administración para ver pagos
- [ ] Soporte para otros métodos de pago (Apple Pay, Google Pay)
- [ ] Facturas automáticas por email
- [ ] Sistema de reembolsos

## 📞 Soporte

En caso de problemas con pagos:
1. Revisar logs del backend (errores de Stripe)
2. Verificar que `STRIPE_SECRET_KEY` esté correctamente configurada
3. Comprobar que las URLs de retorno coincidan con `APP_URL`
4. Revisar Dashboard de Stripe para ver intentos de pago

---

**Fecha de implementación**: 30 de octubre de 2025
**Precio actual**: 10€ por liga premium
**Estado**: ✅ Funcional (requiere configuración de claves de Stripe)
