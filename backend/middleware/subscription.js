import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import AuditLog from '../models/AuditLog.js';

// Check if school has active subscription
export const checkSubscriptionActive = async (req, res, next) => {
  try {
    const schoolId = req.user?.school_id;
    
    // Super admins bypass subscription check
    if (req.user?.role === 'super_admin') {
      return next();
    }

    if (!schoolId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isActive = await Subscription.isSubscriptionActive(schoolId);
    
    if (!isActive) {
      const status = await Subscription.getSubscriptionStatus(schoolId);
      
      await AuditLog.log(
        req.user.id,
        'subscription_access_denied',
        'subscription',
        schoolId,
        { status: status.status },
        req,
        'failure',
        'Subscription not active'
      );

      return res.status(402).json({
        error: 'Subscription expired or inactive',
        status: status.status,
        message: status.message
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Subscription check failed' });
  }
};

// Check if school has specific feature
export const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const schoolId = req.user?.school_id;
      
      // Super admins bypass feature check
      if (req.user?.role === 'super_admin') {
        return next();
      }

      if (!schoolId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasFeature = await Subscription.hasFeature(schoolId, featureName);
      
      if (!hasFeature) {
        await AuditLog.log(
          req.user.id,
          'feature_access_denied',
          'feature',
          null,
          { feature: featureName },
          req,
          'failure',
          `Feature ${featureName} not available in current plan`
        );

        return res.status(403).json({
          error: 'Feature not available in current plan',
          feature: featureName,
          message: `Your subscription does not include ${featureName}`
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Feature check failed' });
    }
  };
};

// Check subscription status and add to request (for displaying warnings)
export const attachSubscriptionStatus = async (req, res, next) => {
  try {
    const schoolId = req.user?.school_id;
    
    if (!schoolId) {
      return next();
    }

    const status = await Subscription.getSubscriptionStatus(schoolId);
    req.subscriptionStatus = status;

    // Add warning header if expiring soon
    if (status.isExpiringSoon && status.isActive) {
      res.set('X-Subscription-Warning', `Subscription expires in ${status.daysUntilExpiry} days`);
    }

    next();
  } catch (error) {
    // Don't block request if status check fails
    console.error('Subscription status check error:', error);
    next();
  }
};

export default {
  checkSubscriptionActive,
  checkFeatureAccess,
  attachSubscriptionStatus
};
