import { FastifyInstance } from 'fastify';
import { PaymentController } from '../controllers/payment.controller.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  /**
   * POST /payment/create-checkout
   * Crear sesión de pago de Stripe para liga premium
   */
  fastify.post('/create-checkout', {
    preHandler: [fastify.auth],
  }, PaymentController.createCheckout);

  /**
   * POST /payment/upgrade-league
   * Crear sesión de pago para upgrade de liga a premium
   */
  fastify.post('/upgrade-league', {
    preHandler: [fastify.auth],
  }, PaymentController.upgradeLeague);

  /**
   * GET /payment/verify
   * Verificar el estado de un pago completado
   */
  fastify.get('/verify', {
    preHandler: [fastify.auth],
  }, PaymentController.verifyPayment);

  /**
   * GET /payment/success
   * Redirigir después de pago exitoso
   */
  fastify.get('/success', PaymentController.handleSuccess);

  /**
   * GET /payment/cancel
   * Redirigir después de cancelar pago
   */
  fastify.get('/cancel', PaymentController.handleCancel);
}
