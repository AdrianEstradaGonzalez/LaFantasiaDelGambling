import React from 'react';
import { View, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';

// Importa tus iconos
const homeIcon = require('../../assets/iconos/home.png');
const logoutIcon = require('../../assets/iconos/logout.png');

const BottomNavBar: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // 👉 Acción del botón Home
  const handleHomePress = () => {
    navigation.navigate('Home');
  };

  // 👉 Acción del botón Logout
  const handleLogoutPress = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.navBar}>
      {/* Espacio a la izquierda (por si agregas otro botón) */}
      <View style={{ width: 40 }} />

      {/* Botón Home */}
      <TouchableOpacity
        onPress={handleHomePress}
        style={styles.homeButton}
        activeOpacity={0.8}
      >
        <Image source={homeIcon} style={styles.homeIcon} resizeMode="contain" />
      </TouchableOpacity>

      {/* Botón Logout */}
      <TouchableOpacity
        onPress={handleLogoutPress}
        style={styles.logoutButton}
        activeOpacity={0.8}
      >
        <Image source={logoutIcon} style={styles.logoutIcon} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
};

export default BottomNavBar;
