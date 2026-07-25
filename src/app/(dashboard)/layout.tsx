import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <MobileHeader />
        
        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
