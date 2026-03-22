import { Video } from "lucide-react";

export const Header = () => {
  return (
    <div className="flex flex-row items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/20">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <Video className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ASL Translator
          </h1>
          <p className="text-gray-600 text-sm font-medium">
            American Sign Language Detection
          </p>
        </div>
      </div>
      <div>
        {/* <Link to="/about">
          <Button
            height="12"
            width="auto"
            label="About Us"
            onClick={() => {}}
            icon={<Info className="w-4 h-4" />}
          />
        </Link> */}
      </div>
    </div>
  );
};
