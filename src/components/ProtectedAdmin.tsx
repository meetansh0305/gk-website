import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const ADMIN_EMAIL = "meetansh0305@gmail.com"; // ✅ your admin email

export default function ProtectedAdmin({ children }: { children: JSX.Element }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email?.toLowerCase() || "";

      if (email === ADMIN_EMAIL.toLowerCase()) {
        setAllowed(true);
      } else {
        setAllowed(false);
      }
    })();
  }, []);

  if (allowed === null) return null; // waiting for auth response

  // If user is NOT authorized → redirect to profile
  if (!allowed) return <Navigate to="/profile" replace />;

  return children;
}
