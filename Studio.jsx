import React from 'react';

export default function Studio() {
  return <main className="studio-shell" aria-label="استديو قوالب أثر">
    <div className="studio-topbar">
      <a className="studio-back" href="#home">← العودة إلى منصة أثر</a>
      <span>ATHAR STUDIO · استديو القوالب</span>
    </div>
    <iframe
      className="studio-frame"
      src="/studio/index.html"
      title="استديو قوالب أثر"
      loading="eager"
      allow="clipboard-write"
    />
  </main>;
}
