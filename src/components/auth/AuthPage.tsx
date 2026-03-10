import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * @deprecated Use src/pages/Auth.tsx instead. This component redirects to the new auth page.
 */
export default function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/auth?role=student", { replace: true });
  }, [navigate]);

  return null;
}
