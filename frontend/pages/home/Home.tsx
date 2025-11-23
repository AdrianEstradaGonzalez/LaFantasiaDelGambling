import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
} from 'react-native';
import { HomeStyles as styles } from '../../styles/HomeStyles';
import LinearGradient from 'react-native-linear-gradient';
import FootballService, { type Partido } from '../../services/FutbolService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';
import { LigaService } from '../../services/LigaService';
import EncryptedStorage from 'react-native-encrypted-storage';
import { LoginService } from '../../services/LoginService';
import { MenuIcon, ShieldIcon, TrophyIcon } from '../../components/VectorIcons';
import { DrawerMenu } from '../../components/DrawerMenu';
import { SafeLayout } from '../../components/SafeLayout';
import { AdBanner } from '../../components/AdBanner';

type Liga = { id: string; nombre: string; division?: string; isPremium?: boolean };
const { height } = Dimensions.get('window');

type HomeProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: RouteProp<any, any>;
};

export const Home = ({ navigation, route }: HomeProps) => {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jornadas, setJornadas] = useState<number[]>([]);
  const [jornadaActual, setJornadaActual] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPartidos, setLoadingPartidos] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [ligasLoadError, setLigasLoadError] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);
  const jornadasScrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(-300)).current; // Empieza fuera de la pantalla a la izquierda
  const isMountedRef = useRef(true);
  const isLoadingLigasRef = useRef(false);

  // Animar apertura/cierre del drawer
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

  // Función para cargar ligas (separada para reutilizar)
  const fetchLigasUsuario = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    
    // Prevenir llamadas simultáneas
    if (isLoadingLigasRef.current) {
      if (__DEV__) {
        console.log('⚠️  Ya hay una carga de ligas en proceso, ignorando llamada duplicada');
      }
      return;
    }
    
    isLoadingLigasRef.current = true;
    
    try {
      setLoading(true);
      setLigasLoadError(false);
      if (retryCount > 0) {
        setIsRetrying(true);
      }
      
      if (__DEV__) {
        console.log(`🔄 Iniciando carga de ligas (intento ${retryCount + 1})`);
      }

      // 🔍 DEBUG: Ver todos los datos almacenados (solo en desarrollo)
      if (__DEV__) {
        const allStoredData = {
          userId: await EncryptedStorage.getItem('userId'),
          accessToken: await EncryptedStorage.getItem('accessToken'),
          refreshToken: await EncryptedStorage.getItem('refreshToken'),
          session: await EncryptedStorage.getItem('session'),
          token: await EncryptedStorage.getItem('token'), // por si quedó del registro anterior
        };
        console.log('🔍 Home.tsx - Datos almacenados:', allStoredData);
      }

      // Verificar primero que hay un token válido
      const accessToken = await EncryptedStorage.getItem('accessToken');
      if (!accessToken) {
        if (__DEV__) {
          console.warn('❌ No hay accessToken - usuario no autenticado');
        }
        setLigas([]);
        setLoading(false);
        // Opcional: redirigir a login si es necesario
        // navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      // 1) intenta leer userId directo
      let userId = await EncryptedStorage.getItem('userId');
      if (__DEV__) {
        console.log('🔍 userId directo:', userId);
      }

      // 2) fallback: session
      if (!userId) {
        const session = await EncryptedStorage.getItem('session');
        if (__DEV__) {
          console.log('🔍 session encontrada:', session);
        }
        if (session) {
          try {
            const { user } = JSON.parse(session);
            userId = user?.id ?? null;
            if (userId && __DEV__) {
              console.log('🔍 userId desde session:', userId);
              // Guardar para próximas veces
              await EncryptedStorage.setItem('userId', userId);
            }
          } catch (parseError) {
            if (__DEV__) {
              console.error('❌ Error parseando session:', parseError);
            }
          }
        }
      }

      if (!userId) {
        if (__DEV__) {
          console.warn('❌ No hay userId; redirige a Login si aplica');
        }
        setLigas([]);
        setLoading(false);
        return;
      }

      if (__DEV__) {
        console.log('✅ UserId encontrado:', userId);
      }

      // 🔹 endpoint público por userId
      const ligasUsuario = await LigaService.obtenerLigasPorUsuario(userId);

      // Verificar que la respuesta sea un array
      if (!Array.isArray(ligasUsuario)) {
        throw new Error('Respuesta inválida del servidor: no es un array');
      }

      const ligasFormateadas: Liga[] = ligasUsuario.map((liga: any) => ({
        id: liga.id,
        nombre: liga.name,
        division: liga.division || 'primera',
        isPremium: liga.isPremium || false,
      }));

      // Ordenar para que DreamLeague aparezca primero
      const ligasOrdenadas = ligasFormateadas.sort((a, b) => {
        if (a.nombre === 'DreamLeague') return -1;
        if (b.nombre === 'DreamLeague') return 1;
        return 0;
      });

      // Solo actualizar estado si el componente sigue montado
      if (!isMountedRef.current) {
        if (__DEV__) {
          console.log('⚠️  Componente desmontado, cancelando actualización de estado');
        }
        return;
      }
      
      setLigas(ligasOrdenadas);
      setLoading(false); // ✅ Solo aquí se desactiva el loading después de cargar las ligas
      setLigasLoadError(false); // Limpiar error si hubo éxito
      setIsRetrying(false);
      isLoadingLigasRef.current = false;
      
      if (__DEV__) {
        console.log(`✅ ${ligasOrdenadas.length} ligas cargadas correctamente`);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Error al obtener ligas del usuario:', error);
        console.error('Error details:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        });
      }
      
      // Reintentar en caso de error de red
      if (retryCount < MAX_RETRIES && 
          (error?.message?.includes('Network') || 
           error?.message?.includes('timeout') ||
           error?.message?.includes('fetch') ||
           error?.message?.includes('conexión'))) {
        if (__DEV__) {
          console.log(`🔄 Reintentando carga de ligas (${retryCount + 1}/${MAX_RETRIES})...`);
        }
        // Esperar 1.5 segundos antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 1500));
        return fetchLigasUsuario(retryCount + 1);
      }
      
      // Si falló después de reintentos, marcar error silenciosamente
      if (isMountedRef.current) {
        setLigasLoadError(true);
        setLigas([]);
        setLoading(false);
        setIsRetrying(false);
      }
    } finally {
      // Asegurar que el flag se libera SIEMPRE
      isLoadingLigasRef.current = false;
      
      // Timeout de seguridad: si después de 500ms loading sigue en true, forzar a false
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current && loading) {
            if (__DEV__) {
              console.warn('⚠️  Timeout de seguridad: forzando loading = false');
            }
            setLoading(false);
            setIsRetrying(false);
          }
        }, 500);
      }
    }
  }, [loading]);

  // useEffect inicial para cargar datos
  useEffect(() => {
    isMountedRef.current = true;
    
    // Verificar si el usuario es admin
    LoginService.isAdmin().then(setIsAdmin);
    
    // Timeout de seguridad: si después de 5 segundos aún está loading, algo falló
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current && loading && ligas.length === 0) {
        if (__DEV__) {
          console.warn('⚠️  Timeout de seguridad alcanzado: loading aún en true después de 5s');
        }
        setLoading(false);
        setLigasLoadError(true);
      }
    }, 5000);
    
    fetchLigasUsuario().finally(() => {
      clearTimeout(safetyTimeout);
    });

    const fetchMatches = async () => {
      try {
        setLoadingPartidos(true);
        const allMatches = await FootballService.getAllMatchesCached();
        setPartidos(allMatches);

        const jornadasDisponibles = Array.from(
          new Set(allMatches.map((p) => p.jornada))
        )
          .filter((j) => j != null)
          .sort((a, b) => a - b);
        setJornadas(jornadasDisponibles);

        // 🔹 Determinar jornada por defecto
        const upcoming = allMatches.find((p) => p.notStarted)?.jornada;
        const fallback = jornadasDisponibles[0];

        if (jornadaActual === 1) {
          const nextJornada = upcoming ?? fallback;
          if (nextJornada != null) {
            setJornadaActual(nextJornada);
            // Centrar el scroll después de un breve delay
            setTimeout(() => {
              scrollToJornada(nextJornada);
            }, 500);
          }
        } else if (!jornadasDisponibles.includes(jornadaActual)) {
          const nextJornada = upcoming ?? fallback;
          if (nextJornada != null) {
            setJornadaActual(nextJornada);
            // Centrar el scroll después de un breve delay
            setTimeout(() => {
              scrollToJornada(nextJornada);
            }, 500);
          }
        }
        setLoadingPartidos(false);
      } catch (error) {
        if (__DEV__) {
          console.warn('Error al obtener partidos:', error);
        }
        setLoadingPartidos(false);
      }
    };

    fetchMatches();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLigasUsuario]);



  // useFocusEffect para refrescar cuando se regresa de CrearLiga
  useFocusEffect(
    useCallback(() => {
      // Si viene con parámetro de refresh, recargar ligas
      if (route.params?.refreshLigas) {
        if (__DEV__) {
          console.log('🔄 Refrescando ligas por parámetro de navegación');
        }
        fetchLigasUsuario();
        // Limpiar el parámetro para evitar refresh innecesarios
        navigation.setParams({ refreshLigas: undefined });
      }
    }, [route.params, fetchLigasUsuario, navigation])
  );

  const partidosJornada = partidos.filter((p) => p.jornada === jornadaActual);

  const scrollToJornada = useCallback(
    (jornada: number) => {
      if (!jornadasScrollRef.current || jornadas.length === 0) return;

      const index = jornadas.indexOf(jornada);
      if (index === -1) return;

      const itemWidth = 70; // ancho estimado del botón + margen
      const screenWidth = Dimensions.get('window').width;
      const offset = index * itemWidth - screenWidth / 2 + itemWidth / 2;

      // Asegurar que no sea negativo y que no exceda el contenido
      const maxScrollX = (jornadas.length * itemWidth) - screenWidth + 24; // 24 para padding
      const finalOffset = Math.max(0, Math.min(offset, maxScrollX));

      jornadasScrollRef.current.scrollTo({
        x: finalOffset,
        animated: true,
      });
    },
    [jornadas]
  );

  useEffect(() => {
    if (jornadaActual && jornadas.length > 0) {
      // Pequeño delay para asegurar que el ScrollView esté renderizado
      setTimeout(() => {
        scrollToJornada(jornadaActual);
      }, 300);
    }
  }, [jornadaActual, jornadas, scrollToJornada]);

  // useEffect adicional para centrar cuando se carga por primera vez
  useEffect(() => {
    if (!loading && !loadingPartidos && jornadaActual && jornadas.length > 0 && jornadaActual !== 1) {
      // Delay más largo para asegurar que todo esté renderizado
      setTimeout(() => {
        scrollToJornada(jornadaActual);
      }, 800);
    }
  }, [loading, loadingPartidos, jornadaActual, jornadas, scrollToJornada]);

  const jornadaAnterior = () => {
    setJornadaActual((prev) => {
      const actualIndex = jornadas.indexOf(prev);
      if (actualIndex > 0) return jornadas[actualIndex - 1];
      return prev;
    });
  };

  const jornadaSiguiente = () => {
    setJornadaActual((prev) => {
      const actualIndex = jornadas.indexOf(prev);
      if (actualIndex < jornadas.length - 1) return jornadas[actualIndex + 1];
      return prev;
    });
  };

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
        {(loading || loadingPartidos) && (
          <LoadingScreen />
        )}
        {!loading && !loadingPartidos && (
        <>
          {/* Icono Drawer arriba absoluto */}
          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              top: 10, 
              left: 10,
              zIndex: 100,
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
            backgroundColor: '#181818ff',
            borderRadius: 24,
          }}
        >
          <MenuIcon size={28} color="#ffffff" />
        </TouchableOpacity>

        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={{ paddingBottom: ligas.length > 0 ? 120 : 100 }}
        >
          {/* Header con título y botón, en una línea más abajo */}
          <View style={[styles.header, { marginTop: 10 }]}> 
            <Text style={[styles.headerTitle, { flex: 1 }]}>Mis Ligas</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CrearLiga')}
            >
              <Text style={styles.createButtonText}>Crear Liga</Text>
            </TouchableOpacity>
          </View>

        {/* Ligas */}
        <View style={styles.ligasList}>
            {ligas.length > 0 ? (
            ligas.map((liga, idx) => {
              const isDreamLeague = liga.nombre === 'DreamLeague';
              const accentColor = isDreamLeague ? '#3b82f6' : (liga.division === 'segunda' ? '#10b981' : liga.division === 'premier' ? '#8b5cf6' : '#3b82f6');
              
              return (
              <React.Fragment key={liga.id}>
              <TouchableOpacity
                style={[styles.ligaCard, isDreamLeague && {
                  borderWidth: 2,
                  borderColor: '#3b82f6',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 10,
                  marginBottom: 16,
                  transform: [{ scale: 1.02 }]
                }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MiPlantilla', { ligaId: liga.id, ligaName: liga.nombre, division: liga.division, isPremium: isDreamLeague ? true : liga.isPremium })}
              >
                {/* Fondo con gradiente sutil */}
                <LinearGradient
                  colors={isDreamLeague ? ['#1e3a8a', '#1e40af'] : ['#1c2635ff', '#1d2841ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 16,
                  }}
                />
                
                {/* Badge DreamLeague */}
                {isDreamLeague && (
                  <View style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: '#fbbf24',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    shadowColor: '#fbbf24',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                    elevation: 5,
                    borderWidth: 2,
                    borderColor: '#fcd34d',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <TrophyIcon size={14} color="#1f2937" />
                    <Text style={{ 
                      color: '#1f2937', 
                      fontSize: 10, 
                      fontWeight: '900',
                      letterSpacing: 0.5
                    }}>
                      LIGA GLOBAL
                    </Text>
                  </View>
                )}
                
                {/* Barra lateral de color */}
                <View style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: isDreamLeague ? 8 : 6,
                  backgroundColor: accentColor,
                  borderTopLeftRadius: 16,
                  borderBottomLeftRadius: 16,
                }} />
                
                {/* Brillo sutil en el borde */}
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                }} />
                
                {/* Contenido */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  width: '100%',
                  paddingVertical: 4,
                  paddingLeft: 12,
                  backgroundColor: 'transparent',
                }}>
                  {/* Icono de escudo */}
                  <View style={{
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}>
                    <ShieldIcon size={34} color={accentColor} />
                  </View>
                  
                  {/* Nombre de la liga */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: 18,
                        letterSpacing: 0.3,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {liga.nombre}
                    </Text>
                    <Text
                      style={{
                        color: '#94a3b8',
                        fontSize: 12,
                        fontWeight: '600',
                        letterSpacing: 0.2,
                      }}
                    >
                      {liga.division === 'segunda' ? 'Segunda División Española' : liga.division === 'premier' ? 'Premier League' : 'Primera División Española'}
                    </Text>
                    {liga.isPremium && !isDreamLeague && (
                      <View style={{
                        backgroundColor: '#fbbf24',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginTop: 4,
                        alignSelf: 'flex-start',
                      }}>
                        <Text style={{
                          color: '#000',
                          fontSize: 9,
                          fontWeight: '900',
                          letterSpacing: 0.5,
                        }}>
                          PREMIUM
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Flecha indicadora */}
                  <View style={{
                    marginRight: 8,
                    marginLeft: 8,
                  }}>
                    <Text style={{ color: accentColor, fontSize: 24, fontWeight: '600' }}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Insertar banner entre 1ª y 2ª liga */}
              {idx === 0 && ligas.length > 1 && (
                <View style={{ marginVertical: 12, paddingHorizontal: 16 }}>
                  <AdBanner visible={true} size="BANNER" />
                </View>
              )}
              </React.Fragment>
              );
            })
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              {ligasLoadError ? (
                <>
                  <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 12, fontSize: 15, fontWeight: '600' }}>
                    No se pudieron cargar tus ligas
                  </Text>
                  <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
                    Verifica tu conexión a internet
                  </Text>
                  <TouchableOpacity
                    onPress={() => fetchLigasUsuario()}
                    disabled={isRetrying}
                    style={{
                      backgroundColor: '#3b82f6',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 8,
                      opacity: isRetrying ? 0.6 : 1,
                    }}
                  >
                    {isRetrying ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={{ color: '#ffffff', fontWeight: '600' }}>Reintentando...</Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#ffffff', fontWeight: '600' }}>Reintentar</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={{ color: '#cbd5e1', textAlign: 'center', marginBottom: 8 }}>
                  No participas en ninguna liga. Crea una nueva liga o únete a una existente para empezar a competir con amigos.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Banner de anuncio entre ligas y partidos */}
        <AdBanner visible={true} size="BANNER" />

        {/* Jornadas */}
        <View style={styles.calendarContainer}>
          <ScrollView
            ref={jornadasScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.jornadasScroll}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          >
            {jornadas.map((j) => (
              <TouchableOpacity
                key={j}
                style={[
                  styles.jornadaPill,
                  jornadaActual === j && styles.jornadaActive,
                ]}
                onPress={() => setJornadaActual(j)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.jornadaText,
                    jornadaActual === j && styles.jornadaTextActive,
                  ]}
                >
                  J {j}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tabla de partidos */}
        <View style={styles.tableContainer}>
          <View
            style={[
              styles.tableHeader,
              {
                flexDirection: 'row',
                justifyContent: 'space-between',
              },
            ]}
          >
            <TouchableOpacity onPress={jornadaAnterior} disabled={loading}>
              <Text style={[styles.tableHeaderText, { fontSize: 26 }]}>{'<'}</Text>
            </TouchableOpacity>

            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
            >
              Jornada {jornadaActual}
            </Text>

            <TouchableOpacity onPress={jornadaSiguiente} disabled={loading}>
              <Text style={[styles.tableHeaderText, { fontSize: 26 }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          {
            <View>
              {partidosJornada.length > 0 ? (
                partidosJornada.slice(0, 10).map((partido) => (
                  <View key={partido.id} style={styles.tableRow}>
                    <Image
                      source={{ uri: partido.localCrest }}
                      style={{ width: 40, height: 40, marginRight: 8 }}
                    />
                    <Text
                      style={styles.tableTeamName}
                    >
                      {partido.local}
                    </Text>

                    <View style={{ flex: 3, alignItems: 'center', justifyContent: 'center' }}>
                      {partido.finished ? (
                        <Text style={[styles.tableCell, { textAlign: 'center' }]}>
                          {partido.resultado}
                        </Text>
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={[styles.tableCell, { textAlign: 'center', fontSize: 13 }]}>
                            {partido.fecha}
                          </Text>
                          <Text style={[styles.tableCell, { textAlign: 'center', fontSize: 12, color: '#94a3b8' }]}>
                            {partido.hora}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={styles.tableTeamName}
                    >
                      {partido.visitante}
                    </Text>
                    <Image
                      source={{ uri: partido.visitanteCrest }}
                      style={{ width: 40, height: 40, marginLeft: 8 }}
                    />
                  </View>
                ))
              ) : (
                <View style={{ padding: 20 }}>
                  <Text style={{ textAlign: 'center', color: '#cbd5e1' }}>
                    No hay partidos para esta jornada.
                  </Text>
                </View>
              )}
            </View>
          }
        </View>
      </ScrollView>

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

      </>
      )}
      </LinearGradient>
    </SafeLayout>
  );
};
