"use client";

import { deleteRoboticsRecord } from "@/app/actions";
import { SmallButton } from "@/components/app/forms";
import { Trash2 } from "lucide-react";

export function DeleteGroupForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  return (
    <form
      action={deleteRoboticsRecord}
      onSubmit={(event) => {
        if (!window.confirm(`Удалить группу «${groupName}»? Ученики останутся в базе без группы.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-2 rounded-2xl border border-red-300/15 bg-red-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <input type="hidden" name="module" value="groups" />
      <input type="hidden" name="id" value={groupId} />
      <p className="text-xs leading-5 text-slate-400">Ученики останутся в базе и будут сняты с этой группы.</p>
      <SmallButton danger><Trash2 className="h-3.5 w-3.5" /> Удалить группу</SmallButton>
    </form>
  );
}
