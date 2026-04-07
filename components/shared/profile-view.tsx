"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Phone, Trophy, Target, Flame, Calendar, Lock, Loader2, Eye, EyeOff, Camera } from "lucide-react";
import { updateProfile, changePassword } from "@/lib/actions/users";
import { toast } from "sonner";
import { formatDate, getInitials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { SessionUser, UserRole } from "@/types";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().max(20).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "1 uppercase")
    .regex(/[0-9]/, "1 number")
    .regex(/[^A-Za-z0-9]/, "1 special char"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const inputClass = (hasError?: boolean) =>
  `w-full h-11 px-4 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200
  ${hasError ? "border-error ring-1 ring-error/20" : "border-border hover:border-foreground/20"}`;

const inputWithIconClass = (hasError?: boolean) =>
  `w-full h-11 pl-11 pr-4 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200
  ${hasError ? "border-error ring-1 ring-error/20" : "border-border hover:border-foreground/20"}`;

interface Props {
  sessionUser: SessionUser;
  profileData: {
    user: Record<string, unknown>;
    profile: Record<string, unknown> | null;
  } | null;
}

export function ProfileView({ sessionUser, profileData }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(sessionUser.image || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setAvatarUrl(data.url);
        await updateProfile({ name: sessionUser.name || "", avatar_url: data.url });
        toast.success("Avatar updated");
      }
    } catch {
      toast.error("Failed to upload avatar");
    }
    setUploadingAvatar(false);
  }

  const profile = profileData?.profile;
  const user = profileData?.user;

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: (user?.name as string) || "",
      phone: (profile?.phone as string) || "",
    },
  });

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    formState: { errors: pwErrors },
    reset: resetPw,
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  async function onProfileSubmit(data: z.infer<typeof profileSchema>) {
    setIsUpdating(true);
    const result = await updateProfile({ name: data.name, phone: data.phone || null });
    if (result.success) toast.success("Profile updated");
    else toast.error(result.error);
    setIsUpdating(false);
  }

  async function onPasswordSubmit(data: z.infer<typeof passwordSchema>) {
    setIsChangingPw(true);
    const result = await changePassword(data.currentPassword, data.newPassword);
    if (result.success) {
      toast.success("Password changed");
      resetPw();
    } else {
      toast.error(result.error);
    }
    setIsChangingPw(false);
  }

  const stats = [
    { icon: Trophy, label: "Points", value: Number(profile?.total_points || 0).toFixed(2), color: "text-warning", bg: "bg-warning/10" },
    { icon: Target, label: "Tasks Done", value: String(profile?.tasks_completed || 0), color: "text-success", bg: "bg-success/10" },
    { icon: Flame, label: "Streak", value: `${profile?.current_streak || 0} days`, color: "text-accent", bg: "bg-accent/10" },
    { icon: Calendar, label: "Joined", value: user?.created_at ? formatDate(user.created_at as string) : "-", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      {/* Profile overview card */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        {/* Gradient header */}
        <div className="h-24 bg-gradient-to-r from-primary to-accent relative">
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold border-4 border-card shadow-lg relative group overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                getInitials(sessionUser.name || "U")
              )}
              <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="pt-14 pb-6 px-6 text-center">
          <h3 className="text-lg font-bold">{sessionUser.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{sessionUser.email}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {ROLE_LABELS[sessionUser.role as UserRole]}
          </span>
        </div>

        {/* Stats */}
        <div className="px-4 pb-6 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit forms */}
      <div className="lg:col-span-2 space-y-6">
        {/* Profile info */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-lg font-bold">Profile Information</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Update your name and contact details</p>
          </div>
          <div className="px-6 py-5">
            <form
              onSubmit={(e) => { e.preventDefault(); handleProfile(onProfileSubmit)(e); }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input {...regProfile("name")} className={inputWithIconClass(!!profileErrors.name)} />
                </div>
                {profileErrors.name && <p className="text-xs text-error pl-1">{profileErrors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={sessionUser.email}
                    disabled
                    className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground pl-1">Email cannot be changed</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input {...regProfile("phone")} placeholder="Optional" className={inputWithIconClass()} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full sm:w-auto sm:self-end h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold
                  hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5
                  active:translate-y-0 disabled:opacity-60 disabled:hover:shadow-none disabled:hover:translate-y-0
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        {/* Password */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-lg font-bold">Change Password</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Update your password to keep your account secure</p>
          </div>
          <div className="px-6 py-5">
            <form
              onSubmit={(e) => { e.preventDefault(); handlePassword(onPasswordSubmit)(e); }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    {...regPassword("currentPassword")}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    className={inputWithIconClass(!!pwErrors.currentPassword)}
                  />
                </div>
                {pwErrors.currentPassword && <p className="text-xs text-error pl-1">{pwErrors.currentPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    {...regPassword("newPassword")}
                    type={showNewPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min 8 chars, 1 upper, 1 number, 1 special"
                    className={`w-full h-11 pl-11 pr-12 rounded-xl border bg-background text-sm placeholder:text-muted-foreground/60
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200
                      ${pwErrors.newPassword ? "border-error ring-1 ring-error/20" : "border-border hover:border-foreground/20"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwErrors.newPassword && <p className="text-xs text-error pl-1">{pwErrors.newPassword.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    {...regPassword("confirmPassword")}
                    type={showNewPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    className={inputWithIconClass(!!pwErrors.confirmPassword)}
                  />
                </div>
                {pwErrors.confirmPassword && <p className="text-xs text-error pl-1">{pwErrors.confirmPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isChangingPw}
                className="w-full sm:w-auto sm:self-end h-11 px-6 rounded-xl border border-border bg-card font-semibold text-sm
                  hover:bg-muted active:bg-muted/80 disabled:opacity-60
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isChangingPw ? <><Loader2 className="w-4 h-4 animate-spin" /> Changing...</> : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
