import React, { useEffect, useState, useRef } from 'react';
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

type ApuestasRouteProps = RouteProp<{ params: { ligaId?: string; ligaName?: string; isPremium?: boolean; division?: string } }, 'params'>;

type ApuestasProps = {
  navigation: NativeStackNavigationProp<any>;
  route: ApuestasRouteProps;
};

export const Apuestas: React.FC<ApuestasProps> = ({ navigation, route }) => {
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const division = route.params?.division || 'primera';
  const isPremium = route.params?.isPremium || false;
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

  // Estados para evaluacion en tiempo real
  const [realtimeBalances, setRealtimeBalances] = useState<any[]>([]);
  const [evaluatingRealtime, setEvaluatingRealtime] = useState(false);

  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Estado para controlar visibilidad de la barra de navegación
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Estado para apuestas desbloqueadas con anuncios (máximo 2)
  const [unlockedBets, setUnlockedBets] = useState<Set<number>>(new Set());
  const [loadingAd, setLoadingAd] = useState(false);

  // Estados para selector de jornadas (historial)
  const [selectedJornada, setSelectedJornada] = useState<number | null>(null);
  const [showJornadaPicker, setShowJornadaPicker] = useState(false);
  const [availableJornadas, setAvailableJornadas] = useState<number[]>([]);
  const [currentJornada, setCurrentJornada] = useState<number | null>(null);

  // Estados para combis (máximo 3 selecciones)
  type CombiSelection = {
    matchId: number;
    betType: string;
    betLabel: string;
    odd: number;
    homeTeam: string;
    awayTeam: string;
  };
  const [combiSelections, setCombiSelections] = useState<CombiSelection[]>([]);
  const [combiAmount, setCombiAmount] = useState<string>('');
  const [showCombiModal, setShowCombiModal] = useState(false);
  const [creatingCombi, setCreatingCombi] = useState(false);
  const [hasExistingCombi, setHasExistingCombi] = useState(false);

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

            // Obtener todas las jornadas desde las apuestas realizadas (tabla Bet)
            const allJornadas = [...new Set(leagueBetsData.map(bet => bet.jornada))];
            
            // Agregar la jornada actual si no está en la lista
            if (currentJornadaFromLeague != null && !allJornadas.includes(currentJornadaFromLeague)) {
              allJornadas.push(currentJornadaFromLeague);
            }
            
            // Ordenar descendente
            allJornadas.sort((a, b) => b - a);
            setAvailableJornadas(allJornadas);
          } catch (err) {
            console.warn('Error getting budget/bets:', err);
          }
        }

        if (mounted) {
          // Establecer jornada actual y seleccionada
          if (currentJornadaFromLeague != null) {
            setJornada(currentJornadaFromLeague);
            setCurrentJornada(currentJornadaFromLeague);
            setSelectedJornada(currentJornadaFromLeague);
          } else if (apuestas.length > 0) {
            setJornada(apuestas[0].jornada);
            setCurrentJornada(apuestas[0].jornada);
            setSelectedJornada(apuestas[0].jornada);
          }

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
          
          // Verificar si el usuario ya tiene una combi para esta jornada
          if (currentJornadaFromLeague != null) {
            const existingCombi = userBetsData.some(bet => 
              bet.jornada === currentJornadaFromLeague && bet.combiId != null
            );
            setHasExistingCombi(existingCombi);
          }
          
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
          
          console.log('DEBUG Apuestas - Status:', statusData);
          console.log('DEBUG Apuestas - Current Jornada:', currentJornadaFromLeague);
          console.log('DEBUG Apuestas - League Bets (filtered):', filteredLeagueBets);
          console.log('DEBUG Apuestas - Grouped Bets:', groupedArray);

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

  // Handler para cambiar de jornada manualmente desde el selector
  const handleJornadaChange = async (newJornada: number) => {
    if (newJornada === selectedJornada || !ligaId) return;
    
    setSelectedJornada(newJornada);
    
    // Si volvemos a la jornada actual, recargar las apuestas disponibles
    if (newJornada === currentJornada) {
      try {
        setLoading(true);
        
        // Cargar apuestas disponibles para apostar
        const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });
        
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
        
        // Recargar apuestas del usuario, presupuesto y estado
        const [budgetData, userBetsData, leagueBetsData, statusResp] = await Promise.all([
          BetService.getBettingBudget(ligaId),
          BetService.getUserBets(ligaId),
          BetService.getLeagueBets(ligaId),
          JornadaService.getJornadaStatus(ligaId)
        ]);
        
        // Filtrar apuestas de la liga por la jornada actual
        const filteredLeagueBets = leagueBetsData.filter(bet => bet.jornada === currentJornada);
        
        // Verificar si hay combi existente para la jornada actual
        const existingCombi = userBetsData.some(bet => 
          bet.jornada === currentJornada && bet.combiId != null
        );
        setHasExistingCombi(existingCombi);
        
        setGroupedBets(groupedArray);
        setUserBets(userBetsData);
        setLeagueBets(filteredLeagueBets);
        setBudget(budgetData);
        setJornada(currentJornada);
        setJornadaStatus(statusResp.status);
      } catch (err) {
        console.error('Error loading current jornada:', err);
        showError('Error al cargar la jornada');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Si es jornada histórica, cargar sus apuestas
    try {
      setLoading(true);
      const [userBetsData, leagueBetsData, realtimeResult] = await Promise.all([
        BetService.getUserBetsForJornada(ligaId, newJornada),
        BetService.getLeagueBetsForJornada(ligaId, newJornada),
        BetService.evaluateBetsRealTime(ligaId, newJornada).catch(() => ({ userBalances: [], matchesEvaluated: 0 }))
      ]);
      
      setUserBets(userBetsData);
      setLeagueBets(leagueBetsData);
      setRealtimeBalances(realtimeResult.userBalances);
      setJornada(newJornada);
      setJornadaStatus('closed');
      
      // Verificar si hay combi existente para esta jornada histórica
      const existingCombi = userBetsData.some(bet => bet.combiId != null);
      setHasExistingCombi(existingCombi);
    } catch (err) {
      console.error('Error loading historical jornada:', err);
      showError('Error al cargar la jornada');
    } finally {
      setLoading(false);
    }
  };

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
      
      // Verificar si hay combi existente
      if (jornada != null) {
        const existingCombi = userBetsData.some(bet => 
          bet.jornada === jornada && bet.combiId != null
        );
        setHasExistingCombi(existingCombi);
      }
    } catch (err: any) {
      console.warn('Error refreshing bets/budget:', err?.message || err);
    }
  };

  const setAmountForKey = (key: string, value: string) => {
    // Verificar si contiene punto o coma (decimales)
    if (value.includes('.') || value.includes(',')) {
      CustomAlertManager.alert(
        'Cantidad no válida',
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
      showError('Introduce una cantidad válida');
      return;
    }
    if (amount > 50) {
      CustomAlertManager.alert(
        'Límite de apuesta',
        'El máximo por apuesta es 50M',
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }
    try {
      setSavingBet(key);
      console.log('Frontend - Enviando apuesta con:', {
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
        'Límite de apuesta',
        'El máximo por apuesta es 50M',
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

  // Use shared formatter from utils `frontend/utils/formatBetLabel.ts`

  // Regla global: una sola apuesta por partido
  const hasAnyBetInMatch = (matchId: number): boolean => {
    return userBets.some((bet) => bet.matchId === matchId);
  };

  // Funciones para manejar combis
  const toggleCombiSelection = (selection: CombiSelection) => {
    // Verificar si la liga es premium
    if (!isPremium) {
      CustomAlertManager.alert(
        'Funcionalidad Premium',
        'Las apuestas combinadas solo están disponibles en ligas premium. Mejora tu liga para desbloquear esta función.',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    const isAlreadySelected = combiSelections.some(
      s => s.matchId === selection.matchId && s.betType === selection.betType && s.betLabel === selection.betLabel
    );

    if (isAlreadySelected) {
      // Remover selección
      setCombiSelections(prev => 
        prev.filter(s => !(s.matchId === selection.matchId && s.betType === selection.betType && s.betLabel === selection.betLabel))
      );
    } else {
      // Agregar selección si no excede el máximo
      if (combiSelections.length >= 3) {
        showError('Máximo 3 apuestas por combi');
        return;
      }

      // Verificar que no haya otra selección del mismo partido
      const hasMatchInCombi = combiSelections.some(s => s.matchId === selection.matchId);
      if (hasMatchInCombi) {
        showError('No puedes seleccionar dos opciones del mismo partido en una combi');
        return;
      }

      setCombiSelections(prev => [...prev, selection]);
    }
  };

  const isInCombi = (matchId: number, betType: string, betLabel: string): boolean => {
    return combiSelections.some(
      s => s.matchId === matchId && s.betType === betType && s.betLabel === betLabel
    );
  };

  const isMatchBlockedByCombi = (matchId: number): boolean => {
    // Si ya hay una selección de este partido en la combi, bloquear las demás opciones
    return combiSelections.some(s => s.matchId === matchId);
  };

  const calculateCombiOdds = (): number => {
    return combiSelections.reduce((acc, sel) => acc * sel.odd, 1);
  };

  const handleCreateCombi = async () => {
    if (!ligaId || !jornada) return;

    if (combiSelections.length < 2) {
      CustomAlertManager.alert(
        'Cantidad no válida',
        'Necesitas mínimo 2 apuestas para crear una combi',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Validar que no tenga decimales
    if (combiAmount.includes('.') || combiAmount.includes(',')) {
      CustomAlertManager.alert(
        'Cantidad no válida',
        'No se permiten decimales en las apuestas. Ingresa un número entero.',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    const amount = parseInt(combiAmount);
    
    // Validar que sea un número válido
    if (!amount || isNaN(amount) || amount <= 0) {
      CustomAlertManager.alert(
        'Cantidad no válida',
        'Ingresa una cantidad válida mayor a 0',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Validar máximo 50M
    if (amount > 30) {
      CustomAlertManager.alert(
        'Cantidad no válida',
        'El máximo a apostar son 30 millones',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Validar presupuesto disponible
    if (amount > budget.available) {
      CustomAlertManager.alert(
        'Presupuesto insuficiente',
        `Solo tienes ${budget.available}M disponibles`,
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    setCreatingCombi(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) throw new Error('No hay token de autenticación');

      const response = await fetch(`https://lafantasiadelgambling.onrender.com/bet-combis/${ligaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          jornada,
          selections: combiSelections,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la combi');
      }

      showSuccess(`¡Combi creada! Ganancia potencial: ${Math.round(amount * calculateCombiOdds())}M`);
      
      // Limpiar selecciones y cerrar modal
      setCombiSelections([]);
      setCombiAmount('');
      setShowCombiModal(false);
      
      // Marcar que ya existe una combi para esta jornada
      setHasExistingCombi(true);

      // Recargar presupuesto y apuestas
      const budgetData = await BetService.getBettingBudget(ligaId);
      setBudget(budgetData);
      const userBetsData = await BetService.getUserBets(ligaId);
      setUserBets(userBetsData);

    } catch (error: any) {
      console.error('Error creating combi:', error);
      showError(error.message || 'Error al crear la combi');
    } finally {
      setCreatingCombi(false);
    }
  };

  const clearCombi = () => {
    setCombiSelections([]);
    setCombiAmount('');
    setShowCombiModal(false);
  };

  // Función para desbloquear apuesta con anuncio recompensado
  const handleUnlockWithAd = async (betIndex: number) => {
    if (unlockedBets.size >= 2) {
      CustomAlertManager.alert(
        'Límite alcanzado',
        'Solo puedes desbloquear 2 apuestas por jornada viendo anuncios.',
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    setLoadingAd(true);
    try {
      const result = await AdMobService.showRewarded();
      
      if (result.error) {
        // Hubo un error al cargar/mostrar el anuncio
        showError(result.error);
      } else if (result.watched) {
        // Usuario completó el anuncio, desbloquear la apuesta por índice
        setUnlockedBets(prev => new Set([...prev, betIndex]));
        showSuccess('¡Apuesta desbloqueada! Ahora puedes apostar en esta opción.');
      } else {
        showError('Debes ver el anuncio completo para desbloquear la apuesta.');
      }
    } catch (error) {
      console.error('Error mostrando anuncio:', error);
      showError('No se pudo cargar el anuncio. Por favor, verifica tu conexión e inténtalo de nuevo.');
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
              {/* MODO HISTORIAL - Cuando la jornada está cerrada o es histórica */}
              {(jornadaStatus === 'closed' || selectedJornada !== currentJornada) ? (
                <>
                  <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Historial de Apuestas</Text>
                  
                  {/* Selector de Jornada */}
                  {availableJornadas.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <TouchableOpacity
                        onPress={() => setShowJornadaPicker(!showJornadaPicker)}
                        style={{
                          backgroundColor: '#1e293b',
                          borderRadius: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#334155'
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                          JORNADA {selectedJornada}
                        </Text>
                        <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '900' }}>
                          {showJornadaPicker ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>

                      {showJornadaPicker && (
                        <View style={{
                          backgroundColor: '#1e293b',
                          borderRadius: 12,
                          marginTop: 8,
                          maxHeight: 300,
                          borderWidth: 2,
                          borderColor: '#334155',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.5,
                          shadowRadius: 8,
                          elevation: 10,
                          zIndex: 999
                        }}>
                          <ScrollView>
                            {availableJornadas.map((jornada) => (
                              <TouchableOpacity
                                key={jornada}
                                onPress={() => {
                                  handleJornadaChange(jornada);
                                  setShowJornadaPicker(false);
                                }}
                                style={{
                                  paddingVertical: 14,
                                  paddingHorizontal: 16,
                                  backgroundColor: selectedJornada === jornada ? '#0892D020' : 'transparent',
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#334155',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <Text style={{ 
                                  color: selectedJornada === jornada ? '#0892D0' : '#fff', 
                                  fontSize: 15, 
                                  fontWeight: selectedJornada === jornada ? '800' : '600' 
                                }}>
                                  JORNADA {jornada}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
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
                                          {formatLabelWithType(bet.betLabel, bet.betType)} ({bet.odd})
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
                                          {formatLabelWithType(bet.betLabel, bet.betType)} ({bet.odd})
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
                                          {formatLabelWithType(bet.betLabel, bet.betType)} ({bet.odd})
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
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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

                                {/* Lista de apuestas del jugador */}
                                {data.bets.map((bet) => (
                                  <View key={bet.id} style={{
                                    backgroundColor: '#0a1420',
                                    padding: 8,
                                    borderRadius: 6,
                                    marginBottom: 4,
                                    borderLeftWidth: 2,
                                    borderLeftColor: bet.status === 'won' ? '#22c55e' : bet.status === 'lost' ? '#ef4444' : '#f59e0b',
                                  }}>
                                    {bet.homeTeam && bet.awayTeam && (
                                      <Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                                        {bet.homeTeam} vs {bet.awayTeam}
                                      </Text>
                                    )}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#cbd5e1', fontSize: 11, marginBottom: 2 }}>
                                          {formatLabelWithType(bet.betLabel, bet.betType)}
                                        </Text>
                                        <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                                          Cuota: {bet.odd} • Apostado: {bet.amount}M
                                        </Text>
                                      </View>
                                      <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                                        {bet.status === 'won' && (
                                          <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                              <CheckIcon size={12} color="#22c55e" />
                                              <Text style={{ color: '#22c55e', fontSize: 10, fontWeight: '600' }}>
                                                GANADA
                                              </Text>
                                            </View>
                                            <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '800' }}>
                                              +{bet.potentialWin.toFixed(1)}M
                                            </Text>
                                          </>
                                        )}
                                        {bet.status === 'lost' && (
                                          <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                              <ErrorIcon size={12} color="#ef4444" />
                                              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '600' }}>
                                                PERDIDA
                                              </Text>
                                            </View>
                                            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800' }}>
                                              -{bet.amount}M
                                            </Text>
                                          </>
                                        )}
                                        {bet.status === 'pending' && (
                                          <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                              <ClockIcon size={12} color="#f59e0b" />
                                              <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '600' }}>
                                                PENDIENTE
                                              </Text>
                                            </View>
                                            <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '800' }}>
                                              {bet.amount}M
                                            </Text>
                                          </>
                                        )}
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            ));
                          })()
                        )}
                      </View>
                    </>
                  )}
                </>
              ) : (
                /* MODO APUESTAS - Cuando la jornada está abierta */
                <>
                  <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Apuestas</Text>
                  
                  {/* Selector de Jornada */}
                  {availableJornadas.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <TouchableOpacity
                        onPress={() => setShowJornadaPicker(!showJornadaPicker)}
                        style={{
                          backgroundColor: '#1e293b',
                          borderRadius: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#334155'
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                          JORNADA {selectedJornada}
                        </Text>
                        <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '900' }}>
                          {showJornadaPicker ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>

                      {showJornadaPicker && (
                        <View style={{
                          backgroundColor: '#1e293b',
                          borderRadius: 12,
                          marginTop: 8,
                          maxHeight: 300,
                          borderWidth: 2,
                          borderColor: '#334155',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.5,
                          shadowRadius: 8,
                          elevation: 10,
                          zIndex: 999
                        }}>
                          <ScrollView>
                            {availableJornadas.map((jornada) => (
                              <TouchableOpacity
                                key={jornada}
                                onPress={() => {
                                  handleJornadaChange(jornada);
                                  setShowJornadaPicker(false);
                                }}
                                style={{
                                  paddingVertical: 14,
                                  paddingHorizontal: 16,
                                  backgroundColor: selectedJornada === jornada ? '#0892D020' : 'transparent',
                                  borderBottomWidth: 1,
                                  borderBottomColor: '#334155',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <Text style={{ 
                                  color: selectedJornada === jornada ? '#0892D0' : '#fff', 
                                  fontSize: 15, 
                                  fontWeight: selectedJornada === jornada ? '800' : '600' 
                                }}>
                                  JORNADA {jornada}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
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
                                <Image
                                  key={`local-crest-${b.matchId}`}
                                  source={{ uri: b.localCrest }}
                                  style={{ width: 32, height: 32, marginRight: 10 }}
                                  resizeMode="contain"
                                />
                              ) : null}
                              <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 16, flex: 1 }} numberOfLines={1}>{b.local}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {b.visitanteCrest ? (
                                <Image
                                  key={`visitante-crest-${b.matchId}`}
                                  source={{ uri: b.visitanteCrest }}
                                  style={{ width: 32, height: 32, marginRight: 10 }}
                                  resizeMode="contain"
                                />
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
                            // On iOS TestFlight devices ads may not show; unlock the last two bets for iOS.
                            const lastTwoStart = Math.max(0, groupedBets.length - 2);
                            const requiresAdUnlock = Platform.OS === 'ios' ? index >= lastTwoStart : (index === 8 || index === 9);
                            const isUnlocked = unlockedBets.has(index) || (Platform.OS === 'ios' && index >= lastTwoStart);
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

                          {/* Opciones: solo mostrar si está desbloqueada o si ya tiene apuesta */}
                          {(() => {
                            // Determine ad-unlock behaviour: keep Android as-is (fixed indices),
                            // but on iOS unlock the last two bets (TestFlight may block ads).
                            const lastTwoStart = Math.max(0, groupedBets.length - 2);
                            const requiresAdUnlock = Platform.OS === 'ios' ? index >= lastTwoStart : (index === 8 || index === 9);
                            const isUnlocked = unlockedBets.has(index) || (Platform.OS === 'ios' && index >= lastTwoStart);
                            const hasUserBetInMatch = userBets.some((bet) => bet.matchId === b.matchId);
                            
                            // Si requiere anuncio y no está desbloqueada y no tiene apuesta, ocultar opciones
                            if (requiresAdUnlock && !isUnlocked && !hasUserBetInMatch) {
                              return (
                                <View style={{
                                  backgroundColor: '#0a0f1a',
                                  borderRadius: 10,
                                  padding: 20,
                                  borderWidth: 1,
                                  borderColor: '#1e293b',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  <View style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 12,
                                  }}>
                                    <LockIcon size={24} color="#3b82f6" />
                                  </View>
                                  <Text style={{ 
                                    color: '#64748b', 
                                    fontSize: 14, 
                                    fontWeight: '600',
                                    textAlign: 'center',
                                  }}>
                                    Opciones ocultas
                                  </Text>
                                  <Text style={{ 
                                    color: '#475569', 
                                    fontSize: 12, 
                                    textAlign: 'center',
                                    marginTop: 4,
                                  }}>
                                    Desbloquea para ver las opciones de apuesta
                                  </Text>
                                </View>
                              );
                            }
                            
                            // Mostrar las opciones normalmente
                            return b.options.map((option, optionIndex) => {
                            const betKey = `${b.matchId}-${b.type}-${optionIndex}`;
                            const isJornadaOpen = jornadaStatus === 'open';
                            const userBet = getUserBetForOption(b.matchId, b.type, option.label);
                            const groupHasBet = hasAnyBetInGroup(b.matchId, b.type);
                            const anyBetInMatch = hasAnyBetInMatch(b.matchId);
                            const isInCurrentCombi = isInCombi(b.matchId, b.type, option.label);
                            const matchInCombi = isMatchBlockedByCombi(b.matchId); // Verificar si el partido tiene opciones en combi
                            
                            const lastTwoStart = Math.max(0, groupedBets.length - 2);
                            const requiresAdUnlock = Platform.OS === 'ios' ? index >= lastTwoStart : (index === 8 || index === 9);
                            const isUnlocked = unlockedBets.has(index) || (Platform.OS === 'ios' && index >= lastTwoStart);
                            const isBlockedByAd = requiresAdUnlock && !isUnlocked && !userBet;
                            const isBlockedByBet = (groupHasBet || anyBetInMatch) && !userBet && !isUnlocked;
                            const isBlockedByCombi = matchInCombi && !userBet; // Bloquear si el partido está en combi
                            const isBlocked = isBlockedByAd || isBlockedByBet || isBlockedByCombi;

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
                                    {formatLabelWithType(option.label, b.type)}
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
                                        backgroundColor: '#0892D0',
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        opacity: savingBet === betKey ? 0.6 : 1,
                                      }}
                                    >
                                      <Text style={{ color: '#fff', fontWeight: '800' }}>Apostar</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}

                                {/* Botón Combinar - Siempre visible si no hay apuesta del usuario */}
                                {!userBet && ligaId && isJornadaOpen && (
                                  <TouchableOpacity
                                      onPress={() => toggleCombiSelection({
                                        matchId: b.matchId,
                                        betType: b.type,
                                        betLabel: option.label,
                                        odd: option.odd,
                                        homeTeam: b.local,
                                        awayTeam: b.visitante,
                                      })}
                                      disabled={
                                        !isPremium || 
                                        hasExistingCombi ||
                                        (isMatchBlockedByCombi(b.matchId) && !isInCombi(b.matchId, b.type, option.label)) ||
                                        (combiSelections.length >= 3 && !isInCombi(b.matchId, b.type, option.label))
                                      }
                                      style={{
                                        backgroundColor: !isPremium || hasExistingCombi
                                          ? '#374151'  // Gris si no es premium o ya tiene combi
                                          : isInCombi(b.matchId, b.type, option.label) 
                                            ? '#0892D0' // Azul cyan cuando está seleccionado
                                            : (isMatchBlockedByCombi(b.matchId) || combiSelections.length >= 3)
                                              ? '#374151' // Gris bloqueado
                                              : '#0b1220', // Tono oscuro de la app
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        marginTop: 8,
                                        borderWidth: isInCombi(b.matchId, b.type, option.label) ? 0 : 1,
                                        borderColor: '#0892D0',
                                        opacity: (
                                          !isPremium || 
                                          hasExistingCombi ||
                                          (isMatchBlockedByCombi(b.matchId) && !isInCombi(b.matchId, b.type, option.label)) ||
                                          (combiSelections.length >= 3 && !isInCombi(b.matchId, b.type, option.label))
                                        ) ? 0.5 : 1,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                      }}
                                    >
                                      {!isPremium && (
                                        <LockIcon size={14} color="#fff" />
                                      )}
                                      <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 12 }}>
                                        {!isPremium 
                                          ? 'Combinar (Premium)' 
                                          : hasExistingCombi
                                            ? 'Ya existe una combi'
                                            : isInCombi(b.matchId, b.type, option.label) 
                                              ? '✓ En combi' 
                                              : combiSelections.length >= 3
                                                ? 'Máximo alcanzado'
                                                : 'Combinar'}
                                      </Text>
                                    </TouchableOpacity>
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
                                          <Text key={bf.id} style={{ color: '#e5e7eb', paddingVertical: 4 }} numberOfLines={3}>
                                            {(bf.userName || 'Jugador') + ' ha apostado ' + bf.amount + 'M en ' + bf.betType + ' - ' + formatLabelWithType(bf.betLabel, bf.betType)}
                                          </Text>
                                        ))}
                                      </View>
                                    );
                                  })()
                                )}
                              </View>
                            );
                          });
                          })()}
                        </View>
                      ))
                  )}
                </>
              )}
            </ScrollView>

            {/* Indicador flotante de combi en construcción */}
            {combiSelections.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowCombiModal(true)}
                style={{
                  position: 'absolute',
                  bottom: 80,
                  right: 16,
                  backgroundColor: '#1a2332',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#334155',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#0892D0', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
                  {calculateCombiOdds().toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Modal de creación de combi */}
            <Modal
              visible={showCombiModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowCombiModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                <View style={{
                  backgroundColor: '#1a2332',
                  borderRadius: 16,
                  padding: 20,
                  width: '100%',
                  maxWidth: 400,
                }}>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 16 }}>
                    Crear Apuesta Combinada
                  </Text>

                  {/* Lista de selecciones */}
                  <View style={{ marginBottom: 16 }}>
                    {combiSelections.map((sel, idx) => (
                      <View key={idx} style={{
                        backgroundColor: '#0f172a',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}>
                        <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                          {sel.homeTeam} vs {sel.awayTeam}
                        </Text>
                        <Text style={{ color: '#93c5fd', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 }}>
                          {sel.betType}
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#94a3b8', fontSize: 12, flex: 1 }}>
                            {formatLabelWithType(sel.betLabel, sel.betType)}
                          </Text>
                          <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '800' }}>
                            {sel.odd.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Cuota total */}
                  <View style={{
                    backgroundColor: '#0f172a',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 2,
                    borderColor: '#0892D0',
                  }}>
                    <Text style={{ color: '#0892D0', fontSize: 12, marginBottom: 4 }}>
                      Cuota total (multiplicada)
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>
                      {calculateCombiOdds().toFixed(2)}
                    </Text>
                  </View>

                  {/* Input de cantidad */}
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
                    Cantidad a apostar (máx. 50M)
                  </Text>
                  <TextInput
                    value={combiAmount}
                    onChangeText={setCombiAmount}
                    keyboardType="number-pad"
                    placeholder=""
                    placeholderTextColor="#64748b"
                    style={{
                      backgroundColor: '#0f172a',
                      borderWidth: 1,
                      borderColor: '#334155',
                      color: '#e5e7eb',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      fontSize: 16,
                      marginBottom: 12,
                    }}
                  />

                  {/* Ganancia potencial */}
                  {combiAmount && parseInt(combiAmount) > 0 && (
                    <View style={{
                      backgroundColor: '#064e3b',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                      borderWidth: 1,
                      borderColor: '#10b981',
                    }}>
                      <Text style={{ color: '#6ee7b7', fontSize: 12, marginBottom: 4 }}>
                        Ganancia potencial
                      </Text>
                      <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '800' }}>
                        +{Math.round(parseInt(combiAmount) * calculateCombiOdds())}M
                      </Text>
                    </View>
                  )}

                  {/* Botones */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => setShowCombiModal(false)}
                      style={{
                        flex: 1,
                        backgroundColor: '#374151',
                        paddingVertical: 12,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleCreateCombi}
                      disabled={creatingCombi || !combiAmount || parseInt(combiAmount) <= 0}
                      style={{
                        flex: 1,
                        backgroundColor: creatingCombi ? '#374151' : '#0892D0',
                        paddingVertical: 12,
                        borderRadius: 8,
                        opacity: (creatingCombi || !combiAmount || parseInt(combiAmount) <= 0) ? 0.5 : 1,
                      }}
                    >
                      {creatingCombi ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                          Crear Combi
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

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
              <LigaNavBar ligaId={ligaId} ligaName={ligaName} division={division} isPremium={isPremium} />
            </View>
          )}
        </View>
      )}
    </SafeLayout>
  );
};

export default Apuestas;





