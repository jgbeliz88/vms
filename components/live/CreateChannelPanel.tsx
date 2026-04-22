"use client";

import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SlideOverPanel } from "@/components/ui/SlideOverPanel";

const createSchema = z.object({
  name: z.string().min(2, "Channel name is required"),
  channelPath: z.string().min(1, "Channel path is required"),
  metadata: z.string().optional()
});

export function CreateChannelPanel({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (values: {
    name: string;
    channelPath: string;
    metadata: Record<string, unknown>;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [channelPath, setChannelPath] = useState("");
  const [metadata, setMetadata] = useState("{}\n");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const result = createSchema.safeParse({ name, channelPath, metadata });
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        nextErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    let parsedMeta: Record<string, unknown> = {};
    if (metadata) {
      try {
        parsedMeta = JSON.parse(metadata);
      } catch {
        setErrors({ metadata: "Invalid JSON" });
        return;
      }
    }

    onCreate({ name, channelPath, metadata: parsedMeta });
    setName("");
    setChannelPath("");
    setMetadata("{}\n");
    setErrors({});
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title="Create Channel"
      subtitle="Add a new live channel definition."
      submitLabel="Create Channel"
      onSubmit={handleSubmit}
    >
      <Input
        label="Channel Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <Input
        label="Channel Path"
        placeholder="news-live"
        value={channelPath}
        onChange={(event) => setChannelPath(event.target.value)}
        error={errors.channelPath}
      />
      <Textarea
        label="Metadata (JSON)"
        value={metadata}
        onChange={(event) => setMetadata(event.target.value)}
        error={errors.metadata}
      />
    </SlideOverPanel>
  );
}
