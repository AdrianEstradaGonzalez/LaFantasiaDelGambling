import React from 'react';
import { View, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.navBar,
                {
                    paddingTop: insets.top,
                    backgroundColor: '#181818',
                    borderBottomWidth: 0.5,
                    borderBottomColor: '#333',
                    paddingBottom: 10,
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
                activeOpacity={0.8}
                style={{ backgroundColor: 'transparent', paddingRight: 8 }}
            >
                <MenuIcon size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Título centrado con flex limitado */}
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
                <Text
                    style={{
                        color: '#fff',
                        fontSize: Typography.sizes['2xl'],
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


            {/* Botón de invitar */}
            <TouchableOpacity
                onPress={onInvitePress}
                style={[styles.inviteIcon, { paddingLeft: 8 }]}
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
