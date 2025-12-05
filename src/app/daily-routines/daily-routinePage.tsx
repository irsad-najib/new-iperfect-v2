"use client";
import React, { useState, useEffect } from "react";
import { Breadcrumb, Calendar, Select, Spin } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi";
import dayjs, { Dayjs } from "dayjs";
import { AiOutlineCheck } from "react-icons/ai";
import "dayjs/locale/id";
import { useRouter } from "next/navigation";

const customCalendarStyles = `
  [&_.ant-picker-cell-inner]:!p-[8px_4px] [&_.ant-picker-cell-inner]:!min-h-[60px] [&_.ant-picker-cell-inner]:!rounded-none [&_.ant-picker-cell-inner]:!bg-transparent [&_.ant-picker-cell-inner]:!border-none
  [&_.ant-picker-body]:bg-[#f3f4f8]
  [&_.ant-picker-calendar-date-today]:!bg-[#fcdcc5]
  [&_.ant-picker-calendar-date-today_.ant-picker-calendar-date-content]:!bg-[#fcdcc5]
  [&_.ant-picker-calendar-date-today_.ant-picker-calendar-date-value]:!bg-[#fcdcc5]
  [&_.ant-picker-cell]:!border-[5px] [&_.ant-picker-cell]:!border-[#f3f4f8]
  [&_.ant-picker-calendar-date]:!p-0
  [&_.ant-picker-calendar-date-content]:!px-[5px] [&_.ant-picker-calendar-date-content]:!py-0 [&_.ant-picker-calendar-date-content]:bg-white
  [&_.ant-picker-calendar-date-value]:!p-[0_5px_5px_5px] [&_.ant-picker-calendar-date-value]:text-start [&_.ant-picker-calendar-date-value]:bg-white
  [&_.ant-picker-content_th]:!p-[0_5px_5px_5px] [&_.ant-picker-content_th]:text-start [&_.ant-picker-content_th]:text-2xl [&_.ant-picker-content_th]:!border-[5px] [&_.ant-picker-content_th]:!border-[#f3f4f8]
  [&_.ant-picker-cell-selected]:!bg-transparent [&_.ant-picker-cell-selected_.ant-picker-cell-inner]:!bg-transparent
`;

