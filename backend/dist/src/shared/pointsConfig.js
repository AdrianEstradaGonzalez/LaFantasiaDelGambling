/**
 * CONFIGURACIÓN CENTRALIZADA DEL SISTEMA DE PUNTUACIÓN
 *
 * Este archivo contiene todas las reglas de puntuación para DreamLeague.
 * Modificar aquí para cambiar el sistema de puntos en toda la aplicación.
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
    // Penaltis (general)
    PENALTY_WON: 2,
    PENALTY_COMMITTED: -2,
    PENALTY_SCORED: 3,
    PENALTY_MISSED: -2,
    // Valoración del partido (desactivada)
    RATING_8_OR_MORE: 0,
    RATING_65_TO_8: 0,
    RATING_5_TO_65: 0,
};
// ========== PUNTOS ESPECÍFICOS POR POSICIÓN ==========
export const GOALKEEPER_POINTS = {
    // Goles
    GOAL_SCORED: 10,
    // Portería a cero (solo si jugó >= CLEAN_SHEET_MINUTES)
    CLEAN_SHEET: 5,
    // Paradas
    SAVE: 1,
    // Goles encajados
    GOAL_CONCEDED: -2,
    // Penaltis parados
    PENALTY_SAVED: 5,
    // Intercepciones (cada X intercepciones = 1 punto)
    INTERCEPTIONS_PER_POINT: 5,
};
export const DEFENDER_POINTS = {
    // Goles
    GOAL_SCORED: 6,
    // Portería a cero (solo si jugó >= CLEAN_SHEET_MINUTES)
    CLEAN_SHEET: 4,
    // Goles encajados
    GOAL_CONCEDED: -1,
    // Tiros a puerta
    SHOT_ON_TARGET: 1,
    // Duelos ganados (cada X duelos = 1 punto)
    DUELS_WON_PER_POINT: 2,
    // Intercepciones (cada X intercepciones = 1 punto)
    INTERCEPTIONS_PER_POINT: 5,
};
export const MIDFIELDER_POINTS = {
    // Goles
    GOAL_SCORED: 5,
    // Portería a cero (solo si jugó >= CLEAN_SHEET_MINUTES)
    CLEAN_SHEET: 1,
    // Goles encajados (cada X goles = -1 punto)
    GOALS_CONCEDED_PER_MINUS_POINT: 2,
    // Tiros a puerta
    SHOT_ON_TARGET: 1,
    // Pases clave (cada X pases = 1 punto)
    KEY_PASSES_PER_POINT: 2,
    // Regates exitosos (cada X regates = 1 punto)
    DRIBBLES_SUCCESS_PER_POINT: 2,
    // Faltas recibidas (cada X faltas = 1 punto)
    FOULS_DRAWN_PER_POINT: 3,
    // Intercepciones (cada X intercepciones = 1 punto)
    INTERCEPTIONS_PER_POINT: 3,
};
export const ATTACKER_POINTS = {
    // Goles
    GOAL_SCORED: 4,
    // Tiros a puerta
    SHOT_ON_TARGET: 1,
    // Pases clave (cada X pases = 1 punto)
    KEY_PASSES_PER_POINT: 2,
    // Regates exitosos (cada X regates = 1 punto)
    DRIBBLES_SUCCESS_PER_POINT: 2,
    // Faltas recibidas (cada X faltas = 1 punto)
    FOULS_DRAWN_PER_POINT: 3,
};
/**
 * Normaliza una posición de string a un rol canónico
 */
export function normalizeRole(position) {
    if (!position)
        return 'Midfielder';
    const roleMap = {
        // Portero
        gk: 'Goalkeeper',
        goalkeeper: 'Goalkeeper',
        g: 'Goalkeeper',
        por: 'Goalkeeper',
        portero: 'Goalkeeper',
        // Defensa
        defender: 'Defender',
        d: 'Defender',
        df: 'Defender',
        def: 'Defender',
        back: 'Defender',
        lb: 'Defender',
        rb: 'Defender',
        cb: 'Defender',
        dc: 'Defender',
        dl: 'Defender',
        dr: 'Defender',
        // Centrocampista
        midfielder: 'Midfielder',
        m: 'Midfielder',
        mf: 'Midfielder',
        mid: 'Midfielder',
        cen: 'Midfielder',
        cm: 'Midfielder',
        dm: 'Midfielder',
        am: 'Midfielder',
        // Delantero
        winger: 'Attacker',
        wing: 'Attacker',
        forward: 'Attacker',
        attacker: 'Attacker',
        f: 'Attacker',
        cf: 'Attacker',
        st: 'Attacker',
        del: 'Attacker',
        att: 'Attacker',
        lw: 'Attacker',
        rw: 'Attacker',
    };
    const key = position.trim().toLowerCase();
    return roleMap[key] ?? 'Midfielder';
}
/**
 * Mapea códigos de rol legacy a roles canónicos
 */
export function mapRoleCodeToCanonical(roleCode) {
    const mapping = {
        'POR': 'Goalkeeper',
        'GK': 'Goalkeeper',
        'DEF': 'Defender',
        'CEN': 'Midfielder',
        'MID': 'Midfielder',
        'DEL': 'Attacker',
        'ATT': 'Attacker',
    };
    return mapping[roleCode.toUpperCase()] ?? 'Midfielder';
}
