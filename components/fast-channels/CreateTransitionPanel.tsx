"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

const VOD2LIVE_RE = /(name="vod2live_start_time"\s+content=")[^"]*(")/;

export type TransitionPayload =
  | { mode: "json"; payload: object }
  | { mode: "xml"; transitionName: string; xml: string };

export function CreateTransitionForm({
  channelName,
  onSubmit,
  isSubmitting
}: {
  channelName: string;
  onSubmit: (values: TransitionPayload) => void;
  isSubmitting?: boolean;
}) {
  const [mode, setMode] = useState<"json" | "xml">("json");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [transitionName, setTransitionName] = useState("");
  const [xml, setXml] = useState("");
  const [xmlErrors, setXmlErrors] = useState<{ transitionName?: string; xml?: string }>({});

  const syncingFromXml = useRef(false);

  const handleTransitionNameChange = (value: string) => {
    setTransitionName(value);
    if (xml && !syncingFromXml.current) {
      setXml((prev) => prev.replace(VOD2LIVE_RE, `$1${value}$2`));
    }
  };

  const handleXmlChange = (value: string) => {
    setXml(value);
    const match = value.match(VOD2LIVE_RE);
    if (match) {
      const extracted = match[0].match(/content="([^"]*)"/)?.[1] ?? "";
      syncingFromXml.current = true;
      setTransitionName(extracted);
      setTimeout(() => { syncingFromXml.current = false; }, 0);
    }
  };

  const handleSubmit = () => {
    if (mode === "json") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        setJsonError("Invalid JSON");
        return;
      }
      const body = parsed as Record<string, unknown>;
      const epg = body?.epg as Record<string, unknown> | undefined;
      const channels = epg?.channel as Array<Record<string, unknown>> | undefined;
      const found = channels?.[0]?.channel as string | undefined;
      if (found !== channelName) {
        setJsonError(
          `Channel name mismatch: expected '${channelName}', got '${found ?? "(missing)"}'`
        );
        return;
      }
      setJsonError("");
      onSubmit({ mode: "json", payload: body });
    } else {
      const errors: { transitionName?: string; xml?: string } = {};
      if (!transitionName.trim()) errors.transitionName = "Transition name is required";
      if (!xml.trim()) errors.xml = "SMIL / XML is required";
      if (Object.keys(errors).length > 0) {
        setXmlErrors(errors);
        return;
      }
      setXmlErrors({});
      onSubmit({ mode: "xml", transitionName: transitionName.trim(), xml: xml.trim() });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "json" ? "primary" : "secondary"}
          onClick={() => setMode("json")}
        >
          JSON
        </Button>
        <Button
          type="button"
          variant={mode === "xml" ? "primary" : "secondary"}
          onClick={() => setMode("xml")}
        >
          SMIL / XML
        </Button>
      </div>

      {mode === "json" && (
        <Textarea
          label="EPG JSON"
          placeholder='{ "epg": { "channel": [{ "channel": "..." }], ... } }'
          value={jsonText}
          onChange={(e) => { setJsonText(e.target.value); setJsonError(""); }}
          error={jsonError}
          className="min-h-[240px] font-mono text-xs"
        />
      )}

      {mode === "xml" && (
        <>
          <Input
            label="Transition Name (UTC)"
            placeholder="2022-04-14T06:00:00Z"
            value={transitionName}
            onChange={(e) => handleTransitionNameChange(e.target.value)}
            error={xmlErrors.transitionName}
          />
          <Textarea
            label="SMIL / XML"
            placeholder="<?xml version='1.0' encoding='UTF-8'?>..."
            value={xml}
            onChange={(e) => handleXmlChange(e.target.value)}
            error={xmlErrors.xml}
            className="min-h-[240px] font-mono text-xs"
          />
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create Transition"}
        </Button>
      </div>
    </div>
  );
}
