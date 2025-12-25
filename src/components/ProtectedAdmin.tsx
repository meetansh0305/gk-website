import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ProtectedAdmin({ children }: { children: JSX.Element }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setAllowed(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", authData.user.id)
        .single();

      setAllowed(profile?.is_admin === true);
    })();
  }, []);

  if (allowed === null) return null; // waiting for auth response

  // If user is NOT authorized → redirect to profile
  if (!allowed) return <Navigate to="/profile" replace />;

  return children;
}
