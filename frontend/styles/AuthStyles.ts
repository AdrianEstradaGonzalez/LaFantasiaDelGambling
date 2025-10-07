import { StyleSheet, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');

export const LoginStyles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  card: {
    width: width * 0.9,
    backgroundColor: '#ffffffee',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: width * 0.3,
    height: width * 0.3,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#18395a', // Azul normativo
    marginTop: 10,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#18395a', // Azul normativo
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  error: {
    color: '#c0392b',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginLeft: 5,
    fontSize: 13,
  },
  button: {
    width: '100%',
    marginTop: 10,
    backgroundColor: '#18395a', // Azul normativo
    borderRadius: 10,
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff', // Texto blanco para contraste
  },
  link: {
    color: '#1a73e8', // Azul claro tipo link
    marginTop: 15,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#555',
  },
  registerLink: {
    color: '#1a73e8', // Azul claro tipo link
    fontWeight: '700',
    marginLeft: 5,
  },
});
