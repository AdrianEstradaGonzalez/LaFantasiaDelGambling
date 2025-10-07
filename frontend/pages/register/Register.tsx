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
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextInput, Button } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { LoginStyles } from '../login/LoginStyles';
import { RegisterData, RegisterService } from '../../services/RegisterService';


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

  const onSubmit = async (data: RegisterFormData) => {
  setApiError(null);
  setLoading(true);

  try {
    // Llamamos al servicio
    await RegisterService.register(data as RegisterData);

    // Redirigimos al Home si todo OK
    navigation.replace('Home');
  } catch (e: any) {
    setApiError(e?.message || 'No se pudo registrar');
  } finally {
    setLoading(false);
  }
};

  const PasswordInput = ({
    controlName,
    label,
  }: {
    controlName: 'password' | 'repeatPassword';
    label: string;
  }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Controller
        control={control}
        name={controlName}
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              mode="outlined"
              label={label}
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
                            ? require('../../assets/iconos/eye_off.png')
                            : require('../../assets/iconos/eye_on.png')
                        }
                        style={{ width: 24, height: 24 }}
                        />
                    )}
                    onPress={() => setShowPassword(!showPassword)}
                    forceTextInputFocus={false}
                    />
              }
            />
            {errors[controlName]?.message && (
              <Text style={LoginStyles.error}>
                {errors[controlName]?.message}
              </Text>
            )}
          </>
        )}
      />
    );
  };

  return (
    <LinearGradient colors={['#18395a', '#346335']} style={LoginStyles.gradient}>
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
            <Text style={LoginStyles.subtitle}>Regístrate para empezar</Text>

            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <TextInput
                    mode="outlined"
                    label="Nombre de usuario"
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
                  {errors.username?.message && (
                    <Text style={LoginStyles.error}>{errors.username.message}</Text>
                  )}
                </>
              )}
            />

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
                    <Text style={LoginStyles.error}>{errors.email.message}</Text>
                  )}
                </>
              )}
            />

            <PasswordInput controlName="password" label="Contraseña" />
            <PasswordInput controlName="repeatPassword" label="Repetir contraseña" />

            {apiError && <Text style={LoginStyles.error}>{apiError}</Text>}

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={LoginStyles.button}
              labelStyle={LoginStyles.buttonLabel}
            >
              {loading ? <ActivityIndicator color="#fff" /> : 'Registrarse'}
            </Button>

            <View style={LoginStyles.registerContainer}>
              <Text style={LoginStyles.registerText}>¿Ya tienes cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={LoginStyles.registerLink}>Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default Register;
