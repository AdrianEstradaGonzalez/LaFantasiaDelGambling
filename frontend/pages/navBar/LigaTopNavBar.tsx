import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuIcon } from '../../components/VectorIcons';

const inviteIcon = require('../../assets/iconos/inviteIcon.png');

type Props = {
  nombreLiga: string;
  onInvitePress?: () => void;
  onMenuPress?: () => void;
};

const LigaTopNavBar: React.FC<Props> = ({ nombreLiga, onInvitePress, onMenuPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: '#181818',
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Botón de menú a la izquierda */}
      <TouchableOpacity
        onPress={onMenuPress}
        style={{
          padding: 8,
          marginLeft: -8,
        }}
        activeOpacity={0.8}
      >
        <MenuIcon size={24} color="#fff" />
      </TouchableOpacity>

      {/* Título centrado */}
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
        <Text
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: '700',
            textAlign: 'center',
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          LIGA{' '}
          <Text style={{ color: '#0892D0' }}>
            {nombreLiga?.toUpperCase()}
          </Text>
        </Text>
      </View>

      {/* Botón de invitar amigos */}
      <TouchableOpacity
        onPress={onInvitePress}
        style={{
          padding: 8,
          marginRight: -8,
        }}
        activeOpacity={0.8}
      >
        <Image
          source={inviteIcon}
          style={{ width: 28, height: 28, tintColor: '#fff' }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

export default LigaTopNavBar;
