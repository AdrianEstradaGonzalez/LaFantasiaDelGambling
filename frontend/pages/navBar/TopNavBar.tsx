import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';

// 🔙 Icono de flecha (puedes cambiar la ruta si usas otro)
const backIcon = require('../../assets/iconos/backIcon.png');

const TopNavBar: React.FC<{ title?: string }> = ({ }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // 👉 Acción para volver a Home
  const handleBackPress = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={[styles.navBar, { 
      position: 'absolute',
      top: 0,
      justifyContent: 'flex-start',
      backgroundColor: '#181818',
      borderBottomWidth: 0.5,
      borderBottomColor: '#333',
      paddingVertical: 10,
      zIndex: 10
    }]}>
      {/* Botón de volver */}
      <TouchableOpacity
        onPress={handleBackPress}
        style={[styles.arrow, { marginLeft: 16 }]}
        activeOpacity={0.8}
      >
        <Image source={backIcon} style={{ width: 28, height: 28, tintColor: '#fff' }} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
};

export default TopNavBar;
