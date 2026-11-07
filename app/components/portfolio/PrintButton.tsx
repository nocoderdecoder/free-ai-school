"use client";
export function PrintButton() {
  return (
    <button className="pf-button" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
