import db from '../config/database.js';

// Middleware to log errors to database
export const logError = async (err, req, res, next) => {
  try {
    // Don't log certain errors
    if (err.status === 404 || err.statusCode === 404) {
      return next(err);
    }

    const errorType = err.status || err.statusCode || 500;
    const schoolId = req.user?.schoolId || null;
    const userId = req.user?.id || null;

    await db.query(
      `INSERT INTO error_logs 
       (error_type, endpoint, school_id, user_id, error_message, 
        stack_trace, request_method, request_body)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        errorType.toString(),
        req.originalUrl || req.url,
        schoolId,
        userId,
        err.message || 'Unknown error',
        err.stack || '',
        req.method,
        JSON.stringify(req.body || {})
      ]
    );
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }

  next(err);
};

// Middleware to track request performance
export const trackPerformance = async (req, res, next) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function
  res.end = async function(...args) {
    const responseTime = Date.now() - startTime;

    // Log slow requests (>1000ms)
    if (responseTime > 1000) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        await db.query(
          `INSERT INTO performance_metrics 
           (metric_date, endpoint, avg_response_time, max_response_time, 
            min_response_time, total_requests, slow_requests)
           VALUES (?, ?, ?, ?, ?, 1, 1)
           ON DUPLICATE KEY UPDATE
             avg_response_time = ((avg_response_time * total_requests) + ?) / (total_requests + 1),
             max_response_time = GREATEST(max_response_time, ?),
             min_response_time = LEAST(min_response_time, ?),
             total_requests = total_requests + 1,
             slow_requests = slow_requests + 1`,
          [
            today,
            req.route?.path || req.path,
            responseTime,
            responseTime,
            responseTime,
            responseTime
          ]
        );
      } catch (error) {
        console.error('Failed to track performance:', error);
      }
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

// Middleware to track hourly logins
export const trackLogin = async (req, res, next) => {
  try {
    if (req.body.email || req.body.username) {
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();

      await db.query(
        `INSERT INTO hourly_login_stats (stat_date, hour_slot, login_count, unique_users)
         VALUES (?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE
           login_count = login_count + 1,
           unique_users = unique_users + 1`,
        [today, hour]
      );
    }
  } catch (error) {
    console.error('Failed to track login:', error);
  }

  next();
};
