import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/utils/auth";

export const useAuth = () => {
  const router = useRouter();
  const [isLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!isAuthenticated()) {
        router.push("/");
      }
    }
  }, [router]);

  return { isAuthenticated: isAuthenticated(), isLoading };
};
