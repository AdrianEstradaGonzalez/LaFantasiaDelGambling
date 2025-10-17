import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { Typography } from '../../styles/DesignSystem';
import { ChevronLeftIcon, MenuIcon } from '../../components/VectorIcons';

interface TopNavBarProps {
  title?: string;
  backTo?: 'Home' | 'Clasificacion' | 'goBack';
  ligaId?: string;
  ligaName?: string;
  onMenuPress?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ title, backTo = 'goBack', ligaId, ligaName, onMenuPress }) => {
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
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    }]}>
      {/* Botón de volver */}
      <TouchableOpacity
        onPress={handleBackPress}
        style={{
          padding: 4,
          zIndex: 20,
        }}
        activeOpacity={0.8}
      >
        <ChevronLeftIcon size={28} color="#0892D0" />
      </TouchableOpacity>

      {/* Título personalizado o título de liga */}
      {(title || ligaName) && (
        <Text
          style={{
            color: '#fff',
            fontSize: Typography.sizes['2xl'],
            fontWeight: '700',
            textAlign: 'center',
            flex: 1,
            marginHorizontal: 8,
            zIndex: 1,
          }}
          numberOfLines={1}
        >
          {title || `LIGA ${ligaName?.toUpperCase()}`}
        </Text>
      )}

      {/* Botón de menú en la derecha */}
      <TouchableOpacity
        onPress={onMenuPress}
        style={{
          padding: 4,
          zIndex: 20,
        }}
        activeOpacity={0.8}
      >
        <MenuIcon size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

export default TopNavBar;
