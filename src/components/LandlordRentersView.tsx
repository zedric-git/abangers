"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Building2,
  Calendar,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Receipt,
  AlertCircle,
  Check,
  Plus,
  Pencil,
  Trash2,
  Bell,
  CreditCard,
  Zap,
  Droplet,
  Home,
  Wifi,
  Wrench,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BillCategory =
  "rent" | "electricity" | "water" | "internet" | "maintenance";

export interface UtilityBill {
  id: string;
  category: BillCategory;
  label: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: "paid" | "due" | "overdue";
  note?: string;
}

export interface TenantRecord {
  id: string;
  renterName: string;
  avatar: string;
  avatarColor: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyTitle: string;
  room: string;
  monthlyRent: number;
  bookedAt: string;
  status: "confirmed";
  paymentStatus: "paid" | "overdue";
  nextDueDate: string;
  depositsHeld: number;
  depositsCoverage: string;
  leaseDuration: string;
  leasePeriod: string;
  bills: UtilityBill[];
  lastPayment?: {
    amount: number;
    item: string;
    method: string;
    date: string;
    refNumber: string;
  };
}

export interface InterestedRenterRecord {
  id: string;
  renterName: string;
  avatar: string;
  avatarColor: string;
  email: string;
  phone: string;
  propertyId: string;
  propertyTitle: string;
  room: string;
  requestedDate: string;
  requestedTime: string;
  status: "pending" | "confirmed";
  notes?: string;
}

const sampleTenants: TenantRecord[] = [
  {
    id: "TNT-01",
    renterName: "Camille Prats Mendoza",
    avatar: "CM",
    avatarColor: "bg-purple-600",
    email: "camille.mendoza@ust.edu.ph",
    phone: "+63 917 204 8819",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 201 (Bed A)",
    monthlyRent: 4200,
    bookedAt: "Aug 01, 2026",
    status: "confirmed",
    paymentStatus: "paid",
    nextDueDate: "2026-11-05",
    depositsHeld: 8400,
    depositsCoverage: "1 Mo. Advance + 1 Mo. Deposit",
    leaseDuration: "10 Months Active",
    leasePeriod: "Aug 2026 – May 2027",
    bills: [
      {
        id: "BILL-01",
        category: "rent",
        label: "Monthly Rent (October)",
        amount: 4200,
        dueDate: "2026-10-05",
        status: "paid",
        note: "Standard monthly room rent",
      },
      {
        id: "BILL-02",
        category: "electricity",
        label: "Electricity (Oct Sub-meter)",
        amount: 850,
        dueDate: "2026-11-05",
        status: "due",
        note: "Sub-meter reading: 71 kWh @ ₱12/kWh",
      },
      {
        id: "BILL-03",
        category: "water",
        label: "Water Utility (October)",
        amount: 250,
        dueDate: "2026-11-05",
        status: "due",
        note: "Reading: 8 cu.m",
      },
      {
        id: "BILL-04",
        category: "internet",
        label: "High-Speed Wi-Fi Share",
        amount: 200,
        dueDate: "2026-10-05",
        status: "paid",
        note: "Monthly fiber Wi-Fi",
      },
    ],
    lastPayment: {
      amount: 4200,
      item: "Monthly Rent (October)",
      method: "GCash",
      date: "Oct 03, 2026 at 2:15 PM",
      refNumber: "Ref #9028144",
    },
  },
  {
    id: "TNT-02",
    renterName: "Carlo Aquino Bautista",
    avatar: "CB",
    avatarColor: "bg-blue-600",
    email: "carlo.bautista@up.edu.ph",
    phone: "+63 918 662 3104",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    room: "Unit 2A (Solo Studio)",
    monthlyRent: 8500,
    bookedAt: "Jun 15, 2026",
    status: "confirmed",
    paymentStatus: "overdue",
    nextDueDate: "2026-10-05",
    depositsHeld: 17000,
    depositsCoverage: "2 Months Security Deposit",
    leaseDuration: "1 Year Contract",
    leasePeriod: "Jun 2026 – Jun 2027",
    bills: [
      {
        id: "BILL-11",
        category: "rent",
        label: "Monthly Rent (October)",
        amount: 8500,
        dueDate: "2026-10-05",
        status: "overdue",
        note: "Overdue by 6 days",
      },
      {
        id: "BILL-12",
        category: "electricity",
        label: "Electricity (Meralco Sub-meter)",
        amount: 1420,
        dueDate: "2026-10-05",
        status: "overdue",
        note: "Sub-meter reading: 118 kWh",
      },
      {
        id: "BILL-13",
        category: "water",
        label: "Water Utility",
        amount: 380,
        dueDate: "2026-10-05",
        status: "overdue",
        note: "Maynilad share",
      },
    ],
    lastPayment: {
      amount: 8500,
      item: "Monthly Rent (September)",
      method: "Bank Transfer",
      date: "Sep 05, 2026 at 9:30 AM",
      refNumber: "Ref #7190245",
    },
  },
  {
    id: "TNT-03",
    renterName: "Nadine Lustre Pascual",
    avatar: "NP",
    avatarColor: "bg-emerald-600",
    email: "nadine.pascual@feu.edu.ph",
    phone: "+63 995 441 7720",
    propertyId: "PROP-3",
    propertyTitle: "Morayta Courtyard Dorm",
    room: "Room 101 (Bed C)",
    monthlyRent: 3500,
    bookedAt: "Jul 01, 2026",
    status: "confirmed",
    paymentStatus: "paid",
    nextDueDate: "2026-11-01",
    depositsHeld: 7000,
    depositsCoverage: "1 Mo. Advance + 1 Mo. Deposit",
    leaseDuration: "1 Year Contract",
    leasePeriod: "Jul 2026 – Jun 2027",
    bills: [
      {
        id: "BILL-21",
        category: "rent",
        label: "Monthly Rent (October)",
        amount: 3500,
        dueDate: "2026-10-01",
        status: "paid",
        note: "Bedspace Room 101 Bed C",
      },
      {
        id: "BILL-22",
        category: "water",
        label: "Water Utility (October)",
        amount: 200,
        dueDate: "2026-11-01",
        status: "due",
        note: "Monthly fixed water share",
      },
    ],
    lastPayment: {
      amount: 3500,
      item: "Monthly Rent (October)",
      method: "Maya",
      date: "Oct 01, 2026 at 10:45 AM",
      refNumber: "Ref #8821034",
    },
  },
  {
    id: "TNT-04",
    renterName: "Enrique Gil Ramos",
    avatar: "ER",
    avatarColor: "bg-amber-600",
    email: "enrique.ramos@dlsu.edu.ph",
    phone: "+63 920 114 9901",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 302 (Single)",
    monthlyRent: 6000,
    bookedAt: "Sep 01, 2026",
    status: "confirmed",
    paymentStatus: "paid",
    nextDueDate: "2026-11-01",
    depositsHeld: 12000,
    depositsCoverage: "1 Mo. Advance + 1 Mo. Deposit",
    leaseDuration: "1 Year Contract",
    leasePeriod: "Sep 2026 – Aug 2027",
    bills: [
      {
        id: "BILL-31",
        category: "rent",
        label: "Monthly Rent (October)",
        amount: 6000,
        dueDate: "2026-10-01",
        status: "paid",
        note: "Single Room 302",
      },
      {
        id: "BILL-32",
        category: "electricity",
        label: "Electricity (Oct Sub-meter)",
        amount: 1150,
        dueDate: "2026-11-01",
        status: "due",
        note: "Sub-meter reading: 96 kWh @ ₱12/kWh",
      },
    ],
    lastPayment: {
      amount: 6000,
      item: "Monthly Rent (October)",
      method: "Bank Transfer",
      date: "Oct 01, 2026 at 3:30 PM",
      refNumber: "Ref #7190245",
    },
  },
];

