// NLP Processor - Rule-based intent detection, entity extraction, and SQL generation.
// Supports: CREATE / INSERT / SELECT / UPDATE / DELETE and advanced SELECT features
// (relational + logical + arithmetic operators, aggregates, ORDER BY, LIMIT,
// LIKE, BETWEEN, IN, GROUP BY, simple JOINs, and information_schema metadata).

export type Intent =
  | "create"
  | "insert"
  | "select"
  | "update"
  | "delete"
  | "raw"
  | "unknown";

export interface ParsedCommand {
  intent: Intent;
  tableName: string;
  fields: string[];
  values: string[];
  conditions: Record<string, string>;
  rawSQL?: string; // populated when intent === "raw"
  raw: string;
}

const singularize = (w: string) => (w.endsWith("s") ? w : w + "s");

/** Convert words/phrases like "greater than", "more than", "at least" to operators. */
function normalizeOperators(text: string): string {
  return text
    .replace(/\bis\s+not\s+equal\s+to\b/gi, "!=")
    .replace(/\bnot\s+equal\s+to\b/gi, "!=")
    .replace(/\bis\s+equal\s+to\b/gi, "=")
    .replace(/\bequal\s+to\b/gi, "=")
    .replace(/\bequals\b/gi, "=")
    .replace(/\bgreater\s+than\s+or\s+equal\s+to\b/gi, ">=")
    .replace(/\bless\s+than\s+or\s+equal\s+to\b/gi, "<=")
    .replace(/\bat\s+least\b/gi, ">=")
    .replace(/\bat\s+most\b/gi, "<=")
    .replace(/\bgreater\s+than\b/gi, ">")
    .replace(/\bmore\s+than\b/gi, ">")
    .replace(/\bless\s+than\b/gi, "<")
    .replace(/\bfewer\s+than\b/gi, "<");
}

