"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SlideOverPanel } from "@/components/ui/SlideOverPanel";
import type { FastChannel } from "@/features/fast-channels/types";

const schema = z.object({
  channel: z.string().min(1, "Select a channel"),
  type: z.string().min(1, "Select a transition type"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 second"),
  description: z.string().optional()
});

const transitionTypes = [
  { label: "Cut", value: "cut" },
  { label: "Fade", value: "fade" },
  { label: "Wipe", value: "wipe" },
  { label: "Dissolve", value: "dissolve" }
];

export function CreateTransitionPanel({
  open,
  onClose,
  channels,
  onCreate,
  defaultChannel
}: {
  open: boolean;
  onClose: () => void;
  channels: FastChannel[];
  onCreate: (values: { channel: string; type: string; duration: number; description: string }) => void;
  defaultChannel?: string;
}) {
  const [channel, setChannel] = useState(defaultChannel ?? "");

  useEffect(() => {
    if (open) setChannel(defaultChannel ?? "");
  }, [open, defaultChannel]);

  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const channelOptions = [
    { label: "— Select a channel —", value: "" },
    ...channels.map((ch) => ({ label: ch.name, value: ch.name }))
  ];

  const handleSubmit = () => {
    const result = schema.safeParse({ channel, type, duration, description });
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message;
      });
      setErrors(next);
      return;
    }
    onCreate({ channel, type, duration: Number(duration), description });
    setChannel("");
    setType("");
    setDuration("");
    setDescription("");
    setErrors({});
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title="Create Transition"
      subtitle="Schedule a transition for a fast channel."
      submitLabel="Create Transition"
      onSubmit={handleSubmit}
    >
      <Select
        label="Channel"
        options={channelOptions}
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        error={errors.channel}
      />
      <Select
        label="Transition Type"
        options={[{ label: "— Select type —", value: "" }, ...transitionTypes]}
        value={type}
        onChange={(e) => setType(e.target.value)}
        error={errors.type}
      />
      <Input
        label="Duration (seconds)"
        type="number"
        placeholder="5"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        error={errors.duration}
      />
      <Input
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />
    </SlideOverPanel>
  );
}
