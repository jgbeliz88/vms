"use client";

import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { SlideOverPanel } from "@/components/ui/SlideOverPanel";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  uri: z.string().url("Must be a valid URL")
});

export function CreateFastChannelPanel({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (values: { name: string; uri: string }) => void;
}) {
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const result = schema.safeParse({ name, uri });
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        next[String(issue.path[0])] = issue.message;
      });
      setErrors(next);
      return;
    }
    onCreate({ name, uri });
    setName("");
    setUri("");
    setErrors({});
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title="Create Fast Channel"
      subtitle="Add a new fast channel definition."
      submitLabel="Create Channel"
      onSubmit={handleSubmit}
    >
      <Input
        label="Channel Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <Input
        label="URI"
        placeholder="https://origin.example.com/path"
        value={uri}
        onChange={(e) => setUri(e.target.value)}
        error={errors.uri}
      />
    </SlideOverPanel>
  );
}
