# Settings Page Plan

## Context

Settings (streaming formats, DRM paths, distribution URLs) are currently stored in `localStorage` under the key `agiletv.settings` and read directly in client components via `getSettings()`. The goal is to replace all non-`darkMode` settings with a live Enigma API call (`GET /setting-vms` / `PUT /setting-vms`), routed through the Next.js API layer as the rest of the app does.

Additionally:
- `/settings` page becomes ADMIN-only — non-ADMIN users get redirected to the dashboard with a toast.
- The dark mode toggle moves out of `/settings` (since non-ADMIN users can no longer access it) and into the App Bar as a Sun/Moon icon button, available to all users.

---

## Data Structure Change

The Enigma API returns a flat structure that differs from the current localStorage shape:

| Old (localStorage) | New (Enigma API) |
|----|-----|
| `distribution.origin.live` | `origin.live` |
| `distribution.cdn.live.akamai` | `akamai.live` |
| `distribution.cdn.live.fastly` | `fastly.live` |
| `streamingFormats` | `streamingFormats` (unchanged) |
| `drmPaths` | `drmPaths` (unchanged) |

`darkMode` stays in `localStorage` — managed by a simplified `lib/storage/settings.ts` and the existing `ThemeProvider`.

---

## Implementation Steps

### 1. New API Route — `app/api/settings/route.ts`

Create GET and PUT handlers following the existing `fetchVMS` + Zod pattern.

**GET**: Proxy `GET ${ENIGMA_BASE_URL}/setting-vms` → return response as-is.

**PUT**: Validate body with Zod (all fields required), proxy `PUT ${ENIGMA_BASE_URL}/setting-vms`, return `{ msg: string }`.

```ts
const vmsSettingsSchema = z.object({
  streamingFormats: z.object({ hls: z.string(), dash: z.string(), smooth: z.string() }),
  drmPaths: z.object({ clear: z.string(), widevine: z.string(), fairplay: z.string(), playready: z.string() }),
  akamai: z.object({ live: z.string(), vod: z.string(), fast: z.string() }),
  fastly: z.object({ live: z.string(), vod: z.string(), fast: z.string() }),
  origin: z.object({ live: z.string(), vod: z.string(), fast: z.string() }),
});
```

### 2. Simplify `lib/storage/settings.ts`

- **Remove**: `DistributionSettings`, `CdnProviderSettings`, `Settings` (full composite type), `getSettings`, `setSettings`, `clearSettings`.
- **Keep**: `StreamingFormatMapping`, `DrmPathMapping` (still referenced by the playback hook).
- **Add**: `VmsSettings` type matching the Enigma API shape:

```ts
export type VmsSettings = {
  streamingFormats: StreamingFormatMapping;
  drmPaths: DrmPathMapping;
  akamai: { live: string; vod: string; fast: string };
  fastly: { live: string; vod: string; fast: string };
  origin: { live: string; vod: string; fast: string };
};
```

- **Add**: Minimal `darkMode` helpers to replace the removed `getSettings`/`setSettings`:

```ts
const DARK_MODE_KEY = "agiletv.darkMode";
export function getDarkMode(): boolean { ... }
export function setDarkMode(next: boolean): void { ... }
```

- Update `ThemeProvider.tsx` to use `getDarkMode` / `setDarkMode` instead of the old `getSettings`/`setSettings`.

### 3. Add Query Key — `lib/query-keys.ts`

```ts
vmsSettings: () => ["vms-settings"],
```

### 4. New Settings Hooks — `features/settings/hooks.ts` (new file)

```ts
export function useVmsSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.vmsSettings(),
    queryFn: async () => {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load settings");
      return (await res.json()) as VmsSettings;
    },
  });
}

export function useUpdateVmsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VmsSettings) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json() as Promise<{ msg: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vmsSettings() });
    },
  });
}
```

### 5. Update `app/settings/page.tsx`

**ADMIN guard**: At the top of the component use `usePermission([ROLES.ADMIN])`, `useRouter`, and `useToast`. In a `useEffect`, if user is not ADMIN: call `notify({ title: "You are not allowed to access this page.", variant: "error" })`, then `router.replace("/")`. Return `null` while loading or redirecting.

**Data**: Replace the `useEffect` blocks calling `getSettings()` with `useVmsSettingsQuery()`. Populate form state from `query.data` in a single `useEffect` once data arrives.

**Save**: Replace `setSettings()` with `useUpdateVmsSettings()`. Show success/error toast on mutation result.

**Distribution form fields**: Update local state variables to match the new flat API shape (`origin.live`, `akamai.live`, `fastly.live`, etc.).

**Remove**: The entire "Preferences" card (dark mode toggle). It moves to the App Bar.

### 6. Add Sun/Moon Toggle to `components/AppShell.tsx`

