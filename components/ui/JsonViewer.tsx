export function JsonViewer({ data }: { data: unknown }) {
  return (
    <pre className="scrollbar max-h-[320px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-emerald-100">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
