import { useState, useRef } from "react";

const AIRLINE_CODES = {
  AA: "American Airlines", UA: "United Airlines", DL: "Delta Air Lines",
  WN: "Southwest Airlines", B6: "JetBlue Airways", AS: "Alaska Airlines",
  F9: "Frontier Airlines", NK: "Spirit Airlines", G4: "Allegiant Air",
  HA: "Hawaiian Airlines", BA: "British Airways", LH: "Lufthansa",
  AF: "Air France", KL: "KLM", EK: "Emirates", QR: "Qatar Airways",
  SQ: "Singapore Airlines", CX: "Cathay Pacific", JL: "Japan Airlines",
  NH: "ANA", TK: "Turkish Airlines", LX: "Swiss", OS: "Austrian Airlines",
  IB: "Iberia", AZ: "ITA Airways", SK: "SAS", AY: "Finnair",
  AC: "Air Canada", WS: "WestJet", QF: "Qantas", NZ: "Air New Zealand",
  LA: "LATAM Airlines", G3: "Gol", AD: "Azul", ET: "Ethiopian Airlines",
  SA: "South African Airways", MS: "EgyptAir", SU: "Aeroflot",
  PS: "Ukraine International", LO: "LOT Polish Airlines",
  FR: "Ryanair", U2: "easyJet", VY: "Vueling", W6: "Wizz Air",
  EW: "Eurowings", HV: "Transavia", TP: "TAP Air Portugal",
};

