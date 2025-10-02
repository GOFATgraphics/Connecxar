import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Plus, Zap, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    icon: Home,
    label: "Home",
    path: "/home"
  },
  {
    icon: Search,
    label: "Discover",
    path: "/discover"
  },
  {
    icon: Plus,
    label: "Drop",
    path: "/composer",
    isCenter: true
  },
  {
    icon: Zap,
    label: "Sparks",
    path: "/sparks"
  },
  {
    icon: User,
    label: "Profile",
    path: "/profile"
  },
];

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide bottom nav on sparks page
  if (location.pathname === '/sparks') {
    return null;
  }

  const handleNavigation = (path: string, isCenter: boolean = false) => {
    if (isCenter) {
      // Center button opens composer modal - for now navigate to composer
      navigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/home" && location.pathname === "/");

          if (item.isCenter) {
            return (
              <Button
                key={item.path}
                onClick={() => handleNavigation(item.path, true)}
                className="nav-drop-button -mt-6"
                size="icon"
              >
                <item.icon className="h-6 w-6" />
              </Button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "nav-item",
                isActive && "active"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
