"use server";

import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "training-secret-key-12345";

export async function loginUser(prevState: unknown, formData: FormData) {
  try {
    await connectToDatabase();
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();

    if (!username || !password) {
      return { success: false, error: "Please enter both username and password" };
    }

    const user = await User.findOne({ username });
    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: "Invalid username or password" };
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return { success: true, user: { name: user.name, role: user.role, username: user.username } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Login error:", error);
    return { success: false, error: errorMessage };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  return { success: true };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; name: string };
    
    await connectToDatabase();
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      role: user.role,
      buddy: user.buddy,
      startDate: user.startDate.toISOString(),
    };
  } catch {
    return null;
  }
}
