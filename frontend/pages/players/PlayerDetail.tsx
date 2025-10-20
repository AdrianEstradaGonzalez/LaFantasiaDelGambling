import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import { PlayerService } from '../../services/PlayerService';
import { SquadService } from '../../services/SquadService';
import { JornadaService } from '../../services/JornadaService';
import LoadingScreen from '../../components/LoadingScreen';
import { CustomAlertManager } from '../../components/CustomAlert';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ChevronLeftIcon } from '../../components/VectorIcons';
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

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ navigation, route }) => {
  const { player, ligaId, ligaName, budget: initialBudget, isAlreadyInSquad, currentFormation } = route.params || {};
  
  if (!player) {
    return (
      <LinearGradient colors={['#181818ff', '#181818ff']} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#ef4444', fontSize: 16 }}>Error: Jugador no encontrado</Text>
        </View>
      </LinearGradient>
    );
  }
  
  const [loading, setLoading] = useState(true);
  const [availableMatchdays, setAvailableMatchdays] = useState<number[]>([]);
  const [matchdayPoints, setMatchdayPoints] = useState<MatchdayPoints[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedMatchday, setSelectedMatchday] = useState<number | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [playerInSquad, setPlayerInSquad] = useState(isAlreadyInSquad || false);
  const [budget, setBudget] = useState(initialBudget);
  const matchdayScrollRef = useRef<ScrollView>(null);

  const position = normalizePosition(player.position);
  const posColor = position ? posColors[position] : '#64748b';
  const posLabel = position ? posAbbr[position] : 'N/A';

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setLoading(true);
        
        console.log('[PlayerDetail] Iniciando carga de datos para jugador:', player.id, player.name);
        
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
        
        // Obtener jornadas disponibles
        const matchdays = await FootballService.getAvailableMatchdays();
        setAvailableMatchdays(matchdays);
        console.log('[PlayerDetail] Jornadas disponibles:', matchdays);

        if (!matchdays.length) {
          setMatchdayPoints([]);
          setTotalPoints(0);
          setSelectedMatchday(null);
          return;
        }

        const lastMatchday = matchdays[matchdays.length - 1];

        // ✨ NUEVO: Usar PlayerStatsService para obtener estadísticas del backend
        try {
          console.log('[PlayerDetail] Solicitando estadísticas al backend...');
          const statsArray = await PlayerStatsService.getPlayerMultipleJornadasStats(
            player.id,
            matchdays,
            { refresh: false } // No forzar refresh en carga inicial
          );

          const pointsData: MatchdayPoints[] = matchdays.map((matchday, index) => {
            const stats = statsArray[index];
            return {
              matchday,
              points: stats?.totalPoints ?? 0,
              stats: stats,
            };
          });

          const total = pointsData.reduce((sum, item) => sum + item.points, 0);
          console.log('[PlayerDetail] Estadísticas obtenidas. Total de puntos:', total);

          setMatchdayPoints(pointsData);
          setTotalPoints(total);
          setSelectedMatchday(lastMatchday);
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
  }, [player.id]);

  useEffect(() => {
    if (selectedMatchday == null) return;
    const current = matchdayPoints.find((mp) => mp.matchday === selectedMatchday);
    if (!current || current.stats) return;

    let cancelled = false;

    (async () => {
      try {
        console.log('[PlayerDetail] Solicitando estadísticas para jornada:', selectedMatchday);
        // ✨ NUEVO: Obtener stats específicas del backend
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

  // ✨ NUEVO: Helper para obtener puntos de una estadística del breakdown
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

  return (
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
                      // ✨ NUEVO: Usar nueva estructura de PlayerStats
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

      
          <View style={{ backgroundColor: '#0f172a', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
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
          </View>

          {selectedData && (
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

                {/* ✨ NUEVO: Mostrar estadísticas usando PlayerStats del backend */}
                {selectedData.stats && (
                  <>
                    {/* Minutos */}
                    {selectedData.stats.minutes !== null && (
                      <StatRow
                        cantidad={selectedData.stats.minutes}
                        estadistica="Minutos jugados"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Minutos')}
                      />
                    )}

                    {/* Goles */}
                    {selectedData.stats.goals !== null && selectedData.stats.goals > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.goals}
                        estadistica="Goles"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Goles marcados')}
                      />
                    )}

                    {/* Asistencias */}
                    {selectedData.stats.assists !== null && selectedData.stats.assists > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.assists}
                        estadistica="Asistencias"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Asistencias')}
                      />
                    )}

                    {/* Portero específico */}
                    {position === 'Goalkeeper' && (
                      <>
                        {selectedData.stats.saves !== null && selectedData.stats.saves > 0 && (
                          <StatRow
                            cantidad={selectedData.stats.saves}
                            estadistica="Paradas"
                            puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Paradas')}
                          />
                        )}
                        {selectedData.stats.conceded !== null && (
                          <StatRow
                            cantidad={selectedData.stats.conceded}
                            estadistica="Goles encajados"
                            puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Goles encajados')}
                          />
                        )}
                        {/* Portería a cero */}
                        {selectedData.stats.conceded !== null && selectedData.stats.conceded === 0 && selectedData.stats.minutes && selectedData.stats.minutes >= 55 && (
                          <StatRow
                            cantidad="Sí"
                            estadistica="Portería a cero"
                            puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Portería a cero')}
                          />
                        )}
                        {selectedData.stats.penaltySaved !== null && selectedData.stats.penaltySaved > 0 && (
                          <StatRow
                            cantidad={selectedData.stats.penaltySaved}
                            estadistica="Penaltis parados"
                            puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Penaltis parados')}
                          />
                        )}
                      </>
                    )}

                    {/* Portería a cero para Defensores y Centrocampistas */}
                    {(position === 'Defender' || position === 'Midfielder') && selectedData.stats.conceded !== null && selectedData.stats.conceded === 0 && selectedData.stats.minutes && selectedData.stats.minutes >= 55 && (
                      <StatRow
                        cantidad="Sí"
                        estadistica="Portería a cero"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Portería a cero')}
                      />
                    )}

                    {/* Tiros a puerta */}
                    {selectedData.stats.shotsOn !== null && selectedData.stats.shotsOn > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.shotsOn}
                        estadistica="Tiros a puerta"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tiros a puerta')}
                      />
                    )}

                    {/* Pases clave */}
                    {selectedData.stats.passesKey !== null && selectedData.stats.passesKey > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.passesKey}
                        estadistica="Pases clave"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Pases clave')}
                      />
                    )}

                    {/* Regates exitosos */}
                    {selectedData.stats.dribblesSuccess !== null && selectedData.stats.dribblesSuccess > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.dribblesSuccess}
                        estadistica="Regates exitosos"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Regates exitosos')}
                      />
                    )}

                    {/* Duelos ganados */}
                    {selectedData.stats.duelsWon !== null && selectedData.stats.duelsWon > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.duelsWon}
                        estadistica="Duelos ganados"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Duelos ganados')}
                      />
                    )}

                    {/* Intercepciones */}
                    {selectedData.stats.tacklesInterceptions !== null && selectedData.stats.tacklesInterceptions > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.tacklesInterceptions}
                        estadistica="Intercepciones"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Intercepciones')}
                      />
                    )}

                    {/* Faltas recibidas */}
                    {selectedData.stats.foulsDrawn !== null && selectedData.stats.foulsDrawn > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.foulsDrawn}
                        estadistica="Faltas recibidas"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Faltas recibidas')}
                      />
                    )}

                    {/* Tarjetas amarillas */}
                    {selectedData.stats.yellowCards !== null && selectedData.stats.yellowCards > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.yellowCards}
                        estadistica="Tarjetas amarillas"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tarjetas amarillas')}
                      />
                    )}

                    {/* Tarjetas rojas */}
                    {selectedData.stats.redCards !== null && selectedData.stats.redCards > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.redCards}
                        estadistica="Tarjetas rojas"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Tarjetas rojas')}
                      />
                    )}

                    {/* Penaltis */}
                    {selectedData.stats.penaltyScored !== null && selectedData.stats.penaltyScored > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.penaltyScored}
                        estadistica="Penaltis marcados"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Penaltis marcados')}
                      />
                    )}
                    {selectedData.stats.penaltyMissed !== null && selectedData.stats.penaltyMissed > 0 && (
                      <StatRow
                        cantidad={selectedData.stats.penaltyMissed}
                        estadistica="Penaltis fallados"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Penaltis fallados')}
                      />
                    )}

                    {/* Rating */}
                    {selectedData.stats.rating && (
                      <StatRow
                        cantidad={parseFloat(selectedData.stats.rating).toFixed(1)}
                        estadistica="Valoración del partido"
                        puntos={getPointsFromBreakdown(selectedData.stats.pointsBreakdown, 'Valoración')}
                      />
                    )}
                  </>
                )}

                {/* ✨ Los puntos individuales se obtienen del breakdown calculado por el backend */}
              </ScrollView>
            </View>
          )}
        </ScrollView>
        </>
      )}
    </LinearGradient>
  );
};

export default PlayerDetail;
