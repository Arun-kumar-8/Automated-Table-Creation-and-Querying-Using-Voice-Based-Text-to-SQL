import { useState, useEffect, useCallback } from "react";
import { Database, Terminal, Zap, BookOpen } from "lucide-react";
import { CommandInput } from "@/components/CommandInput";
import { QueryResultDisplay } from "@/components/QueryResultDisplay";
import { QueryHistoryPanel } from "@/components/QueryHistoryPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { executeNLQuery, type QueryResult } from "@/lib/query-engine";
import { parseNaturalLanguage, generateSQLQuery, getSuggestion } from "@/lib/nlp-processor";

const EXAMPLE_COMMANDS = [
  "Create table students with name and marks",
  "Insert name Arun and marks 95 into students",
  "Show students",
  "Update students set marks to 100 where name is Arun",
  "Delete from students where name Arun",
];

export default function Index() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState("");
  const [pendingSQL, setPendingSQL] = useState("");

  const { isListening, transcript, startListening, stopListening, isSupported } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (input.length > 3) {
      setSuggestion(getSuggestion(input));
    } else {
      setSuggestion(null);
    }
  }, [input]);

  const executeCommand = useCallback(async (command: string) => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const result = await executeNLQuery(command);
      setResults((prev) => [result, ...prev]);
      setHistoryRefresh((n) => n + 1);
      setInput("");
    } catch {
      // handled
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;

    const parsed = parseNaturalLanguage(input.trim());
    const isDestructive = parsed.intent === "delete" || parsed.intent === "update";

    if (isDestructive) {
      setPendingCommand(input.trim());
      setPendingSQL(generateSQLQuery(parsed));
      setConfirmOpen(true);
    } else {
      executeCommand(input.trim());
    }
  }, [input, isLoading, executeCommand]);

  const handleConfirm = () => {
    setConfirmOpen(false);
    executeCommand(pendingCommand);
  };

  const handleVoiceToggle = () => {
    isListening ? stopListening() : startListening();
  };

  return (
    <div className="min-h-screen bg-background">
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        command={pendingCommand}
        generatedSQL={pendingSQL}
      />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center terminal-glow">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                Voice-to-SQL Engine
              </h1>
              <p className="text-xs text-muted-foreground">
                Natural Language Database Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full font-medium">
              <Zap className="h-3 w-3" />
              Connected
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 terminal-glow">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Command Terminal</span>
            {isListening && (
              <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
                🎤 Listening...
              </span>
            )}
          </div>
          <CommandInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isListening={isListening}
            isVoiceSupported={isSupported}
            onVoiceToggle={handleVoiceToggle}
          />
          {suggestion && (
            <p className="mt-2 text-xs text-accent italic">{suggestion}</p>
          )}
        </section>

        <section className="flex items-center gap-2 flex-wrap">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLE_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => setInput(cmd)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              {cmd}
            </button>
          ))}
        </section>

        {results.length > 0 && (
          <section className="space-y-4">
            {results.map((result, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <QueryResultDisplay result={result} />
              </div>
            ))}
          </section>
        )}

        <QueryHistoryPanel refreshTrigger={historyRefresh} />

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">System Architecture</h2>
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-mono">
            {[
              { label: "Voice/Text Input", color: "text-accent" },
              { label: "→" },
              { label: "NLP Processing", color: "text-primary" },
              { label: "→" },
              { label: "SQL Generation", color: "text-foreground" },
              { label: "→" },
              { label: "Database Execution", color: "text-primary" },
              { label: "→" },
              { label: "Result Display", color: "text-accent" },
            ].map((item, i) =>
              item.color ? (
                <span
                  key={i}
                  className={`${item.color} bg-muted px-3 py-1.5 rounded-md border border-border`}
                >
                  {item.label}
                </span>
              ) : (
                <span key={i} className="text-muted-foreground">
                  {item.label}
                </span>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
