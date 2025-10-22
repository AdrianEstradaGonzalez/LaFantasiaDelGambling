import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SquadService, Squad } from '../../services/SquadService';
import { JornadaService } from '../../services/JornadaService';
import FootballService from '../../services/FutbolService';
import { PlayerService } from '../../services/PlayerService';
import { PlayerStatsService } from '../../services/PlayerStatsService';
import LoadingScreen from '../../components/LoadingScreen';
import { ChevronLeftIcon } from '../../components/VectorIcons';
import { SafeLayout } from '../../components/SafeLayout';

type VerPlantillaRoute = RouteProp<{ params: { ligaId: string; ligaName: string; userId: string; userName: string; jornada?: number } }, 'params'>;

const roleColor = (role: string) => {
  switch (role) {
    case 'POR': return '#f59e0b';
    case 'DEF': return '#3b82f6';
    case 'CEN': return '#10b981';
    case 'DEL': return '#ef4444';
    default: return '#6b7280';
  }
};

const formationPositions: Record<string, { id: string; role: 'POR'|'DEF'|'CEN'|'DEL'; x: number; y: number }[]> = {
  '5-4-1': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 8, y: 70 },
    { id: 'def2', role: 'DEF', x: 29, y: 70 },
    { id: 'def3', role: 'DEF', x: 50, y: 70 },
    { id: 'def4', role: 'DEF', x: 71, y: 70 },
    { id: 'def5', role: 'DEF', x: 92, y: 70 },
    { id: 'cen1', role: 'CEN', x: 12, y: 48 },
    { id: 'cen2', role: 'CEN', x: 37, y: 48 },
    { id: 'cen3', role: 'CEN', x: 63, y: 48 },
    { id: 'cen4', role: 'CEN', x: 88, y: 48 },
    { id: 'del1', role: 'DEL', x: 50, y: 22 },
  ],
  '5-3-2': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 8, y: 70 },
    { id: 'def2', role: 'DEF', x: 29, y: 70 },
    { id: 'def3', role: 'DEF', x: 50, y: 70 },
    { id: 'def4', role: 'DEF', x: 71, y: 70 },
    { id: 'def5', role: 'DEF', x: 92, y: 70 },
    { id: 'cen1', role: 'CEN', x: 25, y: 48 },
    { id: 'cen2', role: 'CEN', x: 50, y: 48 },
    { id: 'cen3', role: 'CEN', x: 75, y: 48 },
    { id: 'del1', role: 'DEL', x: 35, y: 22 },
    { id: 'del2', role: 'DEL', x: 65, y: 22 },
  ],
  '4-5-1': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 12, y: 70 },
    { id: 'def2', role: 'DEF', x: 37, y: 70 },
    { id: 'def3', role: 'DEF', x: 63, y: 70 },
    { id: 'def4', role: 'DEF', x: 88, y: 70 },
    { id: 'cen1', role: 'CEN', x: 10, y: 48 },
    { id: 'cen2', role: 'CEN', x: 30, y: 48 },
    { id: 'cen3', role: 'CEN', x: 50, y: 48 },
    { id: 'cen4', role: 'CEN', x: 70, y: 48 },
    { id: 'cen5', role: 'CEN', x: 90, y: 48 },
    { id: 'del1', role: 'DEL', x: 50, y: 22 },
  ],
  '4-4-2': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 12, y: 70 },
    { id: 'def2', role: 'DEF', x: 37, y: 70 },
    { id: 'def3', role: 'DEF', x: 63, y: 70 },
    { id: 'def4', role: 'DEF', x: 88, y: 70 },
    { id: 'cen1', role: 'CEN', x: 12, y: 48 },
    { id: 'cen2', role: 'CEN', x: 37, y: 48 },
    { id: 'cen3', role: 'CEN', x: 63, y: 48 },
    { id: 'cen4', role: 'CEN', x: 88, y: 48 },
    { id: 'del1', role: 'DEL', x: 35, y: 22 },
    { id: 'del2', role: 'DEL', x: 65, y: 22 },
  ],
  '4-3-3': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 12, y: 70 },
    { id: 'def2', role: 'DEF', x: 37, y: 70 },
    { id: 'def3', role: 'DEF', x: 63, y: 70 },
    { id: 'def4', role: 'DEF', x: 88, y: 70 },
    { id: 'cen1', role: 'CEN', x: 25, y: 48 },
    { id: 'cen2', role: 'CEN', x: 50, y: 48 },
    { id: 'cen3', role: 'CEN', x: 75, y: 48 },
    { id: 'del1', role: 'DEL', x: 15, y: 22 },
    { id: 'del2', role: 'DEL', x: 50, y: 22 },
    { id: 'del3', role: 'DEL', x: 85, y: 22 },
  ],
  '3-5-2': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 20, y: 70 },
    { id: 'def2', role: 'DEF', x: 50, y: 70 },
    { id: 'def3', role: 'DEF', x: 80, y: 70 },
    { id: 'cen1', role: 'CEN', x: 10, y: 48 },
    { id: 'cen2', role: 'CEN', x: 30, y: 48 },
    { id: 'cen3', role: 'CEN', x: 50, y: 48 },
    { id: 'cen4', role: 'CEN', x: 70, y: 48 },
    { id: 'cen5', role: 'CEN', x: 90, y: 48 },
    { id: 'del1', role: 'DEL', x: 35, y: 22 },
    { id: 'del2', role: 'DEL', x: 65, y: 22 },
  ],
  '3-4-3': [
    { id: 'por', role: 'POR', x: 50, y: 92 },
    { id: 'def1', role: 'DEF', x: 20, y: 70 },
    { id: 'def2', role: 'DEF', x: 50, y: 70 },
    { id: 'def3', role: 'DEF', x: 80, y: 70 },
    { id: 'cen1', role: 'CEN', x: 12, y: 48 },
    { id: 'cen2', role: 'CEN', x: 37, y: 48 },
    { id: 'cen3', role: 'CEN', x: 63, y: 48 },
    { id: 'cen4', role: 'CEN', x: 88, y: 48 },
    { id: 'del1', role: 'DEL', x: 15, y: 22 },
    { id: 'del2', role: 'DEL', x: 50, y: 22 },
    { id: 'del3', role: 'DEL', x: 85, y: 22 },
  ],
};

