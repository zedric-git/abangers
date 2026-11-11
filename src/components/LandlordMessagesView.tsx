"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Send,
  CalendarCheck,
  Info,
  Pin,
  ChevronDown,
  MoreHorizontal,
  Paperclip,
  Image as ImageIcon,
  Smile,
  CheckCheck,
  X,
  CheckSquare,
  Trash2,
  Archive,
  Check,
} from "lucide-react";

interface MessageItem {
  id: number;
  sender: "landlord" | "renter";
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  renterName: string;
  avatar: string;
  avatarColor: string;
  online: boolean;
  roleLabel: string;
  phone: string;
  category: "viewing" | "inquiry" | "renter";
  categoryBadge: string;
  propertyTitle: string;
  monthlyRent: string;
  viewingSlot?: string;
  unreadCount: number;
  lastTime: string;
  messages: MessageItem[];
}

const initialConversations: Conversation[] = [
  {
    id: "CONV-1",
    renterName: "Maria Clara Santos",
    avatar: "MS",
    avatarColor: "bg-purple-600",
    online: true,
    roleLabel: "3rd Year BS Nursing â€¢ UST",
    phone: "+63 917 842 1109",
    category: "viewing",
    categoryBadge: "Viewing Request",
    propertyTitle: "Sampaloc Scholar Suites â€¢ Rm 204",
    monthlyRent: "â‚±4,200 / mo",
    viewingSlot: "Oct 20, 2026 â€¢ 2:00 PM â€“ 2:30 PM",
    unreadCount: 2,
    lastTime: "10m ago",
    messages: [
      {
        id: 1,
        sender: "renter",
        text: "Good afternoon po! I saw your listing for Sampaloc Scholar Suites near UST.",
        time: "1:45 PM",
      },
      {
        id: 2,
        sender: "renter",
        text: "I submitted a viewing request for Tuesday (Oct 20) at 2:00 PM. Are parents allowed inside during the room inspection?",
        time: "1:46 PM",
      },
      {
        id: 3,
        sender: "landlord",
        text: "Hello Maria! Yes, parents or guardians are very welcome during the viewing. Just bring 1 valid ID for the lobby guard.",
        time: "2:00 PM",
      },
      {
        id: 4,
        sender: "renter",
        text: "Thank you po! Also, is high-speed Wi-Fi and drinking water already included in the â‚±4,200 monthly rate?",
        time: "2:12 PM",
      },
      {
        id: 5,
        sender: "renter",
        text: "Hoping you can approve the viewing slot so my mom can file her leave. Thanks po!",
        time: "2:14 PM",
      },
    ],
  },
  {
    id: "CONV-2",
    renterName: "Joshua Dela Cruz",
    avatar: "JD",
    avatarColor: "bg-blue-600",
    online: true,
    roleLabel: "Software Engineer",
    phone: "+63 918 339 4021",
    category: "inquiry",
    categoryBadge: "Property Inquiry",
    propertyTitle: "Katipunan Prime Studio â€¢ Unit 3B",
    monthlyRent: "â‚±8,500 / mo",
    viewingSlot: "Oct 21, 2026 â€¢ 10:30 AM",
    unreadCount: 1,
    lastTime: "1h ago",
    messages: [
      {
        id: 1,
        sender: "renter",
        text: "Hi! I'm interested in the Katipunan Prime Studio Unit 3B.",
        time: "11:20 AM",
      },
      {
        id: 2,
        sender: "renter",
        text: "Does the building have a dedicated motorcycle parking slot? And can I install my own router if needed?",
        time: "11:22 AM",
      },
    ],
  },
  {
    id: "CONV-3",
    renterName: "Carlo Aquino Bautista",
    avatar: "CB",
    avatarColor: "bg-blue-600",
    online: false,
    roleLabel: "Current Renter â€¢ Unit 2A",
    phone: "+63 918 662 3104",
    category: "renter",
    categoryBadge: "Current Renter",
    propertyTitle: "Katipunan Prime Studio â€¢ Unit 2A",
    monthlyRent: "â‚±8,500 / mo",
    unreadCount: 0,
    lastTime: "3h ago",
    messages: [
      {
        id: 1,
        sender: "landlord",
        text: "Hi Carlo, friendly reminder that your October rent of â‚±8,500 was due on Oct 5.",
        time: "Yesterday",
      },
      {
        id: 2,
        sender: "renter",
        text: "Pasensya na po! My scholarship stipend was delayed by the bank. I will send the â‚±8,500 via GCash tonight before 8 PM.",
        time: "3 hours ago",
      },
    ],
  },
  {
    id: "CONV-4",
    renterName: "Kevin Tan",
    avatar: "KT",
    avatarColor: "bg-amber-600",
    online: false,
    roleLabel: "CPA Reviewee",
    phone: "+63 927 551 0923",
    category: "viewing",
    categoryBadge: "Confirmed Viewing",
    propertyTitle: "Sampaloc Scholar Suites â€¢ Rm 301",
    monthlyRent: "â‚±6,000 / mo",
    viewingSlot: "Oct 19, 2026 â€¢ 10:00 AM",
    unreadCount: 0,
    lastTime: "Yesterday",
    messages: [
      {
        id: 1,
        sender: "renter",
        text: "Hi! Just confirming our viewing appointment tomorrow at 10:00 AM.",
        time: "Yesterday",
      },
      {
        id: 2,
        sender: "landlord",
        text: "Confirmed, Kevin! Look for Kuya Ben at the reception desk when you arrive.",
        time: "Yesterday",
      },
    ],
  },
  {
    id: "CONV-5",
    renterName: "Camille Prats Mendoza",
    avatar: "CM",
    avatarColor: "bg-purple-600",
    online: true,
    roleLabel: "Current Renter â€¢ Rm 201",
    phone: "+63 917 204 8819",
    category: "renter",
    categoryBadge: "Current Renter",
    propertyTitle: "Sampaloc Scholar Suites â€¢ Rm 201",
    monthlyRent: "â‚±4,200 / mo (Paid)",
    unreadCount: 0,
    lastTime: "Oct 03",
    messages: [
      {
        id: 1,
        sender: "renter",
        text: "Sent my October rent via GCash! Ref #9028144.",
        time: "Oct 03",
      },
      {
        id: 2,
        sender: "landlord",
        text: "Payment received and recorded. Thank you, Camille!",
        time: "Oct 03",
      },
    ],
  },
];

