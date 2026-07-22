"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CurrencyCode = "BDT" | "USD";

const STORAGE_KEY = "fmk_currency_v1";

function usdPerBdt(): number {
  const fromEnv = Number(process.env.NEXT_PUBLIC_USD_PER_BDT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1 / 122;
}

export function convertFromBdt(amountBdt: number, currency: CurrencyCode): number {
  if (currency === "USD") return amountBdt * usdPerBdt();
  return amountBdt;
}

export function formatMoney(amountBdt: number, currency: CurrencyCode = "BDT"): string {
  const n = convertFromBdt(amountBdt, currency);
  if (currency === "USD") {
    return (
      "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  return "৳" + Math.round(n).toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

type CurrencyCtx = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  format: (amountBdt: number) => string;
};

const Ctx = createContext<CurrencyCtx | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("BDT");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "USD" || raw === "BDT") setCurrencyState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      format: (amountBdt: number) => formatMoney(amountBdt, currency),
    }),
    [currency, setCurrency],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      currency: "BDT" as CurrencyCode,
      setCurrency: () => {
        /* no-op outside provider */
      },
      format: (amountBdt: number) => formatMoney(amountBdt, "BDT"),
    };
  }
  return ctx;
}
