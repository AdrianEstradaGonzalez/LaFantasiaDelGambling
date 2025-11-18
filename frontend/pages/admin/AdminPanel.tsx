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
import axios from 'axios';
import { ApiConfig } from '../../utils/apiConfig';
import { LigaService } from '../../services/LigaService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomAlertManager } from '../../components/CustomAlert';
import { SafeLayout } from '../../components/SafeLayout';
import LoadingScreen from '../../components/LoadingScreen';
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
  UnlockIcon,
  InjuryIcon
} from '../../components/VectorIcons';
import { Typography } from '../../styles/DesignSystem';

const AdminPanel: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [isClosingJornada, setIsClosingJornada] = useState(false);
  const [isOpeningJornada, setIsOpeningJornada] = useState(false);
  const [jornadaStatus, setJornadaStatus] = useState<'open' | 'closed' | null>(null);
  const [currentJornada, setCurrentJornada] = useState<number | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSyncingPlayers, setIsSyncingPlayers] = useState(false);

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

  // Helper: after a long-running server operation that may timeout client-side,
  // poll the server for all user's leagues to verify the jornada status.
  const verifyGlobalJornadaStatus = async (expectedStatus: 'open' | 'closed', attempts = 6, intervalMs = 2000) => {
    try {
      // Obtener ID del usuario autenticado
      const currentUserId = await EncryptedStorage.getItem('userId');
      if (!currentUserId) return false;

      for (let i = 0; i < attempts; i++) {
        try {
          const leagues = await LigaService.obtenerLigasPorUsuario(currentUserId);
          if (!leagues || leagues.length === 0) return false;

          // Consultar estado de todas las ligas del usuario
          const statuses = await Promise.all(leagues.map(async (l: any) => {
            try {
              const s = await JornadaService.getJornadaStatus(l.id);
              return s.status as 'open' | 'closed';
            } catch (e) {
              return null;
            }
          }));

          // Si todas las ligas disponibles tienen el estado esperado, devolver true
          const valid = statuses.every(st => st === expectedStatus);
          if (valid) return true;
        } catch (err) {

        }

        // Esperar antes del siguiente intento
        await new Promise(res => setTimeout(res, intervalMs));
      }

      return false;
    } catch (error) {
      console.warn('verifyGlobalJornadaStatus error', error);
      return false;
    }
  };

  const handleCerrarJornada = async () => {
    CustomAlertManager.alert(
      '🔒 Cerrar Cambios',
      `¿Estás seguro de que quieres bloquear los cambios para TODAS las ligas?\n\n` +
      `Esto hará lo siguiente:\n` +
      `� BLOQUEO:\n` +
      `• Bloqueará modificaciones de plantillas\n` +
      `• Bloqueará fichajes y ventas\n` +
      `• Bloqueará nuevas apuestas\n\n` +
      `� INICIO DE JORNADA:\n` +
      `• Comenzará el seguimiento en tiempo real\n` +
      `• Los puntos se actualizarán automáticamente\n\n` +
      `⚠️ Los usuarios NO podrán hacer cambios hasta que cierres la jornada.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Cerrar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClosingJornada(true);
              
              console.log('🚀 Bloqueando cambios...');
              const result = await JornadaService.openAllJornadas();
              console.log('📊 Resultado:', result);
              
              // ✨ CORREGIDO: open → closed (cambios bloqueados)
              setJornadaStatus('closed');
              
              CustomAlertManager.alert(
                '✅ Cambios Bloqueados',
                `Plantillas y apuestas bloqueadas.\n\n` +
                `Ligas: ${result.leaguesProcessed}\n\n` +
                `🔒 Bloqueado: Plantillas, fichajes y apuestas\n` +
                `📊 Puntos en tiempo real activos`,
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    navigation.navigate('Home');
                  }, 
                  style: 'default' 
                }],
                { icon: 'lock-closed', iconColor: '#ef4444' }
              );
            } catch (error: any) {
              console.error('❌ Error bloqueando cambios:', error);
              // Es posible que la operación tardase y el cliente timeout, verificar estado real en servidor
              const verified = await verifyGlobalJornadaStatus('closed');
              if (verified) {
                console.log('✅ Operación completada en servidor a pesar del error de cliente. Ocultando error.');
                setJornadaStatus('closed');
                CustomAlertManager.alert(
                  '✅ Cambios Bloqueados',
                  `Plantillas y apuestas bloqueadas.\n\nLa operación fue completada en el servidor.`,
                  [{ text: 'OK', onPress: () => { navigation.navigate('Home'); }, style: 'default' }],
                  { icon: 'lock-closed', iconColor: '#ef4444' }
                );
              } else {
                CustomAlertManager.alert(
                  '❌ Error al Bloquear',
                  error.message || 'No se pudo completar el bloqueo.\n\nRevisa la consola del servidor para más detalles.',
                  [{ text: 'OK', onPress: () => {}, style: 'default' }],
                  { icon: 'alert-circle', iconColor: '#ef4444' }
                );
              }
            } finally {
              setIsClosingJornada(false);
            }
          },
        },
      ],
      { icon: 'alert', iconColor: '#f59e0b' }
    );
  };

  const handleAbrirJornada = async () => {
    CustomAlertManager.alert(
      '🔓 Abrir Cambios',
      `¿Cerrar jornada y abrir cambios?\n\n` +
      `Proceso:\n` +
      `• Evaluar apuestas y plantillas\n` +
      `• Actualizar presupuestos\n` +
      `• Vaciar plantillas\n` +
      `• Avanzar a próxima jornada\n\n` +
      `⚠️ Puede tardar varios minutos`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Abrir Cambios',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsOpeningJornada(true);
              
              console.log('🚀 Iniciando cierre de jornada...');
              const result = await JornadaService.closeAllJornadas();
              console.log('📊 Resultado:', result);
              
              // ✨ CORREGIDO: closed → open (cambios permitidos)
              setJornadaStatus('open');
              
              CustomAlertManager.alert(
                '✅ Cambios Abiertos',
                `Proceso completado.\n\n` +
                `Ligas: ${result.leaguesProcessed}\n` +
                `Apuestas: ${result.totalEvaluations}\n` +
                `Miembros: ${result.totalUpdatedMembers}\n` +
                `Plantillas: ${result.totalClearedSquads}\n\n` +
                `✅ Usuarios pueden preparar nueva jornada`,
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    navigation.navigate('Home');
                  }, 
                  style: 'default' 
                }],
                { icon: 'check-circle', iconColor: '#10b981' }
              );
            } catch (error: any) {
              console.error('❌ Error abriendo cambios:', error);
              CustomAlertManager.alert(
                '❌ Error al Abrir Cambios',
                error.message || 'No se pudo completar el proceso de cierre de jornada.\n\nRevisa la consola del servidor para más detalles.',
                [{ text: 'OK', onPress: () => {}, style: 'default' }],
                { icon: 'alert-circle', iconColor: '#ef4444' }
              );
            } finally {
              setIsOpeningJornada(false);
            }
          },
        },
      ],
      { icon: 'alert', iconColor: '#f59e0b' }
    );
  };

  return (
    <SafeLayout backgroundColor="#0f172a">
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
            fontSize: Typography.sizes['xl'],
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
          onPress={() => (navigation as any).navigate('SeleccionDivision')}
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
            Edita precios, posiciones y equipos de jugadores de Primera y Segunda División.
          </Text>
        </TouchableOpacity>
        {/* Bloquear Cambios (antes "Cerrar Jornada") */}
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
              Cerrar Cambios
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
            Bloquea las plantillas y apuestas para TODAS las ligas. Comenzará el seguimiento en tiempo real de la jornada.
          </Text>

          {currentJornada != null && jornadaStatus === 'open' && (
            <View style={{
              backgroundColor: '#451a03',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: '#f59e0b',
            }}>
              <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: 'bold' }}>
                � Jornada {currentJornada} → Se bloqueará para cambios
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCerrarJornada}
            disabled={isClosingJornada || isLoadingStatus || jornadaStatus === 'closed'}
            style={{
              backgroundColor: isClosingJornada || isLoadingStatus || jornadaStatus === 'closed' ? '#334155' : '#ef4444',
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isClosingJornada || isLoadingStatus || jornadaStatus === 'closed' ? 0 : 0.3,
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
                  Bloqueando Jornada {currentJornada}...
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
                {isLoadingStatus ? 'Cargando...' : jornadaStatus === 'closed' ? `Jornada ${currentJornada ?? ''} ya bloqueada` : `Bloquear Jornada ${currentJornada ?? ''}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Cerrar Jornada (antes "Abrir Jornada") */}
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
              Abrir Cambios
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
            Cierra la jornada actual para TODAS las ligas. Evaluará apuestas, calculará puntos y permitirá que los usuarios realicen cambios para la próxima jornada.
          </Text>

          {currentJornada != null && jornadaStatus === 'closed' && (
            <View style={{
              backgroundColor: '#022c22',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: '#10b981',
            }}>
              <Text style={{ color: '#6ee7b7', fontSize: 14, fontWeight: 'bold' }}>
                � Jornada {currentJornada} → Se cerrará y avanzará a Jornada {currentJornada + 1}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleAbrirJornada}
            disabled={isOpeningJornada || isLoadingStatus || jornadaStatus === 'open'}
            style={{
              backgroundColor: isOpeningJornada || isLoadingStatus || jornadaStatus === 'open' ? '#334155' : '#10b981',
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isOpeningJornada || isLoadingStatus || jornadaStatus === 'open' ? 0 : 0.3,
              shadowRadius: 8,
              elevation: isOpeningJornada || isLoadingStatus || jornadaStatus === 'open' ? 0 : 4,
              opacity: isLoadingStatus || jornadaStatus === 'open' ? 0.5 : 1,
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
                  Abriendo Cambios (Jornada {currentJornada})...
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
                {isLoadingStatus ? 'Cargando...' : jornadaStatus === 'open' ? `Cambios ya permitidos (J${currentJornada ?? ''})` : `Abrir Cambios (Jornada ${currentJornada ?? ''})`}
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
    </SafeLayout>
  );
};

export default AdminPanel;