export default function LandlordMessagesView() {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string>("CONV-1");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");

  // 3-dots Menu & Actions: Select, Delete, Archive
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [archivedConvIds, setArchivedConvIds] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Info panel and Pinned bar states
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);

  // Close 3-dots menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeConv = conversations.find((c) => c.id === activeConvId) ||
    conversations[0] || {
      id: "none",
      renterName: "No Conversation",
      avatar: "â€”",
      avatarColor: "bg-zinc-400",
      online: false,
      roleLabel: "No messages",
      phone: "â€”",
      category: "inquiry",
      categoryBadge: "Empty",
      propertyTitle: "No listing selected",
      monthlyRent: "â‚±0",
      unreadCount: 0,
      lastTime: "",
      messages: [],
    };

  const totalUnread = conversations
    .filter((c) => !archivedConvIds.includes(c.id))
    .reduce((acc, c) => acc + c.unreadCount, 0);

  const filteredConversations = conversations.filter((c) => {
    // If viewing archived category
    if (filterCategory === "archived") {
      return archivedConvIds.includes(c.id);
    }

    // Default: hide archived
    if (archivedConvIds.includes(c.id)) return false;

    const matchesCategory =
      filterCategory === "all"
        ? true
        : filterCategory === "unread"
          ? c.unreadCount > 0
          : c.category === filterCategory;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.renterName.toLowerCase().includes(q) ||
      c.propertyTitle.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: MessageItem = {
      id: Date.now(),
      sender: "landlord",
      text: inputText.trim(),
      time: "Just now",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              messages: [...c.messages, newMessage],
              unreadCount: 0,
              lastTime: "Just now",
            }
          : c,
      ),
    );

    setInputText("");
  };

  const handleSelectConv = (id: string) => {
    if (isSelectionMode) {
      setSelectedConvIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
      return;
    }

    setActiveConvId(id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    );
  };

  // Action: Select Messages
  const handleToggleSelectMessages = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedConvIds([]);
    setIsMenuOpen(false);
  };

  // Action: Delete Messages
  const handleDeleteMessages = () => {
    if (isSelectionMode && selectedConvIds.length > 0) {
      setConversations((prev) =>
        prev.filter((c) => !selectedConvIds.includes(c.id)),
      );
      setSelectedConvIds([]);
      setIsSelectionMode(false);
    } else {
      setConversations((prev) => prev.filter((c) => c.id !== activeConvId));
    }
    setIsMenuOpen(false);
  };

  // Action: Archive Messages
  const handleArchiveMessages = () => {
    if (isSelectionMode && selectedConvIds.length > 0) {
      setArchivedConvIds((prev) => [...prev, ...selectedConvIds]);
      setSelectedConvIds([]);
      setIsSelectionMode(false);
    } else {
      setArchivedConvIds((prev) => [...prev, activeConvId]);
    }
    setIsMenuOpen(false);
  };

  return (
    // Fills the whole main screen directly (no top breadcrumbs)
    <div className="flex h-full min-h-[500px] w-full flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Chats Directory */}
        <div className="flex w-full flex-col border-r border-zinc-200 md:w-80 lg:w-96 dark:border-zinc-800">
          {/* Chats Header: Title + 3-dots Menu Button */}
          <div className="space-y-3 border-b border-zinc-100 p-3.5 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                  Chats
                </h2>
                {totalUnread > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1.5 text-[11px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </div>

              {/* 3-Dots Action Button & Dropdown Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  title="Chat Options"
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isMenuOpen
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {/* Dropdown Menu: Select messages, Delete messages, Archive messages */}
                {isMenuOpen && (
                  <div className="dark:border-zinc-750 dark:bg-zinc-850 absolute top-9.5 right-0 z-50 w-48 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1.5 shadow-xl backdrop-blur-md">
                    <button
                      type="button"
                      onClick={handleToggleSelectMessages}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:text-zinc-300 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
                    >
                      <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>
                        {isSelectionMode ? "Exit Selection" : "Select messages"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteMessages}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete messages</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleArchiveMessages}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-zinc-700 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:text-zinc-300 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
                    >
                      <Archive className="h-4 w-4 text-amber-500" />
                      <span>Archive messages</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Selection Mode Action Bar if active */}
            {isSelectionMode && (
              <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 dark:bg-purple-950/40 dark:text-purple-200">
                <span>{selectedConvIds.length} selected</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteMessages}
                    disabled={selectedConvIds.length === 0}
                    className="text-rose-600 hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleArchiveMessages}
                    disabled={selectedConvIds.length === 0}
                    className="text-purple-700 hover:underline disabled:opacity-40 dark:text-purple-300"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedConvIds([]);
                    }}
                    className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Pill Search Input: "Search Messenger" */}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Messenger"
                className="dark:focus:bg-zinc-850 h-9 w-full rounded-full border-0 bg-zinc-100 pr-3.5 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-purple-600/30 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
                { id: "viewing", label: "Viewings" },
                { id: "inquiry", label: "Inquiries" },
                { id: "renter", label: "Renters" },
                ...(archivedConvIds.length > 0
                  ? [
                      {
                        id: "archived",
                        label: `Archived (${archivedConvIds.length})`,
                      },
                    ]
                  : []),
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterCategory(f.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    filterCategory === f.id
                      ? "bg-purple-600 text-white"
                      : "dark:hover:bg-zinc-750 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="custom-scrollbar flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === activeConvId;
                const isChecked = selectedConvIds.includes(c.id);
                const lastMsg = c.messages[c.messages.length - 1];
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConv(c.id)}
                    className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${
                      isSelected
                        ? "bg-purple-50/70 dark:bg-purple-950/30"
                        : "dark:hover:bg-zinc-850/60 hover:bg-zinc-50"
                    }`}
                  >
                    {/* Checkbox in selection mode */}
                    {isSelectionMode && (
                      <div className="pt-2">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isChecked
                              ? "border-purple-600 bg-purple-600 text-white"
                              : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          {isChecked && (
                            <Check className="h-3 w-3 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="relative shrink-0">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs ${c.avatarColor}`}
                      >
                        {c.avatar}
                      </div>
                      {c.online && (
                        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`truncate text-xs ${
                            isSelected
                              ? "font-bold text-purple-950 dark:text-purple-200"
                              : "font-semibold text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {c.renterName}
                        </h4>
                        <span className="text-[10px] text-zinc-400">
                          {c.lastTime}
                        </span>
                      </div>

                      <div className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {c.propertyTitle}
                      </div>

                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {lastMsg ? lastMsg.text : "No messages yet"}
                      </p>
                    </div>

                    {c.unreadCount > 0 && (
                      <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Conversation Area */}
        <div className="hidden flex-1 flex-col md:flex">
          {/* Active Chat Header (Phone & Video removed, only Info icon kept) */}
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            {/* Left Header: Avatar, Name, Status (Active now) */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${activeConv.avatarColor}`}
                >
                  {activeConv.avatar}
                </div>
                {activeConv.online && (
                  <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900" />
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {activeConv.renterName}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Active now</span>
                  <span className="text-zinc-300 dark:text-zinc-600">â€¢</span>
                  <span>{activeConv.roleLabel}</span>
                </div>
              </div>
            </div>

            {/* Right Header: Info Icon Only */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsInfoOpen(!isInfoOpen)}
                title="Conversation Information"
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isInfoOpen
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                    : "text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                }`}
              >
                <Info className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Sub-Header: Pinned Banner */}
          <div className="dark:bg-zinc-850/70 border-b border-zinc-200 bg-zinc-50 px-5 py-2 transition-colors dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
              className="flex w-full items-center justify-between text-left text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden text-zinc-700 dark:text-zinc-300">
                <Pin className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeConv.propertyTitle}
                </span>
                <span className="text-zinc-400">â€¢</span>
                <span className="truncate text-zinc-500 dark:text-zinc-400">
                  {activeConv.viewingSlot || activeConv.monthlyRent}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
                  isPinnedExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expandable Pinned Details */}
            {isPinnedExpanded && (
              <div className="dark:border-zinc-750 mt-2.5 rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-2xs dark:bg-zinc-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {activeConv.propertyTitle}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Rate: {activeConv.monthlyRent} â€¢ Contact:{" "}
                      {activeConv.phone}
                    </div>
                  </div>
                  {activeConv.viewingSlot && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>{activeConv.viewingSlot}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chat Stream & Optional Info Drawer */}
          <div className="relative flex flex-1 overflow-hidden">
            {/* Messages Stream */}
            <div className="custom-scrollbar flex-1 space-y-3.5 overflow-y-auto p-5">
              {activeConv.messages.map((m) => {
                const isMe = m.sender === "landlord";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                        isMe
                          ? "rounded-br-xs bg-[#6C5CE7] text-white"
                          : "rounded-bl-xs bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {m.text}
                    </div>
                    <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-zinc-400">
                      <span>{m.time}</span>
                      {isMe && (
                        <CheckCheck className="h-3 w-3 text-purple-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Side Info Drawer (Toggled by Info icon) */}
            {isInfoOpen && (
              <div className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                  <h4 className="text-xs font-bold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
                    Conversation Details
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsInfoOpen(false)}
                    className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-center">
                  <div
                    className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white shadow-xs ${activeConv.avatarColor}`}
                  >
                    {activeConv.avatar}
                  </div>
                  <h5 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {activeConv.renterName}
                  </h5>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {activeConv.roleLabel}
                  </p>
                </div>

                <div className="dark:bg-zinc-850 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Associated Property
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {activeConv.propertyTitle}
                  </div>
                  <div className="font-bold text-purple-700 dark:text-purple-400">
                    {activeConv.monthlyRent}
                  </div>
                  {activeConv.viewingSlot && (
                    <div className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      ðŸ“… Scheduled: {activeConv.viewingSlot}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Contact Phone
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {activeConv.phone}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input Footer (Messenger Style) */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 border-t border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Attachment Icons */}
            <div className="flex items-center gap-1 text-zinc-400">
              <button
                type="button"
                title="Attach file"
                className="rounded-full p-1.5 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Send photo"
                className="rounded-full p-1.5 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Message Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Aa"
              className="dark:focus:bg-zinc-850 h-9 flex-1 rounded-full border-0 bg-zinc-100 px-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-purple-600/30 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />

            {/* Emoji & Send Buttons */}
            <button
              type="button"
              title="Emoji"
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Smile className="h-4 w-4" />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-white shadow-2xs transition-colors hover:bg-purple-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
