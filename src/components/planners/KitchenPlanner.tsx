import React, { useState, useEffect } from 'react';
import { KitchenPlannerV2 } from '../kitchen/KitchenPlannerV2';
import { PermissionGate } from '../PermissionGate';
import type { User } from '../../App';

interface KitchenPlannerProps {
  user: User;
}

export function KitchenPlanner({ user }: KitchenPlannerProps) {
  return (
    <PermissionGate user={user} module="kitchen-planner" action="view">
      <KitchenPlannerV2 user={user} />
    </PermissionGate>
  );
}