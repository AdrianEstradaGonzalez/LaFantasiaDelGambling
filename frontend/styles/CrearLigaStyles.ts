import { StyleSheet, Dimensions, Platform } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from './DesignSystem';

const { width } = Dimensions.get('window');

export const CrearLigaStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 80 : 100,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 200,
  },

  // 🎯 Header Elegante
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },

  title: {
    fontSize: Typography.sizes['4xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.text.primary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
  },

  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // 📋 Secciones Profesionales
  section: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    ...Shadows.medium,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  sectionIcon: {
    width: 24,
    height: 24,
    marginRight: Spacing.sm,
    tintColor: Colors.primary[600],
  },

  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    flex: 1,
  },

  sectionDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },

  // 🔤 Input Elegante
  inputContainer: {
    marginBottom: Spacing.lg,
  },

  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },

  input: {
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    ...Shadows.small,
  },

  inputFocused: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.background.primary,
  },

  inputError: {
    borderColor: Colors.error,
  },

  // 🔘 Botón Principal Elegante
  primaryButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },

  primaryButtonPressed: {
    backgroundColor: Colors.primary[700],
    transform: [{ scale: 0.98 }],
  },

  primaryButtonDisabled: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.primary,
  },

  primaryButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.inverse,
  },

  primaryButtonTextDisabled: {
    color: Colors.text.muted,
  },

  // 🔗 Botón Secundario
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonPressed: {
    backgroundColor: Colors.background.tertiary,
  },

  secondaryButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.secondary,
  },

  // 💡 Tips Section
  tipsContainer: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },

  tipsTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary[500],
    marginBottom: Spacing.xs,
  },

  tipsText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    lineHeight: 18,
  },

  // ⏳ Loading State
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    marginLeft: Spacing.sm,
  },

  // 🎊 Success State
  successContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },

  successIcon: {
    fontSize: 48,
    color: Colors.success,
    marginBottom: Spacing.md,
  },

  successTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },

  successText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // 🎯 Division Selector Buttons
  divisionButton: {
    flex: 1,
    backgroundColor: Colors.background.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },

  divisionButtonActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[500],
    ...Shadows.medium,
  },

  divisionButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
    textAlign: 'center',
  },

  divisionButtonTextActive: {
    color: Colors.text.primary,
  },
});
