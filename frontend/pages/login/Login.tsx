import React, { useState } from 'react';
import { View, Text, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import * as SecureStore from 'expo-secure-store';
import { TextInput, Button } from 'react-native-paper';
import LoginStyles from './LoginStyles';

type LoginFormData = { email: string; password: string };

// ⚠️ Ajusta la URL según el entorno.
// - Android emulador: http://10.0.2.2:3000
// - iOS simulador:    http://localhost:3000
// - Dispositivo real: http://IP_DE_TU_PC:3000 (misma WiFi)
const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

const schema = yup.object({
  email: yup.string().email('Email inválido').required('Obligatorio'),
  password: yup.string().min(8, 'Mínimo 8 caracteres').required('Obligatorio'),
});

type Props = {
  navigation: any; // si tienes types de React Navigation, ponlos aquí
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

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) throw new Error('Credenciales inválidas');
        throw new Error(json?.error || 'Error de servidor');
      }

      const { accessToken, refreshToken } = json;

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      // Navegación a la pantalla principal
      navigation.replace('Home');
    } catch (e: any) {
      setApiError(e?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const goToForgotPassword = () => {
    // Aquí navegas a tu flujo de "Olvidé mi contraseña" si ya tienes pantalla
    // navigation.navigate('ForgotPassword');
  };

  return (
    <View style={LoginStyles.container}>
      <Text style={LoginStyles.title}>Iniciar sesión</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              mode="outlined"
              label="Correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={LoginStyles.input}
            />
            {errors.email?.message ? (
              <Text style={LoginStyles.error}>{errors.email.message}</Text>
            ) : null}
          </>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              mode="outlined"
              label="Contraseña"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              style={LoginStyles.input}
            />
            {errors.password?.message ? (
              <Text style={LoginStyles.error}>{errors.password.message}</Text>
            ) : null}
          </>
        )}
      />

      {apiError ? <Text style={LoginStyles.error}>{apiError}</Text> : null}

      <Button
        mode="contained"
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
        style={LoginStyles.button}
      >
        {loading ? <ActivityIndicator /> : 'Entrar'}
      </Button>

      <TouchableOpacity onPress={goToForgotPassword}>
        <Text style={LoginStyles.link}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;
