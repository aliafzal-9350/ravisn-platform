import { useState } from "react";
import Sidebar from "../components/Sidebar";
import KnowledgeBase from "../components/KnowledgeBase";
import Connect from "../components/Connect";
import Inbox from "../components/Inbox";
import Bookings from "../components/Bookings";
import Settings from "../components/Settings";
import SystemPromptTuning from "../components/SystemPromptTuning";
import PrivacyPolicyTab from "../components/PrivacyPolicyTab";
import TermsConditionsTab from "../components/TermsConditionsTab";

export default function Dashboard() {
  const [active, setActive] = useState("knowledge");

  return (
    <div className="flex">
      <Sidebar active={active} onSelect={setActive} />
      <div className="flex-1 min-h-screen">
        {active === "connect" && <Connect />}
        {active === "inbox" && <Inbox />}
        {active === "bookings" && <Bookings />}
        {active === "knowledge" && <KnowledgeBase />}
        {active === "system-prompt" && <SystemPromptTuning />}
        {active === "settings" && <Settings />}
        {active === "privacy" && <PrivacyPolicyTab />}
        {active === "terms" && <TermsConditionsTab />}
      </div>
    </div>
  );
}
