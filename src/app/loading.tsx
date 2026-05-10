import { EnvelopeLoader } from "@/components/EnvelopeLoader";

export default function RootLoading() {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center px-4 py-16">
      <EnvelopeLoader message="Loading SignFlow…" />
    </div>
  );
}
