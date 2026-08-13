import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import { useAuth } from "./auth.jsx";
import { api } from "./api.js";
import { useNotify } from "./components/ui.jsx";
import Login from "./screens/Login.jsx";
const RequestScreen = lazy(() => import("./screens/RequestScreen.jsx"));
const CustomerScreen = lazy(() => import("./screens/CustomerScreen.jsx"));
const InvoiceScreen = lazy(() => import("./screens/InvoiceScreen.jsx"));
const DevicesScreen = lazy(
  () => import("./screens/DeviceScreen Folder/DevicesScreen .jsx"),
);
const ActivationScreen = lazy(() => import("./screens/ActivationScreen.jsx"));
const InventoryScreen = lazy(() => import("./screens/InventoryScreen.jsx"));
const LogScreen = lazy(() => import("./screens/LogScreen.jsx"));

const DEFAULT_NAV = {
  user: null,
  tab: null,
  setTab: () => {},
  selectedRequest: null,
  setSelectedRequest: () => {},
  navigate: () => {},
};
const NavContext = createContext(DEFAULT_NAV);
export function useNav() {
  return useContext(NavContext) || DEFAULT_NAV;
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => logout()}>
      تسجيل الخروج
    </button>
  );
}

export const TAB_KEYS = [
  "request",
  "customer",
  "invoice",
  "devices",
  "activation",
  "inventory",
  "log",
];

export const TAB_META = {
  request: { label: "طلب صرف", component: RequestScreen },
  customer: { label: "طلب عميل", component: CustomerScreen },
  invoice: { label: "الفاتورة", component: InvoiceScreen },
  devices: { label: "الأجهزة", component: DevicesScreen },
  activation: { label: "التحميل", component: ActivationScreen },
  inventory: { label: "المخزون", component: InventoryScreen },
  log: { label: "سجل العمليات", component: LogScreen },
};

const RETURN_NOTIFY_TABS = ["request", "invoice", "activation"];
const DEFECT_NOTIFY_TABS = ["request", "invoice", "activation"];
const NOTIFY_POLL_MS = 15000;

function seenKey(kind, user) {
  return `${kind}_seen_${user?.username || "anon"}`;
}
function loadSeen(kind, user) {
  try {
    return JSON.parse(localStorage.getItem(seenKey(kind, user)) || "{}");
  } catch {
    return {};
  }
}
function saveSeen(kind, user, seen) {
  try {
    localStorage.setItem(seenKey(kind, user), JSON.stringify(seen));
  } catch {
    /* ignore */
  }
}

