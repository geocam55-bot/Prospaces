// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  canAdd,
  canChange,
  canView,
  getSpacePermissionKey,
  normalizePermissionRecords,
  refreshPermissionsFromStorage,
} from './permissions';

describe('space-based permissions', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('currentOrgId', 'org_001');
    refreshPermissionsFromStorage();
  });

  it('migrates legacy module permissions into space-level records', () => {
    const migrated = normalizePermissionRecords([
      { module: 'contacts', role: 'marketing', visible: true, add: true, change: true, delete: false },
      { module: 'email', role: 'marketing', visible: true, add: true, change: true, delete: false },
      { module: 'security', role: 'marketing', visible: false, add: false, change: false, delete: false },
    ]);

    expect(migrated.some((record) => record.module === getSpacePermissionKey('marketing') && record.role === 'marketing')).toBe(true);
    expect(migrated.some((record) => record.module === getSpacePermissionKey('sales') && record.role === 'marketing')).toBe(true);
    expect(migrated.some((record) => record.module === 'contacts' && record.role === 'marketing')).toBe(true);
    expect(migrated.some((record) => record.module === 'email' && record.role === 'marketing')).toBe(true);
  });

  it('turns a view-only space into read-only module access', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'manager', visible: true, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('marketing'), role: 'manager', visible: false, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('design'), role: 'manager', visible: false, add: false, change: false, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('contacts', 'manager')).toBe(true);
    expect(canAdd('contacts', 'manager')).toBe(false);
    expect(canChange('contacts', 'manager')).toBe(false);
  });

  it('keeps shared modules editable when a full-access space grants them', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'marketing', visible: true, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('marketing'), role: 'marketing', visible: true, add: true, change: true, delete: true },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('contacts', 'marketing')).toBe(true);
    expect(canAdd('contacts', 'marketing')).toBe(true);
    expect(canView('bids', 'marketing')).toBe(false);
  });

  it('keeps core Sales modules visible for standard users', () => {
    refreshPermissionsFromStorage();

    expect(canView('bids', 'standard_user')).toBe(true);
    expect(canView('email', 'standard_user')).toBe(true);
    expect(canView('tasks', 'standard_user')).toBe(true);
    expect(canView('appointments', 'standard_user')).toBe(true);
    expect(canView('notes', 'standard_user')).toBe(true);
  });

  it('requires space access before a module override can grant access', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'standard_user', visible: false, add: false, change: false, delete: false },
        { module: getSpacePermissionKey('marketing'), role: 'standard_user', visible: false, add: false, change: false, delete: false },
        { module: 'email', role: 'standard_user', visible: true, add: true, change: true, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('email', 'standard_user')).toBe(false);
  });

  it('keeps option overrides read-only when the parent space is view only', () => {
    localStorage.setItem(
      'permissions_org_001',
      JSON.stringify([
        { module: getSpacePermissionKey('sales'), role: 'manager', visible: true, add: false, change: false, delete: false },
        { module: 'tasks', role: 'manager', visible: true, add: true, change: true, delete: false },
      ])
    );

    refreshPermissionsFromStorage();

    expect(canView('tasks', 'manager')).toBe(true);
    expect(canAdd('tasks', 'manager')).toBe(false);
    expect(canChange('tasks', 'manager')).toBe(false);
  });
});
