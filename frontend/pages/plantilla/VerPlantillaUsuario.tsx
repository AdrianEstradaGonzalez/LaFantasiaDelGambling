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
import { ChevronLeftIcon, AlertIcon } from '../../components/VectorIcons';
import { SafeLayout } from '../../components/SafeLayout';
import { AdBanner } from '../../components/AdBanner';

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

// Mapear roles cortos (POR, DEF, CEN, DEL) a posiciones canónicas (Goalkeeper, Defender, etc.)
const roleToCanonicalPosition = (role: string): string => {
  switch (role) {
    case 'POR': return 'Goalkeeper';
    case 'DEF': return 'Defender';
    case 'CEN': return 'Midfielder';
    case 'DEL': return 'Attacker';
    default: return role; // Si ya viene en formato largo, retornar tal cual
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
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, { photo?: string; teamCrest?: string; position?: string }>>({});
  const [playerPoints, setPlayerPoints] = useState<Record<number, { points: number | null; minutes: number | null }>>({});
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
                // Include canonical position from PlayerService so PlayerDetail can normalize it
                return { id, photo: det.photo, teamCrest: det.teamCrest, position: det.position };
              } catch {
                return { id, photo: undefined, teamCrest: undefined, position: undefined };
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
              const pointsWithDefaults: Record<number, { points: number | null; minutes: number | null }> = {};

              // Obtener stats de cada jugador desde el backend
              for (const playerId of ids) {
                try {
                  const stats = await PlayerStatsService.getPlayerJornadaStats(playerId, currentJornada);
                  pointsWithDefaults[playerId] = {
                    points: stats?.totalPoints ?? null,
                    minutes: stats?.minutes ?? null,
                  };
                } catch {
                  // Si falla para un jugador, dejar nulls
                  pointsWithDefaults[playerId] = { points: null, minutes: null };
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

      {/* Warning de plantilla incompleta */}
      {squad && squad.players && squad.players.length < 11 && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 60,
            marginBottom: 8,
            backgroundColor: '#451a03',
            borderRadius: 12,
            padding: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#f59e0b',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <AlertIcon size={24} color="#fbbf24" />
            <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '700', marginLeft: 12 }}>
              Plantilla Incompleta
            </Text>
          </View>
          <Text style={{ color: '#fcd34d', fontSize: 14, lineHeight: 20 }}>
              Se requiere plantilla completa para puntuar.
          </Text>
        </View>
      )}

      {/* Banner publicitario */}
      <View style={{ marginHorizontal: 16, marginTop: squad && squad.players && squad.players.length < 11 ? 8 : 60, marginBottom: 8 }}>
        <AdBanner />
      </View>

      <View style={{ flex: 1, paddingTop: 0 }}>
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
                // Calcular puntos individuales
                const sumPoints = squad?.players.reduce((sum, player) => {
                  const pid = player.playerId;
                  const ptsObj = pid != null ? playerPoints[pid] : undefined;
                  const points = ptsObj?.points ?? 0;
                  return sum + (player.isCaptain ? points * 2 : points);
                }, 0) ?? 0;

                // ⚠️ Si hay menos de 11 jugadores, el total es 0
                const totalPoints = (squad && squad.players && squad.players.length < 11) ? 0 : sumPoints;

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
                return (
                  <View key={position.id} style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, width: 80, height: 120, marginLeft: -40, marginTop: -60, alignItems: 'center', justifyContent: 'center' }}>
                    {player ? (
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: player.isCaptain ? '#ffd700' : '#0892D0', backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8, position: 'relative', overflow: 'visible' }}>
                          <View style={{ overflow: 'hidden', borderRadius: 33, width: 66, height: 66 }}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                // Navegar a detalles del jugador. Construimos un objeto "player" mínimo
                                // con los campos que PlayerDetail espera (id, name, photo, position, price).
                                const pid = player.playerId;
                                // Prefer canonical position from the PlayerService lookup; fall back to squad role if needed
                                const canonicalPos = pid ? playerPhotos[pid]?.position : undefined;
                                // Si no hay posición canónica, convertir el role (POR/DEF/CEN/DEL) a formato canónico
                                const finalPosition = canonicalPos || roleToCanonicalPosition(player.role || position.role);
                                
                                const playerForNav = {
                                  id: pid,
                                  name: player.playerName,
                                  photo: photo,
                                  position: finalPosition,
                                  price: (player.pricePaid as any) || undefined,
                                };

                                navigation.navigate('PlayerDetail', {
                                  player: playerForNav,
                                  ligaId,
                                  ligaName,
                                  isAlreadyInSquad: true,
                                  currentFormation: squad?.formation,
                                });
                              }}
                            >
                              <Image source={{ uri: photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=334155&color=fff&size=128&length=2` }} style={{ width: 66, height: 66, borderRadius: 33 }} resizeMode="cover" />
                            </TouchableOpacity>
                          </View>
                          {/* Escudo del equipo */}
                          {/* Indicador x2 (capitán) o Escudo (no capitán) - arriba izquierda */}
                          {player.isCaptain ? (
                            <View style={{ position: 'absolute', top: -8, left: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffd700', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 }}>
                              <Text style={{ color: '#1f2937', fontWeight: '900', fontSize: 10 }}>x2</Text>
                            </View>
                          ) : (
                            crest && (
                              <View style={{ position: 'absolute', top: -4, left: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 }}>
                                <Image source={{ uri: crest }} style={{ width: 20, height: 20, borderRadius: 10 }} resizeMode="contain" />
                              </View>
                            )
                          )}

                          {/* Badge de puntos - arriba derecha */}
                          <View style={{ position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#0892D0', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 5 }}>
                              {(() => {
                                const pointsObj = pid != null ? playerPoints[pid] : undefined;
                                // Mostrar '-' si no hay stats o si no jugó minutos aún (minutes === 0 o minutes == null)
                                const showDash = !pointsObj || pointsObj.minutes == null || pointsObj.minutes === 0;
                                if (showDash) {
                                  return (
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>-</Text>
                                  );
                                }

                                const ptsNum = (pointsObj!.points ?? 0);
                                const displayNum = player.isCaptain ? ptsNum * 2 : ptsNum;

                                return (
                                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{displayNum}</Text>
                                );
                              })()}
                          </View>
                          {/* (crest arriba-izq ya mostrado o x2 si capitán) */}
                        </View>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 8 }} numberOfLines={1}>
                          {player.playerName}
                        </Text>
                        <View style={{ backgroundColor: roleColor(player.role || position.role), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>{player.role || position.role}</Text>
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