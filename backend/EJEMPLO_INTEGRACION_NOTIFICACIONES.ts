/**
 * EJEMPLO: Cómo integrar notificaciones en jornada.controller.ts
 * 
 * Este archivo muestra cómo modificar tus funciones existentes para enviar notificaciones
 * cuando se abre o cierra una jornada.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { JornadaService } from '../services/jornada.service.js';
import { NotificationService } from '../services/notification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class JornadaControllerWithNotifications {
  /**
   * EJEMPLO: Cambiar jornada y enviar notificaciones
   * 
   * Asume que tienes una función que cambia la jornada actual
   * y actualiza el estado (open/closed)
   */
  static async cambiarJornada(
    request: FastifyRequest<{
      Params: { leagueId: string };
      Body: { nuevaJornada: number; estado: 'open' | 'closed' };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { leagueId } = request.params;
      const { nuevaJornada, estado } = request.body;

      // 1. Actualizar la jornada en la base de datos
      const league = await prisma.league.update({
        where: { id: leagueId },
        data: {
          currentJornada: nuevaJornada,
          jornadaStatus: estado,
        },
      });

      // 2. Enviar notificación según el estado
      if (estado === 'open') {
        // JORNADA ABIERTA - Enviar notificación
        try {
          const devices = await prisma.deviceToken.findMany({
            where: { ligaId: leagueId },
          });

          if (devices.length > 0) {
            const tokens = devices.map(d => d.token);
            await NotificationService.sendToMultiple(
              tokens,
              '⚽ ¡Nueva jornada disponible!',
              `La jornada ${nuevaJornada} ya está abierta. ¡Haz tus apuestas!`,
              {
                type: 'jornada-abierta',
                ligaId: leagueId,
                jornada: nuevaJornada.toString(),
              }
            );
            console.log(`✅ Notificación de jornada abierta enviada a ${tokens.length} dispositivos`);
          }
        } catch (notifError) {
          console.error('❌ Error al enviar notificación de jornada abierta:', notifError);
          // No fallar la operación si falla la notificación
        }
      } else if (estado === 'closed') {
        // JORNADA CERRADA - Enviar notificación
        try {
          const devices = await prisma.deviceToken.findMany({
            where: { ligaId: leagueId },
          });

          if (devices.length > 0) {
            const tokens = devices.map(d => d.token);
            await NotificationService.sendToMultiple(
              tokens,
              '🔒 Jornada cerrada',
              `La jornada ${nuevaJornada} ha finalizado. ¡Revisa tus resultados!`,
              {
                type: 'jornada-cerrada',
                ligaId: leagueId,
                jornada: nuevaJornada.toString(),
              }
            );
            console.log(`✅ Notificación de jornada cerrada enviada a ${tokens.length} dispositivos`);
          }
        } catch (notifError) {
          console.error('❌ Error al enviar notificación de jornada cerrada:', notifError);
          // No fallar la operación si falla la notificación
        }
      }

      return reply.status(200).send({
        success: true,
        message: `Jornada ${nuevaJornada} actualizada a estado: ${estado}`,
        data: league,
      });
    } catch (error: any) {
      console.error('Error en cambiarJornada:', error);
      return reply.status(500).send({ error: error.message });
    }
  }

  /**
   * EJEMPLO: Resetear jornada con notificación
   * 
   * Modifica tu función existente de reset para incluir notificaciones
   */
  static async resetJornadaLeagueWithNotification(
    request: FastifyRequest<{
      Params: { leagueId: string };
      Body: { jornada: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { leagueId } = request.params;
      const { jornada } = request.body;

      if (!jornada || jornada < 1) {
        return reply.status(400).send({ error: 'Jornada inválida' });
      }

      // 1. Resetear jornada (tu lógica existente)
      const result = await JornadaService.resetJornada(leagueId, jornada);

      // 2. Actualizar estado a cerrado
      await prisma.league.update({
        where: { id: leagueId },
        data: { jornadaStatus: 'closed' },
      });

      // 3. Enviar notificación de jornada cerrada
      try {
        const devices = await prisma.deviceToken.findMany({
          where: { ligaId: leagueId },
        });

        if (devices.length > 0) {
          const tokens = devices.map(d => d.token);
          await NotificationService.sendToMultiple(
            tokens,
            '🔒 Jornada cerrada',
            `La jornada ${jornada} ha finalizado. ¡Revisa tus resultados!`,
            {
              type: 'jornada-cerrada',
              ligaId: leagueId,
              jornada: jornada.toString(),
            }
          );
          console.log(`✅ Notificación enviada a ${tokens.length} dispositivos`);
        }
      } catch (notifError) {
        console.error('❌ Error al enviar notificación:', notifError);
      }

      // Convertir Map a objeto para JSON
      const balancesObj: any = {};
      result.balances.forEach((value, key) => {
        balancesObj[key] = value;
      });

      return reply.status(200).send({
        success: true,
        message: `Jornada ${jornada} procesada y notificaciones enviadas`,
        data: {
          evaluatedBets: result.evaluations.length,
          updatedMembers: result.updatedMembers,
          balances: balancesObj,
        },
      });
    } catch (error: any) {
      console.error('Error en resetJornadaLeague:', error);
      return reply.status(500).send({ error: error.message });
    }
  }

  /**
   * EJEMPLO: Abrir nueva jornada con notificación
   */
  static async abrirNuevaJornada(
    request: FastifyRequest<{
      Params: { leagueId: string };
      Body: { jornada: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { leagueId } = request.params;
      const { jornada } = request.body;

      // 1. Actualizar jornada a estado abierto
      const league = await prisma.league.update({
        where: { id: leagueId },
        data: {
          currentJornada: jornada,
          jornadaStatus: 'open',
        },
      });

      // 2. Enviar notificación de jornada abierta
      try {
        const devices = await prisma.deviceToken.findMany({
          where: { ligaId: leagueId },
        });

        if (devices.length > 0) {
          const tokens = devices.map(d => d.token);
          await NotificationService.sendToMultiple(
            tokens,
            '⚽ ¡Nueva jornada disponible!',
            `La jornada ${jornada} ya está abierta. ¡Haz tus apuestas!`,
            {
              type: 'jornada-abierta',
              ligaId: leagueId,
              jornada: jornada.toString(),
            }
          );
          console.log(`✅ Notificación de jornada abierta enviada a ${tokens.length} dispositivos`);
        }
      } catch (notifError) {
        console.error('❌ Error al enviar notificación:', notifError);
      }

      return reply.status(200).send({
        success: true,
        message: `Jornada ${jornada} abierta y notificaciones enviadas`,
        data: league,
      });
    } catch (error: any) {
      console.error('Error en abrirNuevaJornada:', error);
      return reply.status(500).send({ error: error.message });
    }
  }
}

/**
 * NOTAS DE IMPLEMENTACIÓN:
 * 
 * 1. Importa NotificationService donde lo necesites
 * 2. Las notificaciones se envían de forma asíncrona
 * 3. Los errores de notificación NO deben bloquear la operación principal
 * 4. Siempre envuelve las llamadas a notificaciones en try-catch
 * 5. Los tokens se obtienen de la tabla device_token en la base de datos
 */
