import pool from '../config/database.js';

class SubscriptionPlan {
  // Get all active plans
  static async getAllPlans() {
    try {
      const [plans] = await pool.query(
        'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY price_monthly ASC'
      );
      return plans.map(plan => ({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
      }));
    } catch (error) {
      throw new Error(`Failed to fetch plans: ${error.message}`);
    }
  }

  static async getPlanById(id) {
    try {
      const [plans] = await pool.query(
        'SELECT * FROM subscription_plans WHERE id = ?',
        [id]
      );
      if (plans[0]) {
        return {
          ...plans[0],
          features: typeof plans[0].features === 'string' ? JSON.parse(plans[0].features) : plans[0].features
        };
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
  }

  static async getPlanByName(name) {
    try {
      const [plans] = await pool.query(
        'SELECT * FROM subscription_plans WHERE name = ?',
        [name]
      );
      if (plans[0]) {
        return {
          ...plans[0],
          features: typeof plans[0].features === 'string' ? JSON.parse(plans[0].features) : plans[0].features
        };
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to fetch plan: ${error.message}`);
    }
  }

  // Check if feature is available in plan
  static hasFeature(plan, featureName) {
    if (!plan || !plan.features) return false;
    const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
    return features[featureName] === true;
  }

  // Get feature limit for plan
  static getFeatureLimit(plan, featureName) {
    if (!plan) return 0;
    const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
    const value = features[featureName];
    return typeof value === 'number' ? value : (value === true ? Infinity : 0);
  }

  static async createPlan(name, description, maxUsers, features, priceMonthly, priceAnnual) {
    try {
      const [result] = await pool.query(
        `INSERT INTO subscription_plans (name, description, max_users, features, price_monthly, price_annual)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, maxUsers, JSON.stringify(features), priceMonthly, priceAnnual]
      );
      return result.insertId;
    } catch (error) {
      throw new Error(`Failed to create plan: ${error.message}`);
    }
  }

  static async updatePlan(id, updates) {
    try {
      const fields = [];
      const values = [];

      if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.maxUsers !== undefined) {
        fields.push('max_users = ?');
        values.push(updates.maxUsers);
      }
      if (updates.features) {
        fields.push('features = ?');
        values.push(JSON.stringify(updates.features));
      }
      if (updates.priceMonthly !== undefined) {
        fields.push('price_monthly = ?');
        values.push(updates.priceMonthly);
      }
      if (updates.priceAnnual !== undefined) {
        fields.push('price_annual = ?');
        values.push(updates.priceAnnual);
      }

      if (fields.length === 0) return;

      values.push(id);
      await pool.query(
        `UPDATE subscription_plans SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    } catch (error) {
      throw new Error(`Failed to update plan: ${error.message}`);
    }
  }
}

export default SubscriptionPlan;
