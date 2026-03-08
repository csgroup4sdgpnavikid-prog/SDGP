import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const EnterRouteScreen = () => {
  const vanData = [
    { id: 1, borderColors: ['#3919ee', '#FFC107'] },
    { id: 2, borderColors: ['#FFC107', '#2196F3'] },
    { id: 3, borderColors: ['#2196F3', '#64B5F6'] },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Enter The Route</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Route Input */}
      <View style={styles.routeInputContainer}>
        <View style={styles.routeInput}>
          <MaterialIcons name="route" size={20} color="#666" />
          <Text style={styles.routeInputText}>Route(Start - end)</Text>
        </View>
      </View>

      {/* View Van Details Section */}
      <Text style={styles.sectionTitle}>View Van Details</Text>

      {/* Scrollable Van Cards */}
      <ScrollView
        style={styles.vanScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.vanScrollContent}
      >
        {vanData.map((van) => (
          <View
            key={van.id}
            style={[
              styles.vanCard,
              {
                borderLeftColor: van.borderColors[0],
                borderRightColor: van.borderColors[1],
                borderTopColor: van.borderColors[0],
                borderBottomColor: van.borderColors[1],
              }
            ]}
          >
            <View style={styles.vanCardContent}>
              <View style={styles.vanDetails}>
                <Text style={styles.vanLabel}>Van Number</Text>
                <Text style={styles.vanLabel}>Van route</Text>
                <Text style={styles.vanLabel}>Van Driver Name</Text>
              </View>
              <View style={styles.vanIconContainer}>
                <View style={styles.profileIcon}>
                  <Ionicons name="person-outline" size={28} color="#666" />
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 30,

  },
  placeholder: {
    width: 32,
  },
  routeInputContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
    marginTop: 20,
  },
  routeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeInputText: {
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  vanScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  vanScrollContent: {
    paddingBottom: 20,
  },
  vanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  vanCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  vanDetails: {
    flex: 1,
  },
  vanLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  vanIconContainer: {
    marginLeft: 16,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bottomContainer: {
  paddingHorizontal: 20,
  paddingVertical: 16,
  paddingBottom: 30,
  borderTopWidth: 1,
  borderTopColor: '#E0E0E0',
},
  confirmButton: {
    backgroundColor: '#7EC8E3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default EnterRouteScreen;
