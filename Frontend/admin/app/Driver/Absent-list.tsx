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
      // Present (non-Absent) always comes before Absent
      if (a.status === 'Absent' && b.status !== 'Absent') return 1;
      if (a.status !== 'Absent' && b.status === 'Absent') return -1;
      return 0;
    });

  // Summary counts
  const presentCount = students.filter((s) => s.status !== 'Absent').length;
  const absentCount  = students.filter((s) => s.status === 'Absent').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft color="black" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Students</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.blueContent}>

        {/* Summary row */}
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

        {/* Search */}
        <View style={styles.searchSection}>
          <Search color="#94A3B8" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List */}
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