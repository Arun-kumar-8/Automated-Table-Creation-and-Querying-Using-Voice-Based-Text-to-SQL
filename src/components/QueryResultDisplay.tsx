import { Code, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QueryResult } from "@/lib/query-engine";

interface QueryResultDisplayProps {
  result: QueryResult;
}

export function QueryResultDisplay({ result }: QueryResultDisplayProps) {
  const isError = result.status === "error";
  const isArray = Array.isArray(result.data);

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isError ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle className="h-5 w-5 text-primary" />
          )}
          <span className={`text-sm font-medium ${isError ? "text-destructive" : "text-primary"}`}>
            {isError ? "Error" : "Success"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-mono">Executed in {result.executionTime}</span>
        </div>
      </div>

      {/* User Input */}
      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Input</p>
        <p className="text-sm text-foreground">{result.userInput}</p>
      </div>

      {/* Generated SQL */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Code className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Generated SQL Query
          </p>
        </div>
        <div className="query-display">
          <code>{result.generatedQuery}</code>
        </div>
      </div>

      {/* Error Message */}
      {isError && result.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{result.error}</p>
        </div>
      )}

      {/* Result Data as Table */}
      {!isError && isArray && result.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Results ({result.data.length} row{result.data.length !== 1 ? "s" : ""})
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                const keys = Object.keys(result.data[0]).filter((k) => k !== "id");
                const csv = [
                  keys.join(","),
                  ...result.data.map((row: Record<string, any>) =>
                    keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${result.parsedCommand.tableName || "results"}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {Object.keys(result.data[0])
                    .filter((k) => k !== "id")
                    .map((key) => (
                      <th
                        key={key}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row: Record<string, any>, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {Object.entries(row)
                      .filter(([k]) => k !== "id")
                      .map(([key, val]) => (
                        <td key={key} className="px-4 py-2.5 text-foreground font-mono text-xs">
                          {String(val ?? "")}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success message for non-select operations */}
      {!isError && !isArray && result.data?.message && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm text-primary">{result.data.message}</p>
        </div>
      )}

      {/* Empty result */}
      {!isError && isArray && result.data.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">No records found</p>
        </div>
      )}
    </div>
  );
}
