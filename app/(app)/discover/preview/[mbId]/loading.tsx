export default function AlbumPreviewLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 rounded bg-surface-2" />

      {/* Header */}
      <div className="flex gap-5">
        <div className="h-40 w-40 shrink-0 rounded-xl bg-surface-2" />
        <div className="space-y-3 flex-1 pt-2">
          <div className="h-6 w-3/4 rounded bg-surface-2" />
          <div className="h-4 w-1/2 rounded bg-surface-2" />
          <div className="h-4 w-1/4 rounded bg-surface-2" />
          <div className="mt-4 h-9 w-36 rounded-lg bg-surface-2" />
        </div>
      </div>

      {/* Tracklist */}
      <div className="space-y-2 mt-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg bg-surface-1 px-4 py-3">
            <div className="h-4 w-6 rounded bg-surface-2" />
            <div className="h-4 flex-1 rounded bg-surface-2" />
            <div className="h-4 w-10 rounded bg-surface-2" />
            <div className="h-8 w-8 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
