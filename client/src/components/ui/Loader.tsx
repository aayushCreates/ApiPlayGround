import { Loader2 } from "lucide-react";

export const Loader = ({ text = "Loading...", className = "" }: { text?: string, className?: string }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-muted ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
};

export const FullPageLoader = ({ text }: { text?: string }) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-base text-primary">
      <Loader text={text} />
    </div>
  );
};
