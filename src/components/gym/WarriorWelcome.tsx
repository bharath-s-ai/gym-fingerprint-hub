import { motion, AnimatePresence } from "framer-motion";
import { User, Hash, Calendar, Flame, Trophy } from "lucide-react";

interface WarriorWelcomeProps {
  visible: boolean;
  name: string;
  memberId?: number | null;
  daysRemaining: number;
  streak: number;
  totalVisits: number;
}

function getWarriorLevel(visits: number) {
  if (visits >= 200) return { label: "LEGEND", color: "text-primary" };
  if (visits >= 100) return { label: "CHAMPION", color: "text-primary" };
  if (visits >= 50) return { label: "ELITE", color: "text-success" };
  if (visits >= 25) return { label: "WARRIOR", color: "text-warning" };
  if (visits >= 10) return { label: "FIGHTER", color: "text-muted-foreground" };
  return { label: "ROOKIE", color: "text-muted-foreground" };
}

export function WarriorWelcome({ visible, name, memberId, daysRemaining, streak, totalVisits }: WarriorWelcomeProps) {
  const level = getWarriorLevel(totalVisits);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
        >
          {/* Background with pulse */}
          <motion.div
            className="absolute inset-0 bg-background"
            animate={{
              background: [
                "radial-gradient(circle at 50% 50%, hsl(25 95% 53% / 0.15) 0%, hsl(0 0% 4% / 1) 70%)",
                "radial-gradient(circle at 50% 50%, hsl(25 95% 53% / 0.25) 0%, hsl(0 0% 4% / 1) 70%)",
                "radial-gradient(circle at 50% 50%, hsl(25 95% 53% / 0.15) 0%, hsl(0 0% 4% / 1) 70%)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center text-center px-6"
          >
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="w-28 h-28 rounded-lg bg-primary/15 border-2 border-primary/40 flex items-center justify-center mb-6"
            >
              <User className="w-14 h-14 text-primary" />
            </motion.div>

            {/* Level badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-2 mb-3"
            >
              <Trophy className={`w-5 h-5 ${level.color}`} />
              <span className={`text-sm font-black uppercase tracking-[0.2em] ${level.color}`}>
                {level.label}
              </span>
            </motion.div>

            {/* Welcome text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-semibold mb-2"
            >
              Welcome Back
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl font-black text-foreground uppercase tracking-tighter mb-2"
            >
              {name}
            </motion.h1>

            {memberId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center gap-1.5 text-primary/80 mb-8"
              >
                <Hash className="w-4 h-4" />
                <span className="font-black text-lg">{memberId}</span>
              </motion.div>
            )}

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex gap-8"
            >
              {/* Days remaining */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <span className="text-3xl font-black text-foreground">{Math.max(0, daysRemaining)}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Days Left
                </span>
              </div>

              {/* Streak */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <span className="text-3xl font-black text-foreground">{streak}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Day Streak
                </span>
              </div>

              {/* Total visits */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <span className="text-3xl font-black text-foreground">{totalVisits}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Total Visits
                </span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
