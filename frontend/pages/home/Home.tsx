import React, { useEffect, useState } from 'react';
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
import FootballService, { type Partido } from '../../services/FutbolService';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

// 📦 Importa el icono de logout (require para Metro/React Native)
const logoutIcon = require('../../assets/iconos/logout.png');

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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLigas([
      { id: '1', nombre: 'Fantasy League 1' },
      { id: '2', nombre: 'Mi Liga VIP' },
      { id: '3', nombre: 'Liga de Amigos' },
    ]);

    const fetchMatches = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  const partidosJornada = partidos.filter((p) => p.jornada === jornadaActual);

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Ligas</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => console.log('Crear liga')}>
          <Text style={styles.createButtonText}>Crear Liga</Text>
        </TouchableOpacity>
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

      {/* Tabla de partidos */}
      <View style={styles.tableContainer}>
        <View
          style={[
            styles.tableHeader,
            { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
          ]}
        >
          <TouchableOpacity onPress={jornadaAnterior} disabled={loading}>
            <Text style={[styles.tableHeaderText, { fontSize: 18 }]}>{'<'}</Text>
          </TouchableOpacity>

          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>
            Jornada {jornadaActual}
          </Text>

          <TouchableOpacity onPress={jornadaSiguiente} disabled={loading}>
            <Text style={[styles.tableHeaderText, { fontSize: 18 }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#18395a" />
          </View>
        ) : (
          <ScrollView>
            {partidosJornada.length > 0 ? (
              partidosJornada.map((partido) => (
                <View key={partido.id} style={styles.tableRow}>
                  <Image
                    source={{ uri: partido.localCrest }}
                    style={{ width: 40, height: 40, marginRight: 8 }}
                  />
                  <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>
                    {partido.local}
                  </Text>

                  <Text style={[styles.tableCell, { flex: 3, textAlign: 'center' }]}>
                    {partido.finished ? partido.resultado : `${partido.fecha} ${partido.hora}`}
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
                <Text style={{ textAlign: 'center', color: '#333' }}>
                  No hay partidos para esta jornada.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Botón de cerrar sesión */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => navigation.replace('Login')}
      >
        <Image source={logoutIcon} style={styles.logoutIcon} />
      </TouchableOpacity>
    </View>
  );
};
