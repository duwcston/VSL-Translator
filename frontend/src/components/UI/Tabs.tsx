import { useState } from "react";
import { Upload, Video } from "lucide-react";
import UploadSection from "../../pages/UploadSection";
import RealtimeSection from "../../pages/RealtimeSection";

type TabId = "upload" | "realtime";

const STORAGE_KEY = "activeTab";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "upload", label: "Upload File", icon: <Upload className="h-4 w-4" /> },
  {
    id: "realtime",
    label: "Real-time Detection",
    icon: <Video className="h-4 w-4" />,
  },
];

function readSavedTab(): TabId {
  try {
    return localStorage.getItem(STORAGE_KEY) === "realtime"
      ? "realtime"
      : "upload";
  } catch {
    return "upload";
  }
}

export default function Tabs() {
  const [activeTab, setActiveTab] = useState<TabId>(readSavedTab);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage unavailable (e.g. private mode): the tab just isn't remembered.
    }
  };

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Tab Navigation */}
      <div
        role="tablist"
        className="relative mb-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm"
      >
        {/* Sliding indicator: one transform transition instead of re-mounting */}
        <div
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-lg bg-blue-600 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`relative z-10 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-300 sm:text-base ${
              activeTab === tab.id
                ? "text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content. The upload tab stays mounted (just hidden) so switching
          tabs keeps its file and results; the realtime tab mounts only while
          active so the camera is released when leaving it. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div hidden={activeTab !== "upload"} className="animate-fade-in">
          <UploadSection />
        </div>
        {activeTab === "realtime" && (
          <div className="animate-fade-in">
            <RealtimeSection />
          </div>
        )}
      </div>
    </div>
  );
}
