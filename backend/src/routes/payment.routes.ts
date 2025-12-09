import { FastifyInstance } from 'fastify';
import { PaymentController } from '../controllers/payment.controller.js';
import { verifyIAP, restoreIAP } from '../controllers/iap.controller.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  /**
   * POST /payment/verify-iap
   * Verificar compra de In-App Purchase (iOS/Android)
   */
  fastify.post('/verify-iap', {
    preHandler: [fastify.auth],
  }, verifyIAP);

  /**
   * POST /payment/restore-iap
   * Restaurar compras anteriores de IAP
   */
  fastify.post('/restore-iap', {
    preHandler: [fastify.auth],
  }, restoreIAP);

  /**
   * POST /payment/create-checkout
   * Crear sesión de pago de Stripe para liga premium (DEPRECATED)
   */
  fastify.post('/create-checkout', {
    preHandler: [fastify.auth],
  }, PaymentController.createCheckout);

  /**
   * POST /payment/create-checkout-session
   * Crear sesión de pago para hacer una liga premium
   */
  fastify.post('/create-checkout-session', {
    preHandler: [fastify.auth],
  }, PaymentController.upgradeLeague);

  /**
   * POST /payment/upgrade-league
   * Crear sesión de pago para upgrade de liga a premium (DEPRECATED)
   */
  fastify.post('/upgrade-league', {
    preHandler: [fastify.auth],
  }, PaymentController.upgradeLeague);

  /**
   * GET /payment/verify
   * Verificar el estado de un pago completado (DEPRECATED)
   */
  fastify.get('/verify', {
    preHandler: [fastify.auth],
  }, PaymentController.verifyPayment);

  /**
   * GET /payment/success
   * Redirigir después de pago exitoso (DEPRECATED)
   */
  fastify.get('/success', PaymentController.handleSuccess);

  /**
   * GET /payment/cancel
   * Redirigir después de cancelar pago (DEPRECATED)
   */
  fastify.get('/cancel', PaymentController.handleCancel);

  /**
   * GET /payment/verify-subscriptions
   * Verificar si el usuario tiene suscripciones activas
   */
  fastify.get('/verify-subscriptions', {
    preHandler: [fastify.auth],
  }, PaymentController.verifySubscriptions);
}
