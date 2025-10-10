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
      console.error('Error al obtener ligas del usuario:', error);
      setLigas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect inicial para cargar datos
  useEffect(() => {
    fetchLigasUsuario();

    const fetchMatches = async () => {
      try {
        const allMatches = await FootballService.getAllMatchesWithJornadas();
        setPartidos(allMatches);

        const jornadasDisponibles = Array.from(
          new Set(allMatches.map((p) => p.jornada))
        ).sort((a, b) => a - b);
        setJornadas(jornadasDisponibles);

        const nextJornada =
          allMatches.find((p) => p.notStarted)?.jornada ||
          jornadasDisponibles[0];
        setJornadaActual(nextJornada);
      } catch (error) {
        console.error('Error al obtener partidos:', error);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
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
    <LinearGradient
      colors={['#101011ff', '#101011ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 140 }}
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
          {ligas.map((liga) => (
            <TouchableOpacity
              key={liga.id}
              style={styles.ligaCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Clasificacion', { ligaId: liga.id, ligaName: liga.nombre })}
            >
              <Text style={styles.ligaName}>{liga.nombre}</Text>
            </TouchableOpacity>
          ))}
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

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#18395a" />
            </View>
          ) : (
            <View>
              {partidosJornada.length > 0 ? (
                partidosJornada.slice(0, 10).map((partido) => (
                  <View key={partido.id} style={styles.tableRow}>
                    <Image
                      source={{ uri: partido.localCrest }}
                      style={{ width: 40, height: 40, marginRight: 8 }}
                    />
                    <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>
                      {partido.local}
                    </Text>

                    <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>
                      {partido.finished
                        ? partido.resultado
                        : `${partido.fecha} ${partido.hora}`}
                    </Text>

                    <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>
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
                  <Text style={{ textAlign: 'center', color: '#ccc' }}>
                    No hay partidos para esta jornada.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barra de navegación fija */}
      <BottomNavBar />
    </LinearGradient>
  );
};
