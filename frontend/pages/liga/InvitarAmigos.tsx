import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import { CrearLigaStyles as styles } from '../../styles/CrearLigaStyles';
import TopNavBar from '../navBar/TopNavBar';
import { Colors, Typography, Spacing } from '../../styles/DesignSystem';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../router/AppNavigator'; // 👈 importa tu RootStackParamList

// ✅ Usa RouteProp con tu lista de rutas y el nombre exacto de esta pantalla
type InvitarRouteProp = RouteProp<RootStackParamList, 'InvitarAmigos'>;

export const InvitarAmigos: React.FC = () => {
  const route = useRoute<InvitarRouteProp>();
  const { ligaNombre, codigo } = route.params;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(codigo);
    setCopied(true);
    Alert.alert('Código copiado', 'El código se ha copiado al portapapeles.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      const message = `¡Únete a mi liga ${ligaNombre}! 🏆\nUsa este código de acceso: ${codigo}`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert('Error', 'No se pudo compartir el código.');
    }
  };

  return (
    <LinearGradient
      colors={['#181818ff', '#181818ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* 🔝 Barra superior */}
      <TopNavBar />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Invita a tus amigos</Text>
          <Text style={styles.subtitle}>
            Invita a tus amigos compartiendo el código de acceso o a través de tus redes.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Image
              source={require('../../assets/iconos/inviteIcon.png')}
              style={{ width: 24, height: 24, marginRight: Spacing.sm, tintColor: Colors.primary[600] }}
            />
            <Text style={styles.sectionTitle}>Código de acceso</Text>
          </View>

          <Text
            style={{
              fontSize: Typography.sizes['2xl'],
              fontWeight: Typography.weights.bold,
              color: Colors.primary[600],
              textAlign: 'center',
              marginVertical: Spacing.lg,
              letterSpacing: 2,
            }}
          >
            {codigo}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md }}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Image
                source={copied ? undefined : require('../../assets/iconos/portapapeles.png')}
                style={{ width: 24, height: 24, marginRight: 8, tintColor: Colors.text.inverse }}
              />
              {copied && (
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={Colors.text.inverse}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={styles.primaryButtonText}>
                {copied ? 'Copiado' : 'Copiar código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/iconos/compartir.png')}
                style={{ width: 18, height: 18, marginRight: 6, tintColor: Colors.text.secondary }}
              />
              <Text style={styles.secondaryButtonText}>Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Consejo</Text>
          <Text style={styles.tipsText}>
            Tus amigos pueden ingresar este código en la sección “Unirse a una liga”.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default InvitarAmigos;
