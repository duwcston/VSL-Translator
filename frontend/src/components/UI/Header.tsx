import { Hand } from "lucide-react";

export const Header = () => {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
        <Hand className="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          ASL Translator
        </h1>
        <p className="text-sm font-medium text-slate-500">
          American Sign Language Detection
        </p>
      </div>
    </header>
  );
};
