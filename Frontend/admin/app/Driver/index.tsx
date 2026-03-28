import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DriverHomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.greeting}>Welcome!</Text>
        <Text style={styles.title}>Driver Dashboard</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Route</Text>
          <Text style={styles.cardText}>No active trips</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Students</Text>
          <Text style={styles.cardText}>View your assigned students</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    padding: 20,
    backgroundColor: '#0f172a',
  },
  greeting: {
    fontSize: 16,
    color: '#94a3b8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#64748b',
  },
});
