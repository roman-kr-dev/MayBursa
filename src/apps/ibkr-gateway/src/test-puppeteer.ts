import { LoginAutomationService } from './services/loginAutomation';

// Start the test
console.log('='.repeat(60));
console.log('IBKR Gateway Login Test');
console.log('='.repeat(60));

const service = new LoginAutomationService({
  keepOpen: true
});

service.authenticate().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});