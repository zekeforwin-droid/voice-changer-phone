/**
 * Latency Tracker
 * 
 * Tracks and reports processing latency for voice transformation.
 * Helps identify performance bottlenecks and optimize the pipeline.
 */

export class LatencyTracker {
  /**
   * Create a latency tracker
   * 
   * @param {number} windowSize - Number of samples to keep for rolling stats
   */
  constructor(windowSize = 100) {
    this.windowSize = windowSize;
    this.samples = [];
    this.totalSamples = 0;
    this.runningSum = 0;
    
    // Track breakdown by stage
    this.stages = new Map();
    
    // Alerting thresholds
    this.warningThreshold = 300;  // ms
    this.criticalThreshold = 500;  // ms
  }
  
  /**
   * Record a latency sample
   * 
   * @param {number} ms - Latency in milliseconds
   * @param {string} stage - Optional stage identifier
   */
  record(ms, stage = 'total') {
    this.samples.push(ms);
    this.runningSum += ms;
    this.totalSamples++;
    
    // Keep window size
    if (this.samples.length > this.windowSize) {
      this.runningSum -= this.samples.shift();
    }
    
    // Track by stage
    if (!this.stages.has(stage)) {
      this.stages.set(stage, {
        samples: [],
        sum: 0,
        count: 0,
      });
    }
    
    const stageData = this.stages.get(stage);
    stageData.samples.push(ms);
    stageData.sum += ms;
    stageData.count++;
    
    if (stageData.samples.length > this.windowSize) {
      stageData.sum -= stageData.samples.shift();
    }
  }
  
  /**
   * Get current statistics
   * 
   * @returns {object} - Latency statistics
   */
  getMetrics() {
    if (this.samples.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        count: 0,
      };
    }
    
    const sorted = [...this.samples].sort((a, b) => a - b);
    
    return {
      average: Math.round(this.runningSum / this.samples.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: this.totalSamples,
    };
  }
  
  /**
   * Get metrics for a specific stage
   */
  getStageMetrics(stage) {
    const stageData = this.stages.get(stage);
    if (!stageData || stageData.samples.length === 0) {
      return null;
    }
    
    const sorted = [...stageData.samples].sort((a, b) => a - b);
    
    return {
      stage,
      average: Math.round(stageData.sum / stageData.samples.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: stageData.count,
    };
  }
  
  /**
   * Get metrics for all stages
   */
  getAllStageMetrics() {
    const result = {};
    for (const [stage, _] of this.stages) {
      result[stage] = this.getStageMetrics(stage);
    }
    return result;
  }
  
  /**
   * Check if latency is within acceptable bounds
   * 
   * @returns {string} - 'ok', 'warning', or 'critical'
   */
  getStatus() {
    const metrics = this.getMetrics();
    
    if (metrics.p95 >= this.criticalThreshold) {
      return 'critical';
    }
    if (metrics.p95 >= this.warningThreshold) {
      return 'warning';
    }
    return 'ok';
  }
  
  /**
   * Reset all statistics
   */
  reset() {
    this.samples = [];
    this.runningSum = 0;
    this.totalSamples = 0;
    this.stages.clear();
  }
  
  /**
   * Get a formatted report
   */
  getReport() {
    const metrics = this.getMetrics();
    const status = this.getStatus();
    
    return {
      status,
      latency: {
        average: `${metrics.average}ms`,
        min: `${metrics.min}ms`,
        max: `${metrics.max}ms`,
        p50: `${metrics.p50}ms`,
        p95: `${metrics.p95}ms`,
        p99: `${metrics.p99}ms`,
      },
      samples: metrics.count,
      stages: this.getAllStageMetrics(),
    };
  }
}

/**
 * Pipeline Timer
 * 
 * Times individual stages of the processing pipeline.
 */
export class PipelineTimer {
  constructor() {
    this.startTimes = new Map();
    this.durations = new Map();
  }
  
  /**
   * Start timing a stage
   */
  start(stage) {
    this.startTimes.set(stage, Date.now());
  }
  
  /**
   * End timing a stage
   * 
   * @returns {number} - Duration in milliseconds
   */
  end(stage) {
    const startTime = this.startTimes.get(stage);
    if (!startTime) {
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.durations.set(stage, duration);
    this.startTimes.delete(stage);
    
    return duration;
  }
  
  /**
   * Get duration for a stage
   */
  getDuration(stage) {
    return this.durations.get(stage) || 0;
  }
  
  /**
   * Get all durations
   */
  getAllDurations() {
    return Object.fromEntries(this.durations);
  }
  
  /**
   * Get total pipeline duration
   */
  getTotal() {
    let total = 0;
    for (const duration of this.durations.values()) {
      total += duration;
    }
    return total;
  }
  
  /**
   * Reset timer
   */
  reset() {
    this.startTimes.clear();
    this.durations.clear();
  }
}

/**
 * Helper to measure async function execution time
 */
export async function measureAsync(fn, tracker, stage = 'operation') {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    if (tracker) {
      tracker.record(duration, stage);
    }
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - start;
    if (tracker) {
      tracker.record(duration, `${stage}_error`);
    }
    throw error;
  }
}
