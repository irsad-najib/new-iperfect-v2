/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/axios";
import { MdNotifications, MdError } from "react-icons/md";
import { HiCheckCircle } from "react-icons/hi";

type JobStatusEvent = {
  job_id: string;
  status: "completed" | "failed";
};

type Notification = {
  _id: string;
  user_id: string;
  action: string;
  description: string;
  timestamp: number;
  status: string;
  job_id: string;
  other_attributes: {
    pabrik_name: string;
    bagian_name: string;
    tanggal: string;
    daily_runner_id: string;
    last_run: number;
    time_taken: number;
  };
  username: string;
  title: string;
};

function NotificationListener() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !user.username) {
      console.error("User is not logged in or no username available");
      return;
    }

    try {
      const response = await api.get(`/notification/${user.username}`, {
        params: {
          limit: 10,
          page: 1,
        },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.username) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const apiurl = process.env.NEXT_PUBLIC_API_URL;
  useEffect(() => {
    const eventSource = new EventSource(`${apiurl}/api/sse`);

    eventSource.onmessage = async (event) => {
      const eventData: JobStatusEvent = JSON.parse(event.data);
      if (eventData.status) {
        await fetchNotifications();
      }
    };

    eventSource.onerror = (error) => {
      console.error("Error with SSE connection:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const notificationBox = document.getElementById("notification-box");
      const notificationContainer = document.getElementById(
        "notification-container",
      );

      if (notificationBox && notificationContainer) {
        if (
          !notificationBox.contains(event.target as Node) &&
          !notificationContainer.contains(event.target as Node)
        ) {
          setShowNotifications(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <>
      <div
        id="notification-box"
        className="absolute right-10 w-11 h-11 flex items-center justify-center rounded-xl bg-neutral-100 cursor-pointer hover:bg-neutral-200"
        onClick={toggleNotifications}>
        <MdNotifications size={40} color="#13162A" />
      </div>

      {showNotifications && (
        <div
          id="notification-container"
          className="absolute top-[84px] right-10 w-[360px] bg-white rounded-xl shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <span className="text-20 font-semibold text-neutral-900">
              Notifications
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    notification.status === "failed" ||
                    notification.status === "completed"
                      ? "cursor-pointer"
                      : ""
                  }`}
                  onClick={() => {
                    if (
                      notification.status === "failed" ||
                      notification.status === "completed"
                    ) {
                    }
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    {notification.status === "completed" ? (
                      <HiCheckCircle
                        size={28}
                        color="#1268B3"
                        className="shrink-0"
                      />
                    ) : (
                      <MdError
                        size={28}
                        color={
                          notification.status === "failed"
                            ? "#FF2624"
                            : "#F47920"
                        }
                        className="shrink-0"
                      />
                    )}
                    <div className="text-16 font-semibold text-neutral-900">
                      {notification.status === "completed"
                        ? "Successfully executed"
                        : notification.status === "failed"
                          ? "Error occurred"
                          : "Process is in progress"}
                    </div>
                  </div>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: notification.title,
                    }}></div>
                  <div className="text-14 text-neutral-900 font-semibold mt-2">
                    <span suppressHydrationWarning>
                      {new Date(notification.timestamp * 1000).toLocaleString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        },
                      )}
                    </span>{" "}
                    by {notification.username}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-neutral-500">
                No notifications yet
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationListener;
