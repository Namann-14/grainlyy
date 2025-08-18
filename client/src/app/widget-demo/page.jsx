"use client";

import React, { useState } from "react";
import CallTranscriptWidget from "@/modules/widget/components/widget-component";
import { Button } from "@/components/ui/button";

export default function WidgetDemo() {
  const [showWidget, setShowWidget] = useState(false);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Vapi Call Widget Demo</h1>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This is a demo page showing the Vapi call transcript widget.
          </p>
          
          <Button 
            onClick={() => setShowWidget(true)}
            disabled={showWidget}
          >
            {showWidget ? "Widget Active" : "Show Call Widget"}
          </Button>
          
          {showWidget && (
            <p className="text-sm text-muted-foreground">
              Look for the widget in the bottom-right corner!
            </p>
          )}
        </div>
      </div>

      {/* Call Transcript Widget */}
      {showWidget && (
        <CallTranscriptWidget onClose={() => setShowWidget(false)} />
      )}
    </div>
  );
}
