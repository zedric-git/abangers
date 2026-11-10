"use client";

import { useState } from "react";
import { Search, Send, Building2, MessageSquare } from "lucide-react";

export interface MessageItem {
  id: string;
  senderId: string;
  senderRole: "landlord" | "renter";
  text: string;
  createdAt: string;
}

export interface ConversationThread {
  id: string;
  participantId: string;
  participantName: string;
  avatar: string;
  avatarColor: string;
  participantRole: string;
  participantPhone: string;
  propertyId: string;
  propertyTitle: string;
  monthlyRent: number;
  lastMessageText: string;
  lastMessageTime: string;
  messages: MessageItem[];
}

const sampleConversations: ConversationThread[] = [
  {
    id: "CONV-1",
    participantId: "USER-101",
    participantName: "Maria Clara Santos",
    avatar: "MS",
    avatarColor: "bg-purple-600",
    participantRole: "3rd Year BS Nursing • UST",
    participantPhone: "+63 917 842 1109",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites (Room 204)",
    monthlyRent: 4200,
    lastMessageText: "Hoping you can approve the viewing slot po!",
    lastMessageTime: "2:14 PM",
    messages: [
      {
        id: "MSG-1",
        senderId: "USER-101",
        senderRole: "renter",
        text: "Good afternoon po! I saw your listing for Sampaloc Scholar Suites near UST.",
        createdAt: "1:45 PM",
      },
      {
        id: "MSG-2",
        senderId: "USER-101",
        senderRole: "renter",
        text: "I submitted a viewing request for Tuesday (Oct 20) at 2:00 PM. Are parents allowed inside during the inspection?",
        createdAt: "1:46 PM",
      },
      {
        id: "MSG-3",
        senderId: "LANDLORD-1",
        senderRole: "landlord",
        text: "Hello Maria! Yes, parents or guardians are welcome during the viewing. Just bring 1 valid ID for the lobby guard.",
        createdAt: "2:00 PM",
      },
      {
        id: "MSG-4",
        senderId: "USER-101",
        senderRole: "renter",
        text: "Thank you po! Also, is high-speed Wi-Fi and drinking water already included in the ₱4,200 monthly rate?",
        createdAt: "2:12 PM",
      },
      {
        id: "MSG-5",
        senderId: "USER-101",
        senderRole: "renter",
        text: "Hoping you can approve the viewing slot po!",
        createdAt: "2:14 PM",
      },
    ],
  },
  {
    id: "CONV-2",
    participantId: "USER-102",
    participantName: "Joshua Dela Cruz",
    avatar: "JD",
    avatarColor: "bg-blue-600",
    participantRole: "Software Engineer • BGC / Hybrid",
    participantPhone: "+63 918 339 4021",
    propertyId: "PROP-2",
    propertyTitle: "Katipunan Prime Studio (Unit 3B)",
    monthlyRent: 8500,
    lastMessageText: "Noted po! See you on Wednesday morning.",
    lastMessageTime: "11:20 AM",
    messages: [
      {
        id: "MSG-6",
        senderId: "USER-102",
        senderRole: "renter",
        text: "Hi! Inquiring about motorcycle parking availability for Unit 3B.",
        createdAt: "11:00 AM",
      },
      {
        id: "MSG-7",
        senderId: "LANDLORD-1",
        senderRole: "landlord",
        text: "Hi Joshua, we have dedicated motorcycle slots in the basement with 24/7 CCTV surveillance.",
        createdAt: "11:15 AM",
      },
      {
        id: "MSG-8",
        senderId: "USER-102",
        senderRole: "renter",
        text: "Noted po! See you on Wednesday morning.",
        createdAt: "11:20 AM",
      },
    ],
  },
  {
    id: "CONV-3",
    participantId: "USER-103",
    participantName: "Rafael Gabriel Tan",
    avatar: "RT",
    avatarColor: "bg-indigo-600",
    participantRole: "Accountancy Intern • SGV",
    participantPhone: "+63 920 551 2290",
    propertyId: "PROP-1",
    propertyTitle: "Sampaloc Scholar Suites (Room 302)",
    monthlyRent: 6500,
    lastMessageText: "Thank you po Kuya!",
    lastMessageTime: "Yesterday",
    messages: [
      {
        id: "MSG-9",
        senderId: "USER-103",
        senderRole: "renter",
        text: "Confirming physical viewing slot for tomorrow at 1:00 PM.",
        createdAt: "Yesterday",
      },
      {
        id: "MSG-10",
        senderId: "LANDLORD-1",
        senderRole: "landlord",
        text: "Slot confirmed Rafael! Reception guard is briefed.",
        createdAt: "Yesterday",
      },
      {
        id: "MSG-11",
        senderId: "USER-103",
        senderRole: "renter",
        text: "Thank you po Kuya!",
        createdAt: "Yesterday",
      },
    ],
  },
];

