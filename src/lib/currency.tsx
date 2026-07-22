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

const RATE_USD_PER_BDT = 1 / 122; // approx display rate; override via VITE_USD_PER_BDT
const STORAGE_KEY = "fmk_currency_v1";

function usdPerBdt(): number {
  const fromEnv = Number(import.meta.env.VITE_USD_PER_BDT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : RATE_USD_PER_BDT;
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
  convert: (amountBdt: number) => number;
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

  const value = useMemo<CurrencyCtx>(
    () => ({
      currency,
      setCurrency,
      format: (amountBdt: number) => formatMoney(amountBdt, currency),
      convert: (amountBdt: number) => convertFromBdt(amountBdt, currency),
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
      setCurrency: (_c: CurrencyCode) => {},
      format: (amountBdt: number) => formatMoney(amountBdt, "BDT"),
      convert: (amountBdt: number) => amountBdt,
    };
  }
  return ctx;
}
