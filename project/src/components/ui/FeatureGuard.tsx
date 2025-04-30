import React from 'react';
import { useSubscriptionFeatures } from '../../hooks/useSubscriptionFeatures';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, fallback = null }) => {
  const { hasFeature, isLoading } = useSubscriptionFeatures();

  if (isLoading) return null;

  return hasFeature(feature as any) ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGuard;