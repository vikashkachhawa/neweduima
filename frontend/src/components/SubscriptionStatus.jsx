import React, { useEffect } from 'react';
import { Box, Alert, Card, CardContent, Typography, LinearProgress, Chip } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * SubscriptionStatus Component
 * 
 * Displays:
 * 1. Current plan name
 * 2. Days until expiry
 * 3. User count and limits (if applicable)
 * 4. Feature availability
 * 5. Warnings if expiring or suspended
 * 
 * USE CASES:
 * - Free plan: Show "50/50 users"
 * - Pro plan: Show "150/500 users" with upgrade option
 * - Expired: Show red error with contact admin message
 * - Expiring: Show yellow warning with renewal option
 */

export const SubscriptionStatus = ({ compact = false }) => {
  const { user } = useAuth();
  const { subscription, status, hasFeature, getDaysRemaining, isExpiringSoon, fetchSubscriptionStatus } = useSubscription();

  useEffect(() => {
    const schoolId = user?.schoolId || user?.school_id;
    if (schoolId) {
      fetchSubscriptionStatus(schoolId);
    }
  }, [user, fetchSubscriptionStatus]);

  if (!subscription) {
    return null;
  }

  const daysRemaining = getDaysRemaining();
  const planName = subscription.name || 'Unknown Plan';
  const isExpired = status?.isExpired === true;
  const isSuspended = status?.status === 'suspended';

  if (compact) {
    return (
      <Box sx={{ mb: 2 }}>
        {isExpired || isSuspended ? (
          <Alert severity="error" icon={<ErrorIcon />}>
            <strong>Subscription {isSuspended ? 'Suspended' : 'Expired'}</strong>
            <br />
            Contact your administrator to renew
          </Alert>
        ) : isExpiringSoon ? (
          <Alert severity="warning" icon={<WarningIcon />}>
            <strong>Plan expires in {daysRemaining} days</strong>
            <br />
            Renew now to maintain access
          </Alert>
        ) : (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            <strong>{planName}</strong> - Expires in {daysRemaining} days
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Subscription Plan</Typography>
          <Chip
            label={planName}
            color={isExpired || isSuspended ? 'error' : isExpiringSoon ? 'warning' : 'success'}
            icon={isExpired || isSuspended ? <ErrorIcon /> : isExpiringSoon ? <WarningIcon /> : <CheckCircleIcon />}
          />
        </Box>

        {/* Status Alert */}
        {isExpired || isSuspended ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>⚠️ Subscription {isSuspended ? 'Suspended' : 'Expired'}</strong>
            <br />
            {isSuspended 
              ? 'Your subscription is suspended. Contact your administrator to restore access.'
              : 'Your subscription has expired. Please renew to continue using the platform.'}
          </Alert>
        ) : isExpiringSoon ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>⏰ Renew Soon</strong>
            <br />
            Your plan expires in <strong>{daysRemaining} days</strong> on {status?.endDate}
          </Alert>
        ) : null}

        {/* Usage Bars */}
        {status?.usage_summary && status.usage_summary.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Resource Usage
            </Typography>
            {status.usage_summary.map((usage) => (
              <Box key={usage.metric} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{formatMetricName(usage.metric)}</Typography>
                  <Typography variant="body2">
                    {usage.current}/{usage.limit} ({usage.percentage})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseFloat(usage.percentage)}
                  sx={{
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getProgressColor(parseFloat(usage.percentage))
                    }
                  }}
                />
              </Box>
            ))}
          </>
        )}

        {/* Features */}
        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
          Available Features
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {subscription.features && Object.entries(
            typeof subscription.features === 'string' 
              ? JSON.parse(subscription.features)
              : subscription.features
          ).map(([featureName, enabled]) => (
            <Chip
              key={featureName}
              label={formatFeatureName(featureName)}
              variant={enabled ? 'filled' : 'outlined'}
              color={enabled ? 'primary' : 'default'}
              size="small"
              icon={enabled ? <CheckCircleIcon /> : <ErrorIcon />}
            />
          ))}
        </Box>

        {/* Billing Info */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary">
            <strong>Plan Details:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Billing Cycle: <strong>{subscription.billing_cycle}</strong>
          </Typography>
          <Typography variant="body2">
            Started: <strong>{formatDate(subscription.start_date)}</strong>
          </Typography>
          <Typography variant="body2">
            Expires: <strong>{formatDate(subscription.end_date)}</strong>
          </Typography>
          {subscription.auto_renew && (
            <Typography variant="body2" sx={{ color: 'success.main' }}>
              ✓ Auto-renewal enabled
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * FeatureAvailability Component
 * 
 * Shows whether a specific feature is available
 * Used to conditionally show feature buttons/sections
 */

export const FeatureAvailability = ({ featureName, children, fallback = null }) => {
  const { hasFeature } = useSubscription();

  if (hasFeature(featureName)) {
    return children;
  }

  return fallback || (
    <Alert severity="info" sx={{ mb: 2 }}>
      Feature "<strong>{formatFeatureName(featureName)}</strong>" is not available in your current plan.
      <br />
      Upgrade your subscription to access this feature.
    </Alert>
  );
};

/**
 * Usage Warning Component
 * 
 * Shows warning when approaching limits
 */

export const UsageWarning = ({ metric, threshold = 80 }) => {
  const { getUsage, isActive } = useSubscription();
  const usage = getUsage(metric);

  if (!usage || !isActive()) {
    return null;
  }

  const percentage = parseFloat(usage.percentage);

  if (percentage >= threshold) {
    return (
      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
        <strong>Usage Limit Warning</strong>
        <br />
        You've used {usage.percentage} of your {usage.metric} limit ({usage.current}/{usage.limit}).
        {percentage >= 100 && ' You cannot create more items until you upgrade your plan.'}
      </Alert>
    );
  }

  return null;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatFeatureName(featureName) {
  return featureName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatMetricName(metricName) {
  return formatFeatureName(metricName);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getProgressColor(percentage) {
  if (percentage >= 100) return '#d32f2f'; // Red
  if (percentage >= 80) return '#f57c00'; // Orange
  return '#388e3c'; // Green
}
