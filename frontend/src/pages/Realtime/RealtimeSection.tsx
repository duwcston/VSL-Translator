import React from "react";
import { motion } from "framer-motion";
import Realtime from "./Realtime";

interface RealtimeSectionProps {
  isActive?: boolean;
}

const RealtimeSection: React.FC<RealtimeSectionProps> = ({
  isActive = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="p-4"
    >
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Real-time Detection
        </h2>
        <p className="text-gray-600">
          Use your camera for live sign language detection
        </p>
      </div>
      <Realtime isActive={isActive} />
    </motion.div>
  );
};

export default RealtimeSection;
