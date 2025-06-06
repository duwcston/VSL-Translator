import { motion } from "framer-motion";
import { Video, Info } from "lucide-react";
import Button from "./Button";

export const Header = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-row items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/20"
        >
            <div className="flex items-center space-x-4">
                <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                    <Video className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                    <motion.h1
                        className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        VSL Translator
                    </motion.h1>
                    <p className="text-gray-600 text-sm font-medium">
                        Vietnamese Sign Language detection & translation
                    </p>
                </div>
            </div>
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    height="12"
                    width="auto"
                    label="About Us"
                    onClick={() => { }}
                    icon={<Info className="w-4 h-4" />}
                />
            </motion.div>
        </motion.div>
    )
}