// Shared by both the returns and العيب المصنعي notifications: polls a
// list endpoint and, whenever the user opens (or is sitting on) a
// relevant tab and there's an entry they haven't been told about yet,
// pops a toast naming it. `ready` gates this off until the app has
// actually finished booting — otherwise the very first notification (for
// whichever tab is active by default) can fire and auto-dismiss while the
// boot screen is still up, before the user ever sees it.
function useListNotifications(user, ready, { kind, endpoint, tabs, oneMsg, manyMsg }) {
  const notify = useNotify();
  const [items, setItems] = useState([]);
  const [seen, setSeen] = useState(() => loadSeen(kind, user));
  const firstLoadDone = useRef(false);

  useEffect(() => {
    if (!user || !ready) return;
    let alive = true;
    firstLoadDone.current = false;
    setSeen(loadSeen(kind, user));

    async function poll() {
      let list;
      try {
        const data = await api(endpoint);
        list = Array.isArray(data.requests) ? data.requests : [];
      } catch {
        return; // network hiccup — just try again next tick
      }
      if (!alive) return;
      firstLoadDone.current = true;
      setItems(list);
    }

    poll();
    const timer = setInterval(poll, NOTIFY_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, ready]);

  function unseenFor(tabKey) {
    if (!tabs.includes(tabKey)) return [];
    const last = seen[tabKey] || null;
    // On the very first poll of a fresh session, treat "seen" as unset but
    // don't flood the user with every historical entry — only ones from
    // here on count. loadSeen() already carries the real last-seen time
    // across sessions, so this only matters the first time a tab is ever
    // opened (last === null): in that case everything currently on file
    // counts as unseen, which is correct — they really haven't seen it.
    return items.filter((r) => !last || new Date(r.created_at) > new Date(last));
  }

  // Tell the user about any entr(y/ies) they haven't been notified of yet
  // for this tab, then mark the tab caught-up.
  function announce(tabKey) {
    if (!tabs.includes(tabKey) || !firstLoadDone.current) return;
    const pending = unseenFor(tabKey);
    if (!pending.length) return;

    if (pending.length === 1) {
      notify(oneMsg(pending[0]), "info");
    } else {
      notify(manyMsg(pending), "info");
    }

    const next = { ...seen, [tabKey]: new Date().toISOString() };
    setSeen(next);
    saveSeen(kind, user, next);
  }

  return { announce, items };
}

function useReturnNotifications(user, ready) {
  const { announce, items } = useListNotifications(user, ready, {
    kind: "returns",
    endpoint: "/returns/requests",
    tabs: RETURN_NOTIFY_TABS,
    oneMsg: (r) => `تم إجراء مرتجع جديد رقم ${r.req_id} من ${r.name || "غير معروف"}`,
    manyMsg: (pending) =>
      `تم إجراء ${pending.length} مرتجعات جديدة: ${pending.map((r) => r.req_id).join("، ")}`,
  });
  return { announce, returns: items };
}

function useDefectNotifications(user, ready) {
  const { announce, items } = useListNotifications(user, ready, {
    kind: "defects",
    endpoint: "/defects/requests",
    tabs: DEFECT_NOTIFY_TABS,
    oneMsg: (r) => `تم تسجيل عيب مصنعي جديد رقم ${r.req_id} من ${r.name || "غير معروف"}`,
    manyMsg: (pending) =>
      `تم تسجيل ${pending.length} عيوب مصنعية جديدة: ${pending.map((r) => r.req_id).join("، ")}`,
  });
  return { announce, defects: items };
}

// Notifies the *next* tab in the request pipeline whenever the previous tab
// finishes its part of a request:
//   طلب صرف / طلب عميل  --(created)-->        الفاتورة
//   الفاتورة             --(invoiced)-->       الأجهزة
//   الأجهزة              --(dispatched)-->     التحميل
//   التحميل              --(fully activated)-> back to whichever tab (طلب
//                                               صرف or طلب عميل) created it
// Each row below is one such handoff: which timestamp on the request marks
// it as "done", and which tab should hear about it.
const STAGE_EVENTS = [
  {
    key: "created",
    timeField: "created_at",
    targetTab: () => "invoice",
    isReached: () => true,
    oneMsg: (r) => `طلب جديد رقم ${r.request_id} بانتظار الفاتورة من ${r.name || "غير معروف"}`,
    manyMsg: (list) =>
      `${list.length} طلبات جديدة بانتظار الفاتورة: ${list.map((r) => r.request_id).join("، ")}`,
  },
  {
    key: "invoiced",
    timeField: "invoice_added_at",
    targetTab: () => "devices",
    isReached: (r) => !!r.invoice_added_at,
    oneMsg: (r) => `تم إصدار فاتورة الطلب ${r.request_id} - جاهز لصرف الأجهزة`,
    manyMsg: (list) =>
      `${list.length} طلبات جاهزة لصرف الأجهزة: ${list.map((r) => r.request_id).join("، ")}`,
  },
  {
    key: "dispatched",
    timeField: "devices_confirmed_at",
    targetTab: () => "activation",
    isReached: (r) => !!r.devices_confirmed_at,
    oneMsg: (r) => `تم صرف أجهزة الطلب ${r.request_id} - جاهز للتحميل`,
    manyMsg: (list) =>
      `${list.length} طلبات جاهزة للتحميل: ${list.map((r) => r.request_id).join("، ")}`,
  },
  {
    key: "fully_activated",
    timeField: "fully_activated_at",
    targetTab: (r) => (String(r.request_id || "").startsWith("C") ? "customer" : "request"),
    isReached: (r) => !!r.fully_activated_at,
    oneMsg: (r) => `تم تحميل جميع أجهزة الطلب ${r.request_id} بالكامل`,
    manyMsg: (list) =>
      `${list.length} طلبات تم تحميلها بالكامل: ${list.map((r) => r.request_id).join("، ")}`,
  },
];

function useStageNotifications(user, ready) {
  const notify = useNotify();
  const [requests, setRequests] = useState([]);
  const [seen, setSeen] = useState(() => loadSeen("stage", user));
  const firstLoadDone = useRef(false);

  useEffect(() => {
    if (!user || !ready) return;
    let alive = true;
    firstLoadDone.current = false;
    setSeen(loadSeen("stage", user));

    async function poll() {
      let list;
      try {
        const data = await api("/requests?source=all");
        list = Array.isArray(data) ? data : [];
      } catch {
        return; // network hiccup — just try again next tick
      }
      if (!alive) return;
      firstLoadDone.current = true;
      setRequests(list);
    }

    poll();
    const timer = setInterval(poll, NOTIFY_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username, ready]);

  // Tell the user about any stage handoff(s) they haven't been told about
  // yet that land on this tab, then mark each one caught-up independently
  // (a tab can be the target of more than one stage event, e.g. "request"
  // only hears about fully_activated, but "invoice" only hears "created").
  function announce(tabKey) {
    if (!firstLoadDone.current) return;
    const next = { ...seen };
    let changed = false;

    for (const event of STAGE_EVENTS) {
      const seenKey = `${event.key}:${tabKey}`;
      const last = next[seenKey] || null;
      const pending = requests
        .map((it) => it.raw)
        .filter((r) => r && event.isReached(r) && event.targetTab(r) === tabKey && r[event.timeField])
        .filter((r) => !last || new Date(r[event.timeField]) > new Date(last));

      if (!pending.length) continue;
      if (pending.length === 1) {
        notify(event.oneMsg(pending[0]), "info");
      } else {
        notify(event.manyMsg(pending), "info");
      }
      next[seenKey] = new Date().toISOString();
      changed = true;
    }

    if (changed) {
      setSeen(next);
      saveSeen("stage", user, next);
    }
  }

  return { announce, requests };
}

export default function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("request");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { announce: announceReturns, returns } = useReturnNotifications(user, !loading);
  const { announce: announceDefects, defects } = useDefectNotifications(user, !loading);
  const { announce: announceStages, requests: stageRequests } = useStageNotifications(user, !loading);

  const allowed = user && user.tabs && user.tabs.length ? user.tabs : TAB_KEYS;
  const active = allowed.includes(tab) ? tab : allowed[0];

  // Whenever the active tab is (or becomes) one of the notify-relevant
  // tabs, tell the user about any return(s)/defect(s) they haven't seen
  // yet. This fires on tab switch, and also if a new one lands while
  // they're already sitting there (the `returns`/`defects` dependency
  // updates on each poll). Hooks must run every render regardless of the
  // loading/login early-returns below.
  useEffect(() => {
    if (user && !loading) {
      announceReturns(active);
      announceDefects(active);
      announceStages(active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, active, returns, defects, stageRequests]);

  if (loading) {
    return <div className="boot">جاري تحميل النظام...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const activeMeta = TAB_META[active];
  const Screen = activeMeta.component;

  return (
    <NavContext.Provider
      value={{
        user,
        tab: active,
        setTab,
        selectedRequest,
        setSelectedRequest,
        navigate: (key, reqId) => {
          setTab(key);
          if (reqId) setSelectedRequest({ req_id: reqId });
        },
      }}
    >
      <div className="app-shell">
        <header className="app-header">
          <div className="app-title">نظام إدارة الصرف والمخزون</div>
          <div className="app-user">
            <span className="role-badge">{user.role || "مستخدم"}</span>
            <span className="user-name">{user.full_name || user.username}</span>
            <LogoutButton />
          </div>
        </header>
        <nav className="app-tabs">
          {allowed.map((key) => (
            <button
              key={key}
              className={`tab-btn ${active === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {TAB_META[key].label}
            </button>
          ))}
        </nav>
        <main className="app-main">
          <Suspense
            fallback={
              <div className="loading-screen">جاري تحميل المحتوى...</div>
            }
          >
            <Screen key={active} />
          </Suspense>
        </main>
      </div>
    </NavContext.Provider>
  );
}
