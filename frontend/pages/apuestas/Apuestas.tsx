﻿import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Animated, Platform, Keyboard, findNodeHandle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import { JornadaService } from '../../services/JornadaService';
import { BetService, BettingBudget, Bet as UserBet } from '../../services/BetService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { EditIcon, DeleteIcon, CheckIcon, CheckCircleIcon, ErrorIcon, CalendarIcon, ClockIcon, MenuIcon, FileTextIcon, CoinsIcon, LockIcon } from '../../components/VectorIcons';
import { CustomAlertManager } from '../../components/CustomAlert';
import { DrawerMenu } from '../../components/DrawerMenu';
import { SafeLayout } from '../../components/SafeLayout';
import { AdMobService } from '../../services/AdMobService';
import { AdBanner } from '../../components/AdBanner';
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

  // Estados para evaluaciÃ³n en tiempo real
  const [realtimeBalances, setRealtimeBalances] = useState<any[]>([]);
  const [evaluatingRealtime, setEvaluatingRealtime] = useState(false);

  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Estado para controlar visibilidad de la barra de navegaciÃ³n
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Estado para apuestas desbloqueadas con anuncios (mÃ¡ximo 2)
  const [unlockedBets, setUnlockedBets] = useState<Set<number>>(new Set());
  const [loadingAd, setLoadingAd] = useState(false);

  // Listener para el teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Cargar apuestas desbloqueadas desde AsyncStorage al iniciar
  useEffect(() => {
    const loadUnlockedBets = async () => {
      try {
        const stored = await AsyncStorage.getItem(`unlockedBets_${ligaId}_${jornada}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUnlockedBets(new Set(parsed));
        }
      } catch (error) {
        console.warn('Error loading unlocked bets:', error);
      }
    };
    if (ligaId && jornada) {
      loadUnlockedBets();
    }
  }, [ligaId, jornada]);

  // Guardar apuestas desbloqueadas en AsyncStorage cuando cambien
  useEffect(() => {
    const saveUnlockedBets = async () => {
      try {
        if (ligaId && jornada) {
          await AsyncStorage.setItem(
            `unlockedBets_${ligaId}_${jornada}`,
            JSON.stringify([...unlockedBets])
          );
        }
      } catch (error) {
        console.warn('Error saving unlocked bets:', error);
      }
    };
    saveUnlockedBets();
  }, [unlockedBets, ligaId, jornada]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Precargar anuncio recompensado para desbloquear apuestas
        AdMobService.preloadRewarded().catch(err => 
          console.warn('No se pudo precargar anuncio recompensado:', err)
        );

        const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });

        // Obtener presupuesto y apuestas del usuario si hay ligaId
        let budgetData = { total: 250, used: 0, available: 250 };
        let userBetsData: UserBet[] = [];
        let leagueBetsData: UserBet[] = [];
        let statusData: string | null = null;
        let currentJornadaFromLeague: number | null = null;
        if (ligaId) {
          try {
            budgetData = await BetService.getBettingBudget(ligaId);
            userBetsData = await BetService.getUserBets(ligaId);
            leagueBetsData = await BetService.getLeagueBets(ligaId);
            const statusResp = await JornadaService.getJornadaStatus(ligaId);
            statusData = statusResp.status;
            currentJornadaFromLeague = statusResp.currentJornada;
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
          
          // Filtrar apuestas de la liga por la jornada actual de la liga
          const filteredLeagueBets = currentJornadaFromLeague != null
            ? leagueBetsData.filter(bet => bet.jornada === currentJornadaFromLeague)
            : leagueBetsData;
          setLeagueBets(filteredLeagueBets);
          
          setBudget(budgetData);
          if (statusData) setJornadaStatus(statusData);
          
          // Usar la jornada de la liga, no la de las apuestas disponibles
          if (currentJornadaFromLeague != null) {
            setJornada(currentJornadaFromLeague);
          } else if (apuestas.length > 0) {
            setJornada(apuestas[0].jornada);
          }
          
          console.log('ðŸŽ² DEBUG Apuestas - Status:', statusData);
          console.log('ðŸŽ² DEBUG Apuestas - Current Jornada:', currentJornadaFromLeague);
          console.log('ðŸŽ² DEBUG Apuestas - League Bets (filtered):', filteredLeagueBets);
          console.log('ðŸŽ² DEBUG Apuestas - Grouped Bets:', groupedArray);

          // Si la jornada estÃ¡ cerrada y hay apuestas, evaluar en tiempo real
          if (statusData === 'closed' && filteredLeagueBets.length > 0 && currentJornadaFromLeague != null && ligaId) {
            console.log('Jornada cerrada, evaluando en tiempo real...');
            setEvaluatingRealtime(true);
            try {
              const realtimeResult = await BetService.evaluateBetsRealTime(ligaId, currentJornadaFromLeague);
              setRealtimeBalances(realtimeResult.userBalances);
              console.log('Balances en tiempo real:', realtimeResult.userBalances);
            } catch (err) {
              console.error('Error evaluando en tiempo real:', err);
            } finally {
              setEvaluatingRealtime(false);
            }
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
          setJornadaStatus(null);
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [ligaId, ligaName]);

  // Helpers y handlers para crear/editar/eliminar apuestas cuando la jornada estÃ¡ abierta

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
    // Verificar si contiene punto o coma (decimales)
    if (value.includes('.') || value.includes(',')) {
      CustomAlertManager.alert(
        'Cantidad no vÃ¡lida',
        'Solo se permiten cantidades enteras. No puedes usar decimales.',
        [{ text: 'Entendido', style: 'default', onPress: () => { } }]
      );
      return;
    }
    // Solo nÃºmeros enteros
    let sanitized = value.replace(/[^0-9]/g, '');
    setAmountInputs((prev) => ({ ...prev, [key]: sanitized }));
  };

  const handlePlaceBet = async (key: string, params: { matchId: number; homeTeam: string; awayTeam: string; betType: string; betLabel: string; odd: number }) => {
    if (!ligaId) return;
    const raw = amountInputs[key] ?? '';
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      showError('Introduce una cantidad vÃ¡lida');
      return;
    }
    if (amount > 50) {
      CustomAlertManager.alert(
        'LÃ­mite de apuesta',
        'El mÃ¡ximo por apuesta es 50M',
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }
    try {
      setSavingBet(key);
      console.log('ðŸ“¤ Frontend - Enviando apuesta con:', {
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
      const errorMessage = err?.message || 'Error al crear apuesta';

      // Detectar error de presupuesto insuficiente
      if (errorMessage.toLowerCase().includes('presupuesto insuficiente') ||
        errorMessage.toLowerCase().includes('disponible:')) {
        CustomAlertManager.alert(
          'Presupuesto insuficiente',
          `No tienes suficiente presupuesto para realizar esta apuesta.\n\n${errorMessage}`,
          [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
          { icon: 'alert-circle', iconColor: '#ef4444' }
        );
      } else {
        showError(errorMessage);
      }
    } finally {
      setSavingBet(null);
    }
  };

  const handleUpdateBet = async (key: string, betId: string) => {
    if (!ligaId) return;
    const raw = amountInputs[key] ?? '';
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      showError('Introduce una cantidad vÃ¡lida');
      return;
    }
    if (amount > 50) {
      CustomAlertManager.alert(
        'LÃ­mite de apuesta',
        'El mÃ¡ximo por apuesta es 50M',
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
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
      const errorMessage = err?.message || 'Error al actualizar apuesta';

      // Detectar error de presupuesto insuficiente
      if (errorMessage.toLowerCase().includes('presupuesto insuficiente') ||
        errorMessage.toLowerCase().includes('disponible:')) {
        CustomAlertManager.alert(
          'Presupuesto insuficiente',
          `No tienes suficiente presupuesto para actualizar esta apuesta.\n\n${errorMessage}`,
          [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
          { icon: 'alert-circle', iconColor: '#ef4444' }
        );
      } else {
        showError(errorMessage);
      }
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

  // CÃ¡lculos de ganancias potenciales los devuelve el backend con la apuesta del usuario

  // FunciÃ³n auxiliar para verificar si una opciÃ³n tiene apuesta del usuario
  const getUserBetForOption = (matchId: number, betType: string, betLabel: string): UserBet | undefined => {
    return userBets.find(
      (bet) => bet.matchId === matchId && bet.betType === betType && bet.betLabel === betLabel
    );
  };

  // Normalizar etiquetas para comparar (quita tildes, espacios extra y mayÃºsculas/minÃºsculas)
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

  // FunciÃ³n para verificar si existe alguna apuesta en el grupo (mismo matchId + betType)
  const hasAnyBetInGroup = (matchId: number, betType: string): boolean => {
    return userBets.some((bet) => bet.matchId === matchId && bet.betType === betType);
  };

  // Regla global: una sola apuesta por partido
  const hasAnyBetInMatch = (matchId: number): boolean => {
    return userBets.some((bet) => bet.matchId === matchId);
  };

  // FunciÃ³n para desbloquear apuesta con anuncio recompensado
  const handleUnlockWithAd = async (betIndex: number) => {
    if (unlockedBets.size >= 2) {
      CustomAlertManager.alert(
        'Líite alcanzado',
        'Solo puedes desbloquear 2 apuestas por jornada viendo anuncios.',
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    setLoadingAd(true);
    try {
      const result = await AdMobService.showRewarded();
      
      if (result.watched) {
        // Usuario completo el anuncio, desbloquear la apuesta por indice
        setUnlockedBets(prev => new Set([...prev, betIndex]));
        showSuccess('Apuesta desbloqueada! Ahora puedes apostar en esta opcion.');
      } else {
        showError('Debes ver el anuncio completo para desbloquear la apuesta.');
      }
    } catch (error) {
      console.error('Error mostrando anuncio:', error);
      showError('No se pudo cargar el anuncio. Intentalo de nuevo.');
    } finally {
      setLoadingAd(false);
    }
  };

  // AnimaciÃ³n del drawer
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
        <View style={{ flex: 1 }}>
          <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
            {/* Top Header Bar - Estilo idÃ©ntico a LigaTopNavBar */}
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

            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* MODO HISTORIAL - Cuando la jornada estÃ¡ cerrada */}
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
                      {/* Balance de usuarios (evaluaciÃ³n en tiempo real) */}
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
                            <CoinsIcon size={24} color="#93c5fd" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#93c5fd', fontSize: 18, fontWeight: '800' }}>
                              BALANCE DE APUESTAS
                            </Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                              {evaluatingRealtime ? 'Evaluando...' : realtimeBalances.length > 0 ? '' : `${leagueBets.length} apuesta${leagueBets.length !== 1 ? 's' : ''} realizadas`}
                            </Text>
                          </View>
                        </View>

                        {evaluatingRealtime ? (
                          <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
                              Consultando resultados...
                            </Text>
                          </View>
                        ) : realtimeBalances.length > 0 ? (
                          /* Mostrar balances calculados en tiempo real */
                          realtimeBalances.map((balance) => (
                            <View key={balance.userId} style={{
                              backgroundColor: '#0f172a',
                              borderRadius: 8,
                              padding: 12,
                              marginBottom: 12,
                              borderLeftWidth: 3,
                              borderLeftColor: balance.netProfit >= 0 ? '#22c55e' : '#ef4444',
                            }}>
                              <View style={{ marginBottom: 8 }}>
                                <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 15 }}>
                                  {balance.userName}
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                    Apuestas: {balance.totalBets} (
                                  </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>{balance.wonBets}</Text>
                                    <CheckIcon size={12} color="#22c55e" />
                                  </View>
                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}> / </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>{balance.lostBets}</Text>
                                    <ErrorIcon size={12} color="#ef4444" />
                                  </View>
                                  {balance.pendingBets > 0 && (
                                    <>
                                      <Text style={{ color: '#94a3b8', fontSize: 13 }}> / </Text>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>{balance.pendingBets}</Text>
                                        <ClockIcon size={12} color="#f59e0b" />
                                      </View>
                                    </>
                                  )}
                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>)</Text>
                                </View>
                                <Text style={{
                                  color: balance.netProfit >= 0 ? '#22c55e' : '#ef4444',
                                  fontWeight: '800',
                                  fontSize: 16
                                }}>
                                  {balance.netProfit >= 0 ? '+' : ''}{balance.netProfit.toFixed(1)}M
                                </Text>
                              </View>

                              {/* Apuestas ganadas */}
                              {balance.betsWon && balance.betsWon.length > 0 && (
                                <View style={{ marginTop: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <CheckIcon size={14} color="#22c55e" />
                                    <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '600' }}>
                                      Ganadas
                                    </Text>
                                  </View>
                                  {balance.betsWon.map((bet: any, idx: number) => (
                                    <View key={bet.betId} style={{
                                      backgroundColor: '#0a1420',
                                      padding: 8,
                                      borderRadius: 6,
                                      marginBottom: 4,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      borderLeftWidth: 2,
                                      borderLeftColor: '#22c55e',
                                      gap: 8,
                                    }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#cbd5e1', fontSize: 11 }}>
                                          {bet.homeTeam} {bet.homeGoals}-{bet.awayGoals} {bet.awayTeam}
                                        </Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                          {bet.betLabel} ({bet.odd})
                                        </Text>
                                      </View>
                                      <Text style={{
                                        color: '#22c55e',
                                        fontSize: 12,
                                        fontWeight: '800',
                                      }}>
                                        +{bet.potentialWin.toFixed(1)}M
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Apuestas perdidas */}
                              {balance.betsLost && balance.betsLost.length > 0 && (
                                <View style={{ marginTop: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <ErrorIcon size={14} color="#ef4444" />
                                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>
                                      Perdidas
                                    </Text>
                                  </View>
                                  {balance.betsLost.map((bet: any, idx: number) => (
                                    <View key={bet.betId} style={{
                                      backgroundColor: '#0a1420',
                                      padding: 8,
                                      borderRadius: 6,
                                      marginBottom: 4,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      borderLeftWidth: 2,
                                      borderLeftColor: '#ef4444',
                                      gap: 8,
                                    }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#cbd5e1', fontSize: 11 }}>
                                          {bet.homeTeam} {bet.homeGoals}-{bet.awayGoals} {bet.awayTeam}
                                        </Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                          {bet.betLabel} ({bet.odd})
                                        </Text>
                                      </View>
                                      <Text style={{
                                        color: '#ef4444',
                                        fontSize: 12,
                                        fontWeight: '800',
                                      }}>
                                        -{bet.amount}M
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Apuestas pendientes */}
                              {balance.betsPending && balance.betsPending.length > 0 && (
                                <View style={{ marginTop: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <ClockIcon size={14} color="#f59e0b" />
                                    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>
                                      Pendientes
                                    </Text>
                                  </View>
                                  {balance.betsPending.map((bet: any, idx: number) => (
                                    <View key={bet.betId} style={{
                                      backgroundColor: '#0a1420',
                                      padding: 8,
                                      borderRadius: 6,
                                      marginBottom: 4,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      borderLeftWidth: 2,
                                      borderLeftColor: '#f59e0b',
                                      gap: 8,
                                    }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#cbd5e1', fontSize: 11 }}>
                                          {bet.homeTeam} - {bet.awayTeam}
                                        </Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                          {bet.betLabel} ({bet.odd})
                                        </Text>
                                      </View>
                                      <Text style={{
                                        color: '#f59e0b',
                                        fontSize: 12,
                                        fontWeight: '800',
                                      }}>
                                        {bet.amount}M
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          ))
                        ) : (
                          /* Fallback: agrupar por jugador (versiÃ³n anterior) */
                          (() => {
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
                          })()
                        )}
                      </View>
                    </>
                  )}
                </>
              ) : (
                /* MODO APUESTAS - Cuando la jornada estÃ¡ abierta */
                <>
                  <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Apuestas</Text>
                  {jornada != null && (
                    <Text style={{ color: '#94a3b8', marginBottom: 16 }}>Jornada {jornada}</Text>
                  )}

                  {/* Mensajes de Ã©xito/error */}
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

                  {/* Banner AdMob cuando jornada está ABIERTA */}
                  {jornadaStatus === 'open' && (
                    <View style={{ marginBottom: 16 }}>
                      <AdBanner size="MEDIUM_RECTANGLE" />
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

                        // Comparar primero por fecha, luego por hora (comparaciÃ³n de strings)
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
                          {/* NÃºmero de apuesta */}
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
                                <Text style={{ color: '#64748b', fontSize: 12 }}></Text>
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

                          {/* Calcular si la apuesta requiere anuncio y mostrar boton de desbloqueo */}
                          {(() => {
                            const requiresAdUnlock = index === 8 || index === 9;
                            const isUnlocked = unlockedBets.has(index);
                            const hasUserBetInMatch = userBets.some((bet) => bet.matchId === b.matchId);
                            
                            if (requiresAdUnlock && !isUnlocked && !hasUserBetInMatch) {
                              const isDisabled = loadingAd || unlockedBets.size >= 2;
                              return (
                                <View style={{ marginBottom: 16 }}>
                                  <LinearGradient
                                    colors={isDisabled ? ['#374151', '#1f2937'] : ['#1e3a8a', '#1e40af']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{
                                      borderRadius: 12,
                                      shadowColor: isDisabled ? '#000' : '#3b82f6',
                                      shadowOffset: { width: 0, height: 4 },
                                      shadowOpacity: isDisabled ? 0.2 : 0.4,
                                      shadowRadius: 8,
                                      elevation: 6,
                                    }}
                                  >
                                    <TouchableOpacity
                                      onPress={() => handleUnlockWithAd(index)}
                                      disabled={isDisabled}
                                      activeOpacity={0.8}
                                      style={{
                                        paddingVertical: 14,
                                        paddingHorizontal: 20,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 10,
                                        opacity: loadingAd ? 0.7 : 1,
                                      }}
                                    >
                                      {loadingAd ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                      ) : (
                                        <View style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: 14,
                                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}>
                                          <LockIcon size={16} color="#ffffff" />
                                        </View>
                                      )}
                                      <Text style={{ 
                                        color: '#ffffff', 
                                        fontSize: 14, 
                                        fontWeight: '700',
                                        letterSpacing: 0.3,
                                      }}>
                                        {loadingAd 
                                          ? 'Cargando anuncio...' 
                                          : unlockedBets.size >= 2 
                                            ? 'Límite alcanzado' 
                                            : 'Ver anuncio para desbloquear'}
                                      </Text>
                                    </TouchableOpacity>
                                  </LinearGradient>
                                </View>
                              );
                            }
                            return null;
                          })()}

                          {/* Opciones: interactivas si jornada esta abierta, lectura si cerrada */}
                          {b.options.map((option, optionIndex) => {
                            const betKey = `${b.matchId}-${b.type}-${optionIndex}`;
                            const isJornadaOpen = jornadaStatus === 'open';
                            const userBet = getUserBetForOption(b.matchId, b.type, option.label);
                            const groupHasBet = hasAnyBetInGroup(b.matchId, b.type);
                            const anyBetInMatch = hasAnyBetInMatch(b.matchId);
                            
                            const isUnlocked = unlockedBets.has(index);
                            const requiresAdUnlock = index === 8 || index === 9;
                            const isBlockedByAd = requiresAdUnlock && !isUnlocked && !userBet;
                            const isBlockedByBet = (groupHasBet || anyBetInMatch) && !userBet && !isUnlocked;
                            const isBlocked = isBlockedByAd || isBlockedByBet;

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

                                {/* Si el usuario ya apostÃ³ */}
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
                                    {/* Controles de ediciÃ³n si jornada abierta */}
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
                                            <TextInput
                                              value={amountInputs[betKey] ?? String(userBet.amount)}
                                              onChangeText={(t) => setAmountForKey(betKey, t)}
                                              keyboardType="number-pad"
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
                                {/* Si no hay apuesta del usuario en este grupo y la jornada estÃ¡ abierta, permitir apostar */}
                                {!userBet && !isBlocked && ligaId && isJornadaOpen && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                    <TextInput
                                      value={amountInputs[betKey] ?? ''}
                                      onChangeText={(t) => setAmountForKey(betKey, t)}
                                      keyboardType="number-pad"
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

                                {/* En jornada cerrada: mostrar jugadores y cantidades que apostaron en esta opciÃ³n */}
                                {!isJornadaOpen && ligaId && (
                                  (() => {
                                    const betsForOption = leagueBets.filter((betItem) =>
                                      betItem.matchId === b.matchId &&
                                      normalizeType(betItem.betType) === normalizeType(b.type) &&
                                      normalizeLabel(betItem.betLabel) === normalizeLabel(option.label)
                                    );
                                    console.log('ðŸ” Filtering bets for option:', {
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

            {/* Drawer Modal */}
            <Modal
              visible={isDrawerOpen}
              animationType="none"
              transparent={true}
              onRequestClose={() => setIsDrawerOpen(false)}
            >
              <View style={{ flex: 1, flexDirection: 'row' }}>
                {/* Drawer content con animaciÃ³n */}
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
          {/* Barra de navegaciÃ³n fija en la parte inferior, solo visible cuando NO hay teclado */}
          {!isKeyboardVisible && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <LigaNavBar ligaId={ligaId} ligaName={ligaName} />
            </View>
          )}
        </View>
      )}
    </SafeLayout>
  );
};

export default Apuestas;





