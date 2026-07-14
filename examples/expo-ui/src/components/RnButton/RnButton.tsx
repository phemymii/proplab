import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type RnButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface RnButtonProps {
  label: string;
  variant?: RnButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Simple RN button — should preview via react-native-web in PropLab.
 */
export function RnButton({
  label,
  variant = 'primary',
  disabled = false,
  onPress,
  style,
}: RnButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.labelDark]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default RnButton;

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  primary: { backgroundColor: '#3d4f5f' },
  secondary: { backgroundColor: '#e5e9ec' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  labelDark: { color: '#3d4f5f' },
});
