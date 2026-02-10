/**
 * Voice Presets Configuration
 * 
 * Defines available voice presets and their ElevenLabs voice IDs.
 * These are default ElevenLabs voices - custom voices can be added.
 */

/**
 * Voice presets with ElevenLabs voice IDs and settings
 * 
 * Voice IDs from ElevenLabs library:
 * - Find more at: https://elevenlabs.io/voice-library
 * - Or use API: GET /v1/voices
 */
export const VOICE_PRESETS = {
  // Male voices
  deep_male: {
    name: 'Deep Male (Adam)',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    description: 'Deep, authoritative male voice',
    category: 'male',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  },
  
  young_male: {
    name: 'Young Male (Josh)',
    voiceId: 'TxGEqnHWrfWFTfGW9XjX',
    description: 'Young, energetic male voice',
    category: 'male',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true,
    },
  },
  
  british_male: {
    name: 'British Male (Harry)',
    voiceId: 'SOYHLrjzK2X1ezoPC6cr',
    description: 'British accent male voice',
    category: 'male',
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    },
  },
  
  narrator_male: {
    name: 'Narrator (Marcus)',
    voiceId: 'zcAOhNBS3c14rBihAFp1',
    description: 'Professional narrator voice',
    category: 'male',
    settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: false,
    },
  },
  
  // Female voices
  soft_female: {
    name: 'Soft Female (Bella)',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    description: 'Soft, gentle female voice',
    category: 'female',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  },
  
  professional_female: {
    name: 'Professional Female (Rachel)',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    description: 'Professional, clear female voice',
    category: 'female',
    settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    },
  },
  
  warm_female: {
    name: 'Warm Female (Domi)',
    voiceId: 'AZnzlk1XvdvUeBnXmlld',
    description: 'Warm, friendly female voice',
    category: 'female',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true,
    },
  },
  
  // Character voices
  mysterious: {
    name: 'Mysterious (Arnold)',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    description: 'Deep, mysterious voice',
    category: 'character',
    settings: {
      stability: 0.4,
      similarity_boost: 0.7,
      style: 0.2,
      use_speaker_boost: true,
    },
  },
  
  friendly_elder: {
    name: 'Friendly Elder (Thomas)',
    voiceId: 'GBv7mTt0atIp3Br8iCZE',
    description: 'Warm, elderly male voice',
    category: 'character',
    settings: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  },
  
  // Custom voice placeholder
  custom: {
    name: 'Custom Voice',
    voiceId: process.env.CUSTOM_VOICE_ID || '',
    description: 'Your custom cloned voice',
    category: 'custom',
    settings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    },
  },
};

/**
 * Get voice ID for a preset
 * 
 * @param {string} presetId - Preset identifier
 * @returns {string|null} - ElevenLabs voice ID
 */
export function getVoiceId(presetId) {
  const preset = VOICE_PRESETS[presetId];
  if (!preset) {
    return null;
  }
  return preset.voiceId;
}

/**
 * Get voice settings for a preset
 * 
 * @param {string} presetId - Preset identifier
 * @returns {object|null} - Voice settings
 */
export function getVoiceSettings(presetId) {
  const preset = VOICE_PRESETS[presetId];
  if (!preset) {
    return null;
  }
  return preset.settings;
}

/**
 * List all available presets
 * 
 * @returns {Array} - List of preset info
 */
export function listPresets() {
  return Object.entries(VOICE_PRESETS)
    .filter(([_, preset]) => preset.voiceId)  // Only include configured presets
    .map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
      category: preset.category,
    }));
}

/**
 * Get presets by category
 * 
 * @param {string} category - Category filter (male, female, character)
 * @returns {Array} - Filtered presets
 */
export function getPresetsByCategory(category) {
  return Object.entries(VOICE_PRESETS)
    .filter(([_, preset]) => preset.category === category && preset.voiceId)
    .map(([id, preset]) => ({
      id,
      name: preset.name,
      description: preset.description,
    }));
}

/**
 * Validate a voice preset exists
 * 
 * @param {string} presetId - Preset identifier
 * @returns {boolean}
 */
export function isValidPreset(presetId) {
  return presetId in VOICE_PRESETS && !!VOICE_PRESETS[presetId].voiceId;
}

/**
 * Add a custom voice
 * 
 * @param {string} id - Unique identifier
 * @param {object} config - Voice configuration
 */
export function addCustomVoice(id, config) {
  VOICE_PRESETS[id] = {
    name: config.name || `Custom: ${id}`,
    voiceId: config.voiceId,
    description: config.description || 'Custom voice',
    category: 'custom',
    settings: config.settings || {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true,
    },
  };
}

export default VOICE_PRESETS;
