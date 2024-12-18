import fs, { readFile } from "node:fs";
import axios from "axios";

// Extraer una función que contenga .split("") y .join("")
function extractFunctionFromStringByMethods(str) {
  const funcRegex =
    /function\s*\([a-zA-Z0-9,_\s]*\)\s*{[^}]*\.split\(""\)[^}]*return\s+[a-zA-Z0-9,_\s]*\.join\(""\)[^}]*}/g;
  const match = str.match(funcRegex);
  return match ? match[0] : null;
}

// Extraer el nombre del objeto y su definición completa
function extractObjectDefinition(str, objectName) {
  const objectRegex = new RegExp(
    `${objectName}\\s*=\\s*({[\\s\\S]*?}});?`,
    "g"
  );
  const match = str.match(objectRegex);
  if (match) {
    // Retorna únicamente el valor del objeto (sin "ZL=")
    return match[0]
      .replace(new RegExp(`^${objectName}\\s*=\\s*`), "")
      .replace(/;$/, "");
  }
  return null;
}

// Extraer los objetos referenciados por la función
function extractReferencedObjects(funcStr) {
  const objectRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\./g;
  const matches = funcStr.match(objectRegex);
  return matches ? [...new Set(matches.map((m) => m.slice(0, -1)))] : [];
}

const filePath = "test.txt"; // Cambia a la ruta de tu archivo

const read = () =>
  readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo:", err);
      return;
    }

    // Unificar líneas eliminando saltos de línea y otros espacios extra
    let unifiedData = data.replace(/\s+/g, " ").trim();

    let extractedFunction;

    // Extraer la función
    const result = extractFunctionFromStringByMethods(unifiedData);

    if (result) {
      console.log("Función encontrada:", result);

      // Buscar los objetos referenciados
      const referencedObjects = extractReferencedObjects(result);

      // Crear un bloque de código para evaluar los objetos y la función juntos
      let evaluationBlock = "";

      // Cargar las definiciones de los objetos referenciados
      referencedObjects.forEach((objectName) => {
        const objectDefinition = extractObjectDefinition(
          unifiedData,
          objectName
        );
        if (objectDefinition) {
          console.log(
            `Definición encontrada para ${objectName}:`,
            objectDefinition
          );
          evaluationBlock += `var ${objectName} = ${objectDefinition};\n`;
        } else {
          console.error(
            `No se encontró definición para el objeto ${objectName}`
          );
        }
      });

      // Añadir la función al bloque de evaluación
      evaluationBlock += `extractedFunction = ${result};`;

      // Evaluar el bloque completo
      try {
        eval(evaluationBlock);
      } catch (evalError) {
        console.error("Error al evaluar la función y los objetos:", evalError);
        return;
      }

      // Probar la función extraída si existe
      if (typeof extractedFunction === "function") {
        const input = "exampleString";
        try {
          console.log(
            "Resultado de la función extraída:",
            extractedFunction(input)
          );
        } catch (execError) {
          console.error("Error al ejecutar la función:", execError);
        }
      }
    } else {
      console.log("No se encontró ninguna función válida.");
    }
  });

read();
