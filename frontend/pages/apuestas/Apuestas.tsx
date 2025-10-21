import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Animated, KeyboardAvoidingView, Platform, Keyboard, findNodeHandle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import { JornadaService } from '../../services/JornadaService';
import { BetService, BettingBudget, Bet as UserBet } from '../../services/BetService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { EditIcon, DeleteIcon, CheckIcon, CheckCircleIcon, ErrorIcon, CalendarIcon, ClockIcon, MenuIcon, FileTextIcon } from '../../components/VectorIcons';
import { CustomAlertManager } from '../../components/CustomAlert';
import { DrawerMenu } from '../../components/DrawerMenu';
import { SafeLayout } from '../../components/SafeLayout';
import { SmartTextInput } from '../../components/SmartTextInput';
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
  const [jornadaStatus, setJornadaStatus] = useState<string | null>(null); // 'open' | 'closed'
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});
  const [editingBets, setEditingBets] = useState<Record<string, boolean>>({});
  
  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });
        
        // Obtener presupuesto y apuestas del usuario si hay ligaId
        let budgetData = { total: 250, used: 0, available: 250 };
        let userBetsData: UserBet[] = [];
        let leagueBetsData: UserBet[] = [];
        let statusData: string | null = null;
        if (ligaId) {
          try {
            budgetData = await BetService.getBettingBudget(ligaId);
            userBetsData = await BetService.getUserBets(ligaId);
            leagueBetsData = await BetService.getLeagueBets(ligaId);
            const statusResp = await JornadaService.getJornadaStatus(ligaId);
            statusData = statusResp.status;
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
          if (statusData) setJornadaStatus(statusData);
          if (apuestas.length > 0) {
            setJornada(apuestas[0].jornada);
          }
          console.log('🎲 DEBUG Apuestas - Status:', statusData);
          console.log('🎲 DEBUG Apuestas - League Bets:', leagueBetsData);
          console.log('🎲 DEBUG Apuestas - Grouped Bets:', groupedArray);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error loading apuestas:', e);
        if (mounted) {
          setGroupedBets([]);
          setUserBets([]);
          setBudget({ total: 250, used: 0, available: 250 });
          setJornada(null);
          setJornadaStatus(null);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [ligaId, ligaName]);

  // Helpers y handlers para crear/editar/eliminar apuestas cuando la jornada está abierta

  const refreshBets = async () => {
    if (!ligaId) return;
    try {
      const [budgetData, userBetsData, leagueBetsData, statusResp] = await Promise.all([
        BetService.getBettingBudget(ligaId),
        BetService.getUserBets(ligaId),
        BetService.getLeagueBets(ligaId),
        JornadaService.getJornadaStatus(ligaId),
      ]);
      setBudget(budgetData);
      setUserBets(userBetsData);
      setLeagueBets(leagueBetsData);
      setJornadaStatus(statusResp.status);
    } catch (err: any) {
      console.warn('Error refreshing bets/budget:', err?.message || err);
    }
  };

  const setAmountForKey = (key: string, value: string) => {
    // Solo números y punto
    let sanitized = value.replace(/[^0-9.]/g, '');
    setAmountInputs((prev) => ({ ...prev, [key]: sanitized }));
  };

  const handlePlaceBet = async (key: string, params: { matchId: number; homeTeam: string; awayTeam: string; betType: string; betLabel: string; odd: number }) => {
    if (!ligaId) return;
    const raw = amountInputs[key] ?? '';
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      showError('Introduce una cantidad válida');
      return;
    }
    if (amount > 50) {
      CustomAlertManager.alert(
        'Límite de apuesta',
        'El máximo por apuesta es 50M',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }
    try {
      setSavingBet(key);
      console.log('📤 Frontend - Enviando apuesta con:', {
        matchId: params.matchId,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        betType: params.betType,
        betLabel: params.betLabel,
        odd: params.odd,
        amount,
      });
      await BetService.placeBet({
        leagueId: ligaId,
        matchId: params.matchId,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        betType: params.betType,
        betLabel: params.betLabel,
        odd: params.odd,
        amount,
      });
      showSuccess('Apuesta realizada');
      // limpiar input del grupo (evitar reusar importe)
      setAmountInputs((prev) => ({ ...prev, [key]: '' }));
      await refreshBets();
    } catch (err: any) {
      showError(err?.message || 'Error al crear apuesta');
    } finally {
      setSavingBet(null);
    }
  };

  const handleUpdateBet = async (key: string, betId: string) => {
    if (!ligaId) return;
    const raw = amountInputs[key] ?? '';
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      showError('Introduce una cantidad válida');
      return;
    }
    if (amount > 50) {
      CustomAlertManager.alert(
        'Límite de apuesta',
        'El máximo por apuesta es 50M',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }
    try {
      setSavingBet(key);
      await BetService.updateBetAmount(ligaId, betId, amount);
      showSuccess('Apuesta actualizada');
      await refreshBets();
    } catch (err: any) {
      showError(err?.message || 'Error al actualizar apuesta');
    } finally {
      setSavingBet(null);
    }
  };

  const handleDeleteBet = async (key: string, betId: string) => {
    if (!ligaId) return;
    try {
      setSavingBet(key);
      await BetService.deleteBet(ligaId, betId);
      showSuccess('Apuesta eliminada');
      await refreshBets();
    } catch (err: any) {
      showError(err?.message || 'Error al eliminar apuesta');
    } finally {
      setSavingBet(null);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  // Cálculos de ganancias potenciales los devuelve el backend con la apuesta del usuario

  // Función auxiliar para verificar si una opción tiene apuesta del usuario
  const getUserBetForOption = (matchId: number, betType: string, betLabel: string): UserBet | undefined => {
    return userBets.find(
      (bet) => bet.matchId === matchId && bet.betType === betType && bet.betLabel === betLabel
    );
  };

  // Normalizar etiquetas para comparar (quita tildes, espacios extra y mayúsculas/minúsculas)
  const normalizeLabel = (s: string) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/\s+/g, ' ') // colapsar espacios
      .trim()
      .toLowerCase();

  const normalizeType = (s: string) =>
    (s || '')
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  // Función para verificar si existe alguna apuesta en el grupo (mismo matchId + betType)
  const hasAnyBetInGroup = (matchId: number, betType: string): boolean => {
    return userBets.some((bet) => bet.matchId === matchId && bet.betType === betType);
  };

  // Regla global: una sola apuesta por partido
  const hasAnyBetInMatch = (matchId: number): boolean => {
    return userBets.some((bet) => bet.matchId === matchId);
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
    <SafeLayout backgroundColor="#181818ff">
      {loading ? (
        <LoadingScreen />
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
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

          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* MODO HISTORIAL - Cuando la jornada está cerrada */}
            {jornadaStatus === 'closed' ? (
              <>
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
                      No se realizaron apuestas durante esta jornada
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

                      // Convertir a array y ordenar por fecha y hora del partido
                      const sortedMatches = Object.entries(betsByMatch)
                        .map(([matchIdStr, bets]) => {
                          const matchId = parseInt(matchIdStr);
                          const matchInfo = groupedBets.find((gb) => gb.matchId === matchId);
                          return { matchId, bets, matchInfo };
                        })
                        .sort((a, b) => {
                          // Ordenar por fecha y hora
                          if (!a.matchInfo || !b.matchInfo) return 0;
                          
                          // Convertir fecha y hora a timestamp para comparar
                          const parseDateTime = (fecha?: string, hora?: string) => {
                            if (!fecha || !hora) return new Date(0).getTime();
                            // fecha formato: "DD/MM" o "DD/MM/YYYY"
                            // hora formato: "HH:MM"
                            const [day, month, year] = fecha.split('/');
                            const [hours, minutes] = hora.split(':');
                            const fullYear = year || '2024'; // Año por defecto
                            return new Date(
                              parseInt(fullYear),
                              parseInt(month) - 1,
                              parseInt(day),
                              parseInt(hours),
                              parseInt(minutes)
                            ).getTime();
                          };
                          
                          const timeA = parseDateTime(a.matchInfo.fecha, a.matchInfo.hora);
                          const timeB = parseDateTime(b.matchInfo.fecha, b.matchInfo.hora);
                          
                          return timeA - timeB; // Orden ascendente (primero los más antiguos)
                        });

                      return sortedMatches.map(({ matchId, bets, matchInfo }) => {
                        
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
                                  {bet.betLabel}
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
              </>
            ) : (
              /* MODO APUESTAS - Cuando la jornada está abierta */
              <>
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
              // Ordenar apuestas por fecha y hora antes de renderizar
              [...groupedBets]
                .sort((a, b) => {
                  // Si falta fecha/hora, poner al final
                  if (!a.fecha || !a.hora) return 1;
                  if (!b.fecha || !b.hora) return -1;
                  
                  // Comparar primero por fecha, luego por hora (comparación de strings)
                  const fechaCompare = a.fecha.localeCompare(b.fecha);
                  if (fechaCompare !== 0) return fechaCompare;
                  
                  // Si las fechas son iguales, comparar por hora
                  return a.hora.localeCompare(b.hora);
                })
                .map((b, index) => (
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

                  {/* Opciones: interactivas si jornada está abierta, lectura si cerrada */}
                  {b.options.map((option, optionIndex) => {
                    const betKey = `${b.matchId}-${b.type}-${optionIndex}`;
                    const isJornadaOpen = jornadaStatus === 'open';
                    // Verificar si el usuario ya apostó en esta opción
                    const userBet = getUserBetForOption(b.matchId, b.type, option.label);
                    const groupHasBet = hasAnyBetInGroup(b.matchId, b.type);
                    const anyBetInMatch = hasAnyBetInMatch(b.matchId);
                    const isBlocked = (groupHasBet || anyBetInMatch) && !userBet;
                    
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
                          opacity: isBlocked && isJornadaOpen ? 0.5 : 1,
                        }}
                      >
                        {/* Indicador de bloqueado */}
                        {isBlocked && isJornadaOpen && (
                          <View style={{
                            backgroundColor: '#7f1d1d',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginBottom: 8,
                            alignSelf: 'flex-start',
                          }}>
                            <Text style={{ color: '#fca5a5', fontSize: 11, fontWeight: '700' }}>🔒 BLOQUEADA - Ya apostaste en este partido</Text>
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

                        {/* Si el usuario ya apostó */}
                        {userBet && ligaId && isJornadaOpen && (
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
                            {/* Controles de edición si jornada abierta */}
                            {isJornadaOpen ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
                                {/* Two simple buttons: Edit and Delete. Edit toggles an inline editable input. */}
                                {!editingBets[betKey] ? (
                                  <>
                                    <TouchableOpacity
                                      onPress={() => setEditingBets((p) => ({ ...p, [betKey]: true }))}
                                      style={{
                                        backgroundColor: '#2563eb',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        marginRight: 8,
                                      }}
                                      accessibilityLabel="Editar apuesta"
                                    >
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <EditIcon size={18} color="#ffffff" />
                                        <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>Editar</Text>
                                      </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => handleDeleteBet(betKey, userBet.id)}
                                      disabled={savingBet === betKey}
                                      style={{
                                        backgroundColor: '#7f1d1d',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                      }}
                                      accessibilityLabel="Eliminar apuesta"
                                    >
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <DeleteIcon size={18} color="#fecaca" />
                                        <Text style={{ color: '#fecaca', fontWeight: '700', marginLeft: 6 }}>Eliminar</Text>
                                      </View>
                                    </TouchableOpacity>
                                  </>
                                ) : (
                                  <>
                                    <SmartTextInput
                                      scrollViewRef={scrollViewRef}
                                      extraScrollPadding={150}
                                      value={amountInputs[betKey] ?? String(userBet.amount)}
                                      onChangeText={(t) => setAmountForKey(betKey, t)}
                                      keyboardType="decimal-pad"
                                      placeholder="Cantidad"
                                      placeholderTextColor="#64748b"
                                      returnKeyType="done"
                                      style={{
                                        flex: 1,
                                        backgroundColor: '#0b1220',
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        color: '#e5e7eb',
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        borderRadius: 8,
                                        marginRight: 8,
                                      }}
                                    />
                                    <TouchableOpacity
                                      onPress={async () => {
                                        await handleUpdateBet(betKey, userBet.id);
                                      }}
                                      disabled={savingBet === betKey}
                                      style={{
                                        backgroundColor: '#16a34a',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        marginRight: 8,
                                      }}
                                    >
                                      <Text style={{ color: '#ecfdf5', fontWeight: '800' }}>Guardar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => setEditingBets((p) => ({ ...p, [betKey]: false }))}
                                      style={{
                                        backgroundColor: '#374151',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                      }}
                                    >
                                      <Text style={{ color: '#fff', fontWeight: '700' }}>Cancelar</Text>
                                    </TouchableOpacity>
                                  </>
                                )}
                              </View>
                            ) : null}
                          </View>
                        )}
                        {/* Si no hay apuesta del usuario en este grupo y la jornada está abierta, permitir apostar */}
                        {!userBet && !isBlocked && ligaId && isJornadaOpen && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <SmartTextInput
                              scrollViewRef={scrollViewRef}
                              extraScrollPadding={150}
                              value={amountInputs[betKey] ?? ''}
                              onChangeText={(t) => setAmountForKey(betKey, t)}
                              keyboardType="decimal-pad"
                              placeholder="Cantidad"
                              placeholderTextColor="#64748b"
                              returnKeyType="done"
                              style={{
                                flex: 1,
                                backgroundColor: '#0b1220',
                                borderWidth: 1,
                                borderColor: '#334155',
                                color: '#e5e7eb',
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                borderRadius: 8,
                                marginRight: 8,
                              }}
                            />
                            <TouchableOpacity
                              onPress={() => handlePlaceBet(betKey, { 
                                matchId: b.matchId, 
                                homeTeam: b.local,
                                awayTeam: b.visitante,
                                betType: b.type, 
                                betLabel: option.label, 
                                odd: option.odd 
                              })}
                              disabled={savingBet === betKey}
                              style={{
                                backgroundColor: '#16a34a',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 8,
                                opacity: savingBet === betKey ? 0.6 : 1,
                              }}
                            >
                              <Text style={{ color: '#ecfdf5', fontWeight: '800' }}>Apostar</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* En jornada cerrada: mostrar jugadores y cantidades que apostaron en esta opción */}
                        {!isJornadaOpen && ligaId && (
                          (() => {
                            const betsForOption = leagueBets.filter((betItem) =>
                              betItem.matchId === b.matchId &&
                              normalizeType(betItem.betType) === normalizeType(b.type) &&
                              normalizeLabel(betItem.betLabel) === normalizeLabel(option.label)
                            );
                            console.log('🔍 Filtering bets for option:', {
                              matchId: b.matchId,
                              type: b.type,
                              label: option.label,
                              normalizedType: normalizeType(b.type),
                              normalizedLabel: normalizeLabel(option.label),
                              totalLeagueBets: leagueBets.length,
                              betsForOption: betsForOption.length,
                              betsForOptionData: betsForOption
                            });
                            if (betsForOption.length === 0) return null;
                            return (
                              <View style={{
                                backgroundColor: '#0b1220',
                                borderWidth: 1,
                                borderColor: '#334155',
                                borderRadius: 8,
                                padding: 10,
                                marginTop: 8,
                              }}>
                                {betsForOption.map((bf) => (
                                  <Text key={bf.id} style={{ color: '#e5e7eb', paddingVertical: 4 }} numberOfLines={2}>
                                    {(bf.userName || 'Jugador') + ' ha apostado ' + bf.amount + 'M'}
                                  </Text>
                                ))}
                              </View>
                            );
                          })()
                        )}
                      </View>
                    );
                  })}
                </View>
              ))
            )}
              </>
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
        </KeyboardAvoidingView>
      )}
    </SafeLayout>
  );
};

export default Apuestas;
