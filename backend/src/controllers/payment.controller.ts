import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../services/payment.service.js';

interface CreateCheckoutBody {
  leagueName: string;
  division: 'primera' | 'segunda';
}

interface UpgradeLeagueBody {
  leagueId: string;
  leagueName: string;
}

interface VerifyPaymentQuery {
  session_id: string;
}

export const PaymentController = {
  /**
   * POST /payment/create-checkout
   * Crear sesión de pago de Stripe para liga premium
   */
  createCheckout: async (
    request: FastifyRequest<{ Body: CreateCheckoutBody }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = request.user?.sub;
      if (!userId) {
        return reply.status(401).send({ error: 'Usuario no autenticado' });
      }

      const { leagueName } = request.body;

      if (!leagueName || leagueName.trim().length < 3) {
        return reply.status(400).send({ 
          error: 'El nombre de la liga debe tener al menos 3 caracteres' 
        });
      }

      const checkoutUrl = await PaymentService.createPremiumLeagueCheckout(userId, leagueName);

      return reply.status(200).send({ 
        checkoutUrl,
        message: 'Sesión de pago creada exitosamente' 
      });
    } catch (error: any) {
      console.error('❌ Error en createCheckout:', error);
      return reply.status(500).send({ 
        error: error.message || 'Error al crear sesión de pago' 
      });
    }
  },

  /**
   * POST /payment/upgrade-league
   * Crear sesión de pago para upgrade de liga a premium
   */
  upgradeLeague: async (
    request: FastifyRequest<{ Body: UpgradeLeagueBody }>,
    reply: FastifyReply
  ) => {
    try {
      const userId = request.user?.sub;
      if (!userId) {
        return reply.status(401).send({ error: 'Usuario no autenticado' });
      }

      const { leagueId, leagueName } = request.body;

      if (!leagueId || !leagueName) {
        return reply.status(400).send({ 
          error: 'leagueId y leagueName son requeridos' 
        });
      }

      const checkoutUrl = await PaymentService.createUpgradeLeagueCheckout(userId, leagueId, leagueName);

      return reply.status(200).send({ 
        checkoutUrl,
        message: 'Sesión de upgrade creada exitosamente' 
      });
    } catch (error: any) {
      console.error('❌ Error en upgradeLeague:', error);
      return reply.status(500).send({ 
        error: error.message || 'Error al crear sesión de upgrade' 
      });
    }
  },

  /**
   * GET /payment/verify
   * Verificar el estado de un pago
   */
  verifyPayment: async (
    request: FastifyRequest<{ Querystring: VerifyPaymentQuery }>,
    reply: FastifyReply
  ) => {
    try {
      const { session_id } = request.query;

      if (!session_id) {
        return reply.status(400).send({ error: 'session_id es requerido' });
      }

      const paymentInfo = await PaymentService.verifyPayment(session_id);

      return reply.status(200).send(paymentInfo);
    } catch (error: any) {
      console.error('❌ Error en verifyPayment:', error);
      return reply.status(500).send({ 
        error: error.message || 'Error al verificar pago' 
      });
    }
  },

  /**
   * GET /payment/success
   * Manejar redirección después de pago exitoso
   */
  handleSuccess: async (
    request: FastifyRequest<{ Querystring: { session_id?: string } }>,
    reply: FastifyReply
  ) => {
    const sessionId = request.query.session_id;
    
    // Redirigir al deep link de la app con el session_id
    const deepLink = `fantasiagambling://payment/success${sessionId ? `?session_id=${sessionId}` : ''}`;
    
    // Crear página HTML con botón manual para crear la liga
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Exitoso</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            .success-icon {
              width: 80px;
              height: 80px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              animation: scaleIn 0.5s ease-out;
            }
            .success-icon svg {
              width: 50px;
              height: 50px;
              stroke: white;
              stroke-width: 3;
              stroke-linecap: round;
              stroke-linejoin: round;
              fill: none;
            }
            h1 {
              color: #1f2937;
              margin: 0 0 10px;
              font-size: 28px;
            }
            p {
              color: #6b7280;
              margin: 0 0 30px;
              font-size: 16px;
              line-height: 1.5;
            }
            .button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 16px 32px;
              font-size: 18px;
              font-weight: 600;
              border-radius: 12px;
              cursor: pointer;
              width: 100%;
              transition: transform 0.2s, box-shadow 0.2s;
              margin-bottom: 15px;
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
            }
            .button:active {
              transform: translateY(0);
            }
            .session-id {
              background: #f3f4f6;
              padding: 12px;
              border-radius: 8px;
              font-size: 12px;
              color: #6b7280;
              word-break: break-all;
              margin-top: 20px;
            }
            @keyframes scaleIn {
              from {
                transform: scale(0);
              }
              to {
                transform: scale(1);
              }
            }
            .spinner {
              display: none;
              width: 20px;
              height: 20px;
              border: 3px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .loading .spinner { display: block; }
            .loading .button-text { display: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1>¡Pago Exitoso! 🎉</h1>
            <p>Tu pago de 0,50€ se ha procesado correctamente. Ahora puedes crear tu liga premium.</p>
            
            <button id="createBtn" class="button" onclick="createLeague()">
              <span class="button-text">✨ Crear Mi Liga Premium</span>
              <div class="spinner"></div>
            </button>
            
            ${sessionId ? `<div class="session-id">Session ID: ${sessionId}</div>` : ''}
          </div>

          <script>
            let attempts = 0;
            const maxAttempts = 3;
            
            function createLeague() {
              const btn = document.getElementById('createBtn');
              btn.classList.add('loading');
              btn.disabled = true;
              attempts++;
              
              // Intentar abrir el deep link
              window.location.href = '${deepLink}';
              
              // Si no funciona después de 2 segundos, mostrar mensaje
              setTimeout(() => {
                if (attempts >= maxAttempts) {
                  alert('No se pudo abrir la aplicación automáticamente.\\n\\nPor favor, cierra esta ventana y vuelve a la app manualmente.');
                  btn.classList.remove('loading');
                  btn.disabled = false;
                } else {
                  // Reintentar
                  btn.classList.remove('loading');
                  btn.disabled = false;
                }
              }, 2000);
            }
            
            // Intentar redirección automática después de 1 segundo
            setTimeout(() => {
              createLeague();
            }, 1000);
          </script>
        </body>
      </html>
    `;
    
    return reply.type('text/html').send(html);
  },

  /**
   * GET /payment/cancel
   * Manejar cancelación de pago
   */
  handleCancel: async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const deepLink = 'fantasiagambling://payment/cancel';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pago Cancelado</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            .cancel-icon {
              width: 80px;
              height: 80px;
              background: #ef4444;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
            }
            .cancel-icon svg {
              width: 50px;
              height: 50px;
              stroke: white;
              stroke-width: 3;
              stroke-linecap: round;
              stroke-linejoin: round;
              fill: none;
            }
            h1 {
              color: #1f2937;
              margin: 0 0 10px;
              font-size: 28px;
            }
            p {
              color: #6b7280;
              margin: 0 0 30px;
              font-size: 16px;
            }
            .button {
              background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
              color: white;
              border: none;
              padding: 16px 32px;
              font-size: 18px;
              font-weight: 600;
              border-radius: 12px;
              cursor: pointer;
              width: 100%;
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="cancel-icon">
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h1>Pago Cancelado</h1>
            <p>Has cancelado el pago. No se ha realizado ningún cargo.</p>
            
            <button class="button" onclick="window.location.href='${deepLink}'">
              Volver a la App
            </button>
          </div>

          <script>
            // Redirección automática después de 2 segundos
            setTimeout(() => {
              window.location.href = '${deepLink}';
            }, 2000);
          </script>
        </body>
      </html>
    `;
    
    return reply.type('text/html').send(html);
  },
};
