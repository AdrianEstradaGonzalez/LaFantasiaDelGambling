import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';
import { CrearLigaStyles as styles } from '../../styles/CrearLigaStyles';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { LigaService } from '../../services/LigaService';
import { PaymentService } from '../../services/PaymentService';
import TopNavBar from '../navBar/TopNavBar';
import { CustomAlertManager } from '../../components/CustomAlert';
import { SafeLayout } from '../../components/SafeLayout';
import { useRoute } from '@react-navigation/native';
import { 
  InformationIcon, 
  CheckCircleLargeIcon, 
  TrophyStarIcon,
  TrophyIcon,
  UsersGroupIcon,
} from '../../components/VectorIcons';

type CrearLigaProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

type CrearLigaRouteProp = RouteProp<{ params: { codigo?: string } }, 'params'>;

type CrearLigaRouteWithMode = RouteProp<{ params: { codigo?: string; mode?: 'create' | 'join' } }, 'params'>;

export const CrearLiga = ({ navigation }: CrearLigaProps) => {
  const route = useRoute<CrearLigaRouteWithMode>();
  const [nombreLiga, setNombreLiga] = useState('');
  const [codigoLiga, setCodigoLiga] = useState('');
  const [loadingCrear, setLoadingCrear] = useState(false);
  const [loadingUnirse, setLoadingUnirse] = useState(false);
  
  // Estados para Liga Premium
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showPremiumForm, setShowPremiumForm] = useState(false);
  const [nombreLigaPremium, setNombreLigaPremium] = useState('');
  const [divisionPremium, setDivisionPremium] = useState<'primera' | 'segunda' | 'premier'>('primera');
  const [loadingCrearPremium, setLoadingCrearPremium] = useState(false);
  
  // Estados para pago
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // Manejar código de deep link
  useEffect(() => {
    if (route.params?.codigo) {
      setCodigoLiga(route.params.codigo);
      // Opcional: auto-scroll a la sección de unirse
      CustomAlertManager.alert(
        '¡Invitación recibida!',
        `Código de liga detectado: ${route.params.codigo}. Pulsa "Unirse a liga" para continuar.`,
        [{ text: 'Entendido', onPress: () => {}, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: '#10b981' }
      );
    }
  }, [route.params?.codigo]);

  const handleCrearLiga = async () => {
    if (!nombreLiga.trim()) {
      CustomAlertManager.alert(
        'Error',
        'Por favor, introduce un nombre para la liga.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    if (nombreLiga.trim().length < 3) {
      CustomAlertManager.alert(
        'Nombre muy corto',
        'El nombre de la liga debe tener al menos 3 caracteres.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    try {
      setLoadingCrear(true);
      // Liga normal siempre es Primera División
      const nuevaLiga = await LigaService.crearLiga({ name: nombreLiga, division: 'primera' });
      
      // Limpiar el campo y navegar directamente a InvitarAmigos
      setNombreLiga('');
      navigation.navigate('InvitarAmigos', { 
        ligaNombre: nuevaLiga.name, 
        codigo: nuevaLiga.code,
        ligaId: nuevaLiga.id,
        division: 'primera',
        isPremium: false
      });
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo crear la liga',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setLoadingCrear(false);
    }
  };

  const handleCrearLigaPremium = async () => {
    if (!nombreLigaPremium.trim()) {
      CustomAlertManager.alert(
        'Error',
        'Por favor, introduce un nombre para la liga.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    if (nombreLigaPremium.trim().length < 3) {
      CustomAlertManager.alert(
        'Nombre muy corto',
        'El nombre de la liga debe tener al menos 3 caracteres.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    try {
      setLoadingCrearPremium(true);
      
      // Crear sesión de pago en Stripe
      const checkoutUrl = await PaymentService.createPremiumCheckout(
        nombreLigaPremium,
        divisionPremium
      );
      
      // Extraer session_id de la URL de checkout
      const sessionId = checkoutUrl.match(/cs_[a-zA-Z0-9_]+/)?.[0];
      if (sessionId) {
        setPendingSessionId(sessionId);
      }
      
      // Abrir WebView con la URL de pago
      setPaymentUrl(checkoutUrl);
      setShowPremiumForm(false);
      setShowPaymentWebView(true);
      
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo iniciar el proceso de pago',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setLoadingCrearPremium(false);
    }
  };

  const handlePaymentComplete = async () => {
    // Una vez completado el pago, crear la liga
    try {
      const nuevaLiga = await LigaService.crearLiga({ 
        name: nombreLigaPremium, 
        division: divisionPremium,
        isPremium: true
      });
      
      // Limpiar y cerrar
      setNombreLigaPremium('');
      setShowPaymentWebView(false);
      setShowPremiumModal(false);
      setShowPremiumForm(false);
      setPaymentUrl('');
      setPendingSessionId(null);
      
      CustomAlertManager.alert(
        '¡Pago exitoso!',
        'Tu liga premium ha sido creada.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'checkmark-circle', iconColor: '#10b981' }
      );
      
      navigation.navigate('InvitarAmigos', { 
        ligaNombre: nuevaLiga.name, 
        codigo: nuevaLiga.code,
        ligaId: nuevaLiga.id,
        division: divisionPremium,
        isPremium: true
      });
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo crear la liga premium',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    }
  };

  // 🏷 Unirse a una liga existente
  const handleUnirseLiga = async () => {
    if (!codigoLiga.trim()) {
      CustomAlertManager.alert(
        'Error',
        'Introduce un código válido para unirte.',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
      return;
    }

    try {
      setLoadingUnirse(true);
      const ligaResponse = await LigaService.unirsePorCodigo(codigoLiga.toUpperCase());
      
      // Limpiar el campo y navegar directamente a Clasificacion de la liga
      setCodigoLiga('');
      navigation.navigate('Clasificacion', { 
        ligaId: ligaResponse.league.id, 
        ligaName: ligaResponse.league.name,
        division: ligaResponse.league.division || 'primera',
        isPremium: ligaResponse.league.isPremium || false
      });
    } catch (error: any) {
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo unir a la liga',
        [{ text: 'OK', onPress: () => {}, style: 'default' }],
        { icon: 'alert-circle', iconColor: '#ef4444' }
      );
    } finally {
      setLoadingUnirse(false);
    }
  };

  return (
    <SafeLayout backgroundColor="#181818ff">
      <LinearGradient
        colors={['#181818ff', '#181818ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <TopNavBar backTo="Home" />
        <ScrollView contentContainerStyle={styles.container}>
       
        {/* Crear liga privada */}
        {route.params?.mode !== 'join' && (
          <>
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Crear Liga Privada</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Crea tu propia liga y compite con amigos
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre de la liga</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: TormentaImperfecta"
              placeholderTextColor="#94a3b8"
              value={nombreLiga}
              onChangeText={(text) => {
                const truncated = text.slice(0, 20);
                setNombreLiga(truncated);
              }}
            />
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{nombreLiga.length}/20</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingCrear && styles.primaryButtonDisabled]}
            onPress={handleCrearLiga}
            disabled={loadingCrear}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, loadingCrear && styles.primaryButtonTextDisabled]}>
              {loadingCrear ? 'Creando...' : 'Crear Liga'}
            </Text>
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <CheckCircleLargeIcon size={16} color="#10b981" />
              <Text style={[styles.tipsTitle, { marginLeft: 6 }]}>Consejo</Text>
            </View>
            <Text style={styles.tipsText}>
              Una vez creada, podrás compartir el código de la liga con tus amigos para que se unan.
            </Text>
          </View>
          </View>

          {/* Crear Liga Premium */}
          <View style={styles.premiumSection}>
          <View style={styles.sectionHeader}>
            <TrophyStarIcon size={24} color="#fbbf24" />
            <Text style={[styles.premiumTitle, { marginLeft: 8 }]}>Liga Premium</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Elige tu división y compite con hasta 50 amigos
          </Text>

          <TouchableOpacity
            style={styles.premiumButton}
            onPress={() => setShowPremiumModal(true)}
            activeOpacity={0.8}
          >
            <TrophyStarIcon size={20} color="#1f2937" />
            <Text style={[styles.premiumButtonText, { marginLeft: 8 }]}>
              Crear Liga Premium
            </Text>
          </TouchableOpacity>
          </View>
          </>
        )}

        {/* Unirse a liga */}
        {route.params?.mode !== 'create' && (
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Unirse a Liga</Text>
          </View>
          <Text style={styles.sectionDescription}>
            ¿Tienes un código de liga? Únete aquí
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Código de liga</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el código"
              placeholderTextColor="#94a3b8"
              value={codigoLiga.toUpperCase()}
              onChangeText={text => setCodigoLiga(text.toUpperCase())}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loadingUnirse && styles.primaryButtonDisabled]}
            onPress={handleUnirseLiga}
            disabled={loadingUnirse}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, loadingUnirse && styles.primaryButtonTextDisabled]}>
              {loadingUnirse ? 'Uniéndose...' : 'Unirse a Liga'}
            </Text>
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <InformationIcon size={16} color="#10b981" />
              <Text style={[styles.tipsTitle, { marginLeft: 6 }]}>Información</Text>
            </View>
            <Text style={styles.tipsText}>
              Pide a tu amigo el código de la liga para poder participar en la competición.
            </Text>
          </View>
          </View>
        )}
        </ScrollView>

        {/* Modal Informativo Premium */}
        <Modal
          visible={showPremiumModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPremiumModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <TrophyStarIcon size={28} color="#fbbf24" />
                <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Liga Premium</Text>
              </View>
              <Text style={styles.modalSubtitle}>Características exclusivas</Text>
              
              <ScrollView 
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <TrophyIcon size={28} color="#fbbf24" />
                    <View style={[styles.featureTextContainer, { marginLeft: 12 }]}>
                      <Text style={styles.featureTitle}>Elige tu Liga</Text>
                      <Text style={styles.featureDescription}>
                        LaLiga, LaLiga Hypermotion o Premier League - Compite con jugadores de tu competición favorita
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.featureItem}>
                    <UsersGroupIcon size={28} color="#fbbf24" />
                    <View style={[styles.featureTextContainer, { marginLeft: 12 }]}>
                      <Text style={styles.featureTitle}>Hasta 50 Jugadores</Text>
                      <Text style={styles.featureDescription}>
                        Más espacio para competir con amigos - Las ligas premium permiten hasta 50 participantes
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#fbbf24',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#1f2937' }}>×</Text>
                    </View>
                    <View style={[styles.featureTextContainer, { marginLeft: 12 }]}>
                      <Text style={styles.featureTitle}>Apuestas Combinadas</Text>
                      <Text style={styles.featureDescription}>
                        Combina hasta 3 apuestas en una sola para multiplicar tus ganancias - Mayor riesgo, mayor recompensa
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#fbbf24',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f2937' }}>📊</Text>
                    </View>
                    <View style={[styles.featureTextContainer, { marginLeft: 12 }]}>
                      <Text style={styles.featureTitle}>Estadísticas Avanzadas</Text>
                      <Text style={styles.featureDescription}>
                        Accede a estadísticas detalladas de los jugadores para tomar mejores decisiones en tu plantilla
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => {
                  setShowPremiumModal(false);
                  setShowPremiumForm(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryButtonText}>Crear Liga Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowPremiumModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Formulario Premium */}
        <Modal
          visible={showPremiumForm}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPremiumForm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalFormContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <TrophyStarIcon size={28} color="#fbbf24" />
                <Text style={[styles.modalTitle, { marginLeft: 8 }]}>Crear Liga Premium</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nombre de la liga</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: LigaSuprema"
                  placeholderTextColor="#94a3b8"
                  value={nombreLigaPremium}
                  onChangeText={(text) => {
                    const truncated = text.slice(0, 20);
                    setNombreLigaPremium(truncated);
                  }}
                />
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                  {nombreLigaPremium.length}/20
                </Text>
              </View>

              {/* Selector de división */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>División</Text>
                <View style={{ flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.divisionButton,
                      divisionPremium === 'primera' && styles.divisionButtonActive
                    ]}
                    onPress={() => setDivisionPremium('primera')}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TrophyIcon 
                        size={18} 
                        color={divisionPremium === 'primera' ? '#fbbf24' : '#94a3b8'} 
                      />
                      <Text style={[
                        styles.divisionButtonText,
                        divisionPremium === 'primera' && styles.divisionButtonTextActive,
                        { marginLeft: 6 }
                      ]}>
                        La Liga
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.divisionButton,
                      divisionPremium === 'segunda' && styles.divisionButtonActive
                    ]}
                    onPress={() => setDivisionPremium('segunda')}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TrophyIcon 
                        size={18} 
                        color={divisionPremium === 'segunda' ? '#fbbf24' : '#94a3b8'} 
                      />
                      <Text style={[
                        styles.divisionButtonText,
                        divisionPremium === 'segunda' && styles.divisionButtonTextActive,
                        { marginLeft: 6 }
                      ]}>
                        LaLiga Hypermotion
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.divisionButton,
                      divisionPremium === 'premier' && styles.divisionButtonActive
                    ]}
                    onPress={() => setDivisionPremium('premier')}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TrophyIcon 
                        size={18} 
                        color={divisionPremium === 'premier' ? '#fbbf24' : '#94a3b8'} 
                      />
                      <Text style={[
                        styles.divisionButtonText,
                        divisionPremium === 'premier' && styles.divisionButtonTextActive,
                        { marginLeft: 6 }
                      ]}>
                        Premier League
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalPrimaryButton, loadingCrearPremium && styles.primaryButtonDisabled]}
                onPress={handleCrearLigaPremium}
                disabled={loadingCrearPremium}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalPrimaryButtonText, loadingCrearPremium && styles.primaryButtonTextDisabled]}>
                  {loadingCrearPremium ? 'Procesando...' : 'Continuar al Pago (9,90€)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowPremiumForm(false);
                  setNombreLigaPremium('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal WebView de Pago */}
        <Modal
          visible={showPaymentWebView}
          animationType="slide"
          onRequestClose={() => {
            CustomAlertManager.alert(
              'Cancelar pago',
              '¿Estás seguro de que quieres cancelar el pago?',
              [
                { text: 'No', onPress: () => {}, style: 'cancel' },
                { 
                  text: 'Sí, cancelar', 
                  onPress: () => {
                    setShowPaymentWebView(false);
                    setPaymentUrl('');
                  }, 
                  style: 'destructive' 
                },
              ],
              { icon: 'alert-circle', iconColor: '#f59e0b' }
            );
          }}
        >
          <View style={{ flex: 1, backgroundColor: '#1f2937' }}>
            <View style={{ 
              backgroundColor: '#1f2937', 
              paddingTop: 50, 
              paddingBottom: 10, 
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                Pago Seguro - 0,50€
              </Text>
              <TouchableOpacity
                onPress={() => {
                  CustomAlertManager.alert(
                    'Cancelar pago',
                    '¿Estás seguro de que quieres cancelar el pago?',
                    [
                      { text: 'No', onPress: () => {}, style: 'cancel' },
                      { 
                        text: 'Sí, cancelar', 
                        onPress: () => {
                          setShowPaymentWebView(false);
                          setPaymentUrl('');
                        }, 
                        style: 'destructive' 
                      },
                    ],
                    { icon: 'alert-circle', iconColor: '#f59e0b' }
                  );
                }}
                style={{ padding: 8 }}
              >
                <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            
            {paymentUrl ? (
              <>
                <WebView
                  source={{ uri: paymentUrl }}
                  onNavigationStateChange={(navState) => {
                    console.log('WebView URL:', navState.url);
                    
                    // Detectar si el pago fue exitoso
                    if (navState.url.includes('fantasiagambling://payment/success') || 
                        navState.url.includes('/payment/success')) {
                      handlePaymentComplete();
                    } else if (navState.url.includes('fantasiagambling://payment/cancel') || 
                               navState.url.includes('/payment/cancel')) {
                      setShowPaymentWebView(false);
                      setPaymentUrl('');
                      setPendingSessionId(null);
                      CustomAlertManager.alert(
                        'Pago cancelado',
                        'El pago ha sido cancelado.',
                        [{ text: 'OK', onPress: () => {}, style: 'default' }],
                        { icon: 'alert-circle', iconColor: '#f59e0b' }
                      );
                    }
                  }}
                  onShouldStartLoadWithRequest={(request) => {
                    // Interceptar URLs con el esquema de la app
                    if (request.url.startsWith('fantasiagambling://')) {
                      if (request.url.includes('/success')) {
                        handlePaymentComplete();
                      } else if (request.url.includes('/cancel')) {
                        setShowPaymentWebView(false);
                        setPaymentUrl('');
                        setPendingSessionId(null);
                        CustomAlertManager.alert(
                          'Pago cancelado',
                          'El pago ha sido cancelado.',
                          [{ text: 'OK', onPress: () => {}, style: 'default' }],
                          { icon: 'alert-circle', iconColor: '#f59e0b' }
                        );
                      }
                      return false; // No cargar la URL
                    }
                    return true; // Cargar URLs normales (Stripe)
                  }}
                  style={{ flex: 1 }}
                />
                
                {/* Botón de verificación manual */}
                <View style={{ backgroundColor: '#1f2937', padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#10b981',
                      padding: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                    onPress={async () => {
                      if (!pendingSessionId) {
                        CustomAlertManager.alert(
                          'Error',
                          'No se encontró información del pago',
                          [{ text: 'OK', onPress: () => {}, style: 'default' }],
                          { icon: 'alert-circle', iconColor: '#ef4444' }
                        );
                        return;
                      }

                      try {
                        setLoadingCrearPremium(true);
                        
                        // Verificar el pago en el servidor
                        const paymentInfo = await PaymentService.verifyPayment(pendingSessionId);
                        
                        if (paymentInfo.paid) {
                          // El pago fue exitoso, crear la liga
                          await handlePaymentComplete();
                        } else {
                          CustomAlertManager.alert(
                            'Pago pendiente',
                            'El pago aún no se ha completado. Por favor, completa el pago primero.',
                            [{ text: 'OK', onPress: () => {}, style: 'default' }],
                            { icon: 'alert-circle', iconColor: '#f59e0b' }
                          );
                        }
                      } catch (error: any) {
                        CustomAlertManager.alert(
                          'Error',
                          error.message || 'No se pudo verificar el pago',
                          [{ text: 'OK', onPress: () => {}, style: 'default' }],
                          { icon: 'alert-circle', iconColor: '#ef4444' }
                        );
                      } finally {
                        setLoadingCrearPremium(false);
                      }
                    }}
                    disabled={loadingCrearPremium}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                      {loadingCrearPremium ? '⏳ Verificando...' : '✅ He completado el pago'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </Modal>

      </LinearGradient>
    </SafeLayout>
  );
};
