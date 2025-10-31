import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const prisma = new PrismaClient();

// Generar código único de 8 caracteres
const generateUniqueCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

async function recoverPayment() {
  try {
    console.log('🔍 Buscando pagos recientes...\n');

    // Obtener las últimas sesiones de pago
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    console.log(`📋 Encontradas ${sessions.data.length} sesiones:\n`);

    for (const session of sessions.data) {
      console.log('─────────────────────────────────');
      console.log(`ID: ${session.id}`);
      console.log(`Estado: ${session.payment_status}`);
      console.log(`Monto: ${session.amount_total ? session.amount_total / 100 : 0}€`);
      console.log(`Usuario: ${session.metadata?.userId || 'N/A'}`);
      console.log(`Liga: ${session.metadata?.leagueName || 'N/A'}`);
      console.log(`Creada: ${new Date(session.created * 1000).toLocaleString()}`);

      // Si el pago está completo pero no se creó la liga
      if (session.payment_status === 'paid' && session.metadata?.leagueName) {
        const userId = session.metadata.userId;
        const leagueName = session.metadata.leagueName;

        // Verificar si ya existe una liga con este nombre para este usuario
        const existingLeague = await prisma.league.findFirst({
          where: {
            leaderId: userId,
            name: leagueName,
          },
        });

        if (existingLeague) {
          console.log(`✅ Liga ya existe: ${existingLeague.name} (${existingLeague.code})`);
        } else {
          console.log(`\n❓ ¿Crear liga premium "${leagueName}" para este pago? (s/n)`);
          
          // Para este script, crear automáticamente
          const code = generateUniqueCode();
          
          const newLeague = await prisma.league.create({
            data: {
              name: leagueName,
              code,
              leaderId: userId,
              currentJornada: 10,
              division: 'primera',
              isPremium: true,
              members: { create: { userId, points: 0 } },
            },
          });

          console.log(`\n✅ Liga creada exitosamente:`);
          console.log(`   Nombre: ${newLeague.name}`);
          console.log(`   Código: ${newLeague.code}`);
          console.log(`   Premium: ${newLeague.isPremium}`);
          console.log(`   ID: ${newLeague.id}`);
        }
      }
      console.log('');
    }

    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recoverPayment();
