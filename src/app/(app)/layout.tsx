import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { RightIconStrip } from '@/components/layout/RightIconStrip'
import { TopBar } from '@/components/layout/TopBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      <LeftSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <RightIconStrip />
    </div>
  )
}
