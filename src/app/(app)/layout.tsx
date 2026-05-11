export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {children}
    </div>
  )
}
