/**
 * Small icon resolver: maps the string `icon` field on admin mock
 * objects (which is JSON-safe) to the corresponding Lucide component.
 * Keeps the mock data free of JSX so it stays serialisable.
 */

import {
  CheckCircle2,
  Folder,
  Hammer,
  HardHat,
  type LucideIcon,
  Pause,
  Pencil,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

export type AdminIconName =
  | "users"
  | "hard-hat"
  | "folder"
  | "trending-up"
  | "hammer"
  | "user-plus"
  | "check-circle-2"
  | "pencil"
  | "trash-2"
  | "pause";

export function resolveAdminIcon(name: AdminIconName): LucideIcon {
  switch (name) {
    case "users":
      return Users;
    case "hard-hat":
      return HardHat;
    case "folder":
      return Folder;
    case "trending-up":
      return TrendingUp;
    case "hammer":
      return Hammer;
    case "user-plus":
      return UserPlus;
    case "check-circle-2":
      return CheckCircle2;
    case "pencil":
      return Pencil;
    case "trash-2":
      return Trash2;
    case "pause":
      return Pause;
  }
}