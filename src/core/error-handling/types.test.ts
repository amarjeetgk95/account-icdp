import { describe, it, expect } from 'vitest';
import { DomainError, isApiError, handleError, ERROR_CODES } from './types';

describe('DomainError', () => {
  it('creates error with code and message', () => {
    const error = new DomainError('VALIDATION', 'Invalid input');
    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe('Invalid input');
    expect(error.name).toBe('DomainError');
  });

  it('creates error with details', () => {
    const error = new DomainError('DATABASE', 'DB error', { table: 'users' });
    expect(error.details).toEqual({ table: 'users' });
  });
});

describe('isApiError', () => {
  it('returns true for valid API error', () => {
    expect(isApiError({ code: 'ERROR', message: 'Error' })).toBe(true);
  });

  it('returns false for non-API error', () => {
    expect(isApiError({ foo: 'bar' })).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('string')).toBe(false);
  });
});

describe('handleError', () => {
  it('passes through API error', () => {
    const error = { code: 'ERROR', message: 'Test error' };
    expect(handleError(error)).toEqual(error);
  });

  it('converts DomainError to API error', () => {
    const error = new DomainError('VALIDATION', 'Invalid');
    const result = handleError(error);
    expect(result.code).toBe('VALIDATION');
    expect(result.message).toBe('Invalid');
  });

  it('converts Error to API error', () => {
    const error = new Error('Something failed');
    const result = handleError(error);
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Something failed');
  });

  it('handles unknown error types', () => {
    const result = handleError('unknown');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('An unexpected error occurred');
  });
});

describe('ERROR_CODES', () => {
  it('has all expected error codes', () => {
    expect(ERROR_CODES.VALIDATION).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.AUTH).toBe('AUTH_ERROR');
    expect(ERROR_CODES.PERMISSION).toBe('PERMISSION_DENIED');
    expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
    expect(ERROR_CODES.CONFLICT).toBe('CONFLICT');
    expect(ERROR_CODES.DATABASE).toBe('DATABASE_ERROR');
    expect(ERROR_CODES.NETWORK).toBe('NETWORK_ERROR');
    expect(ERROR_CODES.UNKNOWN).toBe('UNKNOWN_ERROR');
  });
});
