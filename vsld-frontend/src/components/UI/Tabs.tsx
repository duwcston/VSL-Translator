import { useState } from 'react';
import { UploadSection } from '../../layout/UploadSection';
import RealtimeSection  from '../../layout/RealtimeSection';

export default function Tabs() {
    const [activeTab, setActiveTab] = useState('upload');

    return (
        <div>
            <div className="border-b border-[#F1F1F1] rounded-md ">
                <button
                    className={`px-4 py-2 ${activeTab === 'upload' ? 'bg-white text-[#004C9D] font-semibold border-t border-l border-r rounded-t' : 'bg-[#F1F1F1] text-gray-500 cursor-pointer'}`}
                    onClick={() => setActiveTab('upload')}
                >
                    Upload File
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === 'realtime' ? 'bg-white text-[#004C9D] font-semibold border-t border-l border-r rounded-t' : 'bg-[#F1F1F1] text-gray-500 cursor-pointer'}`}
                    onClick={() => setActiveTab('realtime')}
                >
                    Real - time Detection
                </button>
            </div>
            <div className="mt-4 flex justify-center">
                {activeTab === 'upload' ? <UploadSection /> : <RealtimeSection />}
            </div>
        </div>
    );
}