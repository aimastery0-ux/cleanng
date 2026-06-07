import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { bookingsApi } from "@/api/bookings";
import { messagesApi, createChatSocket, Message } from "@/api/messages";
import { useAuthStore } from "@/store/auth";

function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div className={`flex gap-2 items-end ${msg.is_mine ? "flex-row-reverse" : ""}`}>
      {!msg.is_mine && (
        msg.sender_avatar
          ? <img src={msg.sender_avatar} className="w-7 h-7 rounded-full object-cover shrink-0 border border-border" alt="" />
          : <div className="w-7 h-7 rounded-full bg-bg-alt flex items-center justify-center text-xs shrink-0">👤</div>
      )}
      <div className={`max-w-[72%] ${msg.is_mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        {!msg.is_mine && (
          <span className="text-caption text-grey-mid px-1">{msg.sender_name}</span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-small leading-relaxed ${
          msg.is_mine
            ? "bg-orange text-white rounded-br-sm"
            : "bg-bg-alt text-grey-dark rounded-bl-sm"
        }`}>
          {msg.body}
        </div>
        <span className="text-[10px] text-grey-light px-1">
          {new Date(msg.sent_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
          {msg.is_mine && msg.read_at && " · Read"}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const id = Number(bookingId);
  const { user, accessToken } = useAuthStore((s) => ({ user: s.user, accessToken: s.accessToken }));

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: booking } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  });

  // Load history
  const { data: history = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => messagesApi.history(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (history.length) setMessages(history);
  }, [history]);

  // WebSocket
  useEffect(() => {
    if (!id || !accessToken) return;
    const ws = createChatSocket(id, accessToken);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => toast.error("Chat connection lost.");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        const incoming: Message = {
          id: data.message_id,
          booking: id,
          sender: data.sender_id,
          sender_name: data.sender_name,
          sender_avatar: null,
          is_mine: data.sender_id === user?.id,
          body: data.body,
          sent_at: data.sent_at,
          read_at: null,
        };
        setMessages((prev) => {
          if (prev.find((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      }
    };

    return () => ws.close();
  }, [id, accessToken]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(() => {
    const body = input.trim();
    if (!body || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: "message", body }));
    setInput("");
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const backPath = user?.role === "CLEANER"
    ? "/cleaner/bookings"
    : `/customer/bookings/${id}`;

  const otherName = booking
    ? user?.role === "CLEANER" ? booking.customer_name : booking.cleaner_name
    : "Chat";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white shrink-0">
        <Link to={backPath} className="text-grey-mid hover:text-black text-small">←</Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{otherName}</p>
          {booking && (
            <p className="text-caption text-grey-mid truncate">{booking.service_title}</p>
          )}
        </div>
        <span className={`flex items-center gap-1.5 text-caption ${connected ? "text-success" : "text-grey-light"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success" : "bg-grey-light"}`} />
          {connected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-bg-alt">
        {messages.length === 0 && (
          <div className="text-center py-16 text-grey-mid text-small">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 bg-white border-t border-border flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="input flex-1 resize-none max-h-28 overflow-y-auto"
          style={{ height: "auto" }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected}
          className="shrink-0 w-10 h-10 rounded-full bg-orange text-white flex items-center justify-center
                     disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dark transition-colors"
          aria-label="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
