import { TestLogger } from '../pinoLogger.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('TestLogger', () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = new TestLogger();
  });

  afterEach(() => {
    logger.clearLogs();
  });

  it('should log messages with correct level and format', () => {
    logger.info('test message');
    logger.error('error message');
    logger.debug('debug message');
    logger.warn('warning message');

    const logs = logger.getCollectedLogs();
    expect(logs).toHaveLength(4);

    expect(logs[0]).toMatchObject({
      level: 'info',
      msg: 'test message'
    });

    expect(logs[1]).toMatchObject({
      level: 'error',
      msg: 'error message'
    });

    expect(logs[2]).toMatchObject({
      level: 'debug',
      msg: 'debug message'
    });

    expect(logs[3]).toMatchObject({
      level: 'warn',
      msg: 'warning message'
    });
  });

  it('should include timestamp in logs', () => {
    logger.info('test message');
    const logs = logger.getCollectedLogs();
    expect(logs[0].time).toBeDefined();
    expect(new Date(logs[0].time).toString()).not.toBe('Invalid Date');
  });

  it('should handle error objects correctly', () => {
    const error = new Error('test error');
    logger.error('error occurred', error);

    const logs = logger.getCollectedLogs();
    expect(logs[0]).toMatchObject({
      level: 'error',
      msg: 'error occurred',
      args: [{
        error: {
          message: 'test error',
          stack: error.stack
        }
      }]
    });
  });

  it('should handle multiple arguments', () => {
    const obj = { test: 'value' };
    logger.info('test message', obj, 123, 'string arg');

    const logs = logger.getCollectedLogs();
    expect(logs[0]).toMatchObject({
      level: 'info',
      msg: 'test message',
      args: [obj, 123, 'string arg']
    });
  });

  it('should clear logs when requested', () => {
    logger.info('test message');
    expect(logger.getCollectedLogs()).toHaveLength(1);
    
    logger.clearLogs();
    expect(logger.getCollectedLogs()).toHaveLength(0);
  });
}); 