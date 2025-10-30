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
   * GET /payment/verify
   * Verificar el estado de un pago completado
   */
  fastify.get('/verify', {
    preHandler: [fastify.auth],
  }, PaymentController.verifyPayment);
}
