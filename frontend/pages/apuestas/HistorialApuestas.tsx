import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BetService, Bet as UserBet } from '../../services/BetService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { MenuIcon, CalendarIcon, ClockIcon, FileTextIcon } from '../../components/VectorIcons';
import { DrawerMenu } from '../../components/DrawerMenu';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FootballService from '../../services/FutbolService';
import { SafeLayout } from '../../components/SafeLayout';
import formatLabelWithType from '../../utils/formatBetLabel';

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

type GroupedBet = {
  matchId: number;
  jornada: number;
  local: string;
  visitante: string;
  localCrest?: string;
  visitanteCrest?: string;
  fecha?: string;
  hora?: string;
  type: string;
  options: Array<{ label: string; odd: number }>;
};

type HistorialApuestasRouteProps = RouteProp<{ params: { ligaId?: string; ligaName?: string; division?: string; isPremium?: boolean } }, 'params'>;

type HistorialApuestasProps = {
  navigation: NativeStackNavigationProp<any>;
  route: HistorialApuestasRouteProps;
};

export const HistorialApuestas: React.FC<HistorialApuestasProps> = ({ navigation, route }) => {
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const division = route.params?.division || 'primera';
  const isPremium = route.params?.isPremium || false;
  const [loading, setLoading] = useState(true);
  const [leagueBets, setLeagueBets] = useState<UserBet[]>([]);
  const [groupedBets, setGroupedBets] = useState<GroupedBet[]>([]);
  const [jornada, setJornada] = useState<number | null>(null);
  
  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!ligaId) {
          setLoading(false);
          return;
        }

        // Obtener todas las apuestas de la liga
        const leagueBetsData = await BetService.getLeagueBets(ligaId);
        console.log('📊 HistorialApuestas - League Bets Data:', leagueBetsData);
        console.log('📊 HistorialApuestas - Total bets:', leagueBetsData.length);
        
        // Obtener información de apuestas disponibles para obtener info de partidos
        const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });
        
        if (mounted) {
          // Agrupar apuestas por matchId + type
          const grouped: Record<string, GroupedBet> = {};
          for (const bet of apuestas) {
            const key = `${bet.matchId}-${bet.type}`;
            if (!grouped[key]) {
              grouped[key] = {
                matchId: bet.matchId,
                jornada: bet.jornada,
                local: bet.local,
                visitante: bet.visitante,
                localCrest: bet.localCrest,
                visitanteCrest: bet.visitanteCrest,
                fecha: bet.fecha,
                hora: bet.hora,
                type: bet.type,
                options: [],
              };
            }
            grouped[key].options.push({ label: bet.label, odd: bet.odd });
          }
          
          const groupedArray = Object.values(grouped);
          setGroupedBets(groupedArray);
          setLeagueBets(leagueBetsData);
          
          if (apuestas.length > 0) {
            setJornada(apuestas[0].jornada);
          }
          
          setLoading(false);
        }
      } catch (e) {
        console.error('Error loading historial apuestas:', e);
        if (mounted) {
          setLeagueBets([]);
          setGroupedBets([]);
          setJornada(null);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [ligaId, ligaName]);

  // Animación del drawer
  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isDrawerOpen, slideAnim]);

  return (
    <SafeLayout backgroundColor="#181818ff">
      {loading ? (
        <LoadingScreen />
      ) : (
        <LinearGradient colors={['#181818ff','#181818ff']} start={{x:0,y:0}} end={{x:0,y:1}} style={{flex:1}}>
          {/* Icono Drawer arriba absoluto */}
          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 100,
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <MenuIcon size={32} color="#ffffff" />
          </TouchableOpacity>

          {/* Top Header */}
          {ligaName && (
            <View style={{
              backgroundColor: '#181818',
              borderBottomWidth: 0.5,
              borderBottomColor: '#333',
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 40 }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  LIGA{' '}
                  <Text style={{ color: '#0892D0' }}>
                    {ligaName.toUpperCase()}
                  </Text>
                </Text>
              </View>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Historial de Apuestas</Text>
            {jornada != null && (
              <Text style={{ color: '#94a3b8', marginBottom: 16 }}>Jornada {jornada}</Text>
            )}

            {leagueBets.length === 0 ? (
              <View style={{ 
                flex: 1,
                alignItems: 'center',
                paddingVertical: 100,
                paddingHorizontal: 40,
              }}>
                <View style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 2,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 24,
                }}>
                  <FileTextIcon size={50} color="#3b82f6" />
                </View>
                <Text style={{ 
                  color: '#e2e8f0', 
                  fontSize: 20,
                  fontWeight: '700',
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}>
                  Sin apuestas registradas
                </Text>
                <Text style={{ 
                  color: '#64748b', 
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 22,
                }}>
                  Aún no has realizado ninguna apuesta en esta liga
                </Text>
              </View>
            ) : (
              <>
                {/* Resumen general */}
                <View style={{
                  backgroundColor: '#1a2332',
                  borderWidth: 2,
                  borderColor: '#3b82f6',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#334155',
                  }}>
                    <View style={{
                      backgroundColor: '#1e3a8a',
                      borderRadius: 8,
                      padding: 8,
                      marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 24 }}>📊</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#93c5fd', fontSize: 18, fontWeight: '800' }}>
                        RESUMEN GENERAL
                      </Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                        {leagueBets.length} apuesta{leagueBets.length !== 1 ? 's' : ''} realizadas
                      </Text>
                    </View>
                  </View>

                  {/* Agrupar por jugador */}
                  {(() => {
                    const betsByUser: Record<string, { bets: UserBet[], totalAmount: number }> = {};
                    leagueBets.forEach((bet) => {
                      const userName = bet.userName || 'Jugador';
                      if (!betsByUser[userName]) {
                        betsByUser[userName] = { bets: [], totalAmount: 0 };
                      }
                      betsByUser[userName].bets.push(bet);
                      betsByUser[userName].totalAmount += bet.amount;
                    });

                    return Object.entries(betsByUser).map(([userName, data]) => (
                      <View key={userName} style={{
                        backgroundColor: '#0f172a',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: '#3b82f6',
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 15 }}>
                            {userName}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ color: '#64748b', fontSize: 13 }}>
                              {data.bets.length} apuesta{data.bets.length !== 1 ? 's' : ''}
                            </Text>
                            <Text style={{ color: '#22c55e', fontWeight: '800', fontSize: 15 }}>
                              {data.totalAmount}M
                            </Text>
                          </View>
                        </View>
                      </View>
                    ));
                  })()}
                </View>

                {/* Apuestas por partido */}
                <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                  Apuestas por Partido
                </Text>

                {(() => {
                  // Agrupar por matchId
                  const betsByMatch: Record<number, UserBet[]> = {};
                  leagueBets.forEach((bet) => {
                    if (!betsByMatch[bet.matchId]) {
                      betsByMatch[bet.matchId] = [];
                    }
                    betsByMatch[bet.matchId].push(bet);
                  });

                  return Object.entries(betsByMatch).map(([matchIdStr, bets]) => {
                    const matchId = parseInt(matchIdStr);
                    // Encontrar info del partido
                    const matchInfo = groupedBets.find((gb) => gb.matchId === matchId);
                    
                    return (
                      <View key={matchId} style={{
                        backgroundColor: '#1a2332',
                        borderWidth: 1,
                        borderColor: '#334155',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 12,
                      }}>
                        {/* Equipos del partido */}
                        {matchInfo && (
                          <View style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              {matchInfo.localCrest && (
                                <Image 
                                  source={{ uri: matchInfo.localCrest }} 
                                  style={{ width: 24, height: 24, marginRight: 8 }} 
                                  resizeMode="contain" 
                                />
                              )}
                              <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 15 }}>
                                {matchInfo.local}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                              {matchInfo.visitanteCrest && (
                                <Image 
                                  source={{ uri: matchInfo.visitanteCrest }} 
                                  style={{ width: 24, height: 24, marginRight: 8 }} 
                                  resizeMode="contain" 
                                />
                              )}
                              <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 15 }}>
                                {matchInfo.visitante}
                              </Text>
                            </View>
                            {matchInfo.fecha && matchInfo.hora && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <CalendarIcon size={14} color="#64748b" />
                                  <Text style={{ color: '#64748b', fontSize: 12 }}>{matchInfo.fecha}</Text>
                                </View>
                                <Text style={{ color: '#64748b', fontSize: 12 }}>·</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <ClockIcon size={14} color="#64748b" />
                                  <Text style={{ color: '#64748b', fontSize: 12 }}>{matchInfo.hora}</Text>
                                </View>
                              </View>
                            )}
                          </View>
                        )}

                        <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 10 }} />

                        {/* Lista de apuestas */}
                        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                          {bets.length} apuesta{bets.length !== 1 ? 's' : ''}
                        </Text>
                        
                        {bets.map((bet, idx) => (
                          <View 
                            key={bet.id} 
                            style={{
                              backgroundColor: '#0f172a',
                              borderRadius: 6,
                              padding: 10,
                              marginBottom: idx < bets.length - 1 ? 8 : 0,
                              borderLeftWidth: 3,
                              borderLeftColor: '#3b82f6',
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 13 }}>
                                {bet.userName || 'Jugador'}
                              </Text>
                              <Text style={{ color: '#22c55e', fontWeight: '800', fontSize: 14 }}>
                                {bet.amount}M
                              </Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>
                              {bet.betType}
                            </Text>
                            <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                              {formatLabelWithType(bet.betLabel, bet.betType)}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                              <Text style={{ color: '#64748b', fontSize: 11 }}>
                                Cuota: {bet.odd.toFixed(2)}
                              </Text>
                              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>
                                Ganancia potencial: +{bet.potentialWin}M
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  });
                })()}
              </>
            )}
          </ScrollView>

          <LigaNavBar ligaId={ligaId} ligaName={ligaName} division={division} isPremium={isPremium} />
          
          {/* Drawer Modal */}
          <Modal
            visible={isDrawerOpen}
            animationType="none"
            transparent={true}
            onRequestClose={() => setIsDrawerOpen(false)}
          >
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {/* Drawer content con animación */}
              <Animated.View 
                style={{ 
                  width: '75%', 
                  maxWidth: 300,
                  transform: [{ translateX: slideAnim }]
                }}
              >
                <DrawerMenu 
                  navigation={{
                    ...navigation,
                    closeDrawer: () => setIsDrawerOpen(false),
                    reset: (state: any) => {
                      navigation.reset(state);
                      setIsDrawerOpen(false);
                    },
                  }}
                  ligaId={ligaId}
                />
              </Animated.View>
              {/* Overlay to close drawer */}
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
                activeOpacity={1}
                onPress={() => setIsDrawerOpen(false)}
              />
            </View>
          </Modal>
        </LinearGradient>
      )}
    </SafeLayout>
  );
};

export default HistorialApuestas;
