/**
 * Mapeo de tipos de apuestas a configuración de API-Football
 *
 * API-Football Endpoints:
 * - /fixtures: Información del partido (winner, score, etc.)
 * - /statistics: Estadísticas del partido (corners, shots, cards, etc.)
 * - /odds: Cuotas y resultados de apuestas
 */
/**
 * Mapea el tipo de apuesta y label a la configuración de API
 */
export function mapBetToApiConfig(betType, betLabel, homeTeam, awayTeam) {
    const typeNorm = betType.toLowerCase().trim();
    const labelNorm = betLabel.toLowerCase().trim();
    // ========== RESULTADO DEL PARTIDO ==========
    // API Bet ID: 1 - Match Winner
    if (typeNorm.includes('resultado') || typeNorm.includes('ganador')) {
        if (labelNorm.includes('ganar') && labelNorm.includes(homeTeam.toLowerCase())) {
            return {
                apiBetId: 1,
                apiEndpoint: 'fixtures',
                apiStatKey: 'teams.home.winner',
                apiOperator: 'equals',
                apiValue: 'true'
            };
        }
        if (labelNorm.includes('ganar') && labelNorm.includes(awayTeam.toLowerCase())) {
            return {
                apiBetId: 1,
                apiEndpoint: 'fixtures',
                apiStatKey: 'teams.away.winner',
                apiOperator: 'equals',
                apiValue: 'true'
            };
        }
        if (labelNorm.includes('empate')) {
            return {
                apiBetId: 1,
                apiEndpoint: 'fixtures',
                apiStatKey: 'teams.home.winner',
                apiOperator: 'equals',
                apiValue: 'null'
            };
        }
    }
    // ========== GOLES TOTALES ==========
    // API Bet ID: 5 - Goals Over/Under
    if (typeNorm.includes('goles totales')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            if (labelNorm.includes('más de')) {
                return {
                    apiBetId: 5,
                    apiEndpoint: 'fixtures',
                    apiStatKey: 'goals.total',
                    apiOperator: 'greater_than',
                    apiValue: threshold
                };
            }
            if (labelNorm.includes('menos de')) {
                return {
                    apiBetId: 5,
                    apiEndpoint: 'fixtures',
                    apiStatKey: 'goals.total',
                    apiOperator: 'less_than',
                    apiValue: threshold
                };
            }
        }
    }
    // ========== GOLES EXACTOS ==========
    // API Bet ID: 29 - Exact Goals Number
    if (typeNorm.includes('goles exactos')) {
        const match = betLabel.match(/(\d+)/);
        if (match) {
            return {
                apiBetId: 29,
                apiEndpoint: 'fixtures',
                apiStatKey: 'goals.total',
                apiOperator: 'equals',
                apiValue: match[1]
            };
        }
    }
    // ========== AMBOS EQUIPOS MARCAN ==========
    // API Bet ID: 8 - Both Teams Score
    if (typeNorm.includes('ambos marcan')) {
        if (labelNorm.includes('ambos equipos marcarán')) {
            return {
                apiBetId: 8,
                apiEndpoint: 'fixtures',
                apiStatKey: 'score.fulltime.home,score.fulltime.away',
                apiOperator: 'both_greater_zero',
                apiValue: '0'
            };
        }
        if (labelNorm.includes('al menos un equipo no marcará')) {
            return {
                apiBetId: 8,
                apiEndpoint: 'fixtures',
                apiStatKey: 'score.fulltime.home,score.fulltime.away',
                apiOperator: 'at_least_one_zero',
                apiValue: '0'
            };
        }
    }
    // ========== DOBLE OPORTUNIDAD (ELIMINADO) ==========
    // Double chance eliminado - redundante con 'Resultado'
    // ========== CÓRNERS ==========
    // API Bet ID: 61 - Corners Over/Under
    if (typeNorm.includes('córner') || typeNorm.includes('corner')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            if (labelNorm.includes('más de')) {
                return {
                    apiBetId: 61,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Corner Kicks.total',
                    apiOperator: 'greater_than',
                    apiValue: threshold
                };
            }
            if (labelNorm.includes('menos de')) {
                return {
                    apiBetId: 61,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Corner Kicks.total',
                    apiOperator: 'less_than',
                    apiValue: threshold
                };
            }
        }
        if (typeNorm.includes('exactos')) {
            const match = betLabel.match(/(\d+)/);
            if (match) {
                return {
                    apiBetId: 65,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Corner Kicks.total',
                    apiOperator: 'equals',
                    apiValue: match[1]
                };
            }
        }
        if (typeNorm.includes('par/impar')) {
            return {
                apiBetId: null,
                apiEndpoint: 'statistics',
                apiStatKey: 'Corner Kicks.total',
                apiOperator: labelNorm.includes('impar') ? 'odd' : 'even',
                apiValue: '0'
            };
        }
    }
    // ========== TARJETAS ==========
    // API Bet ID: 52 - Cards Over/Under
    if (typeNorm.includes('tarjeta')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            if (labelNorm.includes('más de')) {
                return {
                    apiBetId: 52,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Yellow Cards.total,Red Cards.total',
                    apiOperator: 'sum_greater_than',
                    apiValue: threshold
                };
            }
            if (labelNorm.includes('menos de')) {
                return {
                    apiBetId: 52,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Yellow Cards.total,Red Cards.total',
                    apiOperator: 'sum_less_than',
                    apiValue: threshold
                };
            }
        }
        if (typeNorm.includes('exactas')) {
            const match = betLabel.match(/(\d+)/);
            if (match) {
                return {
                    apiBetId: 81,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Yellow Cards.total,Red Cards.total',
                    apiOperator: 'sum_equals',
                    apiValue: match[1]
                };
            }
        }
        if (typeNorm.includes('par/impar')) {
            return {
                apiBetId: null,
                apiEndpoint: 'statistics',
                apiStatKey: 'Yellow Cards.total,Red Cards.total',
                apiOperator: labelNorm.includes('impar') ? 'sum_odd' : 'sum_even',
                apiValue: '0'
            };
        }
    }
    // ========== PAR/IMPAR (GOLES) ==========
    // API Bet ID: 10 - Odd/Even
    if (typeNorm.includes('par/impar') && !typeNorm.includes('córner') && !typeNorm.includes('tarjeta')) {
        return {
            apiBetId: 10,
            apiEndpoint: 'fixtures',
            apiStatKey: 'goals.total',
            apiOperator: labelNorm.includes('impar') ? 'odd' : 'even',
            apiValue: '0'
        };
    }
    // ========== PORTERÍA A CERO ==========
    // API Bet ID: 26 - Home Clean Sheet, 27 - Away Clean Sheet
    if (typeNorm.includes('portería a cero')) {
        if (labelNorm.includes(homeTeam.toLowerCase()) && labelNorm.includes('no recibirá')) {
            return {
                apiBetId: 26,
                apiEndpoint: 'fixtures',
                apiStatKey: 'goals.away',
                apiOperator: 'equals',
                apiValue: '0'
            };
        }
        if (labelNorm.includes(awayTeam.toLowerCase()) && labelNorm.includes('no recibirá')) {
            return {
                apiBetId: 27,
                apiEndpoint: 'fixtures',
                apiStatKey: 'goals.home',
                apiOperator: 'equals',
                apiValue: '0'
            };
        }
        if (labelNorm.includes('recibirá al menos')) {
            if (labelNorm.includes(homeTeam.toLowerCase())) {
                return {
                    apiBetId: 26,
                    apiEndpoint: 'fixtures',
                    apiStatKey: 'goals.away',
                    apiOperator: 'greater_than',
                    apiValue: '0'
                };
            }
            if (labelNorm.includes(awayTeam.toLowerCase())) {
                return {
                    apiBetId: 27,
                    apiEndpoint: 'fixtures',
                    apiStatKey: 'goals.home',
                    apiOperator: 'greater_than',
                    apiValue: '0'
                };
            }
        }
    }
    // ========== PRIMERA PARTE ==========
    // API Bet ID: 37 - First Half Goals Over/Under
    if (typeNorm.includes('primera parte')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            if (labelNorm.includes('más de')) {
                return {
                    apiBetId: 37,
                    apiEndpoint: 'fixtures',
                    apiStatKey: 'score.halftime.home,score.halftime.away',
                    apiOperator: 'sum_greater_than',
                    apiValue: threshold
                };
            }
            if (labelNorm.includes('menos de')) {
                return {
                    apiBetId: 37,
                    apiEndpoint: 'fixtures',
                    apiStatKey: 'score.halftime.home,score.halftime.away',
                    apiOperator: 'sum_less_than',
                    apiValue: threshold
                };
            }
        }
    }
    // ========== SEGUNDA PARTE ==========
    // API Bet ID: 38 - Second Half Goals Over/Under
    if (typeNorm.includes('segunda parte')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            // Para segunda parte hay que restar: fulltime - halftime
            return {
                apiBetId: 38,
                apiEndpoint: 'fixtures',
                apiStatKey: 'score.fulltime.home,score.fulltime.away,score.halftime.home,score.halftime.away',
                apiOperator: labelNorm.includes('más de') ? 'second_half_greater_than' : 'second_half_less_than',
                apiValue: threshold
            };
        }
    }
    // ========== FUERAS DE JUEGO ==========
    // API Bet ID: 126 - Offsides Over/Under
    if (typeNorm.includes('fueras de juego') || typeNorm.includes('offside')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            if (labelNorm.includes('más de')) {
                return {
                    apiBetId: 126,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Offsides.total',
                    apiOperator: 'greater_than',
                    apiValue: threshold
                };
            }
            if (labelNorm.includes('menos de')) {
                return {
                    apiBetId: 126,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Offsides.total',
                    apiOperator: 'less_than',
                    apiValue: threshold
                };
            }
        }
    }
    // ========== TIROS A PUERTA ==========
    // API Bet ID: 207 - Shots On Goal Over/Under
    if (typeNorm.includes('tiros a puerta')) {
        const match = betLabel.match(/(\d+\.?\d*)/);
        if (match) {
            const threshold = match[1];
            if (labelNorm.includes('más de')) {
                return {
                    apiBetId: 207,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Shots on Goal.total',
                    apiOperator: 'greater_than',
                    apiValue: threshold
                };
            }
            if (labelNorm.includes('menos de')) {
                return {
                    apiBetId: 207,
                    apiEndpoint: 'statistics',
                    apiStatKey: 'Shots on Goal.total',
                    apiOperator: 'less_than',
                    apiValue: threshold
                };
            }
        }
    }
    // ========== FALLBACK: Configuración genérica ==========
    console.warn(`⚠️ Tipo de apuesta no mapeado: ${betType} - ${betLabel}`);
    return {
        apiBetId: null,
        apiEndpoint: 'fixtures',
        apiStatKey: 'unknown',
        apiOperator: 'unknown',
        apiValue: betLabel
    };
}
