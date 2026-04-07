import pool from '../config/database.js';
import SubscriptionPlan from './SubscriptionPlan.js';

class Subscription {
  // Get subscription for a school
  static async getSchoolSubscription(schoolId) {
    try {
      const [subs] = await pool.query(
        `SELECT s.*, p.* FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.school_id = ?`,
        [schoolId]
      );
      if (subs[0]) {
        return {
          ...subs[0],
          features: typeof subs[0].features === 'string' ? JSON.parse(subs[0].features) : subs[0].features
        };
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
  }

  // Check if school subscription is active
  static async isSubscriptionActive(schoolId) {
    try {
      const subscription = await this.getSchoolSubscription(schoolId);
      if (!subscription) return false;
      
      return subscription.status === 'active' && new Date(subscription.end_date) > new Date();
    } catch (error) {
      throw new Error(`Failed to check subscription: ${error.message}`);
    }
  }

  // Get subscription status with details
  static async getSubscriptionStatus(schoolId) {
    try {
      const subscription = await this.getSchoolSubscription(schoolId);
      if (!subscription) {
        return {
          hasSubscription: false,
          status: 'none',
          message: 'School has no subscription'
        };
      }

      const now = new Date();
      const endDate = new Date(subscription.end_date);
      const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      return {
        hasSubscription: true,
        plan: subscription.name,
        status: subscription.status,
        isActive: subscription.status === 'active' && endDate > now,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
        isExpired: endDate <= now,
        isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
        autoRenew: subscription.auto_renew,
        nextPaymentDate: subscription.next_payment_date,
        features: subscription.features
      };
    } catch (error) {
      throw new Error(`Failed to get subscription status: ${error.message}`);
    }
  }

  // Check if school has specific feature
  static async hasFeature(schoolId, featureName) {
    try {
      const subscription = await this.getSchoolSubscription(schoolId);
      if (!subscription) return false;
      
      return SubscriptionPlan.hasFeature(subscription, featureName);
    } catch (error) {
      throw new Error(`Failed to check feature: ${error.message}`);
    }
  }

  // Create subscription
  static async createSubscription(schoolId, planId, billingCycle = 'monthly') {
    try {
      const plan = await SubscriptionPlan.getPlanById(planId);
      if (!plan) throw new Error('Plan not found');

      const startDate = new Date();
      const endDate = new Date();
      
      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const [result] = await pool.query(
        `INSERT INTO subscriptions (school_id, plan_id, billing_cycle, start_date, end_date, next_payment_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [schoolId, planId, billingCycle, startDate, endDate, endDate]
      );

      return result.insertId;
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  // Upgrade subscription
  static async upgradeSubscription(schoolId, newPlanId) {
    try {
      const current = await this.getSchoolSubscription(schoolId);
      if (!current) throw new Error('Subscription not found');

      const newPlan = await SubscriptionPlan.getPlanById(newPlanId);
      if (!newPlan) throw new Error('New plan not found');

      await pool.query(
        `UPDATE subscriptions SET plan_id = ?, updated_at = NOW() WHERE school_id = ?`,
        [newPlanId, schoolId]
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to upgrade subscription: ${error.message}`);
    }
  }

  // Renew subscription
  static async renewSubscription(schoolId) {
    try {
      const current = await this.getSchoolSubscription(schoolId);
      if (!current) throw new Error('Subscription not found');

      const endDate = new Date(current.end_date);
      const newEndDate = new Date(endDate);
      
      if (current.billing_cycle === 'monthly') {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      } else {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      }

      await pool.query(
        `UPDATE subscriptions 
         SET status = 'active', end_date = ?, last_payment_date = NOW(), next_payment_date = ?, updated_at = NOW()
         WHERE school_id = ?`,
        [newEndDate, newEndDate, schoolId]
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to renew subscription: ${error.message}`);
    }
  }

  // Suspend subscription (due to expiry or non-payment)
  static async suspendSubscription(schoolId, reason) {
    try {
      await pool.query(
        `UPDATE subscriptions SET status = 'suspended', updated_at = NOW() WHERE school_id = ?`,
        [schoolId]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to suspend subscription: ${error.message}`);
    }
  }

  // Restore subscription after payment
  static async restoreSubscription(schoolId) {
    try {
      const current = await this.getSchoolSubscription(schoolId);
      if (!current) throw new Error('Subscription not found');

      // If expired, extend the end date
      const now = new Date();
      let newEndDate = new Date(current.end_date);
      
      if (newEndDate <= now) {
        // Subscription was expired, extend from today
        if (current.billing_cycle === 'monthly') {
          newEndDate = new Date(now);
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else {
          newEndDate = new Date(now);
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        }
      }

      await pool.query(
        `UPDATE subscriptions 
         SET status = 'active', end_date = ?, last_payment_date = NOW(), updated_at = NOW()
         WHERE school_id = ?`,
        [newEndDate, schoolId]
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to restore subscription: ${error.message}`);
    }
  }

  // Get all subscriptions expiring soon (within 7 days)
  static async getExpiringSubscriptions() {
    try {
      const [subs] = await pool.query(
        `SELECT s.*, p.name as plan_name, sc.name as school_name
         FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         JOIN schools sc ON s.school_id = sc.id
         WHERE s.status = 'active'
         AND end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
         ORDER BY end_date ASC`
      );
      return subs;
    } catch (error) {
      throw new Error(`Failed to fetch expiring subscriptions: ${error.message}`);
    }
  }

  // Auto-suspend expired subscriptions
  static async autoSuspendExpired() {
    try {
      const [result] = await pool.query(
        `UPDATE subscriptions 
         SET status = 'suspended', updated_at = NOW()
         WHERE status = 'active' AND end_date < NOW()`
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(`Failed to auto-suspend: ${error.message}`);
    }
  }

  // Get subscription stats for dashboard
  static async getSubscriptionStats() {
    try {
      const [stats] = await pool.query(
        `SELECT 
          p.name as plan_name,
          COUNT(s.id) as school_count,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN s.status = 'suspended' THEN 1 END) as suspended_count,
          COUNT(CASE WHEN s.status = 'expired' THEN 1 END) as expired_count
         FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         GROUP BY p.id, p.name`
      );
      return stats;
    } catch (error) {
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }
  }
}

export default Subscription;
