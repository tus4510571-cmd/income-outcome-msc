import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen h-screen bg-[#FDFDFD] overflow-hidden print:h-auto print:overflow-visible">
      <div className="print:hidden h-full">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full print:h-auto print:overflow-visible">
        <div className="print:hidden">
          <MobileHeader />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto print:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
}
