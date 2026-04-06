import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { historyApi } from "../../api/history";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Clock, Globe, ArrowRight } from "lucide-react";
import type { HistoryItem } from "../../types";

export function History() {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["history"],
    queryFn: () => historyApi.getAll(),
    retry: 1,
  });

  const clearHistoryMutation = useMutation({
    mutationFn: historyApi.clearAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'text-method-get border-method-get/30 bg-method-get/10';
      case 'post': return 'text-method-post border-method-post/30 bg-method-post/10';
      case 'put': return 'text-method-put border-method-put/30 bg-method-put/10';
      case 'delete': return 'text-method-delete border-method-delete/30 bg-method-delete/10';
      case 'patch': return 'text-method-patch border-method-patch/30 bg-method-patch/10';
      default: return 'text-secondary border-border bg-surface';
    }
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return 'text-secondary';
    if (status >= 200 && status < 300) return 'text-success';
    if (status >= 400 && status < 500) return 'text-warning';
    if (status >= 500) return 'text-danger';
    return 'text-secondary';
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col p-6 bg-base">
        <h2 className="text-xl font-bold mb-4">Request History</h2>
        <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
               <div key={i} className="h-16 bg-surface animate-pulse rounded-lg border border-border" />
            ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-base text-secondary p-8 text-center">
        <Globe className="w-16 h-16 opacity-20 mb-4" />
        <p className="font-medium text-primary mb-2">Failed to load history</p>
        <p className="text-sm text-secondary/70 mb-4 max-w-md">
          {error instanceof Error ? error.message : "Could not connect to the server. Make sure your backend is running."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-base overflow-hidden relative">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface/30 shrink-0">
        <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-primary">Request History</h2>
        </div>
        
        {history.length > 0 && (
          <button 
            onClick={() => clearHistoryMutation.mutate()}
            disabled={clearHistoryMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-danger hover:bg-danger/10 transition-colors border border-transparent hover:border-danger/20 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {clearHistoryMutation.isPending ? "Clearing..." : "Clear All"}
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {history.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-secondary/60">
              <Globe className="w-16 h-16 opacity-20 mb-4" />
              <p className="font-medium text-primary">No request history yet</p>
              <p className="text-sm">Execute some API requests in the playground to see them here.</p>
           </div>
        ) : (
          history.map((req: HistoryItem) => (
             <div key={req.id} className="p-4 rounded-xl border border-border bg-surface/50 hover:bg-elevated transition-colors shadow-sm cursor-pointer group flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 w-full overflow-hidden">
                      <span className={`px-2 py-1 rounded border font-bold text-[10px] uppercase tracking-wider shrink-0 w-16 text-center ${getMethodColor(req.method)}`}>
                         {req.method}
                      </span>
                      <span className="font-mono text-sm text-primary truncate group-hover:text-accent transition-colors">
                         {req.url}
                      </span>
                   </div>
                   <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-secondary hover:text-accent shrink-0">
                      <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-mono">
                   <span className="flex items-center gap-1.5 bg-surface border border-border px-2 py-1 rounded">
                      <span className="text-secondary">Status:</span>
                      <span className={`font-bold ${getStatusColor(req.statusCode)}`}>
                         {req.statusCode || "N/A"}
                      </span>
                   </span>
                   <span className="flex items-center gap-1.5 bg-surface border border-border px-2 py-1 rounded">
                      <span className="text-secondary">Time:</span>
                      <span className="text-primary">{req.latencyMs ? `${req.latencyMs}ms` : "-"}</span>
                   </span>
                   <span className="ml-auto text-[10px] text-secondary/60 font-sans">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                   </span>
                </div>
             </div>
          ))
        )}
      </main>
    </div>
  );
}
