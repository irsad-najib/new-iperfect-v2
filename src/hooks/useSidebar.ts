import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

export const useOpenKeys = () => {
  const pathname = usePathname();

  const getInitialOpenKeys = useCallback(() => {
    const keys: string[] = [];
    if (pathname.startsWith("/daily-routines")) keys.push("daily-routines");
    if (pathname.startsWith("/processes"))
      keys.push("daily-routines", "sub-processes");
    if (pathname.startsWith("/npk")) keys.push("daily-routines", "npk-sub");
    if (pathname.startsWith("/bb")) keys.push("daily-routines", "bb-sub");
    return keys;
  }, [pathname]);

  const [openKeys, setOpenKeys] = useState<string[]>(getInitialOpenKeys);

  useEffect(() => {
    const keys = getInitialOpenKeys();
    if (keys.length > 0) {
      const timeoutId = setTimeout(() => {
        setOpenKeys((prev) => {
          const newSet = new Set([...prev, ...keys]);
          if (newSet.size !== prev.length) {
            return Array.from(newSet);
          }
          return prev;
        });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [pathname, getInitialOpenKeys]);

  return { openKeys, setOpenKeys };
};

export const useActiveRoute = () => {
  const pathname = usePathname();

  const isActive = useCallback(
    (href?: string) => {
      if (!href) return false;
      if (href === "/daily-routines" && pathname.startsWith("/daily-routines"))
        return true;
      return pathname === href;
    },
    [pathname]
  );

  return { isActive, pathname };
};
