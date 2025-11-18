import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, Animated, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BetService, Bet as UserBet } from '../../services/BetService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { MenuIcon, CalendarIcon, ClockIcon, FileTextIcon, ChartBarIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon, ErrorIcon, TrendingIcon } from '../../components/VectorIcons';
import { DrawerMenu } from '../../components/DrawerMenu';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FootballService from '../../services/FutbolService';
import { SafeLayout } from '../../components/SafeLayout';
import formatLabelWithType from '../../utils/formatBetLabel';
import { AdBanner } from '../../components/AdBanner';

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

  // Estados para tabs (Balances / Apuestas)
  const [activeTab, setActiveTab] = useState(0); // 0 = Balances, 1 = Apuestas
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Estados para expansión de usuarios en Balances
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Estados para expansión de apuestas en Apuestas
  const [expandedBets, setExpandedBets] = useState<Set<number>>(new Set());

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

  // Handlers para tabs
  // Pressing a tab scrolls to the corresponding page
  const handleTabPress = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * (SCREEN_WIDTH - 32),
      animated: true,
    });
  };

  // When scroll ends, update activeTab based on scroll position
  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (SCREEN_WIDTH - 32));
    setActiveTab(index);
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

  // Handlers para expansión de apuestas
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
                {/* Tabs: Balances / Apuestas */}
                <View 
                  style={{
                    flexDirection: 'row',
                    position: 'relative',
                    marginBottom: 20,
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
                      Apuestas
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
                          translateX: scrollX.interpolate({
                            inputRange: [0, SCREEN_WIDTH - 32],
                            outputRange: [0, (SCREEN_WIDTH - 32) / 2],
                          }),
                        },
                      ],
                    }}
                  />
                </View>

                {/* Content - ScrollView horizontal con las dos tabs */}
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                  onMomentumScrollEnd={handleScrollEnd}
                  style={{ flex: 1 }}
                >
                  {/* TAB 1: BALANCES */}
                  <View style={{ width: SCREEN_WIDTH - 32 }}>
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
                            {leagueBets.length} apuesta{leagueBets.length !== 1 ? 's' : ''} realizadas
                          </Text>
                        </View>
                      </View>

                      {/* Usuarios con sus balances */}
                      {(() => {
                        // DEBUG: Log para ver todas las apuestas
                        console.log('🔍 HistorialApuestas TAB 1 - Total apuestas:', leagueBets.length);
                        console.log('🔍 HistorialApuestas TAB 1 - Apuestas:', leagueBets.map(b => ({
                          id: b.id,
                          combiId: b.combiId,
                          userName: b.userName,
                          betLabel: b.betLabel,
                          hasCombiId: !!b.combiId
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
                        
                        console.log('🔍 HistorialApuestas TAB 1 - Combis agrupadas:', Object.keys(combisByCombiId).length);
                        console.log('🔍 HistorialApuestas TAB 1 - combisByCombiId:', combisByCombiId);
                        
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
                          // Contar ganadas/perdidas si el backend provee status
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

                        // Ordenar por balance descendente
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
                                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                                {data.bets.length} apuesta{data.bets.length !== 1 ? 's' : ''} - {userCombis.length} combi{userCombis.length !== 1 ? 's' : ''}
                                              </Text>
                                      {/* combi count already shown in summary; badge removed to avoid duplication */}
                                      {data.wonBets > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                          <Text style={{ color: '#94a3b8', fontSize: 13 }}>({data.wonBets}</Text>
                                          <CheckIcon size={12} color="#22c55e" />
                                        </View>
                                      )}
                                      {data.lostBets > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                          <Text style={{ color: '#94a3b8', fontSize: 13 }}>{data.lostBets}</Text>
                                          <ErrorIcon size={12} color="#ef4444" />
                                          <Text style={{ color: '#94a3b8', fontSize: 13 }}>)</Text>
                                        </View>
                                      )}
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
                                                        [{bet.homeTeam || ''} vs {bet.awayTeam || ''}]
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
                                          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                            [{bet.homeTeam || ''} vs {bet.awayTeam || ''}]
                                          </Text>
                                          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
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
                                            <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                          </View>
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
                                          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                            [{bet.homeTeam || ''} vs {bet.awayTeam || ''}]
                                          </Text>
                                          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                            {bet.betType}
                                          </Text>
                                          <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '600' }}>
                                            {formatLabelWithType(bet.betLabel, bet.betType)}
                                          </Text>
                                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                            <Text style={{ color: '#64748b', fontSize: 11 }}>
                                              Cuota: {bet.odd.toFixed(2)}
                                            </Text>
                                            <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>
                                              -{bet.amount}M
                                            </Text>
                                            <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                          </View>
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
                                          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
                                            [{bet.homeTeam || ''} vs {bet.awayTeam || ''}]
                                          </Text>
                                          <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 2 }}>
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
                                            <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 8 }} />
                                          </View>
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
                      })()}
                    </View>
                  </View>

                  {/* TAB 2: APUESTAS POR PARTIDO */}
                  <View style={{ width: SCREEN_WIDTH - 32 }}>
                    {/* Banner AdMob */}
                    <View style={{ marginBottom: 16, alignItems: 'center' }}>
                      <AdBanner size="BANNER" />
                    </View>

                    <Text style={{ color: '#cbd5e1', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                      Apuestas por Partido
                    </Text>

                    {(() => {
                      // Agrupar TODAS las apuestas (individuales y de combis) por matchId
                      const betsByMatch: Record<number, UserBet[]> = {};
                      leagueBets.forEach((bet) => {
                        if (!betsByMatch[bet.matchId]) {
                          betsByMatch[bet.matchId] = [];
                        }
                        betsByMatch[bet.matchId].push(bet);
                      });

                      return (
                        <>
                          {/* APUESTAS POR PARTIDO (incluye todas: individuales + de combis) */}
                          {Object.entries(betsByMatch).map(([matchIdStr, bets]) => {
                            const matchId = parseInt(matchIdStr);
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
                                  <View style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#e2e8f0', fontSize: 15, fontWeight: '700' }}>
                                      {firstBet.homeTeam} vs {firstBet.awayTeam}
                                    </Text>
                                  </View>

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                      {bets.length} apuesta{bets.length !== 1 ? 's' : ''}
                                    </Text>
                                    {isExpanded ? (
                                      <ChevronUpIcon size={20} color="#94a3b8" />
                                    ) : (
                                      <ChevronDownIcon size={20} color="#94a3b8" />
                                    )}
                                  </View>
                                </TouchableOpacity>

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
                                            backgroundColor: '#0a1420',
                                            borderRadius: 8,
                                            padding: 12,
                                            marginBottom: idx < bets.length - 1 ? 10 : 0,
                                            borderLeftWidth: 3,
                                            borderLeftColor: isWon ? '#22c55e' : isLost ? '#ef4444' : '#f59e0b',
                                          }}
                                        >
                                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <View style={{ flex: 1 }}>
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '700' }}>
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
                                              </View>
                                              <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>
                                                {bet.betType}
                                              </Text>
                                              <Text style={{ color: '#e5e7eb', fontSize: 13, fontWeight: '600' }}>
                                                {formatLabelWithType(bet.betLabel, bet.betType)}
                                              </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                              {isWon && <CheckIcon size={16} color="#22c55e" />}
                                              {isLost && <ErrorIcon size={16} color="#ef4444" />}
                                              {isPending && <ClockIcon size={16} color="#f59e0b" />}
                                            </View>
                                          </View>
                                          
                                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                                            <Text style={{ color: '#64748b', fontSize: 11 }}>
                                              Cuota: {bet.odd.toFixed(2)}
                                            </Text>
                                            {!isPartOfCombi && (
                                              <Text style={{ color: '#e5e7eb', fontSize: 12, fontWeight: '700' }}>
                                                {bet.amount}M
                                              </Text>
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
                </ScrollView>
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
