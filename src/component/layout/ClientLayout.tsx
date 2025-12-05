"use client";

import React, { useEffect, useState } from "react";
import { ConfigProvider } from "antd";
import theme from "@/theme";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getDecodedAccess } from "@/utils/auth";
import dynamic from "next/dynamic";
import { AuthProvider } from "@/context/AuthContext";
import { DateProvider } from "@/context/DateContext";

// Use Next.js dynamic imports instead of React.lazy for better SSR support
const Sidebar = dynamic(() => import("./Sidebar"), {
  ssr: false,
  loading: () => <div className="w-20 md:w-[300px] bg-white" />,
});

const NotificationListener = dynamic(() => import("./NotificationListener"), {
  ssr: false,
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const { isAuthenticated, isLoading } = useAuth();
  const access = getDecodedAccess();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Check route permissions
    const checkAccess = () => {
      if (!isAuthenticated || isLoginPage) return;

      if (
        pathname.startsWith("/processes/input-data") &&
        !access?.external_data
      ) {
        router.push("/processes");
        return;
      }
      if (pathname.startsWith("/processes/cleansing") && !access?.cleansing) {
        router.push("/processes");
        return;
      }
      if (pathname.startsWith("/processes/tie-in") && !access?.tiein) {
        router.push("/processes");
        return;
      }
      if (pathname.startsWith("/global-config") && !access?.global_config) {
        router.push("/processes");
        return;
      }
    };

    checkAccess();
  }, [pathname, access, router, isAuthenticated, isLoginPage]);

  if (isLoading && !isLoginPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <ConfigProvider theme={theme}>
      {isLoginPage ? (
        <div className="min-h-screen m-0 p-0">
          <div className="p-0">{children}</div>
        </div>
      ) : (
        <AuthProvider>
          <DateProvider>
            <div className="flex min-h-screen bg-gray-50">
              {isAuthenticated && (
                <Sidebar
                  isCollapsed={isCollapsed}
                  setIsCollapsed={setIsCollapsed}
                  isMobileOpen={isMobileOpen}
                  setIsMobileOpen={setIsMobileOpen}
                />
              )}
              <main
                className={`flex-1 transition-all duration-300 ${
                  isAuthenticated
                    ? isCollapsed
                      ? "md:ml-20"
                      : "md:ml-[300px]"
                    : ""
                } p-6 w-full`}>
                <NotificationListener />
                {children}
              </main>
            </div>
          </DateProvider>
        </AuthProvider>
      )}
    </ConfigProvider>
  );
};

export default ClientLayout;
