import React from "react";

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  disabled?: boolean;
}
