import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { HomeStyles as styles } from '../../styles/HomeStyles';
import { FootballService, Partido } from '../../services/FutbolService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

type Liga = { id: string; nombre: string };
const { height } = Dimensions.get('window');

type HomeProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const Home = ({ navigation }: HomeProps) => {
  const [ligas, setLigas] = useState<Liga[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jornadas, setJornadas] = useState<number[]>([]);
  const [jornadaActual, setJornadaActual] = useState<number>(1);

  useEffect(() => {
    // Simular ligas del usuario
    setLigas([
      { id: '1', nombre: 'Fantasy League 1' },
      { id: '2', nombre: 'Mi Liga VIP' },
      { id: '3', nombre: 'Liga de Amigos' },
    ]);

    const fetchMatches = async () => {
      const allMatches = await FootballService.getAllMatchesWithJornadas('87');
      setPartidos(allMatches);

      // Calcular jornadas disponibles
      const jornadasDisponibles = Array.from(
        new Set(allMatches.map((p) => p.jornada))
      );
      setJornadas(jornadasDisponibles);

      // Seleccionar la próxima jornada no iniciada por defecto
      const nextJornada = allMatches.find((p) => p.notStarted)?.jornada || 1;
      setJornadaActual(nextJornada);
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 30000); // refrescar cada 30s
    return () => clearInterval(interval);
  }, []);

  // Filtrar partidos de la jornada actual
  const partidosJornada = partidos.filter((p) => p.jornada === jornadaActual);

  return (
    <LinearGradient colors={['#18395a', '#346335']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Ligas</Text>
        {ligas.length > 0 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => console.log('Crear liga')}
          >
            <Text style={styles.createButtonText}>Crear Liga</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ligas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.ligasScroll}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        {ligas.map((liga) => (
          <View key={liga.id} style={styles.ligaCard}>
            <Text style={styles.ligaName}>{liga.nombre}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Tabla de partidos con navegación de jornadas */}
      <View style={{ height: height * 0.5, marginHorizontal: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' }}>
        {/* Header de la tabla con flechas */}
        <View style={[styles.tableHeader, { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }]}>
          <TouchableOpacity
            onPress={() => setJornadaActual((prev) => Math.max(prev - 1, Math.min(...jornadas)))}
          >
            <Text style={[styles.tableHeaderText, { fontSize: 18 }]}>{'<'}</Text>
          </TouchableOpacity>

          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>
            Jornada {jornadaActual}
          </Text>

          <TouchableOpacity
            onPress={() => setJornadaActual((prev) => Math.min(prev + 1, Math.max(...jornadas)))}
          >
            <Text style={[styles.tableHeaderText, { fontSize: 18 }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {partidosJornada.map((partido) => (
            <View key={partido.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>{partido.local}</Text>
              <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>
                {partido.finished ? partido.resultado : `${partido.fecha} ${partido.hora}`}
              </Text>
              <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>{partido.visitante}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Cerrar sesión */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => navigation.replace('Login')}
      >
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};
