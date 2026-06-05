import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { operation, tableName, fields, values, conditions, sql } = await req.json();

    if (!operation) {
      return new Response(
        JSON.stringify({ error: "Missing operation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (operation !== "raw" && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName || "")) {
      return new Response(
        JSON.stringify({ error: "Invalid table name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const startTime = performance.now();
    let result: any = null;
    let generatedQuery = "";

    switch (operation) {
      case "create_table": {
        if (!fields || !Array.isArray(fields) || fields.length === 0) {
          return new Response(
            JSON.stringify({ error: "Fields required for create_table" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const columnDefs = fields.map((f: string) => `${f} TEXT`).join(", ");
        generatedQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY, ${columnDefs});`;

        const { error } = await supabase.rpc("execute_dynamic_sql", {
          sql_query: `CREATE TABLE IF NOT EXISTS public.${tableName} (id SERIAL PRIMARY KEY, ${columnDefs})`,
        });
        if (error) throw new Error(error.message);

        // Enable RLS and add public policies
        await supabase.rpc("execute_dynamic_sql", {
          sql_query: `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`,
        });
        for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          const using = op === "INSERT" ? `WITH CHECK (true)` : `USING (true)`;
          const forClause = op === "INSERT" ? `FOR INSERT ${using}` : `FOR ${op} ${using}`;
          await supabase.rpc("execute_dynamic_sql", {
            sql_query: `DO $$ BEGIN CREATE POLICY "Public ${op.toLowerCase()} ${tableName}" ON public.${tableName} ${forClause}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
          });
        }

        result = { message: `Table '${tableName}' created successfully with columns: ${fields.join(", ")}` };
        break;
      }

      case "insert": {
        if (!fields || !values) {
          return new Response(
            JSON.stringify({ error: "Fields and values required for insert" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const insertObj: Record<string, string> = {};
        for (let i = 0; i < fields.length; i++) {
          insertObj[fields[i]] = values[i];
        }
        const valuesStr = values.map((v: string) => `'${v}'`).join(", ");
        generatedQuery = `INSERT INTO ${tableName} (${fields.join(", ")}) VALUES (${valuesStr});`;

        // Ensure table & columns exist
        const colDefs = fields.map((f: string) => `${f} TEXT`).join(", ");
        await supabase.rpc("execute_dynamic_sql", {
          sql_query: `CREATE TABLE IF NOT EXISTS public.${tableName} (id SERIAL PRIMARY KEY, ${colDefs})`,
        });
        for (const field of fields) {
          await supabase.rpc("execute_dynamic_sql", {
            sql_query: `DO $$ BEGIN ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${field} TEXT; EXCEPTION WHEN others THEN NULL; END $$`,
          });
        }
        // Ensure RLS policies
        await supabase.rpc("execute_dynamic_sql", {
          sql_query: `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`,
        });
        for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
          const using = op === "INSERT" ? `WITH CHECK (true)` : `USING (true)`;
          const forClause = op === "INSERT" ? `FOR INSERT ${using}` : `FOR ${op} ${using}`;
          await supabase.rpc("execute_dynamic_sql", {
            sql_query: `DO $$ BEGIN CREATE POLICY "Public ${op.toLowerCase()} ${tableName}" ON public.${tableName} ${forClause}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
          });
        }

        const { error } = await supabase.from(tableName).insert(insertObj);
        if (error) throw new Error(error.message);
        result = { message: `Data inserted into '${tableName}' successfully`, inserted: insertObj };
        break;
      }

      case "select": {
        generatedQuery = conditions
          ? `SELECT * FROM ${tableName} WHERE ${Object.entries(conditions).map(([k, v]) => `${k} = '${v}'`).join(" AND ")};`
          : `SELECT * FROM ${tableName};`;

        let query = supabase.from(tableName).select("*");
        if (conditions) {
          for (const [key, value] of Object.entries(conditions)) {
            query = query.eq(key, value as string);
          }
        }
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        result = data;
        break;
      }

      case "update": {
        if (!values || !conditions) {
          return new Response(
            JSON.stringify({ error: "Values and conditions required for update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const setClauses = Object.entries(values).map(([k, v]) => `${k} = '${v}'`).join(", ");
        const whereClauses = Object.entries(conditions).map(([k, v]) => `${k} = '${v}'`).join(" AND ");
        generatedQuery = `UPDATE ${tableName} SET ${setClauses} WHERE ${whereClauses};`;

        let updateQuery = supabase.from(tableName).update(values as Record<string, string>);
        for (const [key, value] of Object.entries(conditions)) {
          updateQuery = updateQuery.eq(key, value as string);
        }
        const { error } = await updateQuery;
        if (error) throw new Error(error.message);
        result = { message: `Data updated in '${tableName}' successfully` };
        break;
      }

      case "delete": {
        if (!conditions) {
          return new Response(
            JSON.stringify({ error: "Conditions required for delete" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const delWhere = Object.entries(conditions).map(([k, v]) => `${k} = '${v}'`).join(" AND ");
        generatedQuery = `DELETE FROM ${tableName} WHERE ${delWhere};`;

        let deleteQuery = supabase.from(tableName).delete();
        for (const [key, value] of Object.entries(conditions)) {
          deleteQuery = deleteQuery.eq(key, value as string);
        }
        const { error } = await deleteQuery;
        if (error) throw new Error(error.message);
        result = { message: `Data deleted from '${tableName}' successfully` };
        break;
      }

      case "raw": {
        if (!sql || typeof sql !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing sql for raw operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        generatedQuery = sql.endsWith(";") ? sql : sql + ";";
        const trimmed = sql.trim().replace(/;+\s*$/, "");
        const head = trimmed.split(/\s+/, 1)[0].toLowerCase();
        const isSelect = head === "select" || head === "with";
        if (isSelect) {
          const { data, error } = await supabase.rpc("execute_select_sql", { sql_query: trimmed });
          if (error) throw new Error(error.message);
          result = data ?? [];
        } else if (["update", "delete", "insert", "create", "alter", "drop"].includes(head)) {
          const { error } = await supabase.rpc("execute_dynamic_sql", { sql_query: trimmed });
          if (error) throw new Error(error.message);
          result = { message: `${head.toUpperCase()} executed successfully` };
        } else {
          throw new Error(`Unsupported SQL statement: ${head}`);
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const executionTime = ((performance.now() - startTime) / 1000).toFixed(3);

    // Log to query history
    await supabase.from("query_history").insert({
      user_input: `${operation} on ${tableName}`,
      generated_query: generatedQuery,
      execution_time_ms: parseFloat(executionTime) * 1000,
      result_data: result,
      status: "success",
    });

    return new Response(
      JSON.stringify({
        status: "success",
        generated_query: generatedQuery,
        execution_time: `${executionTime}s`,
        data: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", msg);
    return new Response(
      JSON.stringify({ status: "error", error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
