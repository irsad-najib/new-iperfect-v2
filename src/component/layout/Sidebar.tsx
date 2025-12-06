"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  HiDotsHorizontal,
  HiChevronDown,
  HiChevronRight,
  HiMenuAlt2,
  HiChevronLeft,
} from "react-icons/hi";
import { useAuth } from "@/context/AuthContext";
import { menuItems } from "@/config/menuConfig";
import { useOpenKeys, useActiveRoute } from "@/hooks/useSidebar";
import type { User } from "@/types";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const router = useRouter();
  const { user } = useAuth() as { user: User | null };
  const { openKeys, setOpenKeys } = useOpenKeys();
  const { isActive } = useActiveRoute();

  const toggleSubMenu = useCallback(
    (key: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isCollapsed) {
        setIsCollapsed(false);
        setOpenKeys([key]);
      } else {
        setOpenKeys((prev) =>
          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
      }
    },
    [isCollapsed, setIsCollapsed, setOpenKeys]
  );

  const handleTitleClick = useCallback(
    (href: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(href);
    },
    [router]
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsMobileOpen(!isMobileOpen)}>
        <HiMenuAlt2 size={24} />
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-white border-r border-neutral-200 shadow-lg transition-all duration-300 ease-in-out flex flex-col
          ${isCollapsed ? "w-20" : "w-[300px]"}
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}>
        {/* Logo Section */}
        <div
          className={`h-20 flex items-center ${
            isCollapsed ? "justify-center px-2" : "px-8"
          }`}>
          <div className="relative w-full h-8 flex items-center justify-center">
            {isCollapsed ? (
              <Image
                src="/iperfect-logo.svg"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            ) : (
              <Image
                src="/iperfect-logo.svg"
                alt="iPerfect Logo"
                width={120}
                height={30}
                className="object-contain"
              />
            )}
          </div>
        </div>

        {/* Toggle Button (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-4 top-24 bg-white border border-neutral-200 rounded-full p-1 shadow-sm hover:bg-gray-50 z-50">
          {isCollapsed ? (
            <HiChevronRight size={24} />
          ) : (
            <HiChevronLeft size={24} />
          )}
        </button>

        <div className="px-6 mb-4">
          <div className="h-px w-full bg-gray-200" />
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              if (item.disabled) return null;

              const isItemActive = isActive(item.href);
              const isSubMenuOpen = openKeys.includes(item.key);
              const hasChildren = item.children && item.children.length > 0;

              return (
                <div key={item.key}>
                  {hasChildren ? (
                    <>
                      {/* First Level with Children - Clickable Title + Toggle */}
                      <div
                        className={`
                          group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors 
                          ${
                            isSubMenuOpen || isItemActive
                              ? "bg-gray-50 text-neutral-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-neutral-900"
                          }
                        `}>
                        <div
                          className="flex items-center gap-3 flex-1"
                          onClick={(e) =>
                            handleTitleClick(item.href || "#", e)
                          }>
                          <span
                            className={`${
                              isSubMenuOpen || isItemActive
                                ? "text-orange-500"
                                : "text-gray-500 group-hover:text-neutral-900"
                            }`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="font-semibold text-20">
                              {item.label}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span
                            onClick={(e) => toggleSubMenu(item.key, e)}
                            className={`transition-transform duration-200 ${
                              isSubMenuOpen ? "rotate-180" : ""
                            }`}>
                            <HiChevronDown size={16} />
                          </span>
                        )}
                      </div>

                      {/* Second Level Items */}
                      {isSubMenuOpen && !isCollapsed && (
                        <div className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                          {item.children?.map((child) => {
                            if (child.disabled) return null;
                            const isChildActive = isActive(child.href);
                            const isChildOpen = openKeys.includes(child.key);
                            const hasGrandchildren =
                              child.children && child.children.length > 0;

                            return (
                              <div key={child.key}>
                                {hasGrandchildren ? (
                                  <>
                                    {/* Second Level with Grandchildren - Clickable Title + Toggle */}
                                    <div
                                      className={`
                                        flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors
                                        ${
                                          isChildOpen || isChildActive
                                            ? "text-orange-500 font-semibold bg-orange-50"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        }
                                      `}>
                                      <div
                                        className="flex items-center gap-2 flex-1"
                                        onClick={(e) =>
                                          handleTitleClick(child.href || "#", e)
                                        }>
                                        <span className="text-neutral-900">
                                          {child.icon}
                                        </span>
                                        <span className="text-20 font-semibold">
                                          {child.label}
                                        </span>
                                      </div>
                                      <span
                                        onClick={(e) =>
                                          toggleSubMenu(child.key, e)
                                        }
                                        className={`transition-transform duration-200 ${
                                          isChildOpen ? "rotate-180" : ""
                                        }`}>
                                        <HiChevronDown size={14} />
                                      </span>
                                    </div>

                                    {/* Third Level Items (Grandchildren) */}
                                    {isChildOpen && (
                                      <div className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                                        {child.children?.map((grandchild) => {
                                          if (grandchild.disabled) return null;
                                          const isGrandchildActive = isActive(
                                            grandchild.href
                                          );

                                          return (
                                            <Link
                                              key={grandchild.key}
                                              href={grandchild.href || "#"}
                                              className={`
                                                block px-3 py-2 rounded-md text-20 transition-colors
                                                ${
                                                  isGrandchildActive
                                                    ? "text-orange-500 font-medium bg-orange-50"
                                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                                }
                                              `}>
                                              {grandchild.label}
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  // Second Level without Grandchildren (Regular Link)
                                  <Link
                                    href={child.href || "#"}
                                    className={`
                                      block px-3 py-2 rounded-md text-20 transition-colors
                                      ${
                                        isChildActive
                                          ? "text-orange-500 font-medium bg-orange-50"
                                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                      }
                                    `}>
                                    {child.label}
                                  </Link>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    // Regular Menu Item (No Children)
                    <Link
                      href={item.href || "#"}
                      target={
                        item.href?.startsWith("http") ? "_blank" : undefined
                      }
                      className={`
                        group flex items-center px-3 py-3 rounded-lg transition-colors relative
                        ${
                          isItemActive
                            ? "bg-gray-50 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}>
                      {isItemActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F47920] rounded-r-full" />
                      )}
                      <div className="flex items-center gap-3">
                        <span
                          className={`${
                            isItemActive
                              ? "text-orange-500"
                              : "text-gray-500 group-hover:text-gray-900"
                          }`}>
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="font-medium text-20">
                            {item.label}
                          </span>
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200 bg-[#F3F4F8]">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
              {user?.profile_picture ? (
                <Image
                  src={user.profile_picture}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-20 font-semibold text-neutral-900 truncate">
                  {user?.username || "User"}
                </p>
                <p className="text-14 text-gray-500 truncate">Engineers</p>
              </div>
            )}

            {!isCollapsed && (
              <button className="text-gray-400 hover:text-gray-600">
                <HiDotsHorizontal size={20} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
