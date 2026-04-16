// NLP Processor - Rule-based intent detection and entity extraction

export interface ParsedCommand {
  intent: "create" | "insert" | "select" | "update" | "delete" | "unknown";
  tableName: string;
  fields: string[];
  values: string[];
  conditions: Record<string, string>;
  raw: string;
}

export function parseNaturalLanguage(input: string): ParsedCommand {
  const text = input.trim().toLowerCase();
  const result: ParsedCommand = {
    intent: "unknown",
    tableName: "",
    fields: [],
    values: [],
    conditions: {},
    raw: input.trim(),
  };

  // CREATE: "create table students with name and marks"
  const createMatch = text.match(
    /(?:create|make|build)\s+(?:a\s+)?(?:table|collection)?\s*(\w+)\s+(?:with|having|columns?)\s+(.+)/i
  );
  if (createMatch) {
    result.intent = "create";
    result.tableName = createMatch[1];
    result.fields = createMatch[2]
      .split(/\s+and\s+|\s*,\s*/)
      .map((f) => f.trim().replace(/\s+/g, "_"))
      .filter(Boolean);
    return result;
  }

  // INSERT: "insert name Arun and marks 95 into students"
  const insertMatch = text.match(
    /(?:insert|add|put)\s+(.+?)\s+(?:into|in|to)\s+(\w+)/i
  );
  if (insertMatch) {
    result.intent = "insert";
    result.tableName = insertMatch[2];
    const pairs = insertMatch[1].split(/\s+and\s+/);
    for (const pair of pairs) {
      const parts = pair.trim().split(/\s+/);
      if (parts.length >= 2) {
        result.fields.push(parts[0].replace(/\s+/g, "_"));
        result.values.push(parts.slice(1).join(" "));
      }
    }
    return result;
  }

  // UPDATE: "update marks to 100 where name Arun in students"
  // or "update marks to 100 where name Arun"
  const updateMatch = text.match(
    /(?:update|change|set|modify)\s+(\w+)\s+to\s+(.+?)\s+(?:where|when|if)\s+(\w+)\s+(?:is\s+)?(.+?)(?:\s+in\s+(\w+))?$/i
  );
  if (updateMatch) {
    result.intent = "update";
    result.tableName = updateMatch[5] || "";
    result.values.push(updateMatch[1]); // field to update
    result.values.push(updateMatch[2]); // new value
    result.conditions[updateMatch[3]] = updateMatch[4];

    // If no table name found, try to infer from context
    if (!result.tableName) {
      // Try alternate pattern: "update students set marks 100 where name Arun"
      const altMatch = text.match(
        /(?:update|change|modify)\s+(\w+)\s+(?:set\s+)?(\w+)\s+(?:to\s+)?(.+?)\s+(?:where|when|if)\s+(\w+)\s+(?:is\s+)?(.+)/i
      );
      if (altMatch) {
        result.tableName = altMatch[1];
        result.values = [altMatch[2], altMatch[3]];
        result.conditions[altMatch[4]] = altMatch[5];
      }
    }
    return result;
  }

  // Alternate update: "update students set marks to 100 where name is Arun"
  const updateAlt = text.match(
    /(?:update|change|modify)\s+(\w+)\s+(?:set\s+)?(\w+)\s+(?:to\s+)?(.+?)\s+(?:where|when|if)\s+(\w+)\s+(?:is\s+)?(.+)/i
  );
  if (updateAlt) {
    result.intent = "update";
    result.tableName = updateAlt[1];
    result.values = [updateAlt[2], updateAlt[3]];
    result.conditions[updateAlt[4]] = updateAlt[5];
    return result;
  }

  // DELETE: "delete student Arun" or "delete from students where name Arun"
  const deleteMatch = text.match(
    /(?:delete|remove|drop)\s+(?:from\s+)?(?:student|record|entry|row)?\s*(\w+)\s+(?:where\s+)?(\w+)?\s*(?:is\s+)?(.+)?/i
  );
  if (deleteMatch) {
    result.intent = "delete";
    // Handle "delete student Arun" -> table=students, condition=name=Arun
    const possibleTable = deleteMatch[1];
    if (deleteMatch[2] && deleteMatch[3]) {
      result.tableName = possibleTable;
      result.conditions[deleteMatch[2]] = deleteMatch[3].trim();
    } else if (deleteMatch[3]) {
      // "delete student Arun" - guess table is plural, condition is name
      result.tableName = possibleTable.endsWith("s") ? possibleTable : possibleTable + "s";
      result.conditions["name"] = deleteMatch[3].trim();
    } else {
      // "delete Arun from students" pattern - try different parsing
      result.tableName = possibleTable.endsWith("s") ? possibleTable : possibleTable + "s";
    }
    return result;
  }

  // SELECT: "show students", "get all students", "show all from students", "find students where name Arun"
  const selectMatch = text.match(
    /(?:show|get|find|fetch|retrieve|display|select|list)\s+(?:all\s+)?(?:from\s+)?(?:records?\s+(?:from|in)\s+)?(\w+)(?:\s+(?:where|with|having)\s+(\w+)\s+(?:is\s+)?(.+))?/i
  );
  if (selectMatch) {
    result.intent = "select";
    result.tableName = selectMatch[1];
    if (selectMatch[2] && selectMatch[3]) {
      result.conditions[selectMatch[2]] = selectMatch[3].trim();
    }
    return result;
  }

  return result;
}

export function generateSQLQuery(parsed: ParsedCommand): string {
  switch (parsed.intent) {
    case "create": {
      const cols = parsed.fields.map((f) => `${f} TEXT`).join(", ");
      return `CREATE TABLE ${parsed.tableName} (id SERIAL PRIMARY KEY, ${cols});`;
    }
    case "insert": {
      const vals = parsed.values.map((v) => `'${v}'`).join(", ");
      return `INSERT INTO ${parsed.tableName} (${parsed.fields.join(", ")}) VALUES (${vals});`;
    }
    case "select": {
      const where = Object.entries(parsed.conditions)
        .map(([k, v]) => `${k} = '${v}'`)
        .join(" AND ");
      return where
        ? `SELECT * FROM ${parsed.tableName} WHERE ${where};`
        : `SELECT * FROM ${parsed.tableName};`;
    }
    case "update": {
      const setClause = `${parsed.values[0]} = '${parsed.values[1]}'`;
      const whereClause = Object.entries(parsed.conditions)
        .map(([k, v]) => `${k} = '${v}'`)
        .join(" AND ");
      return `UPDATE ${parsed.tableName} SET ${setClause} WHERE ${whereClause};`;
    }
    case "delete": {
      const whereClause = Object.entries(parsed.conditions)
        .map(([k, v]) => `${k} = '${v}'`)
        .join(" AND ");
      return `DELETE FROM ${parsed.tableName} WHERE ${whereClause};`;
    }
    default:
      return "-- Could not generate query from input";
  }
}

export function getSuggestion(input: string): string | null {
  const text = input.toLowerCase().trim();
  if (text.includes("show") || text.includes("get") || text.includes("find")) {
    return null; // Already a valid pattern
  }
  if (text.includes("student")) {
    return 'Did you mean "Show students"?';
  }
  if (text.length < 5) {
    return 'Try something like "Show students" or "Insert name Arun and marks 95 into students"';
  }
  return 'Try commands like: "Create table students with name and marks", "Insert name Arun and marks 95 into students", "Show students"';
}
