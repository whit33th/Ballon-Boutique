"use client";

import { motion } from "motion/react";
import { Activity } from "react";

type ProfileTabPanelProps = {
  isActive: boolean;
  panelId: string;
  labelledById: string;
  className: string;
  children: React.ReactNode;
};

export function ProfileTabPanel({
  isActive,
  panelId,
  labelledById,
  className,
  children,
}: ProfileTabPanelProps) {
  return (
    <Activity mode={isActive ? "visible" : "hidden"}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={className}
        role="tabpanel"
        id={panelId}
        aria-labelledby={labelledById}
        tabIndex={0}
      >
        {children}
      </motion.div>
    </Activity>
  );
}
