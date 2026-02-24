"use client";

import { useState } from "react";
import { Typography } from "antd";
import {
  AiFillTags,
  AiOutlineRadiusSetting,
  AiOutlineCodeSandbox,
  AiOutlinePoweroff,
} from "react-icons/ai";

import { ConfigCard } from "@/components/global-config/ConfigCard";
import { TagSection } from "@/components/global-config/sections/TagSection";
import { ConstantSection } from "@/components/global-config/sections/ConstantSection";
import { ProductSection } from "@/components/global-config/sections/ProductSection";
import { MaterialSection } from "@/components/global-config/sections/MaterialSection";
import { DowntimeSection } from "@/components/global-config/sections/DowntimeSection";

const { Title } = Typography;

export const GlobalConfigPage = () => {
  const [active, setActive] = useState("Tag");

  return (
    <div className="p-6">
      <Title level={2} className="!mt-0">
        Global Config
      </Title>

      <div className="flex gap-4 mb-6">
        <ConfigCard
          label="Tag"
          active={active === "Tag"}
          onClick={() => setActive("Tag")}
          icon={<AiFillTags size={48} />}
        />
        <ConfigCard
          label="Constant"
          active={active === "Constant"}
          onClick={() => setActive("Constant")}
          icon={<AiOutlineRadiusSetting size={48} />}
        />
        <ConfigCard
          label="Produk"
          active={active === "Produk"}
          onClick={() => setActive("Produk")}
          icon={<AiOutlineCodeSandbox size={48} />}
        />
        <ConfigCard
          label="Material"
          active={active === "Material"}
          onClick={() => setActive("Material")}
          icon={<AiOutlineCodeSandbox size={48} />}
        />
        <ConfigCard
          label="Downtime"
          active={active === "Downtime"}
          onClick={() => setActive("Downtime")}
          icon={<AiOutlinePoweroff size={48} />}
        />
      </div>

      <hr className="my-5 border-gray-300" />

      {active === "Tag" && <TagSection />}
      {active === "Constant" && <ConstantSection />}
      {active === "Produk" && <ProductSection />}
      {active === "Material" && <MaterialSection />}
      {active === "Downtime" && <DowntimeSection />}
    </div>
  );
};
