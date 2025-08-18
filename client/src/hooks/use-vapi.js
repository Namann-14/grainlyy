import Vapi from "@vapi-ai/web";
import { useEffect, useState } from "react";

export const useVapi = () => {
  const [vapi, setVapi] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);

  useEffect(() => {
    const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_URL);
    setVapi(vapiInstance);

    vapiInstance.on("call-start", () => {
      setIsConnected(true);
      setIsConnecting(false);
      setTranscript([]);
    });

    vapiInstance.on("call-end", () => {
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
    });

    vapiInstance.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapiInstance.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapiInstance.on("error", (error) => {
      console.log(error, "VAPI_ERROR");
      setIsConnecting(false);
    });

    vapiInstance.on("message", (message) => {
      if (
        message.type === "transcript" &&
        message.transcript.type === "final"
      ) {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role === "user" ? "user" : "assistant",
            text: message.transcript,
          },
        ]);
      }
    });

    return () => {
      vapiInstance?.stop();
    };
  }, []);

  const startCall = async () => {
    try {
      setIsConnecting(true);

      if (vapi) {
        await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    try {
      if (vapi) {
        vapi.stop();
      }
    } catch (error) {
      console.error("Failed to end call:", error);
    }
  };

  return {
    isSpeaking,
    isConnecting,
    isConnected,
    transcript,
    startCall,
    endCall,
  };
};
