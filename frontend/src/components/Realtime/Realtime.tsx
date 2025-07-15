import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Play, Square, AlertTriangle } from "lucide-react";
import Button from "../UI/Button";
import Card from "../UI/Card";
import VideoStream from "./VideoStream";
// import FrameRateControl from "./Realtime/FrameRateControl";
import PerformanceSettings from "./PerformanceSettings";
import ProcessedFrameDisplay from "./ProcessedFrameDisplay";
import DetectionResults from "./DetectionResults";
import { useWebcam } from "../../hooks/useWebcam";
import { useRealtimeDetection } from "../../hooks/useRealtimeDetection";

interface RealtimeProps {
  isActive?: boolean;
}

const Realtime: React.FC<RealtimeProps> = ({ isActive = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [returnImage, setReturnImage] = useState(false);
  const [frameRate] = useState(10);
  const [skipFrames, setSkipFrames] = useState(0);
  const [resizeFactor, setResizeFactor] = useState(1.0);
  const [inputSize] = useState(320);

  const frameInterval = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  const { startWebcam, stopWebcam, captureFrame, streamRef } = useWebcam();
  const {
    detections,
    processedImage,
    isStreaming,
    startDetection,
    stopDetection,
    sendFrame,
  } = useRealtimeDetection({
    onError: setErrorMessage,
  });

  // Capture frame from video and send to the server
  const handleCaptureFrame = useCallback(() => {
    if (isStreaming) {
      const frameData = captureFrame(videoRef, canvasRef);
      if (frameData) {
        sendFrame(frameData, returnImage, skipFrames, resizeFactor, inputSize);
      }
    }
  }, [
    isStreaming,
    returnImage,
    skipFrames,
    resizeFactor,
    inputSize,
    captureFrame,
    sendFrame,
  ]);

  // Toggle the streaming state
  const toggleStreaming = async () => {
    if (isStreaming) {
      // Stop streaming
      if (frameInterval.current) {
        clearInterval(frameInterval.current);
        frameInterval.current = null;
      }
      stopDetection();
    } else {
      // Start webcam if not already started
      if (!streamRef.current) {
        const result = await startWebcam(videoRef);
        if (!result.success) {
          setErrorMessage(result.error);
          return;
        }
      }

      // Connect to WebSocket server and start detection
      const result = await startDetection();
      if (result.success) {
        // Start frame capturing
        frameInterval.current = setInterval(
          handleCaptureFrame,
          1000 / frameRate,
        );
        setErrorMessage(null);
      }
    }
  }; // Effect to handle isActive prop changes
  useEffect(() => {
    if (!isActive && isStreaming) {
      if (frameInterval.current) {
        clearInterval(frameInterval.current);
        frameInterval.current = null;
      }
      stopDetection();
    }

    // Stop webcam when navigating away from realtime page
    if (!isActive) {
      stopWebcam(videoRef);
    }
  }, [isActive, isStreaming, stopDetection, stopWebcam]);

  // Effect to initialize webcam when component becomes active
  useEffect(() => {
    if (isActive) {
      startWebcam(videoRef);
    }

    return () => {
      if (frameInterval.current) {
        clearInterval(frameInterval.current);
      }
      stopDetection();
      stopWebcam(videoRef);
    };
  }, [isActive, startWebcam, stopDetection, stopWebcam]);

  // Update frame rate when it changes
  useEffect(() => {
    if (isStreaming && frameInterval.current) {
      clearInterval(frameInterval.current);
      frameInterval.current = setInterval(handleCaptureFrame, 1000 / frameRate);
    }
  }, [handleCaptureFrame, frameRate, isStreaming]);
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        {/* Error Message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="glass" className="border-red-200 bg-red-50/70">
                <div className="flex items-center space-x-3 p-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 font-medium">{errorMessage}</p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Camera and Controls */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card variant="glass" className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-blue-600" />
                Camera Stream
              </h3>
              <VideoStream videoRef={videoRef} canvasRef={canvasRef} />
            </Card>

            <Card variant="glass" className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Settings
              </h3>
              <div className="space-y-4">
                <PerformanceSettings
                  skipFrames={skipFrames}
                  setSkipFrames={setSkipFrames}
                  resizeFactor={resizeFactor}
                  setResizeFactor={setResizeFactor}
                  returnImage={returnImage}
                  setReturnImage={setReturnImage}
                  isStreaming={isStreaming}
                />

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={toggleStreaming}
                    variant={isStreaming ? "secondary" : "primary"}
                    icon={
                      isStreaming ? (
                        <Square className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )
                    }
                    label={
                      isStreaming
                        ? "Stop Detection"
                        : "Start Real-time Detection"
                    }
                    height="12"
                    width="full"
                  />
                </motion.div>
              </div>
            </Card>
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <Card variant="glass" className="p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Processed Frame
              </h3>
              <ProcessedFrameDisplay
                processedImage={processedImage}
                isStreaming={isStreaming}
                returnImage={returnImage}
              />
            </Card>

            <Card variant="glass" className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Detection Results
              </h3>
              <DetectionResults detections={detections} />
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default Realtime;
