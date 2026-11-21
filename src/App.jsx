import { useEffect, useState } from "react";
import Site from "./Site.jsx";
import Admin from "./Admin.jsx";
import Studio from "./Studio.jsx";

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
  return <Site />;
}
