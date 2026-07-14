import { StyleSheet, Text, View } from 'react-native';
import { RnButton } from '../RnButton';

export interface RnCardProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Card built from View/Text — exercises StyleSheet + nested RN layout in PropLab.
 */
export function RnCard({
  title,
  body = 'Presentational Expo/RN components can preview when react-native-web is installed.',
  actionLabel = 'Continue',
  onAction,
}: RnCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.footer}>
        <RnButton label={actionLabel} onPress={onAction} />
      </View>
    </View>
  );
}

export default RnCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd8cf',
    padding: 16,
    gap: 10,
    maxWidth: 360,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1814',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6f6a62',
  },
  footer: {
    marginTop: 4,
  },
});
