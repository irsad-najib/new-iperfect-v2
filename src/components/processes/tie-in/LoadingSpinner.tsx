"use client";

import React from "react";
import { Spin } from "antd";

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = "Loading...",
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen flex-col gap-4">
      <Spin size="large" />
      <p className="text-base text-neutral-500 m-0">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
