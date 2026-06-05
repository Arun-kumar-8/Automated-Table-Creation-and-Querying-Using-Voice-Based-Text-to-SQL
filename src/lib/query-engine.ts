import { supabase } from "@/integrations/supabase/client";
import { parseNaturalLanguage, generateSQLQuery, type ParsedCommand } from "./nlp-processor";

export interface QueryResult {
  status: "success" | "error";
  userInput: string;
  generatedQuery: string;
  executionTime: string;
  data: any;
  error?: string;
  parsedCommand: ParsedCommand;
}

export async function executeNLQuery(userInput: string): Promise<QueryResult> {
  const startTime = performance.now();
  const parsed = parseNaturalLanguage(userInput);
  const generatedQuery = generateSQLQuery(parsed);

  if (parsed.intent === "unknown" || !parsed.tableName) {
    return {
      status: "error",
      userInput,
      generatedQuery: "-- Unable to parse command",
      executionTime: "0.000s",
      data: null,
      error: "Could not understand the command. Try: 'Show students', 'Insert name Arun and marks 95 into students'",
      parsedCommand: parsed,
    };
  }

  try {
    let operation = "";
    let body: any = { tableName: parsed.tableName };

    switch (parsed.intent) {
      case "create":
        operation = "create_table";
        body.fields = parsed.fields;
        break;
      case "insert":
        operation = "insert";
        body.fields = parsed.fields;
        body.values = parsed.values;
        break;
      case "select":
        operation = "select";
        if (Object.keys(parsed.conditions).length > 0) {
          body.conditions = parsed.conditions;
        }
        break;
      case "update":
        operation = "update";
        body.values = { [parsed.values[0]]: parsed.values[1] };
        body.conditions = parsed.conditions;
        break;
      case "delete":
        operation = "delete";
        body.conditions = parsed.conditions;
        break;
      case "raw":
        operation = "raw";
        body.sql = parsed.rawSQL;
        break;
    }

    body.operation = operation;

    const { data, error } = await supabase.functions.invoke("execute-query", {
      body,
    });

    const executionTime = ((performance.now() - startTime) / 1000).toFixed(3);

    if (error) {
      return {
        status: "error",
        userInput,
        generatedQuery,
        executionTime: `${executionTime}s`,
        data: null,
        error: error.message || "Query execution failed",
        parsedCommand: parsed,
      };
    }

    return {
      status: data?.status || "success",
      userInput,
      generatedQuery: data?.generated_query || generatedQuery,
      executionTime: data?.execution_time || `${executionTime}s`,
      data: data?.data,
      error: data?.error,
      parsedCommand: parsed,
    };
  } catch (err: any) {
    const executionTime = ((performance.now() - startTime) / 1000).toFixed(3);
    return {
      status: "error",
      userInput,
      generatedQuery,
      executionTime: `${executionTime}s`,
      data: null,
      error: err.message || "An unexpected error occurred",
      parsedCommand: parsed,
    };
  }
}

export async function getQueryHistory() {
  const { data, error } = await supabase
    .from("query_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}
