import { GraduationCap, Users } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AppRole = "teacher" | "student";

interface RoleSelectorProps {
  selectedRole: AppRole;
  onRoleChange: (role: AppRole) => void;
}

export default function RoleSelector({ selectedRole, onRoleChange }: RoleSelectorProps) {
  const roles: { value: AppRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      value: "student",
      label: "Studente",
      icon: <GraduationCap className="h-6 w-6" />,
      desc: "Impara con lezioni interattive",
    },
    {
      value: "teacher",
      label: "Insegnante",
      icon: <Users className="h-6 w-6" />,
      desc: "Crea lezioni per i tuoi studenti",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {roles.map((r) => (
        <motion.button
          key={r.value}
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onRoleChange(r.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors text-center",
            selectedRole === r.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/50"
          )}
        >
          {r.icon}
          <span className="text-sm font-semibold">{r.label}</span>
          <span className="text-xs">{r.desc}</span>
        </motion.button>
      ))}
    </div>
  );
}
