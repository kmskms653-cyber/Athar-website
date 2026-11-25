import { useEffect, useState } from "react";
import Site from "./Site.jsx";
import Admin from "./Admin.jsx";
import Studio from "./Studio.jsx";
import ServicePage from "./ServicePage.jsx";
import Account from "./Account.jsx";
import BundlePage from "./BundlePage.jsx";
import CreativeStudio from "./CreativeStudio.jsx";
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
  if (hash === "#creative") return <CreativeStudio />;
  if (hash === "#terms") return <LegalPage kind="terms" />;
  if (hash === "#privacy") return <LegalPage kind="privacy" />;
  const bm = /^#bundle-([a-z-]+)$/.exec(hash);
  if (bm) return <BundlePage id={bm[1]} />;
  const m = /^#service-([1-6])$/.exec(hash);
  if (m) return <ServicePage index={Number(m[1]) - 1} />;
  return <Site />;
}
