"use client";

import React from "react";

interface Props {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

export const ConfigCard = ({ label, active, onClick, icon }: Props) => {
  return (
    <div
      onClick={onClick}
      className={`w-[100px] h-[100px] flex flex-col items-center justify-center 
      rounded-lg cursor-pointer transition-all border font-semibold
      ${
        active
          ? "bg-[#f47920] border-[#f47920]"
          : "bg-white border-gray-200 hover:border-[#f47920]"
      }`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <div className={active ? "text-white" : "text-[#f47920]"}>{icon}</div>
        <span className={active ? "text-white" : "text-black"}>{label}</span>
      </div>
    </div>
  );
};
