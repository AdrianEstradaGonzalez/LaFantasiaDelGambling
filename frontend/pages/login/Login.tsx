import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextInput, Button } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { LoginStyles } from '../../styles/AuthStyles';
import { LoginData, LoginService } from '../../services/LoginService';

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

  const onSubmit = async (data: LoginFormData) => {
  setApiError(null);
  setLoading(true);

  try {
    // Llamada al servicio
    await LoginService.login(data as LoginData);
    // Redirigir al Home si todo OK
    navigation.replace('Home');
  } catch (e: any) {
    setApiError(e?.message ?? 'No se pudo iniciar sesión');
  } finally {
    setLoading(false);
  }
};

  return (
    <LinearGradient
        colors={['#18395a', '#346335']}
        style={LoginStyles.gradient}
      >

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }} 
      >
        <ScrollView
          contentContainerStyle={LoginStyles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={LoginStyles.card}>
            <Image
              source={require('../../assets/logo.png')}
              style={LoginStyles.logo}
            />

            <Text style={LoginStyles.title}>Bettasy</Text> 
            <Text style={LoginStyles.subtitle}>
              Inicia sesión 
            </Text>

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
                    outlineColor="#ccc"
                    activeOutlineColor="#1a2a6c"
                    textColor="#000"
                  />
                  {errors.email?.message && (
                    <Text style={LoginStyles.error}>
                      {errors.email.message}
                    </Text>
                  )}
                </>
              )}
            />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => {
            const [showPassword, setShowPassword] = useState(false);

            return (
              <>
                <TextInput
                  mode="outlined"
                  label="Contraseña"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  style={LoginStyles.input}
                  outlineColor="#ccc"
                  activeOutlineColor="#1a2a6c"
                  textColor="#000"
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <Image
                          source={
                            showPassword
                              ? require('../../assets/iconos/eye_on.png')
                              : require('../../assets/iconos/eye_off.png')
                          }
                          style={{ width: 24, height: 24 }}
                          resizeMode="contain"
                        />
                      )}
                      onPress={() => setShowPassword(!showPassword)}
                      forceTextInputFocus={false}
                    />
                  }
                />

                {errors.password?.message && (
                  <Text style={LoginStyles.error}>{errors.password.message}</Text>
                )}
              </>
            );
          }}
        />


            {apiError && <Text style={LoginStyles.error}>{apiError}</Text>}
            <View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'flex-start',
  }}
            >
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                trackColor={{ true: '#346335', false: '#ccc' }}
              />
              <Text style={{ marginLeft: 8, fontSize: 14, color: '#555' }}>
                Recuérdame
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={LoginStyles.button}
              labelStyle={LoginStyles.buttonLabel}
            >
              {loading ? <ActivityIndicator color="#fff" /> : 'Entrar'}
            </Button>

            <TouchableOpacity>
              <Text style={LoginStyles.link}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <View style={LoginStyles.registerContainer}>
              <Text style={LoginStyles.registerText}>¿No tienes cuenta?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={LoginStyles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default Login;