export default function App() {
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const swapAirports = () => {
    setOrigin(dest);
    setDest(origin);
    setResult(null);
    setError("");
  };

  const formatCode = (val) => val.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

  const search = async () => {
    const o = origin.trim().toUpperCase();
    const d = dest.trim().toUpperCase();
    if (o.length < 3 || d.length < 3) {
      setError("Enter valid 3-letter IATA or 4-letter ICAO airport codes.");
      return;
    }
    if (o === d) {
      setError("Origin and destination must be different airports.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const prompt = `You are an aviation data expert. A user wants to know which aircraft types have historically operated flights between ${o} and ${d}.

Respond ONLY with a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "originName": "Full airport name including city",
  "destName": "Full airport name including city",
  "routeExists": true or false,
  "distance_km": approximate great circle distance as a number,
  "aircraft": [
    {
      "type": "e.g. Boeing 737-800",
      "iata": "IATA aircraft code e.g. 738",
      "icao": "ICAO aircraft code e.g. B738",
      "category": "Narrowbody" | "Widebody" | "Regional Jet" | "Turboprop" | "Business Jet",
      "airlines": ["list of airline names that have operated this type on this route"],
      "era": "current" | "historical" | "both",
      "notes": "brief note about usage on this specific route, or empty string"
    }
  ],
  "routeNotes": "any relevant notes about this route (codeshares, frequency, hub connections etc.)"
}

Sort aircraft by how common/significant they are on this route (most common first).
If the route is implausible or airports don't exist, set routeExists to false and aircraft to [].
Be comprehensive — include both current and historical operators if known.`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data = await resp.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/gi, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      if (e.name !== "AbortError") setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const categoryColor = {
    "Narrowbody": "#3B82F6",
    "Widebody": "#8B5CF6",
    "Regional Jet": "#10B981",
    "Turboprop": "#F59E0B",
    "Business Jet": "#EC4899",
  };

  const eraLabel = { current: "Active", historical: "Retired", both: "Mixed" };
  const eraStyle = {
    current: { bg: "#DCFCE7", color: "#166534" },
    historical: { bg: "#FEE2E2", color: "#991B1B" },
    both: { bg: "#FEF9C3", color: "#854D0E" },
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#F1F5F9",
    }}>
      {/* Header */}
      <div style={{ padding: "48px 24px 0", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "100px", padding: "6px 16px", marginBottom: "24px",
          fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#A5B4FC", fontWeight: 600,
        }}>
          ✈ Route Aircraft Finder
        </div>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 800,
          letterSpacing: "-0.03em", margin: "0 0 12px",
          background: "linear-gradient(135deg, #E0E7FF 0%, #A5B4FC 50%, #818CF8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          lineHeight: 1.1,
        }}>
          What flies between<br />any two airports?
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "16px", margin: 0 }}>
          Enter IATA (3-letter) or ICAO (4-letter) airport codes
        </p>
      </div>

      {/* Search */}
      <div style={{
        maxWidth: "600px", margin: "40px auto 0", padding: "0 24px",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px", padding: "24px",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Origin
              </label>
              <input
                value={origin}
                onChange={e => { setOrigin(formatCode(e.target.value)); setResult(null); setError(""); }}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="LAX"
                maxLength={4}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px", color: "#fff",
                  fontSize: "22px", fontWeight: 700, letterSpacing: "0.05em",
                  outline: "none", boxSizing: "border-box",
                  caretColor: "#818CF8",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#818CF8"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>

            <button
              onClick={swapAirports}
              style={{
                marginTop: "22px", background: "rgba(99,102,241,0.2)",
                border: "1px solid rgba(99,102,241,0.4)", borderRadius: "10px",
                color: "#A5B4FC", cursor: "pointer", padding: "10px 12px",
                fontSize: "18px", transition: "all 0.2s", flexShrink: 0,
              }}
              title="Swap airports"
            >
              ⇄
            </button>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "11px", color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Destination
              </label>
              <input
                value={dest}
                onChange={e => { setDest(formatCode(e.target.value)); setResult(null); setError(""); }}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="JFK"
                maxLength={4}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "12px", color: "#fff",
                  fontSize: "22px", fontWeight: 700, letterSpacing: "0.05em",
                  outline: "none", boxSizing: "border-box",
                  caretColor: "#818CF8",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#818CF8"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: "14px", padding: "10px 14px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "10px", color: "#FCA5A5", fontSize: "13px",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={search}
            disabled={loading}
            style={{
              width: "100%", marginTop: "16px", padding: "16px",
              background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366F1, #8B5CF6)",
              border: "none", borderRadius: "12px", color: "#fff",
              fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.02em", transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
            }}
          >
            {loading ? "Looking up aircraft…" : "Find Aircraft"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", marginTop: "48px", color: "#94A3B8" }}>
          <div style={{
            display: "inline-block", width: "36px", height: "36px",
            border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366F1",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: "16px", fontSize: "14px" }}>Searching aviation records…</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ maxWidth: "800px", margin: "40px auto 60px", padding: "0 24px" }}>
          {/* Route header */}
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px", padding: "20px 24px", marginBottom: "24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "16px",
          }}>
            <div>
              <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "4px" }}>Route</div>
              <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {result.originName} <span style={{ color: "#6366F1" }}>→</span> {result.destName}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "4px" }}>Distance</div>
              <div style={{ fontSize: "20px", fontWeight: 700 }}>
                {result.distance_km ? `${result.distance_km.toLocaleString()} km` : "—"}
              </div>
            </div>
          </div>

          {!result.routeExists ? (
            <div style={{
              textAlign: "center", padding: "60px 24px",
              background: "rgba(255,255,255,0.03)", borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🛑</div>
              <div style={{ fontSize: "18px", fontWeight: 600, color: "#F87171" }}>No Route Found</div>
              <div style={{ color: "#94A3B8", marginTop: "8px", fontSize: "14px" }}>
                This route doesn't appear to exist or the airport codes are invalid.
              </div>
            </div>
          ) : (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "16px",
              }}>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Aircraft Operated
                </h2>
                <span style={{
                  background: "rgba(99,102,241,0.2)", color: "#A5B4FC",
                  padding: "4px 12px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
                }}>
                  {result.aircraft.length} type{result.aircraft.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {result.aircraft.map((ac, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px", padding: "18px 20px",
                    transition: "border-color 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "17px", fontWeight: 700 }}>{ac.type}</span>
                          {ac.iata && (
                            <span style={{
                              background: "rgba(255,255,255,0.08)", color: "#CBD5E1",
                              padding: "2px 8px", borderRadius: "6px", fontSize: "12px",
                              fontWeight: 600, letterSpacing: "0.05em", fontFamily: "monospace",
                            }}>
                              {ac.iata}
                            </span>
                          )}
                          {ac.icao && (
                            <span style={{
                              background: "rgba(255,255,255,0.05)", color: "#94A3B8",
                              padding: "2px 8px", borderRadius: "6px", fontSize: "12px",
                              fontWeight: 600, letterSpacing: "0.05em", fontFamily: "monospace",
                            }}>
                              {ac.icao}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: ac.notes ? "10px" : 0 }}>
                          {ac.category && (
                            <span style={{
                              background: `${categoryColor[ac.category] || "#6366F1"}22`,
                              color: categoryColor[ac.category] || "#A5B4FC",
                              border: `1px solid ${categoryColor[ac.category] || "#6366F1"}44`,
                              padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 600,
                            }}>
                              {ac.category}
                            </span>
                          )}
                          {ac.era && (
                            <span style={{
                              background: eraStyle[ac.era]?.bg || "#e5e7eb",
                              color: eraStyle[ac.era]?.color || "#374151",
                              padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 600,
                            }}>
                              {eraLabel[ac.era] || ac.era}
                            </span>
                          )}
                        </div>

                        {ac.notes && (
                          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#94A3B8", lineHeight: 1.5 }}>
                            {ac.notes}
                          </p>
                        )}
                      </div>

                      {ac.airlines && ac.airlines.length > 0 && (
                        <div style={{ minWidth: "180px", maxWidth: "260px" }}>
                          <div style={{ fontSize: "11px", color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginBottom: "6px" }}>
                            Operated by
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {ac.airlines.map((airline, j) => (
                              <span key={j} style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "#CBD5E1", padding: "3px 9px",
                                borderRadius: "6px", fontSize: "12px",
                              }}>
                                {airline}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result.routeNotes && (
                <div style={{
                  marginTop: "20px", padding: "16px 20px",
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "12px", fontSize: "13px", color: "#94A3B8", lineHeight: 1.6,
                }}>
                  <span style={{ color: "#A5B4FC", fontWeight: 600 }}>Route notes: </span>
                  {result.routeNotes}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
