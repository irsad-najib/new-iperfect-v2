import {
  HiOutlineFlag,
  HiOutlineDocumentDuplicate,
  HiOutlineCalendar,
} from "react-icons/hi";
import { AiOutlineSetting } from "react-icons/ai";
import { MdInfoOutline } from "react-icons/md";
import { MenuItem } from "@/types";

export const menuItems: MenuItem[] = [
  {
    key: "daily-routines",
    label: "Daily Routines",
    icon: <HiOutlineCalendar size={24} />,
    href: "/daily-routines",
    children: [
      {
        key: "sub-processes",
        label: "Process",
        icon: <HiOutlineFlag size={24} />,
        href: "/processes",
        children: [
          {
            key: "input-data",
            label: "Input Data",
            href: "/processes/input-data",
          },
          {
            key: "cleansing",
            label: "Cleansing",
            href: "/processes/cleansing",
          },
          { key: "tiein", label: "Tie In", href: "/processes/tie-in" },
          {
            key: "rawmat",
            label: "RawMat",
            href: "/processes/rawmat",
            disabled: true,
          },
        ],
      },
      {
        key: "npk-sub",
        label: "NPK",
        icon: <HiOutlineFlag size={24} />,
        href: "/npk",
        children: [
          {
            key: "npk-produksi",
            label: "Data Produksi",
            href: "/npk/produksi",
          },
          {
            key: "npk-pengeluaran",
            label: "Rekap Pengeluaran",
            href: "/npk/pengeluaran",
          },
          {
            key: "npk-dailySummary",
            label: "Daily Summary",
            href: "/npk/summary",
          },
        ],
      },
      {
        key: "bb-sub",
        label: "Boiler Batubara",
        icon: <HiOutlineFlag size={24} />,
        href: "/bb",
        children: [
          {
            key: "bb-counter",
            label: "Counter Check Data DCS",
            href: "/bb/counter-check",
          },
          {
            key: "bb-harga",
            label: "Harga Gas, PO BB, dan CoA",
            href: "/bb/harga",
          },
          {
            key: "bb-konsumsi",
            label: "Konsumsi Batubara",
            href: "/bb/konsumsi",
          },
          { key: "bb-rawmat", label: "RawMat", href: "/bb/rawmat" },
          {
            key: "bb-konversi",
            label: "Konversi Coal-NG",
            href: "/bb/konversi",
          },
          { key: "bb-summary", label: "Daily Summary", href: "/bb/summary" },
        ],
      },
    ],
  },
  {
    key: "report",
    label: "Report",
    icon: <HiOutlineDocumentDuplicate size={24} />,
    href: "/report",
  },
  {
    key: "global-config",
    label: "Global Config",
    icon: <AiOutlineSetting size={24} />,
    href: "/global-config",
  },
  {
    key: "documentation",
    label: "Documentation",
    icon: <MdInfoOutline size={24} />,
    href: "https://iperfect-api.479067.my.id/wiki/home",
  },
];
