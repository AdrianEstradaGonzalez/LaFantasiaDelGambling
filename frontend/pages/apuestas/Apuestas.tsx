import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FootballService from '../../services/FutbolService';
import { BetService, BettingBudget, Bet as UserBet } from '../../services/BetService';
import { useRoute, RouteProp } from '@react-navigation/native';
import LigaNavBar from '../navBar/LigaNavBar';
import LoadingScreen from '../../components/LoadingScreen';
import { EditIcon, DeleteIcon, CheckIcon, CheckCircleIcon, ErrorIcon, CalendarIcon, ClockIcon, MenuIcon } from '../../components/VectorIcons';

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

export const Apuestas: React.FC = () => {
  const route = useRoute<ApuestasRouteProps>();
  const ligaId = route.params?.ligaId;
  const ligaName = route.params?.ligaName;
  const [loading, setLoading] = useState(true);
  const [groupedBets, setGroupedBets] = useState<GroupedBet[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [jornada, setJornada] = useState<number | null>(null);
  const [budget, setBudget] = useState<BettingBudget>({ total: 250, used: 0, available: 250 });
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [editingBet, setEditingBet] = useState<string | null>(null);
  const [savingBet, setSavingBet] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const apuestas = await FootballService.getApuestasProximaJornada({ ligaId, ligaName });
        
        // Obtener presupuesto y apuestas del usuario si hay ligaId
        let budgetData = { total: 250, used: 0, available: 250 };
        let userBetsData: UserBet[] = [];
        if (ligaId) {
          try {
            budgetData = await BetService.getBettingBudget(ligaId);
            userBetsData = await BetService.getUserBets(ligaId);
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

  const handleBetAmountChange = (key: string, value: string) => {
    // Solo permitir números
    if (value === '' || /^\d+$/.test(value)) {
      // Limitar a máximo 50M
      const numValue = parseInt(value, 10);
      if (value === '' || numValue <= 50) {
        setBetAmounts(prev => ({ ...prev, [key]: value }));
      }
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

  const handlePlaceBet = async (matchId: number, betType: string, betLabel: string, odd: number, key: string) => {
    if (!ligaId) {
      showError('No hay liga seleccionada');
      return;
    }

    const amountStr = betAmounts[key] || '0';
    const amount = parseInt(amountStr, 10);

    if (amount <= 0) {
      showError('Debes ingresar una cantidad mayor a 0');
      return;
    }

    if (amount > 50) {
      showError('El máximo por apuesta es 50M');
      return;
    }

    if (amount > budget.available) {
      showError(`Presupuesto insuficiente. Disponible: ${budget.available}M`);
      return;
    }

    // Verificar si ya existe una apuesta en este grupo (matchId + betType)
    const existingBetInGroup = userBets.find(
      (bet) => bet.matchId === matchId && bet.betType === betType
    );

    if (existingBetInGroup) {
      showError('Ya tienes una apuesta en este grupo. Debes eliminarla primero para apostar a otra opción.');
      return;
    }

    try {
      setSavingBet(key);
      await BetService.placeBet({
        leagueId: ligaId,
        matchId,
        betType,
        betLabel,
        odd,
        amount,
      });

      // Recargar presupuesto y apuestas
      const [newBudget, newUserBets] = await Promise.all([
        BetService.getBettingBudget(ligaId),
        BetService.getUserBets(ligaId),
      ]);
      setBudget(newBudget);
      setUserBets(newUserBets);

      // Limpiar input
      setBetAmounts(prev => {
        const newAmounts = { ...prev };
        delete newAmounts[key];
        return newAmounts;
      });

      showSuccess('Apuesta realizada correctamente');
    } catch (error: any) {
      showError(error.message || 'Error al realizar la apuesta');
    } finally {
      setSavingBet(null);
    }
  };

  const handleUpdateBet = async (betId: string, newAmount: number) => {
    if (!ligaId) return;

    if (newAmount > 50) {
      showError('El máximo por apuesta es 50M');
      return;
    }

    try {
      setSavingBet(betId);
      await BetService.updateBetAmount(ligaId, betId, newAmount);

      // Recargar presupuesto y apuestas
      const [newBudget, newUserBets] = await Promise.all([
        BetService.getBettingBudget(ligaId),
        BetService.getUserBets(ligaId),
      ]);
      setBudget(newBudget);
      setUserBets(newUserBets);
      setEditingBet(null);
      setBetAmounts(prev => {
        const newAmounts = { ...prev };
        delete newAmounts[`edit-${betId}`];
        return newAmounts;
      });

      showSuccess('Apuesta actualizada correctamente');
    } catch (error: any) {
      showError(error.message || 'Error al actualizar la apuesta');
    } finally {
      setSavingBet(null);
    }
  };

  const handleDeleteBet = async (betId: string) => {
    if (!ligaId) return;

    try {
      setSavingBet(betId);
      await BetService.deleteBet(ligaId, betId);

      // Recargar presupuesto y apuestas
      const [newBudget, newUserBets] = await Promise.all([
        BetService.getBettingBudget(ligaId),
        BetService.getUserBets(ligaId),
      ]);
      setBudget(newBudget);
      setUserBets(newUserBets);

      showSuccess('Apuesta eliminada correctamente');
    } catch (error: any) {
      showError(error.message || 'Error al eliminar la apuesta');
    } finally {
      setSavingBet(null);
    }
  };

  const calculatePotentialWin = (amount: string, odd: number): number => {
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) return 0;
    return Math.round(num * odd);
  };

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

  function setIsDrawerOpen(arg0: boolean): void {
    throw new Error('Function not implemented.');
  }

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

                  {/* TODAS las opciones */}
                  {b.options.map((option, optionIndex) => {
                    const betKey = `${b.matchId}-${b.type}-${optionIndex}`;
                    const amount = betAmounts[betKey] || '';
                    const potentialWin = calculatePotentialWin(amount, option.odd);
                    
                    // Verificar si el usuario ya apostó en esta opción
                    const userBet = getUserBetForOption(b.matchId, b.type, option.label);
                    const isEditing = editingBet === userBet?.id;
                    const editAmount = betAmounts[`edit-${userBet?.id}`] || '';
                    
                    // Verificar si hay alguna apuesta en este grupo
                    const groupHasBet = hasAnyBetInGroup(b.matchId, b.type);
                    const isBlocked = groupHasBet && !userBet; // Bloqueada si hay apuesta pero no es esta opción
                    
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

                        {/* Si el usuario ya apostó - Mostrar info de apuesta */}
                        {userBet && ligaId && (
                          <View style={{
                            backgroundColor: '#1e293b',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 8,
                          }}>
                            {!isEditing ? (
                              <>
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
                                
                                {/* Botones de editar/eliminar */}
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setEditingBet(userBet.id);
                                      setBetAmounts(prev => ({ ...prev, [`edit-${userBet.id}`]: userBet.amount.toString() }));
                                    }}
                                    style={{
                                      flex: 1,
                                      backgroundColor: '#0f766e',
                                      borderRadius: 6,
                                      paddingVertical: 10,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                      borderWidth: 1,
                                      borderColor: '#14b8a6',
                                    }}
                                  >
                                    <EditIcon size={16} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                                      Editar
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteBet(userBet.id)}
                                    disabled={savingBet === userBet.id}
                                    style={{
                                      flex: 1,
                                      backgroundColor: savingBet === userBet.id ? '#64748b' : '#ef4444',
                                      borderRadius: 6,
                                      paddingVertical: 10,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: 6,
                                    }}
                                  >
                                    {savingBet === userBet.id ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <>
                                        <DeleteIcon size={16} color="#fff" />
                                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                                          Eliminar
                                        </Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </>
                            ) : (
                              <>
                                {/* Modo edición */}
                                <Text style={{ color: '#93c5fd', fontSize: 12, marginBottom: 8, fontWeight: '600' }}>
                                  EDITAR APUESTA
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                  <View style={{ flex: 1 }}>
                                    <TextInput
                                      style={{
                                        backgroundColor: '#0f172a',
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        color: '#fff',
                                        fontSize: 16,
                                        fontWeight: '600',
                                      }}
                                      placeholder="Nueva cantidad (máx 50M)"
                                      placeholderTextColor="#64748b"
                                      value={editAmount}
                                      onChangeText={(value) => {
                                        if (value === '' || /^\d+$/.test(value)) {
                                          const numValue = parseInt(value, 10);
                                          if (value === '' || numValue <= 50) {
                                            setBetAmounts(prev => ({ ...prev, [`edit-${userBet.id}`]: value }));
                                          }
                                        }
                                      }}
                                      keyboardType="numeric"
                                      editable={savingBet !== userBet.id}
                                    />
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => {
                                      const newAmount = parseInt(editAmount, 10);
                                      if (newAmount > 0 && newAmount <= 50) {
                                        handleUpdateBet(userBet.id, newAmount);
                                      } else if (newAmount > 50) {
                                        showError('El máximo por apuesta es 50M');
                                      } else {
                                        showError('Debes ingresar una cantidad mayor a 0');
                                      }
                                    }}
                                    disabled={savingBet === userBet.id || !editAmount || parseInt(editAmount) <= 0 || parseInt(editAmount) > 50}
                                    style={{
                                      backgroundColor: savingBet === userBet.id ? '#64748b' : '#0f766e',
                                      borderRadius: 8,
                                      paddingHorizontal: 16,
                                      paddingVertical: 10,
                                      opacity: (!editAmount || parseInt(editAmount) <= 0 || parseInt(editAmount) > 50) ? 0.5 : 1,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      borderWidth: 1,
                                      borderColor: savingBet === userBet.id ? '#64748b' : '#14b8a6',
                                    }}
                                  >
                                    {savingBet === userBet.id ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <CheckIcon size={22} color="#fff" />
                                    )}
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                  onPress={() => {
                                    setEditingBet(null);
                                    setBetAmounts(prev => {
                                      const newAmounts = { ...prev };
                                      delete newAmounts[`edit-${userBet.id}`];
                                      return newAmounts;
                                    });
                                  }}
                                  style={{
                                    backgroundColor: '#334155',
                                    borderRadius: 6,
                                    paddingVertical: 6,
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 12 }}>
                                    Cancelar
                                  </Text>
                                </TouchableOpacity>
                                {editAmount && parseInt(editAmount) > 0 && (
                                  <View style={{ marginTop: 8, alignItems: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                                      Nueva ganancia potencial:{' '}
                                      <Text style={{ color: '#10b981', fontWeight: '700' }}>
                                        +{calculatePotentialWin(editAmount, option.odd)}M
                                      </Text>
                                    </Text>
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        )}

                        {/* Input y botón de apostar (solo si NO hay apuesta y hay ligaId) */}
                        {!userBet && ligaId && (
                          <>
                            {isBlocked ? (
                              <View style={{
                                backgroundColor: '#1e293b',
                                borderRadius: 8,
                                padding: 12,
                                alignItems: 'center',
                              }}>
                                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                                  No puedes apostar aquí. Solo se permite una opción por grupo.
                                </Text>
                              </View>
                            ) : (
                              <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <View style={{ flex: 1 }}>
                                    <TextInput
                                      style={{
                                        backgroundColor: '#1a2332',
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                        borderRadius: 8,
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        color: '#fff',
                                        fontSize: 16,
                                        fontWeight: '600',
                                      }}
                                      placeholder="Cantidad (máx 50M)"
                                      placeholderTextColor="#64748b"
                                      value={amount}
                                      onChangeText={(value) => handleBetAmountChange(betKey, value)}
                                      keyboardType="numeric"
                                      editable={savingBet !== betKey}
                                    />
                                  </View>
                                  <TouchableOpacity
                                    onPress={() => handlePlaceBet(b.matchId, b.type, option.label, option.odd, betKey)}
                                    disabled={savingBet === betKey || !amount || parseInt(amount) <= 0}
                                    style={{
                                      backgroundColor: savingBet === betKey ? '#64748b' : '#0f766e',
                                      borderRadius: 8,
                                      paddingHorizontal: 20,
                                      paddingVertical: 10,
                                      opacity: (!amount || parseInt(amount) <= 0) ? 0.5 : 1,
                                      minWidth: 100,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderWidth: 1,
                                      borderColor: savingBet === betKey ? '#64748b' : '#14b8a6',
                                    }}
                                  >
                                    {savingBet === betKey ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                        Apostar
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                </View>

                                {/* Ganancia potencial */}
                                {potentialWin > 0 && (
                                  <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                      Ganancia potencial:{' '}
                                      <Text style={{ color: '#10b981', fontWeight: '700' }}>
                                        +{potentialWin}M
                                      </Text>
                                    </Text>
                                  </View>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
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
