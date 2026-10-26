"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

// Botón que:
// 1. Pide un link_token a tu backend
// 2. Abre el widget oficial de Plaid (ahí el usuario elige su banco, ej. Chase, e ingresa credenciales)
// 3. Al conectar, manda el public_token a tu backend para guardarlo permanentemente
export default function PlaidLinkButton({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLinkToken() {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      setLinkToken(data.link_token);
    }
    fetchLinkToken();
  }, []);

  const handleOnSuccess = useCallback(
    async (public_token, metadata) => {
      setLoading(true);
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token, metadata }),
        });
        const data = await res.json();
        if (onSuccess) onSuccess(data);
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleOnSuccess,
  });

  return (
    <button onClick={() => open()} disabled={!ready || loading}>
      {loading ? "Connecting..." : "Connect bank account (Chase)"}
    </button>
  );
}