export default function LandlordMessagesView() {
  const [conversations, setConversations] =
    useState<ConversationThread[]>(sampleConversations);
  const [activeConvId, setActiveConvId] = useState<string>("CONV-1");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");

  const activeConv =
    conversations.find((c) => c.id === activeConvId) ?? conversations[0];

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.participantName.toLowerCase().includes(q) ||
      c.propertyTitle.toLowerCase().includes(q) ||
      c.lastMessageText.toLowerCase().includes(q)
    );
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConv) return;

    const newMessage: MessageItem = {
      id: `MSG-${Date.now()}`,
      senderId: "LANDLORD-1",
      senderRole: "landlord",
      text: replyText.trim(),
      createdAt: "Just now",
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConv.id) return c;
        return {
          ...c,
          lastMessageText: newMessage.text,
          lastMessageTime: "Just now",
          messages: [...c.messages, newMessage],
        };
      }),
    );

    setReplyText("");
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Messages & Inquiries
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
          <MessageSquare className="h-3.5 w-3.5" />
          {conversations.length} Active Conversations
        </span>
      </div>

      {/* Main Dual-Panel Container */}
      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xs lg:grid-cols-12 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Left Panel: Conversation List (4 cols) */}
        <div className="border-b border-zinc-200 lg:col-span-4 lg:border-r lg:border-b-0 dark:border-zinc-800">
          {/* Search Bar */}
          <div className="border-b border-zinc-200 p-3.5 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-3 pl-8 text-xs shadow-2xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="max-h-[600px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConv?.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${
                      isSelected
                        ? "bg-purple-50/70 dark:bg-purple-950/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs ${conv.avatarColor}`}
                    >
                      {conv.avatar}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {conv.participantName}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {conv.lastMessageTime}
                        </span>
                      </div>
                      <p className="truncate text-[11px] font-medium text-purple-600 dark:text-purple-400">
                        {conv.propertyTitle}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {conv.lastMessageText}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Chat Thread (8 cols) */}
        <div className="flex flex-col lg:col-span-8">
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-2xs ${activeConv.avatarColor}`}
                  >
                    {activeConv.avatar}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {activeConv.participantName}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {activeConv.participantRole} •{" "}
                      {activeConv.participantPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold">
                    {activeConv.propertyTitle}
                  </span>
                </div>
              </div>

              {/* Chat Message History */}
              <div className="max-h-[460px] flex-1 space-y-3.5 overflow-y-auto p-5">
                {activeConv.messages.map((msg) => {
                  const isLandlord = msg.senderRole === "landlord";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isLandlord ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-md rounded-2xl p-3.5 text-xs shadow-2xs ${
                          isLandlord
                            ? "rounded-br-xs bg-purple-600 text-white"
                            : "rounded-bl-xs bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="mt-1 text-[10px] text-zinc-400">
                        {msg.createdAt}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chat Composer */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
              >
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={2000}
                  className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center p-8 text-center text-xs text-zinc-500">
              <MessageSquare className="h-8 w-8 text-zinc-400" />
              <p className="mt-2 font-semibold">Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
