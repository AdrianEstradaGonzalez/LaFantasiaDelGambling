import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Line, Circle, Rect, Text as SvgText, Path } from 'react-native-svg';
import FootballService from '../../services/FutbolService';
import { PlayerService } from '../../services/PlayerService';
import { SquadService } from '../../services/SquadService';
import { JornadaService } from '../../services/JornadaService';
import LoadingScreen from '../../components/LoadingScreen';
import { CustomAlertManager } from '../../components/CustomAlert';
import { SafeLayout } from '../../components/SafeLayout';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeftIcon, ChartBarIcon, TargetIcon, FootballIcon, CheckCircleIcon, AlertCircleIcon, AlertIcon, InformationIcon, HomeIcon, ChevronRightIcon, TrophyStarIcon, ChartBarIcon as StatsIcon, TrendingIcon, ShieldCheckIcon, CleanSheetIcon } from '../../components/VectorIcons';
// Importar nuevo servicio de estadísticas (backend-first)
import { PlayerStatsService, type PlayerStats } from '../../services/PlayerStatsService';
import { AuthDebug } from '../../utils/authDebug';

type CanonicalPos = 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';

const normalizePosition = (pos?: string): CanonicalPos | undefined => {
  if (!pos) return undefined;
  const p = pos.trim().toLowerCase();
  
  if (p === 'goalkeeper' || p.includes('goal') || p.includes('keeper')) return 'Goalkeeper';
  if (p === 'defender' || p.includes('defen') || p.includes('back')) return 'Defender';
  if (p === 'midfielder' || p.includes('midfield') || p.includes('midf') || p === 'mid') return 'Midfielder';
  if (p === 'attacker' || p.includes('attack') || p.includes('forward') || p.includes('striker') || p.includes('wing')) return 'Attacker';
  
  return undefined;
};

const posColors: Record<CanonicalPos, string> = {
  Goalkeeper: '#f59e0b',
  Defender: '#3b82f6',
  Midfielder: '#10b981',
  Attacker: '#ef4444',
};

const posAbbr: Record<CanonicalPos, string> = {
  Goalkeeper: 'POR',
  Defender: 'DEF',
  Midfielder: 'CEN',
  Attacker: 'DEL',
};

interface PlayerDetailProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
}

interface MatchdayPoints {
  matchday: number;
  points: number;
  stats: PlayerStats | null;
}

