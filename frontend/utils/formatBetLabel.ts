// Traducir tipos de apuesta de inglés a español
function translateBetType(type: string): string {
  const translations: Record<string, string> = {
    // Goles
    'AWAY TEAM SCORE A GOAL': 'Equipo Visitante Marca Gol',
    'HOME TEAM SCORE A GOAL': 'Equipo Local Marca Gol',
    'BOTH TEAMS SCORE': 'Ambos Equipos Marcan',
    'GOALS OVER/UNDER': 'Goles Más/Menos',
    'TOTAL GOALS': 'Total de Goles',
    
    // Resultado
    'MATCH WINNER': 'Ganador del Partido',
    'DOUBLE CHANCE': 'Doble Oportunidad',
    'DRAW NO BET': 'Empate Anula Apuesta',
    
    // Tarjetas
    'CARDS OVER/UNDER': 'Tarjetas Más/Menos',
    'YELLOW CARDS': 'Tarjetas Amarillas',
    'RED CARDS': 'Tarjetas Rojas',
    
    // Córners
    'CORNERS OVER/UNDER': 'Córners Más/Menos',
    'TOTAL CORNERS': 'Total de Córners',
    
    // Portería
    'CLEAN SHEET - HOME': 'Portería a Cero - Local',
    'CLEAN SHEET - AWAY': 'Portería a Cero - Visitante',
    
    // Partes
    'FIRST HALF': 'Primera Parte',
    'SECOND HALF': 'Segunda Parte',
  };

  // Intentar traducción directa
  const upperType = type.toUpperCase();
  if (translations[upperType]) {
    return translations[upperType];
  }

  // Traducción parcial para tipos compuestos
  let translatedType = type;
  Object.entries(translations).forEach(([eng, esp]) => {
    const regex = new RegExp(eng, 'gi');
    translatedType = translatedType.replace(regex, esp);
  });

  return translatedType;
}

// Small helper to produce a clear bet label including the market when label is terse
// e.g. converts "Si"/"No" or "Más de 1.5" into "Ambos marcan" / "No marcan ambos" or
// "Más de 1.5 goles" depending on the market type.
export default function formatLabelWithType(rawLabel: string | undefined, type?: string) {
  if (!rawLabel) return rawLabel ?? '';
  const label = rawLabel.trim();
  const l = label.toLowerCase();

  // Traducir el tipo de apuesta si viene en inglés
  const translatedType = type ? translateBetType(type) : type;

  // detect if betType mentions first/second half and create a suffix
  const tt = (translatedType || '').toLowerCase();
  let partSuffix = '';
  if (/\b(primera|1ª|1a|first|1st)\b/i.test(tt)) partSuffix = ' - 1ª parte';
  else if (/\b(segunda|2ª|2a|second|2nd)\b/i.test(tt)) partSuffix = ' - 2ª parte';

  // If label already contains a clear unit/word, return as-is but still add part when appropriate
  const hasUnit = /\b(goles|tarjetas|c[oó]rners|c[oó]rner|c[oó]rnes|porteri?a|goles totales|córners|tarjeta|faltas|tiros a puerta|ambos|resultado)\b/i.test(l);
  if (hasUnit) {
    // if type indicates a part and label doesn't already include it, append the part suffix
    if (partSuffix && !/1ª parte|2ª parte|primera|segunda/i.test(label)) return `${label}${partSuffix}`;
    return label;
  }

  // Common cases where label is just "Si" / "No" for boolean markets
  const booleanYes = /^(si|sí|yes|true)$/i.test(label);
  const booleanNo = /^(no|not|false)$/i.test(label);

  // Handle boolean markets with special formatting
  if ((booleanYes || booleanNo) && translatedType) {
    // try to detect team (Local/Visitante) from the bet type itself, e.g. "Portería a Cero - Local"
    const teamFromTypeMatch = /-\s*(local|visitante|home|away)\b/i.exec(translatedType || '');
    let teamFromType = '';
    if (teamFromTypeMatch) {
      const t = teamFromTypeMatch[1].toLowerCase();
      if (/local|home/.test(t)) teamFromType = 'Local';
      else if (/visitante|away/.test(t)) teamFromType = 'Visitante';
    }
    // Ambos marcan: show as "Marcan ambos - Si/No" (and include part if present)
    if (tt.includes('ambos') || tt.includes('both') || tt.includes('both teams')) {
      return `Marcan ambos${partSuffix} - ${booleanYes ? 'Si' : 'No'}`;
    }

    // Portería a cero: attempt to detect Local/Visitante from rawLabel
    if (tt.includes('porteri') || tt.includes('portería') || tt.includes('porteria')) {
      // prefer team detected in type (e.g. "Portería a Cero - Local"), fallback to rawLabel
      const teamMatch = /\b(local|visitante|home|away|local team|away team)\b/i.exec(label);
      let team = teamFromType || '';
      if (!team && teamMatch) {
        const t = teamMatch[0].toLowerCase();
        if (/local|home/.test(t)) team = 'Local';
        else if (/visitante|away/.test(t)) team = 'Visitante';
      }
      if (team) return `${team} Portería a 0${partSuffix} - ${booleanYes ? 'Si' : 'No'}`;
      return `Portería a 0${partSuffix} - ${booleanYes ? 'Si' : 'No'}`;
    }

    // Resultado-like markets
    if (tt.includes('resultado') || tt.includes('resultado exacto') || tt.includes('resultado final')) {
      return booleanYes ? `Resultado${partSuffix} - Si` : `Resultado${partSuffix} - No`;
    }

    // Fallback for boolean markets: prefix the market name and append the part
    return booleanYes ? `${translatedType}${partSuffix} - Si` : `${translatedType}${partSuffix} - No`;
  }

  // If label contains explicit words like 'más de' or a number, append unit based on type and part
  const isOverUnder = /más de|menos de|more than|less than|over|under/i.test(l);
  const hasNumber = /[0-9]+(\.[0-9]+)?/.test(l);

  const mapUnit = (t?: string) => {
    if (!t) return '';
    const ttt = t.toLowerCase();
    if (ttt.includes('tarjeta')) return ' tarjetas';
    if (ttt.includes('córner') || ttt.includes('corner') || ttt.includes('c[oó]rners')) return ' córners';
    if (ttt.includes('goles')) return ' goles';
    if (ttt.includes('resultado')) return '';
    return '';
  };

  const unit = mapUnit(translatedType);
  if ((isOverUnder || hasNumber) && unit) {
    // Avoid duplicating if label already ends with number or unit-like word
    if (new RegExp(unit.trim() + '$', 'i').test(label)) {
      return partSuffix ? `${label}${partSuffix}` : label;
    }
    return `${label}${unit}${partSuffix}`;
  }

  // Default: if none of the above matched, try to make label clearer by prefixing the type and append part
  if (translatedType) return `${translatedType}${partSuffix} - ${label}`;
  return label;
}
