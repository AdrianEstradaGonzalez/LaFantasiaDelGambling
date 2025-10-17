import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from './DesignSystem';

const { width, height } = Dimensions.get('window');

export const LoginStyles = StyleSheet.create({
  // Container principal
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Fondo fijo oscuro
  },

  // Scroll content - ahora sin scroll, responsive
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: height * 0.03,
  },

  // Header section - flexible
  headerSection: {
    alignItems: 'center',
    flex: 0.28,
    justifyContent: 'center',
    minHeight: 120,
  },

  logoContainer: {
    width: height * 0.14,
    height: height * 0.14,
    maxWidth: 120,
    maxHeight: 120,
    minWidth: 80,
    minHeight: 80,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: '#334155',
    ...Shadows.large,
  },

  logo: {
    width: '75%',
    height: '75%',
    resizeMode: 'contain',
  },

  appName: {
    fontSize: Math.min(Typography.sizes['4xl'], height * 0.04),
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },

  appTagline: {
    fontSize: Math.min(Typography.sizes.base, height * 0.018),
    fontWeight: Typography.weights.normal,
    color: Colors.text.tertiary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Form section - flexible
  formSection: {
    flex: 0.6,
    justifyContent: 'center',
  },

  welcomeText: {
    fontSize: Math.min(Typography.sizes['2xl'], height * 0.028),
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },

  welcomeSubtext: {
    fontSize: Math.min(Typography.sizes.sm, height * 0.016),
    fontWeight: Typography.weights.normal,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },

  // Input styles - responsive
  inputContainer: {
    marginBottom: Spacing.sm,
    maxWidth: width * 0.88,
    alignSelf: 'center',
    width: '100%',
  },

  inputLabel: {
    fontSize: Math.min(Typography.sizes.sm, height * 0.016),
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },

  inputWrapper: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: Math.max(48, Math.min(56, height * 0.07)),
  },

  inputWrapperFocused: {
    borderColor: Colors.info,
    backgroundColor: Colors.background.tertiary,
  },

  inputWrapperError: {
    borderColor: Colors.error,
  },

  input: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    paddingVertical: 0,
  },

  inputIcon: {
    width: 20,
    height: 20,
    marginRight: Spacing.sm,
    tintColor: Colors.text.tertiary,
  },

  eyeIcon: {
    width: 22,
    height: 22,
    tintColor: Colors.text.tertiary,
  },

  errorText: {
    fontSize: Math.min(Typography.sizes.xs, height * 0.014),
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },

  // Forgot password
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    maxWidth: width * 0.88,
    alignSelf: 'center',
    width: '100%',
  },

  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rememberMeText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },

  forgotPasswordButton: {
    padding: Spacing.xs,
  },

  forgotPasswordText: {
    fontSize: Typography.sizes.sm,
    color: Colors.info,
    fontWeight: Typography.weights.semibold,
  },

  // Primary button - responsive
  primaryButton: {
    backgroundColor: Colors.info,
    borderRadius: BorderRadius.lg,
    height: Math.max(48, Math.min(56, height * 0.07)),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    maxWidth: width * 0.88,
    alignSelf: 'center',
    width: '100%',
    ...Shadows.medium,
  },

  primaryButtonDisabled: {
    backgroundColor: Colors.primary[700],
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text.inverse,
    letterSpacing: 0.5,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.primary,
  },

  dividerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.tertiary,
    marginHorizontal: Spacing.md,
    fontWeight: Typography.weights.medium,
  },

  // Social buttons
  socialButtonsContainer: {
    gap: Spacing.md,
  },

  socialButton: {
    backgroundColor: Colors.background.elevated,
    borderRadius: BorderRadius.lg,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },

  socialButtonIcon: {
    width: 24,
    height: 24,
    marginRight: Spacing.sm,
  },

  socialButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },

  // Footer - flexible
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.08,
    minHeight: 40,
  },

  footerText: {
    fontSize: Math.min(Typography.sizes.sm, height * 0.016),
    color: Colors.text.tertiary,
  },

  footerLink: {
    fontSize: Math.min(Typography.sizes.sm, height * 0.016),
    color: Colors.info,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.xs,
  },

  // Loading indicator
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  loadingText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  // Error banner
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },

  errorBannerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.error,
    fontWeight: Typography.weights.medium,
  },

  // Checkbox custom
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  checkboxChecked: {
    backgroundColor: Colors.info,
    borderColor: Colors.info,
  },

  checkboxIcon: {
    width: 12,
    height: 12,
    tintColor: Colors.text.inverse,
  },
});