/** Quote a value if it isn't numeric. */
function quoteValue(v: string): string {
  const t = v.trim().replace(/^['"]|['"]$/g, "");
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  return `'${t.replace(/'/g, "''")}'`;
}

/**
 * Parse a "where ..." clause into raw SQL. Supports AND/OR/NOT,
 * relational operators (= != <> > < >= <=), arithmetic (+ - * /),
 * LIKE, BETWEEN, IN.
 */
function parseWhereClause(input: string): string {
  let s = normalizeOperators(input).trim();

  // LIKE: "name starts with A" / "name ends with n" / "name contains ar"
  s = s.replace(
    /(\w+)\s+starts?\s+with\s+(['"]?)([\w%]+)\2/gi,
    (_m, col, _q, val) => `${col} LIKE '${val}%'`
  );
  s = s.replace(
    /(\w+)\s+ends?\s+with\s+(['"]?)([\w%]+)\2/gi,
    (_m, col, _q, val) => `${col} LIKE '%${val}'`
  );
  s = s.replace(
    /(\w+)\s+contains?\s+(['"]?)([\w%]+)\2/gi,
    (_m, col, _q, val) => `${col} LIKE '%${val}%'`
  );

  // BETWEEN: "marks between 50 and 80"
  s = s.replace(
    /(\w+)\s+between\s+(\S+)\s+and\s+(\S+)/gi,
    (_m, col, a, b) => `${col} BETWEEN ${quoteValue(a)} AND ${quoteValue(b)}`
  );

  // IN: "marks in 50 60 70" or "marks in (50,60,70)"
  s = s.replace(/(\w+)\s+in\s+\(([^)]+)\)/gi, (_m, col, list) => {
    const items = list.split(/[,\s]+/).filter(Boolean).map(quoteValue).join(",");
    return `${col} IN (${items})`;
  });
  s = s.replace(/(\w+)\s+in\s+([\d\s,]+?)(?=\s+(?:and|or|order|group|limit)\b|$)/gi, (_m, col, list) => {
    const items = list.split(/[,\s]+/).filter(Boolean).map(quoteValue).join(",");
    return `${col} IN (${items})`;
  });

  // "name Arun" or "name is Arun" -> "name = 'Arun'"
  // Only when no operator already present between col and value.
  s = s.replace(
    /(\w+)\s+is\s+([^\s][^\s]*)/gi,
    (_m, col, val) => `${col} = ${quoteValue(val)}`
  );

  // Bare relational tokens with arithmetic: leave as-is but ensure string values get quoted.
  // Quote unquoted RHS for simple "col OP value" where value isn't numeric/arithmetic.
  s = s.replace(
    /(\w+(?:\s*[\+\-\*\/]\s*\w+)*)\s*(=|!=|<>|>=|<=|>|<)\s*([A-Za-z_]\w*)/g,
    (_m, lhs, op, val) => {
      // Don't quote SQL keywords or column-like identifiers used in arithmetic;
      // if RHS is alphabetic, treat it as a string literal.
      return `${lhs} ${op} '${val}'`;
    }
  );

  // Logical operators
  s = s.replace(/\band\b/gi, "AND").replace(/\bor\b/gi, "OR").replace(/\bnot\b/gi, "NOT");

  return s.trim();
}

/** Extract trailing ORDER BY / LIMIT / GROUP BY from a select tail and return cleaned where + suffixes. */
function extractTail(rest: string): { where: string; tail: string } {
  let where = rest;
  let tail = "";

  // LIMIT: "top 5" / "first 10" / "limit 5"
  const limitMatch = where.match(/\b(?:top|first|limit)\s+(\d+)\b/i);
  if (limitMatch) {
    tail = ` LIMIT ${limitMatch[1]}` + tail;
    where = where.replace(limitMatch[0], "").trim();
  }

  // ORDER BY: "sorted by marks descending" / "ordered by name asc"
  const orderMatch = where.match(
    /\b(?:sorted|ordered)\s+by\s+(\w+)(?:\s+(asc|ascending|desc|descending))?/i
  );
  if (orderMatch) {
    const dir =
      orderMatch[2] && /^desc/i.test(orderMatch[2]) ? " DESC" : "";
    tail = ` ORDER BY ${orderMatch[1]}${dir}` + tail;
    where = where.replace(orderMatch[0], "").trim();
  }

  // GROUP BY: "by department" / "grouped by department"
  const groupMatch = where.match(/\b(?:grouped\s+)?by\s+(\w+)\s*$/i);
  if (groupMatch && /\bavg|sum|count|min|max\b/i.test(rest.split("by")[0])) {
    tail = ` GROUP BY ${groupMatch[1]}` + tail;
    where = where.replace(groupMatch[0], "").trim();
  }

  // Strip leading "where"
  where = where.replace(/^\s*where\s+/i, "").trim();
  return { where, tail };
}

export function parseNaturalLanguage(input: string): ParsedCommand {
  const text = input.trim();
  const lower = text.toLowerCase();
  const result: ParsedCommand = {
    intent: "unknown",
    tableName: "",
    fields: [],
    values: [],
    conditions: {},
    raw: text,
  };

  // ----------------------------- METADATA -----------------------------
  if (/^show\s+(all\s+)?tables\b/i.test(text)) {
    result.intent = "raw";
    result.tableName = "information_schema.tables";
    result.rawSQL =
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
    return result;
  }
  const describeMatch = text.match(/^(?:describe|desc|show\s+columns?\s+(?:in|of|from))\s+(\w+)/i);
  if (describeMatch) {
    const t = describeMatch[1];
    result.intent = "raw";
    result.tableName = t;
    result.rawSQL = `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${t}' ORDER BY ordinal_position`;
    return result;
  }

  // ----------------------------- CREATE TABLE -----------------------------
  const createMatch = text.match(
    /(?:create|make|build)\s+(?:a\s+)?(?:table|collection)?\s*(\w+)\s+(?:with|having|columns?)\s+(.+)/i
  );
  if (createMatch) {
    result.intent = "create";
    result.tableName = createMatch[1];
    result.fields = createMatch[2]
      .split(/\s+and\s+|\s*,\s*/i)
      .map((f) => f.trim().replace(/\s+/g, "_"))
      .filter(Boolean);
    return result;
  }

  // ----------------------------- INSERT -----------------------------
  const insertMatch = text.match(/(?:insert|add|put)\s+(.+?)\s+(?:into|in|to)\s+(\w+)/i);
  if (insertMatch) {
    result.intent = "insert";
    result.tableName = insertMatch[2];
    const pairs = insertMatch[1].split(/\s+and\s+/i);
    for (const pair of pairs) {
      const parts = pair.trim().split(/\s+/);
      if (parts.length >= 2) {
        result.fields.push(parts[0].replace(/\s+/g, "_"));
        result.values.push(parts.slice(1).join(" "));
      }
    }
    return result;
  }

  // ----------------------------- DELETE -----------------------------
  // "delete from students where name is Arun" / "delete from students where name Arun"
  const deleteFrom = text.match(
    /(?:delete|remove)\s+(?:all\s+)?(?:rows?\s+|records?\s+)?from\s+(\w+)(?:\s+where\s+(.+))?/i
  );
  if (deleteFrom) {
    result.intent = "delete";
    result.tableName = deleteFrom[1];
    if (deleteFrom[2]) {
      result.rawSQL = `DELETE FROM ${result.tableName} WHERE ${parseWhereClause(deleteFrom[2])}`;
      result.intent = "raw";
    }
    return result;
  }
  // "delete student Arun" -> table=students, name=Arun
  const deleteShort = text.match(/(?:delete|remove)\s+(\w+)\s+(.+)/i);
  if (deleteShort) {
    result.intent = "delete";
    result.tableName = singularize(deleteShort[1]);
    result.conditions["name"] = deleteShort[2].trim();
    return result;
  }

  // ----------------------------- UPDATE -----------------------------
  // "update <table> set <field> to <value> where ..."
  const updateA = text.match(
    /(?:update|change|modify)\s+(\w+)\s+set\s+(\w+)\s+(?:to|=)\s+(.+?)\s+where\s+(.+)/i
  );
  if (updateA) {
    result.intent = "raw";
    result.tableName = updateA[1];
    result.rawSQL = `UPDATE ${updateA[1]} SET ${updateA[2]} = ${quoteValue(updateA[3])} WHERE ${parseWhereClause(updateA[4])}`;
    return result;
  }
  // "update <field> to <value> where <cond> in <table>"
  const updateB = text.match(
    /(?:update|change|set|modify)\s+(\w+)\s+to\s+(.+?)\s+where\s+(.+?)\s+in\s+(\w+)\s*$/i
  );
  if (updateB) {
    result.intent = "raw";
    result.tableName = updateB[4];
    result.rawSQL = `UPDATE ${updateB[4]} SET ${updateB[1]} = ${quoteValue(updateB[2])} WHERE ${parseWhereClause(updateB[3])}`;
    return result;
  }

  // ----------------------------- AGGREGATES -----------------------------
  // "count students" / "count all students"
  const countMatch = text.match(/^count\s+(?:all\s+)?(\w+)(?:\s+(.+))?$/i);
  if (countMatch) {
    result.intent = "raw";
    result.tableName = countMatch[1];
    let sql = `SELECT COUNT(*) AS count FROM ${countMatch[1]}`;
    if (countMatch[2]) {
      const { where, tail } = extractTail(countMatch[2]);
      if (where) sql += ` WHERE ${parseWhereClause(where)}`;
      sql += tail;
    }
    result.rawSQL = sql;
    return result;
  }
  // "show average marks [in students] [by department]"
  const aggMatch = text.match(
    /(?:show|get|find|display)\s+(average|avg|sum|total|min|minimum|max|maximum)\s+(\w+)(?:\s+(?:in|from|of)\s+(\w+))?(?:\s+(.+))?$/i
  );
  if (aggMatch) {
    const fnMap: Record<string, string> = {
      average: "AVG",
      avg: "AVG",
      sum: "SUM",
      total: "SUM",
      min: "MIN",
      minimum: "MIN",
      max: "MAX",
      maximum: "MAX",
    };
    const fn = fnMap[aggMatch[1].toLowerCase()];
    const col = aggMatch[2];
    const table = aggMatch[3] || singularize(col);
    result.intent = "raw";
    result.tableName = table;
    let select = `${fn}(${col}::numeric) AS ${fn.toLowerCase()}_${col}`;
    let suffix = "";
    let where = aggMatch[4] || "";
    const groupMatch = where.match(/\b(?:grouped\s+)?by\s+(\w+)\s*$/i);
    if (groupMatch) {
      select = `${groupMatch[1]}, ${select}`;
      suffix = ` GROUP BY ${groupMatch[1]}`;
      where = where.replace(groupMatch[0], "").trim();
    }
    let sql = `SELECT ${select} FROM ${table}`;
    where = where.replace(/^\s*where\s+/i, "").trim();
    if (where) sql += ` WHERE ${parseWhereClause(where)}`;
    sql += suffix;
    result.rawSQL = sql;
    return result;
  }

  // ----------------------------- JOIN -----------------------------
  // "show students with their courses"
  const joinMatch = text.match(
    /(?:show|get|list)\s+(\w+)\s+with\s+(?:their\s+)?(\w+)/i
  );
  if (joinMatch) {
    const a = joinMatch[1];
    const b = joinMatch[2];
    const bSingular = b.replace(/s$/, "");
    result.intent = "raw";
    result.tableName = a;
    result.rawSQL = `SELECT a.*, b.* FROM ${a} a JOIN ${b} b ON a.${bSingular}_id = b.id`;
    return result;
  }

  // ----------------------------- SELECT (advanced) -----------------------------
  const selectMatch = text.match(
    /^(?:show|get|find|fetch|retrieve|display|select|list)\s+(?:all\s+)?(?:records?\s+(?:from|in)\s+)?(?:from\s+)?(\w+)(?:\s+(.+))?$/i
  );
  if (selectMatch) {
    const table = selectMatch[1];
    const restRaw = selectMatch[2] || "";
    result.intent = "select";
    result.tableName = table;

    // Simple "select all" with no conditions/operators/sorting
    if (!restRaw.trim()) {
      return result;
    }

    // Anything beyond a plain table needs raw SQL handling.
    const { where, tail } = extractTail(restRaw);
    let sql = `SELECT * FROM ${table}`;
    if (where) sql += ` WHERE ${parseWhereClause(where)}`;
    sql += tail;
    result.intent = "raw";
    result.rawSQL = sql;
    return result;
  }

  return result;
}

export function generateSQLQuery(parsed: ParsedCommand): string {
  if (parsed.rawSQL) return parsed.rawSQL.endsWith(";") ? parsed.rawSQL : parsed.rawSQL + ";";
  switch (parsed.intent) {
    case "create": {
      const cols = parsed.fields.map((f) => `${f} TEXT`).join(", ");
      return `CREATE TABLE ${parsed.tableName} (id SERIAL PRIMARY KEY, ${cols});`;
    }
    case "insert": {
      const vals = parsed.values.map((v) => quoteValue(v)).join(", ");
      return `INSERT INTO ${parsed.tableName} (${parsed.fields.join(", ")}) VALUES (${vals});`;
    }
    case "select": {
      const where = Object.entries(parsed.conditions)
        .map(([k, v]) => `${k} = ${quoteValue(v)}`)
        .join(" AND ");
      return where
        ? `SELECT * FROM ${parsed.tableName} WHERE ${where};`
        : `SELECT * FROM ${parsed.tableName};`;
    }
    case "delete": {
      const whereClause = Object.entries(parsed.conditions)
        .map(([k, v]) => `${k} = ${quoteValue(v)}`)
        .join(" AND ");
      return whereClause
        ? `DELETE FROM ${parsed.tableName} WHERE ${whereClause};`
        : `DELETE FROM ${parsed.tableName};`;
    }
    default:
      return "-- Could not generate query from input";
  }
}

export function getSuggestion(input: string): string | null {
  const text = input.toLowerCase().trim();
  if (text.length < 4) return 'Try: "Show students", "Count students", "Show top 5 students"';
  return null;
}

export { quoteValue };
