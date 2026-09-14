import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Plus, LockKeyhole, History, FileBarChart2, BookOpen, Download, AlertTriangle, Check, X, Flame, TrendingUp, TrendingDown, ChevronRight, Trash2, Pencil } from "lucide-react";

/* ─────────────────────────────────────────────
   CALCULATION ENGINE  (authoritative, pure)
───────────────────────────────────────────── */
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

function calculateDay({ totalOnlineDeposits, totalOnlineWithdrawals, totalPaperStake, totalPaperWinning }) {
  for (const [k, v] of Object.entries({ totalOnlineDeposits, totalOnlineWithdrawals, totalPaperStake, totalPaperWinning })) {
    if (typeof v !== "number" || isNaN(v) || v < 0) throw new Error(`Bad value: ${k}`);
  }
  const operatingResult  = round2(totalOnlineWithdrawals + totalPaperWinning - totalOnlineDeposits - totalPaperStake);
  const depositCommission = round2(totalOnlineDeposits * 0.06);
  const paperCommission   = round2(totalPaperStake    * 0.03);
  const totalCommission   = round2(depositCommission + paperCommission);
  const netResult         = round2(operatingResult + totalCommission);
  return { totalOnlineDeposits, totalOnlineWithdrawals, totalPaperStake, totalPaperWinning, operatingResult, depositCommission, paperCommission, totalCommission, netResult };
}

