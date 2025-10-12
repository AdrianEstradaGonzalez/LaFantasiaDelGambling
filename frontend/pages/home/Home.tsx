import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { HomeStyles as styles } from '../../styles/HomeStyles';
import LinearGradient from 'react-native-linear-gradient';
import FootballService, { type Partido } from '../../services/FutbolService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import LoadingScreen from '../../components/LoadingScreen';

// 🧩 Importa la barra de navegación
import BottomNavBar from '../navBar/BottomNavBar';
import { LigaService } from '../../services/LigaService';
import EncryptedStorage from 'react-native-encrypted-storage';

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

  const scrollRef = useRef<ScrollView>(null);
  const jornadasScrollRef = useRef<ScrollView>(null);


  // Función para cargar ligas (separada para reutilizar)
  const fetchLigasUsuario = useCallback(async () => {
    try {
      setLoading(true);

      // 🔍 DEBUG: Ver todos los datos almacenados
      const allStoredData = {
        userId: await EncryptedStorage.getItem('userId'),
        accessToken: await EncryptedStorage.getItem('accessToken'),
        refreshToken: await EncryptedStorage.getItem('refreshToken'),
        session: await EncryptedStorage.getItem('session'),
        token: await EncryptedStorage.getItem('token'), // por si quedó del registro anterior
      };
      console.log('🔍 Home.tsx - Datos almacenados:', allStoredData);

      // 1) intenta leer userId directo
      let userId = await EncryptedStorage.getItem('userId');
      console.log('🔍 userId directo:', userId);

      // 2) fallback: session
      if (!userId) {
        const session = await EncryptedStorage.getItem('session');
        console.log('🔍 session encontrada:', session);
        if (session) {
          const { user } = JSON.parse(session);
          userId = user?.id ?? null;
          console.log('🔍 userId desde session:', userId);
        }
      }

      if (!userId) {
        console.warn('❌ No hay userId; redirige a Login si aplica');
        setLigas([]);
        return;
      }

      console.log('✅ UserId encontrado:', userId);

      // 🔹 endpoint público por userId
      const ligasUsuario = await LigaService.obtenerLigasPorUsuario(userId);

      const ligasFormateadas: Liga[] = ligasUsuario.map((liga: any) => ({
        id: liga.id,
        nombre: liga.name,
      }));

      setLigas(ligasFormateadas);
    } catch (error) {
      console.warn('Error al obtener ligas del usuario:', error);
      // Show user-friendly error message but don't break the app
      setLigas([]);
      // You could show a toast or error message here if you have a toast system
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect inicial para cargar datos
  useEffect(() => {
    fetchLigasUsuario();

    const fetchMatches = async () => {
  try {
    setLoadingPartidos(true); // 👈 solo marcamos loading de partidos
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
      if (nextJornada != null) setJornadaActual(nextJornada);
    } else if (!jornadasDisponibles.includes(jornadaActual)) {
      const nextJornada = upcoming ?? fallback;
      if (nextJornada != null) setJornadaActual(nextJornada);
    }
  } catch (error) {
    console.warn('Error al obtener partidos:', error);
  } finally {
    setLoadingPartidos(false); // 👈 desactivamos solo el spinner de partidos
  }
};

    fetchMatches();
  }, [fetchLigasUsuario]);



  // useFocusEffect para refrescar cuando se regresa de CrearLiga
  useFocusEffect(
    useCallback(() => {
      // Si viene con parámetro de refresh, recargar ligas
      if (route.params?.refreshLigas) {
        console.log('🔄 Refrescando ligas por parámetro de navegación');
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

      jornadasScrollRef.current.scrollTo({
        x: Math.max(0, offset),
        animated: true,
      });
    },
    [jornadas]
  );

  useEffect(() => {
    if (jornadaActual && jornadas.length > 0) {
      scrollToJornada(jornadaActual);
    }
  }, [jornadaActual, jornadas, scrollToJornada]);

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
    <LinearGradient colors={['#181818ff', '#181818ff']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }}>
      {(loading || loadingPartidos) && (
        <LoadingScreen />
      )}
      {!loading && !loadingPartidos && (
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Ligas</Text>
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
      )}

      {/* Barra de navegación fija */}
      <BottomNavBar />
    </LinearGradient>
  );
};
