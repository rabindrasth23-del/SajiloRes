import "./marketing.css";
import React from "react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      {children}
    </div>
  );
}
