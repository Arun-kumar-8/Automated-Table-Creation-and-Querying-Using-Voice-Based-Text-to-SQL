import { useState, useEffect } from "react";
import { History, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { getQueryHistory } from "@/lib/query-engine";

interface HistoryEntry {
  id: string;
  user_input: string;
  generated_query: string;
  execution_time_ms: number;
  status: string;
  created_at: string;
}

interface QueryHistoryPanelProps {
  refreshTrigger: number;
}

export function QueryHistoryPanel({ refreshTrigger }: QueryHistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, refreshTrigger]);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await getQueryHistory();
      setHistory((data as HistoryEntry[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Query History</span>
          {history.length > 0 && (
            <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : history.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No queries yet. Try running a command!
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {history.map((entry) => (
                <div key={entry.id} className="p-3 hover:bg-muted/20 transition-colors animate-slide-in">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-foreground font-medium truncate max-w-[70%]">
                      {entry.user_input}
                    </p>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-mono">
                        {(entry.execution_time_ms / 1000).toFixed(3)}s
                      </span>
                    </div>
                  </div>
                  <code className="text-[11px] font-mono text-primary/70 block truncate">
                    {entry.generated_query}
                  </code>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
