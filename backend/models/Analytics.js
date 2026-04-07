import db from '../config/database.js';

class Analytics {
  // Get platform overview (specific date or current day)
  static async getPlatformOverview(date = null) {
    try {
      const today = date || new Date().toISOString().split('T')[0];
      
      // Get today's metrics
      const [metrics] = await db.query(
        'SELECT * FROM platform_metrics WHERE metric_date = ?',
        [today]
      );

      // Get active schools count
      const [activeSchools] = await db.query(
        `SELECT COUNT(DISTINCT school_id) as count 
         FROM school_usage_stats 
         WHERE stat_date = ? AND active_users > 0`,
        [today]
      );

      // Get total schools
      const [totalSchools] = await db.query(
        'SELECT COUNT(*) as count FROM schools WHERE is_active = TRUE'
      );

      const activeCount = activeSchools[0]?.count || 0;
      const totalCount = totalSchools[0]?.count || 0;

      return {
        date: today,
        activeSchools: activeCount,
        totalSchools: totalCount,
        activePercentage: totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : 0,
        totalActiveUsers: metrics[0]?.total_active_users || 0,
        totalLogins: metrics[0]?.total_logins || 0,
        loginSuccessRate: metrics[0]?.login_success_rate || 0,
        avgResponseTime: metrics[0]?.avg_response_time || 0,
        systemStatus: this.getSystemStatus(metrics[0])
      };
    } catch (error) {
      throw new Error(`Failed to get platform overview: ${error.message}`);
    }
  }

  // Get login trends (date range or last N days)
  static async getLoginTrends(days = 7, startDate = null, endDate = null) {
    try {
      let query = 'SELECT metric_date, total_logins, total_active_users FROM platform_metrics WHERE 1=1';
      const params = [];

      if (startDate && endDate) {
        query += ' AND metric_date >= ? AND metric_date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' AND metric_date >= ?';
        params.push(startDate);
      } else {
        query += ' AND metric_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
        params.push(days);
      }

      query += ' ORDER BY metric_date DESC';

      const [trends] = await db.query(query, params);

      return trends;
    } catch (error) {
      throw new Error(`Failed to get login trends: ${error.message}`);
    }
  }

