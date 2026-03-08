import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  Search,
  Square,
  CheckSquare,
} from "lucide-react-native";

interface Payment {
  id: number;
  studentName: string;
  parent: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: "paid" | "pending" | "overdue";
  method: string | null;
  month: string;
  route: string;
}

type FilterType = "all" | "paid" | "pending" | "overdue";

export default function Payment() {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null);

  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 1,
      studentName: "Emma Johnson",
      parent: "Sarah Johnson",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 2",
    },
    {
      id: 2,
      studentName: "Lucas Brown",
      parent: "Michael Brown",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 1",
    },
    {
      id: 3,
      studentName: "Sophia Davis",
      parent: "Jennifer Davis",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 3",
    },
    {
      id: 4,
      studentName: "Mason Wilson",
      parent: "David Wilson",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 2",
    },
    {
      id: 5,
      studentName: "Olivia Miller",
      parent: "Lisa Miller",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 1",
    },
    {
      id: 6,
      studentName: "Noah Garcia",
      parent: "Carlos Garcia",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 3",
    },
    {
      id: 7,
      studentName: "Ava Martinez",
      parent: "Maria Martinez",
      amount: 120.0,
      dueDate: "2024-12-01",
      paidDate: null,
      status: "pending",
      method: null,
      month: "December 2024",
      route: "Route 2",
    },
  ]);

  const handleCheckboxPress = (payment: Payment) => {
    console.log("Checkbox pressed for:", payment.studentName);

    // If already paid, don't do anything
    if (payment.status === "paid") {
      return;
    }

    // Immediately update to paid for instant visual feedback
    setPayments((prevPayments) =>
      prevPayments.map((p) =>
        p.id === payment.id
          ? { ...p, status: "paid" as const, paidDate: new Date().toISOString() }
          : p,
      ),
    );

    // Store the payment and show confirmation modal
    setPendingPayment(payment);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    console.log("Confirmed - keeping as paid");
    setShowConfirmation(false);
    setPendingPayment(null);
  };

  const handleCancel = () => {
    console.log("Cancelled - reverting to unpaid");
    if (pendingPayment) {
      setPayments((prevPayments) =>
        prevPayments.map((p) =>
          p.id === pendingPayment.id
            ? { ...p, status: "pending" as const, paidDate: null }
            : p,
        ),
      );
    }
    setShowConfirmation(false);
    setPendingPayment(null);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "paid" && payment.status === "paid") ||
      (selectedFilter === "pending" && payment.status === "pending") ||
      (selectedFilter === "overdue" && payment.status === "overdue");

    const matchesSearch = payment.studentName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: Payment["status"]): string => {
    switch (status) {
      case "paid":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "overdue":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: Payment["status"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={16} color="#10B981" />;
      case "pending":
        return <Clock size={16} color="#F59E0B" />;
      case "overdue":
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStatusText = (status: Payment["status"]): string => {
    switch (status) {
      case "paid":
        return "Paid";
      case "pending":
        return "Pending";
      case "overdue":
        return "Overdue";
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not paid";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPaid = payments.filter((p) => p.status === "paid").length;
  const totalAmount = payments.reduce(
    (sum, p) => (p.status === "paid" ? sum + p.amount : sum),
    0,
  );
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const overdueCount = payments.filter((p) => p.status === "overdue").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}>
          Payments
        </Text>
        <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 4 }}>
          December 2024 • {totalPaid}/{payments.length} paid
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Summary Cards */}
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: "row", marginBottom: 20 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#fff",
                padding: 16,
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                Total Paid This Month
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                ${totalAmount.toFixed(0)}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#fff",
                padding: 16,
                borderRadius: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
                Students Paid
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                {totalPaid} / {payments.length}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: "#fff",
              padding: 16,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
              Outstanding Amount
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#111827",
              }}
            >
              ${((payments.length - totalPaid) * 120).toFixed(0)}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F3F4F6",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Search size={20} color="#6B7280" />
              <Text
                style={{
                  fontSize: 16,
                  color: "#9CA3AF",
                  marginLeft: 8,
                }}
              >
                Find a student
              </Text>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={{ flexDirection: "row" }}>
            {[
              { key: "all", label: "All" },
              { key: "paid", label: "Paid" },
              { key: "unpaid", label: "Unpaid" },
            ].map((filter, index) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() =>
                  setSelectedFilter(
                    filter.key === "unpaid" ? "pending" : (filter.key as FilterType),
                  )
                }
                style={{
                  backgroundColor:
                    selectedFilter === filter.key ||
                    (filter.key === "unpaid" && selectedFilter === "pending")
                      ? "#2563EB"
                      : "#E5E7EB",
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginRight: index < 2 ? 8 : 0,
                }}
              >
                <Text
                  style={{
                    color:
                      selectedFilter === filter.key ||
                      (filter.key === "unpaid" && selectedFilter === "pending")
                        ? "#fff"
                        : "#6B7280",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payments List */}
        <View style={{ paddingHorizontal: 20 }}>
          {filteredPayments.map((payment) => (
            <View
              key={payment.id}
              style={{
                backgroundColor: "#fff",
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* Checkbox */}
              <TouchableOpacity
                onPress={() => handleCheckboxPress(payment)}
                style={{ marginRight: 12 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {payment.status === "paid" ? (
                  <CheckSquare size={24} color="#2563EB" />
                ) : (
                  <Square size={24} color="#9CA3AF" />
                )}
              </TouchableOpacity>

              {/* Profile Circle */}
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#E5E7EB",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "#6B7280" }}
                >
                  {payment.studentName.charAt(0)}
                </Text>
              </View>

              {/* Student Info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  {payment.studentName}
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280" }}>
                  {payment.route}
                </Text>
              </View>

              {/* Status */}
              <View style={{ alignItems: "flex-end" }}>
                {payment.status === "paid" ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#10B981",
                        marginRight: 6,
                      }}
                    />
                    <Text style={{ fontSize: 14, color: "#6B7280" }}>Paid</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#F59E0B",
                        marginRight: 6,
                      }}
                    />
                    <Text style={{ fontSize: 14, color: "#6B7280" }}>
                      Unpaid
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {filteredPayments.length === 0 && (
            <View
              style={{
                backgroundColor: "#fff",
                padding: 40,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <DollarSign size={40} color="#6B7280" />
              <Text
                style={{
                  fontSize: 16,
                  color: "#6B7280",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                No payments found for this filter
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Payment Received
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#6B7280",
                marginBottom: 24,
              }}
            >
              Send payment received notification for{" "}
              {pendingPayment?.studentName}?
            </Text>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={handleCancel}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#6B7280",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  flex: 1,
                  backgroundColor: "#2563EB",
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}