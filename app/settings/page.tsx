"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { StreamingFormatMapping, DrmPathMapping } from "@/lib/storage/settings";
import { useToast } from "@/components/ui/Toast";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useRequirePermission } from "@/lib/auth/useRequirePermission";
import { useVmsSettingsQuery, useUpdateVmsSettings } from "@/features/settings/hooks";

type CdnPair = { akamai: string; fastly: string };

const defaultFormats: StreamingFormatMapping = { hls: "", dash: "", smooth: "" };
const defaultDrm: DrmPathMapping = { clear: "", widevine: "", fairplay: "", playready: "" };
const defaultCdn: CdnPair = { akamai: "", fastly: "" };

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-5 shadow-card dark:border-[#2E3A47] dark:bg-[#24303F]">
      <div className="text-[15px] font-semibold text-[#1C2434] dark:text-white">{title}</div>
      {description && <p className="mt-1 text-xs text-[#64748B]">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { notify } = useToast();
  const isAdmin = useRequirePermission(PERMISSIONS.SETTINGS_PAGE);

  const { data: vmsSettings } = useVmsSettingsQuery();
  const { mutateAsync: updateSettings, isPending: isSaving } = useUpdateVmsSettings();

  const [distOriginLive, setDistOriginLive] = useState("");
  const [distOriginVod, setDistOriginVod] = useState("");
  const [distOriginFast, setDistOriginFast] = useState("");
  const [cdnLive, setCdnLive] = useState<CdnPair>(defaultCdn);
  const [cdnVod, setCdnVod] = useState<CdnPair>(defaultCdn);
  const [cdnFast, setCdnFast] = useState<CdnPair>(defaultCdn);
  const [formats, setFormats] = useState<StreamingFormatMapping>(defaultFormats);
  const [drmPaths, setDrmPaths] = useState<DrmPathMapping>(defaultDrm);

  useEffect(() => {
    if (!vmsSettings) return;
    setFormats(vmsSettings.streamingFormats);
    setDrmPaths(vmsSettings.drmPaths);
    setDistOriginLive(vmsSettings.origin.live);
    setDistOriginVod(vmsSettings.origin.vod);
    setDistOriginFast(vmsSettings.origin.fast);
    setCdnLive({ akamai: vmsSettings.akamai.live, fastly: vmsSettings.fastly.live });
    setCdnVod({ akamai: vmsSettings.akamai.vod, fastly: vmsSettings.fastly.vod });
    setCdnFast({ akamai: vmsSettings.akamai.fast, fastly: vmsSettings.fastly.fast });
  }, [vmsSettings]);

  if (!isAdmin) return null;

  const saveSettings = async () => {
    try {
      await updateSettings({
        streamingFormats: formats,
        drmPaths,
        akamai: { live: cdnLive.akamai, vod: cdnVod.akamai, fast: cdnFast.akamai },
        fastly: { live: cdnLive.fastly, vod: cdnVod.fastly, fast: cdnFast.fastly },
        origin: { live: distOriginLive, vod: distOriginVod, fast: distOriginFast },
      });
      notify({ title: "Settings saved", variant: "success", description: "Your preferences are updated." });
    } catch {
      notify({ title: "Failed to save settings", variant: "error" });
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1C2434] dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Configure global preferences and environment origins.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsCard title="Streaming Formats" description="File extensions per streaming format.">
            <div className="space-y-3">
              <Input
                label="HLS Extension"
                placeholder=".m3u8"
                value={formats.hls}
                onChange={(event) => setFormats({ ...formats, hls: event.target.value })}
              />
              <Input
                label="DASH Extension"
                placeholder=".mpd"
                value={formats.dash}
                onChange={(event) => setFormats({ ...formats, dash: event.target.value })}
              />
              <Input
                label="Smooth Streaming Extension"
                placeholder=".Manifest"
                value={formats.smooth}
                onChange={(event) => setFormats({ ...formats, smooth: event.target.value })}
              />
            </div>
          </SettingsCard>

          <SettingsCard title="DRM Paths" description="Path segments per DRM configuration.">
            <div className="space-y-3">
              <Input
                label="Clear"
                placeholder="clear"
                value={drmPaths.clear}
                onChange={(event) => setDrmPaths({ ...drmPaths, clear: event.target.value })}
              />
              <Input
                label="Widevine"
                placeholder="wv"
                value={drmPaths.widevine}
                onChange={(event) => setDrmPaths({ ...drmPaths, widevine: event.target.value })}
              />
              <Input
                label="Fairplay"
                placeholder="fp"
                value={drmPaths.fairplay}
                onChange={(event) => setDrmPaths({ ...drmPaths, fairplay: event.target.value })}
              />
              <Input
                label="Playready"
                placeholder="pr"
                value={drmPaths.playready}
                onChange={(event) => setDrmPaths({ ...drmPaths, playready: event.target.value })}
              />
            </div>
          </SettingsCard>

          {/* Distribution — full width */}
          <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-5 shadow-card dark:border-[#2E3A47] dark:bg-[#24303F] lg:col-span-2">
            <div className="text-[15px] font-semibold text-[#1C2434] dark:text-white">Distribution</div>
            <p className="mt-1 text-xs text-[#64748B]">
              Configure Origin and CDN domains for Live, VOD, and Fast Channels.
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F7F9FC] p-4 dark:border-[#2E3A47] dark:bg-[#1A222C]">
                <div className="text-xs font-semibold uppercase tracking-[0.05em] text-[#8899A8]">Origin</div>
                <div className="mt-3 space-y-3">
                  <Input
                    label="Live"
                    placeholder="origin-live.example.com"
                    value={distOriginLive}
                    onChange={(event) => setDistOriginLive(event.target.value)}
                  />
                  <Input
                    label="VOD"
                    placeholder="origin-vod.example.com"
                    value={distOriginVod}
                    onChange={(event) => setDistOriginVod(event.target.value)}
                  />
                  <Input
                    label="Fast Channels"
                    placeholder="origin-fast.example.com"
                    value={distOriginFast}
                    onChange={(event) => setDistOriginFast(event.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F7F9FC] p-4 dark:border-[#2E3A47] dark:bg-[#1A222C]">
                <div className="text-xs font-semibold uppercase tracking-[0.05em] text-[#8899A8]">CDN</div>
                <div className="mt-3 space-y-4">
                  {[
                    { label: "Live", cdn: cdnLive, set: setCdnLive },
                    { label: "VOD", cdn: cdnVod, set: setCdnVod },
                    { label: "Fast Channels", cdn: cdnFast, set: setCdnFast }
                  ].map(({ label, cdn, set }) => (
                    <div key={label} className="rounded-md border border-[#E2E8F0] bg-white p-3 dark:border-[#2E3A47] dark:bg-[#24303F]">
                      <div className="text-xs font-semibold text-[#64748B]">{label}</div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <Input
                          label="Akamai"
                          placeholder="akamaicdn.example.com"
                          value={cdn.akamai}
                          onChange={(event) => set({ ...cdn, akamai: event.target.value })}
                        />
                        <Input
                          label="Fastly"
                          placeholder="fastlycdn.example.com"
                          value={cdn.fastly}
                          onChange={(event) => set({ ...cdn, fastly: event.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save All Settings"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
