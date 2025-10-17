import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import { BetService, BettingBudget, Bet as UserBet } from '../../services/BetService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { EditIcon, DeleteIcon, CheckIcon, CheckCircleIcon, ErrorIcon, CalendarIcon, ClockIcon, MenuIcon } from '../../components/VectorIcons';
import { DrawerMenu } from '../../components/DrawerMenu';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

type ApuestasRouteProps = RouteProp<{ params: { ligaId?: string; ligaName?: string } }, 'params'>;

type ApuestasProps = {
  navigation: NativeStackNavigationProp<any>;
  route: ApuestasRouteProps;
};

export const Apuestas: React.FC<ApuestasProps> = ({ navigation, route }) => {
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const [loading, setLoading] = useState(true);
  const [groupedBets, setGroupedBets] = useState<GroupedBet[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [jornada, setJornada] = useState<number | null>(null);
  const [budget, setBudget] = useState<BettingBudget>({ total: 250, used: 0, available: 250 });
  const [savingBet, setSavingBet] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [leagueBets, setLeagueBets] = useState<UserBet[]>([]);
  
  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });
        
        // Obtener presupuesto y apuestas del usuario si hay ligaId
        let budgetData = { total: 250, used: 0, available: 250 };
        let userBetsData: UserBet[] = [];
        let leagueBetsData: UserBet[] = [];
        if (ligaId) {
          try {
            budgetData = await BetService.getBettingBudget(ligaId);
            userBetsData = await BetService.getUserBets(ligaId);
            leagueBetsData = await BetService.getLeagueBets(ligaId);
          } catch (err) {
            console.warn('Error getting budget/bets:', err);
          }
        }

        if (mounted) {
          // Agrupar apuestas por matchId + type para consolidar opciones
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
          setUserBets(userBetsData);
          setLeagueBets(leagueBetsData);
          setBudget(budgetData);
          if (apuestas.length > 0) {
            setJornada(apuestas[0].jornada);
          }
          setLoading(false);
        }
      } catch (e) {
        console.error('Error loading apuestas:', e);
        if (mounted) {
          setGroupedBets([]);
          setUserBets([]);
          setBudget({ total: 250, used: 0, available: 250 });
          setJornada(null);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [ligaId, ligaName]);

  // Todas las acciones de crear/editar/eliminar apuestas se han deshabilitado (bloqueo de jornada)

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  // Se eliminan manejadores de crear/editar/eliminar apuestas para vista de solo lectura

  // Edición de apuestas deshabilitada

  // Eliminación de apuestas deshabilitada

  // Cálculos de ganancias potenciales no son necesarios en modo lectura

  // Función auxiliar para verificar si una opción tiene apuesta del usuario
  const getUserBetForOption = (matchId: number, betType: string, betLabel: string): UserBet | undefined => {
    return userBets.find(
      (bet) => bet.matchId === matchId && bet.betType === betType && bet.betLabel === betLabel
    );
  };

  // Función para verificar si existe alguna apuesta en el grupo (mismo matchId + betType)
  const hasAnyBetInGroup = (matchId: number, betType: string): boolean => {
    return userBets.some((bet) => bet.matchId === matchId && bet.betType === betType);
  };

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
    <>
      {loading ? (
        <LoadingScreen />
      ) : (
        <LinearGradient colors={['#181818ff','#181818ff']} start={{x:0,y:0}} end={{x:0,y:1}} style={{flex:1}}>
          {/* Top Header Bar - Estilo idéntico a LigaTopNavBar */}
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
                      padding: 0,
                      margin: 0,
                      borderRadius: 0,
                    }}
                  >
                    <MenuIcon size={32} color="#ffffff" />
                  </TouchableOpacity>
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
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                LIGA{' '}
                <Text style={{ color: '#0892D0' }}>
                  {ligaName.toUpperCase()}
                </Text>
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Apuestas</Text>
            {jornada != null && (
              <Text style={{ color: '#94a3b8', marginBottom: 16 }}>Jornada {jornada}</Text>
            )}

            {/* Mensajes de éxito/error */}
            {successMessage && (
              <View style={{
                backgroundColor: '#065f46',
                borderWidth: 1,
                borderColor: '#10b981',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <CheckCircleIcon size={20} color="#10b981" />
                <Text style={{ color: '#d1fae5', marginLeft: 8, flex: 1, fontWeight: '600' }}>
                  {successMessage}
                </Text>
              </View>
            )}

            {errorMessage && (
              <View style={{
                backgroundColor: '#7f1d1d',
                borderWidth: 1,
                borderColor: '#ef4444',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <ErrorIcon size={20} color="#ef4444" />
                <Text style={{ color: '#fecaca', marginLeft: 8, flex: 1, fontWeight: '600' }}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Presupuesto */}
            {ligaId && (
              <View style={{
                backgroundColor: '#1a2332',
                borderWidth: 1,
                borderColor: '#334155',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}>
                <Text style={{ color: '#93c5fd', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
                  PRESUPUESTO DE APUESTAS
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Total:</Text>
                  <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '700' }}>{budget.total}M</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Apostado:</Text>
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>{budget.used}M</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>Disponible:</Text>
                  <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '800' }}>{budget.available}M</Text>
                </View>
              </View>
            )}

            {groupedBets.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', textAlign: 'center' }}>
                  No hay apuestas disponibles en este momento.
                </Text>
              </View>
            ) : (
              groupedBets.map((b, index) => (
                <View 
                  key={`${b.matchId}-${b.type}`} 
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CalendarIcon size={14} color="#64748b" />
                          <Text style={{ color: '#64748b', fontSize: 12 }}>{b.fecha}</Text>
                        </View>
                        <Text style={{ color: '#64748b', fontSize: 12 }}>·</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ClockIcon size={14} color="#64748b" />
                          <Text style={{ color: '#64748b', fontSize: 12 }}>{b.hora}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                  
                  {/* Divisor */}
                  <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 10 }} />
                  
                  {/* Tipo de apuesta */}
                  <Text style={{ color: '#93c5fd', fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' }}>
                    {b.type}
                  </Text>

                  {/* TODAS las opciones - Solo lectura */}
                  {b.options.map((option, optionIndex) => {
                    const betKey = `${b.matchId}-${b.type}-${optionIndex}`;
                    // Modo lectura: no inputs ni botones
                    
                    // Verificar si el usuario ya apostó en esta opción
                    const userBet = getUserBetForOption(b.matchId, b.type, option.label);
                    const groupHasBet = hasAnyBetInGroup(b.matchId, b.type);
                    const isBlocked = groupHasBet && !userBet;
                    
                    return (
                      <View 
                        key={betKey}
                        style={{ 
                          backgroundColor: userBet ? '#0c1829' : isBlocked ? '#0a0f1a' : '#0f172a', 
                          borderRadius: 10, 
                          padding: 12,
                          borderWidth: userBet ? 2 : 1,
                          borderColor: userBet ? '#3b82f6' : isBlocked ? '#1e293b' : '#334155',
                          marginBottom: optionIndex < b.options.length - 1 ? 8 : 0,
                          opacity: isBlocked ? 0.5 : 1,
                        }}
                      >
                        {/* Indicador de bloqueado */}
                        {isBlocked && (
                          <View style={{
                            backgroundColor: '#7f1d1d',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginBottom: 8,
                            alignSelf: 'flex-start',
                          }}>
                            <Text style={{ color: '#fca5a5', fontSize: 11, fontWeight: '700' }}>
                              🔒 BLOQUEADA - Ya apostaste en otra opción
                            </Text>
                          </View>
                        )}
                        
                        {/* Label y Cuota */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ color: isBlocked ? '#64748b' : '#e5e7eb', fontWeight: '600', fontSize: 15, flex: 1 }}>
                            {option.label}
                          </Text>
                          <View style={{
                            backgroundColor: 'transparent',
                            borderRadius: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 6,
                            marginLeft: 8,
                            borderWidth: 2,
                            borderColor: isBlocked ? '#4b5563' : '#ef4444',
                          }}>
                            <Text style={{ color: isBlocked ? '#64748b' : '#ef4444', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 }}>
                              {option.odd.toFixed(2)}
                            </Text>
                          </View>
                        </View>

                        {/* Si el usuario ya apostó - Mostrar info de apuesta (solo lectura) */}
                        {userBet && ligaId && (
                          <View style={{
                            backgroundColor: '#1e293b',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 8,
                          }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <View>
                                    <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Apostado</Text>
                                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                                      {userBet.amount}M
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Ganancia potencial</Text>
                                    <Text style={{ color: '#10b981', fontSize: 18, fontWeight: '800' }}>
                                      +{userBet.potentialWin}M
                                    </Text>
                                  </View>
                                </View>
                            {/* Sin botones de editar/eliminar ni inputs */}
                          </View>
                        )}

                        {/* Sin input de cantidad ni botón de apostar en modo lectura */}
                      </View>
                    );
                  })}
                </View>
              ))
            )}

            {/* Apuestas de todos los participantes de la liga (jornada actual) */}
            {ligaId && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
                  Apuestas de la liga
                </Text>
                {leagueBets.length === 0 ? (
                  <Text style={{ color: '#94a3b8' }}>Nadie ha apostado aún.</Text>
                ) : (
                  leagueBets.map((bet) => (
                    <View
                      key={bet.id}
                      style={{
                        backgroundColor: '#0f172a',
                        borderWidth: 1,
                        borderColor: '#334155',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>
                          {bet.userName || 'Jugador'}
                        </Text>
                        <Text style={{ color: '#22c55e', fontWeight: '800' }}>
                          {bet.amount}M
                        </Text>
                      </View>
                      <Text style={{ color: '#93c5fd', marginTop: 4, fontSize: 12 }}>
                        {bet.betType}
                      </Text>
                      <Text style={{ color: '#94a3b8', marginTop: 2 }}>
                        {bet.betLabel} · cuota {bet.odd.toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
          <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
          
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
    </>
  );
};

export default Apuestas;
