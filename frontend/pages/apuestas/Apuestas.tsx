import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';

type Bet = {
  matchId: number;
  jornada: number;
  local: string;
  visitante: string;
  localCrest?: string;
  visitanteCrest?: string;
  fecha?: string;
  hora?: string;
  type: string;
  label: string;
  odd: number;
};

type ApuestasRouteProps = RouteProp<{ params: { ligaId?: string; ligaName?: string } }, 'params'>;

export const Apuestas: React.FC = () => {
  const route = useRoute<ApuestasRouteProps>();
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<Bet[]>([]);
  const [jornada, setJornada] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
  const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });
        if (mounted) {
          setBets(apuestas);
          if (apuestas.length > 0) {
            setJornada(apuestas[0].jornada);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error('Error loading apuestas:', e);
        if (mounted) {
          setBets([]);
          setJornada(null);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      {loading ? (
        <LoadingScreen />
      ) : (
        <LinearGradient colors={['#181818ff','#181818ff']} start={{x:0,y:0}} end={{x:0,y:1}} style={{flex:1}}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Apuestas Recomendadas</Text>
            {jornada != null && (
              <Text style={{ color: '#94a3b8', marginBottom: 16 }}>Próxima jornada: {jornada}</Text>
            )}
            {bets.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', textAlign: 'center' }}>
                  No hay apuestas disponibles en este momento.
                </Text>
              </View>
            ) : (
              bets.map((b, index) => (
            <View 
              key={b.matchId} 
              style={{ 
                backgroundColor: '#1a2332', 
                borderWidth: 1, 
                borderColor: '#334155', 
                borderRadius: 12, 
                padding: 14, 
                marginBottom: 12,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              {/* Número de apuesta */}
              <View style={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                backgroundColor: '#0f172a', 
                borderRadius: 12, 
                paddingHorizontal: 8, 
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: '#334155',
              }}>
                <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700' }}>#{index + 1}</Text>
              </View>

              {/* Equipos */}
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  {b.localCrest ? (
                    <Image source={{ uri: b.localCrest }} style={{ width: 32, height: 32, marginRight: 10 }} resizeMode="contain" />
                  ) : null}
                  <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 16, flex: 1 }} numberOfLines={1}>{b.local}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {b.visitanteCrest ? (
                    <Image source={{ uri: b.visitanteCrest }} style={{ width: 32, height: 32, marginRight: 10 }} resizeMode="contain" />
                  ) : null}
                  <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 16, flex: 1 }} numberOfLines={1}>{b.visitante}</Text>
                </View>
                {b.fecha && b.hora && (
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                    📅 {b.fecha} · 🕐 {b.hora}
                  </Text>
                )}
              </View>
              
              {/* Divisor */}
              <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 10 }} />
              
              {/* Apuesta seleccionada */}
              <View>
                <Text style={{ color: '#93c5fd', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>
                  {b.type}
                </Text>
                <View style={{ 
                  backgroundColor: '#0f172a', 
                  borderRadius: 10, 
                  padding: 12,
                  borderWidth: 2,
                  borderColor: '#22c55e',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 15, flex: 1 }}>
                      {b.label}
                    </Text>
                    <View style={{
                      backgroundColor: '#22c55e',
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      marginLeft: 8,
                    }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                        {b.odd.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
          </ScrollView>
          <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
        </LinearGradient>
      )}
    </>
  );
};

export default Apuestas;
