import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { Typography } from '../../styles/DesignSystem';

// 🔙 Icono de flecha (puedes cambiar la ruta si usas otro)
const backIcon = require('../../assets/iconos/backIcon.png');

interface TopNavBarProps {
  title?: string;
  backTo?: 'Home' | 'Clasificacion' | 'goBack';
  ligaId?: string;
  ligaName?: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ title, backTo = 'goBack', ligaId, ligaName }) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // 👉 Acción inteligente para volver
  const handleBackPress = () => {
    if (backTo === 'Home') {
      navigation.navigate('Home');
    } else if (backTo === 'Clasificacion' && ligaId && ligaName) {
      navigation.navigate('Clasificacion', { ligaId, ligaName });
    } else {
      // Por defecto, volver a la pantalla anterior
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.navBar, { 
      position: 'absolute',
      top: 0,
      backgroundColor: '#181818',
      borderBottomWidth: 0.5,
      borderBottomColor: '#333',
      paddingVertical: 10,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: ligaName ? 'space-between' : 'flex-start',
      paddingHorizontal: 16,
    }]}>
      {/* Botón de volver */}
      <TouchableOpacity
        onPress={handleBackPress}
        style={{
          padding: 4, // Área táctil más grande
          zIndex: 20, // Asegurar que esté por encima
        }}
        activeOpacity={0.8}
      >
        <Image source={backIcon} style={{ width: 28, height: 28, tintColor: '#fff' }} resizeMode="contain" />
      </TouchableOpacity>

      {/* Título de liga si está en contexto de liga */}
      {ligaName && (
        <Text
          style={{
            color: '#fff',
            fontSize: Typography.sizes['2xl'],
            fontWeight: '700',
            textAlign: 'center',
            flex: 1,
            marginHorizontal: 8, // Espacio a los lados
            zIndex: 1, // Por debajo del botón
          }}
          numberOfLines={1}
        >
          LIGA{' '}
          <Text style={{ color: '#0892D0' }}>
            {ligaName.toUpperCase()}
          </Text>
        </Text>
      )}

      {/* Espacio a la derecha para balance visual cuando hay título */}
      {ligaName && <View style={{ width: 28 }} />}
    </View>
  );
};

export default TopNavBar;
