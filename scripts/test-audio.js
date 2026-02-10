#!/usr/bin/env node
/**
 * Test script for audio processing pipeline
 * 
 * Tests:
 * - μ-law encoding/decoding
 * - Resampling
 * - ElevenLabs API connection
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { mulawDecode, mulawEncode, resample, calculateRMS } from '../src/utils/audio-codec.js';
import { VoiceTransformer } from '../src/services/voice-transformer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Voice Changer Phone - Audio Pipeline Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: μ-law encoding/decoding roundtrip
  console.log('Test 1: μ-law Encoding/Decoding');
  try {
    // Create test PCM data (sine wave)
    const sampleRate = 8000;
    const duration = 0.1; // 100ms
    const frequency = 440; // A4 note
    const numSamples = Math.floor(sampleRate * duration);
    
    const pcmBuffer = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.round(Math.sin(2 * Math.PI * frequency * i / sampleRate) * 16000);
      pcmBuffer.writeInt16LE(sample, i * 2);
    }
    
    // Encode to μ-law
    const mulawBuffer = mulawEncode(pcmBuffer);
    
    // Decode back to PCM
    const decodedPcm = mulawDecode(mulawBuffer);
    
    // Check sizes
    const sizeCorrect = mulawBuffer.length === numSamples && decodedPcm.length === pcmBuffer.length;
    
    // Check that decoded matches original (within μ-law quantization error)
    let maxError = 0;
    for (let i = 0; i < numSamples; i++) {
      const original = pcmBuffer.readInt16LE(i * 2);
      const decoded = decodedPcm.readInt16LE(i * 2);
      maxError = Math.max(maxError, Math.abs(original - decoded));
    }
    
    // μ-law has ~64dB SNR, so we expect some quantization error
    const errorAcceptable = maxError < 1000; // Allow reasonable error
    
    if (sizeCorrect && errorAcceptable) {
      console.log(`   ✅ PASSED (max error: ${maxError})`);
      passed++;
    } else {
      console.log(`   ❌ FAILED (size correct: ${sizeCorrect}, max error: ${maxError})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }
  
  // Test 2: Resampling
  console.log('\nTest 2: Resampling (8kHz → 16kHz → 8kHz)');
  try {
    const inputSamples = 800; // 100ms at 8kHz
    const pcmBuffer = Buffer.alloc(inputSamples * 2);
    
    // Fill with test pattern
    for (let i = 0; i < inputSamples; i++) {
      pcmBuffer.writeInt16LE(Math.round(Math.sin(i * 0.1) * 10000), i * 2);
    }
    
    // Upsample to 16kHz
    const upsampled = resample(pcmBuffer, 8000, 16000);
    const expectedUpsampled = Math.floor(inputSamples * 2);
    
    // Downsample back to 8kHz
    const downsampled = resample(upsampled, 16000, 8000);
    
    const upsampleCorrect = Math.abs(upsampled.length / 2 - expectedUpsampled) <= 1;
    const downsampleCorrect = Math.abs(downsampled.length - pcmBuffer.length) <= 2;
    
    if (upsampleCorrect && downsampleCorrect) {
      console.log(`   ✅ PASSED`);
      console.log(`      8kHz (${inputSamples} samples) → 16kHz (${upsampled.length/2} samples) → 8kHz (${downsampled.length/2} samples)`);
      passed++;
    } else {
      console.log(`   ❌ FAILED`);
      console.log(`      Expected: ${inputSamples} → ${expectedUpsampled} → ${inputSamples}`);
      console.log(`      Got: ${inputSamples} → ${upsampled.length/2} → ${downsampled.length/2}`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }
  
  // Test 3: RMS calculation
  console.log('\nTest 3: RMS Calculation');
  try {
    // Silent buffer
    const silentBuffer = Buffer.alloc(1600);
    const silentRms = calculateRMS(silentBuffer);
    
    // Loud buffer
    const loudBuffer = Buffer.alloc(1600);
    for (let i = 0; i < 800; i++) {
      loudBuffer.writeInt16LE(20000, i * 2);
    }
    const loudRms = calculateRMS(loudBuffer);
    
    if (silentRms === 0 && loudRms > 15000) {
      console.log(`   ✅ PASSED (silent: ${silentRms.toFixed(0)}, loud: ${loudRms.toFixed(0)})`);
      passed++;
    } else {
      console.log(`   ❌ FAILED (silent: ${silentRms}, loud: ${loudRms})`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }
  
  // Test 4: ElevenLabs Connection
  console.log('\nTest 4: ElevenLabs API Connection');
  try {
    const transformer = new VoiceTransformer();
    const result = await transformer.testConnection();
    
    if (result.success) {
      console.log(`   ✅ PASSED (${result.voiceCount} voices available)`);
      passed++;
    } else {
      console.log(`   ⚠️ SKIPPED: ${result.error}`);
      console.log(`      Set ELEVENLABS_API_KEY to test API connection`);
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    failed++;
  }
  
  // Test 5: Environment Variables
  console.log('\nTest 5: Environment Configuration');
  const envVars = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '***' : undefined,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? '***' : undefined,
    SERVER_URL: process.env.SERVER_URL,
  };
  
  const configured = Object.entries(envVars)
    .filter(([_, v]) => v)
    .map(([k, _]) => k);
  const missing = Object.entries(envVars)
    .filter(([_, v]) => !v)
    .map(([k, _]) => k);
  
  if (configured.length === Object.keys(envVars).length) {
    console.log(`   ✅ All environment variables configured`);
    passed++;
  } else {
    console.log(`   ⚠️ Partial configuration`);
    console.log(`      Configured: ${configured.join(', ') || 'none'}`);
    console.log(`      Missing: ${missing.join(', ')}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
