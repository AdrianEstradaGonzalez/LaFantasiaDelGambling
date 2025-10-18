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
  Goalkeeper: 'GK',
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
  points: number | null;
  stats: any | null;
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

  // Unificar cálculo de puntos: usar FootballService (fuente única)
  const calculatePlayerPoints = (stats: any, role: CanonicalPos): number => {
    if (!stats || !role) return 0;
    return FootballService.calculatePointsForStats(stats, role);
  };

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setLoading(true);
        
        // Obtener jornadas disponibles
        const matchdays = await FootballService.getAvailableMatchdays();
        setAvailableMatchdays(matchdays);

        // Cargar estadísticas y puntos por jornada
        const pointsPerMatchday: MatchdayPoints[] = [];
        let total = 0;

        for (const matchday of matchdays) {
          let stats: any | null = null;
          let points: number | null = null;

          try {
            stats = await FootballService.getPlayerStatistics(player.id, matchday);
            if (stats) {
              points = position ? calculatePlayerPoints(stats, position) : 0;
            }
          } catch (error) {
            console.warn('No se pudieron obtener estadísticas del jugador para la jornada', matchday, error);
          }

          pointsPerMatchday.push({
            matchday,
            points,
            stats,
          });

          if (typeof points === 'number') {
            total += points;
          }
        }

        setMatchdayPoints(pointsPerMatchday);
        setTotalPoints(total);
        
        // Seleccionar la última jornada por defecto
        if (matchdays.length > 0) {
          const last = matchdays[matchdays.length - 1];
          setSelectedMatchday(last);

          // Sincronizar puntos de última jornada con la BD si difiere
          const lastEntry = pointsPerMatchday.find(p => p.matchday === last);
          const lastPointsCalculated = typeof lastEntry?.points === 'number' ? lastEntry.points : null;

          if (lastPointsCalculated !== null) {
            try {
              const dbPlayer = await PlayerService.getPlayerById(player.id);
              const dbLastPoints = dbPlayer?.lastJornadaPoints ?? 0;
              if (dbLastPoints !== lastPointsCalculated) {
                await PlayerService.updatePlayerLastPoints(player.id, lastPointsCalculated);
              }
            } catch (e) {
              console.warn('No se pudo sincronizar puntos última jornada:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error cargando datos del jugador:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlayerData();
  }, [player.id, position]);

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
        'Goalkeeper': 'GK',
        'Defender': 'DEF',
        'Midfielder': 'CEN',
        'Attacker': 'DEL'
      };
      const role = roleMap[playerPosition];

      const squad = await SquadService.getUserSquad(ligaId);
      
      const allPositionsByRole: Record<string, string[]> = {
        'GK': ['por'],
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
          `No hay espacio disponible para ${role === 'GK' ? 'porteros' : role === 'DEF' ? 'defensas' : role === 'CEN' ? 'centrocampistas' : 'delanteros'} en tu plantilla.`,
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

  // Componente para mostrar una fila de estadística con 3 columnas
  const StatRow = ({ 
    cantidad, 
    estadistica, 
    puntos
  }: { 
    cantidad: number | string; 
    estadistica: string; 
    puntos: number;
  }) => {
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
            backgroundColor: puntos > 0 ? '#10b98120' : puntos < 0 ? '#ef444420' : '#64748b20',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            minWidth: 50,
            alignItems: 'center'
          }}>
            <Text style={{ 
              color: puntos > 0 ? '#10b981' : puntos < 0 ? '#ef4444' : '#64748b', 
              fontSize: 14, 
              fontWeight: '800' 
            }}>
              {puntos > 0 ? `${puntos}` : puntos}
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
                    const playedMatchdays = matchdayPoints.filter(
                      mp => mp.stats && mp.stats.games?.minutes > 0 && typeof mp.points === 'number'
                    );
                    if (playedMatchdays.length === 0) return '0';
                    const totalSum = playedMatchdays.reduce((sum, mp) => sum + (mp.points ?? 0), 0);
                    const average = totalSum / playedMatchdays.length;
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
                const hasNumericPoints = typeof mp.points === 'number';
                const pointsColor = hasNumericPoints
                  ? mp.points! > 0
                    ? '#10b981'
                    : mp.points! < 0
                      ? '#ef4444'
                      : '#f59e0b'
                  : '#64748b';
                
                // Calcular porcentaje de la barra (máximo 20 puntos positivos, -10 negativos)
                const maxPoints = 20;
                const minPoints = -10;
                let barPercentage = 0;
                
                if (hasNumericPoints) {
                  if (mp.points! > 0) {
                    barPercentage = Math.min((mp.points! / maxPoints) * 100, 100);
                  } else if (mp.points! < 0) {
                    barPercentage = Math.min((Math.abs(mp.points!) / Math.abs(minPoints)) * 100, 100);
                  } else {
                    barPercentage = 10; // Mínimo visible para 0 puntos
                  }
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
                  {hasNumericPoints ? (mp.points! > 0 ? `${mp.points}` : mp.points) : '--'}
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
                  backgroundColor:
                    typeof selectedData.points === 'number'
                      ? selectedData.points >= 0
                        ? '#10b98130'
                        : '#ef444430'
                      : '#47556930',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8
                }}>
                  <Text
                    style={{
                      color:
                        typeof selectedData.points === 'number'
                          ? selectedData.points >= 0
                            ? '#10b981'
                            : '#ef4444'
                          : '#64748b',
                      fontSize: 18,
                      fontWeight: '900',
                    }}
                  >
                    {typeof selectedData.points === 'number'
                      ? selectedData.points > 0
                        ? `${selectedData.points}`
                        : selectedData.points
                      : '--'}
                  </Text>
                </View>
              </View>
              {selectedData.stats ? (
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

                  {/* BASE GENERAL - Todas las posiciones */}
                  <StatRow
                    cantidad={selectedData.stats?.games?.minutes || 0}
                    estadistica="Minutos jugados"
                    puntos={
                      (selectedData.stats?.games?.minutes || 0) > 0 && (selectedData.stats?.games?.minutes || 0) <= 45 ? 1 :
                      (selectedData.stats?.games?.minutes || 0) > 45 ? 2 : 0
                    }
                  />

                  {/* PORTERO - Estadísticas específicas */}
                {position === 'Goalkeeper' && (
                  <>
                    <StatRow
                      cantidad={selectedData.stats?.goals?.total || 0}
                      estadistica="Goles marcados"
                      puntos={(selectedData.stats?.goals?.total || 0) * 10}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.goals?.assists || 0}
                      estadistica="Asistencias"
                      puntos={(selectedData.stats?.goals?.assists || 0) * 3}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.goalkeeper?.saves || 0}
                      estadistica="Paradas"
                      puntos={selectedData.stats?.goalkeeper?.saves || 0}
                    />
            
                    <StatRow
                      cantidad={selectedData.stats?.goalkeeper?.conceded || 0}
                      estadistica="Goles encajados"
                      puntos={-2 * (selectedData.stats?.goalkeeper?.conceded || 0)}
                    />
                    <StatRow
                      cantidad={(selectedData.stats?.penalty?.saved ?? selectedData.stats?.goalkeeper?.saved) || 0}
                      estadistica="Penaltis parados"
                      puntos={(((selectedData.stats?.penalty?.saved ?? selectedData.stats?.goalkeeper?.saved) || 0) * 5)}
                    />
                    {Math.floor((selectedData.stats?.tackles?.interceptions || 0) / 5) !== 0 && (
                      <StatRow
                        cantidad={selectedData.stats?.tackles?.interceptions || 0}
                        estadistica="Recuperaciones"
                        puntos={Math.floor((selectedData.stats?.tackles?.interceptions || 0) / 5)}
                      />
                    )}
                  </>
                )}

                {/* DEFENSA - Estadísticas específicas */}
                {position === 'Defender' && (
                  <>
                    <StatRow
                      cantidad={selectedData.stats?.goals?.total || 0}
                      estadistica="Goles marcados"
                      puntos={(selectedData.stats?.goals?.total || 0) * 6}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.goals?.assists || 0}
                      estadistica="Asistencias"
                      puntos={(selectedData.stats?.goals?.assists || 0) * 3}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.shots?.on || 0}
                      estadistica="Tiros a puerta"
                      puntos={selectedData.stats?.shots?.on || 0}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.goals?.conceded || 0}
                      estadistica="Goles encajados"
                      puntos={
                        (selectedData.stats?.goals?.conceded || 0) === 0 && (selectedData.stats?.games?.minutes || 0) >= 60
                          ? 4
                          : (selectedData.stats?.goals?.conceded || 0) * -1
                      }
                    />
                    <StatRow
                      cantidad={Math.floor((selectedData.stats?.duels?.won || 0))}
                      estadistica="Duelos ganados"
                      puntos={Math.floor((selectedData.stats?.duels?.won || 0) / 2)}
                    />
                    {Math.floor((selectedData.stats?.tackles?.interceptions || 0) / 5) !== 0 && (
                      <StatRow
                        cantidad={selectedData.stats?.tackles?.interceptions || 0}
                        estadistica="Intercepciones"
                        puntos={Math.floor((selectedData.stats?.tackles?.interceptions || 0) / 5)}
                      />
                    )}
                  </>
                )}

                {/* CENTROCAMPISTA - Estadísticas específicas */}
                {position === 'Midfielder' && (
                  <>
                    <StatRow
                      cantidad={selectedData.stats?.goals?.total || 0}
                      estadistica="Goles marcados"
                      puntos={(selectedData.stats?.goals?.total || 0) * 5}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.goals?.assists || 0}
                      estadistica="Asistencias"
                      puntos={(selectedData.stats?.goals?.assists || 0) * 3}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.shots?.on || 0}
                      estadistica="Tiros a puerta"
                      puntos={selectedData.stats?.shots?.on || 0}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.passes?.key || 0}
                      estadistica="Pases clave"
                      puntos={selectedData.stats?.passes?.key || 0}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.dribbles?.success || 0}
                      estadistica="Regates exitosos"
                      puntos={Math.floor((selectedData.stats?.dribbles?.success || 0) / 2)}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.fouls?.drawn || 0}
                      estadistica="Faltas recibidas"
                      puntos={Math.floor((selectedData.stats?.fouls?.drawn || 0) / 3)}
                    />
                    {Math.floor((selectedData.stats?.tackles?.interceptions || 0) / 3) !== 0 && (
                      <StatRow
                        cantidad={selectedData.stats?.tackles?.interceptions || 0}
                        estadistica="Intercepciones"
                        puntos={Math.floor((selectedData.stats?.tackles?.interceptions || 0) / 3)}
                      />
                    )}
                  </>
                )}

                {/* DELANTERO - Estadísticas específicas */}
                {position === 'Attacker' && (
                  <>
                    <StatRow
                      cantidad={selectedData.stats?.goals?.total || 0}
                      estadistica="Goles marcados"
                      puntos={(selectedData.stats?.goals?.total || 0) * 4}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.goals?.assists || 0}
                      estadistica="Asistencias"
                      puntos={(selectedData.stats?.goals?.assists || 0) * 3}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.shots?.on || 0}
                      estadistica="Tiros a puerta"
                      puntos={selectedData.stats?.shots?.on || 0}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.passes?.key || 0}
                      estadistica="Pases clave"
                      puntos={selectedData.stats?.passes?.key || 0}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.dribbles?.success || 0}
                      estadistica="Regates exitosos"
                      puntos={Math.floor((selectedData.stats?.dribbles?.success || 0) / 2)}
                    />
                    <StatRow
                      cantidad={selectedData.stats?.fouls?.drawn || 0}
                      estadistica="Faltas recibidas"
                      puntos={Math.floor((selectedData.stats?.fouls?.drawn || 0) / 3)}
                    />
                  </>
                )}

                {/* BASE GENERAL - Penaltis y tarjetas (para todas las posiciones) */}
                <StatRow
                  cantidad={selectedData.stats?.penalty?.won || 0}
                  estadistica="Penaltis ganados"
                  puntos={(selectedData.stats?.penalty?.won || 0) * 2}
                />
                <StatRow
                  cantidad={selectedData.stats?.penalty?.committed || 0}
                  estadistica="Penaltis cometidos"
                  puntos={(selectedData.stats?.penalty?.committed || 0) * -2}
                />
                <StatRow
                  cantidad={selectedData.stats?.penalty?.scored || 0}
                  estadistica="Penaltis marcados"
                  puntos={(selectedData.stats?.penalty?.scored || 0) * 3}
                />
                <StatRow
                  cantidad={selectedData.stats?.penalty?.missed || 0}
                  estadistica="Penaltis fallados"
                  puntos={(selectedData.stats?.penalty?.missed || 0) * -2}
                />
                <StatRow
                  cantidad={selectedData.stats?.cards?.yellow || 0}
                  estadistica="Tarjetas amarillas"
                  puntos={(selectedData.stats?.cards?.yellow || 0) * -1}
                />
                <StatRow
                  cantidad={selectedData.stats?.cards?.red || 0}
                  estadistica="Tarjetas rojas"
                  puntos={(selectedData.stats?.cards?.red || 0) * -3}
                />
              </ScrollView>
            ) : (
              <View style={{
                backgroundColor: '#0f172a',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#334155'
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>
                  No disponemos de estadísticas oficiales para esta jornada. Puede deberse a que la API aún no ha publicado los datos del partido.
                </Text>
              </View>
            )}
            </View>
          )}
        </ScrollView>
        </>
      )}
    </LinearGradient>
  );
};

export default PlayerDetail;
const CLEAN_SHEET_MINUTES = 60;
