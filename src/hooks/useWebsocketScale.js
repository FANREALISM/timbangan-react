import { useState, useRef, useEffect, useCallback } from "react";

export const useWebsocketScale = (onDataReceived) => {
  const [status, setStatus] = useState("Disconnected");
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isIntentionallyDisconnected = useRef(true);
  const latestIpRef = useRef(null);

  const connectWS = useCallback(
    (ip) => {
      if (!ip) {
        alert("Alamat IP alat tidak boleh kosong.");
        return;
      }

      // Guard: Don't connect if already connecting or connected to the same IP
      if (
        (status === "Connecting..." || status === "Connected (WS)") &&
        latestIpRef.current === ip &&
        socketRef.current &&
        socketRef.current.readyState <= WebSocket.OPEN
      ) {
        console.log("Already connecting/connected to:", ip);
        return;
      }

      latestIpRef.current = ip;
      isIntentionallyDisconnected.current = false;

      // Clear existing connections/timeouts thoroughly
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        const oldSocket = socketRef.current;
        oldSocket.onopen = null;
        oldSocket.onmessage = null;
        oldSocket.onerror = null;
        oldSocket.onclose = null;
        if (
          oldSocket.readyState === WebSocket.OPEN ||
          oldSocket.readyState === WebSocket.CONNECTING
        ) {
          oldSocket.close();
        }
        socketRef.current = null;
      }

      setStatus("Connecting...");

      try {
        console.log("WebSocket attempting to connect to:", `ws://${ip}/ws`);
        const socket = new WebSocket(`ws://${ip}/ws`);
        socketRef.current = socket;

        socket.onopen = () => {
          if (socketRef.current !== socket) return; // Stale socket
          setStatus("Connected (WS)");
          console.log("✅ WebSocket connected successfully to:", ip);
        };

        socket.onmessage = (e) => {
          if (socketRef.current !== socket) return;
          console.log("📥 WS data received:", e.data);
          if (onDataReceived) onDataReceived(e.data);
        };

        socket.onerror = (error) => {
          if (socketRef.current !== socket) return;
          console.error("❌ WebSocket Error:", error);
        };

        socket.onclose = (event) => {
          if (socketRef.current !== socket) return;
          console.warn(
            "⚠️ WebSocket closed:",
            event.reason || "No reason provided",
            "Code:",
            event.code,
            "Clean:",
            event.wasClean,
          );
          socketRef.current = null;

          if (!isIntentionallyDisconnected.current) {
            setStatus("Reconnecting...");
            console.log("Attempting to reconnect in 3 seconds...");
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isIntentionallyDisconnected.current && latestIpRef.current) {
                connectWS(latestIpRef.current);
              }
            }, 3000);
          } else {
            setStatus("Disconnected");
          }
        };
      } catch (error) {
        console.error("Gagal membuat WebSocket:", error);
        setStatus("Disconnected");
      }
    },
    [onDataReceived],
  );

  const disconnectWS = useCallback(() => {
    isIntentionallyDisconnected.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.onclose = null; // Prevent reconnect logic
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus("Disconnected");
  }, []);

  // Cleanup saat unmount
  useEffect(() => {
    return () => {
      disconnectWS();
    };
  }, [disconnectWS]);

  return { connectWS, disconnectWS, status };
};
