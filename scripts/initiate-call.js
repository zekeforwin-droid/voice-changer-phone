#!/usr/bin/env node
/**
 * CLI Script to initiate a voice-changed call
 * 
 * Usage:
 *   node scripts/initiate-call.js +15551234567 deep_male
 *   node scripts/initiate-call.js "+1 555 123 4567" british_male
 */

import 'dotenv/config';
import twilio from 'twilio';

// Available voice presets
const VOICE_PRESETS = [
  'deep_male',
  'young_male', 
  'british_male',
  'narrator_male',
  'soft_female',
  'professional_female',
  'warm_female',
  'mysterious',
  'friendly_elder',
  'custom',
];

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
🎭 Voice Changer Phone - Call Initiator

Usage:
  node scripts/initiate-call.js <phone-number> [voice-preset]

Arguments:
  phone-number    Destination phone number (E.164 format recommended)
  voice-preset    Voice preset to use (default: deep_male)

Available Voice Presets:
  ${VOICE_PRESETS.map(v => `  - ${v}`).join('\n')}

Examples:
  node scripts/initiate-call.js +15551234567
  node scripts/initiate-call.js +15551234567 british_male
  node scripts/initiate-call.js "+1 555 123 4567" soft_female

Environment Variables Required:
  TWILIO_ACCOUNT_SID    Your Twilio Account SID
  TWILIO_AUTH_TOKEN     Your Twilio Auth Token
  TWILIO_PHONE_NUMBER   Your Twilio phone number
  SERVER_URL            Your server's public URL
`);
    process.exit(0);
  }
  
  const phoneNumber = args[0];
  const voicePreset = args[1] || 'deep_male';
  
  // Validate voice preset
  if (!VOICE_PRESETS.includes(voicePreset)) {
    console.error(`❌ Invalid voice preset: ${voicePreset}`);
    console.error(`   Available: ${VOICE_PRESETS.join(', ')}`);
    process.exit(1);
  }
  
  // Check environment variables
  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'SERVER_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables:`);
    missing.forEach(key => console.error(`   - ${key}`));
    console.error(`\nCreate a .env file or set these variables.`);
    process.exit(1);
  }
  
  // Format phone number
  let formattedNumber = phoneNumber.replace(/[^\d+]/g, '');
  if (!formattedNumber.startsWith('+')) {
    if (formattedNumber.length === 10) {
      formattedNumber = '+1' + formattedNumber;
    } else if (formattedNumber.length === 11 && formattedNumber.startsWith('1')) {
      formattedNumber = '+' + formattedNumber;
    } else {
      formattedNumber = '+' + formattedNumber;
    }
  }
  
  console.log(`\n🎭 Voice Changer Phone - Initiating Call`);
  console.log(`   To: ${formattedNumber}`);
  console.log(`   Voice: ${voicePreset}`);
  console.log(`   From: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`   Server: ${process.env.SERVER_URL}`);
  console.log('');
  
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const call = await client.calls.create({
      url: `${process.env.SERVER_URL}/voice?voicePreset=${voicePreset}`,
      to: formattedNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.SERVER_URL}/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });
    
    console.log(`✅ Call initiated successfully!`);
    console.log(`   Call SID: ${call.sid}`);
    console.log(`   Status: ${call.status}`);
    console.log('');
    console.log(`📞 The call is now being connected...`);
    console.log(`   Your voice will be transformed using the "${voicePreset}" preset.`);
    
  } catch (error) {
    console.error(`\n❌ Failed to initiate call:`);
    console.error(`   ${error.message}`);
    
    if (error.code === 20003) {
      console.error(`\n   This usually means your Twilio credentials are incorrect.`);
    } else if (error.code === 21211) {
      console.error(`\n   Invalid phone number format. Use E.164 format: +15551234567`);
    } else if (error.code === 21214) {
      console.error(`\n   The 'To' number is not a valid phone number.`);
    }
    
    process.exit(1);
  }
}

main();