const sampleInterestedRenters: InterestedRenterRecord[] = [
  {
    id: "INT-01",
    renterName: "Maria Clara Santos",
    avatar: "MS",
    avatarColor: "bg-purple-600",
    email: "mariaclara.santos@ust.edu.ph",
    phone: "+63 917 842 1109",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 204 • Female Bedspace",
    requestedDate: "Oct 20, 2026",
    requestedTime: "2:00 PM – 2:30 PM",
    status: "pending",
    notes: "Inquired about quiet study environment near UST Hospital.",
  },
  {
    id: "INT-02",
    renterName: "Joshua Dela Cruz",
    avatar: "JD",
    avatarColor: "bg-blue-600",
    email: "joshua.dc@gmail.com",
    phone: "+63 918 339 4021",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio",
    room: "Unit 3B • Solo Studio",
    requestedDate: "Oct 21, 2026",
    requestedTime: "10:30 AM – 11:00 AM",
    status: "pending",
    notes: "Checking fiber internet speed and motorcycle parking.",
  },
  {
    id: "INT-03",
    renterName: "Rafael Gabriel Tan",
    avatar: "RT",
    avatarColor: "bg-indigo-600",
    email: "rafael.tan@outlook.com",
    phone: "+63 920 551 2290",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites",
    room: "Room 302 • Solo Room",
    requestedDate: "Oct 19, 2026",
    requestedTime: "1:00 PM – 1:30 PM",
    status: "confirmed",
    notes: "Confirmed physical viewing slot.",
  },
];

