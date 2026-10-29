import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Password dimenticata" };

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
