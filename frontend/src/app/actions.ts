"use server";

import { findUserByEmail, verifyUserPassword, createUser, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function loginAction(prevState: any, formData: FormData): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Missing identity credentials" };
  }

  try {
    console.log(`[Auth Action] Attempting authentication for email: ${email}`);
    
    // Find the user by primary email in Logto
    const user = await findUserByEmail(email);
    if (!user) {
      console.log(`[Auth Action] User not found for email: ${email}`);
      return { success: false, error: "Operator credentials invalid" };
    }

    // Verify the password with Logto Management API
    const isValid = await verifyUserPassword(user.id, password);
    if (!isValid) {
      console.log(`[Auth Action] Incorrect password for user ID: ${user.id}`);
      return { success: false, error: "Access key decryption failed" };
    }

    console.log(`[Auth Action] Authentication successful for user ID: ${user.id}`);
    
    // Save to custom session cookie
    await setSessionCookie({
      sub: user.id,
      email: user.primaryEmail || email,
      name: user.username || user.name || undefined,
    });

    return { success: true };
  } catch (error: any) {
    console.error("[Auth Action] Critical security error:", error);
    return { success: false, error: error.message || "Internal mainframe error" };
  }
}

export async function registerAction(prevState: any, formData: FormData): Promise<LoginResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !password || !confirmPassword) {
    return { success: false, error: "Missing registration fields" };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Decryption keys do not match" };
  }

  try {
    console.log(`[Auth Action] Registering operator email: ${email}`);
    
    // Call user creation
    const newUser = await createUser(email, password);
    console.log(`[Auth Action] Registration successful for user ID: ${newUser.id}`);

    // Auto-login the user after registration
    await setSessionCookie({
      sub: newUser.id,
      email: newUser.primaryEmail || email,
      name: newUser.username || newUser.name || undefined,
    });

    return { success: true };
  } catch (error: any) {
    console.error("[Auth Action] Registration error:", error);
    return { success: false, error: error.message || "Failed to compile operator profile" };
  }
}

export async function logoutAction() {
  console.log("[Auth Action] Purging operator session");
  await clearSessionCookie();
  redirect("/");
}
