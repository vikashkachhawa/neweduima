import pool from '../config/database.js';
import Subscription from './Subscription.js';

class UsageTracker {
  // Get current usage for a metric
  static async getUsage(schoolId, metricName) {
    try {
      const [usage] = await pool.query(
        `SELECT * FROM usage_tracking WHERE school_id = ? AND metric_name = ?`,
        [schoolId, metricName]
      );
      return usage[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch usage: ${error.message}`);
    }
  }

  // Check if usage limit exceeded
  static async isLimitExceeded(schoolId, metricName) {
    try {
      const usage = await this.getUsage(schoolId, metricName);
      if (!usage) return false;

      return usage.current_value >= usage.plan_limit;
    } catch (error) {
      throw new Error(`Failed to check limit: ${error.message}`);
    }
  }

  // Increment usage counter
  static async incrementUsage(schoolId, metricName, amount = 1) {
    try {
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // Check subscription is active
        const isActive = await Subscription.isSubscriptionActive(schoolId);
        if (!isActive) {
          throw new Error('Subscription is not active');
        }

        // Get subscription to check feature and limit
        const subscription = await Subscription.getSchoolSubscription(schoolId);
        let planLimit = 999999; // Default unlimited

        if (metricName === 'users_created' && subscription.max_users) {
          planLimit = subscription.max_users;
        } else if (metricName === 'classes_created' && subscription.max_classes) {
          planLimit = subscription.max_classes;
        }

        // Get or create usage record
        const [existing] = await connection.query(
          `SELECT * FROM usage_tracking WHERE school_id = ? AND metric_name = ?`,
          [schoolId, metricName]
        );

        if (existing.length > 0) {
          const newValue = existing[0].current_value + amount;
          
          // Check if exceeds limit
          if (newValue > planLimit) {
            throw new Error(`Usage limit exceeded for ${metricName}. Current: ${existing[0].current_value}, Limit: ${planLimit}`);
          }

          await connection.query(
            `UPDATE usage_tracking SET current_value = ?, updated_at = NOW() WHERE school_id = ? AND metric_name = ?`,
            [newValue, schoolId, metricName]
          );
        } else {
          // Create new usage record
          if (amount > planLimit) {
            throw new Error(`Usage limit exceeded for ${metricName}. Limit: ${planLimit}`);
          }

          await connection.query(
            `INSERT INTO usage_tracking (school_id, metric_name, current_value, plan_limit)
             VALUES (?, ?, ?, ?)`,
            [schoolId, metricName, amount, planLimit]
          );
        }

        await connection.commit();
        return true;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        await connection.release();
      }
    } catch (error) {
      throw new Error(`Failed to increment usage: ${error.message}`);
    }
  }

  // Reset monthly usage (typically at billing renewal)
  static async resetMonthlyUsage(schoolId) {
    try {
      await pool.query(
        `UPDATE usage_tracking SET current_value = 0, last_reset = NOW() WHERE school_id = ?`,
        [schoolId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to reset usage: ${error.message}`);
    }
  }

  // Get all usage metrics for a school
  static async getAllUsage(schoolId) {
    try {
      const [metrics] = await pool.query(
        `SELECT * FROM usage_tracking WHERE school_id = ?`,
        [schoolId]
      );
      return metrics;
    } catch (error) {
      throw new Error(`Failed to fetch all usage: ${error.message}`);
    }
  }

  // Get usage percentage (for UI progress bars)
  static async getUsagePercentage(schoolId, metricName) {
    try {
      const usage = await this.getUsage(schoolId, metricName);
      if (!usage) return 0;

      if (usage.plan_limit === 0) return 100; // No access
      if (usage.plan_limit === 999999) return 0; // Unlimited

      return Math.round((usage.current_value / usage.plan_limit) * 100);
    } catch (error) {
      throw new Error(`Failed to get percentage: ${error.message}`);
    }
  }
}

export default UsageTracker;