const VerPlantillaUsuario: React.FC<{ navigation: NativeStackNavigationProp<any> }> = ({ navigation }) => {
  const route = useRoute<VerPlantillaRoute>();
  const { ligaId, ligaName, userId, userName } = route.params;
  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, { photo?: string; teamCrest?: string }>>({});
  const [playerPoints, setPlayerPoints] = useState<Record<number, number | null>>({});
  const [currentJornada, setCurrentJornada] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await SquadService.getSquadByUser(ligaId, userId);
        setSquad(s);
        // Jornada actual
        try {
          const status = await JornadaService.getJornadaStatus(ligaId);
          setCurrentJornada(status.currentJornada);
        } catch {}
        // Cargar fotos y puntos si hay plantilla
        if (s && s.players && s.players.length) {
          const ids = s.players.map(p => p.playerId);
          // Fotos
          try {
            const details = await Promise.all(ids.map(async (id) => {
              try {
                const det = await PlayerService.getPlayerById(id);
                return { id, photo: det.photo, teamCrest: det.teamCrest };
              } catch {
                return { id, photo: undefined, teamCrest: undefined };
              }
            }));
            const photosMap: Record<number, { photo?: string; teamCrest?: string }> = {};
            for (const d of details) photosMap[d.id] = { photo: d.photo, teamCrest: d.teamCrest };
            setPlayerPhotos(photosMap);
          } catch {}

          // Puntos de la jornada actual (si la tenemos)
          if (currentJornada != null) {
            try {
              // ✨ MIGRADO: Ahora usa PlayerStatsService del backend
              const pointsWithDefaults: Record<number, number | null> = {};
              
              // Obtener stats de cada jugador desde el backend
              for (const playerId of ids) {
                try {
                  const stats = await PlayerStatsService.getPlayerJornadaStats(playerId, currentJornada);
                  pointsWithDefaults[playerId] = stats?.totalPoints ?? null;
                } catch {
                  // Si falla para un jugador, dejar null
                  pointsWithDefaults[playerId] = null;
                }
              }
              
              setPlayerPoints(pointsWithDefaults);
            } catch {}
          }
        }
      } catch (e) {
        setSquad(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ligaId, userId, currentJornada]);

  if (loading) return <LoadingScreen />;

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient colors={["#181818ff", "#181818ff"]} style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          backgroundColor: '#181818', borderBottomWidth: 0.5, borderBottomColor: '#333',
          paddingVertical: 10, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }} activeOpacity={0.8}>
          <ChevronLeftIcon size={28} color="#0892D0" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', flex: 1 }} numberOfLines={1}>
          {userName?.toUpperCase()} <Text style={{ color: '#0892D0' }}>- {ligaName?.toUpperCase()}</Text>
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={{ flex: 1, paddingTop: 60 }}>
        {/* Campo de fútbol a pantalla completa */}
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{
            flex: 1,
            backgroundColor: '#0f0f0f',
            borderRadius: 16,
            borderWidth: 3,
            borderColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
            overflow: 'visible',
            position: 'relative'
          }}>
              {/* Badge de puntuación total - arriba derecha */}
              {(() => {
                const totalPoints = squad?.players.reduce((sum, player) => {
                  const pid = player.playerId;
                  const points = playerPoints[pid] ?? 0;
                  return sum + (player.isCaptain ? points * 2 : points);
                }, 0) ?? 0;
                
                return (
                  <View
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: -12,
                      backgroundColor: '#10b981',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderWidth: 3,
                      borderColor: '#fff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.5,
                      shadowRadius: 6,
                      elevation: 10,
                      zIndex: 1000
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>
                      TOTAL
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                      {totalPoints}
                    </Text>
                  </View>
                );
              })()}
              
              {/* Línea central */}
              <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#fff', opacity: 0.9 }} />
              {/* Círculo central */}
              <View style={{ position: 'absolute', top: '50%', left: '50%', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#fff', opacity: 0.9, marginLeft: -40, marginTop: -40 }} />
              {/* Punto central */}
              <View style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginLeft: -3, marginTop: -3 }} />
              {/* Áreas del portero (arriba/abajo) */}
              <View style={{ position: 'absolute', top: 0, left: '25%', width: '50%', height: 70, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />
              <View style={{ position: 'absolute', top: 0, left: '35%', width: '30%', height: 35, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />
              <View style={{ position: 'absolute', bottom: 0, left: '25%', width: '50%', height: 70, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />
              <View style={{ position: 'absolute', bottom: 0, left: '35%', width: '30%', height: 35, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#fff', opacity: 0.9 }} />

              {squad && formationPositions[squad.formation]?.map(position => {
                const player = squad.players.find(p => p.position === position.id);
                const pid = player?.playerId;
                const photo = pid ? playerPhotos[pid]?.photo : undefined;
                const crest = pid ? playerPhotos[pid]?.teamCrest : undefined;
                const points = pid != null ? playerPoints[pid] : null;
                return (
                  <View key={position.id} style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, width: 80, height: 120, marginLeft: -40, marginTop: -60, alignItems: 'center', justifyContent: 'center' }}>
                    {player ? (
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: player.isCaptain ? '#ffd700' : '#0892D0', backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8, position: 'relative', overflow: 'visible' }}>
                          <View style={{ overflow: 'hidden', borderRadius: 33, width: 66, height: 66 }}>
                            <Image source={{ uri: photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=334155&color=fff&size=128&length=2` }} style={{ width: 66, height: 66, borderRadius: 33 }} resizeMode="cover" />
                          </View>
                          {/* Escudo del equipo */}
                          {crest && (
                            <View style={{ position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 }}>
                              <Image source={{ uri: crest }} style={{ width: 20, height: 20, borderRadius: 10 }} resizeMode="contain" />
                            </View>
                          )}
                          {player.isCaptain && (
                            <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#ffd700', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#b45309' }}>
                              <Text style={{ color: '#1f2937', fontWeight: '900', fontSize: 10 }}>C</Text>
                            </View>
                          )}
                          {/* Badge de puntos - arriba derecha */}
                          <View style={{ position: 'absolute', top: -8, left: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#0892D0', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 5 }}>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{points != null ? points : '-'}</Text>
                          </View>
                        </View>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 8 }} numberOfLines={1}>
                          {player.playerName}
                        </Text>
                        <View style={{ backgroundColor: roleColor(player.role), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>{player.role}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', opacity: 0.5 }}>
                        <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#334155', backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#64748b', fontWeight: 'bold' }}>{position.role}</Text>
                        </View>
                        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Vacío</Text>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        </View>
      </View>
      </LinearGradient>
    </SafeLayout>
  );
};

export default VerPlantillaUsuario;