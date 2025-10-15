import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  FootballIcon,
  AssistIcon,
  SaveIcon,
  CleanSheetIcon,
  ShotOnTargetIcon,
  DribbleIcon,
  KeyPassIcon,
  DuelIcon,
  RecoveryIcon,
  GoalsConcededIcon,
  FoulsDrawnIcon,
  MinutesIcon,
  YellowCardIcon,
  RedCardIcon,
} from '../../components/VectorIcons';

// Icono de flecha para volver
const backIcon = require('../../assets/iconos/backIcon.png');

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
  stats: any;
}

export const PlayerDetail: React.FC<PlayerDetailProps> = ({ navigation, route }) => {
  const { player, ligaId, ligaName } = route.params || {};
  
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
  const matchdayScrollRef = useRef<ScrollView>(null);

  const position = normalizePosition(player.position);
  const posColor = position ? posColors[position] : '#64748b';
  const posLabel = position ? posAbbr[position] : 'N/A';

  // Función para calcular puntos según DreamLeague
  const calculatePlayerPoints = (stats: any, role: CanonicalPos): number => {
    if (!stats) return 0;
    
    let points = 0;
    const minutes = stats.games?.minutes || 0;

    // BASE GENERAL (para todos)
    if (minutes > 0 && minutes < 45) points += 1;
    if (minutes >= 45) points += 2;
    
    points += (stats.goals?.assists || 0) * 3;
    points -= (stats.cards?.yellow || 0) * 1;
    points -= (stats.cards?.red || 0) * 3;
    points += (stats.penalty?.won || 0) * 2;
    points -= (stats.penalty?.committed || 0) * 2;
    points += (stats.penalty?.scored || 0) * 3;
    points -= (stats.penalty?.missed || 0) * 2;

    // PORTERO
    if (role === 'Goalkeeper') {
      if (minutes >= 60 && (stats.goalkeeper?.cleanSheets || 0) > 0) points += 5;
      points -= (stats.goalkeeper?.conceded || 0) * 2;
      points += (stats.goalkeeper?.saves || 0) * 1;
      points += (stats.goalkeeper?.savedPenalties || 0) * 5;
      points += (stats.goals?.total || 0) * 10;
      points += Math.floor((stats.tackles?.interceptions || 0) / 5) * 1;
    }

    // DEFENSA
    if (role === 'Defender') {
      if (minutes >= 60 && (stats.goalkeeper?.cleanSheets || 0) > 0) points += 4;
      points += (stats.goals?.total || 0) * 6;
      points += Math.floor((stats.duels?.won || 0) / 2) * 1;
      points += Math.floor((stats.tackles?.interceptions || 0) / 5) * 1;
      points -= (stats.goalkeeper?.conceded || 0) * 1;
      points += (stats.shots?.on || 0) * 1;
    }

    // CENTROCAMPISTA
    if (role === 'Midfielder') {
      if (minutes >= 60 && (stats.goalkeeper?.cleanSheets || 0) > 0) points += 1;
      points += (stats.goals?.total || 0) * 5;
      points -= Math.floor((stats.goalkeeper?.conceded || 0) / 2) * 1;
      points += (stats.passes?.key || 0) * 1;
      points += Math.floor((stats.dribbles?.success || 0) / 2) * 1;
      points += Math.floor((stats.fouls?.drawn || 0) / 3) * 1;
      points += Math.floor((stats.tackles?.interceptions || 0) / 3) * 1;
      points += (stats.shots?.on || 0) * 1;
    }

    // DELANTERO
    if (role === 'Attacker') {
      points += (stats.goals?.total || 0) * 4;
      points += (stats.passes?.key || 0) * 1;
      points += Math.floor((stats.fouls?.drawn || 0) / 3) * 1;
      points += Math.floor((stats.dribbles?.success || 0) / 2) * 1;
      points += (stats.shots?.on || 0) * 1;
    }

    return points;
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
          const stats = await FootballService.getPlayerStatistics(player.id, matchday);
          const points = position ? calculatePlayerPoints(stats, position) : 0;
          
          pointsPerMatchday.push({
            matchday,
            points,
            stats
          });
          
          total += points;
        }

        setMatchdayPoints(pointsPerMatchday);
        setTotalPoints(total);
        
        // Seleccionar la última jornada por defecto
        if (matchdays.length > 0) {
          setSelectedMatchday(matchdays[matchdays.length - 1]);
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
      // Hacer scroll al final después de un pequeño delay
      setTimeout(() => {
        matchdayScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [matchdayPoints]);

  // Componente para mostrar un stat con icono
  const StatItem = ({ 
    icon, 
    label, 
    value, 
    points, 
    color = '#cbd5e1' 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: number | string; 
    points?: number;
    color?: string;
  }) => {
    if (!value || value === 0) return null;
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#334155'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {icon}
          <Text style={{ color: '#cbd5e1', fontSize: 14, marginLeft: 8 }}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{value}</Text>
          {points !== undefined && points !== 0 && (
            <View style={{
              backgroundColor: points > 0 ? '#10b98120' : '#ef444420',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              minWidth: 50,
              alignItems: 'center'
            }}>
              <Text style={{ 
                color: points > 0 ? '#10b981' : '#ef4444', 
                fontSize: 13, 
                fontWeight: '800' 
              }}>
                {points}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Obtener datos de la jornada seleccionada
  const selectedData = selectedMatchday !== null 
    ? matchdayPoints.find(mp => mp.matchday === selectedMatchday)
    : null;

  return (
    <LinearGradient colors={['#181818ff', '#181818ff']} style={{ flex: 1 }}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0892D0" />
          <Text style={{ color: '#94a3b8', marginTop: 16 }}>Cargando estadísticas...</Text>
        </View>
      ) : (
        <>
          {/* Top NavBar con botón de volver */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: '#181818',
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
            {/* Botón volver */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 4 }}
              activeOpacity={0.8}
            >
              <Image source={backIcon} style={{ width: 28, height: 28, tintColor: '#fff' }} resizeMode="contain" />
            </TouchableOpacity>

            {/* Título centrado */}
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

            {/* Espacio para balancear */}
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={{ flex: 1, paddingTop: 60 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header del jugador */}
          <View style={{ 
            backgroundColor: '#0f172a', 
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#334155'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: player.photo }}
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 40,
                  borderWidth: 3,
                  borderColor: posColor,
                  backgroundColor: '#0b1220'
                }}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
                  {player.name}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 8 }}>
                  {player.teamName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    backgroundColor: posColor,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8
                  }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                      {posLabel}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: '#10b981',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8
                  }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                      {player.price}M
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Puntuación total */}
            <View style={{
              marginTop: 20,
              backgroundColor: '#1a2332',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#0892D0'
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>
                PUNTUACIÓN TOTAL
              </Text>
              <Text style={{ color: '#0892D0', fontSize: 42, fontWeight: '900' }}>
                {totalPoints}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                {availableMatchdays.length} jornadas jugadas
              </Text>
            </View>
          </View>

          {/* Selector de jornadas - Scrollable horizontal */}
          <View style={{ backgroundColor: '#0f172a', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' }}>
            <ScrollView 
              ref={matchdayScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {matchdayPoints.map((mp) => {
                const isSelected = selectedMatchday === mp.matchday;
                const pointsColor = mp.points >= 0 ? '#10b981' : '#ef4444';
                
                return (
                  <TouchableOpacity
                    key={mp.matchday}
                    onPress={() => setSelectedMatchday(mp.matchday)}
                    style={{
                      backgroundColor: isSelected ? '#0892D0' : '#1a2332',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      minWidth: 100,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: isSelected ? '#0892D0' : '#334155'
                    }}
                  >
                    <Text style={{ 
                      color: isSelected ? '#fff' : '#94a3b8', 
                      fontSize: 11, 
                      fontWeight: '600',
                      marginBottom: 4
                    }}>
                      Jornada {mp.matchday}
                    </Text>
                    <Text style={{ 
                      color: isSelected ? '#fff' : pointsColor, 
                      fontSize: 20, 
                      fontWeight: '900' 
                    }}>
                      {mp.points}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Detalles de la jornada seleccionada */}
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

              <View style={{ backgroundColor: '#1a2332' }}>
                {/* BASE GENERAL */}
                <View style={{ paddingTop: 12 }}>
                  <Text style={{ 
                    color: '#64748b', 
                    fontSize: 11, 
                    fontWeight: '800',
                    paddingHorizontal: 12,
                    marginBottom: 8
                  }}>
                    BASE GENERAL
                  </Text>
                  
                  <StatItem
                    icon={<MinutesIcon size={16} color="#94a3b8" />}
                    label="Minutos jugados"
                    value={selectedData.stats.games?.minutes || 0}
                    points={
                      (selectedData.stats.games?.minutes || 0) > 0 && (selectedData.stats.games?.minutes || 0) < 45 ? 1 :
                      (selectedData.stats.games?.minutes || 0) >= 45 ? 2 : 0
                    }
                    color="#94a3b8"
                  />
                  <StatItem
                    icon={<AssistIcon size={16} color="#0892D0" />}
                    label="Asistencias"
                    value={selectedData.stats.goals?.assists || 0}
                    points={(selectedData.stats.goals?.assists || 0) * 3}
                    color="#0892D0"
                  />
                  <StatItem
                    icon={<YellowCardIcon size={16} color="#f59e0b" />}
                    label="Tarjetas amarillas"
                    value={selectedData.stats.cards?.yellow || 0}
                    points={(selectedData.stats.cards?.yellow || 0) * -1}
                    color="#f59e0b"
                  />
                  <StatItem
                    icon={<RedCardIcon size={16} color="#ef4444" />}
                    label="Tarjetas rojas"
                    value={selectedData.stats.cards?.red || 0}
                    points={(selectedData.stats.cards?.red || 0) * -3}
                    color="#ef4444"
                  />
                  {(selectedData.stats.penalty?.won || 0) > 0 && (
                    <StatItem
                      icon={<FootballIcon size={16} color="#10b981" />}
                      label="Penaltis ganados"
                      value={selectedData.stats.penalty.won}
                      points={selectedData.stats.penalty.won * 2}
                      color="#10b981"
                    />
                  )}
                  {(selectedData.stats.penalty?.committed || 0) > 0 && (
                    <StatItem
                      icon={<FootballIcon size={16} color="#ef4444" />}
                      label="Penaltis cometidos"
                      value={selectedData.stats.penalty.committed}
                      points={selectedData.stats.penalty.committed * -2}
                      color="#ef4444"
                    />
                  )}
                  {(selectedData.stats.penalty?.scored || 0) > 0 && (
                    <StatItem
                      icon={<FootballIcon size={16} color="#10b981" />}
                      label="Penaltis marcados"
                      value={selectedData.stats.penalty.scored}
                      points={selectedData.stats.penalty.scored * 3}
                      color="#10b981"
                    />
                  )}
                  {(selectedData.stats.penalty?.missed || 0) > 0 && (
                    <StatItem
                      icon={<FootballIcon size={16} color="#ef4444" />}
                      label="Penaltis fallados"
                      value={selectedData.stats.penalty.missed}
                      points={selectedData.stats.penalty.missed * -2}
                      color="#ef4444"
                    />
                  )}
                </View>

                {/* PORTERO */}
                {position === 'Goalkeeper' && (
                  <View style={{ paddingTop: 12 }}>
                    <Text style={{ 
                      color: '#64748b', 
                      fontSize: 11, 
                      fontWeight: '800',
                      paddingHorizontal: 12,
                      marginBottom: 8
                    }}>
                      PORTERO
                    </Text>
                    
                    <StatItem
                      icon={<CleanSheetIcon size={16} color="#10b981" />}
                      label="Portería a cero (≥60min)"
                      value={(selectedData.stats.games?.minutes || 0) >= 60 && (selectedData.stats.goalkeeper?.cleanSheets || 0) > 0 ? 'Sí' : 'No'}
                      points={(selectedData.stats.games?.minutes || 0) >= 60 && (selectedData.stats.goalkeeper?.cleanSheets || 0) > 0 ? 5 : 0}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<GoalsConcededIcon size={16} color="#ef4444" />}
                      label="Goles encajados"
                      value={selectedData.stats.goalkeeper?.conceded || 0}
                      points={(selectedData.stats.goalkeeper?.conceded || 0) * -2}
                      color="#ef4444"
                    />
                    <StatItem
                      icon={<SaveIcon size={16} color="#10b981" />}
                      label="Paradas"
                      value={selectedData.stats.goalkeeper?.saves || 0}
                      points={selectedData.stats.goalkeeper?.saves || 0}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<SaveIcon size={16} color="#10b981" />}
                      label="Penaltis parados"
                      value={selectedData.stats.goalkeeper?.savedPenalties || 0}
                      points={(selectedData.stats.goalkeeper?.savedPenalties || 0) * 5}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<FootballIcon size={16} color="#10b981" />}
                      label="Goles marcados"
                      value={selectedData.stats.goals?.total || 0}
                      points={(selectedData.stats.goals?.total || 0) * 10}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<RecoveryIcon size={16} color="#94a3b8" />}
                      label="Recuperaciones (cada 5)"
                      value={selectedData.stats.tackles?.interceptions || 0}
                      points={Math.floor((selectedData.stats.tackles?.interceptions || 0) / 5)}
                      color="#94a3b8"
                    />
                  </View>
                )}

                {/* DEFENSA */}
                {position === 'Defender' && (
                  <View style={{ paddingTop: 12 }}>
                    <Text style={{ 
                      color: '#64748b', 
                      fontSize: 11, 
                      fontWeight: '800',
                      paddingHorizontal: 12,
                      marginBottom: 8
                    }}>
                      DEFENSA
                    </Text>
                    
                    <StatItem
                      icon={<CleanSheetIcon size={16} color="#10b981" />}
                      label="Portería a cero (≥60min)"
                      value={(selectedData.stats.games?.minutes || 0) >= 60 && (selectedData.stats.goalkeeper?.cleanSheets || 0) > 0 ? 'Sí' : 'No'}
                      points={(selectedData.stats.games?.minutes || 0) >= 60 && (selectedData.stats.goalkeeper?.cleanSheets || 0) > 0 ? 4 : 0}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<FootballIcon size={16} color="#10b981" />}
                      label="Goles marcados"
                      value={selectedData.stats.goals?.total || 0}
                      points={(selectedData.stats.goals?.total || 0) * 6}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<DuelIcon size={16} color="#94a3b8" />}
                      label="Duelos ganados (cada 2)"
                      value={selectedData.stats.duels?.won || 0}
                      points={Math.floor((selectedData.stats.duels?.won || 0) / 2)}
                      color="#94a3b8"
                    />
                    <StatItem
                      icon={<RecoveryIcon size={16} color="#94a3b8" />}
                      label="Recuperaciones (cada 5)"
                      value={selectedData.stats.tackles?.interceptions || 0}
                      points={Math.floor((selectedData.stats.tackles?.interceptions || 0) / 5)}
                      color="#94a3b8"
                    />
                    <StatItem
                      icon={<GoalsConcededIcon size={16} color="#ef4444" />}
                      label="Goles encajados"
                      value={selectedData.stats.goalkeeper?.conceded || 0}
                      points={(selectedData.stats.goalkeeper?.conceded || 0) * -1}
                      color="#ef4444"
                    />
                    <StatItem
                      icon={<ShotOnTargetIcon size={16} color="#94a3b8" />}
                      label="Tiros a puerta"
                      value={selectedData.stats.shots?.on || 0}
                      points={selectedData.stats.shots?.on || 0}
                      color="#94a3b8"
                    />
                  </View>
                )}

                {/* CENTROCAMPISTA */}
                {position === 'Midfielder' && (
                  <View style={{ paddingTop: 12 }}>
                    <Text style={{ 
                      color: '#64748b', 
                      fontSize: 11, 
                      fontWeight: '800',
                      paddingHorizontal: 12,
                      marginBottom: 8
                    }}>
                      CENTROCAMPISTA
                    </Text>
                    
                    <StatItem
                      icon={<CleanSheetIcon size={16} color="#10b981" />}
                      label="Portería a cero (≥60min)"
                      value={(selectedData.stats.games?.minutes || 0) >= 60 && (selectedData.stats.goalkeeper?.cleanSheets || 0) > 0 ? 'Sí' : 'No'}
                      points={(selectedData.stats.games?.minutes || 0) >= 60 && (selectedData.stats.goalkeeper?.cleanSheets || 0) > 0 ? 1 : 0}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<FootballIcon size={16} color="#10b981" />}
                      label="Goles marcados"
                      value={selectedData.stats.goals?.total || 0}
                      points={(selectedData.stats.goals?.total || 0) * 5}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<GoalsConcededIcon size={16} color="#ef4444" />}
                      label="Goles encajados (cada 2)"
                      value={selectedData.stats.goalkeeper?.conceded || 0}
                      points={Math.floor((selectedData.stats.goalkeeper?.conceded || 0) / 2) * -1}
                      color="#ef4444"
                    />
                    <StatItem
                      icon={<KeyPassIcon size={16} color="#0892D0" />}
                      label="Pases clave"
                      value={selectedData.stats.passes?.key || 0}
                      points={selectedData.stats.passes?.key || 0}
                      color="#0892D0"
                    />
                    <StatItem
                      icon={<DribbleIcon size={16} color="#f59e0b" />}
                      label="Regates (cada 2)"
                      value={selectedData.stats.dribbles?.success || 0}
                      points={Math.floor((selectedData.stats.dribbles?.success || 0) / 2)}
                      color="#f59e0b"
                    />
                    <StatItem
                      icon={<FoulsDrawnIcon size={16} color="#94a3b8" />}
                      label="Faltas recibidas (cada 3)"
                      value={selectedData.stats.fouls?.drawn || 0}
                      points={Math.floor((selectedData.stats.fouls?.drawn || 0) / 3)}
                      color="#94a3b8"
                    />
                    <StatItem
                      icon={<RecoveryIcon size={16} color="#94a3b8" />}
                      label="Recuperaciones (cada 3)"
                      value={selectedData.stats.tackles?.interceptions || 0}
                      points={Math.floor((selectedData.stats.tackles?.interceptions || 0) / 3)}
                      color="#94a3b8"
                    />
                    <StatItem
                      icon={<ShotOnTargetIcon size={16} color="#94a3b8" />}
                      label="Tiros a puerta"
                      value={selectedData.stats.shots?.on || 0}
                      points={selectedData.stats.shots?.on || 0}
                      color="#94a3b8"
                    />
                  </View>
                )}

                {/* DELANTERO */}
                {position === 'Attacker' && (
                  <View style={{ paddingTop: 12 }}>
                    <Text style={{ 
                      color: '#64748b', 
                      fontSize: 11, 
                      fontWeight: '800',
                      paddingHorizontal: 12,
                      marginBottom: 8
                    }}>
                      DELANTERO
                    </Text>
                    
                    <StatItem
                      icon={<FootballIcon size={16} color="#10b981" />}
                      label="Goles marcados"
                      value={selectedData.stats.goals?.total || 0}
                      points={(selectedData.stats.goals?.total || 0) * 4}
                      color="#10b981"
                    />
                    <StatItem
                      icon={<KeyPassIcon size={16} color="#0892D0" />}
                      label="Pases clave"
                      value={selectedData.stats.passes?.key || 0}
                      points={selectedData.stats.passes?.key || 0}
                      color="#0892D0"
                    />
                    <StatItem
                      icon={<FoulsDrawnIcon size={16} color="#94a3b8" />}
                      label="Faltas recibidas (cada 3)"
                      value={selectedData.stats.fouls?.drawn || 0}
                      points={Math.floor((selectedData.stats.fouls?.drawn || 0) / 3)}
                      color="#94a3b8"
                    />
                    <StatItem
                      icon={<DribbleIcon size={16} color="#f59e0b" />}
                      label="Regates (cada 2)"
                      value={selectedData.stats.dribbles?.success || 0}
                      points={Math.floor((selectedData.stats.dribbles?.success || 0) / 2)}
                      color="#f59e0b"
                    />
                    <StatItem
                      icon={<ShotOnTargetIcon size={16} color="#94a3b8" />}
                      label="Tiros a puerta"
                      value={selectedData.stats.shots?.on || 0}
                      points={selectedData.stats.shots?.on || 0}
                      color="#94a3b8"
                    />
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
        </>
      )}
    </LinearGradient>
  );
};

export default PlayerDetail;
