import db from '../config/database.js';

// Super Admin: create and list stream templates
export const createStreamTemplate = async (req, res) => {
  try {
    const { name, description = '', stream_key = null, subjects = [] } = req.body;
    if (!name || !Array.isArray(subjects)) {
      return res.status(400).json({ error: 'name and subjects are required' });
    }
    await db.query(
      `INSERT INTO stream_templates (name, description, stream_key, subjects)
       VALUES (?, ?, ?, JSON_ARRAY(?))`,
      [name, description, stream_key, subjects]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('createStreamTemplate error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const listStreamTemplates = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM stream_templates ORDER BY name');
    res.json({ success: true, templates: rows });
  } catch (error) {
    console.error('listStreamTemplates error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Super Admin: exam pattern templates
export const createExamPatternTemplate = async (req, res) => {
  try {
    const { name, description = '', pattern = {} } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    await db.query(
      `INSERT INTO exam_pattern_templates (name, description, pattern)
       VALUES (?, ?, ?)`
      , [name, description, JSON.stringify(pattern)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('createExamPatternTemplate error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const listExamPatternTemplates = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM exam_pattern_templates ORDER BY name');
    res.json({ success: true, templates: rows });
  } catch (error) {
    console.error('listExamPatternTemplates error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Super Admin: holiday presets
export const createHolidayPreset = async (req, res) => {
  try {
    const { name, description = '', region = null, holidays = [] } = req.body;
    if (!name || !Array.isArray(holidays)) {
      return res.status(400).json({ error: 'name and holidays are required' });
    }
    await db.query(
      `INSERT INTO holiday_presets (name, description, region, holidays)
       VALUES (?, ?, ?, ?)`
      , [name, description, region, JSON.stringify(holidays)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('createHolidayPreset error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const listHolidayPresets = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM holiday_presets ORDER BY name');
    res.json({ success: true, presets: rows });
  } catch (error) {
    console.error('listHolidayPresets error:', error);
    res.status(500).json({ error: error.message });
  }
};

// School Admin access (read-only imports)
export const listStreamTemplatesForSchool = listStreamTemplates;
export const listExamPatternTemplatesForSchool = listExamPatternTemplates;
export const listHolidayPresetsForSchool = listHolidayPresets;
