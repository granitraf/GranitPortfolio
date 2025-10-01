"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import CircularGallery from "./CircularGallery";

type StockSymbol = string;

type StockQuote = {
  symbol: StockSymbol;
  companyName: string;
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
  error?: string;
};

const FINNHUB_API_KEY = "d3904d1r01qthpo1o16gd3904d1r01qthpo1o170";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

const STOCKS: { symbol: StockSymbol; companyName: string }[] = [
  { symbol: "GOOG", companyName: "Alphabet Inc." },
  { symbol: "HNST", companyName: "The Honest Company, Inc." },
  { symbol: "FUBO", companyName: "fuboTV Inc." },
  { symbol: "ADBE", companyName: "Adobe Inc." },
  { symbol: "CRM", companyName: "Salesforce, Inc." },
  { symbol: "AMD", companyName: "Advanced Micro Devices, Inc." },
  { symbol: "CELH", companyName: "Celsius Holdings, Inc." },
  { symbol: "SNOW", companyName: "Snowflake Inc." },
];

const COMPANY_NAME_MAP: Record<string, string> = {
  GOOG: "Alphabet Inc.",
  TSLA: "Tesla, Inc.",
  PLTR: "Palantir Technologies Inc.",
  FUBO: "fuboTV Inc.",
  HIMS: "Hims & Hers Health, Inc.",
  CELH: "Celsius Holdings, Inc.",
  SHOP: "Shopify Inc.",
  SOFI: "SoFi Technologies, Inc.",
  HNST: "The Honest Company, Inc.",
  ADBE: "Adobe Inc.",
  CRM: "Salesforce, Inc.",
  AMD: "Advanced Micro Devices, Inc.",
  SNOW: "Snowflake Inc.",
};

type ActivePosition = {
  symbol: string;
  purchasePrice: number;
  purchaseDate: string;
  shares: number;
  isActive: true;
};

type ExitedPosition = {
  symbol: string;
  purchasePrice: number;
  exitPrice: number;
  purchaseDate: string;
  exitDate: string;
  shares: number;
  isActive: false;
};

type AnyPosition = ActivePosition | ExitedPosition;

type ProcessedPosition = AnyPosition & {
  currentPrice: number;
  returnPercentage: number;
  totalValue: number;
  totalGainLoss: number;
  status: "Active" | "Realized";
};

const POSITIONS: { active: ActivePosition[]; exited: ExitedPosition[] } = {
  active: [
    { symbol: "FUBO", purchasePrice: 1.42, purchaseDate: "2024-01-15", shares: 100, isActive: true },
    { symbol: "SHOP", purchasePrice: 65.51, purchaseDate: "2024-02-01", shares: 100, isActive: true },
    { symbol: "SOFI", purchasePrice: 13.62, purchaseDate: "2024-03-01", shares: 100, isActive: true },
    { symbol: "CELH", purchasePrice: 29.18, purchaseDate: "2024-04-01", shares: 100, isActive: true },
  ],
  exited: [
    { symbol: "PLTR", purchasePrice: 31.63, exitPrice: 172.0, purchaseDate: "2023-01-15", exitDate: "2024-11-15", shares: 100, isActive: false },
    { symbol: "HIMS", purchasePrice: 24.41, exitPrice: 46.74, purchaseDate: "2023-05-10", exitDate: "2024-10-20", shares: 100, isActive: false },
  ],
};

async function fetchLivePrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`, { cache: "no-store" });
    const data = await res.json();
    return typeof data.c === "number" ? data.c : null;
  } catch {
    return null;
  }
}

function calculateReturn(currentPrice: number, purchasePrice: number): number {
  return ((currentPrice - purchasePrice) / purchasePrice) * 100;
}

function formatAsOfTimestamp(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();
  const time = date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${month} ${day} ${year} ${time}`;
}

async function fetchQuote(symbol: StockSymbol): Promise<StockQuote> {
  try {
    const res = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    return {
      symbol,
      companyName: STOCKS.find((s) => s.symbol === symbol)!.companyName,
      currentPrice: typeof data.c === "number" ? data.c : null,
      previousClose: typeof data.pc === "number" ? data.pc : null,
      change: typeof data.d === "number" ? data.d : null,
      changePercent: typeof data.dp === "number" ? data.dp : null,
      high: typeof data.h === "number" ? data.h : null,
      low: typeof data.l === "number" ? data.l : null,
    };
  } catch (err: any) {
    return {
      symbol,
      companyName: STOCKS.find((s) => s.symbol === symbol)!.companyName,
      currentPrice: null,
      previousClose: null,
      change: null,
      changePercent: null,
      high: null,
      low: null,
      error: err?.message ?? "Failed to fetch",
    };
  }
}