export const PlayerDetailAdvanced: React.FC<PlayerDetailProps> = ({ navigation, route }) => {
  const { player, ligaId, ligaName, division, budget: initialBudget, isAlreadyInSquad, currentFormation } = route.params || {};
  
  if (!player) {
    return (
      <LinearGradient colors={['#181818ff', '#181818ff']} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#ef4444', fontSize: 16 }}>Error: Jugador no encontrado</Text>
        </View>
      </LinearGradient>
    );
  }
  
  // Si es segunda división, mostrar mensaje temporal
  const isSegundaDivision = division === 'segunda';
  
  const [loading, setLoading] = useState(true);
  const [availableMatchdays, setAvailableMatchdays] = useState<number[]>([]);
  const [matchdayPoints, setMatchdayPoints] = useState<MatchdayPoints[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [playerInSquad, setPlayerInSquad] = useState(isAlreadyInSquad || false);
  const [budget, setBudget] = useState(initialBudget);
  const [activeTab, setActiveTab] = useState<'overview' | 'advanced'>('overview');
  const matchdayScrollRef = useRef<ScrollView>(null);
  
  // Promedios reales por posición desde la BD
  const [positionAverages, setPositionAverages] = useState<any>(null);
  
  // Análisis del próximo rival
  const [nextOpponentAnalysis, setNextOpponentAnalysis] = useState<any>(null);

  const position = normalizePosition(player.position);
  const posColor = position ? posColors[position] : '#64748b';
  const posLabel = position ? posAbbr[position] : 'N/A';

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setLoading(true);
        
        console.log('[PlayerDetail] Iniciando carga de datos para jugador:', player.id, player.name, 'División:', division || 'primera');
        
        // Verificar estado de autenticación
        const authStatus = await AuthDebug.checkAuthStatus();
        if (!authStatus.hasToken) {
          console.error('[PlayerDetail] ¡No hay token de autenticación! El usuario debe iniciar sesión.');
          CustomAlertManager.alert(
            'Sesión expirada',
            'Por favor, inicia sesión nuevamente para ver los detalles del jugador.',
            [{ text: 'OK', onPress: () => {}, style: 'default' }],
            { icon: 'alert-circle', iconColor: '#ef4444' }
          );
          setLoading(false);
          return;
        }

        // 🆕 PASO 1: Obtener estado de la jornada de la liga
        let jornadaStatus: string = 'open';
        let currentJornada: number = 1;
        
        if (ligaId) {
          try {
            const status = await JornadaService.getJornadaStatus(ligaId);
            jornadaStatus = status.status;
            currentJornada = status.currentJornada;
            console.log('[PlayerDetail] Estado de la jornada:', { status: jornadaStatus, currentJornada });
          } catch (error) {
            console.warn('[PlayerDetail] No se pudo obtener el estado de la jornada, asumiendo "open"');
          }
        }
        
        // Obtener jornadas disponibles según la división
        const allMatchdays = await FootballService.getAvailableMatchdays((division || 'primera') as 'primera' | 'segunda');
        console.log(`[PlayerDetail] Jornadas disponibles de ${division === 'segunda' ? 'Segunda' : 'Primera'} División:`, allMatchdays);
        
        // Filtrar solo hasta la jornada actual de la liga
        const matchdays = ligaId 
          ? allMatchdays.filter(j => j <= currentJornada)
          : allMatchdays;
        
        console.log('[PlayerDetail] Jornadas a cargar (hasta jornada actual):', matchdays);
        
        setAvailableMatchdays(matchdays);

        if (!matchdays.length) {
          setMatchdayPoints([]);
          setTotalPoints(0);
          setSelectedMatchday(null);
          return;
        }

        const lastMatchday = matchdays[matchdays.length - 1];

        // 🆕 PASO 2: Determinar si debemos refrescar desde la API
        // Si la jornada está CERRADA, refrescar la última jornada desde la API
        const shouldRefreshLastJornada = jornadaStatus === 'closed';
        
        if (shouldRefreshLastJornada) {
          console.log('[PlayerDetail] 🔄 Jornada CERRADA - Refrescando estadísticas de la última jornada desde API...');
        }

  // Usar PlayerStatsService para obtener estadísticas del backend
        try {
          console.log('[PlayerDetail] Solicitando estadísticas al backend...');
          
          // Cargar estadísticas individualmente para cada jornada
          const statsArray: (PlayerStats | null)[] = [];
          
          for (const matchday of matchdays) {
            try {
              // Refrescar solo si es la última jornada y está cerrada
              const isLastMatchday = matchday === matchdays[matchdays.length - 1];
              const shouldRefresh = isLastMatchday && shouldRefreshLastJornada;
              
              const stats = await PlayerStatsService.getPlayerJornadaStats(
                player.id,
                matchday,
                { refresh: shouldRefresh }
              );
              
              statsArray.push(stats);
            } catch (error) {
              console.warn(`[PlayerDetail] No se pudieron cargar stats para jornada ${matchday}, usando null`);
              statsArray.push(null);
            }
          }

          if (shouldRefreshLastJornada) {
            console.log('[PlayerDetail] Estadísticas de jornada cerrada actualizadas desde API');
          }

          const pointsData: MatchdayPoints[] = matchdays.map((matchday, index) => {
            const stats = statsArray[index];
            const jornadaPoints = stats?.totalPoints ?? 0;
            
            // Debug: verificar puntos de cada jornada
            if (stats) {
              console.log(`[PlayerDetail] Jornada ${matchday}: ${jornadaPoints} pts`, stats);
            }
            
            return {
              matchday,
              points: jornadaPoints,
              stats: stats,
            };
          });

          const total = pointsData.reduce((sum, item) => sum + item.points, 0);
          console.log('[PlayerDetail] Estadísticas obtenidas. Total de puntos:', total);
          console.log('[PlayerDetail] Desglose por jornada:', pointsData.map(p => `J${p.matchday}: ${p.points}pts`).join(', '));

          setMatchdayPoints(pointsData);
          setTotalPoints(total);
          setSelectedMatchday(lastMatchday);
          
          // 🆕 Cargar promedios reales por posición
          try {
            const averages = await PlayerStatsService.getAveragesByPosition();
            console.log('[PlayerDetail] Promedios por posición cargados:', averages);
            setPositionAverages(averages);
          } catch (error) {
            console.warn('[PlayerDetail] Error cargando promedios:', error);
          }
          
          // 🆕 Cargar análisis del próximo rival
          // Si la jornada está cerrada, analizar la siguiente (currentJornada + 1)
          // Si está abierta, analizar la actual
          try {
            const jornadaParaAnalisis = jornadaStatus === 'closed' ? currentJornada + 1 : currentJornada;
            console.log('[PlayerDetail] Analizando rival para jornada:', jornadaParaAnalisis, 'Estado:', jornadaStatus);
            const analysis = await PlayerStatsService.getNextOpponentAnalysis(player.id, jornadaParaAnalisis);
            console.log('[PlayerDetail] Análisis del próximo rival cargado:', analysis);
            setNextOpponentAnalysis(analysis);
          } catch (error) {
            console.warn('[PlayerDetail] Error cargando análisis del próximo rival:', error);
          }
        } catch (error) {
          console.error('[PlayerDetail] Error obteniendo estadísticas del backend:', error);
          console.error('[PlayerDetail] Detalles del error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          
          // Fallback: mostrar sin datos
          const emptyPoints: MatchdayPoints[] = matchdays.map((matchday) => ({
            matchday,
            points: 0,
            stats: null,
          }));

          setMatchdayPoints(emptyPoints);
          setTotalPoints(0);
          setSelectedMatchday(lastMatchday);
        }
      } catch (error) {
        console.error('[PlayerDetail] Error cargando datos del jugador:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlayerData();
  }, [player.id, ligaId]);

  useEffect(() => {
    if (selectedMatchday == null) return;
    const current = matchdayPoints.find((mp) => mp.matchday === selectedMatchday);
    if (!current || current.stats) return;

    let cancelled = false;

    (async () => {
      try {
        console.log('[PlayerDetail] Solicitando estadísticas para jornada:', selectedMatchday);
  // NUEVO: Obtener stats específicas del backend
        const stats = await PlayerStatsService.getPlayerJornadaStats(
          player.id,
          selectedMatchday,
          { refresh: false }
        );

        if (cancelled) return;

        console.log('[PlayerDetail] Estadísticas de jornada obtenidas:', stats.totalPoints);

        setMatchdayPoints((prev) =>
          prev.map((mp) =>
            mp.matchday === selectedMatchday 
              ? { ...mp, stats, points: stats.totalPoints } 
              : mp
          )
        );

        // Actualizar total si los puntos cambiaron
        if (stats.totalPoints !== current.points) {
          setTotalPoints((prev) => prev + stats.totalPoints - current.points);
        }
      } catch (error) {
        console.error('[PlayerDetail] Error obteniendo estadísticas de la jornada seleccionada:', error);
        console.error('[PlayerDetail] Detalles del error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          jornada: selectedMatchday
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedMatchday, matchdayPoints, player.id]);

  // Scroll automático a la última jornada cuando se carguen los datos
  useEffect(() => {
    if (matchdayPoints.length > 0 && matchdayScrollRef.current && !loading) {
      // Esperar un poco para que el ScrollView se renderice completamente
      setTimeout(() => {
        matchdayScrollRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [matchdayPoints.length, loading]);

  // Auto-scroll a la derecha cuando se carguen las jornadas
  useEffect(() => {
    if (matchdayPoints.length > 0 && matchdayScrollRef.current) {
      setTimeout(() => {
        matchdayScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [matchdayPoints]);

  const [jornadaStatus, setJornadaStatus] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (ligaId) {
          const status = await JornadaService.getJornadaStatus(ligaId);
          if (mounted) setJornadaStatus((status.status as 'open' | 'closed'));
        }
      } catch (e) {
        console.warn('No se pudo obtener estado de jornada:', e);
      }
    })();
    return () => { mounted = false; };
  }, [ligaId]);

  // Función para fichar jugador
  const handleBuyPlayer = async () => {
    if (!ligaId) return;
    if (playerInSquad) return;
    if (jornadaStatus === 'closed') return; // bloqueado
    if (budget !== undefined && player.price > budget) return;

    try {
      setIsBuying(true);

      const playerPosition = normalizePosition(player.position);
      if (!playerPosition) return;

      const roleMap: Record<CanonicalPos, string> = {
        'Goalkeeper': 'POR',
        'Defender': 'DEF',
        'Midfielder': 'CEN',
        'Attacker': 'DEL'
      };
      const role = roleMap[playerPosition];

      const squad = await SquadService.getUserSquad(ligaId);
      
      const allPositionsByRole: Record<string, string[]> = {
        'POR': ['por'],
        'DEF': ['def1', 'def2', 'def3', 'def4', 'def5'],
        'CEN': ['cen1', 'cen2', 'cen3', 'cen4', 'cen5'],
        'DEL': ['del1', 'del2', 'del3']
      };

      const availablePositions = allPositionsByRole[role] || [];
      
      const occupiedPositions = new Set(
        squad?.players
          .filter(p => p.role === role)
          .map(p => p.position) || []
      );

      const squadPosition = availablePositions.find(pos => !occupiedPositions.has(pos));

      if (!squadPosition) {
        CustomAlertManager.alert(
          'Sin espacio', 
          `No hay espacio disponible para ${role === 'POR' ? 'porteros' : role === 'DEF' ? 'defensas' : role === 'CEN' ? 'centrocampistas' : 'delanteros'} en tu plantilla.`,
          [{ text: 'OK', onPress: () => {}, style: 'default' }],
          { icon: 'alert-circle', iconColor: '#f59e0b' }
        );
        return;
      }

      const result = await SquadService.addPlayerToSquad(ligaId, {
        position: squadPosition,
        playerId: player.id,
        playerName: player.name,
        role,
        pricePaid: player.price,
        currentFormation // Enviar la formación actual si está disponible
      });

      if (!result.success) {
        CustomAlertManager.alert(
          'Error', 
          result.message || 'No se puede añadir más jugadores de esta posición',
          [{ text: 'OK', onPress: () => {}, style: 'default' }],
          { icon: 'alert-circle', iconColor: '#ef4444' }
        );
        return;
      }

      setPlayerInSquad(true);
      // Actualizar presupuesto con el valor devuelto por el servicio
      if (result.budget !== undefined) {
        setBudget(result.budget);
      }

      CustomAlertManager.alert(
        'Fichaje exitoso',
        `${player.name} ha sido fichado correctamente`,
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'check-circle', iconColor: '#10b981' }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al fichar jugador';
      CustomAlertManager.alert(
        'Error', 
        message,
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setIsBuying(false);
    }
  };

  // Función para vender jugador
  const handleSellPlayer = async () => {
    if (!ligaId) return;
    if (jornadaStatus === 'closed') return; // bloqueado

    try {
      setIsBuying(true);
      
      const squad = await SquadService.getUserSquad(ligaId);
      if (!squad) return;

      const playerInSquadData = squad.players.find(p => p.playerId === player.id);
      if (!playerInSquadData) return;

      await SquadService.removePlayerFromSquad(ligaId, playerInSquadData.position);
      
      setPlayerInSquad(false);
      if (budget !== undefined) {
        setBudget(budget + playerInSquadData.pricePaid);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al vender jugador';
      CustomAlertManager.alert(
        'Error', 
        message,
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setIsBuying(false);
    }
  };

  // NUEVO: Helper para obtener puntos de una estadística del breakdown
  const getPointsFromBreakdown = (breakdown: any[] | null | undefined, statLabel: string): number | string => {
    if (!breakdown || !Array.isArray(breakdown)) return '-';
    
    // Buscar en el breakdown por label (insensible a mayúsculas/minúsculas)
    const entry = breakdown.find((item: any) => 
      item.label?.toLowerCase().includes(statLabel.toLowerCase())
    );
    
    return entry ? entry.points : 0;
  };

  // Componente para mostrar una fila de estadística con 3 columnas
  const StatRow = ({ 
    cantidad, 
    estadistica, 
    puntos
  }: { 
    cantidad: number | string; 
    estadistica: string; 
    puntos: number | string;
  }) => {
    const puntosNum = typeof puntos === 'string' ? 0 : puntos;
    const puntosDisplay = typeof puntos === 'string' ? puntos : (puntos > 0 ? `+${puntos}` : puntos);
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#334155'
      }}>
        <View style={{ width: 70, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {cantidad}
          </Text>
        </View>
        
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontSize: 14 }}>
            {estadistica}
          </Text>
        </View>
        
        <View style={{ width: 70, alignItems: 'center' }}>
          <View style={{
            backgroundColor: puntosNum > 0 ? '#10b98120' : puntosNum < 0 ? '#ef444420' : '#64748b20',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            minWidth: 50,
            alignItems: 'center'
          }}>
            <Text style={{ 
              color: puntosNum > 0 ? '#10b981' : puntosNum < 0 ? '#ef4444' : '#64748b', 
              fontSize: 14, 
              fontWeight: '800' 
            }}>
              {puntosDisplay}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const selectedData = selectedMatchday !== null 
    ? matchdayPoints.find(mp => mp.matchday === selectedMatchday)
    : null;

  // Componente de Gráfico de Evolución de Puntos (MEJORADO)
  const EvolutionChart = () => {
    if (matchdayPoints.length === 0) return null;

    const chartWidth = 340;
    const chartHeight = 220;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // DEBUG: Mostrar los datos que se están graficando
    console.log('[EvolutionChart] Datos del gráfico:', matchdayPoints.map(mp => ({ j: mp.matchday, pts: mp.points })));

    // Calcular estadísticas
    const points = matchdayPoints.map(mp => mp.points);
    const maxPoints = Math.max(...points, 10);
    const minPoints = Math.min(...points, -5);
    const pointsRange = maxPoints - minPoints || 10;
    const avgPoints = points.reduce((a, b) => a + b, 0) / points.length;

    // Función para escalar coordenadas
    const scaleX = (index: number) => padding.left + (index / (matchdayPoints.length - 1)) * innerWidth;
    const scaleY = (pts: number) => padding.top + innerHeight - ((pts - minPoints) / pointsRange) * innerHeight;

    // Generar path del gráfico
    const pathData = matchdayPoints.map((mp, index) => {
      const x = scaleX(index);
      const y = scaleY(mp.points);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    // Generar path del área bajo la línea
    const areaPathData = pathData + 
      ` L ${scaleX(matchdayPoints.length - 1)} ${scaleY(0)}` +
      ` L ${padding.left} ${scaleY(0)} Z`;

    // Línea del promedio
    const avgY = scaleY(avgPoints);
    
    // Línea del cero (siempre visible)
    const zeroY = scaleY(0);

    // Etiquetas del eje Y (incluir siempre el 0 + valor intermedio)
    const midPointAboveZero = maxPoints / 2; // Punto medio entre 0 y el máximo
    const yLabels = [
      { value: maxPoints, y: padding.top },
      { value: midPointAboveZero, y: scaleY(midPointAboveZero) },
      { value: 0, y: zeroY },
      { value: minPoints, y: padding.top + innerHeight }
    ];

    return (
      <View style={{ backgroundColor: '#0b1a2e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TargetIcon size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 }}>
            EVOLUCIÓN DE PUNTOS
          </Text>
        </View>
        <Text style={{ color: '#94a3b8', fontSize: 11, lineHeight: 16 }}>
          Rendimiento a lo largo de las {matchdayPoints.length} jornadas • Promedio: {avgPoints.toFixed(1)} pts
        </Text>

        <View style={{ alignItems: 'center' }}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid horizontal */}
            {yLabels.map((label, i) => (
              <React.Fragment key={i}>
                <Line 
                  x1={padding.left} 
                  y1={label.y} 
                  x2={chartWidth - padding.right} 
                  y2={label.y} 
                  stroke={label.value === 0 ? '#64748b' : '#334155'} 
                  strokeWidth={label.value === 0 ? '2' : '1'} 
                  strokeDasharray={label.value === 0 ? '0' : '3,3'} 
                  opacity={label.value === 0 ? 0.8 : 0.5}
                />
              </React.Fragment>
            ))}

            {/* Línea del promedio */}
            <Line 
              x1={padding.left} 
              y1={avgY} 
              x2={chartWidth - padding.right} 
              y2={avgY} 
              stroke="#f59e0b" 
              strokeWidth="1.5" 
              strokeDasharray="5,5" 
            />

            {/* Área bajo la línea (gradiente) */}
            <Path d={areaPathData} fill="#0892D020" />

            {/* Línea del gráfico */}
            <Path d={pathData} stroke="#0892D0" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Puntos en el gráfico */}
            {matchdayPoints.map((mp, index) => {
              const x = scaleX(index);
              const y = scaleY(mp.points);
              const isSelected = selectedMatchday === mp.matchday;
              const isPositive = mp.points > avgPoints;
              
              return (
                <React.Fragment key={mp.matchday}>
                  {/* Punto */}
                  <Circle 
                    cx={x} 
                    cy={y} 
                    r={isSelected ? 7 : 5} 
                    fill={isPositive ? '#10b981' : mp.points >= 0 ? '#0892D0' : '#ef4444'} 
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                  {/* Anillo de selección */}
                  {isSelected && (
                    <Circle cx={x} cy={y} r={10} fill="none" stroke="#0892D0" strokeWidth="2" opacity={0.6} />
                  )}
                </React.Fragment>
              );
            })}

            {/* Etiquetas del eje Y */}
            {yLabels.map((label, i) => (
              <SvgText 
                key={i}
                x={padding.left - 8} 
                y={label.y + 4} 
                fill="#94a3b8" 
                fontSize="11" 
                fontWeight="600"
                textAnchor="end"
              >
                {label.value.toFixed(0)}
              </SvgText>
            ))}

            {/* Etiquetas del eje X */}
            {matchdayPoints.filter((_, i) => {
              // Mostrar primera, última y 2-3 intermedias con espaciado uniforme
              if (i === 0 || i === matchdayPoints.length - 1) return true;
              const step = Math.max(2, Math.floor(matchdayPoints.length / 4));
              return i % step === 0;
            }).map((mp) => {
              const index = matchdayPoints.indexOf(mp);
              const x = scaleX(index);
              return (
                <SvgText 
                  key={mp.matchday}
                  x={x} 
                  y={chartHeight - 15} 
                  fill="#94a3b8" 
                  fontSize="10" 
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {mp.matchday}
                </SvgText>
              );
            })}

            {/* Etiqueta del promedio */}
            <SvgText 
              x={chartWidth - padding.right + 5} 
              y={avgY + 4} 
              fill="#f59e0b" 
              fontSize="10" 
              fontWeight="700"
              textAnchor="start"
            >
              Prom
            </SvgText>

            {/* Título del eje Y */}
            <SvgText 
              x={15} 
              y={chartHeight / 2} 
              fill="#64748b" 
              fontSize="10" 
              fontWeight="700"
              textAnchor="middle"
              transform={`rotate(-90, 15, ${chartHeight / 2})`}
            >
              PUNTOS
            </SvgText>

            {/* Título del eje X */}
            <SvgText 
              x={chartWidth / 2} 
              y={chartHeight - 3} 
              fill="#64748b" 
              fontSize="10" 
              fontWeight="700"
              textAnchor="middle"
            >
              JORNADAS
            </SvgText>
          </Svg>
        </View>

        {/* Leyenda */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', marginRight: 6 }} />
            <Text style={{ color: '#94a3b8', fontSize: 10 }}>Sobre promedio</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0892D0', marginRight: 6 }} />
            <Text style={{ color: '#94a3b8', fontSize: 10 }}>Positivos</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 6 }} />
            <Text style={{ color: '#94a3b8', fontSize: 10 }}>Negativos</Text>
          </View>
        </View>
      </View>
    );
  };

  // Componente de Gráfico Radar de Rendimiento (NUEVO)
  const PerformanceRadarChart = () => {
    if (matchdayPoints.length === 0) return null;

    // Calcular estadísticas agregadas
    const jornadasJugadas = matchdayPoints.filter(mp => mp.stats && (mp.stats.minutes ?? 0) > 0);
    if (jornadasJugadas.length === 0) return null;

    const totalMinutos = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.minutes ?? 0), 0);
    const partidosCompletos = totalMinutos / 90;

    // Calcular métricas normalizadas (0-100)
    let metrics: { label: string; value: number; maxValue: number; description: string }[] = [];

    if (position === 'Goalkeeper') {
      const totalParadas = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.saves ?? 0), 0);
      const totalGolesEncajados = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.conceded ?? 0), 0);
      const porteriasACero = jornadasJugadas.filter(mp => (mp.stats?.conceded ?? 0) === 0 && (mp.stats?.minutes ?? 0) >= 60).length;
      const tirosRecibidos = totalParadas + totalGolesEncajados;
      const savePercentage = tirosRecibidos > 0 ? (totalParadas / tirosRecibidos) * 100 : 0;
      const golesEncajadosPorPartido = totalGolesEncajados / partidosCompletos;
      
      // Fiabilidad mejorada: 
      // - 0 goles/partido = 100 (perfecto)
      // - 0.5 goles/partido = 60 (bueno)
      // - 1 gol/partido = 20 (malo)
      // - 2+ goles/partido = 0 (muy malo)
      const fiabilidad = Math.max(0, Math.min(100, 100 - (golesEncajadosPorPartido * 80)));

      metrics = [
        { label: 'Paradas', value: (totalParadas / partidosCompletos) * 20, maxValue: 100, description: `${(totalParadas / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Save %', value: savePercentage, maxValue: 100, description: `${savePercentage.toFixed(0)}%` },
        { label: 'P. a Cero', value: (porteriasACero / jornadasJugadas.length) * 100, maxValue: 100, description: `${porteriasACero}/${jornadasJugadas.length}` },
        { label: 'Fiabilidad', value: fiabilidad, maxValue: 100, description: `${golesEncajadosPorPartido.toFixed(1)} goles/p` },
        { label: 'Minutos', value: (totalMinutos / (jornadasJugadas.length * 90)) * 100, maxValue: 100, description: `${(totalMinutos / jornadasJugadas.length).toFixed(0)} min` },
      ];
    } else if (position === 'Defender') {
      const totalIntercepciones = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.tacklesInterceptions ?? 0), 0);
      const totalEntradas = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.tacklesTotal ?? 0), 0);
      const totalDuelosGanados = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.duelsWon ?? 0), 0);
      const totalBloqueos = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.tacklesBlocks ?? 0), 0);
      const porteriasACero = jornadasJugadas.filter(mp => (mp.stats?.conceded ?? 0) === 0 && (mp.stats?.minutes ?? 0) >= 60).length;

      metrics = [
        { label: 'Intercepciones', value: (totalIntercepciones / partidosCompletos) * 15, maxValue: 100, description: `${(totalIntercepciones / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Entradas', value: (totalEntradas / partidosCompletos) * 15, maxValue: 100, description: `${(totalEntradas / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Duelos', value: (totalDuelosGanados / partidosCompletos) * 10, maxValue: 100, description: `${(totalDuelosGanados / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Bloqueos', value: (totalBloqueos / partidosCompletos) * 30, maxValue: 100, description: `${(totalBloqueos / partidosCompletos).toFixed(1)}/partido` },
        { label: 'P. a Cero', value: (porteriasACero / jornadasJugadas.length) * 100, maxValue: 100, description: `${porteriasACero}/${jornadasJugadas.length}` },
        { label: 'Minutos', value: (totalMinutos / (jornadasJugadas.length * 90)) * 100, maxValue: 100, description: `${(totalMinutos / jornadasJugadas.length).toFixed(0)} min` },
      ];
    } else if (position === 'Midfielder') {
      const totalGoles = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.goals ?? 0), 0);
      const totalAsistencias = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.assists ?? 0), 0);
      const totalPasesClave = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.passesKey ?? 0), 0);
      const totalTiros = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.shotsOn ?? 0), 0);
      const totalDuelosGanados = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.duelsWon ?? 0), 0);

      metrics = [
        { label: 'Goles', value: (totalGoles / partidosCompletos) * 100, maxValue: 100, description: `${(totalGoles / partidosCompletos).toFixed(2)}/partido` },
        { label: 'Asistencias', value: (totalAsistencias / partidosCompletos) * 100, maxValue: 100, description: `${(totalAsistencias / partidosCompletos).toFixed(2)}/partido` },
        { label: 'Creatividad', value: (totalPasesClave / partidosCompletos) * 20, maxValue: 100, description: `${(totalPasesClave / partidosCompletos).toFixed(1)} p.clave/p` },
        { label: 'Tiros', value: (totalTiros / partidosCompletos) * 25, maxValue: 100, description: `${(totalTiros / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Duelos', value: (totalDuelosGanados / partidosCompletos) * 10, maxValue: 100, description: `${(totalDuelosGanados / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Minutos', value: (totalMinutos / (jornadasJugadas.length * 90)) * 100, maxValue: 100, description: `${(totalMinutos / jornadasJugadas.length).toFixed(0)} min` },
      ];
    } else if (position === 'Attacker') {
      const totalGoles = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.goals ?? 0), 0);
      const totalAsistencias = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.assists ?? 0), 0);
      const totalTiros = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.shotsOn ?? 0), 0);
      const totalRegates = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.dribblesSuccess ?? 0), 0);
      const conversionRate = totalTiros > 0 ? (totalGoles / totalTiros) * 100 : 0;

      metrics = [
        { label: 'Goles', value: (totalGoles / partidosCompletos) * 50, maxValue: 100, description: `${(totalGoles / partidosCompletos).toFixed(2)}/partido` },
        { label: 'Asistencias', value: (totalAsistencias / partidosCompletos) * 100, maxValue: 100, description: `${(totalAsistencias / partidosCompletos).toFixed(2)}/partido` },
        { label: 'Tiros', value: (totalTiros / partidosCompletos) * 20, maxValue: 100, description: `${(totalTiros / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Efectividad', value: conversionRate, maxValue: 100, description: `${conversionRate.toFixed(0)}% conversión` },
        { label: 'Regates', value: (totalRegates / partidosCompletos) * 25, maxValue: 100, description: `${(totalRegates / partidosCompletos).toFixed(1)}/partido` },
        { label: 'Minutos', value: (totalMinutos / (jornadasJugadas.length * 90)) * 100, maxValue: 100, description: `${(totalMinutos / jornadasJugadas.length).toFixed(0)} min` },
      ];
    }

    // Limitar valores a 100
    metrics = metrics.map(m => ({ ...m, value: Math.min(m.value, 100) }));

    const chartSize = 280;
    const center = chartSize / 2;
    const radius = 90;
    const numMetrics = metrics.length;
    const angleStep = (Math.PI * 2) / numMetrics;

    // Calcular puntos del polígono
    const points = metrics.map((metric, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = (metric.value / 100) * radius;
      return {
        x: center + Math.cos(angle) * value,
        y: center + Math.sin(angle) * value,
      };
    });

    // Path del polígono de datos
    const dataPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
      <View style={{ backgroundColor: '#0b1a2e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TargetIcon size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 }}>
            RADAR DE RENDIMIENTO
          </Text>
        </View>
        <Text style={{ color: '#94a3b8', fontSize: 11, lineHeight: 16 }}>
          Perfil de habilidades basado en {jornadasJugadas.length} jornadas jugadas
        </Text>
      

        <View style={{ alignItems: 'center' }}>
          <Svg width={chartSize} height={chartSize}>
            {/* Círculos concéntricos de referencia */}
            {[0.25, 0.5, 0.75, 1].map((factor, i) => (
              <Circle 
                key={i}
                cx={center} 
                cy={center} 
                r={radius * factor} 
                fill="none" 
                stroke="#334155" 
                strokeWidth="1" 
                strokeDasharray={i === 3 ? "0" : "3,3"}
                opacity={0.4}
              />
            ))}

            {/* Líneas radiales */}
            {metrics.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x = center + Math.cos(angle) * radius;
              const y = center + Math.sin(angle) * radius;
              return (
                <Line 
                  key={i}
                  x1={center} 
                  y1={center} 
                  x2={x} 
                  y2={y} 
                  stroke="#334155" 
                  strokeWidth="1" 
                  opacity={0.3}
                />
              );
            })}

            {/* Polígono de datos */}
            <Path 
              d={dataPath} 
              fill="#0892D030" 
              stroke="#0892D0" 
              strokeWidth="2.5" 
              strokeLinejoin="round"
            />

            {/* Puntos de datos */}
            {points.map((p, i) => (
              <Circle 
                key={i}
                cx={p.x} 
                cy={p.y} 
                r={5} 
                fill="#0892D0" 
                stroke="#fff"
                strokeWidth="2"
              />
            ))}

            {/* Etiquetas de métricas */}
            {metrics.map((metric, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const labelDistance = radius + 35;
              const x = center + Math.cos(angle) * labelDistance;
              const y = center + Math.sin(angle) * labelDistance;
              
              return (
                <React.Fragment key={i}>
                  <SvgText 
                    x={x} 
                    y={y} 
                    fill="#fff" 
                    fontSize="11" 
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {metric.label}
                  </SvgText>
                  <SvgText 
                    x={x} 
                    y={y + 12} 
                    fill="#64748b" 
                    fontSize="9" 
                    textAnchor="middle"
                  >
                    {metric.description}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Escala de referencia */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          marginTop: 12,
          backgroundColor: '#1e293b',
          borderRadius: 8,
          padding: 10
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <InformationIcon size={14} color="#f59e0b" />
            <Text style={{ color: '#64748b', fontSize: 10, textAlign: 'center', lineHeight: 14, marginLeft: 6 }}>
              Los valores están normalizados de 0-100 para permitir comparación visual entre diferentes métricas
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Componente de Métricas xStats (Expected Stats) - VERSIÓN EXTENDIDA
  const XStatsComponent = () => {
    if (matchdayPoints.length === 0) return null;

    // Calcular estadísticas acumuladas de todas las jornadas con datos
    const jornadasJugadas = matchdayPoints.filter(mp => mp.stats && (mp.stats.minutes ?? 0) > 0);
    
    if (jornadasJugadas.length === 0) return null;

    // Agregación de estadísticas
    const totalMinutos = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.minutes ?? 0), 0);
    const totalGoles = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.goals ?? 0), 0);
    const totalAsistencias = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.assists ?? 0), 0);
    const totalTiros = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.shotsOn ?? 0), 0);
    const totalPasesClave = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.passesKey ?? 0), 0);
    const totalRegates = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.dribblesSuccess ?? 0), 0);
    const totalGolesEncajados = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.conceded ?? 0), 0);
    const totalParadas = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.saves ?? 0), 0);
    const totalIntercepciones = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.tacklesInterceptions ?? 0), 0);
    const totalDuelosGanados = jornadasJugadas.reduce((sum, mp) => sum + (mp.stats?.duelsWon ?? 0), 0);
    
    const partidosCompletos = totalMinutos / 90;
    
    // Contar porterías a cero
    const porteriasACero = jornadasJugadas.filter(mp => {
      const conceded = mp.stats?.conceded ?? 0;
      const minutes = mp.stats?.minutes ?? 0;
      return conceded === 0 && minutes >= 60;
    }).length;

    interface XStatMetric {
      label: string;
      fullName: string;
      actual: number;
      expected: number;
      description: string;
      formula: string;
      interpretation: string;
      // semantic icon key: 'football' | 'target' | 'shield' | 'glove' | 'chart' | 'stats'
      icon: 'football' | 'target' | 'shield' | 'glove' | 'chart' | 'stats';
    }

    let xStatsData: XStatMetric[] = [];

    // Usar promedios reales de la BD si están disponibles, sino usar tasas fijas
    const posAvg = positionAverages?.[position || ''] || {};
    
    if (position === 'Attacker') {
      // Usar tasas de conversión reales o fallback a valores estándar
      const conversionRate = posAvg.conversionRate || 0.30;
      const assistRate = posAvg.assistRate || 0.22;
      
      const xG = totalTiros * conversionRate;
      const xA = totalPasesClave * assistRate;

      xStatsData = [
        {
          label: 'xG',
          fullName: 'Goles Esperados',
          actual: totalGoles,
          expected: parseFloat(xG.toFixed(2)),
          description: `Con ${totalTiros} tiros a puerta en ${partidosCompletos.toFixed(1)} partidos, se esperan ${xG.toFixed(2)} goles`,
          formula: `${totalTiros} tiros × ${(conversionRate * 100).toFixed(1)}% conversión promedio de ${posAvg.totalPlayers || 'todos los'} delanteros`,
          interpretation: totalGoles > xG 
            ? `${((totalGoles / (xG || 1) - 1) * 100).toFixed(0)}% mejor que el promedio de delanteros`
            : totalGoles < xG
            ? `${((1 - totalGoles / (xG || 1)) * 100).toFixed(0)}% por debajo del promedio de delanteros`
            : 'En el promedio de delanteros',
          // Use chart icon for xG to avoid sharing the same football icon used in other headers
          icon: 'chart'
        },
        {
          label: 'xA',
          fullName: 'Asistencias Esperadas',
          actual: totalAsistencias,
          expected: parseFloat(xA.toFixed(2)),
          description: `Con ${totalPasesClave} pases clave generados, se esperan ${xA.toFixed(2)} asistencias`,
          formula: `${totalPasesClave} pases clave × ${(assistRate * 100).toFixed(1)}% conversión promedio de ${posAvg.totalPlayers || 'todos los'} delanteros`,
          interpretation: totalAsistencias > xA
            ? `${((totalAsistencias / (xA || 1) - 1) * 100).toFixed(0)}% mejor que el promedio de delanteros`
            : totalAsistencias < xA
            ? `${((1 - totalAsistencias / (xA || 1)) * 100).toFixed(0)}% por debajo del promedio de delanteros`
            : 'En el promedio de delanteros',
          icon: 'chart'
        }
      ];
    } else if (position === 'Midfielder') {
      // Usar tasas reales de la BD
      const assistRate = posAvg.assistRate || 0.27;
      const conversionRate = posAvg.conversionRate || 0.20;
      
      const xA = totalPasesClave * assistRate;
      const xG = totalTiros * conversionRate;

      xStatsData = [
        {
          label: 'xA',
          fullName: 'Asistencias Esperadas',
          actual: totalAsistencias,
          expected: parseFloat(xA.toFixed(2)),
          description: `Con ${totalPasesClave} pases clave en ${partidosCompletos.toFixed(1)} partidos, se esperan ${xA.toFixed(2)} asistencias`,
          formula: `${totalPasesClave} pases clave × ${(assistRate * 100).toFixed(1)}% conversión promedio de ${posAvg.totalPlayers || 'todos los'} centrocampistas`,
          interpretation: totalAsistencias > xA
            ? `${((totalAsistencias / (xA || 1) - 1) * 100).toFixed(0)}% mejor que el promedio de centrocampistas`
            : totalAsistencias < xA
            ? `${((1 - totalAsistencias / (xA || 1)) * 100).toFixed(0)}% por debajo del promedio de centrocampistas`
            : 'En el promedio de centrocampistas',
          icon: 'chart'
        },
        {
          label: 'xG',
          fullName: 'Goles Esperados',
          actual: totalGoles,
          expected: parseFloat(xG.toFixed(2)),
          description: `Con ${totalTiros} tiros a puerta, se esperan ${xG.toFixed(2)} goles para un centrocampista`,
          formula: `${totalTiros} tiros × ${(conversionRate * 100).toFixed(1)}% conversión promedio de ${posAvg.totalPlayers || 'todos los'} centrocampistas`,
          interpretation: totalGoles > xG
            ? `${((totalGoles / (xG || 1) - 1) * 100).toFixed(0)}% mejor que el promedio de centrocampistas`
            : totalGoles < xG
            ? `${((1 - totalGoles / (xG || 1)) * 100).toFixed(0)}% por debajo del promedio de centrocampistas`
            : 'En el promedio de centrocampistas',
          icon: 'chart'
        }
      ];
    } else if (position === 'Defender') {
      // Usar promedios reales de defensas
      const cleanSheetsRate = posAvg.cleanSheetsPerMatch || 0.30;
      const xCS = partidosCompletos * cleanSheetsRate;

      xStatsData = [
        {
          label: 'xCS',
          fullName: 'Porterías a Cero Esperadas',
          actual: porteriasACero,
          expected: parseFloat(xCS.toFixed(2)),
          description: `En ${partidosCompletos.toFixed(1)} partidos, se esperan ${xCS.toFixed(2)} porterías a cero basado en ${posAvg.totalPlayers || 'todos los'} defensas`,
          formula: `${partidosCompletos.toFixed(1)} partidos × ${(cleanSheetsRate * 100).toFixed(1)}% promedio de clean sheets de defensas`,
          interpretation: porteriasACero > xCS
            ? `${((porteriasACero / (xCS || 1) - 1) * 100).toFixed(0)}% mejor que el promedio de defensas`
            : porteriasACero < xCS
            ? `${((1 - porteriasACero / (xCS || 1)) * 100).toFixed(0)}% por debajo del promedio de defensas`
            : 'En el promedio de defensas',
          icon: 'shield'
        }
      ];
    } else if (position === 'Goalkeeper') {
      // Usar promedios reales de porteros
      const cleanSheetsRate = posAvg.cleanSheetsPerMatch || 0.35;
      let xCS = partidosCompletos * cleanSheetsRate;
      xCS = Math.max(0, Math.min(xCS, partidosCompletos));
      
      const tirosRecibidos = totalParadas + totalGolesEncajados;
      const savePercentage = tirosRecibidos > 0 ? (totalParadas / tirosRecibidos) * 100 : 70;

      xStatsData = [
        {
          label: 'xCS',
          fullName: 'Porterías a Cero Esperadas',
          actual: porteriasACero,
          expected: parseFloat(xCS.toFixed(2)),
          description: `En ${partidosCompletos.toFixed(1)} partidos con ${savePercentage.toFixed(1)}% efectividad, se esperan ${xCS.toFixed(2)} porterías a cero basado en ${posAvg.totalPlayers || 'todos los'} porteros`,
          formula: `${partidosCompletos.toFixed(1)} partidos × ${(cleanSheetsRate * 100).toFixed(1)}% promedio de clean sheets de porteros`,
          interpretation: porteriasACero > xCS
            ? `${((porteriasACero / (xCS || 1) - 1) * 100).toFixed(0)}% mejor que el promedio de porteros`
            : porteriasACero < xCS
            ? `${((1 - porteriasACero / (xCS || 1)) * 100).toFixed(0)}% por debajo del promedio de porteros`
            : 'En el promedio de porteros',
          icon: 'glove'
        }
      ];
    }

    if (xStatsData.length === 0) return null;

    return (
      <View style={{ backgroundColor: '#0b1a2e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TargetIcon size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 }}>
            ANÁLISIS ESTADÍSTICO AVANZADO
          </Text>
        </View>
        <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, lineHeight: 18 }}>
          Comparación entre tu rendimiento real y el esperado según modelos matemáticos basados en {jornadasJugadas.length} jornada{jornadasJugadas.length !== 1 ? 's' : ''} ({partidosCompletos.toFixed(1)} partidos completos)
        </Text>
      

        {xStatsData.map((stat, index) => {
          const diferencia = stat.actual - stat.expected;
          const diferenciaPercentual = stat.expected !== 0 ? ((diferencia / stat.expected) * 100) : 0;
          const performanceColor = diferencia > 0 ? '#10b981' : diferencia < 0 ? '#ef4444' : '#f59e0b';
          const performanceLabel = diferencia > 0 ? 'SOBRE EXPECTATIVA' : diferencia < 0 ? 'BAJO EXPECTATIVA' : 'EN EXPECTATIVA';

          return (
            <View key={stat.label} style={{ marginBottom: index < xStatsData.length - 1 ? 20 : 0 }}>
              {/* Header con icono y nombre */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon === 'football' && <FootballIcon size={28} color="#fff" />}
                  {stat.icon === 'target' && <TargetIcon size={28} color="#fff" />}
                  {stat.icon === 'shield' && <ShieldCheckIcon size={28} color="#fff" />}
                  {stat.icon === 'glove' && <CleanSheetIcon size={28} color="#fff" />}
                  {stat.icon === 'chart' && <ChartBarIcon size={28} color="#fff" />}
                  {!['football','target','shield','glove','chart'].includes(stat.icon) && <StatsIcon size={28} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#0892D0', fontSize: 16, fontWeight: '900' }}>
                    {stat.label} - {stat.fullName}
                  </Text>
                </View>
              </View>

              {/* Comparación visual REAL vs ESPERADO */}
              <View style={{ 
                backgroundColor: '#1e293b', 
                borderRadius: 10, 
                padding: 14,
                marginBottom: 10,
                borderWidth: 2,
                borderColor: performanceColor + '40'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 6, fontWeight: '700' }}>VALOR REAL</Text>
                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', lineHeight: 32 }}>
                      {stat.actual}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
                    <Text style={{ color: '#64748b', fontSize: 20 }}>vs</Text>
                  </View>
                  
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 6, fontWeight: '700' }}>ESPERADO</Text>
                    <Text style={{ color: '#f59e0b', fontSize: 32, fontWeight: '900', lineHeight: 32 }}>
                      {stat.expected}
                    </Text>
                  </View>
                </View>

                {/* Barra de diferencia */}
                <View style={{ marginBottom: 8 }}>
                  <View style={{ 
                    height: 8, 
                    backgroundColor: '#334155', 
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <View style={{
                      position: 'absolute',
                      left: diferencia > 0 ? '50%' : `${50 + diferenciaPercentual}%`,
                      right: diferencia > 0 ? `${50 - Math.min(diferenciaPercentual, 50)}%` : '50%',
                      height: '100%',
                      backgroundColor: performanceColor
                    }} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: performanceColor, fontSize: 11, fontWeight: '800' }}>
                    {performanceLabel}
                  </Text>
                  <Text style={{ color: performanceColor, fontSize: 16, fontWeight: '900' }}>
                    {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)} ({diferenciaPercentual > 0 ? '+' : ''}{diferenciaPercentual.toFixed(0)}%)
                  </Text>
                </View>
              </View>

              {/* Descripción y fórmula */}
              <View style={{ 
                backgroundColor: '#0f172a', 
                borderRadius: 8, 
                padding: 12,
                marginBottom: 10,
                borderLeftWidth: 4,
                borderLeftColor: '#0892D0'
              }}>
                <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 8 }}>
                  {stat.description}
                </Text>
                <View style={{ 
                  backgroundColor: '#1e293b', 
                  padding: 8, 
                  borderRadius: 6,
                  marginBottom: 8
                }}>
                  <Text style={{ color: '#64748b', fontSize: 10, marginBottom: 4, fontWeight: '700' }}>
                    FÓRMULA UTILIZADA:
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                    {stat.formula}
                  </Text>
                </View>
              </View>

              {/* Interpretación */}
              <View style={{ 
                backgroundColor: performanceColor + '20', 
                borderRadius: 8, 
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: performanceColor
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <InformationIcon size={14} color="#f59e0b" />
                  <Text style={{ color: '#64748b', fontSize: 10, marginLeft: 8, fontWeight: '700' }}>
                    INTERPRETACIÓN:
                  </Text>
                </View>
                <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>
                  {stat.interpretation}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Componente de Análisis del Próximo Rival
  const NextOpponentAnalysis = () => {
    if (!nextOpponentAnalysis || !nextOpponentAnalysis.hasNextMatch) {
      return null;
    }

    const analysis = nextOpponentAnalysis;
    const { match, opponentStats, playerStats, prediction } = analysis;

    // Color según dificultad
    const difficultyColor = 
      prediction.difficulty === 'Fácil' ? '#10b981' :
      prediction.difficulty === 'Difícil' ? '#ef4444' :
      '#f59e0b';

    const difficultyIconComponent = 
      prediction.difficulty === 'Fácil' ? <CheckCircleIcon size={32} color={difficultyColor} /> :
      prediction.difficulty === 'Difícil' ? <AlertCircleIcon size={32} color={difficultyColor} /> :
      <ChartBarIcon size={32} color={difficultyColor} />;

    return (
      <View style={{ backgroundColor: '#0b1a2e', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TargetIcon size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 }}>
              ANÁLISIS DEL PRÓXIMO RIVAL
            </Text>
          </View>
          <Text style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>
            Predicción basada en estadísticas reales de ambos equipos en las últimas 5 jornadas
          </Text>
        </View>

        {/* Información del Partido */}
        <View style={{ 
          backgroundColor: '#1e293b', 
          borderRadius: 10, 
          padding: 16,
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#0892D0'
        }}>
          <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700', marginBottom: 12 }}>
            JORNADA {match.jornada}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ 
                color: match.isHome ? '#0892D0' : '#94a3b8', 
                fontSize: 14, 
                fontWeight: '900',
                textAlign: 'center'
              }}>
                {match.playerTeam.name}
              </Text>
              {match.isHome && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <HomeIcon size={12} color="#10b981" />
                  <Text style={{ color: '#10b981', fontSize: 10, marginLeft: 6, fontWeight: '700' }}>
                    LOCAL
                  </Text>
                </View>
              )}
            </View>

            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '900' }}>VS</Text>
            </View>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ 
                color: !match.isHome ? '#0892D0' : '#94a3b8', 
                fontSize: 14, 
                fontWeight: '900',
                textAlign: 'center'
              }}>
                {match.opponent.name}
              </Text>
              {!match.isHome && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <ChevronRightIcon size={12} color="#f59e0b" />
                  <Text style={{ color: '#f59e0b', fontSize: 10, marginLeft: 6, fontWeight: '700' }}>
                    VISITANTE
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ 
            backgroundColor: '#0f172a', 
            borderRadius: 6, 
            padding: 8,
            alignItems: 'center'
          }}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>
              {new Date(match.date).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        {/* Predicción de Puntos */}
        <View style={{ 
          backgroundColor: difficultyColor + '20',
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          borderWidth: 2,
          borderColor: difficultyColor
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ marginRight: 12 }}>{difficultyIconComponent}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>
                DIFICULTAD ESTIMADA
              </Text>
              <Text style={{ color: difficultyColor, fontSize: 20, fontWeight: '900' }}>
                {prediction.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={{ 
            backgroundColor: '#1e293b', 
            borderRadius: 8, 
            padding: 12,
            marginBottom: 12
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Puntos esperados:</Text>
              <Text style={{ color: '#0892D0', fontSize: 24, fontWeight: '900' }}>
                {prediction.expectedPoints.toFixed(1)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Promedio del jugador:</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {playerStats.avgPoints.toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={{ 
            backgroundColor: '#0f172a', 
            borderRadius: 6, 
            padding: 8,
            alignItems: 'center'
          }}>
            <Text style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>
              CONFIANZA DE LA PREDICCIÓN
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ 
                height: 6, 
                backgroundColor: '#334155', 
                borderRadius: 3,
                width: 100,
                overflow: 'hidden',
                marginRight: 8
              }}>
                <View style={{
                  height: '100%',
                  width: `${prediction.confidence}%`,
                  backgroundColor: '#0892D0'
                }} />
              </View>
              <Text style={{ color: '#0892D0', fontSize: 12, fontWeight: '700' }}>
                {prediction.confidence}%
              </Text>
            </View>
          </View>
        </View>

        {/* Factores de Impacto */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 12 }}>
            FACTORES CLAVE:
          </Text>
          {prediction.factors.map((factor: any, index: number) => {
            const factorColor = 
              factor.type === 'positive' ? '#10b981' :
              factor.type === 'negative' ? '#ef4444' :
              '#94a3b8';
            
            const factorIconComponent = 
              factor.type === 'positive' ? <ChartBarIcon size={20} color={factorColor} /> :
              factor.type === 'negative' ? <ChartBarIcon size={20} color={factorColor} /> :
              <ChevronRightIcon size={20} color={factorColor} />;

            return (
              <View 
                key={index}
                style={{ 
                  backgroundColor: '#1e293b', 
                  borderRadius: 8, 
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderLeftWidth: 3,
                  borderLeftColor: factorColor
                }}
              >
                <View style={{ marginRight: 12 }}>{factorIconComponent}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                    {factor.label}
                  </Text>
                  <Text style={{ color: factorColor, fontSize: 11, fontWeight: '700' }}>
                    {factor.impact}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Estadísticas del Rival */}
        <View style={{ 
          backgroundColor: '#1e293b', 
          borderRadius: 10, 
          padding: 16,
          borderLeftWidth: 4,
          borderLeftColor: '#ef4444'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ChartBarIcon size={16} color="#fff" />
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>
              ESTADÍSTICAS DEL RIVAL (Últimas 5 jornadas):
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 10 }}>Victorias/Empates/Derrotas</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                {opponentStats.wins}V - {opponentStats.draws}E - {opponentStats.losses}D
              </Text>
            </View>

            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 10 }}>Goles a favor</Text>
              <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '700' }}>
                {opponentStats.avgGoalsScored.toFixed(1)} por partido
              </Text>
            </View>

            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 10 }}>Goles en contra</Text>
              <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '700' }}>
                {opponentStats.avgGoalsConceded.toFixed(1)} por partido
              </Text>
            </View>

            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 10 }}>Porterías a cero</Text>
              <Text style={{ color: '#0892D0', fontSize: 14, fontWeight: '700' }}>
                {opponentStats.cleanSheets}
              </Text>
            </View>
          </View>

          <View style={{ 
            backgroundColor: '#0f172a', 
            borderRadius: 8, 
            padding: 12,
            marginTop: 8
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Fortaleza del rival:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ 
                  height: 8, 
                  backgroundColor: '#334155', 
                  borderRadius: 4,
                  width: 80,
                  overflow: 'hidden',
                  marginRight: 8
                }}>
                  <View style={{
                    height: '100%',
                    width: `${opponentStats.strength}%`,
                    backgroundColor: difficultyColor
                  }} />
                </View>
                <Text style={{ color: difficultyColor, fontSize: 14, fontWeight: '900' }}>
                  {opponentStats.strength}/100
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nota metodológica */}
        <View style={{ 
          backgroundColor: '#1e293b40', 
          borderRadius: 8, 
          padding: 12,
          marginTop: 16,
          borderWidth: 1,
          borderColor: '#334155'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <InformationIcon size={14} color="#f59e0b" />
            <Text style={{ color: '#64748b', fontSize: 10, lineHeight: 16, marginLeft: 8 }}>
              <Text style={{ fontWeight: '700' }}>Metodología:</Text> Esta predicción se basa en el análisis matemático de las últimas 5 jornadas de ambos equipos, incluyendo rendimiento ofensivo/defensivo, forma reciente, ventaja local/visitante, y las estadísticas promedio del jugador. La confianza aumenta con más partidos jugados.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeLayout backgroundColor="#0f172a">
      <LinearGradient colors={['#0f172a', '#0f172a']} style={{ flex: 1 }}>
        {loading ? (
          <LoadingScreen />
        ) : (
          <>
            <View
              style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: '#0f172a',
              borderBottomWidth: 0.5,
              borderBottomColor: '#333',
              paddingVertical: 10,
              zIndex: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 4 }}
              activeOpacity={0.8}
            >
              <ChevronLeftIcon size={28} color="#0892D0" />
            </TouchableOpacity>

            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: '700',
                textAlign: 'center',
                flex: 1,
              }}
              numberOfLines={1}
            >
              LIGA{' '}
              <Text style={{ color: '#0892D0' }}>
                {ligaName?.toUpperCase() || 'DETALLES'}
              </Text>
            </Text>

            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={{ flex: 1, paddingTop: 60 }} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ 
            backgroundColor: '#0f172a', 
            borderBottomColor: '#334155'
          }}>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
              <Image
                source={{ uri: player.photo }}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  borderWidth: 3,
                  borderColor: '#0892D0',
                  backgroundColor: '#0b1220'
                }}
                resizeMode="cover"
              />
              
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 }}>
                    {player.name}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 15, fontWeight: '600' }}>
                    {player.teamName}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <View style={{
                    backgroundColor: posColor,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10
                  }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
                      {posLabel}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: '#10b981',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10
                  }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 }}>
                      {player.price}M
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
              <View style={{
                flex: 1,
                backgroundColor: '#0b1a2e',
                borderRadius: 12,
                padding: 10,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#0892D0'
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginBottom: 4, fontWeight: '700', letterSpacing: 0.5 }}>
                  PUNTOS TOTAL
                </Text>
                <Text style={{ color: '#0892D0', fontSize: 28, fontWeight: '900', lineHeight: 28 }}>
                  {totalPoints}
                </Text>
              </View>

              <View style={{
                flex: 1,
                backgroundColor: '#0b1a2e',
                borderRadius: 12,
                padding: 10,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#10b981'
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginBottom: 4, fontWeight: '700', letterSpacing: 0.5 }}>
                  MEDIA/PARTIDO
                </Text>
                <Text style={{ color: '#10b981', fontSize: 28, fontWeight: '900', lineHeight: 28 }}>
                  {(() => {
                    const playedMatchdays = matchdayPoints.filter((mp) => {
                      // NUEVO: Usar nueva estructura de PlayerStats
                      if (mp.stats && typeof mp.stats.minutes === 'number') {
                        return mp.stats.minutes > 0;
                      }
                      return mp.points > 0;
                    });

                    if (playedMatchdays.length === 0) return '0';

                    const average =
                      playedMatchdays.reduce((sum, mp) => sum + mp.points, 0) /
                      playedMatchdays.length;
                    return average.toFixed(1);
                  })()}
                </Text>
              </View>

              {ligaId && budget !== undefined && (
                <View style={{ flex: 1 }}>
                  {playerInSquad ? (
                    <TouchableOpacity
                      onPress={handleSellPlayer}
                      disabled={isBuying || jornadaStatus === 'closed'}
                      style={{ 
                        flex: 1,
                        backgroundColor: jornadaStatus === 'closed' ? '#64748b' : '#ef4444',
                        borderRadius: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: jornadaStatus === 'closed' ? '#64748b' : '#ef4444',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                        opacity: (isBuying || jornadaStatus === 'closed') ? 0.6 : 1
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 }}>
                        VENDER
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleBuyPlayer}
                      disabled={isBuying || player.price > budget || jornadaStatus === 'closed'}
                      style={{ 
                        flex: 1,
                        backgroundColor: (player.price > budget || jornadaStatus === 'closed') ? '#64748b' : '#10b981',
                        borderRadius: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: (player.price > budget || jornadaStatus === 'closed') ? '#64748b' : '#10b981',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                        opacity: isBuying || player.price > budget || jornadaStatus === 'closed' ? 0.6 : 1
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ 
                        color: '#fff', 
                        fontSize: 15, 
                        fontWeight: '900',
                        letterSpacing: 0.5,
                        textAlign: 'center'
                      }}>
                        FICHAR
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* TABS DE NAVEGACIÓN */}
          <View style={{ 
            flexDirection: 'row', 
            backgroundColor: '#0f172a', 
            borderBottomWidth: 2, 
            borderBottomColor: '#334155',
            paddingHorizontal: 8
          }}>
            <TouchableOpacity
              onPress={() => setActiveTab('overview')}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderBottomWidth: 3,
                borderBottomColor: activeTab === 'overview' ? '#0892D0' : 'transparent',
                alignItems: 'center'
              }}
            >
              <Text style={{
                color: activeTab === 'overview' ? '#0892D0' : '#94a3b8',
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: 0.5
              }}>
                RESUMEN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('advanced')}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderBottomWidth: 3,
                borderBottomColor: activeTab === 'advanced' ? '#0892D0' : 'transparent',
                alignItems: 'center'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrophyStarIcon size={16} color={activeTab === 'advanced' ? '#0892D0' : '#94a3b8'} />
                <Text style={{
                  color: activeTab === 'advanced' ? '#0892D0' : '#94a3b8',
                  fontSize: 14,
                  fontWeight: '800',
                  letterSpacing: 0.5
                }}>
                  AVANZADO
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* CONTENIDO DE PESTAÑA RESUMEN */}
          {activeTab === 'overview' && (
            <>
              <View style={{ backgroundColor: '#0f172a', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
                {matchdayPoints.length === 0 || matchdayPoints.every(mp => mp.stats === null) ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <AlertIcon size={18} color="#f59e0b" />
                      <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginLeft: 8 }}>
                        Estadísticas no disponibles
                      </Text>
                    </View>
                    <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                      No se encontraron datos para este jugador
                    </Text>
                  </View>
                ) : (
                  <ScrollView 
                    ref={matchdayScrollRef}
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                  >
                  {matchdayPoints.map((mp) => {
                    const isSelected = selectedMatchday === mp.matchday;
                    const pointsColor = mp.points > 0 ? '#10b981' : mp.points < 0 ? '#ef4444' : '#f59e0b';
                    
                    // Calcular porcentaje de la barra (máximo 20 puntos positivos, -10 negativos)
                    const maxPoints = 20;
                    const minPoints = -10;
                    let barPercentage = 0;
                    
                    if (mp.points > 0) {
                      barPercentage = Math.min((mp.points / maxPoints) * 100, 100);
                    } else if (mp.points < 0) {
                      barPercentage = Math.min((Math.abs(mp.points) / Math.abs(minPoints)) * 100, 100);
                    } else {
                      barPercentage = 10; // Mínimo visible para 0 puntos
                    }
                    
                    return (
                      <TouchableOpacity
                        key={mp.matchday}
                        onPress={() => setSelectedMatchday(mp.matchday)}
                        style={{
                          backgroundColor: '#0b1a2e',
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          minWidth: 100,
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: isSelected ? '#0892D0' : '#334155',
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                      >
                        {/* Barra de progreso */}
                        <View style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: `${barPercentage}%`,
                          backgroundColor: `${pointsColor}80`,
                          borderRadius: 12
                        }} />
                        
                        <Text style={{ 
                          color: '#94a3b8', 
                          fontSize: 11, 
                          fontWeight: '600',
                          marginBottom: 4,
                          zIndex: 1
                        }}>
                          Jornada {mp.matchday}
                        </Text>
                        <Text style={{ 
                          color: '#fff', 
                          fontSize: 20, 
                          fontWeight: '900',
                          zIndex: 1
                        }}>
                          {mp.points}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                )}
              </View>

              {/* DESGLOSE DE ESTADÍSTICAS DE LA JORNADA SELECCIONADA */}
              {selectedData && selectedData.stats && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{
                    backgroundColor: '#0f172a',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottomWidth: 1,
                    borderBottomColor: '#334155'
                  }}>
                    <Text style={{ color: '#0892D0', fontSize: 16, fontWeight: '800' }}>
                      JORNADA {selectedData.matchday}
                    </Text>
                    <View style={{
                      backgroundColor: selectedData.points >= 0 ? '#10b98130' : '#ef444430',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8
                    }}>
                      <Text style={{ 
                        color: selectedData.points >= 0 ? '#10b981' : '#ef4444', 
                        fontSize: 18, 
                        fontWeight: '900' 
                      }}>
                        {selectedData.points}
                      </Text>
                    </View>
                  </View>

                  <ScrollView style={{ backgroundColor: '#0f172a' }}>
                    <View style={{
                      flexDirection: 'row',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: '#1e293b',
                      borderBottomWidth: 2,
                      borderBottomColor: '#0892D0'
                    }}>
                      <View style={{ width: 70, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>
                          CANTIDAD
                        </Text>
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>
                          ESTADÍSTICA
                        </Text>
                      </View>
                      <View style={{ width: 70, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>
                          PUNTOS
                        </Text>
                      </View>
                    </View>

                    {/* Minutos jugados */}
                    <StatRow
                      cantidad={Math.min(selectedData.stats.minutes ?? 0, 90)}
                      estadistica="Minutos jugados"
                      puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Minutos')}
                    />

                    {/* Goles marcados */}
                    <StatRow
                      cantidad={selectedData.stats.goals ?? 0}
                      estadistica="Goles marcados"
                      puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Goles marcados')}
                    />

                    {/* Asistencias */}
                    <StatRow
                      cantidad={selectedData.stats.assists ?? 0}
                      estadistica="Asistencias"
                      puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Asistencias')}
                    />

                    {/* PORTERO */}
                    {position === 'Goalkeeper' && (
                      <>
                        <StatRow
                          cantidad={selectedData.stats.saves ?? 0}
                          estadistica="Paradas"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Paradas')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.conceded ?? 0}
                          estadistica="Goles encajados"
                          puntos={
                            (Number(getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Goles encajados')) || 0) +
                            (Number(getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Portería a cero')) || 0)
                          }
                        />
                        <StatRow
                          cantidad={selectedData.stats.penaltySaved ?? 0}
                          estadistica="Penaltis parados"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Penaltis parados')}
                        />
                      </>
                    )}

                    {/* DEFENSA */}
                    {position === 'Defender' && (
                      <>
                        <StatRow
                          cantidad={selectedData.stats.conceded ?? 0}
                          estadistica="Goles encajados"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Portería a cero')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.shotsOn ?? 0}
                          estadistica="Tiros a puerta"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tiros a puerta')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.duelsWon ?? 0}
                          estadistica="Duelos ganados"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Duelos ganados')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.tacklesInterceptions ?? 0}
                          estadistica="Intercepciones"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Intercepciones')}
                        />
                      </>
                    )}

                    {/* CENTROCAMPISTA */}
                    {position === 'Midfielder' && (
                      <>
                        <StatRow
                          cantidad={selectedData.stats.shotsOn ?? 0}
                          estadistica="Tiros a puerta"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tiros a puerta')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.passesKey ?? 0}
                          estadistica="Pases clave"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Pases clave')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.dribblesSuccess ?? 0}
                          estadistica="Regates exitosos"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Regates exitosos')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.foulsDrawn ?? 0}
                          estadistica="Faltas recibidas"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Faltas recibidas')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.tacklesInterceptions ?? 0}
                          estadistica="Intercepciones"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Intercepciones')}
                        />
                      </>
                    )}

                    {/* DELANTERO */}
                    {position === 'Attacker' && (
                      <>
                        <StatRow
                          cantidad={selectedData.stats.shotsOn ?? 0}
                          estadistica="Tiros a puerta"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tiros a puerta')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.passesKey ?? 0}
                          estadistica="Pases clave"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Pases clave')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.dribblesSuccess ?? 0}
                          estadistica="Regates exitosos"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Regates exitosos')}
                        />
                        <StatRow
                          cantidad={selectedData.stats.foulsDrawn ?? 0}
                          estadistica="Faltas recibidas"
                          puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Faltas recibidas')}
                        />
                      </>
                    )}

                    {/* Tarjetas amarillas */}
                    <StatRow
                      cantidad={selectedData.stats.yellowCards ?? 0}
                      estadistica="Tarjetas amarillas"
                      puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tarjetas amarillas')}
                    />

                    {/* Tarjetas rojas */}
                    <StatRow
                      cantidad={selectedData.stats.redCards ?? 0}
                      estadistica="Tarjeta roja"
                      puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tarjeta roja')}
                    />
                    
                    {/* Penaltis fallados */}
                    <StatRow
                      cantidad={selectedData.stats.penaltyMissed ?? 0}
                      estadistica="Penaltis fallados"
                      puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Penaltis fallados')}
                    />
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* CONTENIDO DE PESTAÑA AVANZADO */}
          {activeTab === 'advanced' && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
              <EvolutionChart />
              <PerformanceRadarChart />
              <XStatsComponent />
              <NextOpponentAnalysis />
            </View>
          )}
        </ScrollView>
          </>
        )}
      </LinearGradient>
    </SafeLayout>
  );
};

export default PlayerDetailAdvanced;
