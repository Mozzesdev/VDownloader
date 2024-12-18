import { readFile } from "node:fs/promises";

const extractNSigSourceCode = (data: string): void => {
  const source = data.replace(/\s+/g, " ").trim();
  const searchPatterns: string[] = ["enhanced_except", "-_w8_", "1969"];

  let startIndex: number = -1;
  for (const pattern of searchPatterns) {
    startIndex = source.indexOf(pattern);
    if (startIndex !== -1) break;
  }

  if (startIndex === -1) {
    console.log("No se encontró ninguna referencia relevante.");
    return;
  }

  let funcStart: number = source.lastIndexOf("=function", startIndex);
  if (funcStart === -1) {
    console.log("No se encontró el inicio de la función.");
    return;
  }

  funcStart++;

  let endIndex: number = -1;
  const stack: string[] = [];
  let inString: boolean = false;
  let stringChar: string = "";

  for (let i: number = funcStart; i < source.length; i++) {
    const char: string = source[i];

    if (inString) {
      if (char === "\\") {
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === "{") {
      stack.push("{");
    } else if (char === "}") {
      stack.pop();

      if (stack.length === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex !== -1) {
    const functionCode: string = source.slice(funcStart, endIndex + 1).trim();
    // console.log("Función encontrada:\n", functionCode);

    evaluateFunction(functionCode, source);
  } else {
    console.log("No se encontró el final de la función.");
  }
};

const getVariableValue = (
  data: string,
  variableName: string
): string | null => {
  const regex = new RegExp(`var\\s+${variableName}\\s*=\\s*([^;]+);`);
  const match = data.match(regex);

  if (match && match[1]) {
    return match[1].trim(); // Devuelve la asignación de la variable
  }

  return null;
};

const evaluateFunction = (functionCode: string, data: string): void => {
  // Añadir la función al bloque de evaluación

  const variableName = findVariableUsedInTypeofUndefined(functionCode);
  let variableValue: any;

  if (variableName) {
    console.log(`Variable encontrada: ${variableName}`);

    // Obtener el valor de la variable
    variableValue = getVariableValue(data, variableName);

    if (variableValue) {
      console.log(`Valor de la variable ${variableName}: ${variableValue}`);
    } else {
      console.log(`No se encontró el valor de la variable ${variableName}`);
    }
  } else {
    console.log(
      "No se encontró ninguna variable con 'typeof ... === \"undefined\"'"
    );
  }

  // Agregar la declaración de la variable al contexto de evaluación
  const declarationBlock = `var ${variableName} = ${variableValue};\n`;

  let extractedFunction: any;

  const evaluationBlock = `${declarationBlock}extractedFunction = ${functionCode}`;

  // Evaluar el bloque completo
  try {
    eval(evaluationBlock);
  } catch (evalError) {
    console.error("Error al evaluar la función:", evalError);
    return;
  }

  // Probar la función extraída si existe
  if (typeof extractedFunction === "function") {
    const input = "cIoXIYywXfv83puVi";
    try {
      console.log(
        "Resultado de la función extraída:",
        extractedFunction(input)
      );
    } catch (execError) {
      console.error("Error al ejecutar la función:", execError);
    }
  }
};

const findVariableUsedInTypeofUndefined = (data: string): string | null => {
  const regex = /typeof\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*===\s*"undefined"/g;
  const matches = [...data.matchAll(regex)];

  if (matches.length > 0) {
    return matches[0][1]; // Devuelve el nombre de la variable encontrada
  }

  return null;
};

const processFile = async (filePath: string): Promise<void> => {
  try {
    const data: string = await readFile(filePath, "utf8");
    extractNSigSourceCode(data);
  } catch (err: any) {
    // Tipo 'any' para el error, o un tipo más específico si lo conoces
    console.error("Error leyendo el archivo:", err);
  }
};

// Ejemplo de uso (recuerda que esto debe estar en un contexto que soporte async/await, como un módulo ES o dentro de una función async):
async function main() {
  await processFile("test.txt");
}

main().catch(console.error);