  // Get hourly login pattern (today)
  static async getHourlyPattern(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const [pattern] = await db.query(
        `SELECT hour_slot, login_count, unique_users 
         FROM hourly_login_stats 
         WHERE stat_date = ?
         ORDER BY hour_slot`,
        [targetDate]
      );

      return pattern;
    } catch (error) {
      throw new Error(`Failed to get hourly pattern: ${error.message}`);
    }
  }

  // Get storage alerts (with date filter)
  static async getStorageAlerts(level = null, startDate = null, endDate = null, includeResolved = false) {
    try {
      let query = `
        SELECT sa.*, s.name as school_name, p.name as plan_name
        FROM storage_alerts sa
        JOIN schools s ON sa.school_id = s.id
        LEFT JOIN subscriptions sub ON s.id = sub.school_id
        LEFT JOIN subscription_plans p ON sub.plan_id = p.id
        WHERE 1=1
      `;

      const params = [];

      if (!includeResolved) {
        query += ' AND sa.resolved_at IS NULL';
      }

      if (startDate) {
        query += ' AND DATE(sa.created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(sa.created_at) <= ?';
        params.push(endDate);
      }

      if (level) {
        query += ' AND sa.alert_level = ?';
        params.push(level);
      }

      query += ' ORDER BY sa.percentage_used DESC, sa.created_at DESC';

      const [alerts] = await db.query(query, params);
      return alerts;
    } catch (error) {
      throw new Error(`Failed to get storage alerts: ${error.message}`);
    }
  }

  // Get error summary (with date range)
  static async getErrorSummary(startDate = null, endDate = null, hours = 24) {
    try {
      let whereClause = '';
      const params = [];

      if (startDate && endDate) {
        whereClause = 'WHERE DATE(occurred_at) >= ? AND DATE(occurred_at) <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        whereClause = 'WHERE DATE(occurred_at) >= ?';
        params.push(startDate);
      } else {
        whereClause = 'WHERE occurred_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)';
        params.push(hours);
      }

      const [summary] = await db.query(
        `SELECT 
          error_type,
          endpoint,
          COUNT(*) as count,
          COUNT(DISTINCT school_id) as schools_affected,
          MIN(occurred_at) as first_occurrence,
          MAX(occurred_at) as last_occurrence
         FROM error_logs
         ${whereClause}
         GROUP BY error_type, endpoint
         ORDER BY count DESC
         LIMIT 10`,
        params
      );

      // Get total errors and requests
      let totalsQuery;
      let totalsParams = [];

      if (startDate && endDate) {
        totalsQuery = `SELECT 
          (SELECT COUNT(*) FROM error_logs WHERE DATE(occurred_at) >= ? AND DATE(occurred_at) <= ?) as total_errors,
          (SELECT SUM(total_requests) FROM platform_metrics WHERE metric_date >= ? AND metric_date <= ?) as total_requests`;
        totalsParams = [startDate, endDate, startDate, endDate];
      } else if (startDate) {
        totalsQuery = `SELECT 
          (SELECT COUNT(*) FROM error_logs WHERE DATE(occurred_at) >= ?) as total_errors,
          (SELECT SUM(total_requests) FROM platform_metrics WHERE metric_date >= ?) as total_requests`;
        totalsParams = [startDate, startDate];
      } else {
        totalsQuery = `SELECT 
          (SELECT COUNT(*) FROM error_logs WHERE occurred_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)) as total_errors,
          (SELECT total_requests FROM platform_metrics WHERE metric_date = CURDATE()) as total_requests`;
        totalsParams = [hours];
      }

      const [totals] = await db.query(totalsQuery, totalsParams);

      const errorRate = totals[0]?.total_requests > 0 
        ? ((totals[0].total_errors / totals[0].total_requests) * 100).toFixed(2)
        : 0;

      return {
        totalErrors: totals[0]?.total_errors || 0,
        totalRequests: totals[0]?.total_requests || 0,
        errorRate: parseFloat(errorRate),
        status: errorRate < 0.5 ? 'normal' : errorRate < 1 ? 'warning' : 'critical',
        topErrors: summary
      };
    } catch (error) {
      throw new Error(`Failed to get error summary: ${error.message}`);
    }
  }

  // Get performance metrics (with date range)
  static async getPerformanceMetrics(days = 7, startDate = null, endDate = null) {
    try {
      let query = 'SELECT metric_date, AVG(avg_response_time) as avg_time FROM performance_metrics WHERE 1=1';
      const params = [];

      if (startDate && endDate) {
        query += ' AND metric_date >= ? AND metric_date <= ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' AND metric_date >= ?';
        params.push(startDate);
      } else {
        query += ' AND metric_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)';
        params.push(days);
      }

      query += ' GROUP BY metric_date ORDER BY metric_date DESC';

      const [metrics] = await db.query(query, params);

      // Get slowest endpoints for date range
      let endpointQuery = `SELECT endpoint, AVG(avg_response_time) as avg_response_time, 
                           SUM(total_requests) as total_requests, SUM(slow_requests) as slow_requests
                           FROM performance_metrics WHERE 1=1`;
      const endpointParams = [];

      if (startDate && endDate) {
        endpointQuery += ' AND metric_date >= ? AND metric_date <= ?';
        endpointParams.push(startDate, endDate);
      } else if (startDate) {
        endpointQuery += ' AND metric_date >= ?';
        endpointParams.push(startDate);
      } else {
        endpointQuery += ' AND metric_date = CURDATE()';
      }

      endpointQuery += ' GROUP BY endpoint ORDER BY avg_response_time DESC LIMIT 5';

      const [slowEndpoints] = await db.query(endpointQuery, endpointParams);

      const avgToday = metrics.find(m => m.metric_date === new Date().toISOString().split('T')[0]);
      const status = !avgToday ? 'unknown' 
        : avgToday.avg_time < 500 ? 'good'
        : avgToday.avg_time < 1000 ? 'warning'
        : 'critical';

      return {
        trends: metrics,
        slowestEndpoints: slowEndpoints,
        currentAverage: avgToday?.avg_time || 0,
        status
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  // Get school performance rankings (with date)
  static async getSchoolPerformance(tier = null, limit = 10, date = null) {
    try {
      const today = date || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT sps.*, s.name as school_name, p.name as plan_name,
               sus.active_users, sus.total_logins, sus.support_tickets
        FROM school_performance_scores sps
        JOIN schools s ON sps.school_id = s.id
        LEFT JOIN subscriptions sub ON s.id = sub.school_id
        LEFT JOIN subscription_plans p ON sub.plan_id = p.id
        LEFT JOIN school_usage_stats sus ON s.id = sus.school_id AND sus.stat_date = ?
        WHERE sps.score_date = ?
      `;

      const params = [today, today];

      if (tier) {
        query += ' AND sps.performance_tier = ?';
        params.push(tier);
      }

      query += ' ORDER BY sps.overall_score DESC LIMIT ?';
      params.push(limit);

      const [schools] = await db.query(query, params);
      return schools;
    } catch (error) {
      throw new Error(`Failed to get school performance: ${error.message}`);
    }
  }

  // Get feature adoption stats (with date)
  static async getFeatureAdoption(date = null) {
    try {
      const today = date || new Date().toISOString().split('T')[0];
      
      const [adoption] = await db.query(
        `SELECT feature_name, schools_using, total_users, usage_count
         FROM feature_usage_stats
         WHERE stat_date = ?
         ORDER BY schools_using DESC`,
        [today]
      );

      const [totalSchools] = await db.query(
        'SELECT COUNT(*) as count FROM schools WHERE is_active = TRUE'
      );

      const total = totalSchools[0]?.count || 1;

      return adoption.map(feature => ({
        ...feature,
        adoption_percentage: ((feature.schools_using / total) * 100).toFixed(1)
      }));
    } catch (error) {
      throw new Error(`Failed to get feature adoption: ${error.message}`);
    }
  }

  // Get revenue metrics (with date)
  static async getRevenueMetrics(date = null) {
    try {
      const today = date || new Date().toISOString().split('T')[0];
      
      const [current] = await db.query(
        'SELECT * FROM revenue_stats WHERE stat_date = ?',
        [today]
      );

      const [previous] = await db.query(
        `SELECT * FROM revenue_stats 
         WHERE stat_date = DATE_SUB(?, INTERVAL 1 MONTH)`,
        [today]
      );

      const currentMRR = current[0]?.mrr || 0;
      const previousMRR = previous[0]?.mrr || 0;
      const growth = previousMRR > 0 ? (((currentMRR - previousMRR) / previousMRR) * 100).toFixed(1) : 0;

      return {
        mrr: currentMRR,
        growth: parseFloat(growth),
        freeSchools: current[0]?.free_schools || 0,
        proSchools: current[0]?.pro_schools || 0,
        enterpriseSchools: current[0]?.enterprise_schools || 0,
        newUpgrades: current[0]?.new_upgrades || 0,
        downgrades: current[0]?.downgrades || 0,
        churn: current[0]?.churn || 0
      };
    } catch (error) {
      throw new Error(`Failed to get revenue metrics: ${error.message}`);
    }
  }

  // Get upsell opportunities (with date)
  static async getUpsellOpportunities(date = null) {
    try {
      const today = date || new Date().toISOString().split('T')[0];

      // Free -> Pro candidates (>40 users or >8GB storage)
      const [freeToPro] = await db.query(
        `SELECT s.id, s.name, sus.active_users, sus.storage_used_gb,
                p.name as current_plan
         FROM schools s
         JOIN subscriptions sub ON s.id = sub.school_id
         JOIN subscription_plans p ON sub.plan_id = p.id
         LEFT JOIN school_usage_stats sus ON s.id = sus.school_id 
           AND sus.stat_date = ?
         WHERE p.name = 'Free'
           AND (sus.active_users > 40 OR sus.storage_used_gb > 8)
         ORDER BY sus.active_users DESC
         LIMIT 10`,
        [today]
      );

      // Pro -> Enterprise candidates (>400 users)
      const [proToEnterprise] = await db.query(
        `SELECT s.id, s.name, sus.active_users, sus.storage_used_gb,
                p.name as current_plan
         FROM schools s
         JOIN subscriptions sub ON s.id = sub.school_id
         JOIN subscription_plans p ON sub.plan_id = p.id
         LEFT JOIN school_usage_stats sus ON s.id = sus.school_id 
           AND sus.stat_date = ?
         WHERE p.name = 'Pro'
           AND sus.active_users > 400
         ORDER BY sus.active_users DESC
         LIMIT 10`,
        [today]
      );

      return {
        freeToPro: freeToPro,
        proToEnterprise: proToEnterprise,
        potentialRevenue: (freeToPro.length * 100) + (proToEnterprise.length * 200)
      };
    } catch (error) {
      throw new Error(`Failed to get upsell opportunities: ${error.message}`);
    }
  }

  // Helper: Determine system status
  static getSystemStatus(metrics) {
    if (!metrics) return 'unknown';
    
    const errorRate = metrics.error_rate || 0;
    const responseTime = metrics.avg_response_time || 0;
    
    if (errorRate > 1 || responseTime > 1000) return 'critical';
    if (errorRate > 0.5 || responseTime > 500) return 'warning';
    return 'normal';
  }

  // Get complete dashboard data
  static async getDashboard() {
    try {
      const [overview, trends, errors, performance, revenue] = await Promise.all([
        this.getPlatformOverview(),
        this.getLoginTrends(7),
        this.getErrorSummary(),
        this.getPerformanceMetrics(7),
        this.getRevenueMetrics()
      ]);

      return {
        overview,
        trends,
        errors,
        performance,
        revenue,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }
}

export default Analytics;
