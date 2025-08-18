"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVapi } from "@/hooks/use-vapi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

const CallTranscriptWidget = ({ onClose }) => {
  const {
    isSpeaking,
    isConnecting,
    isConnected,
    transcript,
    startCall,
    endCall,
  } = useVapi();

  const [isMinimized, setIsMinimized] = useState(true);
  const transcriptEndRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCallStatus = () => {
    if (isConnecting) return "Connecting...";
    if (isConnected) return "Connected";
    return "Disconnected";
  };

  const handleStartCall = async () => {
    await startCall();
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleClose = () => {
    if (onClose && typeof onClose === "function") {
      onClose();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full w-14 h-10 shadow-lg border-2 border-green-500"
          size="icon"
        >
          <Phone className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[500px] flex flex-col">
      <Card className="bg-white border-gray-200 shadow-xl rounded-lg overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4  border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            Grainlyy Customer Support
          </h3>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsMinimized(true)}
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 w-8 h-8 rounded-md"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 p-4 max-h-80 overflow-y-auto space-y-4 bg-white">
          {transcript.length === 0 && !isConnected && (
            <div className="text-center text-gray-500 py-12">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-medium text-gray-700">No active call</p>
              <p className="text-sm text-gray-500">
                Start a call to see the transcript
              </p>
            </div>
          )}

          {/* Default assistant message when connected */}
          {isConnected && transcript.length === 0 && (
            <div className="space-y-2">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-xs text-green-600 font-medium mb-2">
                  Assistant
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Hi there. This is Sahay from Grainly customer support. Can I
                  help you today?
                </p>
              </div>
            </div>
          )}

          {/* Transcript messages */}
          {transcript.map((message, index) => (
            <div key={index} className="space-y-2">
              <div
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200",
                  message.role === "assistant"
                    ? "bg-green-50 border-green-200 text-gray-700"
                    : "bg-blue-50 border-blue-200 text-gray-700 ml-8"
                )}
              >
                <div
                  className={cn(
                    "text-xs font-medium mb-2 capitalize",
                    message.role === "assistant"
                      ? "text-green-600"
                      : "text-blue-600"
                  )}
                >
                  {message.role === "assistant" ? "Assistant" : "You"}
                </div>
                <p className="text-sm leading-relaxed">
                  {message.text?.text || message.text}
                </p>
              </div>
            </div>
          ))}

          {/* Call ended message */}
          {!isConnected && transcript.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-200">
              <PhoneOff className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-500 font-medium">
                Customer ended the call {formatTime(Date.now())}
              </span>
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-3 text-xs text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-150"></div>
              </div>
              <span className="font-medium">Assistant is speaking...</span>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Call Controls */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors duration-200",
                  isConnected
                    ? "bg-green-500 shadow-sm shadow-green-500/50"
                    : isConnecting
                    ? "bg-yellow-500 animate-pulse shadow-sm shadow-yellow-500/50"
                    : "bg-red-500"
                )}
              ></div>
              <span className="text-xs text-gray-600 font-medium">
                {getCallStatus()}
              </span>
              {isConnected && <span className="text-xs text-green-600">●</span>}
            </div>

            <div className="flex items-center gap-2">
              {!isConnected ? (
                <Button
                  onClick={handleStartCall}
                  disabled={isConnecting}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all duration-200 disabled:opacity-60"
                  size="sm"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2" />
                      Start Call
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleEndCall}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all duration-200"
                  size="sm"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Call
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CallTranscriptWidget;
