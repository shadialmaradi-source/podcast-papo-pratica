import { useNavigate } from "react-router-dom";
import { ProfilePage } from "@/components/ProfilePage";

export default function ProfilePageWrapper() {
  const navigate = useNavigate();
  return <ProfilePage onBack={() => navigate("/app")} />;
}
