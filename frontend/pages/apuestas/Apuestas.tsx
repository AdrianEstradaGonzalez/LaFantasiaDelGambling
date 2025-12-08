import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Animated, Platform, Keyboard, findNodeHandle, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';
import FootballService from '../../services/FutbolService';
import { JornadaService } from '../../services/JornadaService';
import { BetService, BettingBudget, Bet as UserBet } from '../../services/BetService';
import { PaymentService } from '../../services/PaymentService';
import { LigaService } from '../../services/LigaService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { EditIcon, DeleteIcon, CheckIcon, CheckCircleIcon, ErrorIcon, CalendarIcon, ClockIcon, MenuIcon, FileTextIcon, CoinsIcon, LockIcon, ChevronDownIcon, ChevronUpIcon, ChartBarIcon, TrendingIcon, TicketIcon } from '../../components/VectorIcons';
import { CustomAlertManager } from '../../components/CustomAlert';
import { DrawerMenu } from '../../components/DrawerMenu';
import { SafeLayout } from '../../components/SafeLayout';
import { AdMobService } from '../../services/AdMobService';
import { AdBanner } from '../../components/AdBanner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import formatLabelWithType from '../../utils/formatBetLabel';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

type ApuestasRouteProps = RouteProp<{ params: { ligaId?: string; ligaName?: string; isPremium?: boolean; division?: string; triggerUpgrade?: boolean } }, 'params'>;

type ApuestasProps = {
  navigation: NativeStackNavigationProp<any>;
  route: ApuestasRouteProps;
};

