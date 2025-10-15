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
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LoginStyles } from '../../styles/AuthStyles';
import { LoginData, LoginService } from '../../services/LoginService';
import { CheckIcon, EmailIcon, LockIcon } from '../../components/VectorIcons';

type LoginFormData = { email: string; password: string };

const schema = yup.object({
  email: yup.string().email('Email inválido').required('Obligatorio'),
  password: yup.string().min(8, 'Mínimo 8 caracteres').required('Obligatorio'),
});

type Props = {
  navigation: any;
};

const Login: React.FC<Props> = ({ navigation }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setLoading(true);

    try {
      await LoginService.login(data as LoginData);
      navigation.replace('Home');
    } catch (e: any) {
      setApiError(e?.message ?? 'No se pudo iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={LoginStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={LoginStyles.scrollContent}
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

          {/* Remember Me & Forgot Password */}
          <View style={LoginStyles.optionsRow}>
            <TouchableOpacity
              style={LoginStyles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  LoginStyles.checkbox,
                  rememberMe && LoginStyles.checkboxChecked,
                ]}
              >
                {rememberMe && <CheckIcon size={12} color="#ffffff" />}
              </View>
              <Text style={LoginStyles.rememberMeText}>Recuérdame</Text>
            </TouchableOpacity>

            <TouchableOpacity style={LoginStyles.forgotPasswordButton}>
              <Text style={LoginStyles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
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
                <Text style={LoginStyles.loadingText}>Iniciando sesión...</Text>
              </View>
            ) : (
              <Text style={LoginStyles.primaryButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={LoginStyles.footer}>
          <Text style={LoginStyles.footerText}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={LoginStyles.footerLink}>Regístrate gratis</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;
