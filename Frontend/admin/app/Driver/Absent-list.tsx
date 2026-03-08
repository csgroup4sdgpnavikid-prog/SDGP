import { AlertTriangle, CheckCircle2, ChevronLeft, Search, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getStudents } from './studentService';

const StudentCard = ({ item }: any) => {
  const isAbsent = item.status === 'Absent';

  const statusColor      = isAbsent ? '#EF4444' : '#22C55E';
  const badgeBackground  = statusColor + '20';
  const statusLabel      = isAbsent ? 'Absent' : 'Present';

  return (
    <View style={styles.card}>

      <View style={styles.avatarContainer}>
        <User color="black" size={40} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.idLabel}>Student ID: #{item.id}</Text>
      </View>

      <View style={styles.statusSection}>
        {/* Badge */}
        <View style={[styles.statusBadge, { backgroundColor: badgeBackground }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* Icon */}
        {isAbsent
          ? <AlertTriangle color="#EF4444" size={24} />
          : <CheckCircle2  color="#22C55E" size={24} />
        }
      </View>

    </View>
  );
};
export default function StudentsScreen() {
  const [students, setStudents]   = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const data = await getStudents();
      setStudents(data);
    };
    fetchData();
  }, []);

  const filtered = students
    .filter((s) => s.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      
      if (a.status === 'Absent' && b.status !== 'Absent') return 1;
      if (a.status !== 'Absent' && b.status === 'Absent') return -1;
      return 0;
    });

  
  const presentCount = students.filter((s) => s.status !== 'Absent').length;
  const absentCount  = students.filter((s) => s.status === 'Absent').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft color="black" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Students</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.blueContent}>

        
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle2 color="#22C55E" size={20} />
            <Text style={[styles.summaryCount, { color: '#22C55E' }]}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' }]}>
            <AlertTriangle color="#EF4444" size={20} />
            <Text style={[styles.summaryCount, { color: '#EF4444' }]}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
        </View>

        
        <View style={styles.searchSection}>
          <Search color="#94A3B8" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        
        <FlatList
          data={filtered}
          renderItem={({ item }) => <StudentCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students found.</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  blueContent: {
    flex: 1,
    backgroundColor: '#8ECAE6',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  searchSection: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 15,
    marginVertical: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  idLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
    fontSize: 15,
  },
});