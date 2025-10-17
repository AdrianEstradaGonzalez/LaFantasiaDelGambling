import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SquadService, Squad } from '../../services/SquadService';
import { JornadaService } from '../../services/JornadaService';
import LoadingScreen from '../../components/LoadingScreen';
import { ChevronLeftIcon } from '../../components/VectorIcons';

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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await SquadService.getSquadByUser(ligaId, userId);
        setSquad(s);
      } catch (e) {
        setSquad(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ligaId, userId]);

  if (loading) return <LoadingScreen />;

  return (
    <LinearGradient colors={["#0f172a", "#0f172a"]} style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          backgroundColor: '#0f172a', borderBottomWidth: 0.5, borderBottomColor: '#333',
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

      <ScrollView style={{ flex: 1, paddingTop: 60 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ backgroundColor: '#0f172a', borderBottomColor: '#334155' }}>
          {/* Campo táctico */}
          <View style={{
            backgroundColor: '#0a1628',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#334155',
            overflow: 'hidden',
            padding: 14,
            alignItems: 'center'
          }}>
            <View style={{ width: '100%', aspectRatio: 9/16, backgroundColor: '#0b1220', borderRadius: 8, position: 'relative' }}>
              {/* Líneas del campo */}
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderColor: '#1f2937' }} />

              {squad && formationPositions[squad.formation]?.map(position => {
                const player = squad.players.find(p => p.position === position.id);
                return (
                  <View key={position.id} style={{ position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, width: 80, height: 105, marginLeft: -40, marginTop: -52, alignItems: 'center' }}>
                    {player ? (
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: player.isCaptain ? '#ffd700' : '#0892D0', backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }}>
                          <Image source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=334155&color=fff&size=128&length=2` }} style={{ width: 66, height: 66, borderRadius: 33 }} resizeMode="cover" />
                          {player.isCaptain && (
                            <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#ffd700', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#b45309' }}>
                              <Text style={{ color: '#1f2937', fontWeight: '900', fontSize: 10 }}>C</Text>
                            </View>
                          )}
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
      </ScrollView>
    </LinearGradient>
  );
};

export default VerPlantillaUsuario;