// Quick debug script to test Twilio credentials
import 'dotenv/config';
import twilio from 'twilio';

console.log('🔍 Debug: Testing Twilio Credentials');
console.log('====================================');

console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...' || 'NOT SET');
console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN?.substring(0, 10) + '...' || 'NOT SET');
console.log('Phone Number:', process.env.TWILIO_PHONE_NUMBER || 'NOT SET');

try {
  // Create client
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  // Test credentials by fetching account info
  const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
  
  console.log('✅ SUCCESS: Twilio credentials are valid');
  console.log('Account Name:', account.friendlyName);
  console.log('Account Status:', account.status);
  
} catch (error) {
  console.log('❌ ERROR:', error.message);
  console.log('Error Code:', error.code);
  console.log('Full error:', error);
}