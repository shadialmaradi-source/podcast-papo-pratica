import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfilePage } from "@/components/ProfilePage";
import { trackPageView } from "@/lib/analytics";

export default function ProfilePageWrapper() {
  const navigate = useNavigate();
  useEffect(() => { trackPageView("profile", "shared"); }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app");
    }
  };

  return <ProfilePage onBack={handleBack} />;
}
