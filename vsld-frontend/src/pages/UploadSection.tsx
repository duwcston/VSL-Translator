import { motion } from "framer-motion";
import Uploader from "../components/Uploader";

export default function UploadSection() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="p-4"
        >
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Upload Your File
                </h2>
                <p className="text-gray-600">
                    Upload a file containing sign language and let our AI analyze and translate it for you
                </p>
            </div>
            <Uploader />
        </motion.div>
    )
}