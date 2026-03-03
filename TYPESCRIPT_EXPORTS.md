# TypeScript Exports Configuration

## Problem
The QueueBit package was missing proper TypeScript export configuration, causing TypeScript users to see errors like:
```typescript
// @ts-expect-error - Package doesn't have proper TS exports configured
import { QueueBitClient } from '@usermetrics/queuebit';
```

## Solution
The package now has proper TypeScript support configured through:

### 1. Package.json Updates
Added TypeScript type definitions to [`package.json`](package.json):

```json
{
  "types": "src/types.d.ts",
  "exports": {
    ".": {
      "types": "./src/types.d.ts",
      "import": "./src/client-react.js",
      "require": "./src/index.js",
      "browser": "./src/client-browser.js"
    },
    "./client": {
      "types": "./src/types.d.ts",
      "import": "./src/client-react.js",
      "require": "./src/client-node.js"
    },
    "./server": {
      "types": "./src/types.d.ts",
      "require": "./src/server.js"
    }
  }
}
```

### 2. Created Dedicated Type Definition File
Created [`src/client-react.d.ts`](src/client-react.d.ts) specifically for the React/ES6 client with:
- Full type definitions for `QueueBitClient` class
- All interface types (PublishOptions, SubscribeOptions, etc.)
- Proper generic type support for message payloads
- Complete JSDoc documentation

### 3. Existing Type Definitions
The existing [`src/types.d.ts`](src/types.d.ts) file already contained comprehensive type definitions for:
- Server types (`QueueBitServer`)
- Client types (`QueueBitClient`)
- All interfaces and response types
- Module declarations

## Usage

### TypeScript Projects
No more `@ts-expect-error` needed! TypeScript will now automatically find the type definitions:

```typescript
import { QueueBitClient } from '@usermetrics/queuebit';
import type { PublishOptions, QueueMessage } from '@usermetrics/queuebit';

const client = new QueueBitClient('http://localhost:3333');

// Full type safety
const options: PublishOptions = {
  subject: 'test',
  expiry: new Date(),
  removeAfterRead: true
};

await client.publish({ text: 'Hello' }, options);
```

### React Projects
```typescript
import { QueueBitClient } from '@usermetrics/queuebit';
import type { MessageHandler, QueueMessage } from '@usermetrics/queuebit';

const handler: MessageHandler<{ text: string }> = (message) => {
  console.log(message.data.text); // Fully typed!
};

await client.subscribe(handler, { subject: 'test' });
```

### Node.js Projects
```typescript
import { QueueBitServer } from '@usermetrics/queuebit/server';
import type { QueueBitServerOptions } from '@usermetrics/queuebit/server';

const options: QueueBitServerOptions = {
  port: 3333,
  maxQueueSize: 1000
};

const server = new QueueBitServer(options);
```

## Testing
Created [`test/test-typescript.ts`](test/test-typescript.ts) to verify TypeScript compilation works correctly. Run with:

```bash
npx tsc --noEmit test/test-typescript.ts
```

## Benefits
✅ Full IntelliSense support in VS Code and other IDEs  
✅ Type checking at compile time  
✅ Better developer experience  
✅ Automatic type inference  
✅ No need for `@ts-expect-error` comments  
✅ Generic type support for custom message payloads  

## Files Modified/Created
- [`package.json`](package.json) - Added `types` field and type exports
- [`src/client-react.d.ts`](src/client-react.d.ts) - Created dedicated type definitions
- [`test/test-typescript.ts`](test/test-typescript.ts) - Created TypeScript test file
- [`TYPESCRIPT_EXPORTS.md`](TYPESCRIPT_EXPORTS.md) - This documentation
