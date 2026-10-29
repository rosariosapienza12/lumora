import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnedPresentation } from "@/lib/presentations";
import { documentSchema, starterDocument } from "@/lib/editor/schema";
import { env } from "@/lib/env";
import { Editor } from "./editor";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({ params }: PageProps<"/editor/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[a-z0-9]{20,32}$/.test(id)) notFound();

  const p = await getOwnedPresentation(user.id, id);
  if (!p) notFound();

  const parsed = documentSchema.safeParse(p.content);
  const doc = parsed.success ? parsed.data : starterDocument(p.title);

  return (
    <Editor
      id={p.id}
      initialTitle={p.title}
      initialDoc={doc}
      initialSlug={p.visibility === "LINK" ? p.shareSlug : null}
      initialHasPassword={Boolean(p.sharePasswordHash)}
      emailVerified={Boolean(user.emailVerifiedAt)}
      appUrl={env.APP_URL}
    />
  );
}