export const Apuestas: React.FC<ApuestasProps> = ({ navigation, route }) => {
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const division: 'primera' | 'segunda' | 'premier' = (route.params?.division as 'primera' | 'segunda' | 'premier') || 'primera';
  const isDreamLeague = ligaName === 'DreamLeague';
  const isPremium = isDreamLeague ? true : (route.params?.isPremium || false); // DreamLeague siempre premium
  const [loading, setLoading] = useState(true);
  const [groupedBets, setGroupedBets] = useState<GroupedBet[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [jornada, setJornada] = useState<number | null>(null);
  const [budget, setBudget] = useState<BettingBudget>({ total: 5, used: 0, available: 5 });
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

  // Estado para pronósticos desbloqueados con anuncios (máximo 2)
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

  // Estados para expansión de usuarios en balances
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Estados para tabs (Balances / Pronósticos)
  const [activeTab, setActiveTab] = useState(0); // 0 = Balances, 1 = Pronósticos
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Estados para expansión de pronósticos por partido
  const [expandedBets, setExpandedBets] = useState<Set<number>>(new Set());

  // Helper: parse fecha/hora de pronóstico a Date. Soporta formatos como '1/12', '28/11' y hora '20:30'
  const parseBetDateTime = (bet: { fecha?: string; hora?: string }) => {
    try {
      const nowYear = new Date().getFullYear();
      let day = 1;
      let month = 1;
      let year = nowYear;

      if (bet.fecha) {
        const m = bet.fecha.toString().match(/(\d{1,2})\D+(\d{1,2})(?:\D+(\d{2,4}))?/);
        if (m) {
          day = parseInt(m[1], 10);
          month = parseInt(m[2], 10);
          if (m[3]) {
            year = parseInt(m[3], 10);
            if (year < 100) year += 2000;
          }
        }
      }

      let hour = 0;
      let minute = 0;
      if (bet.hora) {
        const hm = bet.hora.toString().match(/(\d{1,2}):(\d{2})/);
        if (hm) {
          hour = parseInt(hm[1], 10);
          minute = parseInt(hm[2], 10);
        }
      }

      return new Date(year, month - 1, day, hour, minute);
    } catch (e) {
      return new Date();
    }
  };

  // Estado para almacenar combis del usuario
  const [userCombis, setUserCombis] = useState<any[]>([]);
  
  // Estado para almacenar combis de toda la liga (jornada cerrada)
  const [leagueCombis, setLeagueCombis] = useState<any[]>([]);

  // Estados para upgrade a premium
  const [showUpgradeWebView, setShowUpgradeWebView] = useState(false);
  const [upgradeCheckoutUrl, setUpgradeCheckoutUrl] = useState<string | null>(null);
  const [processingUpgrade, setProcessingUpgrade] = useState(false);

  // Debug: Log cuando cambien las combis de la liga
  useEffect(() => {
    console.log('🔍 DEBUG - leagueCombis cambió:', {
      length: leagueCombis.length,
      combis: leagueCombis,
      jornadaStatus,
      ligaId,
      jornada
    });
  }, [leagueCombis, jornadaStatus, ligaId, jornada]);

  // Efecto para detectar si se debe abrir automáticamente el upgrade
  useEffect(() => {
    if (route.params?.triggerUpgrade && !isPremium) {
      // Pequeño delay para que se cargue bien la pantalla
      setTimeout(() => {
        handleUpgradeToPremium();
      }, 500);
    }
  }, [route.params?.triggerUpgrade]);

  // Efecto para cargar selecciones de combi existente
  useEffect(() => {
    if (userCombis.length > 0) {
      // Si hay una combi pendiente (ya no filtramos por jornada), cargar sus selecciones
      const pendingCombi = userCombis[0]; // Solo puede haber una combi pendiente
      if (pendingCombi && pendingCombi.selections) {
        // Convertir las selecciones de la combi al formato de CombiSelection
        const selections: CombiSelection[] = pendingCombi.selections.map((sel: any) => ({
          matchId: sel.matchId,
          betType: sel.betType,
          betLabel: sel.betLabel,
          odd: sel.odd,
          homeTeam: sel.homeTeam,
          awayTeam: sel.awayTeam
        }));
        setCombiSelections(selections);
        setCombiAmount(String(pendingCombi.amount));
        setHasExistingCombi(true);
      }
    } else {
      // Si no hay combis, limpiar las selecciones
      setHasExistingCombi(false);
    }
  }, [userCombis]);

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

  // Cargar pronósticos desbloqueados desde AsyncStorage al iniciar
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

  // Guardar pronósticos desbloqueados en AsyncStorage cuando cambien
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
        // Precargar anuncio recompensado para desbloquear pronósticos
        AdMobService.preloadRewarded().catch(err => 
          console.warn('No se pudo precargar anuncio recompensado:', err)
        );

        console.log('🔍 Cargando mercado de pronósticos - División:', division);
        let apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName, division });
        // Ordenar por fecha/hora (más reciente primero)
        try {
          apuestas = apuestas.sort((a: any, b: any) => parseBetDateTime(b).getTime() - parseBetDateTime(a).getTime());
        } catch (err) {
          console.warn('Error ordenando pronósticos por fecha:', err);
        }
        console.log('✅ Pronósticos cargados:', apuestas.length);

        // Obtener presupuesto y pronósticos del usuario si hay ligaId
        let budgetData = { total: 5, used: 0, available: 5 };
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

            // Obtener todas las jornadas desde los pronósticos realizados (tabla Bet)
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
          console.log('🔍 Apuestas agrupadas - Muestra:', groupedArray.slice(0, 2));
          setGroupedBets(groupedArray);
          setUserBets(userBetsData);
          
          // Cargar combis del usuario si hay ligaId (sin filtrar por jornada, solo pendientes)
          if (ligaId) {
            try {
              const combisData = await BetService.getUserCombis(ligaId);
              console.log('✅ Combis cargadas:', combisData);
              setUserCombis(combisData);
              
              // Verificar si el usuario ya tiene una combi pendiente en esta liga
              if (combisData.length > 0) {
                setHasExistingCombi(true);
                console.log('🔗 Usuario tiene combi existente:', combisData[0]);
              } else {
                setHasExistingCombi(false);
                console.log('❌ Usuario no tiene combi');
              }
            } catch (err) {
              console.warn('⚠️ Error loading combis:', err);
              setUserCombis([]);
              setHasExistingCombi(false);
            }
          }
          
          // Filtrar apuestas de la liga por la jornada actual de la liga
          const filteredLeagueBets = currentJornadaFromLeague != null
            ? leagueBetsData.filter(bet => bet.jornada === currentJornadaFromLeague)
            : leagueBetsData;
          setLeagueBets(filteredLeagueBets);
          
          // Cargar combis de la liga (siempre, para mostrarlas cuando la jornada esté cerrada)
          if (ligaId && currentJornadaFromLeague != null) {
            try {
              const combisData = await BetService.getLeagueCombis(ligaId, currentJornadaFromLeague);
              console.log('✅ Combis de la liga cargadas (jornada ' + currentJornadaFromLeague + '):', combisData);
              setLeagueCombis(combisData);
            } catch (err) {
              console.warn('⚠️ Error loading league combis:', err);
              setLeagueCombis([]);
            }
          }
          
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
          setBudget({ total: 5, used: 0, available: 5 });
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
    if (currentJornada != null && newJornada === currentJornada) {
      try {
        setLoading(true);
        
        // Cargar pronósticos disponibles para pronosticar
        let apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName, division });
        try {
          apuestas = apuestas.sort((a: any, b: any) => parseBetDateTime(b).getTime() - parseBetDateTime(a).getTime());
        } catch (err) {
          console.warn('Error ordenando pronósticos por fecha:', err);
        }
        
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
        await refreshBets(currentJornada);
        setJornada(currentJornada);
        setSelectedJornada(currentJornada);
        setRealtimeBalances([]);
        setShowJornadaPicker(false);
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
      
      // Limpiar groupedBets para jornadas históricas (no tendremos escudos)
      setGroupedBets([]);
      setUserBets(userBetsData);
      setLeagueBets(leagueBetsData);
      setRealtimeBalances(realtimeResult.userBalances);
      setJornada(newJornada);
      setJornadaStatus('closed');
      
      // Verificar si hay combi existente para esta jornada histórica
      const existingCombi = userBetsData.some(bet => bet.combiId != null);
      setHasExistingCombi(existingCombi);

      // Cargar combis de la liga para la jornada seleccionada
      try {
        const leagueCombisData = await BetService.getLeagueCombis(ligaId, newJornada);
        setLeagueCombis(leagueCombisData);
      } catch (err) {
        console.warn('⚠️ Error loading league combis (histórico):', err);
        setLeagueCombis([]);
      }
    } catch (err) {
      console.error('Error loading historical jornada:', err);
      showError('Error al cargar la jornada');
    } finally {
      setLoading(false);
    }
  };

  // Helpers y handlers para crear/editar/eliminar pronósticos cuando la jornada está abierta

  const refreshBets = async (targetJornada?: number | null) => {
    if (!ligaId) return;
    const jornadaToUse =
      targetJornada !== undefined
        ? targetJornada
        : (currentJornada ?? jornada ?? null);
    try {
      const [budgetData, userBetsData, leagueBetsData, statusResp] = await Promise.all([
        BetService.getBettingBudget(ligaId),
        BetService.getUserBets(ligaId),
        BetService.getLeagueBets(ligaId),
        JornadaService.getJornadaStatus(ligaId),
      ]);
      setBudget(budgetData);
      const filteredUserBets = jornadaToUse != null
        ? userBetsData.filter(bet => bet.jornada === jornadaToUse)
        : userBetsData;
      const filteredLeagueBets = jornadaToUse != null
        ? leagueBetsData.filter(bet => bet.jornada === jornadaToUse)
        : leagueBetsData;
      setUserBets(filteredUserBets);
      setLeagueBets(filteredLeagueBets);
      setJornadaStatus(statusResp.status);
      
      // Cargar combis del usuario (sin filtrar por jornada, solo pendientes)
      try {
        const combisData = await BetService.getUserCombis(ligaId);
        console.log('🔄 Refresh - Combis cargadas:', combisData);
        setUserCombis(combisData);
        
        if (combisData.length > 0) {
          setHasExistingCombi(true);
          console.log('🔗 Refresh - Usuario tiene combi existente');
        } else {
          setHasExistingCombi(false);
          console.log('❌ Refresh - Usuario no tiene combi');
        }
      } catch (err) {
        console.warn('⚠️ Error loading combis:', err);
        setUserCombis([]);
        setHasExistingCombi(false);
      }

      // Cargar combis de la liga (siempre que haya jornada)
      if (jornadaToUse != null) {
        try {
          const leagueCombisData = await BetService.getLeagueCombis(ligaId, jornadaToUse);
          console.log('🔄 Refresh - Combis de la liga cargadas (jornada ' + jornadaToUse + '):', leagueCombisData);
          setLeagueCombis(leagueCombisData);
        } catch (err) {
          console.warn('⚠️ Error loading league combis:', err);
          setLeagueCombis([]);
        }
      } else {
        setLeagueCombis([]);
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

  const handlePlaceBet = async (key: string, params: { matchId: number; homeTeam: string; awayTeam: string; homeCrest?: string; awayCrest?: string; betType: string; betLabel: string; odd: number }) => {
    if (!ligaId) return;
    
    // Sistema de tickets: verificar que tenga tickets disponibles
    if (budget.available < 1) {
      CustomAlertManager.alert(
        'Sin tickets disponibles',
        `No tienes tickets disponibles. Disponibles: ${budget.available}`,
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Monto fijo de 50M por apuesta
    const amount = 50;

    try {
      setSavingBet(key);
      console.log('Frontend - Creando pronóstico (1 ticket usado, 50M apostados):', {
        matchId: params.matchId,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        betType: params.betType,
        betLabel: params.betLabel,
        odd: params.odd,
      });
      await BetService.placeBet({
        leagueId: ligaId,
        matchId: params.matchId,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam,
        homeCrest: params.homeCrest,
        awayCrest: params.awayCrest,
        betType: params.betType,
        betLabel: params.betLabel,
        odd: params.odd,
        amount,
      });
      showSuccess('✅ Ticket usado - Pronóstico creado');
      await refreshBets();
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al crear pronóstico';

      // Detectar error de tickets insuficientes
      if (errorMessage.toLowerCase().includes('insuficiente') ||
        errorMessage.toLowerCase().includes('ticket')) {
        CustomAlertManager.alert(
          'Sin tickets disponibles',
          `No tienes tickets disponibles para realizar este pronóstico.\n\n${errorMessage}`,
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

  // Sistema de tickets: No se puede actualizar cantidad, solo eliminar y crear nueva
  // Función eliminada - usar solo handleDeleteBet

  const handleDeleteBet = async (key: string, betId: string) => {
    if (!ligaId) return;
    try {
      setSavingBet(key);
      await BetService.deleteBet(ligaId, betId);
      showSuccess('Pronóstico eliminado');
      await refreshBets();
    } catch (err: any) {
      showError(err?.message || 'Error al eliminar pronóstico');
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

  // Función auxiliar para verificar si una opción tiene pronóstico del usuario
  // EXCLUYE los pronósticos que forman parte de una combi
  const getUserBetForOption = (matchId: number, betType: string, betLabel: string): UserBet | undefined => {
    return userBets.find(
      (bet) => bet.matchId === matchId && bet.betType === betType && bet.betLabel === betLabel && !bet.combiId
    );
  };

  // Función auxiliar para obtener la combi de un pronóstico
  const getCombiForBet = (betId: string) => {
    return userCombis.find(combi => 
      combi.selections && combi.selections.some((sel: any) => sel.id === betId)
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

  // Función para verificar si existe algún pronóstico en el grupo (mismo matchId + betType)
  // EXCLUYE los pronósticos que forman parte de una combi
  const hasAnyBetInGroup = (matchId: number, betType: string): boolean => {
    return userBets.some((bet) => bet.matchId === matchId && bet.betType === betType && !bet.combiId);
  };

  // Use shared formatter from utils `frontend/utils/formatBetLabel.ts`

  // Regla global: un solo pronóstico por partido
  // EXCLUYE los pronósticos que forman parte de una combi
  const hasAnyBetInMatch = (matchId: number): boolean => {
    return userBets.some((bet) => bet.matchId === matchId && !bet.combiId);
  };

  // Funciones para manejar combis
  const toggleCombiSelection = async (selection: CombiSelection) => {
    // Verificar si la liga es premium
    if (!isPremium) {
      CustomAlertManager.alert(
        'Funcionalidad Premium',
        'Los pronósticos combinados son exclusivos de las ligas premium. ¿Deseas actualizar tu liga?',
        [
          { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
          { text: 'Mejorar', onPress: handleUpgradeToPremium, style: 'default' }
        ],
        { icon: 'trophy', iconColor: '#fbbf24' }
      );
      return;
    }

    // Verificar si ya existe un pronóstico normal (no combi) en este partido
    if (hasAnyBetInMatch(selection.matchId)) {
      CustomAlertManager.alert(
        'Pronóstico existente',
        'Ya tienes un pronóstico en este partido. No puedes agregar opciones de este partido a una combinada.',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    const isAlreadySelected = combiSelections.some(
      s => s.matchId === selection.matchId && s.betType === selection.betType && s.betLabel === selection.betLabel
    );

    // Si ya existe una combi guardada en el servidor
    if (hasExistingCombi && userCombis.length > 0 && jornada != null) {
      const currentCombi = userCombis.find(c => c.jornada === jornada);
      if (currentCombi) {
        if (isAlreadySelected) {
          // Encontrar el bet que corresponde a esta selección
          const betToRemove = currentCombi.selections.find((s: any) => 
            s.matchId === selection.matchId && 
            s.betType === selection.betType && 
            s.betLabel === selection.betLabel
          );
          
          if (betToRemove) {
            try {
              const result = await BetService.removeSelectionFromCombi(currentCombi.id, betToRemove.id);
              
              // Si deleted=true, significa que la combi fue eliminada completamente
              if (result.deleted) {
                showSuccess('Combi eliminada (menos de 2 selecciones)');
                setCombiSelections([]);
                setCombiAmount('');
                setHasExistingCombi(false);
              } else {
                showSuccess('Selección eliminada de la combi');
                // Actualizar selecciones locales
                setCombiSelections(prev => 
                  prev.filter(s => !(s.matchId === selection.matchId && s.betType === selection.betType && s.betLabel === selection.betLabel))
                );
              }
              
              await refreshBets();
            } catch (error: any) {
              showError(error.message || 'Error al eliminar selección');
            }
          }
        } else {
          // Añadir selección a la combi existente (sin límite)
          try {
            await BetService.addSelectionToCombi(currentCombi.id, selection);
            showSuccess('Selección añadida a la combi');
            setCombiSelections(prev => [...prev, selection]);
            await refreshBets();
          } catch (error: any) {
            showError(error.message || 'Error al añadir selección');
          }
        }
        return;
      }
    }

    // Si NO hay combi guardada, solo modificar selecciones locales
    if (isAlreadySelected) {
      // Remover selección
      setCombiSelections(prev => 
        prev.filter(s => !(s.matchId === selection.matchId && s.betType === selection.betType && s.betLabel === selection.betLabel))
      );
    } else {
      // Agregar selección (sin límite máximo)
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

  const isOptionBlockedByCombi = (matchId: number, betType: string, betLabel: string): boolean => {
    // Si esta opción específica está en la combi, no está bloqueada
    if (isInCombi(matchId, betType, betLabel)) {
      return false;
    }
    // Si hay otra opción del mismo partido y mismo tipo de pronóstico en la combi, bloquear esta
    return combiSelections.some(s => s.matchId === matchId && s.betType === betType);
  };

  const calculateCombiOdds = (): number => {
    return combiSelections.reduce((acc, sel) => acc * sel.odd, 1);
  };

  const handleOpenCombiModal = () => {
    // Si hay una combi existente, cargar sus datos
    if (hasExistingCombi && userCombis.length > 0) {
      const existingCombi = userCombis[0];
      if (existingCombi.selections) {
        const selections: CombiSelection[] = existingCombi.selections.map((sel: any) => ({
          matchId: sel.matchId,
          betType: sel.betType,
          betLabel: sel.betLabel,
          odd: sel.odd,
          homeTeam: sel.homeTeam,
          awayTeam: sel.awayTeam
        }));
        setCombiSelections(selections);
        setCombiAmount(String(existingCombi.amount));
      }
    }
    setShowCombiModal(true);
  };

  const handleCreateCombi = async () => {
    if (!ligaId || !jornada) return;

    // Verificar si la liga es premium
    if (!isPremium) {
      CustomAlertManager.alert(
        'Funcionalidad Premium',
        'Los pronósticos combinados son exclusivos de las ligas premium. ¿Deseas actualizar tu liga?',
        [
          { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
          { text: 'Mejorar', onPress: handleUpgradeToPremium, style: 'default' }
        ],
        { icon: 'trophy', iconColor: '#fbbf24' }
      );
      return;
    }

    if (combiSelections.length < 2) {
      CustomAlertManager.alert(
        'Cantidad no válida',
        'Necesitas mínimo 2 pronósticos para crear una combi',
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Monto fijo de 50M para combis
    const amount = 50;

    // Validar que tenga tickets disponibles
    if (budget.available < 1) {
      CustomAlertManager.alert(
        'Sin tickets disponibles',
        `No tienes tickets disponibles para crear combinadas. Disponibles: ${budget.available}`,
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Si ya existe una combi, mostrar alerta de confirmación
    if (hasExistingCombi && userCombis.length > 0) {
      CustomAlertManager.alert(
        'Reemplazar combi',
        'Borrarás tu anterior combi por esta nueva. ¿Deseas continuar?',
        [
          { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
          { 
            text: 'Sí, reemplazar', 
            onPress: () => executeCreateCombi(amount), 
            style: 'destructive' 
          }
        ],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    // Si no hay combi existente, crear directamente
    executeCreateCombi(amount);
  };

  const executeCreateCombi = async (amount: number) => {
    setCreatingCombi(true);
    try {
      const token = await EncryptedStorage.getItem('accessToken');
      if (!token) throw new Error('No hay token de autenticación');

      // Si ya existe una combi, eliminarla primero
      if (hasExistingCombi && userCombis.length > 0) {
        const existingCombi = userCombis[0];
        
        const deleteResponse = await fetch(`https://lafantasiadelgambling.onrender.com/bet-combis/${existingCombi.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!deleteResponse.ok) {
          const deleteData = await deleteResponse.json();
          throw new Error(deleteData.error || 'Error al eliminar la combi anterior');
        }
      }

      // Crear nueva combi
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
      
      // Cerrar modal y limpiar
      setShowCombiModal(false);
      setCombiSelections([]);
      setCombiAmount('');
      
      // Recargar todo
      await refreshBets();

    } catch (error: any) {
      console.error('Error creating combi:', error);
      showError(error.message || 'Error al crear la combi');
    } finally {
      setCreatingCombi(false);
    }
  };

  const handleDeleteCombi = async () => {
    if (userCombis.length === 0) return;

    CustomAlertManager.alert(
      'Eliminar combi',
      '¿Estás seguro de que deseas eliminar tu combi? Se te devolverá 1 ticket.',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        { 
          text: 'Sí, eliminar', 
          onPress: async () => {
            try {
              setCreatingCombi(true);
              const combiToDelete = userCombis[0];
              
              const token = await EncryptedStorage.getItem('accessToken');
              if (!token) throw new Error('No hay token de autenticación');

              const response = await fetch(`https://lafantasiadelgambling.onrender.com/bet-combis/${combiToDelete.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al eliminar la combi');
              }

              showSuccess('✅ Combi eliminada - 1 ticket devuelto');
              
              // Limpiar estados
              setShowCombiModal(false);
              setCombiSelections([]);
              setCombiAmount('');
              setHasExistingCombi(false);
              setUserCombis([]);
              
              // Recargar todo
              await refreshBets();
            } catch (error: any) {
              console.error('Error deleting combi:', error);
              showError(error.message || 'Error al eliminar la combi');
            } finally {
              setCreatingCombi(false);
            }
          },
          style: 'destructive' 
        }
      ],
      { icon: 'alert', iconColor: '#ef4444' }
    );
  };

  const clearCombi = () => {
    setCombiSelections([]);
    setCombiAmount('');
    setShowCombiModal(false);
  };

  // Derived flag: whether there is an already placed combi for the current jornada
  const currentCombi = (userCombis && userCombis.find((c: any) => c.jornada === jornada)) || (userCombis && userCombis.length > 0 ? userCombis[0] : null);
  const isCombiPlaced = Boolean(hasExistingCombi && currentCombi);

  // Función para iniciar el proceso de upgrade a premium
  const handleUpgradeToPremium = async () => {
    if (!ligaId || !ligaName) {
      showError('No se pudo obtener la información de la liga');
      return;
    }

    try {
      setProcessingUpgrade(true);
      
      // Crear sesión de pago para upgrade
      const checkoutUrl = await PaymentService.createUpgradeCheckout(ligaId, ligaName);
      
      if (!checkoutUrl) {
        throw new Error('No se pudo generar la URL de pago');
      }

      setUpgradeCheckoutUrl(checkoutUrl);
      setShowUpgradeWebView(true);
    } catch (error: any) {
      console.error('Error al iniciar upgrade:', error);
      showError(error.message || 'Error al iniciar el proceso de upgrade');
    } finally {
      setProcessingUpgrade(false);
    }
  };

  // Función para procesar el resultado del pago de upgrade
  const handleUpgradePaymentResult = async (url: string) => {
    // Detectar success o cancel en la URL
    if (url.includes('/payment/success')) {
      const sessionId = url.split('session_id=')[1]?.split('&')[0];
      
      if (sessionId) {
        try {
          setShowUpgradeWebView(false);
          setProcessingUpgrade(true);

          // Verificar el pago
          const paymentInfo = await PaymentService.verifyPayment(sessionId);

          if (paymentInfo.paid && paymentInfo.leagueId) {
            // Actualizar la liga a premium
            await LigaService.upgradeLeagueToPremium(paymentInfo.leagueId);

            CustomAlertManager.alert(
              '🎉 ¡Liga Premium Activada!',
              'Tu liga ha sido actualizada a Premium. Ahora puedes disfrutar de todas las funcionalidades exclusivas.',
              [
                {
                  text: 'Entendido',
                  onPress: () => {
                    // Recargar la página para reflejar cambios
                    navigation.replace('Apuestas', {
                      ligaId,
                      ligaName,
                      isPremium: true,
                      division
                    });
                  },
                  style: 'default'
                }
              ],
              { icon: 'checkmark-circle', iconColor: '#22c55e' }
            );
          } else {
            throw new Error('El pago no se completó correctamente');
          }
        } catch (error: any) {
          console.error('Error verificando pago de upgrade:', error);
          showError(error.message || 'Error al verificar el pago');
        } finally {
          setProcessingUpgrade(false);
        }
      }
    } else if (url.includes('/payment/cancel')) {
      setShowUpgradeWebView(false);
      CustomAlertManager.alert(
        'Pago cancelado',
        'El proceso de upgrade fue cancelado',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'information-circle', iconColor: '#3b82f6' }
      );
    }
  };

  // Remove a selection from the combi (handles server-side removal when combi exists)
  const removeSelection = async (selection: CombiSelection, index: number) => {
    // If there's an existing combi saved on server, attempt server removal
    if (hasExistingCombi && userCombis.length > 0 && jornada != null) {
      const currentCombi = userCombis.find(c => c.jornada === jornada) || userCombis[0];
      if (currentCombi && currentCombi.selections) {
        const matched = currentCombi.selections.find((s: any) =>
          s.matchId === selection.matchId &&
          normalizeType(s.betType) === normalizeType(selection.betType) &&
          normalizeLabel(s.betLabel) === normalizeLabel(selection.betLabel)
        );
        try {
          if (matched) {
            const result = await BetService.removeSelectionFromCombi(currentCombi.id, matched.id);
            if (result && result.deleted) {
              showSuccess('Combi eliminada (menos de 2 selecciones)');
              setCombiSelections([]);
              setCombiAmount('');
              setHasExistingCombi(false);
              setUserCombis([]);
            } else {
              showSuccess('Selección eliminada de la combi');
              setCombiSelections(prev => prev.filter((_, i) => i !== index));
            }
            await refreshBets();
            return;
          }
        } catch (err: any) {
          showError(err?.message || 'Error al eliminar selección');
          return;
        }
      }
    }

    // Fallback / local combi: just remove locally
    setCombiSelections(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers para expansión de usuarios
  const toggleUserExpansion = (userName: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userName)) {
        newSet.delete(userName);
      } else {
        newSet.add(userName);
      }
      return newSet;
    });
  };

  // Handlers para tabs
  const handleTabPress = (index: number) => {
    if (index === activeTab) return; // Evitar re-renderizados innecesarios
    
    setActiveTab(index);
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  };

  // Handlers para expansión de pronósticos
  const toggleBetExpansion = (matchId: number) => {
    setExpandedBets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const getCombiIdFromBet = (bet: UserBet): string | null => {
    const combiData = (bet as any)?.combi;
    return bet.combiId || combiData?.id || null;
  };

  const isCombiBet = (bet: UserBet): boolean => !!getCombiIdFromBet(bet);

  // Helper para evaluar el estado de una combi basado en todas sus selecciones
  const evaluateCombiStatus = (selections: UserBet[]): 'won' | 'lost' | 'pending' => {
    const statuses = selections.map(s => (s as any).status);
    
    // Si alguna está perdida, la combi está perdida
    if (statuses.some(st => st === 'lost')) return 'lost';
    
    // Si todas están ganadas, la combi está ganada
    if (statuses.every(st => st === 'won')) return 'won';
    
    // En cualquier otro caso (hay pendientes o sin evaluar), está pendiente
    return 'pending';
  };

  // Contar combis dentro de un balance en tiempo real (extrae combiId de las apuestas)
  const countCombisInBalance = (balance: any): number => {
    const allBets = [ ...(balance.betsWon || []), ...(balance.betsLost || []), ...(balance.betsPending || []) ];
    const ids = new Set<string>();
    allBets.forEach((b: any) => {
      const combiId = getCombiIdFromBet(b) || (b && b.combiId);
      if (combiId) ids.add(combiId);
    });
    return ids.size;
  };

  // Función para desbloquear pronóstico con anuncio recompensado
  const handleUnlockWithAd = async (betIndex: number) => {
    if (unlockedBets.size >= 2) {
      CustomAlertManager.alert(
        'Límite alcanzado',
        'Solo puedes desbloquear 2 pronósticos por jornada viendo anuncios.',
        [{ text: 'Entendido', onPress: () => { }, style: 'default' }],
        { icon: 'alert', iconColor: '#f59e0b' }
      );
      return;
    }

    setLoadingAd(true);
    try {
      const result = await AdMobService.showRewarded();
      
      if (result.error) {
        // Hubo un error al cargar/mostrar el anuncio - desbloquear automáticamente
        console.warn('⚠️ No se pudo cargar el anuncio, desbloqueando automáticamente:', result.error);
        setUnlockedBets(prev => new Set([...prev, betIndex]));
        showSuccess('Pronóstico desbloqueado (anuncio no disponible).');
      } else if (result.watched) {
        // Usuario completó el anuncio, desbloquear el pronóstico por índice
        setUnlockedBets(prev => new Set([...prev, betIndex]));
        showSuccess('¡Pronóstico desbloqueado! Ahora puedes pronosticar en esta opción.');
      } else {
        showError('Debes ver el anuncio completo para desbloquear el pronóstico.');
      }
    } catch (error) {
      console.error('Error mostrando anuncio:', error);
      // Si hay un error (anuncio no disponible), desbloquear automáticamente
      setUnlockedBets(prev => new Set([...prev, betIndex]));
      showSuccess('Pronóstico desbloqueado (anuncio no disponible).');
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
                  <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Historial de DreamGame</Text>
                  
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
                      {/* Tab Selector */}
                      <View 
                        style={{
                          flexDirection: 'row',
                          position: 'relative',
                          marginBottom: 16,
                        }}
                        onLayout={(e) => {
                          const containerWidth = e.nativeEvent.layout.width;
                          // Store tab width for indicator calculation
                          (handleTabPress as any).tabWidth = containerWidth / 2;
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleTabPress(0)}
                          style={{
                            flex: 1,
                            paddingVertical: 16,
                          }}
                        >
                          <Text style={{
                            color: activeTab === 0 ? '#0892D0' : '#94a3b8',
                            fontSize: 16,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}>
                            Balances
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleTabPress(1)}
                          style={{
                            flex: 1,
                            paddingVertical: 16,
                          }}
                        >
                          <Text style={{
                            color: activeTab === 1 ? '#0892D0' : '#94a3b8',
                            fontSize: 16,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}>
                            Pronósticos
                          </Text>
                        </TouchableOpacity>

                        {/* Indicador animado */}
                        <Animated.View
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: '50%',
                            height: 3,
                            backgroundColor: '#0892D0',
                            transform: [
                              {
                                translateX: tabIndicatorAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, (SCREEN_WIDTH - 32) / 2],
                                }),
                              },
                            ],
                          }}
                        />
                      </View>

                      {/* Content - Renderizado condicional según tab activo */}
                      {activeTab === 0 ? (
                        /* TAB 1: BALANCES */
                        <View>
                          {/* Banner AdMob */}
                          <View style={{ marginBottom: 16, alignItems: 'center' }}>
                            <AdBanner size="BANNER" />
                          </View>

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
                                <ChartBarIcon size={24} color="#93c5fd" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#93c5fd', fontSize: 18, fontWeight: '800' }}>
                                  BALANCES
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                                  {evaluatingRealtime ? 'Evaluando...' : `${leagueBets.length} pronóstico${leagueBets.length !== 1 ? 's' : ''} realizado`}
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
                            ) : false ? (
                              /* DESHABILITADO: realtimeBalances no agrupa combis correctamente */
                              (() => {
                                const sortedBalances = [...realtimeBalances].sort((a, b) => b.netProfit - a.netProfit);
                                return sortedBalances.map((balance) => {
                                  const isExpanded = expandedUsers.has(balance.userName);
                                  return (
                                    <View key={balance.userId}>
                                      <TouchableOpacity
                                        onPress={() => toggleUserExpansion(balance.userName)}
                                        activeOpacity={0.7}
                                        style={{
                                          backgroundColor: '#0f172a',
                                          borderRadius: 8,
                                          padding: 12,
                                          marginBottom: 8,
                                          borderLeftWidth: 3,
                                          borderLeftColor: balance.netProfit >= 0 ? '#22c55e' : '#ef4444',
                                        }}
                                      >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                                              {balance.userName}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                                  {balance.totalBets} apuesta{balance.totalBets !== 1 ? 's' : ''} - {countCombisInBalance(balance)} combi{countCombisInBalance(balance) !== 1 ? 's' : ''} (
                                                </Text>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>{balance.wonBets}</Text>
                                                <CheckIcon size={12} color="#22c55e" />
                                              </View>
                                              <Text style={{ color: '#94a3b8', fontSize: 13 }}>/</Text>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>{balance.lostBets}</Text>
                                                <ErrorIcon size={12} color="#ef4444" />
                                              </View>
                                              {balance.pendingBets > 0 && (
                                                <>
                                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>/</Text>
                                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>{balance.pendingBets}</Text>
                                                    <ClockIcon size={12} color="#f59e0b" />
                                                  </View>
                                                </>
                                              )}
                                              <Text style={{ color: '#94a3b8', fontSize: 13 }}>)</Text>
                                            </View>
                                          </View>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Text style={{
                                              color: balance.netProfit >= 0 ? '#22c55e' : '#ef4444',
                                              fontWeight: '800',
                                              fontSize: 16
                                            }}>
                                              {balance.netProfit >= 0 ? '+' : ''}{balance.netProfit.toFixed(1)}M
                                            </Text>
                                            {isExpanded ? (
                                              <ChevronUpIcon size={20} color="#94a3b8" />
                                            ) : (
                                              <ChevronDownIcon size={20} color="#94a3b8" />
                                            )}
                                          </View>
                                        </View>
                                      </TouchableOpacity>

                                      {/* Detalles expandidos del usuario */}
                                      {isExpanded && (
                                        <View style={{ paddingLeft: 16, marginBottom: 12 }}>
                                          {/* Apuestas ganadas */}
                                          {balance.betsWon && balance.betsWon.length > 0 && (
                                            <View style={{ marginBottom: 12 }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                <CheckIcon size={14} color="#22c55e" />
                                                <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '700' }}>
                                                  Ganadas
                                                </Text>
                                              </View>
                                              {balance.betsWon.map((bet: any) => (
                                                <View key={bet.betId} style={{
                                                  backgroundColor: '#0a1420',
                                                  padding: 10,
                                                  borderRadius: 6,
                                                  marginBottom: 6,
                                                  borderLeftWidth: 2,
                                                  borderLeftColor: '#22c55e',
                                                }}>
                                                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                                    [{bet.homeTeam || bet.local || ''} vs {bet.awayTeam || bet.visitante || ''}]
                                                  </Text>
                                                  <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                                    {formatLabelWithType(bet.betLabel, bet.betType)}
                                                  </Text>
                                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                      Cuota: {bet.odd}
                                                    </Text>
                                                    <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>
                                                      +{bet.potentialWin.toFixed(1)}M
                                                    </Text>
                                                  </View>
                                                  <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                </View>
                                              ))}
                                            </View>
                                          )}

                                          {/* Apuestas perdidas */}
                                          {balance.betsLost && balance.betsLost.length > 0 && (
                                            <View style={{ marginBottom: 12 }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                <ErrorIcon size={14} color="#ef4444" />
                                                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>
                                                  Perdidas
                                                </Text>
                                              </View>
                                              {balance.betsLost.map((bet: any) => (
                                                <View key={bet.betId} style={{
                                                  backgroundColor: '#0a1420',
                                                  padding: 10,
                                                  borderRadius: 6,
                                                  marginBottom: 6,
                                                  borderLeftWidth: 2,
                                                  borderLeftColor: '#ef4444',
                                                }}>
                                                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                                    [{bet.homeTeam || bet.local || ''} vs {bet.awayTeam || bet.visitante || ''}]
                                                  </Text>
                                                  <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                                    {formatLabelWithType(bet.betLabel, bet.betType)}
                                                  </Text>
                                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                      Cuota: {bet.odd}
                                                    </Text>
                                                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>
                                                      -{bet.amount}M
                                                    </Text>
                                                  </View>
                                                  <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                </View>
                                              ))}
                                            </View>
                                          )}

                                          {/* Apuestas pendientes */}
                                          {balance.betsPending && balance.betsPending.length > 0 && (
                                            <View>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                <ClockIcon size={14} color="#f59e0b" />
                                                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>
                                                  Pendientes
                                                </Text>
                                              </View>
                                              {balance.betsPending.map((bet: any) => (
                                                <View key={bet.betId} style={{
                                                  backgroundColor: '#0a1420',
                                                  padding: 10,
                                                  borderRadius: 6,
                                                  marginBottom: 6,
                                                  borderLeftWidth: 2,
                                                  borderLeftColor: '#f59e0b',
                                                }}>
                                                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                                    [{bet.homeTeam || bet.local || ''} vs {bet.awayTeam || bet.visitante || ''}]
                                                  </Text>
                                                  <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                                    {formatLabelWithType(bet.betLabel, bet.betType)}
                                                  </Text>
                                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                      Cuota: {bet.odd}
                                                    </Text>
                                                    <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>
                                                      {bet.amount}M
                                                    </Text>
                                                  </View>
                                                  <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                </View>
                                              ))}
                                            </View>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                  );
                                });
                              })()
                            ) : (
                              /* Fallback: agrupar por jugador - CONTRAÍDOS */
                              (() => {
                                console.log('🔍 Apuestas - Total apuestas:', leagueBets.length);
                                console.log('🔍 Apuestas - Datos completos:', leagueBets.map(b => ({
                                  id: b.id,
                                  combiId: b.combiId,
                                  combiData: (b as any).combi,
                                  userName: b.userName,
                                  betLabel: b.betLabel
                                })));
                                
                                // Separar apuestas individuales (sin combiId)
                                const individualBets = leagueBets.filter(bet => !isCombiBet(bet));
                                
                                // Agrupar combis por combiId
                                const combiBets = leagueBets.filter(isCombiBet);
                                const combisByCombiId: Record<string, UserBet[]> = {};
                                combiBets.forEach((bet) => {
                                  const combiKey = getCombiIdFromBet(bet);
                                  if (!combiKey) {
                                    return;
                                  }
                                  if (!combisByCombiId[combiKey]) {
                                    combisByCombiId[combiKey] = [];
                                  }
                                  combisByCombiId[combiKey].push(bet);
                                });
                                
                                console.log('🔍 Apuestas - Combis agrupadas:', Object.keys(combisByCombiId).length);
                                console.log('🔍 Apuestas - combisByCombiId:', combisByCombiId);
                                
                                type UserSummary = {
                                  userId: string;
                                  userName: string;
                                  bets: UserBet[];
                                  balance: number;
                                  wonBets: number;
                                  lostBets: number;
                                  combis: Array<{
                                    id: string;
                                    selections: UserBet[];
                                    totalOdds: number;
                                    amount: number;
                                    potentialWin: number;
                                    status: 'won' | 'lost' | 'pending';
                                  }>;
                                };

                                const betsByUser: Record<string, UserSummary> = {};

                                const applyEvaluatedResult = (summary: UserSummary, betStatus: string | undefined, winValue: number, loseValue: number) => {
                                  if (betStatus === 'won') {
                                    summary.balance += winValue;
                                  } else if (betStatus === 'lost') {
                                    summary.balance -= loseValue;
                                  }
                                };

                                const formatMillions = (value: number) => {
                                  if (Number.isInteger(value)) {
                                    return `${value}`;
                                  }
                                  return value.toFixed(2).replace(/\.00$/, '');
                                };

                                const ensureUserSummary = (bet: UserBet): UserSummary => {
                                  const userId = (bet as any).userId || bet.userName || 'Jugador';
                                  const userName = bet.userName || 'Jugador';
                                  if (!betsByUser[userId]) {
                                    betsByUser[userId] = {
                                      userId,
                                      userName,
                                      bets: [],
                                      balance: 0,
                                      wonBets: 0,
                                      lostBets: 0,
                                      combis: [],
                                    };
                                  }
                                  return betsByUser[userId];
                                };

                                individualBets.forEach((bet) => {
                                  const summary = ensureUserSummary(bet);
                                  summary.bets.push(bet);
                                  if ((bet as any).status === 'won') summary.wonBets++;
                                  if ((bet as any).status === 'lost') summary.lostBets++;
                                  applyEvaluatedResult(summary, (bet as any).status, bet.potentialWin, bet.amount);
                                });

                                Object.entries(combisByCombiId).forEach(([combiId, selections]) => {
                                  if (selections.length === 0) return;
                                  const summary = ensureUserSummary(selections[0]);
                                  const combiData = (selections[0] as any).combi;
                                  const totalOdds = combiData?.totalOdd || selections.reduce((acc: number, sel: any) => acc * sel.odd, 1);
                                  const amount = combiData?.amount || 0;
                                  const potentialWin = combiData?.potentialWin || (amount * totalOdds);
                                  const combiStatus = evaluateCombiStatus(selections);
                                  summary.combis.push({
                                    id: combiId,
                                    selections,
                                    totalOdds,
                                    amount,
                                    potentialWin,
                                    status: combiStatus,
                                  });
                                  applyEvaluatedResult(summary, combiStatus, potentialWin, amount);
                                });

                                const sortedUsers = Object.entries(betsByUser).sort(([, a], [, b]) => b.balance - a.balance);

                                return (
                                  <>
                                    {/* APUESTAS INDIVIDUALES POR USUARIO */}
                                    {sortedUsers.map(([userId, data]) => {
                                      const userKey = userId;
                                      const isExpanded = expandedUsers.has(userKey);
                                      const userCombis = data.combis || [];
                                  return (
                                    <View key={userKey}>
                                      <TouchableOpacity
                                        onPress={() => toggleUserExpansion(userKey)}
                                        activeOpacity={0.7}
                                        style={{
                                          backgroundColor: '#0f172a',
                                          borderRadius: 8,
                                          padding: 12,
                                          marginBottom: 8,
                                          borderLeftWidth: 3,
                                          borderLeftColor: '#3b82f6',
                                        }}
                                      >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                                              {data.userName}
                                            </Text>
                                            <View style={{ flexDirection: 'column' }}>
                                              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                                {data.bets.length} apuesta{data.bets.length !== 1 ? 's' : ''}{isPremium ? ` - ${userCombis.length} combi${userCombis.length !== 1 ? 's' : ''}` : ''}
                                              </Text>

                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>(</Text>

                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>{data.wonBets}</Text>
                                                  <CheckIcon size={12} color="#22c55e" />
                                                </View>

                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>/</Text>

                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>{Math.max(0, data.bets.length - data.wonBets - data.lostBets)}</Text>
                                                  <ClockIcon size={12} color="#f59e0b" />
                                                </View>

                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>/</Text>

                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>{data.lostBets}</Text>
                                                  <ErrorIcon size={12} color="#ef4444" />
                                                </View>

                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>)</Text>
                                              </View>
                                            </View>
                                          </View>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Text style={{
                                              color: data.balance >= 0 ? '#22c55e' : '#ef4444',
                                              fontWeight: '800',
                                              fontSize: 15,
                                            }}>
                                              {data.balance >= 0 ? '+' : ''}{formatMillions(data.balance)}M
                                            </Text>
                                            {isExpanded ? (
                                              <ChevronUpIcon size={20} color="#94a3b8" />
                                            ) : (
                                              <ChevronDownIcon size={20} color="#94a3b8" />
                                            )}
                                          </View>
                                        </View>
                                      </TouchableOpacity>

                                      {/* Detalles expandidos del usuario */}
                                      {isExpanded && (
                                        <View style={{ paddingLeft: 16, marginBottom: 12 }}>
                                          {userCombis.length > 0 && (
                                            <View style={{ marginBottom: 16 }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <TrendingIcon size={14} color="#0892D0" />
                                                <Text style={{ color: '#0892D0', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }}>
                                                  Apuestas combinadas ({userCombis.length})
                                                </Text>
                                              </View>
                                              {userCombis.map((combi) => {
                                                const combiKey = `combi-${combi.id}`;
                                                const combiExpanded = expandedUsers.has(combiKey);
                                                const statusColor = combi.status === 'won' ? '#22c55e' : combi.status === 'lost' ? '#ef4444' : '#f59e0b';
                                                return (
                                                  <View key={combi.id} style={{ marginBottom: 10 }}>
                                                    <TouchableOpacity
                                                      onPress={() => toggleUserExpansion(combiKey)}
                                                      activeOpacity={0.8}
                                                      style={{
                                                        backgroundColor: '#091224',
                                                        borderRadius: 8,
                                                        padding: 12,
                                                        borderWidth: 1,
                                                        borderColor: statusColor,
                                                      }}
                                                    >
                                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <View style={{ flex: 1, marginRight: 12 }}>
                                                          <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                                                            Combi ({combi.selections.length} apuestas)
                                                          </Text>
                                                              <View style={{ marginTop: 6 }}>
                                                                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>
                                                                  Apostado:{' '}
                                                                  <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>{combi.amount}M</Text>
                                                                </Text>
                                                                <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>
                                                                  Cuota:{' '}
                                                                  <Text style={{ color: '#0892D0', fontWeight: '700' }}>{combi.totalOdds.toFixed(2)}</Text>
                                                                </Text>
                                                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                                                  Ganancia potencial:{' '}
                                                                  <Text style={{ color: '#22c55e', fontWeight: '700' }}>+{Math.round(combi.potentialWin)}M</Text>
                                                                </Text>
                                                              </View>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end' }}>
                                                          <Text style={{ color: statusColor, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>
                                                            {combi.status === 'won' ? 'Ganada' : combi.status === 'lost' ? 'Perdida' : 'Pendiente'}
                                                          </Text>
                                                          {combiExpanded ? (
                                                            <ChevronUpIcon size={18} color="#94a3b8" />
                                                          ) : (
                                                            <ChevronDownIcon size={18} color="#94a3b8" />
                                                          )}
                                                        </View>
                                                      </View>
                                                    </TouchableOpacity>
                                                    {combiExpanded && (
                                                      <View style={{ backgroundColor: '#050b16', borderRadius: 8, padding: 12, marginTop: 6 }}>
                                                        {combi.selections.map((bet, idx) => {
                                                          const betStatus = (bet as any).status;
                                                          const isWon = betStatus === 'won';
                                                          const isLost = betStatus === 'lost';
                                                          const isPending = !betStatus || betStatus === 'pending';
                                                          return (
                                                            <View
                                                              key={bet.id}
                                                              style={{
                                                                borderLeftWidth: 3,
                                                                borderLeftColor: isWon ? '#22c55e' : isLost ? '#ef4444' : '#f59e0b',
                                                                paddingLeft: 10,
                                                                marginBottom: idx < combi.selections.length - 1 ? 10 : 0,
                                                              }}
                                                            >
                                                              <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 6 }}>
                                                                {bet.homeTeam || ''} vs {bet.awayTeam || ''}
                                                              </Text>
                                                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600', flex: 1 }}>
                                                                  {formatLabelWithType(bet.betLabel, bet.betType)}
                                                                </Text>
                                                                {isWon && <CheckIcon size={12} color="#22c55e" />}
                                                                {isLost && <ErrorIcon size={12} color="#ef4444" />}
                                                                {isPending && <ClockIcon size={12} color="#f59e0b" />}
                                                              </View>
                                                              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                                                                {bet.betType}
                                                              </Text>
                                                              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                                                Cuota: {bet.odd.toFixed(2)}
                                                              </Text>
                                                              {idx < combi.selections.length - 1 && (
                                                                <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                              )}
                                                            </View>
                                                          );
                                                        })}
                                                      </View>
                                                    )}
                                                  </View>
                                                );
                                              })}
                                            </View>
                                          )}
                                          {/* Apuestas ganadas */}
                                          {data.bets.filter(b => (b as any).status === 'won').length > 0 && (
                                            <View style={{ marginBottom: 12 }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                <CheckIcon size={14} color="#22c55e" />
                                                <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '700' }}>
                                                  Ganadas
                                                </Text>
                                              </View>
                                              {data.bets.filter(b => (b as any).status === 'won').map((bet) => (
                                                <View key={bet.id} style={{
                                                  backgroundColor: '#0a1420',
                                                  padding: 10,
                                                  borderRadius: 6,
                                                  marginBottom: 6,
                                                  borderLeftWidth: 2,
                                                  borderLeftColor: '#22c55e',
                                                }}>
                                                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 4 }}>
                                                    {bet.homeTeam || ''} vs {bet.awayTeam || ''}
                                                  </Text>
                                                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>
                                                    {bet.betType}
                                                  </Text>
                                                  <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                                    {formatLabelWithType(bet.betLabel, bet.betType)}
                                                  </Text>
                                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                      Cuota: {bet.odd.toFixed(2)}
                                                    </Text>
                                                    <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>
                                                      +{bet.potentialWin}M
                                                    </Text>
                                                  </View>
                                                  <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                </View>
                                              ))}
                                            </View>
                                          )}

                                          {/* Apuestas perdidas */}
                                          {data.bets.filter(b => (b as any).status === 'lost').length > 0 && (
                                            <View style={{ marginBottom: 12 }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                <ErrorIcon size={14} color="#ef4444" />
                                                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>
                                                  Perdidas
                                                </Text>
                                              </View>
                                              {data.bets.filter(b => (b as any).status === 'lost').map((bet) => (
                                                <View key={bet.id} style={{
                                                  backgroundColor: '#0a1420',
                                                  padding: 10,
                                                  borderRadius: 6,
                                                  marginBottom: 6,
                                                  borderLeftWidth: 2,
                                                  borderLeftColor: '#ef4444',
                                                }}>
                                                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 4 }}>
                                                    {bet.homeTeam || ''} vs {bet.awayTeam || ''}
                                                  </Text>
                                                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>
                                                    {bet.betType}
                                                  </Text>
                                                  <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                                    {formatLabelWithType(bet.betLabel, bet.betType)}
                                                  </Text>
                                                  <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                </View>
                                              ))}
                                            </View>
                                          )}

                                          {/* Apuestas pendientes */}
                                          {data.bets.filter(b => !(b as any).status || (b as any).status === 'pending').length > 0 && (
                                            <View>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                <ClockIcon size={14} color="#f59e0b" />
                                                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>
                                                  Pendientes
                                                </Text>
                                              </View>
                                              {data.bets.filter(b => !(b as any).status || (b as any).status === 'pending').map((bet) => (
                                                <View key={bet.id} style={{
                                                  backgroundColor: '#0a1420',
                                                  padding: 10,
                                                  borderRadius: 6,
                                                  marginBottom: 6,
                                                  borderLeftWidth: 2,
                                                  borderLeftColor: '#f59e0b',
                                                }}>
                                                  <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 4 }}>
                                                    {bet.homeTeam || ''} vs {bet.awayTeam || ''}
                                                  </Text>
                                                  <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>
                                                    {bet.betType}
                                                  </Text>
                                                  <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                                    {formatLabelWithType(bet.betLabel, bet.betType)}
                                                  </Text>
                                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <Text style={{ color: '#64748b', fontSize: 11 }}>
                                                      Cuota: {bet.odd.toFixed(2)}
                                                    </Text>
                                                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>
                                                      Potencial: +{bet.potentialWin}M
                                                    </Text>
                                                  </View>
                                                  <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                                </View>
                                              ))}
                                            </View>
                                          )}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </>
                                );
                              })()
                            )}
                          </View>
                        </View>
                      ) : (
                        /* TAB 2: PRONÓSTICOS POR PARTIDO Y COMBIS */
                        <View>
                          {/* Banner AdMob */}
                          <View style={{ marginBottom: 16, alignItems: 'center' }}>
                            <AdBanner size="BANNER" />
                          </View>

                          <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                            Pronósticos por Partido
                          </Text>

                          {(() => {
                            // Agrupar TODOS los pronósticos (individuales y de combis) por matchId
                            const betsByMatch: Record<number, UserBet[]> = {};
                            leagueBets.forEach((bet) => {
                              if (!betsByMatch[bet.matchId]) {
                                betsByMatch[bet.matchId] = [];
                              }
                              betsByMatch[bet.matchId].push(bet);
                            });

                            return (
                              <>
                                {/* APUESTAS POR PARTIDO (incluye individuales y de combis) */}
                                {Object.entries(betsByMatch).map(([matchIdStr, bets]) => {
                                  const matchId = parseInt(matchIdStr);
                                  // Intentar obtener info de groupedBets primero, si no usar la primera apuesta
                                  const matchInfo = groupedBets.find((gb) => gb.matchId === matchId);
                                  const firstBet = bets[0];
                                  const isExpanded = expandedBets.has(matchId);
                                  
                                  return (
                                    <View key={matchId}>
                                      <TouchableOpacity
                                        onPress={() => toggleBetExpansion(matchId)}
                                        activeOpacity={0.7}
                                        style={{
                                          backgroundColor: '#1a2332',
                                          borderWidth: 1,
                                          borderColor: '#334155',
                                          borderRadius: 12,
                                          padding: 14,
                                          marginBottom: 12,
                                        }}
                                      >
                                        {/* Equipos del partido - usar matchInfo si existe, sino firstBet */}
                                        {(matchInfo || firstBet.homeTeam) && (
                                          <View style={{ marginBottom: 10 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                              {(matchInfo?.localCrest || firstBet.homeCrest) && (
                                                <Image 
                                                  source={{ uri: matchInfo?.localCrest || firstBet.homeCrest }} 
                                                  style={{ width: 24, height: 24, marginRight: 8 }} 
                                                  resizeMode="contain" 
                                                />
                                              )}
                                              <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 15 }}>
                                                {matchInfo?.local || firstBet.homeTeam}
                                              </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                              {(matchInfo?.visitanteCrest || firstBet.awayCrest) && (
                                                <Image 
                                                  source={{ uri: matchInfo?.visitanteCrest || firstBet.awayCrest }} 
                                                  style={{ width: 24, height: 24, marginRight: 8 }} 
                                                  resizeMode="contain" 
                                                />
                                              )}
                                              <Text style={{ color: '#e5e7eb', fontWeight: '700', fontSize: 15 }}>
                                                {matchInfo?.visitante || firstBet.awayTeam}
                                              </Text>
                                            </View>
                                            {matchInfo?.fecha && matchInfo?.hora && (
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

                                        {/* Resumen de apuestas contraído */}
                                        <View style={{ 
                                          paddingTop: 8, 
                                          borderTopWidth: 1, 
                                          borderTopColor: '#334155',
                                          flexDirection: 'row',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}>
                                          <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>
                                            {bets.length} apuesta{bets.length !== 1 ? 's' : ''} realizada{bets.length !== 1 ? 's' : ''}
                                          </Text>
                                          {isExpanded ? (
                                            <ChevronUpIcon size={20} color="#94a3b8" />
                                          ) : (
                                            <ChevronDownIcon size={20} color="#94a3b8" />
                                          )}
                                        </View>
                                      </TouchableOpacity>

                                      {/* Detalles expandidos de apuestas */}
                                      {isExpanded && (
                                        <View style={{ paddingLeft: 16, marginBottom: 12 }}>
                                              {bets.map((bet, idx) => {
                                            const betStatus = (bet as any).status;
                                            const isWon = betStatus === 'won';
                                            const isLost = betStatus === 'lost';
                                            const isPending = !betStatus || betStatus === 'pending';
                                            const isPartOfCombi = isCombiBet(bet);
                                            
                                            return (
                                              <View 
                                                key={bet.id} 
                                                style={{
                                                  backgroundColor: '#0f172a',
                                                  borderRadius: 6,
                                                  padding: 10,
                                                  marginBottom: idx < bets.length - 1 ? 8 : 0,
                                                  borderLeftWidth: 3,
                                                  borderLeftColor: isWon ? '#22c55e' : isLost ? '#ef4444' : '#f59e0b',
                                                }}
                                              >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={{ color: '#93c5fd', fontWeight: '700', fontSize: 13 }}>
                                                      {bet.userName || 'Jugador'}
                                                    </Text>
                                                    {isPartOfCombi && (
                                                      <View style={{
                                                        backgroundColor: '#1e3a8a',
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 2,
                                                        borderRadius: 4,
                                                      }}>
                                                        <Text style={{ color: '#93c5fd', fontSize: 9, fontWeight: '700' }}>COMBI</Text>
                                                      </View>
                                                    )}
                                                    {isWon && <CheckIcon size={14} color="#22c55e" />}
                                                    {isLost && <ErrorIcon size={14} color="#ef4444" />}
                                                    {isPending && <ClockIcon size={14} color="#f59e0b" />}
                                                  </View>
                                                  {!isPartOfCombi && (
                                                    <Text style={{ 
                                                      color: isWon ? '#22c55e' : isLost ? '#ef4444' : '#f59e0b', 
                                                      fontWeight: '800', 
                                                      fontSize: 14 
                                                    }}>
                                                      {bet.amount}M
                                                    </Text>
                                                  )}
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
                                                  {!isPartOfCombi && (
                                                    <>
                                                      {isWon ? (
                                                        <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>
                                                          Ganancia: +{bet.potentialWin}M
                                                        </Text>
                                                      ) : isLost ? (
                                                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>
                                                          Pérdida: -{bet.amount}M
                                                        </Text>
                                                      ) : (
                                                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>
                                                          Potencial: +{bet.potentialWin}M
                                                        </Text>
                                                      )}
                                                    </>
                                                  )}
                                                </View>
                                              </View>
                                            );
                                          })}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* MODO PRONÓSTICOS - Cuando la jornada está abierta */
                <>
                  <Text style={{ color: '#cbd5e1', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Pronósticos</Text>
                  
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
                        TICKETS
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>Disponibles:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '800' }}>{budget.available}</Text>
                          <TicketIcon size={20} color="#22c55e" />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>Usados esta jornada:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '700' }}>{budget.used}</Text>
                          <TicketIcon size={16} color="#64748b" />
                        </View>
                      </View>
                      <Text style={{ color: '#64748b', fontSize: 11, marginTop: 10, fontStyle: 'italic' }}>
                        1 ticket = 1 pronóstico simple o 1 combinada
                      </Text>
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
                        No hay pronósticos disponibles en este momento.
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

                          {/* Calcular si el pronóstico requiere anuncio y mostrar boton de desbloqueo */}
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
                            
                            // Si requiere anuncio y no está desbloqueada y no tiene pronóstico, ocultar opciones
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
                                    Desbloquea para ver las opciones de pronóstico
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
                                {/* Label y Ganancia Potencial */}
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
                                    borderColor: isBlocked ? '#4b5563' : '#22c55e',
                                  }}>
                                    <Text style={{ color: isBlocked ? '#64748b' : '#22c55e', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 }}>
                                      +{Math.round(50 * option.odd - 50)}M
                                    </Text>
                                  </View>
                                </View>

                                {/* Si el usuario ya apostÃ³ */}
                                {userBet && ligaId && isJornadaOpen && (() => {
                                  const combi = getCombiForBet(userBet.id);
                                  const isPartOfCombi = !!combi;
                                  
                                  return (
                                    <View style={{
                                      backgroundColor: isPartOfCombi ? '#1e1b3a' : '#1e293b',
                                      borderRadius: 8,
                                      padding: 12,
                                      marginBottom: 8,
                                      borderWidth: isPartOfCombi ? 2 : 0,
                                      borderColor: isPartOfCombi ? '#0892D0' : 'transparent',
                                    }}>
                                      {isPartOfCombi && (
                                        <View style={{
                                          backgroundColor: '#0892D0',
                                          borderRadius: 6,
                                          paddingHorizontal: 10,
                                          paddingVertical: 4,
                                          marginBottom: 8,
                                          alignSelf: 'flex-start',
                                        }}>
                                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                                            🔗 PARTE DE UNA COMBI
                                          </Text>
                                        </View>
                                      )}

                                      {/* Cabecera: label de la opción y botón eliminar (en la misma tarjeta) */}
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                                            {isPartOfCombi ? 'Pronosticado en combi' : 'Pronosticado'}
                                          </Text>
                                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }} numberOfLines={2}>
                                            {formatLabelWithType(userBet.betLabel, userBet.betType)}
                                          </Text>
                                        </View>

                                        {isJornadaOpen && (
                                          <TouchableOpacity
                                            onPress={() => handleDeleteBet(betKey, userBet.id)}
                                            disabled={savingBet === betKey}
                                            style={{
                                              backgroundColor: '#7f1d1d',
                                              paddingHorizontal: 12,
                                              paddingVertical: 10,
                                              borderRadius: 8,
                                              marginLeft: 12,
                                            }}
                                            accessibilityLabel="Eliminar pronóstico"
                                          >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                              <DeleteIcon size={18} color="#fecaca" />
                                              <Text style={{ color: '#fecaca', fontWeight: '700', marginLeft: 6 }}>Eliminar</Text>
                                            </View>
                                          </TouchableOpacity>
                                        )}
                                      </View>

                                      {/* Si es parte de una combi, mostramos la info compacta debajo; para apuestas simples con ticket no mostramos recuadro extra */}
                                      {isPartOfCombi && (
                                        <View style={{
                                          backgroundColor: '#2d2653',
                                          borderRadius: 6,
                                          padding: 8,
                                          marginBottom: 8,
                                        }}>
                                          <Text style={{ color: '#c4b5fd', fontSize: 11, fontWeight: '600' }}>
                                            Cuota combi: {combi.totalOdd.toFixed(2)} • {combi.selections.length} selecciones
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  );
                                })()}
                                {/* Sistema de tickets: 1 botón = 1 ticket */}
                                {!userBet && !isBlocked && ligaId && isJornadaOpen && (
                                  <TouchableOpacity
                                    onPress={() => handlePlaceBet(betKey, {
                                      matchId: b.matchId,
                                      homeTeam: b.local,
                                      awayTeam: b.visitante,
                                      homeCrest: b.localCrest,
                                      awayCrest: b.visitanteCrest,
                                      betType: b.type,
                                      betLabel: option.label,
                                      odd: option.odd
                                    })}
                                    disabled={savingBet === betKey || budget.available < 1}
                                    style={{
                                      backgroundColor: budget.available < 1 ? '#374151' : '#0892D0',
                                      paddingHorizontal: 16,
                                      paddingVertical: 12,
                                      borderRadius: 8,
                                      marginTop: 8,
                                      opacity: (savingBet === betKey || budget.available < 1) ? 0.6 : 1,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    {budget.available >= 1 && <TicketIcon size={18} color="#fff" />}
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                                      {budget.available < 1 ? 'Sin tickets' : 'Usar 1 ticket'}
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                {/* Botón Combinar - Siempre visible si no hay apuesta del usuario */}
                                {!userBet && ligaId && isJornadaOpen && (() => {
                                  const hasNormalBetInMatch = hasAnyBetInMatch(b.matchId);
                                  const isBlocked = isCombiPlaced || isOptionBlockedByCombi(b.matchId, b.type, option.label) || hasNormalBetInMatch;
                                  
                                  return (
                                    <TouchableOpacity
                                      onPress={() => {
                                        if (!isCombiPlaced && !hasNormalBetInMatch) {
                                          toggleCombiSelection({
                                            matchId: b.matchId,
                                            betType: b.type,
                                            betLabel: option.label,
                                            odd: option.odd,
                                            homeTeam: b.local,
                                            awayTeam: b.visitante,
                                          });
                                        }
                                      }}
                                      disabled={isBlocked}
                                      style={{
                                        backgroundColor: isInCombi(b.matchId, b.type, option.label) 
                                          ? '#0892D0' // Azul cuando está en la combi
                                          : (isOptionBlockedByCombi(b.matchId, b.type, option.label) || hasNormalBetInMatch)
                                            ? '#374151' // Gris si está bloqueada
                                            : !isPremium
                                              ? '#374151'  // Gris si no es premium
                                              : '#0b1220', // Tono oscuro de la app si es premium
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        marginTop: 8,
                                        borderWidth: isInCombi(b.matchId, b.type, option.label) ? 0 : 1,
                                        borderColor: '#0892D0',
                                        opacity: isBlocked ? 0.5 : 1,
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
                                        {isCombiPlaced
                                          ? 'Combi creada'
                                          : !isPremium 
                                            ? 'Combinar (Premium)' 
                                            : hasNormalBetInMatch
                                              ? 'Ya pronosticaste aquí'
                                              : isInCombi(b.matchId, b.type, option.label) 
                                                ? '✓ En combi' 
                                                : isOptionBlockedByCombi(b.matchId, b.type, option.label)
                                                  ? 'Ya hay una opcion en combi'
                                                  : combiSelections.length > 0
                                                    ? '+ Añadir a combi'
                                                    : 'Combinar'}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })()}

                                {/* En jornada cerrada: mostrar jugadores y cantidades que apostaron en esta opciÃ³n */}
                                {!isJornadaOpen && ligaId && (
                                  (() => {
                                    const betsForOption = leagueBets.filter((betItem) =>
                                      betItem.matchId === b.matchId &&
                                      normalizeType(betItem.betType) === normalizeType(b.type) &&
                                      normalizeLabel(betItem.betLabel) === normalizeLabel(option.label)
                                    );
                                    console.log('Filtering pronósticos for option:', {
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
                                          <View key={bf.id} style={{ paddingVertical: 4 }}>
                                            <Text style={{ color: '#e5e7eb' }} numberOfLines={3}>
                                              {(bf.userName || 'Jugador') + ' ha pronosticado ' + bf.amount + 'M en ' + bf.betType + ' - ' + formatLabelWithType(bf.betLabel, bf.betType)}
                                              {bf.combiId && (
                                                <Text style={{ color: '#0892D0', fontWeight: '800' }}> 🔗 COMBI</Text>
                                              )}
                                            </Text>
                                          </View>
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

                  {/* Mostrar combis de la liga cuando la jornada está cerrada */}
                  {jornadaStatus === 'closed' && ligaId && leagueCombis.length > 0 && (
                    <View style={{ marginTop: 24, marginBottom: 16 }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
                        🔗 PRONÓSTICOS COMBINADOS
                      </Text>
                      {leagueCombis.map((combi) => {
                        const combiStatus = combi.status === 'won' ? '✅ GANADA' : combi.status === 'lost' ? '❌ PERDIDA' : '⏳ PENDIENTE';
                        const statusColor = combi.status === 'won' ? '#22c55e' : combi.status === 'lost' ? '#ef4444' : '#f59e0b';
                        
                        return (
                          <View key={combi.id} style={{
                            backgroundColor: '#0f172a',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 2,
                            borderColor: combi.status === 'won' ? '#22c55e' : combi.status === 'lost' ? '#ef4444' : '#0892D0',
                          }}>
                            {/* Header de la combi */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <View>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                                  {combi.user?.name || 'Jugador'}
                                </Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                                  {combi.selections?.length || 0} selecciones
                                </Text>
                              </View>
                              <View style={{
                                backgroundColor: statusColor,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                              }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
                                  {combiStatus}
                                </Text>
                              </View>
                            </View>

                            {/* Listado de selecciones */}
                            {combi.selections?.map((selection: any, idx: number) => {
                              const selStatus = selection.status === 'won' ? '✅' : selection.status === 'lost' ? '❌' : '⏳';
                              return (
                                <View key={selection.id} style={{
                                  backgroundColor: '#1e293b',
                                  borderRadius: 8,
                                  padding: 10,
                                  marginBottom: idx < combi.selections.length - 1 ? 8 : 0,
                                  borderLeftWidth: 4,
                                  borderLeftColor: selection.status === 'won' ? '#22c55e' : selection.status === 'lost' ? '#ef4444' : '#f59e0b',
                                }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600' }}>
                                        {selection.homeTeam} vs {selection.awayTeam}
                                      </Text>
                                      <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                                        {selection.betType} - {selection.betLabel}
                                      </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                      <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '800' }}>
                                        +{Math.round(50 * selection.odd - 50)}M
                                      </Text>
                                      <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                        {selStatus}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}

                            {/* Footer con ganancia potencial total */}
                            <View style={{ 
                              marginTop: 12, 
                              paddingTop: 12, 
                              borderTopWidth: 1, 
                              borderTopColor: '#334155',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                            }}>
                              <View>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Ganancia Potencial</Text>
                                <Text style={{ color: '#22c55e', fontSize: 20, fontWeight: '800' }}>
                                  +{Math.round(50 * (combi.totalOdd || 1) - 50)}M
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Pronosticado</Text>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                                  {combi.amount}M
                                </Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Ganancia Pot.</Text>
                                <Text style={{ color: statusColor, fontSize: 16, fontWeight: '800' }}>
                                  {combi.potentialWin}M
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Indicador flotante de combi en construcción */}
            {combiSelections.length > 0 && jornadaStatus === 'open' && (
              <TouchableOpacity
                onPress={handleOpenCombiModal}
                style={{
                  position: 'absolute',
                  bottom: 80,
                  right: 16,
                  backgroundColor: '#1a2332',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#0892D0',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ marginRight: 8 }}>
                    <TrendingIcon size={22} color="#0892D0" />
                  </View>
                  <Text style={{ color: '#0892D0', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
                    {calculateCombiOdds().toFixed(2)}
                  </Text>
                </View>

                {/* Badge with number of selections positioned over the top-right border of the container */}
                <View style={{ position: 'absolute', top: -10, right: -10, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1, borderColor: '#fff' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{combiSelections.length}</Text>
                </View>
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
                  maxHeight: '85%',
                }}>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 16 }}>
                    {hasExistingCombi ? 'Combi' : 'Crear Pronóstico Combinado'}
                  </Text>

                  <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={true}>
                    {/* Lista de selecciones */}
                    <View style={{ marginBottom: 16 }}>
                    {combiSelections.map((sel, idx) => (
                      <View key={idx} style={{
                        position: 'relative',
                        backgroundColor: '#0f172a',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: '#334155',
                      }}>
                        {/* Trash icon to remove selection - área táctil mejorada */}
                        <TouchableOpacity
                          onPress={() => removeSelection(sel, idx)}
                          activeOpacity={0.7}
                          disabled={isCombiPlaced}
                          style={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 8, 
                            padding: 10,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 8,
                            opacity: isCombiPlaced ? 0.5 : 1,
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <DeleteIcon size={20} color="#ef4444" />
                        </TouchableOpacity>

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
                          <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '800' }}>
                            +{Math.round(50 * sel.odd - 50)}M
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Info de cuota total */}
                  <View style={{
                    backgroundColor: '#0f172a',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#334155',
                  }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                      Cuota total combinada
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
                      {calculateCombiOdds().toFixed(2)}
                    </Text>
                  </View>

                  {/* Ganancia potencial total */}
                  <View style={{
                    backgroundColor: '#0f172a',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    borderWidth: 2,
                    borderColor: '#22c55e',
                  }}>
                    <Text style={{ color: '#22c55e', fontSize: 12, marginBottom: 4 }}>
                      Ganancia potencial (50M apostados)
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>
                      +{Math.round(50 * calculateCombiOdds() - 50)}M
                    </Text>
                  </View>
                  </ScrollView>

                  {/* Botones */}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
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
                        Cerrar
                      </Text>
                    </TouchableOpacity>
                    
                    {hasExistingCombi ? (
                      // Botón Eliminar cuando ya existe una combi
                      <TouchableOpacity
                        onPress={handleDeleteCombi}
                        disabled={creatingCombi}
                        style={{
                          flex: 1,
                          backgroundColor: creatingCombi ? '#374151' : '#ef4444',
                          paddingVertical: 12,
                          borderRadius: 8,
                          opacity: creatingCombi ? 0.5 : 1,
                        }}
                      >
                        {creatingCombi ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                            Eliminar Combi
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      // Botón Crear cuando no existe combi
                      <TouchableOpacity
                        onPress={handleCreateCombi}
                        disabled={creatingCombi || combiSelections.length < 2}
                        style={{
                          flex: 1,
                          backgroundColor: creatingCombi ? '#374151' : '#0892D0',
                          paddingVertical: 12,
                          borderRadius: 8,
                          opacity: (creatingCombi || combiSelections.length < 2) ? 0.5 : 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        {creatingCombi ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                              Crear Combi
                            </Text>
                                                        <TicketIcon size={18} color="#fff" />

                          </>
                        )}
                      </TouchableOpacity>
                    )}
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
                    ligaName={ligaName}
                    division={division}
                    isPremium={isPremium}
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

            {/* Modal WebView de Upgrade a Premium */}
            <Modal
              visible={showUpgradeWebView}
              animationType="slide"
              onRequestClose={() => {
                CustomAlertManager.alert(
                  'Cancelar upgrade',
                  '¿Estás seguro de que quieres cancelar el upgrade?',
                  [
                    { text: 'No', onPress: () => {}, style: 'cancel' },
                    { 
                      text: 'Sí, cancelar', 
                      onPress: () => setShowUpgradeWebView(false),
                      style: 'destructive'
                    }
                  ],
                  { icon: 'alert', iconColor: '#f59e0b' }
                );
              }}
            >
              <View style={{ flex: 1, backgroundColor: '#000' }}>
                {/* Header */}
                <View style={{
                  paddingTop: Platform.OS === 'ios' ? 50 : 20,
                  paddingHorizontal: 16,
                  paddingBottom: 12,
                  backgroundColor: '#1f2937',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                    Actualizar a Premium
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      CustomAlertManager.alert(
                        'Cancelar upgrade',
                        '¿Estás seguro de que quieres cancelar el upgrade?',
                        [
                          { text: 'No', onPress: () => {}, style: 'cancel' },
                          { 
                            text: 'Sí, cancelar', 
                            onPress: () => setShowUpgradeWebView(false),
                            style: 'destructive'
                          }
                        ],
                        { icon: 'alert', iconColor: '#f59e0b' }
                      );
                    }}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600' }}>
                      Cerrar
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* WebView */}
                {upgradeCheckoutUrl && (
                  <WebView
                    source={{ uri: upgradeCheckoutUrl }}
                    style={{ flex: 1 }}
                    onNavigationStateChange={(navState) => {
                      handleUpgradePaymentResult(navState.url);
                    }}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#000'
                      }}>
                        <ActivityIndicator size="large" color="#0892D0" />
                        <Text style={{ color: '#fff', marginTop: 16 }}>
                          Cargando pasarela de pago...
                        </Text>
                      </View>
                    )}
                  />
                )}

                {processingUpgrade && (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <ActivityIndicator size="large" color="#0892D0" />
                    <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
                      Procesando upgrade...
                    </Text>
                  </View>
                )}
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