const DailyRoutinePage: React.FC = () => {
  const router = useRouter();
  dayjs.locale("id");

  // State untuk loading
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [clickedItem, setClickedItem] = useState<{
    date: string;
    name: string;
  } | null>(null);

  const monthOptions = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const [month, setMonth] = useState<number>(dayjs().month());
  const [year, setYear] = useState<number>(dayjs().year());

  // Simulasi loading saat component mount
  useEffect(() => {
    const loadData = async () => {
      // Simulasi fetch data atau delay untuk loading
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsLoading(false);
    };

    loadData();
  }, []);

  const getYearOptions = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const year = start + i;
      return { value: year, label: year };
    });
  };

  const data: Record<
    string,
    { name: string; status: "Done" | "In Progress" | "Unavailable" }[]
  > = {
    "2025-09-03": [
      { name: "Amonia & Urea", status: "Done" },
      { name: "NPK", status: "In Progress" },
      { name: "Batubara", status: "Unavailable" },
    ],
    // ...lanjutkan data
  };

  // Status icon rendering
  const renderStatusIcon = (status: "Done" | "In Progress" | "Unavailable") => {
    const baseClass =
      "w-4 h-4 rounded-full flex justify-center items-center mr-3 text-[20.16px] font-semibold";

    if (status === "Done") {
      return (
        <div className={`${baseClass} bg-[#1268B3] text-[#F3F4F8]`}>
          <AiOutlineCheck color="#F3F4F8" size={10} />
        </div>
      );
    }
    if (status === "In Progress") {
      return (
        <div
          className={`${baseClass} relative`}
          style={{
            background: `conic-gradient(#F47920 0deg 240deg, #EEEFF1 240deg 360deg)`,
          }}>
          <div className="w-3.5 h-3.5 bg-[#F47920] border-[3px] border-[#F3f4f8] rounded-full absolute" />
        </div>
      );
    }
    if (status === "Unavailable") {
      return (
        <div
          className={`${baseClass} bg-[#EEEFF1] text-[#B3B5BD] border-2 border-[#B3B5BD]`}></div>
      );
    }
    return null;
  };

  // Helper function untuk menentukan border color berdasarkan status dominan
  const getBorderColor = (
    listData: { name: string; status: "Done" | "In Progress" | "Unavailable" }[]
  ) => {
    const statusCounts = {
      Done: 0,
      "In Progress": 0,
      Unavailable: 0,
    };

    // Hitung jumlah masing-masing status
    listData.forEach((item) => {
      statusCounts[item.status]++;
    });

    // Tentukan status dominan
    if (statusCounts.Done === listData.length) {
      return "#1268B3"; // Semua Done - biru
    } else if (statusCounts.Done > 0) {
      return "#F47920"; // Ada yang Done tapi tidak semua - orange
    } else {
      return "#B3B5BD"; // Tidak ada yang Done - abu-abu
    }
  };

  // Handler untuk navigasi item dengan loading state
  const handleItemClick = async (
    date: string,
    item: { name: string; status: string }
  ) => {
    // Set loading state dan item yang diklik
    setIsNavigating(true);
    setClickedItem({ date, name: item.name });

    try {
      // Simpan tanggal ke localStorage
      localStorage.setItem("selectedDate", date);
      localStorage.setItem("selectedItem", JSON.stringify(item));

      // Simulasi delay untuk smooth UX (opsional)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Determine route based on item name

      if (item.name === "Amonia & Urea") {
        router.push("/processes");
      } else if (item.name === "NPK") {
        router.push("/npk");
      } else if (item.name === "Batubara") {
        router.push("/coal");
      } else {
        router.push(`/${item.name.toLowerCase().replace(/\s+/g, "-")}`);
      }
    } catch (error) {
      console.error("Navigation error:", error);
      setIsNavigating(false);
      setClickedItem(null);
    }
  };

  // Calendar cell rendering
  const dateCellRender = (value: Dayjs) => {
    // Hanya render data jika di bulan yang aktif
    if (value.month() !== month || value.year() !== year) {
      return null;
    }

    const currentDate = value.format("YYYY-MM-DD");
    const listData = data[currentDate] || [
      { name: "Amonia & Urea", status: "Done" },
      { name: "NPK", status: "In Progress" },
      { name: "Batubara", status: "Unavailable" },
    ];

    const borderColor = getBorderColor(listData);

    return (
      <div
        className="p-0"
        style={{
          borderTop: `3px solid ${borderColor}`,
        }}>
        <ul className="p-0 m-0 list-none">
          {listData.map((item, idx) => {
            const isCurrentlyClicked =
              isNavigating &&
              clickedItem?.date === currentDate &&
              clickedItem?.name === item.name;

            return (
              <li
                key={idx}
                onClick={() =>
                  !isNavigating && handleItemClick(currentDate, item)
                }
                className={`flex items-center text-sm mb-0.5 px-1 py-0.5 rounded transition-colors duration-200 relative ${
                  !isNavigating ? "hover:bg-[#f5f5f5]" : ""
                }`}
                style={{
                  color:
                    item.status === "Done"
                      ? "#1268B3"
                      : item.status === "In Progress"
                      ? "#F47920"
                      : "#B3B5BD",
                  fontWeight: item.status === "Done" ? 600 : 400,
                  cursor: isNavigating ? "wait" : "pointer",
                  opacity: isNavigating && !isCurrentlyClicked ? 0.5 : 1,
                }}>
                {isCurrentlyClicked ? (
                  <Spin size="small" className="mr-3 text-[10px]" />
                ) : (
                  renderStatusIcon(item.status)
                )}
                {item.name}
                {isCurrentlyClicked && (
                  <span className="ml-2 text-xs text-[#666]">Loading...</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // Handle chevron left/right
  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Sync Select with state
  const handleMonthSelect = (selectedMonth: string) => {
    setMonth(monthOptions.indexOf(selectedMonth));
  };

  const handleYearSelect = (selectedYear: number) => {
    setYear(selectedYear);
  };

  // Tampilkan loading spinner jika masih loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh] flex-col gap-4">
        <Spin size="large" />
        <p className="text-base text-[#666] m-0">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Loading overlay saat navigating */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white/80 flex justify-center items-center z-50 flex-col gap-4">
          <Spin size="large" />
          <p className="text-base text-[#666] m-0">
            Navigating to {clickedItem?.name}...
          </p>
        </div>
      )}

      <div className="customBreadcrumb separatorSpacing">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={[
            {
              title: <span className="lastBreadcrumbItem">Daily Routines</span>,
            },
          ]}
        />
      </div>
      <div className="flex justify-between pt-4">
        <div className="flex items-center gap-2 text-2xl">
          <HiOutlineChevronLeft
            size={24}
            onClick={handlePrevMonth}
            className="cursor-pointer"
          />
          <HiOutlineCalendar size={24} />
          <p className="min-w-[120px]">{`${monthOptions[month]} ${year}`}</p>
          <HiOutlineChevronRight
            size={24}
            onClick={handleNextMonth}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            style={{ width: 140, height: 36 }}
            value={monthOptions[month]}
            onChange={handleMonthSelect}
            options={monthOptions.map((month) => ({
              label: month,
              value: month,
            }))}
          />
          <Select
            style={{ width: 100, height: 36 }}
            value={year}
            onChange={handleYearSelect}
            options={getYearOptions(
              dayjs().subtract(10, "year").year(),
              dayjs().add(10, "year").year()
            )}
          />
        </div>
      </div>
      <hr className="my-5 border-none border-t-4 border-[#d9d9d9]" />
      <div>
        <Calendar
          className={customCalendarStyles}
          headerRender={() => null}
          value={dayjs(`${year}-${month + 1}-01`)}
          cellRender={dateCellRender}
        />
      </div>
    </div>
  );
};

export default DailyRoutinePage;
