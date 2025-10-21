import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LoginStyles } from '../../styles/AuthStyles';
import { RegisterData, RegisterService } from '../../services/RegisterService';
import { EmailIcon, LockIcon } from '../../components/VectorIcons';
import { SafeLayout } from '../../components/SafeLayout';

type RegisterFormData = {
  username: string;
  email: string;
  password: string;
  repeatPassword: string;
};

const schema = yup.object({
  username: yup.string().min(3, 'Mínimo 3 caracteres').required('Obligatorio'),
  email: yup.string().email('Email inválido').required('Obligatorio'),
  password: yup.string().min(8, 'Mínimo 8 caracteres').required('Obligatorio'),
  repeatPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
    .required('Obligatorio'),
});

type Props = {
  navigation: any;
};

const Register: React.FC<Props> = ({ navigation }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: { username: '', email: '', password: '', repeatPassword: '' },
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [repeatPasswordFocused, setRepeatPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setLoading(true);

    try {
      await RegisterService.register(data as RegisterData);
      navigation.replace('Home');
    } catch (e: any) {
      setApiError(e?.message || 'No se pudo completar el registro. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeLayout backgroundColor="#0f172a">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={LoginStyles.container}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={LoginStyles.headerSection}>
          <View style={LoginStyles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={LoginStyles.logo}
            />
          </View>
          <Text style={LoginStyles.appName}>DreamLeague</Text>
          <Text style={LoginStyles.appTagline}>
            Tu fantasy football con apuestas
          </Text>
        </View>

        {/* Form Section */}
        <View style={LoginStyles.formSection}>
          {/* Error Banner */}
          {apiError && (
            <View style={LoginStyles.errorBanner}>
              <Text style={LoginStyles.errorBannerText}>{apiError}</Text>
            </View>
          )}

          {/* Username Input */}
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={LoginStyles.inputContainer}>
                <Text style={LoginStyles.inputLabel}>Nombre de usuario</Text>
                <View
                  style={[
                    LoginStyles.inputWrapper,
                    usernameFocused && LoginStyles.inputWrapperFocused,
                    errors.username && LoginStyles.inputWrapperError,
                  ]}
                >
                  <Image
                    source={require('../../assets/iconos/equipo.png')}
                    style={LoginStyles.inputIcon}
                  />
                  <View style={{ width: 12 }} />
                  <RNTextInput
                    style={LoginStyles.input}
                    placeholder="Nombre de usuario"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={() => {
                      onBlur();
                      setUsernameFocused(false);
                    }}
                    onFocus={() => setUsernameFocused(true)}
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
                {errors.username?.message && (
                  <Text style={LoginStyles.errorText}>
                    {errors.username.message}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Email Input */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={LoginStyles.inputContainer}>
                <Text style={LoginStyles.inputLabel}>Correo electrónico</Text>
                <View
                  style={[
                    LoginStyles.inputWrapper,
                    emailFocused && LoginStyles.inputWrapperFocused,
                    errors.email && LoginStyles.inputWrapperError,
                  ]}
                >
                  <EmailIcon size={20} color="#64748b" />
                  <View style={{ width: 12 }} />
                  <RNTextInput
                    style={LoginStyles.input}
                    placeholder="tu@email.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={() => {
                      onBlur();
                      setEmailFocused(false);
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onChangeText={onChange}
                    value={value}
                  />
                </View>
                {errors.email?.message && (
                  <Text style={LoginStyles.errorText}>
                    {errors.email.message}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Password Input */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={LoginStyles.inputContainer}>
                <Text style={LoginStyles.inputLabel}>Contraseña</Text>
                <View
                  style={[
                    LoginStyles.inputWrapper,
                    passwordFocused && LoginStyles.inputWrapperFocused,
                    errors.password && LoginStyles.inputWrapperError,
                  ]}
                >
                  <LockIcon size={20} color="#64748b" />
                  <View style={{ width: 12 }} />
                  <RNTextInput
                    style={LoginStyles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showPassword}
                    onBlur={() => {
                      onBlur();
                      setPasswordFocused(false);
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Image
                      source={
                        showPassword
                          ? require('../../assets/iconos/eye_on.png')
                          : require('../../assets/iconos/eye_off.png')
                      }
                      style={LoginStyles.eyeIcon}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password?.message && (
                  <Text style={LoginStyles.errorText}>
                    {errors.password.message}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Repeat Password Input */}
          <Controller
            control={control}
            name="repeatPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={LoginStyles.inputContainer}>
                <Text style={LoginStyles.inputLabel}>Confirmar contraseña</Text>
                <View
                  style={[
                    LoginStyles.inputWrapper,
                    repeatPasswordFocused && LoginStyles.inputWrapperFocused,
                    errors.repeatPassword && LoginStyles.inputWrapperError,
                  ]}
                >
                  <LockIcon size={20} color="#64748b" />
                  <View style={{ width: 12 }} />
                  <RNTextInput
                    style={LoginStyles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showRepeatPassword}
                    onBlur={() => {
                      onBlur();
                      setRepeatPasswordFocused(false);
                    }}
                    onFocus={() => setRepeatPasswordFocused(true)}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Image
                      source={
                        showRepeatPassword
                          ? require('../../assets/iconos/eye_on.png')
                          : require('../../assets/iconos/eye_off.png')
                      }
                      style={LoginStyles.eyeIcon}
                    />
                  </TouchableOpacity>
                </View>
                {errors.repeatPassword?.message && (
                  <Text style={LoginStyles.errorText}>
                    {errors.repeatPassword.message}
                  </Text>
                )}
              </View>
            )}
          />

          {/* Register Button */}
          <TouchableOpacity
            style={[
              LoginStyles.primaryButton,
              loading && LoginStyles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={LoginStyles.loadingContainer}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={LoginStyles.loadingText}>Creando cuenta...</Text>
              </View>
            ) : (
              <Text style={LoginStyles.primaryButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={LoginStyles.footer}>
          <Text style={LoginStyles.footerText}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={LoginStyles.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeLayout>
  );
};

export default Register;
