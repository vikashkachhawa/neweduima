import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch subscription status
  const fetchSubscriptionStatus = async (schoolId) => {
    try {
      setLoading(true);
      const response = await api.get(`/subscription/school/${schoolId}/status`);
      setStatus(response.data);
      setSubscription(response.data.subscription);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch subscription');
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if feature is available
  const hasFeature = (featureName) => {
    if (!subscription) return false;
    const features = typeof subscription.features === 'string'
      ? JSON.parse(subscription.features)
      : subscription.features;
    return features?.[featureName] === true;
  };

  // Check if subscription is active
  const isActive = () => {
    return status?.isActive === true;
  };

  // Get remaining days
  const getDaysRemaining = () => {
    return status?.daysUntilExpiry || 0;
  };

  // Check if expiring soon (within 7 days)
  const isExpiringSoon = () => {
    return status?.isExpiringSoon === true;
  };

  // Get plan name
  const getPlanName = () => {
    return subscription?.name || 'Not Set';
  };

  // Get usage info
  const getUsage = (metric) => {
    return status?.usage_summary?.find(u => u.metric === metric);
  };

  // Upgrade plan
  const upgradePlan = async (newPlanId) => {
    try {
      setLoading(true);
      const response = await api.post('/subscription/upgrade-subscription', {
        new_plan_id: newPlanId
      });
      await fetchSubscriptionStatus(subscription.school_id);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Upgrade failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    subscription,
    status,
    loading,
    error,
    hasFeature,
    isActive,
    getDaysRemaining,
    isExpiringSoon,
    getPlanName,
    getUsage,
    fetchSubscriptionStatus,
    upgradePlan
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