- Import `Sun` and `Moon` from `lucide-react` (already used in this file).
- Import `toggleDarkMode` (renamed from `ThemeProvider`) and `getDarkMode` from `lib/storage/settings`.
- Add a `darkMode` state, initialized from `getDarkMode()` on mount.
- Render a button in the header's right-side icon group (between `EnvironmentSelector` and `Bell`):
  - Shows `<Sun>` when dark mode is active (click → switch to light)
  - Shows `<Moon>` when light mode is active (click → switch to dark)
  - On click: calls `toggleDarkMode(!darkMode)` and updates local state.

```tsx
const [darkMode, setDarkMode] = useState(false);
useEffect(() => { setDarkMode(getDarkMode()); }, []);

// In the header icons group:
<button
  onClick={() => { toggleDarkMode(!darkMode); setDarkMode((d) => !d); }}
  className="relative rounded-full p-2 text-[#637381] hover:bg-[#F1F5F9] dark:hover:bg-[#1A222C]"
  aria-label="Toggle dark mode"
>
  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
</button>
```

### 7. Update Settings nav item in `components/AppShell.tsx`

Add `allowedRoles: [ROLES.ADMIN]` to the Settings nav item so the link is hidden for non-ADMIN users:

```ts
{ href: "/settings", label: "Settings", icon: Settings, allowedRoles: [ROLES.ADMIN] },
```

(The `visibleNavItems` filter on line 66 already handles this pattern — no other change needed.)

### 8. Update `features/playback/hooks.ts`

Replace the `useEffect(() => { const settings = getSettings(); ... })` in `usePlaybackSettings()` with `useVmsSettingsQuery()`.
`formats` and `drmPaths` come from `query.data?.streamingFormats` and `query.data?.drmPaths` with their existing defaults as fallback.

### 9. Update `app/page.tsx`

Replace `useEffect(() => { const settings = getSettings(); setOriginLiveUrl(...); setVodOriginUrl(...); })` with `useVmsSettingsQuery()`:
- `originLiveUrl` ← `query.data?.origin.live ?? ""`
- `vodOriginUrl` ← `query.data?.origin.vod ?? ""`

### 10. Update `components/live/PlaybackPanel.tsx`

Replace direct `getSettings()` calls with `useVmsSettingsQuery()`:
- `distOriginLive` ← `query.data?.origin.live`
- `distCdnLive` ← `{ akamai: query.data?.akamai.live, fastly: query.data?.fastly.live }`

### 11. Update `components/vod/VodPlaybackPanel.tsx`

Same pattern:
- `distOriginVod` ← `query.data?.origin.vod`
- `distCdnVod` ← `{ akamai: query.data?.akamai.vod, fastly: query.data?.fastly.vod }`

### 12. Update `components/fast-channels/FastChannelPlaybackPanel.tsx`

Same pattern:
- `distOriginFast` ← `query.data?.origin.fast`
- `distCdnFast` ← `{ akamai: query.data?.akamai.fast, fastly: query.data?.fastly.fast }`

---

## Files Modified / Created

| Path | Change |
|------|--------|
| `app/api/settings/route.ts` | **NEW** — GET + PUT proxy to Enigma |
| `lib/storage/settings.ts` | Strip distribution/Settings types; add `VmsSettings`; replace full helpers with minimal `getDarkMode`/`setDarkMode` |
| `lib/query-keys.ts` | Add `vmsSettings` key |
| `features/settings/hooks.ts` | **NEW** — `useVmsSettingsQuery` + `useUpdateVmsSettings` |
| `app/settings/page.tsx` | ADMIN guard + React Query; remove dark mode card |
| `components/AppShell.tsx` | Add Sun/Moon toggle to header; restrict Settings nav to ADMIN |
| `components/ThemeProvider.tsx` | Use new `getDarkMode`/`setDarkMode` helpers |
| `features/playback/hooks.ts` | Use `useVmsSettingsQuery` for formats/drm |
| `app/page.tsx` | Use `useVmsSettingsQuery` for origin URLs |
| `components/live/PlaybackPanel.tsx` | Use `useVmsSettingsQuery` for origin/CDN |
| `components/vod/VodPlaybackPanel.tsx` | Use `useVmsSettingsQuery` for origin/CDN |
| `components/fast-channels/FastChannelPlaybackPanel.tsx` | Use `useVmsSettingsQuery` for origin/CDN |

---

## Verification

1. `npm run lint` — no type errors after removing old types and updating consumers.
2. Start dev server: `npm run dev`.
3. Verify the Sun/Moon button appears in the App Bar for all users. Clicking it toggles the theme and persists across page refreshes.
4. As an ADMIN user: navigate to `/settings`, verify data loads from the API (Network tab shows `GET /api/settings`). Edit a field and Save — verify `PUT /api/settings` fires with the correct body and a success toast appears. Confirm dark mode card is gone from this page.
5. As a non-ADMIN user: navigate directly to `/settings`, verify redirect to `/` and "You are not allowed to access this page." toast. Verify Settings link is absent from the sidebar.
6. Open a live channel playback panel — verify origin and CDN URLs populate correctly from the API response.
7. Open VOD and Fast Channels playback panels — same check.
8. Verify `ThemeProvider` still initializes dark mode correctly on page load.
