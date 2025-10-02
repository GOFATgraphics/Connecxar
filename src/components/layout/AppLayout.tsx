import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNavigation } from "./BottomNavigation";

export const AppLayout = () => {
  const location = useLocation();
  const showTopBar = location.pathname !== "/home" && location.pathname !== "/sparks";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showTopBar && <TopBar />}
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};
