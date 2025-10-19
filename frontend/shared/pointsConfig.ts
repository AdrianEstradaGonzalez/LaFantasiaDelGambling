/**
 * CONFIGURACIÓN CENTRALIZADA DEL SISTEMA DE PUNTUACIÓN
 * 
 * Este archivo contiene todas las reglas de puntuación para DreamLeague.
 * Modificar aquí para cambiar el sistema de puntos en toda la aplicación.
 * 
 * NOTA: Este archivo se sincroniza con ../shared/pointsConfig.ts del proyecto raíz
 */

// Minutos mínimos para bonus de portería a cero
export const CLEAN_SHEET_MINUTES = 60;

// ========== PUNTOS BASE (TODAS LAS POSICIONES) ==========
export const BASE_POINTS = {
  // Minutos jugados
  MINUTES_UNDER_45: 1,
  MINUTES_45_OR_MORE: 2,
  
  // Asistencias
  ASSIST: 3,
  
  // Tarjetas
  YELLOW_CARD: -1,
  RED_CARD: -3,
  
  // Penaltis
  PENALTY_WON: 2,
  PENALTY_COMMITTED: -2,
  PENALTY_SCORED: 3,
  PENALTY_MISSED: -2,
  
  // Valoración del partido (rating)
  RATING_9_PLUS: 3,
  RATING_8_TO_9: 2,
  RATING_7_TO_8: 1,
};

// ========== PUNTOS ESPECÍFICOS: PORTERO ==========
export const GOALKEEPER_POINTS = {
  // Goles
  GOAL: 10,
  
  // Portería a cero (>= 60 min sin goles encajados)
  CLEAN_SHEET: 5,
  
  // Goles encajados
  GOAL_CONCEDED: -2,
  
  // Paradas
  SAVE: 1,
  
  // Penaltis
  PENALTY_SAVED: 5,
  
  // Recuperaciones
  INTERCEPTIONS_PER_POINT: 5, // Cada 5 intercepciones = 1 punto
};

// ========== PUNTOS ESPECÍFICOS: DEFENSA ==========
export const DEFENDER_POINTS = {
  // Goles
  GOAL: 6,
  
  // Portería a cero (>= 60 min sin goles encajados)
  CLEAN_SHEET: 4,
  
  // Goles encajados
  GOAL_CONCEDED: -1,
  
  // Tiros a puerta
  SHOT_ON_TARGET: 1,
  
  // Duelos ganados
  DUELS_WON_PER_POINT: 2, // Cada 2 duelos ganados = 1 punto
  
  // Recuperaciones
  INTERCEPTIONS_PER_POINT: 5, // Cada 5 intercepciones = 1 punto
};

// ========== PUNTOS ESPECÍFICOS: CENTROCAMPISTA ==========
export const MIDFIELDER_POINTS = {
  // Goles
  GOAL: 5,
  
  // Portería a cero (>= 60 min sin goles encajados)
  CLEAN_SHEET: 1,
  
  // Goles encajados
  GOALS_CONCEDED_PER_PENALTY: 2, // Cada 2 goles encajados = -1 punto
  
  // Tiros a puerta
  SHOT_ON_TARGET: 1,
  
  // Pases clave
  KEY_PASSES_PER_POINT: 2, // Cada 2 pases clave = 1 punto
  
  // Regates exitosos
  DRIBBLES_SUCCESS_PER_POINT: 2, // Cada 2 regates = 1 punto
  
  // Faltas recibidas
  FOULS_DRAWN_PER_POINT: 3, // Cada 3 faltas recibidas = 1 punto
  
  // Recuperaciones
  INTERCEPTIONS_PER_POINT: 3, // Cada 3 intercepciones = 1 punto
};

// ========== PUNTOS ESPECÍFICOS: DELANTERO ==========
export const ATTACKER_POINTS = {
  // Goles
  GOAL: 4,
  
  // Tiros a puerta
  SHOT_ON_TARGET: 1,
  
  // Pases clave
  KEY_PASSES_PER_POINT: 2, // Cada 2 pases clave = 1 punto
  
  // Regates exitosos
  DRIBBLES_SUCCESS_PER_POINT: 2, // Cada 2 regates = 1 punto
  
  // Faltas recibidas
  FOULS_DRAWN_PER_POINT: 3, // Cada 3 faltas recibidas = 1 punto
};

// ========== TIPOS ==========
export type Role = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';

// ========== FUNCIONES DE NORMALIZACIÓN ==========

/**
 * Mapa de normalización de roles
 */
const roleMap: Record<string, Role> = {
  // Portero
  'gk': 'Goalkeeper',
  'goalkeeper': 'Goalkeeper',
  'g': 'Goalkeeper',
  'portero': 'Goalkeeper',
  'por': 'Goalkeeper',
  
  // Defensa
  'defender': 'Defender',
  'd': 'Defender',
  'df': 'Defender',
  'def': 'Defender',
  'back': 'Defender',
  'lb': 'Defender',
  'rb': 'Defender',
  'cb': 'Defender',
  'defensa': 'Defender',
  
  // Centrocampista
  'midfielder': 'Midfielder',
  'm': 'Midfielder',
  'mf': 'Midfielder',
  'mid': 'Midfielder',
  'cm': 'Midfielder',
  'dm': 'Midfielder',
  'am': 'Midfielder',
  'centrocampista': 'Midfielder',
  'medio': 'Midfielder',
  'cen': 'Midfielder',
  
  // Delantero
  'winger': 'Attacker',
  'wing': 'Attacker',
  'forward': 'Attacker',
  'attacker': 'Attacker',
  'f': 'Attacker',
  'fw': 'Attacker',
  'cf': 'Attacker',
  'st': 'Attacker',
  'delantero': 'Attacker',
  'del': 'Attacker',
  'att': 'Attacker',
};

/**
 * Normaliza una posición/rol a uno de los 4 roles canónicos
 */
export function normalizeRole(position?: string | null): Role {
  if (!position) return 'Midfielder'; // Por defecto
  const key = position.trim().toLowerCase();
  return roleMap[key] ?? 'Midfielder';
}

/**
 * Mapea códigos de rol de plantilla a roles canónicos
 * @param roleCode - 'POR', 'DEF', 'CEN', 'DEL'
 */
export function mapRoleCodeToCanonical(roleCode: string): Role {
  const mapping: Record<string, Role> = {
    'POR': 'Goalkeeper',
    'DEF': 'Defender',
    'CEN': 'Midfielder',
    'DEL': 'Attacker',
    'GK': 'Goalkeeper',
    'MID': 'Midfielder',
    'ATT': 'Attacker',
  };
  return mapping[roleCode.toUpperCase()] || 'Midfielder';
}
