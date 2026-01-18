# Backend API Implementation for Settings

Add these endpoints to your backend server:

## 1. GET /api/settings
```javascript
// Get restaurant settings
app.get('/api/settings', async (req, res) => {
  try {
    // Check if settings table exists, create if not
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS restaurant_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        settings JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await db.query(createTableQuery);

    // Get settings
    const [rows] = await db.query('SELECT settings FROM restaurant_settings ORDER BY id DESC LIMIT 1');
    
    if (rows.length > 0) {
      res.json({ success: true, settings: rows[0].settings });
    } else {
      // Return default settings if none exist
      const defaultSettings = { deliveryEnabled: false };
      res.json({ success: true, settings: defaultSettings });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});
```

## 2. POST /api/settings
```javascript
// Update restaurant settings
app.post('/api/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({ success: false, error: 'Settings data required' });
    }

    // Check if settings table exists, create if not
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS restaurant_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        settings JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await db.query(createTableQuery);

    // Insert or update settings
    const [existing] = await db.query('SELECT id FROM restaurant_settings LIMIT 1');
    
    if (existing.length > 0) {
      // Update existing
      await db.query('UPDATE restaurant_settings SET settings = ? WHERE id = ?', [
        JSON.stringify(settings),
        existing[0].id
      ]);
    } else {
      // Insert new
      await db.query('INSERT INTO restaurant_settings (settings) VALUES (?)', [
        JSON.stringify(settings)
      ]);
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});
```

## Database Schema
```sql
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  settings JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Settings JSON Structure
```json
{
  "deliveryEnabled": true
}
```
