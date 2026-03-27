import StandardNav from "@/components/nav/standard-nav";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <StandardNav />
      </header>
      {children}
    </div>
  );
}
