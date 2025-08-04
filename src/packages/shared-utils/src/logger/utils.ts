export interface SafeStringifyOptions {
  maxDepth?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
}

export function safeStringify(
  obj: any,
  options: SafeStringifyOptions = {}
): string {
  const {
    maxDepth = 10,
    maxArrayLength = 100,
    maxStringLength = 1000
  } = options;

  const seen = new WeakSet();

  function replacer(_key: string, value: any, depth: number = 0): any {
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]';
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'undefined') {
      return undefined;
    }

    if (typeof value === 'string') {
      return value.length > maxStringLength
        ? value.substring(0, maxStringLength) + '...[truncated]'
        : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
        ...(value as any)
      };
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof RegExp) {
      return value.toString();
    }

    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    if (typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);

      if (Array.isArray(value)) {
        const truncated = value.slice(0, maxArrayLength);
        const mapped = truncated.map((item, index) => 
          replacer(`${index}`, item, depth + 1)
        );
        
        if (value.length > maxArrayLength) {
          mapped.push(`...[${value.length - maxArrayLength} more items]`);
        }
        
        return mapped;
      }

      const result: Record<string, any> = {};
      const keys = Object.keys(value);
      
      for (const key of keys) {
        try {
          result[key] = replacer(key, value[key], depth + 1);
        } catch (error) {
          result[key] = `[Error accessing property: ${error}]`;
        }
      }
      
      return result;
    }

    return value;
  }

  try {
    return JSON.stringify(obj, (key, value) => replacer(key, value), 2);
  } catch (error) {
    return `[Stringify Error: ${error}]`;
  }
}