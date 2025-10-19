/**
 * CALCULADORA DE PUNTOS DREAMLEAGUE
 * 
 * Este servicio centraliza toda la lógica de cálculo de puntos.
 * Usar tanto en backend como en frontend para consistencia total.
 */

import {
  BASE_POINTS,
  GOALKEEPER_POINTS,
  DEFENDER_POINTS,
  MIDFIELDER_POINTS,
  ATTACKER_POINTS,
  CLEAN_SHEET_MINUTES,
  Role,
  normalizeRole,
} from './pointsConfig';

export { normalizeRole, Role };

/**
 * Estructura de breakdown de puntos (para mostrar detalles)
 */
export interface PointsBreakdownEntry {
  label: string;
  amount: number | string;
  points: number;
}

/**
 * Resultado del cálculo de puntos
 */
export interface PointsResult {
  total: number;
  breakdown: PointsBreakdownEntry[];
}

/**
 * FUNCIÓN PRINCIPAL: Calcula los puntos de un jugador
 * 
 * @param stats - Estadísticas del jugador (formato API-Football)
 * @param role - Rol del jugador (Goalkeeper, Defender, Midfielder, Attacker)
 * @returns Total de puntos y breakdown detallado
 */
export function calculatePlayerPoints(stats: any, role: Role): PointsResult {
  if (!stats || !stats.games) {
    return { total: 0, breakdown: [] };
  }

  const breakdown: PointsBreakdownEntry[] = [];
  let total = 0;

  // Helper para agregar puntos al breakdown
  const add = (label: string, amount: number | string | undefined, points: number) => {
    if (points === 0) return;
    breakdown.push({ label, amount: amount ?? 0, points: Math.trunc(points) });
    total += points;
  };

  // ========== PUNTOS BASE (TODAS LAS POSICIONES) ==========
  
  const minutes = Number(stats.games?.minutes ?? 0);
  const meetsCleanSheetMinutes = minutes >= CLEAN_SHEET_MINUTES;

  // Minutos jugados
  let minutesPoints = 0;
  if (minutes > 0 && minutes < 45) {
    minutesPoints = BASE_POINTS.MINUTES_UNDER_45;
  } else if (minutes >= 45) {
    minutesPoints = BASE_POINTS.MINUTES_45_OR_MORE;
  }
  if (minutesPoints !== 0) add('Minutos jugados', minutes, minutesPoints);

  const goals = stats.goals || {};
  const cards = stats.cards || {};
  const penalty = stats.penalty || {};
  const passes = stats.passes || {};
  const shots = stats.shots || {};
  const dribbles = stats.dribbles || {};
  const tackles = stats.tackles || {};
  const duels = stats.duels || {};
  const fouls = stats.fouls || {};

  // Asistencias (todas las posiciones)
  if (goals.assists) add('Asistencias', goals.assists, goals.assists * BASE_POINTS.ASSIST);

  // Tarjetas (todas las posiciones)
  if (cards.yellow) add('Tarjetas amarillas', cards.yellow, cards.yellow * BASE_POINTS.YELLOW_CARD);
  if (cards.red) add('Tarjetas rojas', cards.red, cards.red * BASE_POINTS.RED_CARD);

  // Penaltis generales (todas las posiciones)
  if (penalty.won) add('Penaltis ganados', penalty.won, penalty.won * BASE_POINTS.PENALTY_WON);
  if (penalty.committed) add('Penaltis cometidos', penalty.committed, penalty.committed * BASE_POINTS.PENALTY_COMMITTED);
  if (penalty.scored) add('Penaltis marcados', penalty.scored, penalty.scored * BASE_POINTS.PENALTY_SCORED);
  if (penalty.missed) add('Penaltis fallados', penalty.missed, penalty.missed * BASE_POINTS.PENALTY_MISSED);

  // ========== PUNTOS ESPECÍFICOS POR POSICIÓN ==========

  if (role === 'Goalkeeper') {
    // Goles marcados
    const goalsScored = goals.total || 0;
    if (goalsScored) add('Goles marcados', goalsScored, goalsScored * GOALKEEPER_POINTS.GOAL_SCORED);

    // Goles encajados y portería a cero
    const conceded = Number(stats.goalkeeper?.conceded ?? goals.conceded ?? 0);
    if (meetsCleanSheetMinutes && conceded === 0) {
      add('Portería a cero', 'Sí', GOALKEEPER_POINTS.CLEAN_SHEET);
    }
    if (conceded > 0) {
      add('Goles encajados', conceded, conceded * GOALKEEPER_POINTS.GOAL_CONCEDED);
    }

    // Paradas
    const saves = Number(stats.goalkeeper?.saves ?? goals.saves ?? 0);
    if (saves) add('Paradas', saves, saves * GOALKEEPER_POINTS.SAVE);

    // Penaltis parados
    const savedPens = Number(penalty.saved ?? stats.goalkeeper?.saved ?? 0);
    if (savedPens) add('Penaltis parados', savedPens, savedPens * GOALKEEPER_POINTS.PENALTY_SAVED);

    // Intercepciones
    const interceptions = Number(tackles.interceptions || 0);
    const interceptionPoints = Math.floor(interceptions / GOALKEEPER_POINTS.INTERCEPTIONS_PER_POINT);
    if (interceptionPoints) add('Recuperaciones', interceptions, interceptionPoints);

  } else if (role === 'Defender') {
    // Goles marcados
    const goalsScored = goals.total || 0;
    if (goalsScored) add('Goles marcados', goalsScored, goalsScored * DEFENDER_POINTS.GOAL_SCORED);

    // Goles encajados y portería a cero
    const conceded = Number(goals.conceded ?? stats.goalkeeper?.conceded ?? 0);
    if (meetsCleanSheetMinutes && conceded === 0) {
      add('Portería a cero', 'Sí', DEFENDER_POINTS.CLEAN_SHEET);
    }
    if (conceded > 0) {
      add('Goles encajados', conceded, conceded * DEFENDER_POINTS.GOAL_CONCEDED);
    }

    // Tiros a puerta
    const shotsOn = Number(shots.on || 0);
    if (shotsOn) add('Tiros a puerta', shotsOn, shotsOn * DEFENDER_POINTS.SHOT_ON_TARGET);

    // Duelos ganados
    const duelsWon = Number(duels.won || 0);
    const duelPoints = Math.floor(duelsWon / DEFENDER_POINTS.DUELS_WON_PER_POINT);
    if (duelPoints) add('Duelos ganados', duelsWon, duelPoints);

    // Intercepciones
    const interceptions = Number(tackles.interceptions || 0);
    const interceptionPoints = Math.floor(interceptions / DEFENDER_POINTS.INTERCEPTIONS_PER_POINT);
    if (interceptionPoints) add('Intercepciones', interceptions, interceptionPoints);

  } else if (role === 'Midfielder') {
    // Goles marcados
    const goalsScored = goals.total || 0;
    if (goalsScored) add('Goles marcados', goalsScored, goalsScored * MIDFIELDER_POINTS.GOAL_SCORED);

    // Portería a cero
    const conceded = Number(goals.conceded ?? 0);
    if (meetsCleanSheetMinutes && conceded === 0) {
      add('Portería a cero', 'Sí', MIDFIELDER_POINTS.CLEAN_SHEET);
    }

    // Goles encajados (cada 2 goles = -1 punto)
    if (conceded > 0) {
      const concededPoints = -Math.floor(conceded / MIDFIELDER_POINTS.GOALS_CONCEDED_PER_MINUS_POINT);
      if (concededPoints) add('Goles encajados', conceded, concededPoints);
    }

    // Tiros a puerta
    const shotsOn = Number(shots.on || 0);
    if (shotsOn) add('Tiros a puerta', shotsOn, shotsOn * MIDFIELDER_POINTS.SHOT_ON_TARGET);

    // Pases clave
    const passesKey = Number(passes.key || 0);
    const passPoints = Math.floor(passesKey / MIDFIELDER_POINTS.KEY_PASSES_PER_POINT);
    if (passPoints) add('Pases clave', passesKey, passPoints);

    // Regates exitosos
    const dribblesSuccess = Number(dribbles.success || 0);
    const dribblePoints = Math.floor(dribblesSuccess / MIDFIELDER_POINTS.DRIBBLES_SUCCESS_PER_POINT);
    if (dribblePoints) add('Regates exitosos', dribblesSuccess, dribblePoints);

    // Faltas recibidas
    const foulsDrawn = Number(fouls.drawn || 0);
    const foulPoints = Math.floor(foulsDrawn / MIDFIELDER_POINTS.FOULS_DRAWN_PER_POINT);
    if (foulPoints) add('Faltas recibidas', foulsDrawn, foulPoints);

    // Intercepciones
    const interceptions = Number(tackles.interceptions || 0);
    const interceptionPoints = Math.floor(interceptions / MIDFIELDER_POINTS.INTERCEPTIONS_PER_POINT);
    if (interceptionPoints) add('Intercepciones', interceptions, interceptionPoints);

  } else if (role === 'Attacker') {
    // Goles marcados
    const goalsScored = goals.total || 0;
    if (goalsScored) add('Goles marcados', goalsScored, goalsScored * ATTACKER_POINTS.GOAL_SCORED);

    // Tiros a puerta
    const shotsOn = Number(shots.on || 0);
    if (shotsOn) add('Tiros a puerta', shotsOn, shotsOn * ATTACKER_POINTS.SHOT_ON_TARGET);

    // Pases clave
    const passesKey = Number(passes.key || 0);
    const passPoints = Math.floor(passesKey / ATTACKER_POINTS.KEY_PASSES_PER_POINT);
    if (passPoints) add('Pases clave', passesKey, passPoints);

    // Regates exitosos
    const dribblesSuccess = Number(dribbles.success || 0);
    const dribblePoints = Math.floor(dribblesSuccess / ATTACKER_POINTS.DRIBBLES_SUCCESS_PER_POINT);
    if (dribblePoints) add('Regates exitosos', dribblesSuccess, dribblePoints);

    // Faltas recibidas
    const foulsDrawn = Number(fouls.drawn || 0);
    const foulPoints = Math.floor(foulsDrawn / ATTACKER_POINTS.FOULS_DRAWN_PER_POINT);
    if (foulPoints) add('Faltas recibidas', foulsDrawn, foulPoints);
  }

  // ========== VALORACIÓN DEL PARTIDO (TODAS LAS POSICIONES) ==========
  
  const rawRating = stats.games?.rating;
  if (rawRating != null && rawRating !== '') {
    const rating = Number(rawRating);
    if (!Number.isNaN(rating)) {
      let ratingPoints = 0;
      if (rating >= 9) {
        ratingPoints = BASE_POINTS.RATING_9_OR_MORE;
      } else if (rating >= 8) {
        ratingPoints = BASE_POINTS.RATING_8_TO_9;
      } else if (rating >= 7) {
        ratingPoints = BASE_POINTS.RATING_7_TO_8;
      }
      if (ratingPoints) add('Valoración del partido', rating.toFixed(1), ratingPoints);
    }
  }

  return { total: Math.trunc(total), breakdown };
}

/**
 * Calcula solo el total de puntos (sin breakdown)
 */
export function calculatePlayerPointsTotal(stats: any, role: Role): number {
  return calculatePlayerPoints(stats, role).total;
}