export default function LandlordRentersView() {
  const [tenants, setTenants] = useState<TenantRecord[]>(sampleTenants);
  const [interestedRenters] = useState<InterestedRenterRecord[]>(
    sampleInterestedRenters,
  );
  const [activeTab, setActiveTab] = useState<"tenants" | "interested">(
    "tenants",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");

  // Slide-over Dossier State
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Modal States
  const [isReminderSummaryOpen, setIsReminderSummaryOpen] = useState(false);
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [editingBillIndex, setEditingBillIndex] = useState<number | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Add Bill Modal State
  const [newBillCategory, setNewBillCategory] =
    useState<BillCategory>("electricity");
  const [newBillAmount, setNewBillAmount] = useState<string>("");
  const [newBillDueDate, setNewBillDueDate] = useState<string>("2026-11-05");
  const [newBillNote, setNewBillNote] = useState<string>("");
  const [addBillError, setAddBillError] = useState<string | null>(null);

  // Edit Bill Modal State
  const [editBillLabel, setEditBillLabel] = useState<string>("");
  const [editBillAmount, setEditBillAmount] = useState<string>("");
  const [editBillStatus, setEditBillStatus] = useState<
    "paid" | "due" | "overdue"
  >("due");
  const [editBillDueDate, setEditBillDueDate] = useState<string>("");
  const [editBillNote, setEditBillNote] = useState<string>("");
  const [editBillError, setEditBillError] = useState<string | null>(null);

  // Record Payment Modal State
  const [paymentBillId, setPaymentBillId] = useState<string>("all");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("GCash");
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("2026-11-05");
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<
    string | null
  >(null);

  const filteredTenants = tenants.filter((t) => {
    const matchesProp =
      propertyFilter === "all" || t.propertyId === propertyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.renterName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.propertyTitle.toLowerCase().includes(q) ||
      t.room.toLowerCase().includes(q);
    return matchesProp && matchesSearch;
  });

  const filteredInterested = interestedRenters.filter((r) => {
    const matchesProp =
      propertyFilter === "all" || r.propertyId === propertyFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.renterName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.propertyTitle.toLowerCase().includes(q) ||
      r.room.toLowerCase().includes(q);
    return matchesProp && matchesSearch;
  });

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId) ?? null;
  const currentFilteredIndex = selectedTenant
    ? filteredTenants.findIndex((t) => t.id === selectedTenant.id)
    : -1;

  const navigateTenant = (direction: number) => {
    if (filteredTenants.length === 0 || currentFilteredIndex === -1) return;
    let nextIndex = currentFilteredIndex + direction;
    if (nextIndex < 0) nextIndex = filteredTenants.length - 1;
    if (nextIndex >= filteredTenants.length) nextIndex = 0;
    setSelectedTenantId(filteredTenants[nextIndex].id);
  };

  // Keyboard navigation & Esc key handling
  useEffect(() => {
    if (!selectedTenantId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If a modal is open, let Esc close that modal first
      if (
        isReminderSummaryOpen ||
        isAddBillOpen ||
        editingBillIndex !== null ||
        isRecordPaymentOpen
      ) {
        if (e.key === "Escape") {
          setIsReminderSummaryOpen(false);
          setIsAddBillOpen(false);
          setEditingBillIndex(null);
          setIsRecordPaymentOpen(false);
        }
        return;
      }

      if (e.key === "Escape") {
        setSelectedTenantId(null);
      } else if (e.key === "ArrowLeft") {
        if (filteredTenants.length === 0 || currentFilteredIndex === -1) return;
        let nextIndex = currentFilteredIndex - 1;
        if (nextIndex < 0) nextIndex = filteredTenants.length - 1;
        setSelectedTenantId(filteredTenants[nextIndex].id);
      } else if (e.key === "ArrowRight") {
        if (filteredTenants.length === 0 || currentFilteredIndex === -1) return;
        let nextIndex = currentFilteredIndex + 1;
        if (nextIndex >= filteredTenants.length) nextIndex = 0;
        setSelectedTenantId(filteredTenants[nextIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedTenantId,
    filteredTenants,
    currentFilteredIndex,
    isReminderSummaryOpen,
    isAddBillOpen,
    editingBillIndex,
    isRecordPaymentOpen,
  ]);

  // Handle switching category in Add Bill modal:
  // Rent automatically pre-fills the tenant's monthly rent (editable),
  // while utilities start empty for manual typing.
  const handleSelectNewBillCategory = (cat: BillCategory) => {
    setNewBillCategory(cat);
    setAddBillError(null);
    if (!selectedTenant) return;

    if (cat === "rent") {
      setNewBillAmount(selectedTenant.monthlyRent.toString());
      setNewBillNote("Monthly Room Rental Due");
    } else if (cat === "electricity") {
      setNewBillAmount("");
      setNewBillNote("");
    } else if (cat === "water") {
      setNewBillAmount("");
      setNewBillNote("");
    } else if (cat === "internet") {
      setNewBillAmount("");
      setNewBillNote("");
    } else {
      setNewBillAmount("");
      setNewBillNote("");
    }
  };

  const handleOpenAddBillModal = () => {
    if (!selectedTenant) return;
    handleSelectNewBillCategory("electricity");
    setNewBillDueDate("2026-11-05");
    setIsAddBillOpen(true);
  };

  const handleSaveNewBill = () => {
    if (!selectedTenant) return;
    const amountNum = parseFloat(newBillAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAddBillError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!newBillDueDate) {
      setAddBillError("Please choose a payment due date.");
      return;
    }

    const categoryLabels: Record<BillCategory, string> = {
      rent: "Monthly Rent",
      electricity: "Electricity Utility",
      water: "Water Utility",
      internet: "High-Speed Wi-Fi",
      maintenance: "Maintenance Fee",
    };

    const newBill: UtilityBill = {
      id: `BILL-${Date.now()}`,
      category: newBillCategory,
      label: categoryLabels[newBillCategory],
      amount: amountNum,
      dueDate: newBillDueDate,
      status: "due",
      note: newBillNote.trim() || undefined,
    };

    setTenants((prev) =>
      prev.map((t) =>
        t.id === selectedTenant.id ? { ...t, bills: [...t.bills, newBill] } : t,
      ),
    );

    setIsAddBillOpen(false);
    setAddBillError(null);
  };

  // Open Edit Bill Modal (Click-to-edit)
  const handleOpenEditBillModal = (index: number) => {
    if (!selectedTenant) return;
    const bill = selectedTenant.bills[index];
    if (!bill) return;

    setEditingBillIndex(index);
    setEditBillLabel(bill.label);
    setEditBillAmount(bill.amount.toString());
    setEditBillStatus(bill.status);
    setEditBillDueDate(bill.dueDate);
    setEditBillNote(bill.note || "");
    setEditBillError(null);
  };

  const handleSaveEditBill = () => {
    if (!selectedTenant || editingBillIndex === null) return;
    const amountNum = parseFloat(editBillAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEditBillError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!editBillDueDate) {
      setEditBillError("Please choose a payment due date.");
      return;
    }

    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTenant.id) return t;
        const updatedBills = [...t.bills];
        updatedBills[editingBillIndex] = {
          ...updatedBills[editingBillIndex],
          label: editBillLabel.trim() || updatedBills[editingBillIndex].label,
          amount: amountNum,
          status: editBillStatus,
          dueDate: editBillDueDate,
          note: editBillNote.trim() || undefined,
        };
        return { ...t, bills: updatedBills };
      }),
    );

    setEditingBillIndex(null);
    setEditBillError(null);
  };

  const handleDeleteBill = () => {
    if (!selectedTenant || editingBillIndex === null) return;
    if (confirm("Are you sure you want to remove this bill item?")) {
      setTenants((prev) =>
        prev.map((t) => {
          if (t.id !== selectedTenant.id) return t;
          const updatedBills = t.bills.filter(
            (_, idx) => idx !== editingBillIndex,
          );
          return { ...t, bills: updatedBills };
        }),
      );
      setEditingBillIndex(null);
    }
  };

  // Open Record Payment Modal
  const handleOpenRecordPaymentModal = () => {
    if (!selectedTenant) return;
    const unpaidBills = selectedTenant.bills.filter((b) => b.status !== "paid");
    if (unpaidBills.length > 0) {
      setPaymentBillId(unpaidBills[0].id);
      setPaymentAmount(unpaidBills[0].amount.toString());
    } else {
      setPaymentBillId("all");
      setPaymentAmount(selectedTenant.monthlyRent.toString());
    }
    setPaymentMethod("GCash");
    setPaymentRefNumber("Ref #REC-8842103");
    setPaymentDate("2026-11-05");
    setIsRecordPaymentOpen(true);
  };

  const handleSaveRecordPayment = () => {
    if (!selectedTenant) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTenant.id) return t;

        let updatedBills = [...t.bills];
        let settledItemName = "Payment";

        if (paymentBillId === "all") {
          updatedBills = updatedBills.map((b) => ({ ...b, status: "paid" }));
          settledItemName = "All Dues & Utilities";
        } else {
          updatedBills = updatedBills.map((b) => {
            if (b.id === paymentBillId) {
              settledItemName = b.label;
              return { ...b, status: "paid" };
            }
            return b;
          });
        }

        return {
          ...t,
          bills: updatedBills,
          paymentStatus: "paid",
          lastPayment: {
            amount: amountNum,
            item: settledItemName,
            method: paymentMethod,
            date: `${paymentDate} at 12:00 PM`,
            refNumber: paymentRefNumber || "Cash Receipt",
          },
        };
      }),
    );

    setIsRecordPaymentOpen(false);
    setPaymentSuccessNotice(
      `Payment of ₱${amountNum.toLocaleString()} successfully recorded for ${selectedTenant.renterName}!`,
    );
    setTimeout(() => setPaymentSuccessNotice(null), 4000);
  };

  const getCategoryIcon = (category: BillCategory) => {
    switch (category) {
      case "rent":
        return (
          <Home className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        );
      case "electricity":
        return <Zap className="h-4 w-4 text-amber-500" />;
      case "water":
        return <Droplet className="h-4 w-4 text-blue-500" />;
      case "internet":
        return <Wifi className="h-4 w-4 text-emerald-500" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-zinc-500" />;
      default:
        return <Receipt className="h-4 w-4 text-purple-500" />;
    }
  };

  const unpaidBills =
    selectedTenant?.bills.filter((b) => b.status !== "paid") || [];
  const totalUnpaidAmount = unpaidBills.reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="w-full space-y-6">
      {/* Toast Notice */}
      {paymentSuccessNotice && (
        <div
          role="status"
          className="fixed top-5 right-5 z-60 flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-xl dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{paymentSuccessNotice}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-zinc-400 dark:text-zinc-500">Landlord</span>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            Renter Management
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Renter Management
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
            <Users className="h-3.5 w-3.5" />
            {tenants.length} Active Tenants
          </span>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Two Main Tabs */}
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-xs font-semibold dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "tenants"
                  ? "bg-white text-purple-700 shadow-xs dark:bg-zinc-900 dark:text-purple-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Current Tenants</span>
              <span className="py-0.2 rounded-full bg-purple-100 px-1.5 text-[11px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                {tenants.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("interested")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                activeTab === "interested"
                  ? "bg-white text-purple-700 shadow-xs dark:bg-zinc-900 dark:text-purple-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Interested Renters</span>
              <span className="py-0.2 rounded-full bg-zinc-200 px-1.5 text-[11px] font-bold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                {interestedRenters.length}
              </span>
            </button>
          </div>

          {/* Property Selector */}
          <div className="w-full sm:w-56">
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-10 rounded-xl border-zinc-200 bg-white text-xs font-medium text-zinc-700 shadow-xs focus-visible:ring-purple-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                <SelectItem value="PROP-1">Sampaloc Scholar Suites</SelectItem>
                <SelectItem value="PROP-2">Katipunan Prime Studio</SelectItem>
                <SelectItem value="PROP-3">Morayta Courtyard Dorm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder={
              activeTab === "tenants"
                ? "Search tenants by name, email, property, or room..."
                : "Search interested renters by name, email, or property..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-10 text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:ring-purple-400"
          />
        </div>
      </div>

      {/* Tab 1: Current Tenants */}
      {activeTab === "tenants" && (
        <div className="space-y-3.5">
          {filteredTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Users className="h-8 w-8 text-zinc-400" />
              <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No tenants found
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? "No current tenants match your search filter."
                  : "You do not have any confirmed tenants yet."}
              </p>
            </div>
          ) : (
            filteredTenants.map((t) => {
              const isSelected = selectedTenantId === t.id;
              const pendingUtilityCount = t.bills.filter(
                (b) => b.status !== "paid" && b.category !== "rent",
              ).length;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTenantId(t.id)}
                  className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:border-purple-300 dark:bg-zinc-900 ${
                    isSelected
                      ? "border-purple-500 ring-2 ring-purple-500/20 dark:border-purple-500"
                      : "border-zinc-200 hover:border-purple-200 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${t.avatarColor}`}
                      >
                        {t.avatar}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                            {t.renterName}
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Confirmed Tenant
                          </span>
                          {t.paymentStatus === "paid" ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Rent Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Payment Overdue (₱{t.monthlyRent.toLocaleString()}
                              )
                            </span>
                          )}
                          {pendingUtilityCount > 0 && (
                            <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-300">
                              {pendingUtilityCount} Pending Utility Due
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-purple-500" />
                            {t.propertyTitle} ({t.room})
                          </span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            ₱{t.monthlyRent.toLocaleString()} / mo
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {t.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {t.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Booked: {t.bookedAt}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTenantId(t.id);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>View Payment Details</span>
                        <ChevronRight className="h-3.5 w-3.5 text-purple-500" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Message window for ${t.renterName}`);
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Interested Renters */}
      {activeTab === "interested" && (
        <div className="space-y-3.5">
          {filteredInterested.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <Clock className="h-8 w-8 text-zinc-400" />
              <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No interested renters found
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? "No viewing inquiries match your search filter."
                  : "You have no active viewing requests from interested renters."}
              </p>
            </div>
          ) : (
            filteredInterested.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition-all hover:border-purple-200 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${r.avatarColor}`}
                  >
                    {r.avatar}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        {r.renterName}
                      </h3>
                      {r.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Viewing Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" />
                          Pending Request
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-purple-500" />
                        {r.propertyTitle} ({r.room})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        Requested: {r.requestedDate} • {r.requestedTime}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {r.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {r.phone}
                      </span>
                    </div>

                    {r.notes && (
                      <p className="pt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <strong className="text-zinc-700 dark:text-zinc-300">
                          Inquiry Note:
                        </strong>{" "}
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() => alert(`Message window for ${r.renterName}`)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 hover:text-purple-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message Renter
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SLIDE-OVER DOSSIER DRAWER */}
      {selectedTenant && (
        <>
          {/* Backdrop */}
          <div
            className="backdrop-blur-2xs fixed inset-0 z-40 bg-black/40 transition-opacity"
            onClick={() => setSelectedTenantId(null)}
          />

          {/* Drawer Container */}
          <aside
            aria-label="Payment and lease dossier"
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col justify-between border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Header with Navigation Stepper & Close */}
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateTenant(-1)}
                  title="Previous Tenant (←)"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {currentFilteredIndex + 1} of {filteredTenants.length}
                </span>
                <button
                  type="button"
                  onClick={() => navigateTenant(1)}
                  title="Next Tenant (→)"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 uppercase dark:bg-purple-950/60 dark:text-purple-300">
                  Payment Dossier
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTenantId(null)}
                  title="Close (Esc)"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Dossier Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              {/* Tenant Identity Card */}
              <div className="flex items-start gap-3.5 rounded-2xl border border-purple-200/50 bg-purple-50/60 p-4 dark:border-purple-800/40 dark:bg-purple-950/40">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xs ${selectedTenant.avatarColor}`}
                >
                  {selectedTenant.avatar}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {selectedTenant.renterName}
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {selectedTenant.propertyTitle} ({selectedTenant.room})
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <a
                      href={`tel:${selectedTenant.phone}`}
                      className="flex items-center gap-1 font-semibold text-zinc-800 hover:underline dark:text-zinc-200"
                    >
                      <Phone className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      {selectedTenant.phone}
                    </a>
                    <a
                      href={`mailto:${selectedTenant.email}`}
                      className="flex items-center gap-1 hover:underline"
                    >
                      <Mail className="h-3 w-3 text-zinc-400" />
                      {selectedTenant.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Itemized Dues & Utilities Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                      Itemized Dues & Utility Bills
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Click any bill to edit fee or status
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddBillModal}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Bill Utility</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedTenant.bills.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-zinc-400 dark:border-zinc-800">
                      No active bills recorded.
                    </div>
                  ) : (
                    selectedTenant.bills.map((bill, index) => {
                      let statusBadge = null;
                      if (bill.status === "paid") {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Paid
                          </span>
                        );
                      } else if (bill.status === "overdue") {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            Overdue
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Due Soon
                          </span>
                        );
                      }

                      return (
                        <div
                          key={bill.id}
                          onClick={() => handleOpenEditBillModal(index)}
                          title="Click to edit fee or bill status"
                          className="group flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs transition-all hover:border-purple-400 hover:bg-purple-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-purple-600 dark:hover:bg-purple-950/20"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                              {getCategoryIcon(bill.category)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-zinc-900 group-hover:text-purple-900 dark:text-zinc-100 dark:group-hover:text-purple-300">
                                  {bill.label}
                                </span>
                                {statusBadge}
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                {bill.note ? `${bill.note} • ` : ""}Due:{" "}
                                {bill.dueDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                bill.status === "overdue"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              ₱{bill.amount.toLocaleString()}
                            </span>
                            <Pencil className="h-3.5 w-3.5 text-zinc-400 group-hover:text-purple-600 dark:text-zinc-500 dark:group-hover:text-purple-400" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Deposits & Lease Agreement Details */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                    Deposits Held
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      ₱{selectedTenant.depositsHeld.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      (Held)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {selectedTenant.depositsCoverage}
                  </p>
                </div>

                <div className="space-y-1 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="block text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                    Lease Agreement
                  </span>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedTenant.leaseDuration}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {selectedTenant.leasePeriod}
                  </p>
                </div>
              </div>

              {/* Recent Payment / Receipt Card */}
              {selectedTenant.lastPayment && (
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                      Latest Recorded Payment
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Official Receipt
                    </span>
                  </div>
                  <div className="flex items-start gap-3 pt-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₱{selectedTenant.lastPayment.amount.toLocaleString()}{" "}
                        for {selectedTenant.lastPayment.item}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Via {selectedTenant.lastPayment.method} (
                        {selectedTenant.lastPayment.refNumber}) •{" "}
                        {selectedTenant.lastPayment.date}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Actions Footer */}
            <div className="border-t border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReminderSummaryOpen(true)}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 text-xs font-bold text-white shadow-xs transition-colors hover:bg-purple-700"
                >
                  <Bell className="h-4 w-4" />
                  <span>Send Due Reminder</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenRecordPaymentModal}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* MODAL 1: SEND DUE REMINDER SUMMARY */}
      {isReminderSummaryOpen && selectedTenant && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Send Due Reminder
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Review summary for{" "}
                    <strong className="text-purple-600 dark:text-purple-400">
                      {selectedTenant.renterName}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReminderSummaryOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dues Breakdown Summary */}
            <div className="space-y-2">
              <span className="block text-[11px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                Outstanding Dues Summary
              </span>

              {unpaidBills.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  All current rent and utility bills are marked as paid!
                </div>
              ) : (
                <div className="dark:bg-zinc-850 space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 text-xs dark:border-zinc-800">
                  {unpaidBills.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {b.label} (Due {b.dueDate})
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₱{b.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-zinc-200 pt-2 font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                    <span>Total Outstanding Due:</span>
                    <span className="text-purple-600 dark:text-purple-400">
                      ₱{totalUnpaidAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                💡 Tip: To adjust individual bill amounts or readings, click
                directly on that bill item in the dossier.
              </p>
            </div>

            {/* Dispatch Channels */}
            <div className="space-y-1.5 rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-xs dark:border-purple-900/60 dark:bg-purple-950/30">
              <span className="font-bold text-purple-900 dark:text-purple-300">
                Automated Dispatch Channels:
              </span>
              <div className="space-y-1 text-[11px] text-purple-800 dark:text-purple-300">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-purple-600" />
                  <span>SMS to {selectedTenant.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-purple-600" />
                  <span>Email Notice to {selectedTenant.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReminderSummaryOpen(false)}
                className="h-10 rounded-xl px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReminderSummaryOpen(false);
                  setPaymentSuccessNotice(
                    `Reminder dispatched to ${selectedTenant.renterName} via SMS & Email!`,
                  );
                  setTimeout(() => setPaymentSuccessNotice(null), 4000);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-purple-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Confirm & Send Reminder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BILL ITEM / UTILITY CHARGE */}
      {isAddBillOpen && selectedTenant && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Add Bill Item / Utility Charge
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  For:{" "}
                  <strong className="text-purple-600 dark:text-purple-400">
                    {selectedTenant.renterName}
                  </strong>{" "}
                  ({selectedTenant.room})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBillOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addBillError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addBillError}</span>
              </div>
            )}

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                What are they paying for? (Bill Type)
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(
                  [
                    { id: "electricity", label: "Electricity", icon: Zap },
                    { id: "water", label: "Water", icon: Droplet },
                    { id: "rent", label: "Rent", icon: Home },
                    { id: "internet", label: "Internet", icon: Wifi },
                    { id: "maintenance", label: "Other", icon: Wrench },
                  ] as const
                ).map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = newBillCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectNewBillCategory(cat.id)}
                      className={`flex items-center justify-center gap-1 rounded-xl py-2 font-semibold transition-all ${
                        isSelected
                          ? "border-2 border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {newBillCategory === "rent"
                  ? "Rent automatically pre-fills the tenant's contracted rate (editable)."
                  : "Type in the exact utility amount from the meter or bill."}
              </p>
            </div>

            {/* Amount Due Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-bill-amount"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Amount Due (₱)
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-zinc-400">
                  ₱
                </span>
                <input
                  type="number"
                  id="new-bill-amount"
                  value={newBillAmount}
                  onChange={(e) => {
                    setNewBillAmount(e.target.value);
                    if (addBillError) setAddBillError(null);
                  }}
                  placeholder="0.00"
                  className="dark:bg-zinc-850 h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-8 text-sm font-bold text-zinc-900 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Selectable Calendar for Due Date */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-bill-due-date"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Payment Due Date (Select from Calendar)
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="new-bill-due-date"
                  value={newBillDueDate}
                  onChange={(e) => setNewBillDueDate(e.target.value)}
                  className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
                />
              </div>
            </div>

            {/* Breakdown Note / Sub-meter Reading */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-bill-note"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Meter Reading / Breakdown Note (Optional)
              </label>
              <input
                type="text"
                id="new-bill-note"
                value={newBillNote}
                onChange={(e) => setNewBillNote(e.target.value)}
                placeholder="e.g. Sub-meter reading: 71 kWh @ ₱12/kWh"
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddBillOpen(false)}
                className="h-10 rounded-xl px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewBill}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-purple-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Bill Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT BILL ITEM / UPDATE FEE (Click-to-Edit) */}
      {editingBillIndex !== null && selectedTenant && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Edit Bill Item / Update Fee
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Editing bill for{" "}
                  <strong className="text-purple-600 dark:text-purple-400">
                    {selectedTenant.renterName}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBillIndex(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editBillError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editBillError}</span>
              </div>
            )}

            {/* Bill Label */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-bill-label"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Bill Item Label
              </label>
              <input
                type="text"
                id="edit-bill-label"
                value={editBillLabel}
                onChange={(e) => setEditBillLabel(e.target.value)}
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Fee / Amount Due */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-bill-amount"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Amount Due (₱)
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-zinc-400">
                  ₱
                </span>
                <input
                  type="number"
                  id="edit-bill-amount"
                  value={editBillAmount}
                  onChange={(e) => {
                    setEditBillAmount(e.target.value);
                    if (editBillError) setEditBillError(null);
                  }}
                  className="dark:bg-zinc-850 h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-8 text-sm font-bold text-zinc-900 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Status Pills */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Payment Status
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(
                  [
                    { id: "due", label: "Due Soon", color: "amber" },
                    { id: "paid", label: "✓ Paid", color: "emerald" },
                    { id: "overdue", label: "⚠ Overdue", color: "rose" },
                  ] as const
                ).map((st) => {
                  const isSelected = editBillStatus === st.id;
                  let selectedClass = "";
                  if (st.id === "paid") {
                    selectedClass =
                      "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                  } else if (st.id === "overdue") {
                    selectedClass =
                      "border-2 border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
                  } else {
                    selectedClass =
                      "border-2 border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
                  }

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setEditBillStatus(st.id)}
                      className={`rounded-xl py-2 font-bold transition-all ${
                        isSelected
                          ? selectedClass
                          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selectable Calendar for Due Date */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-bill-due-date"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Payment Due Date (Select from Calendar)
              </label>
              <input
                type="date"
                id="edit-bill-due-date"
                value={editBillDueDate}
                onChange={(e) => setEditBillDueDate(e.target.value)}
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
              />
            </div>

            {/* Meter Reading / Note */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-bill-note"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Breakdown / Meter Note
              </label>
              <input
                type="text"
                id="edit-bill-note"
                value={editBillNote}
                onChange={(e) => setEditBillNote(e.target.value)}
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleDeleteBill}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Bill</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBillIndex(null)}
                  className="h-10 rounded-xl px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditBill}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-purple-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD PAYMENT */}
      {isRecordPaymentOpen && selectedTenant && (
        <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Record Received Payment
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    From:{" "}
                    <strong className="text-purple-600 dark:text-purple-400">
                      {selectedTenant.renterName}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Bill to Settle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Payment For
              </label>
              <select
                value={paymentBillId}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentBillId(val);
                  if (val === "all") {
                    setPaymentAmount(totalUnpaidAmount.toString());
                  } else {
                    const found = selectedTenant.bills.find(
                      (b) => b.id === val,
                    );
                    if (found) setPaymentAmount(found.amount.toString());
                  }
                }}
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
              >
                <option value="all">
                  All Outstanding Bills (₱{totalUnpaidAmount.toLocaleString()})
                </option>
                {selectedTenant.bills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} — ₱{b.amount.toLocaleString()} ({b.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Paid */}
            <div className="space-y-1.5">
              <label
                htmlFor="payment-amount"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Amount Paid (₱)
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-bold text-zinc-400">
                  ₱
                </span>
                <input
                  type="number"
                  id="payment-amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="dark:bg-zinc-850 h-11 w-full rounded-xl border border-zinc-200 bg-white pr-4 pl-8 text-sm font-bold text-zinc-900 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Payment Channel / Method
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {(["GCash", "Maya", "Bank Transfer", "Cash"] as const).map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl py-2 font-semibold transition-all ${
                        paymentMethod === method
                          ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {method}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <label
                htmlFor="payment-ref"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Reference / Receipt Number
              </label>
              <input
                type="text"
                id="payment-ref"
                value={paymentRefNumber}
                onChange={(e) => setPaymentRefNumber(e.target.value)}
                placeholder="e.g. Ref #9028144"
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
              />
            </div>

            {/* Date Received (Selectable Calendar) */}
            <div className="space-y-1.5">
              <label
                htmlFor="payment-date"
                className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Date Received (Select from Calendar)
              </label>
              <input
                type="date"
                id="payment-date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="dark:bg-zinc-850 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                className="h-10 rounded-xl px-4 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecordPayment}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Confirm & Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
