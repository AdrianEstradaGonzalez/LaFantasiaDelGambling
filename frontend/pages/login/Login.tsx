import React from 'react';
import { View, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { LoginStyles } from './LoginStyles';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';

// Validación del formulario
const schema = yup.object({
  email: yup.string().email('Introduce un email válido').required('El email es requerido'),
  password: yup.string().min(6, 'La contraseña debe tener al menos 6 caracteres').required('La contraseña es requerida'),
});

type LoginFormData = {
  email: string;
  password: string;
};

type LoginProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export const Login = ({ navigation }: LoginProps) => {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginFormData) => {
    console.log('Login data:', data);
    navigation.replace('Home'); // Navega a Home tras login
  };

  return (
    <KeyboardAvoidingView
      style={LoginStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={LoginStyles.card}>
        <Image
          source={require('../../assets/logo.png')} // Pon tu logo aquí
          style={LoginStyles.logo}
        />
        <Text style={LoginStyles.title}>Bienvenido</Text>
        <Text style={LoginStyles.subtitle}>Inicia sesión para continuar</Text>

        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, value },
          }: {
            field: {
              onChange: (value: string) => void;
              value: string;
            };
          }) => (
            <TextInput
              label="Email"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={LoginStyles.input}
              error={!!errors.email}
            />
          )}
        />
        {errors.email && <Text style={LoginStyles.error}>{errors.email.message}</Text>}

        <Controller
          control={control}
          name="password"
          render={({
            field: { onChange, value },
          }: {
            field: {
              onChange: (value: string) => void;
              value: string;
            };
          }) => (
            <TextInput
              label="Contraseña"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              secureTextEntry
              style={LoginStyles.input}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && <Text style={LoginStyles.error}>{errors.password.message}</Text>}

        <Button mode="contained" onPress={handleSubmit(onSubmit)} style={LoginStyles.button}>
          Iniciar Sesión
        </Button>

        <TouchableOpacity>
          <Text style={LoginStyles.forgot}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <View style={LoginStyles.registerContainer}>
          <Text style={LoginStyles.registerText}>¿No tienes cuenta?</Text>
          <TouchableOpacity>
            <Text style={LoginStyles.registerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
