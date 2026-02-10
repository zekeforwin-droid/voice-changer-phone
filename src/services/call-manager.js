/**
 * Call Manager Service
 * 
 * Handles Twilio call initiation, tracking, and status management.
 */

import twilio from 'twilio';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('call-manager');

export class CallManager {
  constructor() {
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      logger.info('Twilio client initialized');
    } else {
      logger.warn('Twilio credentials not configured - call initiation disabled');
      this.client = null;
    }
    
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.serverUrl = process.env.SERVER_URL;
    
    // Track active streams and call history
    this.activeStreams = new Map();
    this.callHistory = [];
    this.stats = {
      totalCalls: 0,
      totalMinutes: 0,
      callsByVoice: {},
    };
  }
  
  /**
   * Initiate an outbound call with voice transformation
   * 
   * @param {string} toNumber - Destination phone number (E.164 format)
   * @param {string} voicePreset - Voice preset to use
   * @returns {Promise<{callSid: string}>}
   */
  async initiateCall(toNumber, voicePreset = 'deep_male') {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }
    
    if (!this.phoneNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }
    
    if (!this.serverUrl) {
      throw new Error('SERVER_URL not configured');
    }
    
    // Validate phone number format
    const formattedNumber = this.formatPhoneNumber(toNumber);
    
    logger.info(`Initiating call to ${formattedNumber} with voice: ${voicePreset}`);
    
    try {
      // Create the call
      const call = await this.client.calls.create({
        url: `${this.serverUrl}/voice?voicePreset=${voicePreset}`,
        to: formattedNumber,
        from: this.phoneNumber,
        statusCallback: `${this.serverUrl}/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        // Use machine detection to handle voicemails
        machineDetection: 'Enable',
        machineDetectionTimeout: 5,
      });
      
      logger.info(`Call created: ${call.sid}`);
      
      // Track the call
      this.stats.totalCalls++;
      this.stats.callsByVoice[voicePreset] = (this.stats.callsByVoice[voicePreset] || 0) + 1;
      
      this.callHistory.push({
        callSid: call.sid,
        to: formattedNumber,
        voicePreset,
        startTime: new Date().toISOString(),
        status: 'initiated',
      });
      
      return {
        callSid: call.sid,
        status: call.status,
      };
      
    } catch (error) {
      logger.error(`Failed to initiate call: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get call status from Twilio
   */
  async getCallStatus(callSid) {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }
    
    try {
      const call = await this.client.calls(callSid).fetch();
      
      return {
        callSid: call.sid,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
      };
    } catch (error) {
      logger.error(`Failed to get call status: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * End an active call
   */
  async endCall(callSid) {
    if (!this.client) {
      throw new Error('Twilio client not configured');
    }
    
    try {
      await this.client.calls(callSid).update({ status: 'completed' });
      logger.info(`Call ${callSid} ended`);
      
      // Update history
      const historyItem = this.callHistory.find(c => c.callSid === callSid);
      if (historyItem) {
        historyItem.status = 'completed';
        historyItem.endTime = new Date().toISOString();
      }
      
    } catch (error) {
      logger.error(`Failed to end call: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(number) {
    // Remove all non-digit characters except leading +
    let cleaned = number.replace(/[^\d+]/g, '');
    
    // If no + prefix, assume it needs one
    if (!cleaned.startsWith('+')) {
      // If it starts with country code, add +
      // Otherwise assume US and add +1
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Add an active stream (called by media-stream handler)
   */
  addActiveStream(callId, info) {
    this.activeStreams.set(callId, {
      ...info,
      connectedAt: Date.now(),
    });
  }
  
  /**
   * Remove an active stream
   */
  removeActiveStream(callId) {
    const stream = this.activeStreams.get(callId);
    if (stream) {
      const duration = (Date.now() - stream.connectedAt) / 1000 / 60; // minutes
      this.stats.totalMinutes += duration;
    }
    this.activeStreams.delete(callId);
  }
  
  /**
   * Record call end with metrics
   */
  recordCallEnd(callSid, metrics) {
    const historyItem = this.callHistory.find(c => c.callSid === callSid);
    if (historyItem) {
      historyItem.status = 'completed';
      historyItem.endTime = new Date().toISOString();
      historyItem.duration = metrics.duration;
    }
    
    this.stats.totalMinutes += (metrics.duration || 0) / 60;
    
    logger.info(`Call ${callSid} completed: ${metrics.duration}s`);
  }
  
  /**
   * Get usage statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeStreams: this.activeStreams.size,
      recentCalls: this.callHistory.slice(-10),
      estimatedCost: this.estimateCost(),
    };
  }
  
  /**
   * Estimate Twilio costs
   * Twilio pricing: ~$0.014/min outbound + ~$0.0025/min media streams
   */
  estimateCost() {
    const outboundRate = 0.014;  // per minute
    const mediaStreamRate = 0.0025;  // per minute
    const phoneNumberRate = 1.15;  // per month
    
    const callCost = this.stats.totalMinutes * (outboundRate + mediaStreamRate);
    
    return {
      calls: callCost.toFixed(2),
      phoneNumber: phoneNumberRate.toFixed(2),
      total: (callCost + phoneNumberRate).toFixed(2),
      breakdown: {
        outbound: (this.stats.totalMinutes * outboundRate).toFixed(2),
        mediaStreams: (this.stats.totalMinutes * mediaStreamRate).toFixed(2),
      },
    };
  }
  
  /**
   * Test Twilio connection
   */
  async testConnection() {
    if (!this.client) {
      return { success: false, error: 'Twilio client not configured' };
    }
    
    try {
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        success: true,
        accountName: account.friendlyName,
        status: account.status,
        message: 'Twilio connection successful',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
