import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800">ระบบรายรับ-รายจ่าย</h1>
          {/* A simple hamburger menu could go here if implemented, for now just show title */}
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
