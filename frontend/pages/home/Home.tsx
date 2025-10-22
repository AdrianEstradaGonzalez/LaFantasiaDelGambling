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
import { MenuIcon } from '../../components/VectorIcons';
import { DrawerMenu } from '../../components/DrawerMenu';
import { SafeLayout } from '../../components/SafeLayout';
import LigaNavBar from '../navBar/LigaNavBar';

type Liga = { id: string; nombre: string };
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

  const scrollRef = useRef<ScrollView>(null);
  const jornadasScrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(-300)).current; // Empieza fuera de la pantalla a la izquierda

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
  const fetchLigasUsuario = useCallback(async () => {
    try {
      setLoading(true);

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
          const { user } = JSON.parse(session);
          userId = user?.id ?? null;
          if (__DEV__) {
            console.log('🔍 userId desde session:', userId);
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

      const ligasFormateadas: Liga[] = ligasUsuario.map((liga: any) => ({
        id: liga.id,
        nombre: liga.name,
      }));

      setLigas(ligasFormateadas);
      setLoading(false); // ✅ Solo aquí se desactiva el loading después de cargar las ligas
    } catch (error) {
      if (__DEV__) {
        console.warn('Error al obtener ligas del usuario:', error);
      }
      // Si hay error, mostrar array vacío pero quitar loading
      setLigas([]);
      setLoading(false);
    }
  }, []);

  // useEffect inicial para cargar datos
  useEffect(() => {
    // Verificar si el usuario es admin
    LoginService.isAdmin().then(setIsAdmin);
    
    fetchLigasUsuario();

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
            ligas.map((liga) => (
              <TouchableOpacity
                key={liga.id}
                style={styles.ligaCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Clasificacion', { ligaId: liga.id, ligaName: liga.nombre })}
              >
                <Text
                  style={styles.ligaName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {liga.nombre}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#cbd5e1', textAlign: 'center', marginBottom: 8 }}>
                No participas en ninguna liga. Crea una nueva liga o únete a una existente para empezar a competir con amigos.
              </Text>
            </View>
          )}
        </View>

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

      {/* Barra de navegación inferior si hay ligas */}
      {ligas.length > 0 && (
        <LigaNavBar ligaId={ligas[0].id} ligaName={ligas[0].nombre} />
      )}
      </>
      )}
      </LinearGradient>
    </SafeLayout>
  );
};
