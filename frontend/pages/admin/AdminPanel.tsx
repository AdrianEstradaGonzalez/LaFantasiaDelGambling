import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import EncryptedStorage from 'react-native-encrypted-storage';
import { JornadaService } from '../../services/JornadaService';
import { BetService } from '../../services/BetService';
import axios from 'axios';
import { ApiConfig } from '../../utils/apiConfig';
import { LigaService } from '../../services/LigaService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomAlertManager } from '../../components/CustomAlert';
import { 
  JerseyIcon, 
  CalendarIcon, 
  CheckCircleIcon, 
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  TrophyIcon,
  LockIcon,
  UnlockIcon
} from '../../components/VectorIcons';
import { Typography } from '../../styles/DesignSystem';

const AdminPanel: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [isClosingJornada, setIsClosingJornada] = useState(false);
  const [isOpeningJornada, setIsOpeningJornada] = useState(false);
  const [isEvaluatingBets, setIsEvaluatingBets] = useState(false);
  const [jornadaStatus, setJornadaStatus] = useState<'open' | 'closed' | null>(null);
  const [currentJornada, setCurrentJornada] = useState<number | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Cargar estado inicial al montar el componente
  useEffect(() => {
    const loadJornadaStatus = async () => {
      try {
        setIsLoadingStatus(true);
        console.log('📊 AdminPanel - Cargando estado de jornada...');
        
        // Obtener userId
        const userId = await EncryptedStorage.getItem('userId');
        if (!userId) {
          console.log('⚠️ AdminPanel - No hay userId disponible');
          setJornadaStatus(null);
          setCurrentJornada(null);
          return;
        }
        
        // Obtener las ligas del usuario para saber cuál consultar
        const ligas = await LigaService.obtenerLigasPorUsuario(userId);
        console.log('📊 AdminPanel - Ligas obtenidas:', ligas.length);
        
        if (ligas.length > 0) {
          // Consultar el estado de la primera liga (asumimos que todas están sincronizadas)
          const primeraLiga = ligas[0];
          console.log('📊 AdminPanel - Consultando estado de liga:', primeraLiga.name);
          
          const status = await JornadaService.getJornadaStatus(primeraLiga.id);
          console.log('📊 AdminPanel - Estado obtenido:', status.status);
          
          setJornadaStatus(status.status as 'open' | 'closed');
          setCurrentJornada(status.currentJornada);
        } else {
          console.log('⚠️ AdminPanel - No hay ligas disponibles');
          setJornadaStatus('open'); // Default a open si no hay ligas
          setCurrentJornada(null);
        }
      } catch (error) {
        console.error('❌ AdminPanel - Error cargando estado:', error);
        // En caso de error, dejar ambos botones habilitados
        setJornadaStatus(null);
        setCurrentJornada(null);
      } finally {
        setIsLoadingStatus(false);
        console.log('✅ AdminPanel - Estado de jornada cargado');
      }
    };

    loadJornadaStatus();
  }, []);

  const handleCerrarJornada = async () => {
    CustomAlertManager.alert(
      '🔒 Cerrar Jornada',
      `¿Estás seguro de que quieres cerrar la jornada actual para TODAS las ligas?\n\n` +
      `Esto ejecutará el siguiente proceso:\n\n` +
      `📊 EVALUACIÓN Y CÁLCULOS:\n` +
      `• Evaluará todas las apuestas con resultados reales\n` +
      `• Calculará puntos de plantillas\n` +
      `• Actualizará presupuestos (500M base + puntos + apuestas)\n` +
      `• Actualizará clasificación total\n\n` +
      `🗑️ LIMPIEZA:\n` +
      `• Vaciará todas las plantillas\n` +
      `• Eliminará opciones de apuestas antiguas\n\n` +
      `⏭️ AVANCE:\n` +
      `• Incrementará jornada en +1\n` +
      `• Desbloqueará modificaciones para nueva jornada\n\n` +
      `⚠️ Este proceso puede tardar varios minutos.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Cerrar Jornada',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClosingJornada(true);
              
              console.log('🚀 Iniciando cierre de jornada...');
              const result = await JornadaService.closeAllJornadas();
              console.log('📊 Resultado:', result);
              
              // Actualizar el estado de la jornada
              setJornadaStatus('open');
              
              CustomAlertManager.alert(
                '✅ Jornada Cerrada Exitosamente',
                `El proceso ha finalizado correctamente.\n\n` +
                `📊 RESUMEN GLOBAL:\n` +
                `• Ligas procesadas: ${result.leaguesProcessed}\n` +
                `• Apuestas evaluadas: ${result.totalEvaluations}\n` +
                `• Miembros actualizados: ${result.totalUpdatedMembers}\n` +
                `• Plantillas vaciadas: ${result.totalClearedSquads}\n\n` +
                `✅ DESBLOQUEADO:\n` +
                `• Modificar plantillas\n` +
                `• Hacer fichajes y ventas\n` +
                `• Realizar apuestas\n\n` +
                `🎮 Los usuarios ya pueden prepararse para la próxima jornada.`,
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              console.error('❌ Error cerrando jornada:', error);
              CustomAlertManager.alert(
                '❌ Error al Cerrar Jornada',
                error.message || 'No se pudo completar el proceso de cierre de jornada.\n\nRevisa la consola del servidor para más detalles.',
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'alert-circle', iconColor: '#ef4444' }
              );
            } finally {
              setIsClosingJornada(false);
            }
          },
        },
      ],
      { icon: 'alert', iconColor: '#f59e0b' }
    );
  };

  const handleEvaluarApuestas = async () => {
    try {
      // Obtener primera liga disponible
      const userId = await EncryptedStorage.getItem('userId');
      if (!userId) {
        throw new Error('No hay usuario autenticado');
      }
      
      const ligas = await LigaService.obtenerLigasPorUsuario(userId);
      if (ligas.length === 0) {
        throw new Error('No hay ligas disponibles');
      }

      const primeraLiga = ligas[0];

      CustomAlertManager.alert(
        '🎯 Evaluar Apuestas',
        `¿Evaluar todas las apuestas pendientes de la liga "${primeraLiga.name}"?\n\n` +
        `Esto hará lo siguiente:\n` +
        `📊 Consultará la API de Football para obtener resultados reales\n` +
        `✅ Marcará apuestas como ganadas o perdidas\n` +
        `💰 Guardará los resultados para futuros cálculos de presupuesto\n\n` +
        `Solo se evaluarán partidos que ya hayan terminado.`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {}
          },
          {
            text: 'Evaluar',
            style: 'default',
            onPress: async () => {
              try {
                setIsEvaluatingBets(true);
                
                const result = await BetService.evaluateBets(primeraLiga.id);
                
                CustomAlertManager.alert(
                  '✅ Evaluación Completada',
                  `📊 Total evaluadas: ${result.evaluated}\n` +
                  `✅ Ganadas: ${result.won}\n` +
                  `❌ Perdidas: ${result.lost}\n` +
                  `⏳ Pendientes: ${result.pending}`,
                  [{ text: 'OK', onPress: () => {}, style: 'default' }],
                  { icon: 'check-circle', iconColor: '#10b981' }
                );
              } catch (error: any) {
                CustomAlertManager.alert(
                  '❌ Error',
                  error.message || 'No se pudieron evaluar las apuestas',
                  [{ text: 'OK', onPress: () => {}, style: 'default' }],
                  { icon: 'alert-circle', iconColor: '#ef4444' }
                );
              } finally {
                setIsEvaluatingBets(false);
              }
            },
          },
        ],
        { icon: 'target', iconColor: '#0892D0' }
      );
    } catch (error: any) {
      CustomAlertManager.alert(
        '❌ Error',
        error.message || 'Error al preparar evaluación',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    }
  };

  const handleEvaluarTodasLasApuestas = async () => {
    CustomAlertManager.alert(
      '🌍 Evaluar TODAS las Apuestas',
      `¿Evaluar todas las apuestas pendientes de TODAS las ligas?\n\n` +
      `Esto hará lo siguiente:\n` +
      `📊 Consultará la API de Football para cada partido\n` +
      `✅ Marcará apuestas como ganadas o perdidas en todas las ligas\n` +
      `💰 Guardará los resultados para futuros cálculos de presupuesto\n` +
      `⏱️ Puede tardar varios segundos dependiendo de la cantidad de apuestas\n\n` +
      `Solo se evaluarán partidos que ya hayan terminado.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Evaluar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsEvaluatingBets(true);
              
              const result = await BetService.evaluateAllBets();
              
              // Construir mensaje con detalle por liga
              let detalleMsg = `📊 RESUMEN GLOBAL:\n`;
              detalleMsg += `Total evaluadas: ${result.totalEvaluated}\n`;
              detalleMsg += `✅ Ganadas: ${result.totalWon}\n`;
              detalleMsg += `❌ Perdidas: ${result.totalLost}\n`;
              detalleMsg += `⏳ Pendientes: ${result.totalPending}`;
              
              if (result.leagueResults && result.leagueResults.length > 0) {
                detalleMsg += `\n\n📋 DETALLE POR LIGA:\n`;
                result.leagueResults.forEach((league) => {
                  detalleMsg += `\n${league.leagueName}:\n`;
                  detalleMsg += `  ${league.evaluated} evaluadas (${league.won}✅ / ${league.lost}❌)\n`;
                });
              }
              
              CustomAlertManager.alert(
                '✅ Evaluación Global Completada',
                detalleMsg,
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              CustomAlertManager.alert(
                '❌ Error',
                error.message || 'No se pudieron evaluar todas las apuestas',
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'alert-circle', iconColor: '#ef4444' }
              );
            } finally {
              setIsEvaluatingBets(false);
            }
          },
        },
      ],
      { icon: 'globe', iconColor: '#0892D0' }
    );
  };

  const handleAbrirJornada = async () => {
    CustomAlertManager.alert(
      '🔓 Abrir Jornada',
      `¿Estás seguro de que quieres abrir la jornada actual para TODAS las ligas?\n\n` +
      `Esto hará lo siguiente:\n` +
      `🔒 Bloqueará las alineaciones actuales\n` +
      `🚫 Impedirá cambios en plantillas\n` +
      `🚫 Bloqueará fichajes y ventas\n` +
      `🚫 Bloqueará modificación de apuestas\n` +
      `📊 Comenzará el seguimiento en tiempo real\n\n` +
      `Esta acción afectará a TODAS las ligas.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Abrir Jornada',
          style: 'default',
          onPress: async () => {
            try {
              setIsOpeningJornada(true);
              
              const result = await JornadaService.openAllJornadas();
              
              // Actualizar el estado de la jornada a 'closed' (bloqueada)
              setJornadaStatus('closed');
              
              CustomAlertManager.alert(
                '✅ Jornada Abierta',
                `La jornada ha sido abierta exitosamente.\n\n` +
                `📊 Ligas procesadas: ${result.leaguesProcessed}\n\n` +
                `Los usuarios de todas las ligas ya NO pueden:\n` +
                `• Modificar sus plantillas\n` +
                `• Hacer fichajes y ventas\n` +
                `• Realizar y modificar apuestas\n\n` +
                `El seguimiento en tiempo real está activo.`,
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              CustomAlertManager.alert(
                '❌ Error',
                error.message || 'No se pudo abrir la jornada',
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'alert-circle', iconColor: '#ef4444' }
              );
            } finally {
              setIsOpeningJornada(false);
            }
          },
        },
      ],
      { icon: 'information', iconColor: '#0892D0' }
    );
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* TopNavBar estilo LigaTopNavBar */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#181818',
          borderBottomWidth: 0.5,
          borderBottomColor: '#333',
          paddingVertical: 10,
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 50,
        }}
      >
        {/* Botón de volver */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          <ChevronLeftIcon size={28} color="#0892D0" />
        </TouchableOpacity>

        {/* Título centrado */}
        <Text
          style={{
            color: '#fff',
            fontSize: Typography.sizes['2xl'],
            fontWeight: '700',
            textAlign: 'center',
            flex: 1,
          }}
          numberOfLines={1}
        >
          GESTIÓN{' '}
          <Text style={{ color: '#0892D0' }}>
            DREAMLEAGUE
          </Text>
        </Text>

        {/* Espacio a la derecha para balance visual */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: 100 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* Gestión de Usuarios */}
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('GestionUsuarios')}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ marginRight: 12 }}>
              <UsersIcon size={32} color="#0892D0" />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              Gestión de Usuarios
            </Text>
            <ChevronRightIcon size={24} color="#0ea5e9" />
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Ver y eliminar usuarios del sistema.
          </Text>
        </TouchableOpacity>

        {/* Gestión de Ligas */}
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('GestionLigas')}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ marginRight: 12 }}>
              <TrophyIcon size={32} color="#0892D0" />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              Gestión de Ligas
            </Text>
            <ChevronRightIcon size={24} color="#0ea5e9" />
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Ver y eliminar ligas del sistema.
          </Text>
        </TouchableOpacity>

        {/* Gestión de Jugadores */}
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('GestionJugadores')}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ marginRight: 12 }}>
              <JerseyIcon size={32} color="#0892D0" />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              Gestión de Jugadores
            </Text>
            <ChevronRightIcon size={24} color="#0ea5e9" />
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Edita precios y posiciones de todos los jugadores de La Liga.
          </Text>
        </TouchableOpacity>

        {/* Evaluar Apuestas */}
        <TouchableOpacity
          onPress={handleEvaluarApuestas}
          disabled={isEvaluatingBets}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
            opacity: isEvaluatingBets ? 0.6 : 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 32 }}>🎯</Text>
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              {isEvaluatingBets ? 'Evaluando Apuestas...' : 'Evaluar Apuestas'}
            </Text>
            {!isEvaluatingBets && <ChevronRightIcon size={24} color="#0ea5e9" />}
            {isEvaluatingBets && <ActivityIndicator color="#0892D0" size="small" />}
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Consulta la API de Football y marca las apuestas pendientes como ganadas o perdidas según los resultados reales (solo primera liga).
          </Text>
        </TouchableOpacity>

        {/* Evaluar TODAS las Apuestas */}
        <TouchableOpacity
          onPress={handleEvaluarTodasLasApuestas}
          disabled={isEvaluatingBets}
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
            opacity: isEvaluatingBets ? 0.6 : 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 32 }}>🌍</Text>
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              {isEvaluatingBets ? 'Evaluando Todo...' : 'Evaluar TODAS las Apuestas'}
            </Text>
            {!isEvaluatingBets && <ChevronRightIcon size={24} color="#0ea5e9" />}
            {isEvaluatingBets && <ActivityIndicator color="#0892D0" size="small" />}
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            Evalúa TODAS las apuestas pendientes de TODAS las ligas del sistema. Puede tardar varios segundos.
          </Text>
        </TouchableOpacity>

        {/* Cerrar Jornada */}
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ marginRight: 12 }}>
              <LockIcon size={32} color="#ef4444" />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              Cerrar Jornada
            </Text>
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              marginBottom: 12,
              lineHeight: 20,
            }}
          >
            Cierra la jornada actual para TODAS las ligas. Permitirá que los usuarios realicen apuestas y modifiquen sus plantillas para prepararse para la próxima jornada.
          </Text>

          {currentJornada != null && jornadaStatus === 'closed' && (
            <View style={{
              backgroundColor: '#451a03',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: '#f59e0b',
            }}>
              <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: 'bold' }}>
                📊 Jornada {currentJornada} → Se cerrará y avanzará a Jornada {currentJornada + 1}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCerrarJornada}
            disabled={isClosingJornada || isLoadingStatus || jornadaStatus === 'open'}
            style={{
              backgroundColor: isClosingJornada || isLoadingStatus || jornadaStatus === 'open' ? '#334155' : '#ef4444',
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isClosingJornada || isLoadingStatus || jornadaStatus === 'open' ? 0 : 0.3,
              shadowRadius: 8,
              elevation: isClosingJornada || jornadaStatus === 'closed' ? 0 : 4,
              opacity: jornadaStatus === 'closed' ? 0.5 : 1,
            }}
          >
            {isClosingJornada ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginLeft: 12,
                  }}
                >
                  Cerrando Jornada {currentJornada}...
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {isLoadingStatus ? 'Cargando...' : jornadaStatus === 'open' ? `Jornada ${currentJornada ?? ''} ya desbloqueada` : `Cerrar Jornada ${currentJornada ?? ''} (Desbloquear)`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Abrir Jornada */}
        <View
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#334155',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ marginRight: 12 }}>
              <UnlockIcon size={32} color="#10b981" />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                flex: 1,
              }}
            >
              Abrir Jornada
            </Text>
          </View>

          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              marginBottom: 12,
              lineHeight: 20,
            }}
          >
            Abre la jornada para TODAS las ligas. Bloqueará las plantillas y apuestas actuales para comenzar el seguimiento en tiempo real de la jornada.
          </Text>

          {currentJornada != null && jornadaStatus === 'open' && (
            <View style={{
              backgroundColor: '#022c22',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: '#10b981',
            }}>
              <Text style={{ color: '#6ee7b7', fontSize: 14, fontWeight: 'bold' }}>
                🔓 Jornada {currentJornada} → Se bloqueará 
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleAbrirJornada}
            disabled={isOpeningJornada || isLoadingStatus || jornadaStatus === 'closed'}
            style={{
              backgroundColor: isOpeningJornada || isLoadingStatus || jornadaStatus === 'closed' ? '#334155' : '#10b981',
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isOpeningJornada || isLoadingStatus || jornadaStatus === 'closed' ? 0 : 0.3,
              shadowRadius: 8,
              elevation: isOpeningJornada || isLoadingStatus || jornadaStatus === 'closed' ? 0 : 4,
              opacity: isLoadingStatus || jornadaStatus === 'closed' ? 0.5 : 1,
            }}
          >
            {isOpeningJornada ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginLeft: 12,
                  }}
                >
                  Abriendo Jornada {currentJornada}...
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {isLoadingStatus ? 'Cargando...' : jornadaStatus === 'closed' ? `Jornada ${currentJornada ?? ''} ya bloqueada` : `Abrir Jornada ${currentJornada ?? ''} (Bloquear)`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Advertencia */}
        <View
          style={{
            backgroundColor: '#451a03',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            borderLeftWidth: 4,
            borderLeftColor: '#f59e0b',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ marginRight: 12, marginTop: 2 }}>
              <AlertIcon size={20} color="#fbbf24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: '#fbbf24',
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 8,
                }}
              >
                Advertencia Importante
              </Text>
              <Text style={{ color: '#fcd34d', fontSize: 13, lineHeight: 18 }}>
                Esta acción afectará a todas las ligas y todos los usuarios del
                sistema. Asegúrate de ejecutarla solo cuando la jornada haya
                finalizado completamente.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default AdminPanel;