/* ─────────────────────────────────────────────
   STORAGE  (localStorage, keyed per device)
───────────────────────────────────────────── */
const LS = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const K = { DAYS: "ldgr:days", AUDIT: "ldgr:audit" };

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtN(n, abs = false) {
  const v = abs ? Math.abs(n) : n;
  const sign = v < 0 ? "−" : "";
  return sign + "₦" + Math.abs(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
function monthKey(d) { return d.slice(0, 7); }

/* ─────────────────────────────────────────────
   ROOT
───────────────────────────────────────────── */
const TABS = [
  { id: "entry",   label: "Entry",   Icon: Plus           },
  { id: "dash",    label: "Today",   Icon: TrendingUp     },
  { id: "history", label: "History", Icon: History        },
  { id: "reports", label: "Reports", Icon: FileBarChart2  },
  { id: "backup",  label: "Backup",  Icon: Download       },
];

export default function App() {
  const [booted, setBooted]   = useState(false);
  const [days,   setDays]     = useState({});
  const [audit,  setAudit]    = useState([]);
  const [tab,    setTab]      = useState("entry");
  const [prevTab, setPrevTab] = useState(null);

  useEffect(() => {
    setDays(LS.get(K.DAYS,  {}));
    setAudit(LS.get(K.AUDIT, []));
    setBooted(true);
  }, []);

  const pushAudit = useCallback((action, detail) => {
    setAudit(prev => {
      const next = [{ id: uid(), action, detail, at: new Date().toISOString() }, ...prev].slice(0, 500);
      LS.set(K.AUDIT, next);
      return next;
    });
  }, []);

  const persistDays = useCallback((next) => { setDays(next); LS.set(K.DAYS, next); }, []);

  function navigate(next) {
    if (next === tab) return;
    setPrevTab(tab);
    setTab(next);
  }

  if (!booted) {
    return (
      <div className="root">
        <style>{CSS}</style>
        <div className="splash"><BookOpen size={32} strokeWidth={1.4} /><span>Ledger</span></div>
      </div>
    );
  }

  return (
    <div className="root">
      <style>{CSS}</style>

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-brand"><BookOpen size={18} strokeWidth={1.5} />Ledger</div>
        <div className="topbar-date">{fmtDate(todayStr())}</div>
      </header>

      {/* Animated page area */}
      <main className="pages">
        <Page active={tab === "entry"}>
          <TodayEntry days={days} persistDays={persistDays} pushAudit={pushAudit} goToHistory={() => navigate("history")} />
        </Page>
        <Page active={tab === "dash"}>
          <Dashboard days={days} goEntry={() => navigate("entry")} goHistory={() => navigate("history")} />
        </Page>
        <Page active={tab === "history"}>
          <HistoryView days={days} persistDays={persistDays} pushAudit={pushAudit} />
        </Page>
        <Page active={tab === "reports"}>
          <Reports days={days} />
        </Page>
        <Page active={tab === "backup"}>
          <BackupView days={days} audit={audit} />
        </Page>
      </main>

      {/* Bottom tab bar */}
      <nav className="tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab${tab === id ? " tab-active" : ""}`}
            onClick={() => navigate(id)}
          >
            <span className="tab-icon-wrap">
              <Icon size={20} strokeWidth={tab === id ? 2.2 : 1.7} />
              {tab === id && <span className="tab-dot" />}
            </span>
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* Animated page wrapper — CSS fade+slide, no JS */
function Page({ active, children }) {
  const [rendered, setRendered] = useState(active);
  useEffect(() => { if (active) setRendered(true); }, [active]);
  if (!rendered && !active) return null;
  return (
    <div className={`page-wrap${active ? " page-in" : " page-out"}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TODAY'S ENTRY
───────────────────────────────────────────── */
function AmountSection({ label, colorClass, entries, onAdd, onRemove, onEdit, disabled }) {
  const [input, setInput]   = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEV]    = useState("");
  const [err, setErr]       = useState("");
  const ref                 = useRef(null);

  const total = round2(entries.reduce((s, e) => s + e.amount, 0));

  function add() {
    const raw = input.replace(/,/g, "").trim();
    if (!raw) return setErr("Type an amount");
    const n = parseFloat(raw);
    if (isNaN(n) || n < 0) return setErr("Enter 0 or more");
    onAdd(round2(n));
    setInput("");
    setErr("");
    setTimeout(() => ref.current?.focus(), 30);
  }

  function startEdit(id, amount) { setEditId(id); setEV(amount.toString()); }
  function commitEdit(id) {
    const n = parseFloat(editVal);
    if (!isNaN(n) && n >= 0) onEdit(id, round2(n));
    setEditId(null);
  }

  return (
    <div className={`amt-card ${colorClass}`}>
      <div className="amt-card-head">
        <span className="amt-card-label">{label}</span>
        <span className="amt-card-total mono">{fmtN(total)}</span>
      </div>

      {!disabled && (
        <div className="amt-row">
          <span className="amt-sym">₦</span>
          <input
            ref={ref}
            className="amt-inp mono"
            type="number"
            min="0"
            placeholder="0"
            value={input}
            onChange={e => { setInput(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && add()}
            inputMode="decimal"
          />
          <button className="amt-btn" onClick={add}><Plus size={18} strokeWidth={2.5} /></button>
        </div>
      )}
      {err && <p className="amt-err"><AlertTriangle size={11} />{err}</p>}

      {entries.length > 0 && (
        <ul className="amt-list">
          {entries.map(e => (
            <li className="amt-item" key={e.id}>
              {editId === e.id
                ? <input className="amt-edit mono" type="number" value={editVal} autoFocus
                    onChange={ev => setEV(ev.target.value)}
                    onBlur={() => commitEdit(e.id)}
                    onKeyDown={ev => ev.key === "Enter" && commitEdit(e.id)} />
                : <span className="mono amt-item-val">{fmtN(e.amount)}</span>
              }
              {!disabled && (
                <span className="amt-item-btns">
                  <button onClick={() => startEdit(e.id, e.amount)} className="ic-btn"><Pencil size={12} /></button>
                  <button onClick={() => onRemove(e.id)} className="ic-btn ic-del"><Trash2 size={12} /></button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TodayEntry({ days, persistDays, pushAudit, goToHistory }) {
  const today    = todayStr();
  const existing = days[today];
  const isClosed = existing?.status === "closed";

  function initList(field) {
    if (existing?.[field]?.length) return existing[field].map(e => ({ id: e.id || uid(), amount: e.amount }));
    return [];
  }

  const [deposits,      setDeposits]      = useState(() => initList("deposits"));
  const [withdrawals,   setWithdrawals]   = useState(() => initList("withdrawals"));
  const [ticketStakes,  setTicketStakes]  = useState(() => initList("ticketStakes"));
  const [ticketWinnings,setTicketWinnings]= useState(() => initList("ticketWinnings"));
  const [showReceipt,   setShowReceipt]   = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [err, setErr] = useState("");

  function makeH(setter) {
    return {
      onAdd:    amt  => setter(p => [...p, { id: uid(), amount: amt }]),
      onRemove: id   => setter(p => p.filter(e => e.id !== id)),
      onEdit:   (id, amt) => setter(p => p.map(e => e.id === id ? { ...e, amount: amt } : e)),
    };
  }

  const calc = useMemo(() => {
    const D  = round2(deposits.reduce((s,e)=>s+e.amount, 0));
    const W  = round2(withdrawals.reduce((s,e)=>s+e.amount, 0));
    const TS = round2(ticketStakes.reduce((s,e)=>s+e.amount, 0));
    const TW = round2(ticketWinnings.reduce((s,e)=>s+e.amount, 0));
    try { return { ok:true, r: calculateDay({ totalOnlineDeposits:D, totalOnlineWithdrawals:W, totalPaperStake:TS, totalPaperWinning:TW }) }; }
    catch(e) { return { ok:false, err: e.message }; }
  }, [deposits, withdrawals, ticketStakes, ticketWinnings]);

  function buildRecord(status) {
    if (!calc.ok) throw new Error(calc.err);
    return {
      date: today, status,
      deposits:       deposits.map(e=>({id:e.id,amount:e.amount})),
      withdrawals:    withdrawals.map(e=>({id:e.id,amount:e.amount})),
      ticketStakes:   ticketStakes.map(e=>({id:e.id,amount:e.amount})),
      ticketWinnings: ticketWinnings.map(e=>({id:e.id,amount:e.amount})),
      totalOnlineDeposits:   calc.r.totalOnlineDeposits,
      totalOnlineWithdrawals:calc.r.totalOnlineWithdrawals,
      totalPaperStake:       calc.r.totalPaperStake,
      totalPaperWinning:     calc.r.totalPaperWinning,
      calc: calc.r,
      ...(status==="closed" ? {closedAt:new Date().toISOString()} : {updatedAt:new Date().toISOString()}),
    };
  }

  function saveDraft() {
    if (!calc.ok) return setErr(calc.err);
    try { persistDays({...days,[today]:buildRecord("draft")}); setSaved(true); setTimeout(()=>setSaved(false),1500); }
    catch(e) { setErr(e.message); }
  }

  function closeDay() {
    if (!calc.ok) return setErr(calc.err);
    try {
      const rec = buildRecord("closed");
      persistDays({...days,[today]:rec});
      pushAudit("DAY_CLOSED", `${today} — net ${fmtN(calc.r.netResult)}`);
      setShowReceipt(true);
    } catch(e) { setErr(e.message); }
  }

  const gain = calc.ok && calc.r.netResult >= 0;

  return (
    <div className="pg">
      <div className="pg-head">
        <h1 className="pg-title">Today's entry</h1>
        {isClosed && <span className="badge badge-lock"><LockKeyhole size={11}/>Closed</span>}
      </div>

      {saved && <div className="toast toast-ok"><Check size={13}/>Saved as draft</div>}
      {err   && <div className="toast toast-err"><AlertTriangle size={13}/>{err}</div>}

      <div className="sections">
        <AmountSection label="Deposit"        colorClass="card-dep" entries={deposits}       {...makeH(setDeposits)}       disabled={isClosed} />
        <AmountSection label="Withdrawal"     colorClass="card-wd"  entries={withdrawals}    {...makeH(setWithdrawals)}    disabled={isClosed} />
        <AmountSection label="Ticket Stake"   colorClass="card-ts"  entries={ticketStakes}   {...makeH(setTicketStakes)}   disabled={isClosed} />
        <AmountSection label="Ticket Winning" colorClass="card-tw"  entries={ticketWinnings} {...makeH(setTicketWinnings)} disabled={isClosed} />
      </div>

      {calc.ok && (
        <div className={`result-card ${gain ? "result-gain" : "result-loss"}`}>
          <div className="result-rows">
            <ResultRow label="Operating result"     val={calc.r.operatingResult}   dim />
            <ResultRow label="Deposit commission 6%" val={calc.r.depositCommission} dim />
            <ResultRow label="Ticket commission 3%"  val={calc.r.paperCommission}   dim />
            <ResultRow label="Total commission"      val={calc.r.totalCommission}   dim />
          </div>
          <div className="result-net">
            <span className="result-net-label">
              {gain ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
              Net {gain ? "Profit" : "Loss"}
            </span>
            <span className="result-net-val mono">{fmtN(calc.r.netResult, true)}</span>
          </div>
        </div>
      )}

      {!isClosed && (
        <div className="cta-row">
          <button className="btn-ghost" onClick={saveDraft}>Save draft</button>
          <button className="btn-primary" onClick={closeDay}><LockKeyhole size={14}/>Close day</button>
        </div>
      )}
      {isClosed && (
        <div className="cta-row">
          <button className="btn-ghost" onClick={() => setShowReceipt(true)}>View receipt</button>
        </div>
      )}

      {showReceipt && (
        <Receipt record={isClosed ? existing : buildRecord("closed")} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   RESULT ROW
───────────────────────────────────────────── */
function ResultRow({ label, val, dim }) {
  return (
    <div className={`res-row${dim ? " res-dim" : ""}`}>
      <span>{label}</span>
      <span className="mono">{fmtN(val)}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RECEIPT MODAL
───────────────────────────────────────────── */
function Receipt({ record, onClose }) {
  const win = record.calc.netResult >= 0;
  const c = record.calc;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="receipt" onClick={e => e.stopPropagation()}>
        <button className="receipt-close" onClick={onClose}><X size={16}/></button>
        <div className="receipt-perf"/>
        <div className="receipt-head">
          <span className="receipt-brand">LEDGER</span>
          <span className="mono receipt-date">{fmtDate(record.date)}</span>
        </div>
        <div className="receipt-rows">
          <RLine l="Deposits"       v={c.totalOnlineDeposits}   />
          <RLine l="Withdrawals"    v={c.totalOnlineWithdrawals}/>
          <RLine l="Ticket stake"   v={c.totalPaperStake}       />
          <RLine l="Ticket winning" v={c.totalPaperWinning}     />
          <div className="receipt-div"/>
          <RLine l="Operating result" v={c.operatingResult}/>
          <RLine l="Total commission" v={c.totalCommission}/>
        </div>
        <div className="receipt-div"/>
        <div className={`receipt-net ${win ? "pos" : "neg"}`}>
          <span>Net {win?"Profit":"Loss"}</span>
          <span className="mono">{fmtN(c.netResult, true)}</span>
        </div>
        <div className={`receipt-stamp ${win?"stamp-g":"stamp-l"}`}>{win?"PROFIT":"LOSS"}</div>
        <div className="receipt-perf"/>
      </div>
    </div>
  );
}
function RLine({l,v}) {
  return <div className="rline"><span className="muted">{l}</span><span className="mono">{fmtN(v)}</span></div>;
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
function Dashboard({ days, goEntry, goHistory }) {
  const today      = todayStr();
  const todayRec   = days[today];
  const closed     = Object.values(days).filter(d => d.status === "closed");
  const mk         = monthKey(today);
  const mClosed    = closed.filter(d => monthKey(d.date) === mk);
  const monthNet   = round2(mClosed.reduce((s,d) => s + d.calc.netResult, 0));
  const monthComm  = round2(mClosed.reduce((s,d) => s + d.calc.totalCommission, 0));

  const streak = (() => {
    const dates = closed.map(d=>d.date).sort().reverse();
    let s=0; const cur = new Date();
    for(let i=0;i<90;i++){
      const ds = cur.toISOString().slice(0,10);
      if(dates.includes(ds)){ s++; cur.setDate(cur.getDate()-1); }
      else if(ds===today){ cur.setDate(cur.getDate()-1); }
      else break;
    }
    return s;
  })();

  const last5 = [...closed].sort((a,b) => a.date<b.date?1:-1).slice(0,5);

  return (
    <div className="pg">
      <div className="pg-head"><h1 className="pg-title">Dashboard</h1></div>

      <div className="kpi-grid">
        <KPI label="Streak" val={`${streak}d`} sub="days logged" highlight={streak>0} />
        <KPI label="Month net"  val={fmtN(monthNet)}  sub={`${mClosed.length} days`} gain={monthNet>=0} />
        <KPI label="Commission" val={fmtN(monthComm)} sub="this month" />
      </div>

      <div className="today-box">
        {!todayRec && (
          <div className="today-empty">
            <p className="muted">No entry for today yet.</p>
            <button className="btn-primary" onClick={goEntry}>Start today <ChevronRight size={14}/></button>
          </div>
        )}
        {todayRec && todayRec.status==="draft" && (
          <div className="today-row">
            <span className="badge badge-draft">Draft</span>
            <span className="mono">{fmtN(todayRec.calc.netResult)}</span>
            <button className="btn-ghost-sm" onClick={goEntry}>Continue</button>
          </div>
        )}
        {todayRec && todayRec.status==="closed" && (
          <div className="today-closed-box">
            <div className="muted small">Today · closed</div>
            <div className={`today-big mono ${todayRec.calc.netResult>=0?"pos":"neg"}`}>
              {fmtN(todayRec.calc.netResult, true)}
            </div>
            <div className="muted small">{todayRec.calc.netResult>=0?"Profit":"Loss"}</div>
          </div>
        )}
      </div>

      {last5.length > 0 && (
        <div className="hist-mini">
          <div className="hist-mini-hd">
            <span className="sec-label">Recent</span>
            <button className="link-btn" onClick={goHistory}>See all</button>
          </div>
          {last5.map(d => (
            <div className="hist-mini-row" key={d.date}>
              <span className="muted">{fmtDate(d.date)}</span>
              <span className={`mono ${d.calc.netResult>=0?"pos":"neg"}`}>{fmtN(d.calc.netResult)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function KPI({ label, val, sub, highlight, gain }) {
  const cls = highlight ? "kpi kpi-hi" : gain!=null ? `kpi ${gain?"kpi-pos":"kpi-neg"}` : "kpi";
  return (
    <div className={cls}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-val mono">{val}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HISTORY + CORRECTIONS
───────────────────────────────────────────── */
function HistoryView({ days, persistDays, pushAudit }) {
  const closed  = Object.values(days).filter(d=>d.status==="closed").sort((a,b)=>a.date<b.date?1:-1);
  const [open, setOpen]   = useState(null);
  const [corr, setCorr]   = useState(null);

  return (
    <div className="pg">
      <div className="pg-head">
        <h1 className="pg-title">History</h1>
        <span className="muted small">{closed.length} day{closed.length!==1?"s":""}</span>
      </div>

      {closed.length===0 && <Empty title="No history yet" body="Close today's entry and it will appear here."/>}

      <div className="hist-list">
        {closed.map(d => (
          <div key={d.date}>
            <button className="hist-row" onClick={()=>setOpen(open===d.date?null:d.date)}>
              <span className="hist-date">{fmtDate(d.date)}</span>
              {d.corrections?.length>0 && <span className="badge badge-corr">edited</span>}
              <span className={`mono hist-net ${d.calc.netResult>=0?"pos":"neg"}`}>{fmtN(d.calc.netResult)}</span>
            </button>
            {open===d.date && (
              <div className="hist-detail">
                <div className="detail-grid">
                  <DLine l="Deposit"        v={d.calc.totalOnlineDeposits}   />
                  <DLine l="Withdrawal"     v={d.calc.totalOnlineWithdrawals}/>
                  <DLine l="Ticket stake"   v={d.calc.totalPaperStake}       />
                  <DLine l="Ticket winning" v={d.calc.totalPaperWinning}     />
                  <DLine l="Commission"     v={d.calc.totalCommission}        />
                </div>
                <div className={`detail-net ${d.calc.netResult>=0?"pos":"neg"}`}>
                  Net {d.calc.netResult>=0?"Profit":"Loss"}: <span className="mono">{fmtN(d.calc.netResult,true)}</span>
                </div>
                {d.corrections?.map(c=>(
                  <div className="corr-note" key={c.id}>
                    <span className="muted">{new Date(c.at).toLocaleDateString()}</span>
                    <span>{c.reason}</span>
                    <span className="mono muted">{fmtN(c.before.netResult)}→{fmtN(c.after.netResult)}</span>
                  </div>
                ))}
                <button className="btn-ghost-sm mt8" onClick={()=>setCorr(d.date)}>Raise correction</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {corr && (
        <CorrModal
          record={days[corr]}
          onClose={()=>setCorr(null)}
          onSave={(fields, reason) => {
            const orig = days[corr];
            const merged = {...orig,...fields};
            let calc;
            try { calc = calculateDay({totalOnlineDeposits:merged.totalOnlineDeposits, totalOnlineWithdrawals:merged.totalOnlineWithdrawals, totalPaperStake:merged.totalPaperStake, totalPaperWinning:merged.totalPaperWinning}); }
            catch { return; }
            const entry = {id:uid(), reason, before:orig.calc, after:calc, at:new Date().toISOString()};
            persistDays({...days,[corr]:{...merged, calc, corrections:[...(orig.corrections||[]),entry]}});
            pushAudit("CORRECTION",`${corr}: ${reason}`);
            setCorr(null);
          }}
        />
      )}
    </div>
  );
}
function DLine({l,v}) {
  return <div className="dline"><span className="muted">{l}</span><span className="mono">{fmtN(v)}</span></div>;
}
function CorrModal({ record, onClose, onSave }) {
  const [dep, setDep] = useState(record.totalOnlineDeposits.toString());
  const [wd,  setWd]  = useState(record.totalOnlineWithdrawals.toString());
  const [ts,  setTs]  = useState(record.totalPaperStake.toString());
  const [tw,  setTw]  = useState(record.totalPaperWinning.toString());
  const [rsn, setRsn] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-hd"><h3>Correction — {fmtDate(record.date)}</h3><button className="ic-btn" onClick={onClose}><X size={15}/></button></div>
        <p className="muted small">Original is kept in the audit trail.</p>
        <div className="field-grid mt12">
          <label>Total deposit<input className="inp mt4 mono" type="number" value={dep} onChange={e=>setDep(e.target.value)}/></label>
          <label>Total withdrawal<input className="inp mt4 mono" type="number" value={wd} onChange={e=>setWd(e.target.value)}/></label>
          <label>Ticket stake<input className="inp mt4 mono" type="number" value={ts} onChange={e=>setTs(e.target.value)}/></label>
          <label>Ticket winning<input className="inp mt4 mono" type="number" value={tw} onChange={e=>setTw(e.target.value)}/></label>
        </div>
        <label className="mt12 block small">Reason (required)
          <textarea className="inp mt4" rows={2} value={rsn} onChange={e=>setRsn(e.target.value)} placeholder="e.g. Wrong deposit amount"/>
        </label>
        {err && <p className="toast toast-err mt8"><AlertTriangle size={12}/>{err}</p>}
        <div className="cta-row mt16">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={()=>{
            if(!rsn.trim()) return setErr("Reason required");
            onSave({totalOnlineDeposits:round2(parseFloat(dep)||0), totalOnlineWithdrawals:round2(parseFloat(wd)||0), totalPaperStake:round2(parseFloat(ts)||0), totalPaperWinning:round2(parseFloat(tw)||0)}, rsn.trim());
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REPORTS
───────────────────────────────────────────── */
function Reports({ days }) {
  const closed  = Object.values(days).filter(d=>d.status==="closed");
  const byMonth = {};
  closed.forEach(d=>{
    const mk = monthKey(d.date);
    if(!byMonth[mk]) byMonth[mk]={month:mk,net:0,commission:0,days:0};
    byMonth[mk].net        = round2(byMonth[mk].net + d.calc.netResult);
    byMonth[mk].commission = round2(byMonth[mk].commission + d.calc.totalCommission);
    byMonth[mk].days++;
  });
  const rows = Object.values(byMonth).sort((a,b)=>a.month<b.month?-1:1);

  return (
    <div className="pg">
      <div className="pg-head"><h1 className="pg-title">Reports</h1></div>
      {rows.length===0 && <Empty title="Nothing yet" body="Close a few days and monthly totals will appear here."/>}
      {rows.length>0 && (
        <>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rows} margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="2 3" stroke="#2C3540" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:"#6B7480",fontSize:10,fontFamily:"monospace"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#6B7480",fontSize:10,fontFamily:"monospace"}} axisLine={false} tickLine={false} width={56} tickFormatter={v=>"₦"+Math.round(v/1000)+"k"}/>
                <Tooltip formatter={v=>fmtN(v)} contentStyle={{background:"#161D24",border:"1px solid #2C3540",borderRadius:8,fontSize:12,color:"#E2DFD8"}}/>
                <Bar dataKey="net" radius={[4,4,0,0]}>
                  {rows.map((r,i)=><Cell key={i} fill={r.net>=0?"#3D9B6B":"#B84F44"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rep-table">
            {rows.slice().reverse().map(r=>(
              <div className="rep-row" key={r.month}>
                <span className="rep-month">{r.month}</span>
                <span className="muted small">{r.days}d</span>
                <span className="mono muted">{fmtN(r.commission)}</span>
                <span className={`mono ${r.net>=0?"pos":"neg"}`}>{fmtN(r.net)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BACKUP
───────────────────────────────────────────── */
function BackupView({ days, audit }) {
  const [copied, setCopied] = useState(false);
  const payload = useMemo(()=>JSON.stringify({exportedAt:new Date().toISOString(),days,audit},null,2),[days,audit]);
  const url     = "data:application/json;charset=utf-8,"+encodeURIComponent(payload);

  return (
    <div className="pg">
      <div className="pg-head"><h1 className="pg-title">Backup</h1></div>
      <p className="muted small">{Object.keys(days).length} days · {audit.length} audit entries</p>
      <div className="backup-card mt16">
        <a className="btn-primary" href={url} download={`ledger-${todayStr()}.json`}><Download size={15}/>Download JSON</a>
        <button className="btn-ghost mt10" onClick={async()=>{
          try{ await navigator.clipboard.writeText(payload); setCopied(true); setTimeout(()=>setCopied(false),1500); }catch{}
        }}>{copied?<><Check size={13}/>Copied!</>:"Copy to clipboard"}</button>
        <p className="muted small mt16">Data lives entirely on this device in localStorage. Export regularly to keep a backup.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EMPTY
───────────────────────────────────────────── */
function Empty({ title, body }) {
  return <div className="empty"><p className="empty-title">{title}</p><p className="muted small">{body}</p></div>;
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ── TOKENS ─────────────────────────── */
:root{
  --bg:    #0D1117;
  --s1:    #161C25;
  --s2:    #1E2733;
  --bd:    #2A3442;
  --ink:   #E2DFD8;
  --muted: #6B7480;
  --acc:   #F0B429;
  --pos:   #3D9B6B;
  --neg:   #B84F44;
  --pos-bg:#0D2E1F;
  --neg-bg:#2E100D;
  --r:     12px;
  --rb:    18px;
  --font:  'Plus Jakarta Sans', ui-sans-serif, sans-serif;
  --mono:  'JetBrains Mono', ui-monospace, monospace;
  --sh:    0 4px 24px rgba(0,0,0,.35);
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{overscroll-behavior:none;}
body,.root{background:var(--bg);color:var(--ink);font-family:var(--font);font-size:15px;line-height:1.55;min-height:100dvh;max-width:480px;margin:0 auto;}
.mono{font-family:var(--mono);font-variant-numeric:tabular-nums;}
.muted{color:var(--muted);}
.small{font-size:13px;}
.pos{color:var(--pos);}
.neg{color:var(--neg);}
.mt4{margin-top:4px;}  .mt8{margin-top:8px;}
.mt10{margin-top:10px;}.mt12{margin-top:12px;}
.mt16{margin-top:16px;}.mt24{margin-top:24px;}
.block{display:block;}

/* ── SHELL ──────────────────────────── */
.root{display:flex;flex-direction:column;height:100dvh;overflow:hidden;position:relative;}

/* ── SPLASH ─────────────────────────── */
.splash{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;height:100dvh;color:var(--acc);font-size:22px;font-weight:700;letter-spacing:.06em;animation:fadeIn .5s ease;}

/* ── TOP BAR ────────────────────────── */
.topbar{display:flex;justify-content:space-between;align-items:center;padding:14px 18px 10px;flex-shrink:0;border-bottom:1px solid var(--bd);}
.topbar-brand{display:flex;align-items:center;gap:8px;color:var(--acc);font-weight:700;font-size:16px;letter-spacing:.04em;}
.topbar-date{color:var(--muted);font-size:13px;}

/* ── PAGES ──────────────────────────── */
.pages{flex:1;overflow:hidden;position:relative;}
.page-wrap{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}
.page-wrap{transition:opacity .22s ease, transform .22s ease;}
.page-in{opacity:1;transform:translateX(0);pointer-events:auto;}
.page-out{opacity:0;transform:translateX(12px);pointer-events:none;}

/* ── PAGE ───────────────────────────── */
.pg{padding:18px 16px 32px;}
.pg-head{display:flex;align-items:center;gap:10px;margin-bottom:20px;}
.pg-title{font-size:21px;font-weight:700;line-height:1;}
.sec-label{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);}
.link-btn{background:none;border:none;color:var(--acc);font-size:13px;font-family:var(--font);cursor:pointer;}

/* ── TABS ───────────────────────────── */
.tabbar{display:flex;flex-shrink:0;border-top:1px solid var(--bd);background:var(--s1);padding:6px 0 calc(env(safe-area-inset-bottom,0px) + 6px);}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;color:var(--muted);font-family:var(--font);font-size:10.5px;font-weight:500;cursor:pointer;padding:6px 4px;transition:color .2s;position:relative;}
.tab-active{color:var(--acc);}
.tab-icon-wrap{position:relative;display:flex;align-items:center;justify-content:center;}
.tab-dot{position:absolute;bottom:-4px;width:4px;height:4px;border-radius:50%;background:var(--acc);animation:dotPop .25s cubic-bezier(.34,1.56,.64,1);}
.tab-label{line-height:1;}
@keyframes dotPop{from{transform:scale(0);opacity:0;}to{transform:scale(1);opacity:1;}}

/* ── TOASTS / BADGES ─────────────────── */
.toast{display:flex;align-items:center;gap:7px;border-radius:var(--r);padding:10px 14px;font-size:13.5px;margin-bottom:14px;animation:slideDown .25s ease;}
.toast-ok{background:#0D2E1F;border:1px solid var(--pos);color:var(--pos);}
.toast-err{background:#2E100D;border:1px solid var(--neg);color:var(--neg);}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
.badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:3px 8px;border-radius:20px;font-weight:600;}
.badge-lock{background:rgba(240,180,41,.12);color:var(--acc);}
.badge-draft{background:rgba(240,180,41,.12);color:var(--acc);}
.badge-corr{background:var(--s2);color:var(--muted);}

/* ── AMOUNT SECTIONS ─────────────────── */
.sections{display:flex;flex-direction:column;gap:12px;margin-bottom:16px;}
.amt-card{border-radius:var(--r);border:1px solid var(--bd);background:var(--s1);overflow:hidden;}
.amt-card-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;}
.amt-card-label{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;}
.amt-card-total{font-size:15px;font-weight:600;}
.card-dep .amt-card-label{color:#7EC8E3;}
.card-wd  .amt-card-label{color:#E39F7E;}
.card-ts  .amt-card-label{color:#9B7EE3;}
.card-tw  .amt-card-label{color:var(--pos);}
.amt-row{display:flex;margin:0 14px 10px;border:1px solid var(--bd);border-radius:8px;overflow:hidden;background:var(--bg);}
.amt-sym{padding:10px 10px;color:var(--muted);font-family:var(--mono);font-size:14px;background:var(--s2);border-right:1px solid var(--bd);}
.amt-inp{flex:1;background:transparent;border:none;padding:10px 10px;color:var(--ink);font-family:var(--mono);font-size:15px;width:0;}
.amt-inp:focus{outline:none;}
.amt-inp::placeholder{color:var(--bd);}
.amt-btn{background:var(--acc);border:none;padding:10px 16px;color:#0D0900;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.amt-btn:active{background:#d9a220;}
.amt-err{display:flex;align-items:center;gap:5px;color:var(--neg);font-size:12px;padding:0 14px 8px;}
.amt-list{margin:0 14px 12px;display:flex;flex-direction:column;gap:2px;}
.amt-item{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-radius:7px;background:var(--s2);}
.amt-item-val{font-size:14px;}
.amt-item-btns{display:flex;gap:6px;}
.amt-edit{background:var(--bg);border:1px solid var(--acc);border-radius:6px;padding:4px 8px;color:var(--ink);font-family:var(--mono);font-size:13px;width:110px;}

/* ── BUTTONS ────────────────────────── */
.ic-btn{background:none;border:none;color:var(--muted);cursor:pointer;padding:4px 6px;border-radius:6px;display:flex;align-items:center;transition:color .15s;}
.ic-btn:hover{color:var(--ink);}
.ic-del:hover{color:var(--neg);}
.btn-primary{display:inline-flex;align-items:center;gap:7px;background:var(--acc);color:#0D0900;border:none;border-radius:var(--r);padding:11px 20px;font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer;transition:background .15s,transform .1s;}
.btn-primary:active{background:#d9a220;transform:scale(.97);}
.btn-ghost{display:inline-flex;align-items:center;gap:7px;background:transparent;color:var(--ink);border:1px solid var(--bd);border-radius:var(--r);padding:10px 18px;font-family:var(--font);font-size:14px;font-weight:500;cursor:pointer;transition:border-color .15s,transform .1s;}
.btn-ghost:active{border-color:var(--acc);transform:scale(.97);}
.btn-ghost-sm{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--muted);border:1px solid var(--bd);border-radius:8px;padding:7px 12px;font-family:var(--font);font-size:13px;cursor:pointer;transition:color .15s,border-color .15s;}
.btn-ghost-sm:active{color:var(--ink);border-color:var(--acc);}
.cta-row{display:flex;gap:10px;align-items:center;margin-top:16px;}

/* ── RESULT CARD ────────────────────── */
.result-card{border-radius:var(--rb);border:1px solid;padding:16px;margin-bottom:8px;}
.result-gain{background:var(--pos-bg);border-color:rgba(61,155,107,.35);}
.result-loss{background:var(--neg-bg);border-color:rgba(184,79,68,.35);}
.result-rows{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px dashed var(--bd);}
.res-row{display:flex;justify-content:space-between;font-size:13.5px;}
.res-dim{color:var(--muted);}
.result-net{display:flex;justify-content:space-between;align-items:center;}
.result-net-label{display:flex;align-items:center;gap:7px;font-weight:600;font-size:15px;}
.result-net-val{font-size:22px;font-weight:700;}

/* ── RECEIPT ────────────────────────── */
.overlay{position:fixed;inset:0;background:rgba(5,8,12,.8);display:flex;align-items:flex-end;justify-content:center;z-index:100;animation:fadeIn .2s ease;padding-bottom:env(safe-area-inset-bottom,0px);}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
.receipt{background:var(--s1);border:1px solid var(--bd);border-radius:var(--rb) var(--rb) 0 0;width:100%;max-width:480px;padding:22px 20px 28px;position:relative;animation:slideUp .28s cubic-bezier(.34,1.2,.64,1);}
@keyframes slideUp{from{transform:translateY(60px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.receipt-close{position:absolute;top:14px;right:14px;background:var(--s2);border:none;color:var(--muted);cursor:pointer;padding:6px;border-radius:50%;display:flex;align-items:center;}
.receipt-perf{height:1px;background-image:radial-gradient(circle,var(--bd) 1.5px,transparent 1.5px);background-size:10px 1px;background-repeat:repeat-x;margin:14px -20px;}
.receipt-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;}
.receipt-brand{font-weight:700;font-size:11px;letter-spacing:.14em;color:var(--acc);}
.receipt-date{color:var(--muted);font-size:12px;}
.receipt-rows{display:flex;flex-direction:column;gap:6px;}
.rline{display:flex;justify-content:space-between;font-size:13.5px;}
.receipt-div{border-top:1px dashed var(--bd);margin:10px 0;}
.receipt-net{display:flex;justify-content:space-between;font-size:18px;font-weight:700;}
.receipt-stamp{position:absolute;top:38%;right:18px;font-size:26px;font-weight:800;letter-spacing:.1em;opacity:.12;transform:rotate(-15deg);pointer-events:none;}
.stamp-g{color:var(--pos);}
.stamp-l{color:var(--neg);}

/* ── MODAL ──────────────────────────── */
.modal{background:var(--s1);border:1px solid var(--bd);border-radius:var(--rb) var(--rb) 0 0;width:100%;max-width:480px;padding:22px 20px 32px;animation:slideUp .28s cubic-bezier(.34,1.2,.64,1);}
.modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.modal-hd h3{font-size:17px;font-weight:700;}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.field-grid label, .block{display:block;font-size:12.5px;color:var(--muted);}
.inp{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:9px 12px;color:var(--ink);font-family:var(--font);font-size:14px;}
.inp:focus{outline:none;border-color:var(--acc);}

/* ── DASHBOARD ──────────────────────── */
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
.kpi{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:12px 12px 10px;}
.kpi-hi{border-color:rgba(240,180,41,.3);}
.kpi-pos{border-color:rgba(61,155,107,.3);}
.kpi-neg{border-color:rgba(184,79,68,.3);}
.kpi-label{font-size:10.5px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:5px;}
.kpi-val{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.kpi-sub{font-size:10.5px;color:var(--muted);margin-top:2px;}
.today-box{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:18px;margin-bottom:20px;}
.today-empty{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;padding:8px 0;}
.today-row{display:flex;justify-content:space-between;align-items:center;gap:10px;}
.today-closed-box{text-align:center;padding:6px 0;}
.today-big{font-size:36px;font-weight:800;margin:6px 0 4px;}
.hist-mini{margin-top:4px;}
.hist-mini-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.hist-mini-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bd);font-size:14px;}

/* ── HISTORY ────────────────────────── */
.hist-list{display:flex;flex-direction:column;}
.hist-row{display:flex;align-items:center;gap:10px;width:100%;padding:13px 4px;border-bottom:1px solid var(--bd);background:none;border-left:none;border-right:none;border-top:none;color:var(--ink);font-family:var(--font);font-size:14px;cursor:pointer;text-align:left;}
.hist-row:active{background:var(--s1);}
.hist-date{flex:1;}
.hist-net{margin-left:auto;font-size:14px;font-weight:600;}
.hist-detail{background:var(--s1);border-radius:0 0 var(--r) var(--r);padding:14px;margin-bottom:4px;}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
.dline{display:flex;justify-content:space-between;font-size:13px;}
.detail-net{font-size:14px;font-weight:600;margin-bottom:10px;}
.corr-note{display:flex;flex-wrap:wrap;gap:8px;font-size:12px;padding:6px 0;border-top:1px solid var(--bd);}

/* ── REPORTS ────────────────────────── */
.chart-wrap{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:14px 6px 6px;margin-bottom:14px;}
.rep-table{display:flex;flex-direction:column;}
.rep-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--bd);font-size:13.5px;}
.rep-month{flex:1;}

/* ── BACKUP ─────────────────────────── */
.backup-card{background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);padding:20px;display:flex;flex-direction:column;align-items:flex-start;}

/* ── EMPTY ──────────────────────────── */
.empty{border:1px dashed var(--bd);border-radius:var(--r);padding:32px 20px;text-align:center;}
.empty-title{font-size:16px;font-weight:600;margin-bottom:6px;}

@media(prefers-reduced-motion:reduce){
  *{animation-duration:.01ms!important;transition-duration:.01ms!important;}
}
`;
