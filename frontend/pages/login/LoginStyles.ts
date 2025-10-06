import { StyleSheet } from 'react-native';

export const LoginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 16,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#252525',
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 10,
    marginLeft: 5,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 6,
  },
  forgot: {
    color: '#4da6ff',
    textAlign: 'center',
    marginTop: 12,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#ccc',
    marginRight: 5,
  },
  registerLink: {
    color: '#4da6ff',
    fontWeight: '600',
  },
  link: {
    color: '#007bff',
    marginTop: 15,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
