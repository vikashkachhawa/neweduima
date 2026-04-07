import { startSession } from './services/interactiveExecutionService.js';

let outputs = [];

await startSession('test-123', 'python', 'print("Hello World")', {
  onOutput: (type, text) => {
    outputs.push({type, text});
    console.log(`[${type}] ${text.substring(0, 100)}`);
  },
  onDone: (result) => {
    console.log('\n--- FINAL OUTPUTS ---');
    console.log(JSON.stringify(outputs, null, 2));
    console.log('\n--- RESULT ---');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  },
  onError: (msg) => {
    console.error('ERROR:', msg);
    process.exit(1);
  }
});
