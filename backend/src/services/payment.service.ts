import Stripe from 'stripe';

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export const PaymentService = {
  /**
   * Crear una sesión de pago de Stripe para liga premium
   * @param userId - ID del usuario
   * @param leagueName - Nombre de la liga premium
   * @returns URL de pago de Stripe
   */
  createPremiumLeagueCheckout: async (userId: string, leagueName: string): Promise<string> => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Liga Premium - La Fantasía del Gambling',
                description: `Liga Premium: ${leagueName}`,
              },
              unit_amount: 1000, // 10.00 EUR (en centavos)
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `fantasiagambling://payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `fantasiagambling://payment/cancel`,
        metadata: {
          userId,
          leagueName,
          type: 'premium_league',
        },
      });

      return session.url || '';
    } catch (error) {
      console.error('❌ Error al crear sesión de pago:', error);
      throw new Error('No se pudo iniciar el proceso de pago');
    }
  },

  /**
   * Verificar el estado de un pago
   * @param sessionId - ID de la sesión de Stripe
   */
  verifyPayment: async (sessionId: string) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      return {
        paid: session.payment_status === 'paid',
        userId: session.metadata?.userId,
        leagueName: session.metadata?.leagueName,
        amount: session.amount_total,
      };
    } catch (error) {
      console.error('❌ Error al verificar pago:', error);
      throw new Error('No se pudo verificar el pago');
    }
  },
};
