import React from "react";
import Realtime from "../components/Realtime";

interface RealtimeSectionProps {
    isActive?: boolean;
}

const RealtimeSection: React.FC<RealtimeSectionProps> = ({ isActive = true }) => {
    return (
        <div className="container mx-auto">
            <Realtime isActive={isActive} />
        </div>
    );
};

export default RealtimeSection;