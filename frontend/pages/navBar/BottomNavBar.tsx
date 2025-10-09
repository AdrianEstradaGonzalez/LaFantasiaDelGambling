import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import styles from '../../styles/NavBarStyles';

interface BottomNavBarProps {
  onHomePress: () => void;
  onLogoutPress: () => void;
}

const homeIcon = require('../../assets/iconos/home.png');
const logoutIcon = require('../../assets/iconos/logout.png');

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onHomePress, onLogoutPress }) => {
  return (
    <View style={styles.navBar}>
      {/* Espacio a la izquierda (por si agregas algo más en el futuro) */}
      <View style={{ width: 40 }} />

      {/* Botón central (Home) */}
      <TouchableOpacity onPress={onHomePress} style={styles.homeButton} activeOpacity={0.8}>
        <Image source={homeIcon} style={styles.homeIcon} resizeMode="contain" />
      </TouchableOpacity>

      {/* Botón Logout a la derecha */}
      <TouchableOpacity onPress={onLogoutPress} style={styles.logoutButton} activeOpacity={0.8}>
        <Image source={logoutIcon} style={styles.logoutIcon} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
};

export default BottomNavBar;
