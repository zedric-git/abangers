import { CalendarCheck } from "lucide-react";

export default function ViewingRequestsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-xs sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#6C5CE7] dark:bg-purple-950/50 dark:text-purple-300">
        <CalendarCheck className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl dark:text-white">
        Viewing Requests
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        This feature is planned for an upcoming sprint. You will soon be able to
        manage and confirm scheduled viewing appointments here.
      </p>
    </div>
  );
}
