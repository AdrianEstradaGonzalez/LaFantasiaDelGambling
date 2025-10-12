import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';

// 🔹 Importa los iconos
const clasificacionIcon = require('../../assets/iconos/clasificacion.png');
const equipoIcon = require('../../assets/iconos/equipo.png');
const mercadoIcon = require('../../assets/iconos/mercado.png');
const apuestasIcon = require('../../assets/iconos/apuestas.png');
const homeIcon = require('../../assets/iconos/home.png');

type LigaNavBarProps = {
  ligaId?: string;
  ligaName?: string;
};

const LigaNavBar: React.FC<LigaNavBarProps> = ({ ligaId, ligaName }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleClasificacion = () => navigation.navigate('Clasificacion', { ligaId, ligaName });
  const handleEquipo = () => navigation.navigate('Equipo', { ligaId, ligaName });
  const handleMercado = () => navigation.navigate('Mercado');
  const handleApuestas = () => navigation.navigate('Apuestas');
  const handleHome = () => navigation.navigate('Home');

  return (
    <View style={styles.navBar}>
        {/* Botón Home */}
      <TouchableOpacity
        onPress={handleHome}
        style={styles.navButton}
        activeOpacity={0.8}
      >
        <Image source={homeIcon} style={styles.navIcon} resizeMode="contain" />
      </TouchableOpacity>
      {/* Botón Clasificación */}
      <TouchableOpacity
        onPress={handleClasificacion}
        style={styles.navButton}
        activeOpacity={0.8}
      >
        <Image source={clasificacionIcon} style={styles.navIcon} resizeMode="contain" />
      </TouchableOpacity>

      {/* Botón Equipo */}
      <TouchableOpacity
        onPress={handleEquipo}
        style={styles.navButton}
        activeOpacity={0.8}
      >
        <Image source={equipoIcon} style={styles.navIcon} resizeMode="contain" />
      </TouchableOpacity>

      {/* Botón Mercado */}
      <TouchableOpacity
        onPress={handleMercado}
        style={styles.navButton}
        activeOpacity={0.8}
      >
        <Image source={mercadoIcon} style={styles.navIcon} resizeMode="contain" />
      </TouchableOpacity>

      {/* Botón Apuestas */}
      <TouchableOpacity
        onPress={handleApuestas}
        style={styles.navButton}
        activeOpacity={0.8}
      >
        <Image source={apuestasIcon} style={styles.navIcon} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
};

export default LigaNavBar;
