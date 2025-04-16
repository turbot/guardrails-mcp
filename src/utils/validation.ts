import AjvModule, { ErrorObject, JSONSchemaType } from 'ajv';
import { logger } from '../services/logger.js';

// Initialize JSON Schema validator
const Ajv = AjvModule.default || AjvModule;
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false
});

// Helper function to validate input against a schema
export function validateInput<T>(input: unknown, schema: JSONSchemaType<T>): { isValid: boolean; errors: string[] } {
  const validate = ajv.compile(schema);
  const isValid = validate(input);

  if (!isValid) {
    const errors = (validate.errors || []).map((err: ErrorObject) => {
      // Format error message
      const path = err.instancePath || '';
      const property = err.params.missingProperty || err.params.additionalProperty || '';
      const message = err.message || 'Invalid value';
      
      return `${path}${property ? '/' + property : ''} ${message}`;
    });

    logger.error('Validation errors:', errors);
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
} 