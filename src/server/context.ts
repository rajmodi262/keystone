import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "@/lib/db";

export async function createContext() {
  const session = await getServerSession(authOptions);
  return { db, session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
