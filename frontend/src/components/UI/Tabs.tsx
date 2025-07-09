import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Video } from "lucide-react";
import UploadSection from "../../pages/Upload/UploadSection";
import RealtimeSection from "../../pages/Realtime/RealtimeSection";

export default function Tabs() {
  const [activeTab, setActiveTab] = useState(() => {
    // Get saved tab from localStorage or default to 'upload'
    return localStorage.getItem("activeTab") || "upload";
  });

  // Save active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  const tabs = [
    {
      id: "upload",
      label: "Upload File",
      icon: <Upload className="w-4 h-4" />,
      description: "Upload and analyze video files",
    },
    {
      id: "realtime",
      label: "Real-time Detection",
      icon: <Video className="w-4 h-4" />,
      description: "Live camera sign detection",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-2 border border-white/20 mb-8">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`
                                relative flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300
                                ${
                                  activeTab === tab.id
                                    ? "text-white shadow-lg"
                                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                }
                            `}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span className="font-semibold">{tab.label}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
      >
        {activeTab === "upload" ? (
          <UploadSection />
        ) : (
          <RealtimeSection isActive={activeTab === "realtime"} />
        )}
      </motion.div>
    </div>
  );
}
