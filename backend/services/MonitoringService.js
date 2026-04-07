import db from '../config/database.js';

class MonitoringService {
  // Collect daily platform metrics
  static async collectPlatformMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Count active schools (had at least 1 login today)
      const [activeSchools] = await db.query(
        `SELECT COUNT(DISTINCT school_id) as count 
         FROM audit_logs 
         WHERE action = 'login' 
           AND DATE(created_at) = ?
           AND status = 'success'`,
        [today]
      );

      // Count total active users today
      const [activeUsers] = await db.query(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM audit_logs 
         WHERE DATE(created_at) = ? AND user_id IS NOT NULL`,
        [today]
      );

      // Count total logins
      const [totalLogins] = await db.query(
        `SELECT COUNT(*) as count 
         FROM audit_logs 
         WHERE action = 'login' AND DATE(created_at) = ?`,
        [today]
      );

      // Count successful logins
      const [successLogins] = await db.query(
        `SELECT COUNT(*) as count 
         FROM audit_logs 
         WHERE action = 'login' 
           AND DATE(created_at) = ? 
           AND status = 'success'`,
        [today]
      );

      const loginSuccessRate = totalLogins[0].count > 0
        ? ((successLogins[0].count / totalLogins[0].count) * 100).toFixed(2)
        : 100;

      // Get error count
      const [errors] = await db.query(
        `SELECT COUNT(*) as count 
         FROM error_logs 
         WHERE DATE(occurred_at) = ?`,
        [today]
      );

      // Estimate total requests (assuming 1 audit log per request)
      const [requests] = await db.query(
        `SELECT COUNT(*) as count 
         FROM audit_logs 
         WHERE DATE(created_at) = ?`,
        [today]
      );

      const errorRate = requests[0].count > 0
        ? ((errors[0].count / requests[0].count) * 100).toFixed(2)
        : 0;

      // Insert or update metrics
      await db.query(
        `INSERT INTO platform_metrics 
         (metric_date, active_schools, total_active_users, total_logins, 
          login_success_rate, total_errors, error_rate, total_requests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           active_schools = VALUES(active_schools),
           total_active_users = VALUES(total_active_users),
           total_logins = VALUES(total_logins),
           login_success_rate = VALUES(login_success_rate),
           total_errors = VALUES(total_errors),
           error_rate = VALUES(error_rate),
           total_requests = VALUES(total_requests)`,
        [
          today,
          activeSchools[0].count,
          activeUsers[0].count,
          totalLogins[0].count,
          loginSuccessRate,
          errors[0].count,
          errorRate,
          requests[0].count
        ]
      );

      console.log(`✓ Platform metrics collected for ${today}`);
      return true;
    } catch (error) {
      console.error('Failed to collect platform metrics:', error);
      return false;
    }
  }

  // Collect school usage statistics
  static async collectSchoolUsageStats() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [schools] = await db.query('SELECT id FROM schools WHERE is_active = TRUE');

      for (const school of schools) {
        // Active users today
        const [activeUsers] = await db.query(
          `SELECT COUNT(DISTINCT user_id) as count 
           FROM audit_logs 
           WHERE school_id = ? AND DATE(created_at) = ?`,
          [school.id, today]
        );

        // Total logins today
        const [logins] = await db.query(
          `SELECT COUNT(*) as count 
           FROM audit_logs 
           WHERE school_id = ? 
             AND action = 'login' 
             AND DATE(created_at) = ?`,
          [school.id, today]
        );

        // Get subscription details for storage limit
        const [subscription] = await db.query(
          `SELECT sp.features 
           FROM subscriptions s
           JOIN subscription_plans sp ON s.plan_id = sp.id
           WHERE s.school_id = ?`,
          [school.id]
        );

        const features = subscription[0] ? JSON.parse(subscription[0].features) : {};
        const storageLimit = features.storage_gb || 10;

        // Simulate storage (in real system, calculate from actual file storage)
        const storageUsed = (Math.random() * storageLimit * 0.8).toFixed(2);

        await db.query(
          `INSERT INTO school_usage_stats 
           (school_id, stat_date, active_users, total_logins, storage_used_gb, storage_limit_gb)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             active_users = VALUES(active_users),
             total_logins = VALUES(total_logins),
             storage_used_gb = VALUES(storage_used_gb)`,
          [school.id, today, activeUsers[0].count, logins[0].count, storageUsed, storageLimit]
        );
      }

      console.log(`✓ School usage stats collected for ${schools.length} schools`);
      return true;
    } catch (error) {
      console.error('Failed to collect school usage stats:', error);
      return false;
    }
  }

  // Check storage and create alerts
  static async checkStorageAlerts() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [schools] = await db.query(
        `SELECT school_id, storage_used_gb, storage_limit_gb,
                (storage_used_gb / storage_limit_gb * 100) as percentage_used
         FROM school_usage_stats
         WHERE stat_date = ? AND (storage_used_gb / storage_limit_gb) >= 0.90`,
        [today]
      );

      for (const school of schools) {
        const percentage = parseFloat(school.percentage_used);
        let alertLevel = 'warning';
        
        if (percentage >= 99) alertLevel = 'emergency';
        else if (percentage >= 95) alertLevel = 'critical';

        // Check if alert already exists
        const [existing] = await db.query(
          `SELECT id FROM storage_alerts 
           WHERE school_id = ? 
             AND resolved_at IS NULL 
             AND alert_level = ?`,
          [school.school_id, alertLevel]
        );

        if (existing.length === 0) {
          // Calculate growth rate (last 7 days)
          const [growth] = await db.query(
            `SELECT 
               MAX(storage_used_gb) - MIN(storage_used_gb) as growth
             FROM school_usage_stats
             WHERE school_id = ? 
               AND stat_date >= DATE_SUB(?, INTERVAL 7 DAY)`,
            [school.school_id, today]
          );

          const weeklyGrowth = growth[0]?.growth || 0;
          const remaining = school.storage_limit_gb - school.storage_used_gb;
          const daysUntilFull = weeklyGrowth > 0 ? Math.ceil((remaining / weeklyGrowth) * 7) : 999;
          const projectedFullDate = new Date(Date.now() + daysUntilFull * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

          await db.query(
            `INSERT INTO storage_alerts 
             (school_id, alert_level, current_usage_gb, limit_gb, percentage_used, 
              growth_rate_gb_per_week, projected_full_date, notified_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              school.school_id,
              alertLevel,
              school.storage_used_gb,
              school.storage_limit_gb,
              percentage,
              weeklyGrowth,
              projectedFullDate
            ]
          );

          console.log(`⚠️ Storage alert created for school ${school.school_id}: ${percentage}%`);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to check storage alerts:', error);
      return false;
    }
  }

  // Calculate school performance scores
  static async calculatePerformanceScores() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [schools] = await db.query(
        `SELECT s.id, sus.active_users, sus.total_logins, sus.support_tickets,
                u.total_users
         FROM schools s
         LEFT JOIN school_usage_stats sus ON s.id = sus.school_id AND sus.stat_date = ?
         LEFT JOIN (
           SELECT school_id, COUNT(*) as total_users 
           FROM users 
           GROUP BY school_id
         ) u ON s.id = u.school_id
         WHERE s.is_active = TRUE`,
        [today]
      );

      for (const school of schools) {
        const totalUsers = school.total_users || 1;
        const activeUsers = school.active_users || 0;
        const supportTickets = school.support_tickets || 0;

        // Engagement score (0-100): percentage of active users
        const engagementScore = ((activeUsers / totalUsers) * 100).toFixed(2);

        // Feature adoption score (placeholder - would check feature_usage_stats)
        const featureAdoptionScore = 70; // Mock value

        // Support health score (inverse of tickets)
        const supportHealthScore = Math.max(0, 100 - (supportTickets * 5));

        // Overall score
        const overallScore = (
          (parseFloat(engagementScore) + featureAdoptionScore + supportHealthScore) / 3
        ).toFixed(2);

        // Determine tier
        let tier = 'average';
        if (overallScore >= 80) tier = 'top';
        else if (overallScore >= 60) tier = 'good';
        else if (overallScore >= 40) tier = 'average';
        else if (overallScore >= 20) tier = 'needs_attention';
        else tier = 'at_risk';

        await db.query(
          `INSERT INTO school_performance_scores 
           (school_id, score_date, engagement_score, feature_adoption_score, 
            support_health_score, overall_score, performance_tier)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             engagement_score = VALUES(engagement_score),
             feature_adoption_score = VALUES(feature_adoption_score),
             support_health_score = VALUES(support_health_score),
             overall_score = VALUES(overall_score),
             performance_tier = VALUES(performance_tier)`,
          [
            school.id,
            today,
            engagementScore,
            featureAdoptionScore,
            supportHealthScore,
            overallScore,
            tier
          ]
        );
      }

      // Update rankings
      await db.query(
        `UPDATE school_performance_scores sps1
         JOIN (
           SELECT id, ROW_NUMBER() OVER (ORDER BY overall_score DESC) as new_rank
           FROM school_performance_scores
           WHERE score_date = ?
         ) sps2 ON sps1.id = sps2.id
         SET sps1.rank_position = sps2.new_rank
         WHERE sps1.score_date = ?`,
        [today, today]
      );

      console.log(`✓ Performance scores calculated for ${schools.length} schools`);
      return true;
    } catch (error) {
      console.error('Failed to calculate performance scores:', error);
      return false;
    }
  }

  // Collect revenue stats
  static async collectRevenueStats() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [planCounts] = await db.query(
        `SELECT p.name as plan_name, COUNT(*) as count,
                CASE WHEN s.billing_cycle = 'annual' THEN p.price_annual ELSE p.price_monthly END as price
         FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.status = 'active'
         GROUP BY p.name, price`
      );

      let mrr = 0;
      let freeSchools = 0;
      let proSchools = 0;
      let enterpriseSchools = 0;

      planCounts.forEach(plan => {
        mrr += plan.count * (Number(plan.price) || 0);
        if (plan.plan_name === 'Free') freeSchools = plan.count;
        else if (plan.plan_name === 'Pro') proSchools = plan.count;
        else if (plan.plan_name === 'Enterprise') enterpriseSchools = plan.count;
      });

      await db.query(
        `INSERT INTO revenue_stats 
         (stat_date, mrr, free_schools, pro_schools, enterprise_schools)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           mrr = VALUES(mrr),
           free_schools = VALUES(free_schools),
           pro_schools = VALUES(pro_schools),
           enterprise_schools = VALUES(enterprise_schools)`,
        [today, mrr, freeSchools, proSchools, enterpriseSchools]
      );

      console.log(`✓ Revenue stats collected: MRR = $${mrr}`);
      return true;
    } catch (error) {
      console.error('Failed to collect revenue stats:', error);
      return false;
    }
  }

  // Run all monitoring tasks
  static async runDailyMonitoring() {
    console.log('\n========== Daily Monitoring Started ==========');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    await this.collectPlatformMetrics();
    await this.collectSchoolUsageStats();
    await this.checkStorageAlerts();
    await this.calculatePerformanceScores();
    await this.collectRevenueStats();
    
    console.log('========== Daily Monitoring Completed ==========\n');
  }
}

export default MonitoringService;
