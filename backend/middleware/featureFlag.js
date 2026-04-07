import FeatureFlag from '../models/FeatureFlag.js';

// Cache for feature flags (refreshed every 5 minutes)
let featureFlagCache = {};
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Refresh cache if expired
async function refreshCache() {
  const now = Date.now();
  if (now > cacheExpiry) {
    try {
      const features = await FeatureFlag.getAllFeatures();
      featureFlagCache = {};
      features.forEach(f => {
        featureFlagCache[f.feature_name] = f.is_enabled;
      });
      cacheExpiry = now + CACHE_TTL;
    } catch (error) {
      console.error('Error refreshing feature flag cache:', error);
    }
  }
}

// Middleware: Check if feature is enabled for user's school
export const checkFeatureEnabled = (featureName) => {
  return async (req, res, next) => {
    try {
      await refreshCache();

      const schoolId = req.user?.schoolId;
      const featureEnabled = await FeatureFlag.isEnabledForSchool(schoolId, featureName);

      if (!featureEnabled) {
        return res.status(403).json({
          error: 'Feature not available',
          feature: featureName,
          message: `The feature "${featureName}" is not enabled for your school.`
        });
      }

      // Attach feature status to request
      req.featureStatus = { [featureName]: true };
      next();
    } catch (error) {
      console.error(`Feature check error for ${featureName}:`, error);
      res.status(500).json({ error: 'Failed to check feature availability' });
    }
  };
};

// Middleware: Check multiple features (all must be enabled)
export const checkAllFeaturesEnabled = (featureNames) => {
  return async (req, res, next) => {
    try {
      await refreshCache();

      const schoolId = req.user?.schoolId;
      const results = {};

      for (const feature of featureNames) {
        results[feature] = await FeatureFlag.isEnabledForSchool(schoolId, feature);
      }

      const allEnabled = Object.values(results).every(v => v === true);

      if (!allEnabled) {
        return res.status(403).json({
          error: 'Required features not available',
          features: results,
          message: 'Some required features are not enabled for your school.'
        });
      }

      req.featureStatus = results;
      next();
    } catch (error) {
      console.error('Multi-feature check error:', error);
      res.status(500).json({ error: 'Failed to check feature availability' });
    }
  };
};

// Middleware: Check any of the features (at least one must be enabled)
export const checkAnyFeatureEnabled = (featureNames) => {
  return async (req, res, next) => {
    try {
      await refreshCache();

      const schoolId = req.user?.schoolId;
      const results = {};

      for (const feature of featureNames) {
        results[feature] = await FeatureFlag.isEnabledForSchool(schoolId, feature);
      }

      const anyEnabled = Object.values(results).some(v => v === true);

      if (!anyEnabled) {
        return res.status(403).json({
          error: 'No required features available',
          features: results,
          message: 'None of the required features are enabled for your school.'
        });
      }

      req.featureStatus = results;
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Failed to check feature availability' });
    }
  };
};

// Attach feature check method to request
export const attachFeatureCheck = async (req, res, next) => {
  try {
    await refreshCache();

    req.checkFeature = async (featureName) => {
      return await FeatureFlag.isEnabledForSchool(req.user?.schoolId, featureName);
    };

    next();
  } catch (error) {
    console.error('Error attaching feature check:', error);
    res.status(500).json({ error: 'Failed to initialize feature check' });
  }
};

// Clear cache (useful for testing or manual updates)
export const clearFeatureFlagCache = () => {
  featureFlagCache = {};
  cacheExpiry = 0;
};
