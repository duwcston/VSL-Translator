import { motion } from "framer-motion";
import { Video, Github, Mail, Heart } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const hoverEffect = {
    whileHover: { scale: 1.05, color: "#3B82F6" },
    transition: { type: "spring", stiffness: 300 },
  };

  return (
    <motion.footer
      {...fadeInUp}
      className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-20"
    >
      <div className="mx-auto px-10 py-2">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 mb-2">
          {/* Brand Section */}
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-3"
          >
            <motion.div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Video className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                VSL Translator
              </h3>
              <p className="text-xs text-gray-500">
                Vietnamese Sign Language Detection
              </p>
            </div>
          </motion.div>

          {/* Social Links */}
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.2 }}
            className="flex space-x-4"
          >
            <motion.a
              {...hoverEffect}
              href="https://github.com/duwcston/VSL-Translator"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-blue-50"
            >
              <Github className="w-4 h-4" />
            </motion.a>
            <motion.a
              {...hoverEffect}
              href="mailto:dtoan.nguyen03@gmail.com"
              className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-blue-50"
            >
              <Mail className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          {...fadeInUp}
          transition={{ delay: 0.5 }}
          className="pt-4 pb-2 border-t border-gray-200/50"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-gray-600 text-sm">
              <span>© {currentYear} VSL Translator</span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <span> Thesis Project at HCMIU</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-current" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;
