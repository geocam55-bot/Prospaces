import React, { useState, useEffect } from 'react';
import { KitchenPlannerV2 } from '../kitchen/KitchenPlannerV2';
import type { User } from '../../App';

interface KitchenPlannerProps {
  user: User;
}

export function KitchenPlanner({ user }: KitchenPlannerProps) {
  return <KitchenPlannerV2 user={user} />;
}