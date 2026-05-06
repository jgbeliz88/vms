"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SlideOverPanel } from "@/components/ui/SlideOverPanel";

const DEFAULT_SMIL = `<?xml version='1.0' encoding='UTF-8'?>
<smil xmlns="http://www.w3.org/2001/SMIL20/Language">
  <head>
    <meta name="vod2live" content="true" />
    <meta name="vod2live_start_time" content="2022-04-14T06:00:00Z" />
    <meta name="hls_client_manifest_version" content="5" />
    <meta name="hls_minimum_fragment_length" content="48/25" />
    <meta name="mpd_minimum_fragment_length" content="48/25" />
    <meta name="mpd_segment_template" content="time" />
    <meta name="timed_metadata" content="true" />
    <meta name="splice_media" content="true" />
  </head>
  <body>
    <seq>
      <par clipEnd="wallclock(1970-01-01T00:00:44.160Z)">
        <audio src="https://usp-vod2live.s3.amazonaws.com/Promo_Learning-aac-128k.mp4"/>
        <video src="https://usp-vod2live.s3.amazonaws.com/Promo_Learning-avc1-400k.mp4"/>
        <video src="https://usp-vod2live.s3.amazonaws.com/Promo_Learning-avc1-750k.mp4"/>
        <video src="https://usp-vod2live.s3.amazonaws.com/Promo_Learning-avc1-1000k.mp4"/>
        <video src="https://usp-vod2live.s3.amazonaws.com/Promo_Learning-avc1-1500k.mp4"/>
      </par>
    </seq>
  </body>
</smil>`;

const schema = z.object({
  name: z.string().min(2, "Name is required"),
});

export function CreateFastChannelPanel({
  open,
  onClose,
  onCreate,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (values: { name: string; smil: string }) => void;
  isSubmitting?: boolean;
}) {
  const [name, setName] = useState("");
  const [customSmil, setCustomSmil] = useState(false);
  const [smilXml, setSmilXml] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setName("");
      setCustomSmil(false);
      setSmilXml("");
      setErrors({});
    }
  }, [open]);

  const handleSubmit = () => {
    const result = schema.safeParse({ name });
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message;
      });
      setErrors(next);
      return;
    }
    onCreate({ name, smil: customSmil ? smilXml : DEFAULT_SMIL });
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title="Create Fast Channel"
      subtitle="Add a new fast channel definition."
      submitLabel={isSubmitting ? "Creating…" : "Create Channel"}
      submitDisabled={isSubmitting}
      onSubmit={handleSubmit}
    >
      <Input
        label="Channel Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          checked={customSmil}
          onChange={(e) => setCustomSmil(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-200"
        />
        Custom SMIL
      </label>
      {customSmil && (
        <Textarea
          label="SMIL XML"
          placeholder="Paste your XML content here…"
          value={smilXml}
          onChange={(e) => setSmilXml(e.target.value)}
          className="min-h-[240px] font-mono text-xs"
        />
      )}
    </SlideOverPanel>
  );
}
