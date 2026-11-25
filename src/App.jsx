import { useEffect, useState } from "react";
import Site from "./Site.jsx";
import Admin from "./Admin.jsx";
import Studio from "./Studio.jsx";
import ServicePage from "./ServicePage.jsx";
import Account from "./Account.jsx";
import BundlePage from "./BundlePage.jsx";
import CreativeStudio from "./CreativeStudio.jsx";
import CardMaker from "./CardMaker.jsx";
import StudioHub from "./StudioHub.jsx";
import ServiceOrder from "./ServiceOrder.jsx";
import CartoonStudio from "./CartoonStudio.jsx";
import LegalPage from "./LegalPage.jsx";

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  if (hash === "#admin") return <Admin />;
  if (hash === "#studio") return <Studio />;
  if (hash === "#account") return <Account />;
  if (/^#cards(-[a-z]+)?$/.test(hash)) return <CardMaker />;
  if (/^#creative(-(personal|corporate|signature|mark))?$/.test(hash)) return <CreativeStudio />;
  const hb = /^#studio-([1-5])$/.exec(hash);
  if (hb) return <StudioHub id={Number(hb[1])} />;
  if (hash === "#cartoon") return <CartoonStudio />;
  const so = /^#order-([a-zA-Z0-9]+)$/.exec(hash);
  if (so) return <ServiceOrder keyName={so[1]} />;
  if (hash === "#terms") return <LegalPage kind="terms" />;
  if (hash === "#privacy") return <LegalPage kind="privacy" />;
  if (hash === "#refund") return <LegalPage kind="refund" />;
  const bm = /^#bundle-([a-z-]+)$/.exec(hash);
  if (bm) return <BundlePage id={bm[1]} />;
  const m = /^#service-([1-6])$/.exec(hash);
  if (m) return <ServicePage index={Number(m[1]) - 1} />;
  return <Site />;
}
