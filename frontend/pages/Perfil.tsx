import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import EncryptedStorage from 'react-native-encrypted-storage';
import { SafeLayout } from '../components/SafeLayout';
import { ApiConfig } from '../utils/apiConfig';
import { CustomAlertManager } from '../components/CustomAlert';
import { UsersIcon, EmailIcon, LockIcon, SaveIcon, CheckCircleIcon, MenuIcon, EyeIcon, EyeOffIcon } from '../components/VectorIcons';
import { DrawerMenu } from '../components/DrawerMenu';

interface PerfilProps {
  navigation: any;
}

export const Perfil: React.FC<PerfilProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Datos del usuario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  
  // Cambio de contraseña
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados para el drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    loadUserData();
  }, []);

  // Animación del drawer
  useEffect(() => {
    if (isDrawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isDrawerOpen, slideAnim]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = await EncryptedStorage.getItem('accessToken');
      
      if (!token) {
        navigation.navigate('Login');
        return;
      }

      // Obtener datos del usuario desde el backend
      const response = await fetch(`${ApiConfig.BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setOriginalName(data.user.name || '');
          setOriginalEmail(data.user.email || '');
        }
      } else {
        throw new Error('Error al cargar datos del usuario');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      CustomAlertManager.alert(
        'Error',
        'No se pudieron cargar los datos del perfil',
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validar que al menos un campo haya cambiado
    if (name === originalName && email === originalEmail) {
      CustomAlertManager.alert(
        'Sin cambios',
        'No has realizado ningún cambio en tu perfil',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    // Validar nombre
    if (!name.trim()) {
      CustomAlertManager.alert(
        'Error',
        'El nombre no puede estar vacío',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      CustomAlertManager.alert(
        'Error',
        'Ingresa un email válido',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    try {
      setSaving(true);
      const token = await EncryptedStorage.getItem('accessToken');

      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/auth/update-profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Actualizar sesión local
        await EncryptedStorage.setItem('session', JSON.stringify({ user: data.user }));
        
        setOriginalName(data.user.name);
        setOriginalEmail(data.user.email);

        CustomAlertManager.alert(
          'Perfil Actualizado',
          'Tus datos se han actualizado correctamente',
          [{ text: 'OK', onPress: () => {} }],
          { icon: 'checkmark-circle', iconColor: '#10b981' }
        );
      } else {
        throw new Error(data.error || 'Error al actualizar perfil');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo actualizar el perfil',
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    CustomAlertManager.alert(
      '⚠️ Eliminar Cuenta',
      '¿Estás absolutamente seguro de que deseas eliminar tu cuenta? Esta acción NO se puede deshacer.\n\nSe eliminarán:\n• Todas tus plantillas\n• Tu historial de DreamGame\n• Tus membresías de liga\n• Todos tus datos personales',
      [
        { 
          text: 'Cancelar', 
          onPress: () => {}, 
          style: 'cancel' 
        },
        {
          text: 'Eliminar Permanentemente',
          onPress: confirmDeleteAccount,
          style: 'destructive',
        },
      ],
      { icon: 'alert-circle', iconColor: '#ef4444' }
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setSaving(true);
      const token = await EncryptedStorage.getItem('accessToken');

      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Limpiar almacenamiento local
        await EncryptedStorage.clear();
        
        CustomAlertManager.alert(
          'Cuenta Eliminada',
          'Tu cuenta ha sido eliminada permanentemente. Esperamos verte de nuevo pronto.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ],
          { icon: 'checkmark-circle', iconColor: '#10b981' }
        );
      } else {
        throw new Error(data.error || 'Error al eliminar la cuenta');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo eliminar la cuenta. Por favor, intenta de nuevo.',
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      CustomAlertManager.alert(
        'Error',
        'Completa todos los campos de contraseña',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    if (newPassword.length < 6) {
      CustomAlertManager.alert(
        'Error',
        'La nueva contraseña debe tener al menos 6 caracteres',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      CustomAlertManager.alert(
        'Error',
        'Las contraseñas no coinciden',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    try {
      setSaving(true);
      const token = await EncryptedStorage.getItem('accessToken');

      if (!token) {
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${ApiConfig.BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);

        CustomAlertManager.alert(
          'Contraseña Cambiada',
          'Tu contraseña se ha actualizado correctamente',
          [{ text: 'OK', onPress: () => {} }],
          { icon: 'checkmark-circle', iconColor: '#10b981' }
        );
      } else {
        throw new Error(data.error || 'Error al cambiar contraseña');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      CustomAlertManager.alert(
        'Error',
        error.message || 'No se pudo cambiar la contraseña',
        [{ text: 'OK', onPress: () => {} }]
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeLayout backgroundColor="#0f172a">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeLayout>
    );
  }

  return (
    // Make SafeLayout transparent so the LinearGradient fills the whole screen
    <SafeLayout backgroundColor="transparent">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <LinearGradient
          // Usar el mismo color arriba y abajo para un fondo uniforme
          colors={['#0f172a', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.container}
        >
          {/* Header con menú lateral - fuera del ScrollView para permanecer visible */}
          <View style={[styles.topBar, styles.topBarFixed]}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setIsDrawerOpen(true)}
            >
              <MenuIcon size={26} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.title}>Mi Perfil</Text>
            </View>

            {/* Sección de Datos Personales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos Personales</Text>

              {/* Nombre */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre</Text>
                <View style={styles.inputContainer}>
                  <UsersIcon size={20} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Tu nombre"
                    placeholderTextColor="#64748b"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <EmailIcon size={20} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Botón Guardar Cambios */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || (name === originalName && email === originalEmail)) && styles.saveButtonDisabled
                ]}
                onPress={handleSaveProfile}
                disabled={saving || (name === originalName && email === originalEmail)}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <SaveIcon size={20} color="#ffffff" />
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Sección de Cambiar Contraseña */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowPasswordSection(!showPasswordSection)}
              >
                <Text style={styles.sectionTitle}>Cambiar Contraseña</Text>
                <Text style={styles.toggleIcon}>
                  {showPasswordSection ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showPasswordSection && (
                <>
                  {/* Contraseña Actual */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña Actual</Text>
                    <View style={styles.inputContainer}>
                      <LockIcon size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        secureTextEntry={!showCurrentPassword}
                      />
                      <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? (
                          <EyeOffIcon size={20} color="#64748b" />
                        ) : (
                          <EyeIcon size={20} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Nueva Contraseña */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nueva Contraseña</Text>
                    <View style={styles.inputContainer}>
                      <LockIcon size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        secureTextEntry={!showNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? (
                          <EyeOffIcon size={20} color="#64748b" />
                        ) : (
                          <EyeIcon size={20} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirmar Contraseña */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar Contraseña</Text>
                    <View style={styles.inputContainer}>
                      <LockIcon size={20} color="#64748b" />
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? (
                          <EyeOffIcon size={20} color="#64748b" />
                        ) : (
                          <EyeIcon size={20} color="#64748b" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Botón Cambiar Contraseña */}
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      saving && styles.saveButtonDisabled
                    ]}
                    onPress={handleChangePassword}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <CheckCircleIcon size={20} color="#ffffff" />
                        <Text style={styles.saveButtonText}>Cambiar Contraseña</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Sección de Zona Peligrosa */}
            <View style={[styles.section, styles.dangerSection]}>
              <Text style={[styles.sectionTitle, styles.dangerTitle]}>Zona Peligrosa</Text>
              <Text style={styles.dangerWarning}>
                Eliminar tu cuenta es una acción permanente e irreversible
              </Text>
              
              <TouchableOpacity
                style={[styles.deleteButton]}
                onPress={handleDeleteAccount}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Eliminar Mi Cuenta</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Espacio extra al final */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>

      {/* Drawer Modal */}
      <Modal
        visible={isDrawerOpen}
        animationType="none"
        transparent={true}
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Drawer content con animación */}
          <Animated.View 
            style={{ 
              width: '75%', 
              maxWidth: 300,
              transform: [{ translateX: slideAnim }]
            }}
          >
            <DrawerMenu 
              navigation={{
                ...navigation,
                closeDrawer: () => setIsDrawerOpen(false),
                reset: (state: any) => {
                  navigation.reset(state);
                  setIsDrawerOpen(false);
                },
              }}
            />
          </Animated.View>
          {/* Overlay to close drawer */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>
    </SafeLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 100,
    paddingBottom: 40,
  },
  topBarFixed: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#60a5fa',
  },
  avatarLargeText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#93c5fd',
    marginBottom: 16,
  },
  toggleIcon: {
    fontSize: 18,
    color: '#64748b',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#e2e8f0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerSection: {
    backgroundColor: '#1e1112',
    borderColor: '#991b1b',
    borderWidth: 2,
  },
  dangerTitle: {
    color: '#fca5a5',
  },
  dangerWarning: {
    color: '#fca5a5',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#991b1b',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

