/**
 * Generates frontend TypeScript types from the backend OpenAPI spec.
 *
 * Workflow: Backend OpenAPI (server/swagger.js) → generated types
 * (src/types/api-generated.d.ts) → frontend API client.
 *
 * Run: npm run generate:api-types
 * The output file is committed; regenerate whenever server/swagger.js changes.
 *
 * Implemented with a small purpose-built converter instead of openapi-typescript
 * because that tool's peer range (^5.x typescript) conflicts with this project's
 * TypeScript 6. The spec's schemas are simple JSON-schema objects, so a
 * dependency-free mapper is sufficient and keeps dependency churn at zero.
 */
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const spec = (await import('../server/swagger.js')).default;

/** Convert an OpenAPI schema object to a TypeScript type string. */
function schemaToType(schema, indent = '') {
  if (!schema) return 'unknown';

  if (schema.$ref) {
    // refs are always local component schemas in this spec
    return schema.$ref.split('/').pop();
  }

  switch (schema.type) {
    case 'string':
      return schema.enum ? schema.enum.map((v) => `'${v}'`).join(' | ') : 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `Array<${schemaToType(schema.items, indent)}>`;
    case 'object': {
      if (!schema.properties) return 'Record<string, unknown>';
      const lines = Object.entries(schema.properties).map(([key, prop]) => {
        const required = schema.required?.includes(key) ?? false;
        const doc = prop.description ? `    /** ${prop.description} */\n` : '';
        return `${doc}    ${JSON.stringify(key)}${required ? '' : '?'}: ${schemaToType(prop, indent + '  ')};`;
      });
      return `{\n${lines.join('\n')}\n${indent}}`;
    }
    default:
      return schema.properties ? schemaToType({ ...schema, type: 'object' }, indent) : 'unknown';
  }
}

const schemas = spec.components?.schemas ?? {};
const names = Object.keys(schemas);

const blocks = names.map((name) => {
  const type = schemaToType(schemas[name]);
  return type.startsWith('{')
    ? `export interface ${name} ${type}`
    : `export type ${name} = ${type};`;
});

const registry = `/** Registry of all component schemas, mirroring the OpenAPI document. */
export interface components {
  schemas: {
${names.map((n) => `    ${n}: ${n};`).join('\n')}
  };
}
`;

const header = `/* eslint-disable */
/**
 * AUTO-GENERATED from the backend OpenAPI spec — do not edit by hand.
 * Regenerate with: npm run generate:api-types
 * Source: server/swagger.js
 */
`;

const out = join(here, '..', 'src', 'types', 'api-generated.d.ts');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, header + blocks.join('\n\n') + '\n\n' + registry, 'utf-8');
console.log(`API types written to ${out} (${names.length} schemas)`);