export function InvestmentAnalystPortfolioDashboard() {
  const [quotes, setQuotes] = React.useState<Record<StockSymbol, StockQuote>>({} as any);
  const [lastUpdated, setLastUpdated] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [contactSubmitting, setContactSubmitting] = React.useState<boolean>(false);
  const [contactSuccess, setContactSuccess] = React.useState<boolean>(false);
  const [contactForm, setContactForm] = React.useState<{ name: string; email: string; message: string }>({ name: "", email: "", message: "" });
  const onChangeContact = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setContactForm((prev) => ({ ...prev, [id]: value } as any));
  };
  const onSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      alert('Please fill in all fields.');
      return;
    }
    try {
      setContactSubmitting(true);
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to send');
      }
      setContactSuccess(true);
      setContactForm({ name: '', email: '', message: '' });
    } catch (err: any) {
      alert(err?.message ?? 'Failed to send message');
    } finally {
      setContactSubmitting(false);
    }
  };
  const refreshRef = React.useRef<NodeJS.Timeout | null>(null);
  const [pdfOpen, setPdfOpen] = React.useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = React.useState<string>("");
  const [positions, setPositions] = React.useState<ProcessedPosition[] | null>(null);
  const [logos, setLogos] = React.useState<Record<string, string | null>>({});
  const [asOfTimestamp, setAsOfTimestamp] = React.useState<string>(() => formatAsOfTimestamp(new Date()));
  const PURCHASE_MAP: Record<string, number> = React.useMemo(() => ({
    GOOG: 171.10,
    HNST: 4.79,
    FUBO: 1.42,
    ADBE: 393.0,
    CRM: 249.66,
    AMD: 118.26,
    CELH: 29.18,
    SNOW: 204.0,
  }), []);
  const MARKETBRIEF_TRANSFORM = "perspective(1200px) rotateX(6deg) rotateY(-8deg)";

  // MarketBrief section visibility & GPU-friendly transforms
  const marketBriefRef = React.useRef<HTMLDivElement | null>(null);
  const marketBriefMediaRef = React.useRef<HTMLImageElement | null>(null);
  const marketBriefTransformRef = React.useRef<HTMLDivElement | null>(null);
  const [marketBriefVisible, setMarketBriefVisible] = React.useState(false);

  React.useEffect(() => {
    const el = marketBriefRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setMarketBriefVisible(true);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Ensure autoplay starts when visible
  React.useEffect(() => {
    if (marketBriefVisible && marketBriefMediaRef.current) {
      const media = marketBriefMediaRef.current;
      if (media && media.loading === "lazy") {
        // Force eager decode once visible for crisp display
        media.decode?.().catch(() => {
          /* ignore decode errors */
        });
      }
    }
  }, [marketBriefVisible]);

  // GPU-accelerated parallax tied to scroll
  React.useEffect(() => {
    const transformTarget = marketBriefTransformRef.current;
    if (!transformTarget) return;

    let rafId: number | null = null;

    const updateTransform = () => {
      rafId = null;
      const rect = transformTarget.getBoundingClientRect();
      const windowHeight = window.innerHeight || 1;
      const center = rect.top + rect.height / 2;
      const viewportOffset = (center - windowHeight / 2) / windowHeight;
      const translateY = Math.max(Math.min(viewportOffset * 40, 30), -30);

      transformTarget.style.setProperty("--marketbrief-parallax", `translate3d(0, ${translateY.toFixed(2)}px, 0)`);
    };

    const onScroll = () => {
      if (rafId != null) {
        return;
      }
      rafId = window.requestAnimationFrame(updateTransform);
    };

    updateTransform();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateTransform, { passive: true });

    return () => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateTransform);
    };
  }, []);

  const loadQuotes = React.useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(STOCKS.map((s) => fetchQuote(s.symbol)));
    const map = results.reduce((acc, q) => {
      acc[q.symbol] = q;
      return acc;
    }, {} as Record<StockSymbol, StockQuote>);
    setQuotes(map);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadQuotes();
    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(loadQuotes, 30000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [loadQuotes]);

  // Aggressively remove any third-party "Lucid Mode" overlays injected by extensions
  React.useEffect(() => {
    const killLucid = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.currentNode;
      while (node) {
        const el = node as HTMLElement;
        if (el && el.textContent && /lucid\s*mode/i.test(el.textContent)) {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("visibility", "hidden", "important");
          el.style.setProperty("pointer-events", "none", "important");
        }
        node = walker.nextNode();
      }
    };
    killLucid();
    const observer = new MutationObserver(() => killLucid());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const openPDFViewer = React.useCallback(async (url: string) => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) {
        alert("Report not found. Please place the PDF at apps/web/public" + url);
        return;
      }
    } catch {
      // ignore network error and still try to open
    }
    setPdfUrl(url);
    setPdfOpen(true);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  }, []);

  const closePDFViewer = React.useCallback(() => {
    setPdfOpen(false);
    setPdfUrl("");
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }, []);

  const processPosition = React.useCallback(async (p: AnyPosition): Promise<ProcessedPosition | null> => {
    let currentPrice: number | null;
    if (p.isActive) {
      currentPrice = await fetchLivePrice(p.symbol);
      if (currentPrice == null) return null;
    } else {
      currentPrice = (p as ExitedPosition).exitPrice;
    }
    const returnPercentage = calculateReturn(currentPrice, p.purchasePrice);
    const totalValue = currentPrice * p.shares;
    const totalGainLoss = (currentPrice - p.purchasePrice) * p.shares;
    return {
      ...p,
      currentPrice,
      returnPercentage,
      totalValue,
      totalGainLoss,
      status: p.isActive ? "Active" : "Realized",
    };
  }, []);

  const updateAllPositions = React.useCallback(async () => {
    const all = [...POSITIONS.active, ...POSITIONS.exited];
    const results: ProcessedPosition[] = [];
    for (const p of all) {
      const processed = await processPosition(p);
      if (processed) results.push(processed);
    }
    results.sort((a, b) => b.returnPercentage - a.returnPercentage);
    setPositions(results);
  }, [processPosition]);

  React.useEffect(() => {
    updateAllPositions();
    const id = setInterval(updateAllPositions, 30000);
    return () => clearInterval(id);
  }, [updateAllPositions]);

  React.useEffect(() => {
    const update = () => setAsOfTimestamp(formatAsOfTimestamp(new Date()));
    update();
    const id = window.setInterval(update, 60000);
    return () => window.clearInterval(id);
  }, []);

  const loadLogos = React.useCallback(async () => {
    const positionSymbols = [...POSITIONS.active, ...POSITIONS.exited].map((p) => p.symbol);
    const stockSymbols = STOCKS.map((s) => s.symbol);
    const symbols = Array.from(new Set([...positionSymbols, ...stockSymbols]));
    const entries: Array<[string, string | null]> = await Promise.all(
      symbols.map(async (s) => {
        try {
          const res = await fetch(`${FINNHUB_BASE_URL}/stock/profile2?symbol=${s}&token=${FINNHUB_API_KEY}`, {
            cache: "force-cache",
          });
          const data = await res.json();
          return [s, typeof data.logo === "string" ? data.logo : null];
        } catch {
          return [s, null];
        }
      }),
    );
    const map: Record<string, string | null> = {};
    entries.forEach(([s, l]) => (map[s] = l));
    setLogos(map);
  }, []);

  React.useEffect(() => {
    loadLogos();
  }, [loadLogos]);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Container for Desktop Split Layout */}
      <div className="main-container bg-background">
        {/* Profile Sidebar */}
        <aside className="profile-sidebar">
          <Card className="profile-card">
            <CardContent className="px-8 pt-3 pb-4 text-center">
              <div className="mb-8">
                <img 
                  src="/headshot.png" 
                  alt="Granit Rrafshi" 
                  className="w-64 h-80 mx-auto object-cover rounded-2xl shadow-lg"
                />
              </div>
              <h1 className="font-heading text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-6">
                Granit Rrafshi
              </h1>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
              Blending entrepreneurship with  equity analysis. Building real products backed by real numbers.
              </p>
              <div className="mt-2 flex justify-center">
                <a
                  href="https://www.linkedin.com/in/granitrrafshi"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn: Granit Rrafshi"
                  className="inline-flex items-center justify-center rounded-full h-9 w-9 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Icon icon="mdi:linkedin" className="h-5 w-5 text-muted-foreground" />
                </a>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Scrollable Content Area */}
        <main className="scrollable-content bg-background">
      {/* Profile Details Section */}
      <section className="profile-details">
        <div className="py-16 px-4 w-full">
          <div className="max-w-5xl w-full">
            <div className="mb-8">
            <h1 className="font-heading text-6xl font-bold mb-8 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
              Equity Researcher<br />& Founder
            </h1>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2.5">
                <h3 className="font-semibold text-primary uppercase text-3xl">Education</h3>
                <div className="flex items-start gap-2 text-base text-muted-foreground">
                  <Icon icon="mdi:school-outline" className="h-10 w-10 text-primary -mt-1.5" />
                  <span><span className="font-bold">Western University</span> — BMOS, Honors Specialization in Finance & Administration</span>
                </div>
                <div className="flex items-start gap-2 text-base text-muted-foreground">
                  <Icon icon="mdi:medal-outline" className="h-6 w-6 text-primary mt-0.5" />
                  <span>Adventis Financial Modeling Certification (FMC)</span>
                </div>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:dots-horizontal" className="h-6 w-6 text-primary mt-0.5" />
                <span>Working towards CSC Level I</span>
              </div>
              </div>
            <div className="space-y-2.5">
              <h3 className="font-semibold text-primary uppercase text-3xl">Experience</h3>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:magnify" className="h-6 w-6 text-primary -mt-0.5 transform -scale-x-100" />
                <span>2+ Years in Equity Research (Independent)</span>
              </div>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:account" className="h-5.5 w-5.5 text-primary -mt-0.5" />
                <span>Founder of Alert Index</span>
              </div>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:account" className="h-5.5 w-5.5 text-primary -mt-0.5" />
                <span>Lead Developer of MarketBrief</span>
              </div>
            </div>
            <div className="space-y-2.5">
              <h3 className="font-semibold text-primary uppercase text-3xl">Specialization</h3>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:brain" className="h-5 w-5 text-primary mt-0.5" />
                <span>Growth & Value Investor</span>
              </div>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:brain" className="h-8 w-8 text-primary mt-0.5" />
                <span>US Tech Equities • Cloud Software, Fintech, and SaaS Companies</span>
              </div>
              <div className="flex items-start gap-2 text-base text-muted-foreground">
                <Icon icon="mdi:brain" className="h-5 w-5 text-primary mt-0.5" />
                <span>GARP • DCF/comps</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Top Returns - calculated from active/exited positions */}
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">My Top Returns</h2>
          <p className="text-sm font-medium text-muted-foreground/80 mb-12 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-red-500 font-semibold tracking-[0.25em] uppercase">
              Live Return
              <span className="live-indicator-dot" />
              :
            </span>
            <span className="text-xs sm:text-sm tracking-wide">As of {asOfTimestamp}</span>
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {positions ? (
              positions.map((p) => {
                const isUp = p.returnPercentage >= 0;
                return (
                  <Card key={`${p.symbol}-${p.status}`} className="group hover:shadow-xl transition-all duration-300 cursor-pointer">
                    <CardContent className="px-6 py-6 text-center flex flex-col items-center">
                      <div className="h-20 w-full flex items-center justify-center mb-2">
                        {logos[p.symbol] ? (
                          <img src={logos[p.symbol]!} alt={`${p.symbol} logo`} className="h-full w-auto rounded-sm" />
                        ) : null}
                      </div>
                      <div className="text-3xl font-bold text-primary mb-2">{p.symbol}</div>
                      <div className="text-sm text-muted-foreground mb-4 min-h-10 flex items-center justify-center text-center">{COMPANY_NAME_MAP[p.symbol] || p.symbol}</div>
                      <div className={`text-2xl font-bold ${isUp ? "text-green-500" : "text-red-500"} mb-2`}>
                        {isUp ? "+" : ""}{p.returnPercentage.toFixed(2)}%
                      </div>
                      <div className="mt-1 min-h-10 flex flex-col items-center justify-center gap-1">
                        <Badge variant="secondary" className="stock-recommendation">
                          {p.isActive
                            ? (p.symbol === "SHOP" || p.symbol === "SOFI" || p.symbol === "CELH"
                                ? "Buy"
                                : (Math.abs(p.returnPercentage) > 10 ? "Strong Buy" : "Buy"))
                            : (p.symbol === "PLTR" || p.symbol === "HIMS" ? "Sell - Hold" : "Hold")}
                        </Badge>
                        <span className={`text-xs ${p.isActive ? "text-emerald-300/70" : "text-red-300/70"}`}>
                          {p.isActive ? "current position" : "exited position"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={`skeleton-${i}`} className="group transition-all duration-300 cursor-pointer">
                  <CardContent className="px-6 py-8 text-center">
                    <Skeleton className="h-6 w-24 mb-2 mx-auto" />
                    <Skeleton className="h-4 w-32 mb-4 mx-auto" />
                    <Skeleton className="h-6 w-24 mb-2 mx-auto" />
                    <Skeleton className="h-6 w-20 mb-2 mx-auto" />
                    <Skeleton className="h-6 w-16 mx-auto" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <div className="mb-6">
            <h2 className="font-heading text-6xl font-bold text-left mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">My Current Top Picks</h2>
            <p className="text-sm font-medium text-muted-foreground/80 mb-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-red-500 font-semibold tracking-[0.25em] uppercase">
                Live Return
                <span className="live-indicator-dot" />
                :
              </span>
              <span className="text-xs sm:text-sm tracking-wide">As of {asOfTimestamp}</span>
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STOCKS.map((s) => {
              const q = quotes[s.symbol];
              const apiPercent = q?.changePercent ?? null;
              const purchase = PURCHASE_MAP[s.symbol];
              const computedPercent = q && q.currentPrice != null && purchase
                ? ((q.currentPrice - purchase) / purchase) * 100
                : (apiPercent as number | null);
              const isUp = computedPercent != null && computedPercent >= 0;
              const percentText = computedPercent != null
                ? `${computedPercent >= 0 ? "+" : ""}${computedPercent.toFixed(2)}%`
                : "--";
              const dayPercent = q?.changePercent ?? null;
              const dayUp = dayPercent != null && dayPercent >= 0;
              const dayText = dayPercent != null ? `${dayPercent >= 0 ? "+" : ""}${dayPercent.toFixed(2)}%` : "--";
              return (
                <Card key={`pick-${s.symbol}`} className={`group hover:shadow-xl transition-all duration-300 cursor-pointer ${loading ? "opacity-80" : ""}`} data-symbol={s.symbol}>
                  <CardContent className="px-6 py-6 text-center flex flex-col items-center">
                    <div className="h-20 w-full flex items-center justify-center mb-2">
                      {logos[s.symbol] ? (
                        <img src={logos[s.symbol]!} alt={`${s.symbol} logo`} className="h-full w-auto rounded-sm" />
                      ) : null}
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{s.symbol}</div>
                    <div className="text-sm text-muted-foreground mb-4 min-h-10 flex items-center justify-center text-center">{s.companyName}</div>
                    {q && q.currentPrice != null ? (
                      <>
                        <div className="mb-3 flex items-center justify-center gap-2">
                          <span className="stock-price text-lg font-semibold">${q.currentPrice.toFixed(2)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${dayUp ? "bg-green-500/15 text-green-500" : "bg-red-900/40 text-red-300"}`}>{dayText}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Position Return</div>
                        <div className={`text-2xl font-bold ${isUp ? "text-green-500" : "text-red-500"} mb-2`}>{percentText}</div>
                        <div className="mt-1 min-h-10 flex flex-col items-center justify-center gap-1">
                          <Badge variant="secondary" className="stock-recommendation">
                            {s.symbol === "AMD" || s.symbol === "SNOW" ? "Buy" : "Strong Buy"}
                          </Badge>
                          <span className="text-xs text-emerald-300/70">current position</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
            Latest Equity Reports
          </h2>
          <div className="flex justify-center">
            <Card className="w-full md:max-w-3xl lg:max-w-3xl group cursor-pointer overflow-hidden hover:shadow-2xl transition-all duration-500" onClick={() => openPDFViewer("/reports/Celsius_StrategicProjectFeasibilityReport.pdf")}> 
              <div className="relative h-48 bg-gradient-to-br from-orange-400 to-white-50/90 flex items-center justify-center">
                <Icon icon="mdi:file-pdf-box" className="text-6xl text-primary" />
                <div className="absolute top-4 right-4">
                  <Badge>Q4 2024</Badge>
                </div>
                <img
                  src="/logos/celsius.png"
                  alt="Celsius logo"
                  className="absolute bottom-3 right-3 h-10 w-auto opacity-90 select-none pointer-events-none"
                />
              </div>
              <CardContent className="px-6">
                <h3 className="font-semibold text-lg mb-2">Celsius® Strategic Project Feasibility Report</h3>
                <p className="text-sm1.5 text-muted-foreground mb-4">
                A corporate finance proposal assessing the feasibility and financial viability of Celsius opening a branded premium gym, using capital budgeting and strategic analysis.
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-primary font-medium">25 pages</span>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openPDFViewer("/reports/Celsius_StrategicProjectFeasibilityReport.pdf"); }}>
                    <Icon icon="mdi:download" className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
            
          </div>
        </div>
      </div>
      {/* PDF Modal */}
      {pdfOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95">
          <div className="bg-background border border-border rounded-xl w-[90%] max-w-[1200px] h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-foreground text-base font-semibold">Report Viewer</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, "_blank")}>Download</Button>
                <Button variant="outline" size="sm" onClick={closePDFViewer}>✕</Button>
              </div>
            </div>
            <div className="flex-1 bg-black rounded-b-xl overflow-hidden">
              <iframe src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`} className="w-full h-full" />
            </div>
          </div>
        </div>
      ) : null}
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
            <span className="inline-flex items-center gap-5">
              LEAD DEVELOPER:
              <a href="https://www.marketbrief.app" target="_blank" rel="noopener noreferrer" aria-label="MarketBrief">
                <img src="/logos/marketbrief.png" alt="MarketBrief logo" className="h-18 w-auto" />
              </a>
            </span>
          </h2>
          <div className="mb-8 grid gap-3 text-sm md:text-base">
            <div className="flex items-start gap-2">
              <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
              <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Real-time macro &amp; market dashboard for investors</span>
            </div>
            <div className="flex items-start gap-2">
              <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
              <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Tracks equities, ETFs, commodities, global indices, and real-time news</span>
            </div>
            <div className="flex items-start gap-2">
              <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
              <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Integrated earnings calendar with upcoming reports</span>
            </div>
            <div className="flex items-start gap-2">
              <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
              <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Self coded with <span className="text-green-400 glow-green">Javascript</span> and <span className="text-green-400 glow-green">Python</span></span>
            </div>
          </div>
          {/* Dashboard-style UI with angled video. Visible on scroll */}
          <div ref={marketBriefRef} className={`transition-all duration-700 ease-out ${marketBriefVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div className="flex justify-center">
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  <div
                    className="w-full h-full rounded-[28px] bg-gradient-to-br from-white/18 via-slate-300/10 to-transparent blur-lg opacity-50"
                    style={{ transform: `${MARKETBRIEF_TRANSFORM} scale(1.02)` }}
                  />
                </div>
                <div
                  ref={marketBriefTransformRef}
                  className="marketbrief-video-container relative w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-black/60 transform-gpu"
                  style={{ transform: MARKETBRIEF_TRANSFORM }}
                >
                  <img
                    ref={marketBriefMediaRef}
                    src="/marketbrief/sideview.png"
                    alt="MarketBrief dashboard"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto block pointer-events-none select-none"
                    style={{ filter: "saturate(1.08) contrast(1.08)", transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform" }}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                  {/* Subtle dashboard top bar */}
                  <div className="pointer-events-none absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-black/60 to-transparent" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
              <a
                href="https://www.marketbrief.app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-3 rounded-full bg-gradient-to-br from-slate-50 to-slate-300 text-black text-lg font-semibold shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/30 transition-colors"
              >
                View
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
            <span className="inline-flex items-center gap-4">
              FOUNDER OF:
              <a href="https://www.thealertindex.com" target="_blank" rel="noopener noreferrer" aria-label="The Alert Index">
                <img src="/logos/alertindex.png" alt="Alert Index logo" className="h-14 w-auto" />
              </a>
            </span>
          </h2>
          <div className="mb-8 flex items-start gap-6">
            <div className="grid gap-3 text-sm md:text-base flex-1">
              <div className="flex items-start gap-2">
                <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
                <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Online Clothing E-Commerce Business</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
                <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Accumulated over <span className="text-green-400 glow-green">6 figures in sales</span></span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1.5" />
                <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Have <span className="text-green-400 glow-green">shipped to 5 continents</span></span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="mdi:check-circle" className="h-4 w-4 text-primary mt-1" />
                <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">
                  <span className="block">Directed end-to-end product development,</span>
                  <span className="block">sampling, production,</span>
                  <span className="block">and fulfillment</span>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Icon icon="mdi:check-circle" className="h-6 w-6 text-primary mt-1" />
                <span className="font-bold text-slate-200 text-lg md:text-xl tracking-tight">Optimized conversions with SMS and Email marketing, driving <span className="text-green-400 glow-green">15%</span> total revenue</span>
              </div>
              </div>
            <div className="hidden sm:block w-[338px] md:w-[406px] lg:w-[473px] self-start -ml-6 md:-ml-12 lg:-ml-16">
              <a href="https://www.thealertindex.com" target="_blank" rel="noopener noreferrer" aria-label="The Alert Index" className="block">
                <div className="marketbrief-video-container relative rounded-2xl border border-white/10 overflow-hidden bg-black/60 transform-gpu shadow-2xl cursor-pointer" style={{ transform: MARKETBRIEF_TRANSFORM }}>
                  <img
                    src="/alertindex/index.png"
                    alt="Alert Index preview"
                    className="w-full h-auto block pointer-events-none select-none"
                    style={{ filter: "saturate(1.05) contrast(1.05)", transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform" }}
                  />
                  <div className="pointer-events-none absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black/50 to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
              </a>
            </div>
          </div>
          <div className="mt-6 mobile-gallery-frame" style={{ height: "600px", position: "relative" }}>
            {(() => {
              const galleryItems = Array.from({ length: 20 }, (_, i) => ({
                image: `/gallery/${i + 1}.jpg`,
                text: ``,
              }));
              return (
                <CircularGallery
                  items={galleryItems}
                  bend={1}
                  textColor="#ffffff"
                  borderRadius={0.05}
                  scrollEase={0.05}
                />
              );
            })()}
          </div>
        </div>
      </div>
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
            StockTrak Portfolio Management Competition
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-1 flex flex-col gap-4">
                <div>
                  <Badge className="mb-3 bg-green-600/90 text-white uppercase tracking-[0.3em]">1st Place Finish</Badge>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold">3316 Investment Management Competition</h3>
                    <div className="flex items-center gap-2">
                      <div className="h-14 w-auto">
                        <img src="/logos/stocktrak.png" alt="StockTrak" className="h-14 w-auto object-contain" />
                      </div>
                      <div className="h-14 w-auto">
                        <img src="/logos/western.png" alt="Western University" className="h-14 w-auto object-contain" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Achieved 1st place out of all 3316 sections competing student portfolios in a 9-week market investment simulation using StockTrak.
                  </p>
                  <p className="text-xs uppercase tracking-[0.35em] text-red-400/80 mt-4">Constraints</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400/80" />
                      5–10% position limits per security
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400/80" />
                      Maximum 20% cash holding
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400/80" />
                      Diversified portfolio construction maintained throughout
                    </li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-xs uppercase text-muted-foreground tracking-[0.25em]">9-Week Return</p>
                    <p className="text-3xl font-bold text-green-400">+14.27%</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-xs uppercase text-muted-foreground tracking-[0.25em]">Sharpe Ratio</p>
                    <p className="text-3xl font-bold text-primary">5.00</p>
                    
                  </div>
                </div>
                <p className="text-xs uppercase text-muted-foreground tracking-[0.35em] mt-4 mb-2">Full Report</p>
                <Card className="cursor-pointer hover:shadow-md transition-all duration-300 overflow-hidden" onClick={() => openPDFViewer("/reports/3316_FinalPaper.pdf")}>
                  <div className="relative h-20 bg-gradient-to-br from-green-600 to-black/30 flex items-center justify-center">
                    <Icon icon="mdi:file-pdf-box" className="text-4xl text-white" />
                  </div>
                  <CardContent className="p-3">
                    <h4 className="text-sm font-semibold mb-1 line-clamp-2">Virtual Stock Exchange Competition Report</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">9 pages</span>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); openPDFViewer("/reports/3316_FinalPaper.pdf"); }}>
                        <Icon icon="mdi:download" className="w-3 h-3 mr-1" />
                        View Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            <Card className="group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-1 flex flex-col gap-4">
                <div>
                  <Badge variant="secondary" className="mb-3 uppercase tracking-[0.3em]">Insights</Badge>
                  <h3 className="text-xl font-semibold">Strategy & Outperformance</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                  Built an actively managed portfolio balancing high-growth tech bets with defensive sectors. Emphasized disciplined stock selection, earnings catalysts, and diversification to manage risk.
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400/80 shrink-0" />
                    <span>
                      <span className="text-green-400">Sector Focus:</span> Growth in <span className="font-semibold">Technology &amp; Fintech</span>, Stability from <span className="font-semibold">Financials &amp; Defensive Assets</span>, Opportunistic plays in <span className="font-semibold">Consumer Brands</span>.
                    </span>
                  </li>
                </ul>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="grid grid-cols-3 divide-x divide-white/10">
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">S&amp;P 500<br />Return</p>
                      <p className="text-3xl font-bold text-foreground mt-1">7.06%</p>
                    </div>
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">My<br />Return</p>
                      <p className="text-3xl font-bold text-foreground mt-1">14.27%</p>
                    </div>
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">Portfolio<br />Outperformance</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">+7.21%</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="grid grid-cols-3 divide-x divide-white/10">
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">Dow Jones<br />Return</p>
                      <p className="text-3xl font-bold text-foreground mt-1">7.90%</p>
                    </div>
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">My<br />Return</p>
                      <p className="text-3xl font-bold text-foreground mt-1">14.27%</p>
                    </div>
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">Portfolio<br />Outperformance</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">+6.37%</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="grid grid-cols-3 divide-x divide-white/10">
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">Nasdaq-100<br />Return</p>
                      <p className="text-3xl font-bold text-foreground mt-1">7.71%</p>
                    </div>
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">My<br />Return</p>
                      <p className="text-3xl font-bold text-foreground mt-1">14.27%</p>
                    </div>
                    <div className="p-4 md:p-4 text-center">
                      <p className="text-[13px] uppercase text-muted-foreground tracking-tight">Portfolio<br />Outperformance</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">+6.56%</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 font-semibold">Returns are from September 16th, 2024 to November 29th, 2024</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-12 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
            Toolkit
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/bloomberg.png" alt="Bloomberg Market Concepts" />
                  </div>
                  <h3 className="font-semibold mb-2">Bloomberg Market Concepts</h3>
                  <p className="text-sm text-muted-foreground">
                  Understanding in financial markets with Bloomberg, covering equities, fixed income, FX, and economic indicators.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/excel.png" alt="Advanced Excel" />
                  </div>
                  <h3 className="font-semibold mb-2">Advanced Excel</h3>
                  <p className="text-sm text-muted-foreground">
                    Financial modeling, DCF modeling, LBO modeling, and valuation frameworks
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/research.png" alt="Extensive Market Understanding" />
                  </div>
                  <h3 className="font-semibold mb-2">Extensive Market Understanding</h3>
                  <p className="text-sm text-muted-foreground">
                    Deep expertise across global equities, macro trends, and industry shifts
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/python.png" alt="Python" />
                  </div>
                  <h3 className="font-semibold mb-2">Python</h3>
                  <p className="text-sm text-muted-foreground">
                    Data engineering, quantitative analysis, and automation pipelines
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/adobe.png" alt="Adobe Suite" />
                  </div>
                  <h3 className="font-semibold mb-2">Adobe Suite</h3>
                  <p className="text-sm text-muted-foreground">
                    Creative direction, pitch design, and investor-ready storytelling
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image toolkit-card-image-large">
                    <img src="/logos/production.png" alt="E-commerce Operations" />
                  </div>
                  <h3 className="font-semibold mb-2">E-commerce Operations</h3>
                  <p className="text-sm text-muted-foreground">
                    End-to-end execution across merchandising, marketing, and fulfillment
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/risk.png" alt="Risk Management" />
                  </div>
                  <h3 className="font-semibold mb-2">Risk Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Portfolio construction, hedging frameworks, and downside protection
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="text-center group hover:shadow-xl transition-all duration-300">
              <CardContent className="px-6 py-8">
                <div className="toolkit-card">
                  <div className="toolkit-card-image">
                    <img src="/logos/javascript.png" alt="Javascript" />
                  </div>
                  <h3 className="font-semibold mb-2">Javascript</h3>
                  <p className="text-sm text-muted-foreground">
                    Data-driven web experiences and interactive investment dashboards
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Open to Roles Section */}
      <div className="py-16 px-4 w-full">
        <div className="max-w-5xl w-full">
          <h2 className="font-heading text-6xl font-bold text-left mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent uppercase">
            Open to Roles
          </h2>
          <p className="text-muted-foreground mb-10">
            Open to part-time, full-time, or contract. Quick reply; transcript and full CV on request.
          </p>

          <Card className="overflow-hidden">
            <CardContent className="px-6 py-8">
                  <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmitContact}>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your name" value={contactForm.name} onChange={onChangeContact} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your@email.com" value={contactForm.email} onChange={onChangeContact} required />
                    </div>
                    <div className="md:col-span-2 grid gap-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Optional note (role, timeline, etc.)" className="min-h-[220px]" value={contactForm.message} onChange={onChangeContact} required />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-4">
                        <Button className="bg-green-600 hover:bg-green-700 text-white" type="submit" disabled={contactSubmitting}>
                          {contactSubmitting ? 'Sending...' : 'Submit'}
                        </Button>
                        {contactSuccess ? <span className="text-green-400 font-medium">message sent!</span> : null}
                      </div>
                    </div>
                  </form>
            </CardContent>
          </Card>
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}
