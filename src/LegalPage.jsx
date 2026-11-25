import { useEffect } from "react";
import { LegalSheet } from "./AuthModal.jsx";

export default function LegalPage({ kind }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [kind]);
  return (
    <main className="cs legal-page">
      <header className="cs-top">
        <a className="cs-back" href="#/">← الموقع</a>
        <span className="cs-badge">أثر — الوثائق القانونية</span>
        <a className="cs-back" href="#creative">صانع الهوية</a>
      </header>
      <div className="cs-panel" style={{ marginTop: 18, maxWidth: 780 }}>
        <LegalSheet kind={kind} onBack={() => { window.location.hash = ""; }} />
      </div>
    </main>
  );
}
