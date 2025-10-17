import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import styles from '../../styles/NavBarStyles';
import { Typography } from '../../styles/DesignSystem';
import { MenuIcon } from '../../components/VectorIcons';

// 📸 Icono de invitar (puedes ajustar la ruta del archivo o usar otro icono)
const inviteIcon = require('../../assets/iconos/inviteIcon.png');

type Props = {
    nombreLiga: string;
    onInvitePress?: () => void;
    onMenuPress?: () => void;
};

const LigaTopNavBar: React.FC<Props> = ({ nombreLiga, onInvitePress, onMenuPress }) => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    return (
        <View
            style={[
                styles.navBar,
                {
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
                },
            ]}
        >
            {/* Botón de menú a la izquierda */}
            <TouchableOpacity
                onPress={onMenuPress}
                style={{ padding: 4 }}
                activeOpacity={0.8}
            >
                <MenuIcon size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Título centrado */}
            <Text
                style={{
                    color: '#fff',
                    fontSize: Typography.sizes['2xl'],
                    fontWeight: '700',
                    textAlign: 'center',
                    flex: 1,
                }}
                numberOfLines={1}
            >
                LIGA{' '}
                <Text style={{ color: '#0892D0' }}>
                    {nombreLiga?.toUpperCase()}
                </Text>
            </Text>


            {/* Botón de invitar */}
            <TouchableOpacity
                onPress={onInvitePress}
                style={[styles.inviteIcon, { marginRight: 4 }]}
                activeOpacity={0.8}
            >
                <Image
                    source={inviteIcon}
                    style={{ width: 40, height: 40, tintColor: '#fff' }}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        </View>
    );
};

export default LigaTopNavBar;
